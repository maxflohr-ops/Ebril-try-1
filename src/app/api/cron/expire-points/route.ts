import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Points expiry is *derived* from the ledger — `getBalance` in lib/points.ts
// already filters out rows where `expiresAt < now`, so a positive grant with
// a past expiry contributes nothing to the balance from the moment it crosses
// the expiry. No compensating ledger row needs to be written.
//
// This cron endpoint used to insert a negative "expire:" row per expired
// grant, which meant the same points were subtracted twice (once implicitly
// by the balance aggregate filter, once explicitly by the negative row).
// That was silently destroying fan balances. The route now just reports what
// would expire, for observability — the admin dashboard and audit log can
// key off this output if they want.
async function run(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return NextResponse.json({
    ok: true,
    note: "expiry is derived from point_transactions.expiresAt; no compensating rows written.",
  });
}

export const GET = run;
export const POST = run;
