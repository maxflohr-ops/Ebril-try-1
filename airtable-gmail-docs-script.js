/**
 * Airtable Scripting Extension
 * Gmail + Google Docs Content Puller & Parser
 *
 * Base: Florra CRM & Operations Hub (applXEAjh6k3Xmybl)
 *
 * What this script does:
 *  1. Reads a Gmail OAuth access token + optional Google Docs IDs from Script config.
 *  2. Fetches matching emails from Gmail (e.g. replies to outreach threads).
 *  3. Fetches and parses content from Google Docs (briefs, proposals, contracts).
 *  4. Upserts records into:
 *       - Outreach  → logs each email as an outreach touchpoint
 *       - People    → creates/updates the contact if not yet in the base
 *       - NeuroForge Projects → stores doc content (Research Brief, Manuscript …)
 *
 * Setup (Script → Edit → "Show config"):
 *   GMAIL_ACCESS_TOKEN   – a valid OAuth2 access token with gmail.readonly scope
 *   GDOCS_ACCESS_TOKEN   – a valid OAuth2 access token with drive.readonly scope
 *                          (can be the same token if both scopes were requested)
 *   GMAIL_QUERY          – any Gmail search query, e.g. "label:outreach-replies"
 *   MAX_EMAILS           – how many emails to pull per run (default 20)
 *   DOC_IDS              – comma-separated Google Doc IDs to pull
 *   TARGET_TABLE         – "Outreach" | "NeuroForge Projects" (default: Outreach)
 *
 * How to get an access token (one-time dev step):
 *   https://developers.google.com/oauthplayground
 *   Scope: https://www.googleapis.com/auth/gmail.readonly
 *          https://www.googleapis.com/auth/documents.readonly
 */

// ─── 0. CONFIG ────────────────────────────────────────────────────────────────

const cfg = input.config({
  title: "Gmail + Google Docs → Airtable",
  description:
    "Pulls emails and Google Doc content then syncs them into Outreach, People, and NeuroForge Projects tables.",
  items: [
    input.config.text("GMAIL_ACCESS_TOKEN", {
      label: "Gmail OAuth Access Token",
      description: "OAuth2 bearer token with gmail.readonly scope.",
    }),
    input.config.text("GDOCS_ACCESS_TOKEN", {
      label: "Google Docs / Drive OAuth Access Token",
      description:
        "OAuth2 bearer token with documents.readonly scope. May be the same as Gmail token.",
    }),
    input.config.text("GMAIL_QUERY", {
      label: "Gmail Search Query",
      description:
        'Gmail search string, e.g. "label:outreach-replies newer_than:7d"',
    }),
    input.config.text("MAX_EMAILS", {
      label: "Max Emails to Pull",
      description: "Maximum number of emails per run (default: 20).",
    }),
    input.config.text("DOC_IDS", {
      label: "Google Doc IDs (comma-separated)",
      description:
        "IDs of Google Docs to pull content from. Leave blank to skip.",
    }),
    input.config.select("TARGET_TABLE", {
      label: "Docs Target Table",
      description: "Which table should doc content be written to?",
      options: [
        { label: "NeuroForge Projects", value: "NeuroForge Projects" },
        { label: "Outreach", value: "Outreach" },
      ],
    }),
  ],
});

const GMAIL_TOKEN = cfg.GMAIL_ACCESS_TOKEN;
const DOCS_TOKEN = cfg.GDOCS_ACCESS_TOKEN;
const GMAIL_QUERY = cfg.GMAIL_QUERY || "label:outreach newer_than:7d";
const MAX_EMAILS = parseInt(cfg.MAX_EMAILS || "20", 10);
const RAW_DOC_IDS = cfg.DOC_IDS || "";
const DOC_IDS = RAW_DOC_IDS.split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const TARGET_TABLE = cfg.TARGET_TABLE || "NeuroForge Projects";

// ─── 1. HELPERS ───────────────────────────────────────────────────────────────

