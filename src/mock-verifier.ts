/**
 * Mock verifier — simulates ICME checkIt using ground-truth capabilities.
 *
 * Used when running `npm run demo -- --mock` so you can test the full
 * display pipeline without spending ICME credits.
 *
 * The mock applies the same buyer policy logic locally:
 *   - supportsTaskAssignment must be true
 *   - supportsLabels must be true
 *   - authMethod must be "oauth2"
 *   - supportsCreateItems must be true
 *   - supportsProjectScoping must be true
 */

import { RegistryEntry } from "./registry.js";
import { formatBid } from "./bid-formatter.js";
import { VerificationResult } from "./verifier.js";
import { CheckItResponse } from "./icme-client.js";

const AUTH_ENUM: Record<string, number> = {
  oauth2: 0,
  api_key: 1,
  pat: 2,
  none: 3,
};

function mockCheckIt(entry: RegistryEntry): CheckItResponse {
  const c = entry.capabilities;

  const extracted: Record<string, boolean | number> = {
    toolSupportsAssigningTasksToTeamMembers: c.supportsTaskAssignment,
    toolSupportsLabelsOrTagsForCategorization: c.supportsLabels,
    toolAuthenticationMethod: AUTH_ENUM[c.authMethod] ?? 3,
    toolSupportsCreatingNewItems: c.supportsCreateItems,
    toolSupportsScopingWorkToProjectOrTeam: c.supportsProjectScoping,
  };

  const sat =
    c.supportsTaskAssignment &&
    c.supportsLabels &&
    c.authMethod === "oauth2" &&
    c.supportsCreateItems &&
    c.supportsProjectScoping;

  const verdict = sat ? "SAT" : "UNSAT";

  return {
    result: verdict,
    extracted,
    llm_result: verdict,
    ar_result: verdict,
    z3_result: verdict,
    ...(sat
      ? {
          zk_proof_id: `mock-proof-${entry.name}`,
          zk_proof_url: `https://api.icme.io/v1/proof/mock-${entry.name}`,
        }
      : {}),
  };
}

export async function mockVerifyAll(
  _policyId: string,
  entries: RegistryEntry[],
  onProgress?: (result: VerificationResult, index: number, total: number) => void
): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  for (let i = 0; i < entries.length; i++) {
    // Simulate network latency
    await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));

    const entry = entries[i];
    const bid = formatBid(entry);
    const response = mockCheckIt(entry);
    const result: VerificationResult = {
      entry,
      bid,
      response,
      durationMs: Math.floor(200 + Math.random() * 800),
    };

    results.push(result);
    onProgress?.(result, i, entries.length);
  }

  return results;
}
