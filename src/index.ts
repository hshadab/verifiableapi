/**
 * Verifiable MCP — main demo runner.
 *
 * Flow:
 *   1. Agent announces its task + capability requirements
 *   2. "Forage" searches the mock registry for candidates
 *   3. Each candidate is verified via ICME Preflight checkIt
 *   4. Results displayed: verified shortlist vs. rejected tools
 *
 * Usage:
 *   npm run demo                      # full pipeline (needs policy_id)
 *   npm run demo -- --policy <id>     # override policy_id
 *   npm run demo -- --mock            # use mock verification (no API calls)
 */

import "dotenv/config";
import { readFileSync, existsSync } from "node:fs";
import { getAllEntries } from "./registry.js";
import { verifyAll } from "./verifier.js";
import { mockVerifyAll } from "./mock-verifier.js";
import {
  printBanner,
  printSearchPhase,
  printVerifyPhaseStart,
  printVerifyProgress,
  printResultsSummary,
} from "./display.js";

const MOCK_MODE = process.argv.includes("--mock");

function getPolicyId(): string {
  if (MOCK_MODE) return "mock-policy-demo";

  // CLI override
  const flagIdx = process.argv.indexOf("--policy");
  if (flagIdx !== -1 && process.argv[flagIdx + 1]) {
    return process.argv[flagIdx + 1];
  }

  // Compiled policy file
  const path = "policies/compiled.json";
  if (existsSync(path)) {
    const data = JSON.parse(readFileSync(path, "utf-8"));
    return data.policy_id;
  }

  console.error(
    "No policy_id found. Run `npm run compile-policy` first, or pass --policy <id> or --mock"
  );
  process.exit(1);
}

async function main() {
  printBanner();

  if (MOCK_MODE) {
    console.log("  ⚠  Running in MOCK mode (no real ICME API calls)\n");
  }

  // ── Step 0: Agent describes what it needs ──────────────────
  const taskDescription =
    "I need a project management tool to track tasks for my team.";
  const searchQuery = "project management";

  console.log(`  Agent task: "${taskDescription}"`);
  console.log(`  Buyer requirements:`);
  console.log(`    • Must support task assignment`);
  console.log(`    • Must support labels / tags`);
  console.log(`    • Must use OAuth 2.0 authentication`);
  console.log(`    • Must support creating new items`);
  console.log(`    • Must support project / team scoping`);
  console.log();

  // ── Step 1: Discovery ──────────────────────────────────────
  const candidates = getAllEntries();
  printSearchPhase(searchQuery, candidates);

  // ── Step 2: Verification ───────────────────────────────────
  const policyId = getPolicyId();
  printVerifyPhaseStart(policyId);

  const verifyFn = MOCK_MODE ? mockVerifyAll : verifyAll;
  const results = await verifyFn(policyId, candidates, printVerifyProgress);

  // ── Step 3: Results ────────────────────────────────────────
  printResultsSummary(results);

  // ── Epilogue ───────────────────────────────────────────────
  const verified = results.filter((r) => r.response.result === "SAT");
  if (verified.length > 0) {
    console.log(
      `  → Agent would now call forage_install("${verified[0].entry.name}")`
    );
    console.log(`    with cryptographic proof of capability match.\n`);
  } else {
    console.log(
      `  → No tools passed verification. Agent will widen search.\n`
    );
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
