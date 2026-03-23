import { checkIt, CheckItResponse } from "./icme-client.js";
import { RegistryEntry } from "./registry.js";
import { formatBid } from "./bid-formatter.js";

export interface VerificationResult {
  entry: RegistryEntry;
  bid: string;
  response: CheckItResponse;
  durationMs: number;
}

/**
 * Verify a single registry entry against a compiled policy.
 */
export async function verifyEntry(
  policyId: string,
  entry: RegistryEntry
): Promise<VerificationResult> {
  const bid = formatBid(entry);
  const start = Date.now();
  const response = await checkIt(policyId, bid);
  const durationMs = Date.now() - start;

  return { entry, bid, response, durationMs };
}

/**
 * Verify all candidates sequentially (so terminal output streams nicely).
 * Returns results in the same order as the input array.
 */
export async function verifyAll(
  policyId: string,
  entries: RegistryEntry[],
  onProgress?: (result: VerificationResult, index: number, total: number) => void
): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  for (let i = 0; i < entries.length; i++) {
    const result = await verifyEntry(policyId, entries[i]);
    results.push(result);
    onProgress?.(result, i, entries.length);
  }

  return results;
}
