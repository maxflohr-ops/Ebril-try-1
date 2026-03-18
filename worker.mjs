const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const airtableBase = env.AIRTABLE_BASE;
    const airtableTable = env.AIRTABLE_TABLE;
    const airtablePat = env.AIRTABLE_PAT;
    const airtableUrl = `https://api.airtable.com/v0/${airtableBase}/${airtableTable}`;

    const airtableHeaders = {
      Authorization: `Bearer ${airtablePat}`,
      "Content-Type": "application/json",
    };

    // POST /submit — create a new record
    if (request.method === "POST" && url.pathname === "/submit") {
      let body;
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ error: "Invalid JSON body" }, 400);
      }

      const airtableRes = await fetch(airtableUrl, {
        method: "POST",
        headers: airtableHeaders,
        body: JSON.stringify({ fields: body }),
      });

      const data = await airtableRes.json();
      return jsonResponse(data, airtableRes.status);
    }

    // GET /records — list records (optionally filter by ?formula=...)
    if (request.method === "GET" && url.pathname === "/records") {
      const params = new URLSearchParams();
      const formula = url.searchParams.get("formula");
      if (formula) params.set("filterByFormula", formula);
      const maxRecords = url.searchParams.get("maxRecords");
      if (maxRecords) params.set("maxRecords", maxRecords);

      const listUrl = `${airtableUrl}?${params.toString()}`;
      const airtableRes = await fetch(listUrl, { headers: airtableHeaders });
      const data = await airtableRes.json();
      return jsonResponse(data, airtableRes.status);
    }

    // PATCH /records/:id — update a record
    if (request.method === "POST" && url.pathname.startsWith("/records/")) {
      const recordId = url.pathname.split("/records/")[1];
      if (!recordId) return jsonResponse({ error: "Missing record ID" }, 400);

      let body;
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ error: "Invalid JSON body" }, 400);
      }

      const airtableRes = await fetch(`${airtableUrl}/${recordId}`, {
        method: "PATCH",
        headers: airtableHeaders,
        body: JSON.stringify({ fields: body }),
      });

      const data = await airtableRes.json();
      return jsonResponse(data, airtableRes.status);
    }

    return jsonResponse({ error: "Not found" }, 404);
  },
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
