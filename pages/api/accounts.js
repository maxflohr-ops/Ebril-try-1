const BASE_ID = process.env.AIRTABLE_BASE_ID || "appGVwj527W1GbHH2";
const TABLE_ID = "tbl2tWb9wiCvJKKD9";
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?sort[0][field]=Priority&sort[0][direction]=asc`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
  });

  if (!response.ok) {
    return res.status(response.status).json({ error: "Failed to fetch from Airtable" });
  }

  const data = await response.json();

  const accounts = data.records.map((record, index) => ({
    id: index + 1,
    airtableId: record.id,
    handle: record.fields["Handle"] || "TBD",
    platform: record.fields["Platform"] || "",
    brand: record.fields["Brand"] || "Unassigned",
    status: record.fields["Status"] || "Active",
    purpose: record.fields["Purpose"] || "",
    action: record.fields["Action"] || "",
    operator: record.fields["Operator"] || "TBD",
    priority: record.fields["Priority"] || 99,
    viral: record.fields["Viral"] || false,
  }));

  res.json({ accounts });
}
