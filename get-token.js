#!/usr/bin/env node
/**
 * Google OAuth2 Token Helper
 * -------------------------------------------------
 * Usage:
 *   Step 1 — Print the authorization URL:
 *     node get-token.js
 *
 *   Step 2 — Open the URL in your browser, grant access,
 *             copy the `code` from the redirect URL, then run:
 *     node get-token.js <AUTH_CODE>
 *
 * Tokens are saved to tokens.json (gitignored).
 * Paste the access_token into the Airtable Script config.
 */

const fs = require("fs");
const https = require("https");
const qs = require("querystring");
const path = require("path");

// ─── Load .env ────────────────────────────────────────────────────────────────
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const [k, ...rest] = line.split("=");
    if (k && rest.length) process.env[k.trim()] = rest.join("=").trim();
  }
}

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = "urn:ietf:wg:oauth:2.0:oob"; // copy-paste flow (no local server needed)

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env");
  process.exit(1);
}

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/documents.readonly",
].join(" ");

// ─── Step 1: Print auth URL ───────────────────────────────────────────────────
if (process.argv.length < 3) {
  const authUrl =
    "https://accounts.google.com/o/oauth2/v2/auth?" +
    qs.stringify({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: "code",
      scope: SCOPES,
      access_type: "offline",
      prompt: "consent",
    });

  console.log("\n=== Step 1: Open this URL in your browser ===\n");
  console.log(authUrl);
  console.log("\n=== Step 2: After granting access, run: ===");
  console.log("  node get-token.js <AUTH_CODE>\n");
  process.exit(0);
}

// ─── Step 2: Exchange code for tokens ────────────────────────────────────────
const authCode = process.argv[2];

const body = qs.stringify({
  code: authCode,
  client_id: CLIENT_ID,
  client_secret: CLIENT_SECRET,
  redirect_uri: REDIRECT_URI,
  grant_type: "authorization_code",
});

const options = {
  hostname: "oauth2.googleapis.com",
  path: "/token",
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    "Content-Length": Buffer.byteLength(body),
  },
};

const req = https.request(options, (res) => {
  let data = "";
  res.on("data", (chunk) => (data += chunk));
  res.on("end", () => {
    const json = JSON.parse(data);

    if (json.error) {
      console.error("\n❌ Token exchange failed:", json.error, json.error_description);
      process.exit(1);
    }

    // Save full token response
    fs.writeFileSync("tokens.json", JSON.stringify(json, null, 2));

    console.log("\n✅ Tokens saved to tokens.json (gitignored)\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("ACCESS TOKEN (paste into Airtable Script config):");
    console.log();
    console.log(json.access_token);
    console.log();
    if (json.refresh_token) {
      console.log("REFRESH TOKEN (store safely for later use):");
      console.log(json.refresh_token);
      console.log();
    }
    console.log("Expires in:", json.expires_in, "seconds (~1 hour)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  });
});

req.on("error", (e) => {
  console.error("Request error:", e.message);
  process.exit(1);
});

req.write(body);
req.end();
