/**
 * One-time script: compile a buyer policy via ICME makeRules.
 *
 * Run:  npm run compile-policy
 *
 * This costs 300 credits (~$3) and takes 2-7 minutes.
 * The resulting policy_id is saved to policies/compiled.json
 * and reused by the main demo forever.
 */

import "dotenv/config";
import { writeFileSync } from "node:fs";
import { makeRules } from "./icme-client.js";

const POLICY_TEXT = `The tool is permitted only if all of the following are true:
the tool supports assigning tasks to team members,
and the tool supports labels or tags for categorization,
and the tool authentication method is OAuth 2.0,
and the tool supports creating new items or tasks,
and the tool supports scoping work to a project or team.`;

async function main() {
  console.log("Compiling buyer policy via ICME makeRules...");
  console.log(`Policy:\n  ${POLICY_TEXT.replace(/\n/g, "\n  ")}\n`);

  const start = Date.now();
  const response = await makeRules(POLICY_TEXT);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log(`Done in ${elapsed}s`);
  console.log("Response:", JSON.stringify(response, null, 2));

  const out = {
    policy_id: response.policy_id,
    policy_text: POLICY_TEXT,
    compiled_at: new Date().toISOString(),
    raw_response: response,
  };

  writeFileSync("policies/compiled.json", JSON.stringify(out, null, 2));
  console.log(`\nSaved to policies/compiled.json`);
  console.log(`Policy ID: ${response.policy_id}`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
