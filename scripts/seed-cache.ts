/**
 * Seed the role cache for all canonical roles.
 *
 * Usage (requires the dev or prod server to be running):
 *   node --experimental-strip-types scripts/seed-cache.ts
 *
 * Override the target server:
 *   BASE_URL=https://your-production-url.com node --experimental-strip-types scripts/seed-cache.ts
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

const CANONICAL_ROLES = [
  "product manager",
  "product marketing manager",
  "group product manager",
  "director of product",
  "head of product",
  "product lead",
  "cpo",
  "data analyst",
  "data scientist",
  "data science manager",
  "director of data science",
  "software engineer",
  "engineering manager",
  "engineering lead",
  "growth manager",
  "go-to-market manager",
  "head of gtm",
  "business operations",
  "program manager",
  "project manager",
  "chief of staff",
  "product designer",
  "graphic designer",
  "ceo",
  "cto",
  "coo",
  "cmo",
];

async function seedRole(role: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/analyze-role`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(body)}`);
  }
}

async function main() {
  console.log(`Seeding ${CANONICAL_ROLES.length} roles against ${BASE_URL}\n`);

  for (const role of CANONICAL_ROLES) {
    process.stdout.write(`  ${role.padEnd(32)}`);
    try {
      await seedRole(role);
      console.log("✓");
    } catch (err) {
      console.log(`✗  ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log("\nDone.");
}

main();