/** Minimal Gmail REST helper */
const Gmail = {
  BASE: "https://gmail.googleapis.com/gmail/v1/users/me",

  async get(path, params = {}) {
    const qs = new URLSearchParams(params).toString();
    const url = `${Gmail.BASE}${path}${qs ? "?" + qs : ""}`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${GMAIL_TOKEN}` },
    });
    if (!resp.ok) throw new Error(`Gmail ${path} → ${resp.status}`);
    return resp.json();
  },

  /** List message IDs matching a query */
  async listMessages(query, maxResults = 20) {
    const data = await Gmail.get("/messages", {
      q: query,
      maxResults: String(maxResults),
    });
    return data.messages || [];
  },

  /** Fetch full message and return a parsed object */
  async getMessage(id) {
    const msg = await Gmail.get(`/messages/${id}`, { format: "full" });
    return Gmail.parse(msg);
  },

  parse(msg) {
    const headers = (msg.payload?.headers || []).reduce((acc, h) => {
      acc[h.name.toLowerCase()] = h.value;
      return acc;
    }, {});

    const subject = headers["subject"] || "(no subject)";
    const from = headers["from"] || "";
    const date = headers["date"]
      ? new Date(headers["date"]).toISOString()
      : new Date().toISOString();
    const threadId = msg.threadId || "";
    const messageId = msg.id || "";
    const snippet = msg.snippet || "";

    // Extract plain-text body
    let body = "";
    function extractBody(part) {
      if (!part) return;
      if (
        part.mimeType === "text/plain" &&
        part.body?.data
      ) {
        body +=
          atob(part.body.data.replace(/-/g, "+").replace(/_/g, "/")) + "\n";
      }
      (part.parts || []).forEach(extractBody);
    }
    extractBody(msg.payload);

    // Parse sender name + email
    const senderMatch = from.match(/^(.*?)\s*<([^>]+)>$/);
    const senderName = senderMatch ? senderMatch[1].trim() : from;
    const senderEmail = senderMatch ? senderMatch[2].trim() : from;

    return {
      messageId,
      threadId,
      subject,
      from,
      senderName,
      senderEmail,
      date,
      snippet,
      body: body || snippet,
    };
  },
};

/** Minimal Google Docs REST helper */
const GDocs = {
  async getDoc(docId) {
    const url = `https://docs.googleapis.com/v1/documents/${docId}`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${DOCS_TOKEN}` },
    });
    if (!resp.ok) throw new Error(`GDocs ${docId} → ${resp.status}`);
    return resp.json();
  },

  /** Flatten the Docs structural elements into plain text */
  extractText(doc) {
    const parts = [];
    for (const el of doc.body?.content || []) {
      if (el.paragraph) {
        const text = (el.paragraph.elements || [])
          .map((e) => e.textRun?.content || "")
          .join("");
        parts.push(text);
      } else if (el.table) {
        for (const row of el.table.tableRows || []) {
          for (const cell of row.tableCells || []) {
            for (const cellEl of cell.content || []) {
              if (cellEl.paragraph) {
                const text = (cellEl.paragraph.elements || [])
                  .map((e) => e.textRun?.content || "")
                  .join("");
                parts.push(text);
              }
            }
          }
        }
      }
    }
    return parts.join("").trim();
  },

  /** Extract the title from doc metadata */
  title(doc) {
    return doc.title || "Untitled";
  },
};

/** Look up a table by name, throw if missing */
function requireTable(name) {
  const tbl = base.getTable(name);
  if (!tbl) throw new Error(`Table "${name}" not found in this base.`);
  return tbl;
}

/** Find an existing record by field value (exact match) */
async function findRecord(table, fieldName, value) {
  const query = await table.selectRecordsAsync({ fields: [fieldName] });
  return query.records.find((r) => r.getCellValueAsString(fieldName) === value);
}

// ─── 2. MAIN ──────────────────────────────────────────────────────────────────

output.markdown("## Gmail + Google Docs → Airtable Sync");

// ── 2a. Gmail Pull ────────────────────────────────────────────────────────────

