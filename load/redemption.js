// k6 load test for the redemption hot path.
// Run: BASE_URL=https://staging.ebril.app COOKIE="ebril_session=..." \
//      REWARD_ID=<uuid> k6 run load/redemption.js
//
// The redemption endpoint runs inside a single Prisma transaction with a
// re-read of the balance, a row-locked stock decrement, and an append-only
// negative ledger row. We want to verify it stays correct under contention
// (no oversells, no double-spends) and that p95 latency stays below 500ms
// for digital rewards.

import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL;
const COOKIE = __ENV.COOKIE;
const REWARD_ID = __ENV.REWARD_ID;

if (!BASE_URL || !COOKIE || !REWARD_ID) {
  throw new Error("BASE_URL, COOKIE, and REWARD_ID env vars are required");
}

export const options = {
  scenarios: {
    burst: {
      executor: "ramping-arrival-rate",
      startRate: 5,
      timeUnit: "1s",
      preAllocatedVUs: 50,
      maxVUs: 200,
      stages: [
        { duration: "30s", target: 25 },
        { duration: "1m", target: 50 },
        { duration: "30s", target: 100 },
        { duration: "30s", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500"],
  },
};

export default function () {
  const res = http.post(
    `${BASE_URL}/api/redemptions`,
    JSON.stringify({ rewardId: REWARD_ID }),
    {
      headers: {
        "content-type": "application/json",
        cookie: COOKIE,
      },
      tags: { name: "POST /api/redemptions" },
    }
  );

  check(res, {
    "no 5xx": (r) => r.status < 500,
    "expected 200 or controlled 4xx": (r) =>
      r.status === 200 ||
      r.status === 400 ||
      r.status === 404,
  });

  sleep(0.1);
}
