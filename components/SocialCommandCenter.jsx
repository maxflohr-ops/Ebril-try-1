import { useState, useEffect } from "react";

const ACCOUNTS_FALLBACK = [
  // === TIKTOK ===
  { id: 1, platform: "TikTok", handle: "@lanadelreylryics", currentUse: "Music / Lyrics", brand: "Music Promo", status: "Active", purpose: "ONLY ACCOUNT THAT'S GONE VIRAL — highest value asset", action: "PROTECT & LEVERAGE. Use viral momentum to drive traffic to Ebril, McKayla, and book funnel. Cross-promote everything here.", operator: "Max", priority: 1, viral: true },
  { id: 2, platform: "TikTok", handle: "@sleazetech", currentUse: "Indie Sleaze / Electro", brand: "Music Promo", status: "Active", purpose: "Indie sleaze, dance, electro promo niche", action: "KEEP. Clear niche identity. Cross-promote Ebril & McKayla when genre fits.", operator: "Max", priority: 2, viral: false },
  { id: 3, platform: "TikTok", handle: "@kimya.jeandaw", currentUse: "Acoustic Indie / Laufey-core", brand: "Ebril Adjacent", status: "Active", purpose: "Acoustic indie mood — Laufey, Ebril vibes", action: "KEEP AS EBRIL MOOD PAGE. This is a perfect secondary seeding account for Ebril's softer tracks. Don't rebrand.", operator: "Max", priority: 3, viral: false },
  { id: 4, platform: "TikTok", handle: "@mckaylala007clips", currentUse: "McKayla Clips", brand: "McKayla", status: "Active", purpose: "McKayla clips account", action: "KEEP. McKayla's TikTok clips presence.", operator: "Max", priority: 4, viral: false },
  { id: 5, platform: "TikTok", handle: "@ehugiii", currentUse: "Ebril Official", brand: "Ebril", status: "Active", purpose: "Ebril official TikTok", action: "KEEP. Ebril's primary TikTok.", operator: "Max", priority: 5, viral: false },
  { id: 6, platform: "TikTok", handle: "@dripordrown3421", currentUse: "Personal", brand: "Personal", status: "Active", purpose: "Max's personal TikTok", action: "REBRAND → Florra TikTok. You have @makeitbackmax for personal on IG. This can become Florra's TikTok presence.", operator: "Max", priority: 6, viral: false },
  { id: 7, platform: "TikTok", handle: "@burnergirl96", currentUse: "Unassigned", brand: "Unassigned", status: "Active", purpose: "Available for rebrand", action: "REBRAND → NeuroForge Main TikTok. AI avatar content pipeline posts here.", operator: "Marc or Rob", priority: 7, viral: false },
  { id: 8, platform: "TikTok", handle: "@magic.ethans.dawg", currentUse: "Unassigned", brand: "Unassigned", status: "Active", purpose: "Available for rebrand", action: "REBRAND → NeuroForge Backup TikTok. Split test hooks, alternate personas.", operator: "Marc or Rob", priority: 8, viral: false },
  // === INSTAGRAM ===
  { id: 9, platform: "Instagram", handle: "@makeitbackmax", currentUse: "Personal", brand: "Personal", status: "Active", purpose: "Max's personal IG", action: "KEEP. Personal brand. Link Florra + NeuroForge in bio.", operator: "Max", priority: 9, viral: false },
  { id: 10, platform: "Instagram", handle: "@ehugiii", currentUse: "Ebril Official", brand: "Ebril", status: "Active", purpose: "Ebril official Instagram", action: "KEEP. Ebril's primary IG.", operator: "Max", priority: 10, viral: false },
  { id: 11, platform: "Instagram", handle: "@themodernar", currentUse: "Unassigned", brand: "Unassigned", status: "Active", purpose: "Available for rebrand", action: "REBRAND → Florra Instagram. 'The Modern Art' translates well to Florra's aesthetic brand.", operator: "Max", priority: 11, viral: false },
  { id: 12, platform: "Instagram", handle: "@allmylifeinc", currentUse: "Unassigned", brand: "Unassigned", status: "Active", purpose: "Available for rebrand", action: "REBRAND → NeuroForge Instagram. 'All My Life Inc' has self-improvement brand energy. Cross-post reels from TikTok.", operator: "Marc or Rob", priority: 12, viral: false },
  { id: 13, platform: "Instagram", handle: "@velvetjanev", currentUse: "Unassigned", brand: "Unassigned", status: "Active", purpose: "Available for rebrand", action: "REBRAND → McKayla Instagram. Velvet aesthetic could fit McKayla's artist brand.", operator: "Marc or Rob", priority: 13, viral: false },
  { id: 14, platform: "Instagram", handle: "@2twoandtwo2", currentUse: "Unassigned", brand: "Unassigned", status: "Active", purpose: "Available for rebrand", action: "REBRAND → Engagement / content page. Repost viral clips, drive traffic to main accounts.", operator: "Marc or Rob", priority: 14, viral: false },
  { id: 15, platform: "Instagram", handle: "@uhaveagoodpoint", currentUse: "Deactivated", brand: "Deactivated", status: "Deactivated", purpose: "Incredible name sitting dormant", action: "REACTIVATE → Hot-take / debate / opinion page. 'You Have a Good Point' is elite engagement bait. High viral potential.", operator: "Marc or Rob", priority: 15, viral: false },
  { id: 16, platform: "Instagram", handle: "@corecorepod", currentUse: "Unassigned", brand: "Unassigned", status: "Active", purpose: "Available for rebrand", action: "KEEP NAME → Corecore clip compilation page. The name already matches the content format. Marc or Rob run this.", operator: "Marc or Rob", priority: 16, viral: false },
  { id: 17, platform: "Instagram", handle: "@terrible.today", currentUse: "Unassigned", brand: "Unassigned", status: "Active", purpose: "Available for rebrand", action: "KEEP NAME → Meme / relatable content page. 'Terrible Today' is a great hook name. Drive traffic.", operator: "Marc or Rob", priority: 17, viral: false },
  { id: 18, platform: "Instagram", handle: "@soltrainlabs", currentUse: "Unassigned", brand: "Unassigned", status: "Active", purpose: "Available for rebrand", action: "REDUNDANT — overlaps with NeuroForge. Park or merge. Could be a future tech brand but low priority now.", operator: "TBD", priority: 22, viral: false },
  // === FACEBOOK ===
  { id: 19, platform: "Facebook", handle: "Maxwell Flohr", currentUse: "Personal", brand: "Personal", status: "Active", purpose: "Personal Facebook", action: "KEEP. Create separate Florra business page later.", operator: "Max", priority: 20, viral: false },
  // === SPOTIFY ===
  { id: 20, platform: "Spotify", handle: "TBD — get from Spotify for Artists", currentUse: "McKayla", brand: "McKayla", status: "Active", purpose: "McKayla artist profile", action: "Get handle/URL", operator: "Max", priority: 18, viral: false },
  { id: 21, platform: "Spotify", handle: "TBD — get from Spotify for Artists", currentUse: "Ebril", brand: "Ebril", status: "Active", purpose: "Ebril artist profile", action: "Get handle/URL", operator: "Max", priority: 19, viral: false },
  // === YOUTUBE ===
  { id: 22, platform: "YouTube", handle: "TBD", currentUse: "Planned", brand: "McKayla", status: "Planned", purpose: "Music videos, vlogs", action: "Create or connect channel", operator: "Max", priority: 21, viral: false },
  { id: 23, platform: "YouTube", handle: "TBD", currentUse: "Planned", brand: "Ebril", status: "Planned", purpose: "Visualizers, music videos", action: "Create or connect channel", operator: "Max", priority: 21, viral: false },
  { id: 24, platform: "YouTube", handle: "TBD", currentUse: "Planned", brand: "NeuroForge", status: "Planned", purpose: "Shorts cross-post", action: "Create channel — cross-post AI Shorts from TikTok", operator: "Marc or Rob", priority: 21, viral: false },
];