if (GMAIL_TOKEN) {
  output.markdown("### Pulling Gmail messages…");

  let msgRefs;
  try {
    msgRefs = await Gmail.listMessages(GMAIL_QUERY, MAX_EMAILS);
  } catch (err) {
    output.markdown(`❌ Gmail list error: ${err.message}`);
    msgRefs = [];
  }

  output.markdown(`Found **${msgRefs.length}** message(s). Fetching details…`);

  const outreachTable = requireTable("Outreach");
  const peopleTable = requireTable("People");

  // Load existing outreach IDs to avoid duplicates
  const existingOutreach = await outreachTable.selectRecordsAsync({
    fields: ["Notes"],
  });
  const existingNotes = new Set(
    existingOutreach.records.map((r) => r.getCellValueAsString("Notes"))
  );

  let created = 0;
  let skipped = 0;

  for (const ref of msgRefs) {
    let msg;
    try {
      msg = await Gmail.getMessage(ref.id);
    } catch (err) {
      output.markdown(`  ⚠️ Skipping ${ref.id}: ${err.message}`);
      skipped++;
      continue;
    }

    // De-duplicate by Gmail message ID stored in Notes
    const noteKey = `gmail:${msg.messageId}`;
    if (existingNotes.has(noteKey)) {
      skipped++;
      continue;
    }

    // ── Upsert People record ──────────────────────────────────────────────────
    let personLink = [];
    if (msg.senderEmail) {
      const existing = await findRecord(peopleTable, "Email", msg.senderEmail);
      if (existing) {
        personLink = [{ id: existing.id }];
      } else {
        const newPersonId = await peopleTable.createRecordAsync({
          "Full Name": msg.senderName || msg.senderEmail,
          Email: msg.senderEmail,
          Source: { name: "Email" },
        });
        personLink = [{ id: newPersonId }];
        output.markdown(`  👤 Created People record for **${msg.senderEmail}**`);
      }
    }

    // ── Create Outreach record ────────────────────────────────────────────────
    await outreachTable.createRecordAsync({
      Subject: msg.subject,
      Date: new Date(msg.date),
      Status: { name: "Sent" },
      Response: { name: "Replied" },
      "Outreach Type": { name: "Email" },
      "Next Steps": msg.body.slice(0, 2000),
      Notes: noteKey,
      People: personLink,
    });

    existingNotes.add(noteKey);
    created++;
    output.markdown(
      `  ✉️  Logged: **${msg.subject}** from ${msg.senderEmail}`
    );
  }

  output.markdown(
    `\nGmail sync complete — **${created}** created, **${skipped}** skipped.`
  );
} else {
  output.markdown("⚠️ No GMAIL_ACCESS_TOKEN provided — skipping Gmail pull.");
}

// ── 2b. Google Docs Pull ──────────────────────────────────────────────────────

if (DOCS_TOKEN && DOC_IDS.length > 0) {
  output.markdown("\n### Pulling Google Docs…");

  const targetTable = requireTable(TARGET_TABLE);

  for (const docId of DOC_IDS) {
    let doc;
    try {
      doc = await GDocs.getDoc(docId);
    } catch (err) {
      output.markdown(`  ❌ Doc ${docId}: ${err.message}`);
      continue;
    }

    const title = GDocs.title(doc);
    const text = GDocs.extractText(doc);

    output.markdown(`  📄 **${title}** (${text.length} chars)`);

    if (TARGET_TABLE === "NeuroForge Projects") {
      // Map doc content into NeuroForge Projects fields.
      // The first 2000 chars go to Research Brief; remainder to Manuscript.
      await targetTable.createRecordAsync({
        Topic: title,
        "Research Brief": text.slice(0, 2000),
        Manuscript: text.length > 2000 ? text.slice(2000, 6000) : "",
        "QA Notes": `Imported from Google Doc ID: ${docId} on ${new Date().toISOString()}`,
      });
    } else {
      // Write into Outreach as a generic document note
      await targetTable.createRecordAsync({
        Subject: title,
        Date: new Date(),
        "Outreach Type": { name: "Email" },
        Notes: `google-doc:${docId}`,
        "Next Steps": text.slice(0, 5000),
      });
    }

    output.markdown(`  ✅ Saved "${title}" to **${TARGET_TABLE}**`);
  }
} else if (DOC_IDS.length === 0) {
  output.markdown("ℹ️ No DOC_IDS provided — skipping Google Docs pull.");
} else {
  output.markdown("⚠️ No GDOCS_ACCESS_TOKEN provided — skipping Google Docs pull.");
}

output.markdown("\n---\n**Sync complete.** Check the Outreach, People, and NeuroForge Projects tables.");
