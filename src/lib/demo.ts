// Demo mode is controlled by a single env var. Kept in its own lib so every
// call-site gets the same hard gate — enabling demo mode bypasses Patreon
// OAuth, so this must fail closed in any accidental production use.

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "1";
}

export const DEMO_PATREON_IDS = [
  "demo-hana",
  "demo-mars",
  "demo-lyrie",
  "demo-noor",
  "demo-rhea",
] as const;