const PLATFORM_CONFIG = {
  TikTok: { icon: "♪", color: "#ff0050", bg: "rgba(255,0,80,0.08)" },
  Instagram: { icon: "📷", color: "#e1306c", bg: "rgba(225,48,108,0.08)" },
  Facebook: { icon: "f", color: "#1877f2", bg: "rgba(24,119,242,0.08)" },
  Spotify: { icon: "🎵", color: "#1db954", bg: "rgba(29,185,84,0.08)" },
  YouTube: { icon: "▶", color: "#ff0000", bg: "rgba(255,0,0,0.08)" },
};

const BRAND_COLORS = {
  "Personal": "#71717a", "Florra": "#7c3aed", "McKayla": "#ec4899",
  "Ebril": "#06b6d4", "Ebril Adjacent": "#06b6d4", "NeuroForge": "#f59e0b",
  "Music Promo": "#f97316", "Unassigned": "#3f3f46", "Deactivated": "#ef4444",
  "Content Page": "#10b981", "Planned": "#6366f1", "TBD": "#3f3f46",
};

const STATUS_STYLES = {
  Active: { color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  Planned: { color: "#6366f1", bg: "rgba(99,102,241,0.12)" },
  Deactivated: { color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
};

export default function SocialCommandCenter() {
  const [platformFilter, setPlatformFilter] = useState("All");
  const [viewFilter, setViewFilter] = useState("All");
  const [expandedId, setExpandedId] = useState(null);
  const [ACCOUNTS, setAccounts] = useState(ACCOUNTS_FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/accounts")
      .then(r => r.json())
      .then(data => { if (data.accounts?.length) setAccounts(data.accounts); })
      .catch(() => {/* keep fallback */})
      .finally(() => setLoading(false));
  }, []);

  const platforms = ["All", "TikTok", "Instagram", "YouTube", "Spotify", "Facebook"];
  const views = ["All", "Keep As-Is", "Rebrand", "Marc/Rob", "Redundant"];

  const filtered = ACCOUNTS.filter(a => {
    if (platformFilter !== "All" && a.platform !== platformFilter) return false;
    if (viewFilter === "Keep As-Is" && a.action.startsWith("REBRAND")) return false;
    if (viewFilter === "Keep As-Is" && a.action.startsWith("REACTIVATE")) return false;
    if (viewFilter === "Keep As-Is" && a.action.startsWith("REDUNDANT")) return false;
    if (viewFilter === "Keep As-Is" && !a.action.startsWith("KEEP") && !a.action.startsWith("PROTECT")) return false;
    if (viewFilter === "Rebrand" && !a.action.startsWith("REBRAND") && !a.action.startsWith("REACTIVATE")) return false;
    if (viewFilter === "Marc/Rob" && a.operator !== "Marc or Rob") return false;
    if (viewFilter === "Redundant" && !a.action.startsWith("REDUNDANT")) return false;
    return true;
  }).sort((a, b) => a.priority - b.priority);

  const keepCount = ACCOUNTS.filter(a => a.action.startsWith("KEEP") || a.action.startsWith("PROTECT")).length;
  const rebrandCount = ACCOUNTS.filter(a => a.action.startsWith("REBRAND") || a.action.startsWith("REACTIVATE")).length;
  const redundantCount = ACCOUNTS.filter(a => a.action.startsWith("REDUNDANT")).length;
  const marcRobCount = ACCOUNTS.filter(a => a.operator === "Marc or Rob").length;

  return (
    <div style={{
      minHeight: "100vh", background: "#0a0a0f", color: "#e4e4e7",
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif", padding: "20px 16px",
    }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 2, color: "#7c3aed", textTransform: "uppercase", marginBottom: 4 }}>
            FLORRA OPERATIONS HUB
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Social Media Command Center</h1>
          <p style={{ fontSize: 13, color: "#71717a" }}>
            {loading ? "Loading from Airtable…" : `${ACCOUNTS.length} accounts · ${keepCount} keep · ${rebrandCount} rebrand · ${redundantCount} redundant`}
          </p>
        </div>

        {/* VIRAL CALLOUT */}
        <div style={{
          background: "linear-gradient(135deg, rgba(255,0,80,0.08), rgba(245,158,11,0.08))",
          border: "1px solid rgba(255,0,80,0.2)", borderRadius: 10,
          padding: 16, marginBottom: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 20 }}>🔥</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#ff0050" }}>@lanadelreylryics — Your #1 Asset</div>
              <div style={{ fontSize: 12, color: "#a1a1aa" }}>Only account with viral history. Everything flows through this.</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: "#a1a1aa", lineHeight: 1.7, paddingLeft: 30 }}>
            <strong style={{ color: "#e4e4e7" }}>Strategy:</strong> Use viral momentum to seed Ebril tracks, drive traffic to book funnel landing page, and cross-promote McKayla. Every CTA on this account = data capture.
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 16 }}>
          {[
            { label: "Total", value: ACCOUNTS.length, color: "#e4e4e7" },
            { label: "Keep", value: keepCount, color: "#10b981" },
            { label: "Rebrand", value: rebrandCount, color: "#f59e0b" },
            { label: "Marc/Rob", value: marcRobCount, color: "#ec4899" },
            { label: "Cut", value: redundantCount, color: "#ef4444" },
          ].map(s => (
            <div key={s.label} style={{
              background: "#12121a", border: "1px solid #1e1e2e", borderRadius: 8,
              padding: "10px 6px", textAlign: "center",
            }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 9, color: "#52525b", textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Account Map by Brand */}
        <div style={{
          background: "#12121a", border: "1px solid #1e1e2e", borderRadius: 10,
          padding: 16, marginBottom: 16,
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#71717a", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>
            Account Map — Where Everything Goes
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
            {[
              { brand: "Florra", accounts: ["@dripordrown3421 (TT)", "@themodernar (IG)"], note: "NEEDS: TikTok + IG (fill via rebrand)" },
              { brand: "McKayla", accounts: ["@mckaylala007clips (TT)", "@velvetjanev (IG)", "Spotify TBD"], note: "Clips + IG via rebrand" },
              { brand: "Ebril", accounts: ["@ehugiii (TT+IG)", "@kimya.jeandaw (TT mood)", "Spotify TBD"], note: "Strong — kimya.jeandaw = acoustic mood page" },
              { brand: "NeuroForge", accounts: ["@burnergirl96 (TT main)", "@magic.ethans.dawg (TT backup)", "@allmylifeinc (IG)"], note: "All rebrands — Marc/Rob operate" },
              { brand: "Music Promo", accounts: ["@lanadelreylryics (TT) 🔥", "@sleazetech (TT)"], note: "Traffic drivers — cross-promote everything" },
              { brand: "Content Pages", accounts: ["@uhaveagoodpoint (IG)", "@terrible.today (IG)", "@corecorepod (IG)"], note: "Engagement farms — Marc/Rob" },
            ].map(b => (
              <div key={b.brand} style={{
                padding: 12, borderRadius: 8,
                background: `${BRAND_COLORS[b.brand] || "#3f3f46"}10`,
                border: `1px solid ${BRAND_COLORS[b.brand] || "#3f3f46"}25`,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: BRAND_COLORS[b.brand] || "#71717a", marginBottom: 6 }}>
                  {b.brand}
                </div>
                {b.accounts.map((a, i) => (
                  <div key={i} style={{ fontSize: 11, fontFamily: "monospace", color: "#a1a1aa", lineHeight: 1.8 }}>
                    {a}
                  </div>
                ))}
                <div style={{ fontSize: 10, color: "#52525b", marginTop: 4, fontStyle: "italic" }}>
                  {b.note}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
          {platforms.map(p => (
            <button key={p} onClick={() => setPlatformFilter(p)} style={{
              padding: "5px 12px", borderRadius: 6, border: "1px solid",
              borderColor: platformFilter === p ? (PLATFORM_CONFIG[p]?.color || "#7c3aed") : "#1e1e2e",
              background: platformFilter === p ? (PLATFORM_CONFIG[p]?.bg || "rgba(124,58,237,0.08)") : "transparent",
              color: platformFilter === p ? "#e4e4e7" : "#52525b",
              fontSize: 11, cursor: "pointer",
            }}>
              {p !== "All" && `${PLATFORM_CONFIG[p]?.icon} `}{p}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          {views.map(v => (
            <button key={v} onClick={() => setViewFilter(v)} style={{
              padding: "5px 12px", borderRadius: 6, border: "1px solid",
              borderColor: viewFilter === v ? "#f59e0b" : "#1e1e2e",
              background: viewFilter === v ? "rgba(245,158,11,0.08)" : "transparent",
              color: viewFilter === v ? "#e4e4e7" : "#52525b",
              fontSize: 11, cursor: "pointer",
            }}>
              {v}
            </button>
          ))}
        </div>

        {/* Account List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {filtered.map(acc => {
            const pc = PLATFORM_CONFIG[acc.platform];
            const ss = STATUS_STYLES[acc.status] || STATUS_STYLES.Active;
            const bc = BRAND_COLORS[acc.brand] || "#3f3f46";
            const isRebrand = acc.action.startsWith("REBRAND") || acc.action.startsWith("REACTIVATE");
            const isRedundant = acc.action.startsWith("REDUNDANT");
            const isExpanded = expandedId === acc.id;

            return (
              <div key={acc.id} onClick={() => setExpandedId(isExpanded ? null : acc.id)} style={{
                background: "#12121a",
                border: acc.viral ? "1px solid rgba(255,0,80,0.3)" : "1px solid #1e1e2e",
                borderRadius: 8,
                borderLeft: `3px solid ${acc.viral ? "#ff0050" : isRedundant ? "#ef4444" : isRebrand ? "#f59e0b" : bc}`,
                cursor: "pointer", overflow: "hidden",
                boxShadow: acc.viral ? "0 0 20px rgba(255,0,80,0.06)" : "none",
              }}>
                <div style={{ padding: "11px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 7, background: pc.bg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, flexShrink: 0, color: pc.color, fontWeight: 700,
                  }}>
                    {pc.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
                      <span style={{
                        fontFamily: "monospace", fontSize: 13, fontWeight: 600,
                        color: acc.handle.startsWith("TBD") ? "#3f3f46" : "#e4e4e7",
                      }}>
                        {acc.handle}
                      </span>
                      {acc.viral && <span style={{ fontSize: 12 }}>🔥</span>}
                      <span style={{
                        fontSize: 7, fontWeight: 700, letterSpacing: 0.8, padding: "2px 5px",
                        borderRadius: 3, background: `${bc}18`, color: bc, textTransform: "uppercase",
                      }}>
                        {acc.brand}
                      </span>
                      {isRebrand && (
                        <span style={{
                          fontSize: 7, fontWeight: 700, letterSpacing: 0.8, padding: "2px 5px",
                          borderRadius: 3, background: "rgba(245,158,11,0.12)", color: "#f59e0b",
                          textTransform: "uppercase",
                        }}>
                          REBRAND
                        </span>
                      )}
                      {isRedundant && (
                        <span style={{
                          fontSize: 7, fontWeight: 700, letterSpacing: 0.8, padding: "2px 5px",
                          borderRadius: 3, background: "rgba(239,68,68,0.12)", color: "#ef4444",
                          textTransform: "uppercase",
                        }}>
                          REDUNDANT
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "#52525b" }}>{acc.purpose}</div>
                  </div>
                  <div style={{
                    fontSize: 9, color: acc.operator === "Marc or Rob" ? "#ec4899" : "#3f3f46",
                    fontWeight: 500, flexShrink: 0,
                  }}>
                    {acc.operator}
                  </div>
                </div>
                {isExpanded && (
                  <div style={{ padding: "0 14px 12px", borderTop: "1px solid #1e1e2e" }}>
                    <div style={{
                      marginTop: 10, padding: "10px 12px", borderRadius: 6, fontSize: 12,
                      lineHeight: 1.6, color: "#a1a1aa",
                      background: isRedundant ? "rgba(239,68,68,0.04)" : isRebrand ? "rgba(245,158,11,0.04)" : "rgba(124,58,237,0.04)",
                      border: `1px solid ${isRedundant ? "rgba(239,68,68,0.1)" : isRebrand ? "rgba(245,158,11,0.1)" : "rgba(124,58,237,0.1)"}`,
                    }}>
                      <strong style={{ color: isRedundant ? "#ef4444" : isRebrand ? "#f59e0b" : "#7c3aed" }}>
                        Action:
                      </strong> {acc.action}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div style={{
          marginTop: 24, padding: 16, borderRadius: 10,
          background: "#12121a", border: "1px solid #1e1e2e",
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#10b981", marginBottom: 10 }}>
            ✅ FINAL ACCOUNT ALLOCATION
          </div>
          <div style={{ fontSize: 12, color: "#a1a1aa", lineHeight: 2.4 }}>
            <strong style={{ color: "#e4e4e7" }}>KEEP (11):</strong> lanadelreylryics, sleazetech, kimya.jeandaw, mckaylala007clips, ehugiii ×2, makeitbackmax, Maxwell Flohr, Spotify ×2, + dripordrown3421 as personal<br/>
            <strong style={{ color: "#f59e0b" }}>REBRAND (8):</strong> dripordrown3421→Florra TT, burnergirl96→NF TT, magic.ethans.dawg→NF TT backup, themodernar→Florra IG, allmylifeinc→NF IG, velvetjanev→McKayla IG, uhaveagoodpoint→debate page, 2twoandtwo2→engagement<br/>
            <strong style={{ color: "#ec4899" }}>MARC/ROB (8):</strong> burnergirl96, magic.ethans.dawg, allmylifeinc, velvetjanev, 2twoandtwo2, uhaveagoodpoint, corecorepod, terrible.today<br/>
            <strong style={{ color: "#10b981" }}>CONTENT PAGES (3):</strong> corecorepod, terrible.today, uhaveagoodpoint — engagement farms that drive traffic<br/>
            <strong style={{ color: "#ef4444" }}>REDUNDANT (1):</strong> soltrainlabs — overlaps with NeuroForge, park it
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 10, color: "#3f3f46" }}>
          Florra Operations · Social Media Command Center v2.0
        </div>
      </div>
    </div>
  );
}
