export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" }});
    }
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
    const body = await request.json();
    const res = await fetch(`https://api.airtable.com/v0/${env.AIRTABLE_BASE}/${env.AIRTABLE_TABLE}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${env.AIRTABLE_PAT}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), { status: res.status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }});
  }
};
