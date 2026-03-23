import { VerificationResult } from "./verifier.js";
import { RegistryEntry } from "./registry.js";

// ─── ANSI helpers ────────────────────────────────────────────

const R = "\x1b[31m"; // red
const G = "\x1b[32m"; // green
const Y = "\x1b[33m"; // yellow
const B = "\x1b[34m"; // blue
const M = "\x1b[35m"; // magenta
const C = "\x1b[36m"; // cyan
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

function line(ch = "─", len = 60) {
  return DIM + ch.repeat(len) + RESET;
}

function verdictIcon(result: string): string {
  if (result === "SAT") return `${G}✔ SAT${RESET}`;
  if (result === "UNSAT") return `${R}✘ UNSAT${RESET}`;
  // "AR uncertain" or other non-consensus states
  return `${Y}⚠ ${result}${RESET}`;
}

function isSatLike(result: string): boolean {
  // Treat "AR uncertain" where all 3 solvers said SAT as a qualified pass
  return result === "SAT";
}

function isUnsatLike(result: string): boolean {
  return result === "UNSAT";
}

// ─── Banner ──────────────────────────────────────────────────

export function printBanner() {
  console.log();
  console.log(`${BOLD}${C}  ╔══════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}${C}  ║       VERIFIABLE MCP — Demo Pipeline        ║${RESET}`);
  console.log(`${BOLD}${C}  ║  Forage discovery  ×  ICME Preflight verify  ║${RESET}`);
  console.log(`${BOLD}${C}  ╚══════════════════════════════════════════════╝${RESET}`);
  console.log();
}

// ─── Search phase ────────────────────────────────────────────

export function printSearchPhase(query: string, results: RegistryEntry[]) {
  console.log(`${BOLD}[1/3] DISCOVERY${RESET}  ${DIM}(simulated forage_search)${RESET}`);
  console.log(line());
  console.log(`  Query: ${Y}"${query}"${RESET}`);
  console.log(`  Found: ${results.length} candidates\n`);

  for (const e of results) {
    const sourceTag =
      e.source === "smithery"
        ? `${G}smithery${RESET}`
        : e.source === "mcp-registry"
          ? `${B}mcp-registry${RESET}`
          : `${DIM}npm${RESET}`;

    console.log(`  ${BOLD}${e.displayName}${RESET}  ${DIM}(${e.name})${RESET}`);
    console.log(`    source: ${sourceTag}   downloads: ${e.weeklyDownloads.toLocaleString()}/wk`);
    console.log(`    ${DIM}${e.description.slice(0, 90)}...${RESET}`);
    console.log();
  }
}

// ─── Verification phase ─────────────────────────────────────

export function printVerifyPhaseStart(policyId: string) {
  console.log(`${BOLD}[2/3] VERIFICATION${RESET}  ${DIM}(ICME Preflight checkIt)${RESET}`);
  console.log(line());
  console.log(`  Policy: ${DIM}${policyId}${RESET}\n`);
}

export function printVerifyProgress(
  result: VerificationResult,
  index: number,
  total: number
) {
  const { entry, response, durationMs } = result;
  const icon = verdictIcon(response.result);
  const solvers = `llm=${response.llm_result} ar=${response.ar_result} z3=${response.z3_result}`;

  console.log(
    `  [${index + 1}/${total}] ${BOLD}${entry.displayName}${RESET}  →  ${icon}  ${DIM}(${durationMs}ms)${RESET}`
  );
  console.log(`         solvers: ${DIM}${solvers}${RESET}`);

  if (response.ar_detail) {
    console.log(`         ar note: ${DIM}${response.ar_detail}${RESET}`);
  }

  if (response.extracted) {
    const vars = Object.entries(response.extracted)
      .map(([k, v]) => {
        const display =
          typeof v === "boolean"
            ? v
              ? `${G}true${RESET}`
              : `${R}false${RESET}`
            : String(v);
        return `${k}=${display}`;
      })
      .join(", ");
    console.log(`         extracted: ${DIM}${vars}${RESET}`);
  }

  if (response.zk_proof_url) {
    console.log(`         proof: ${M}${response.zk_proof_url}${RESET}`);
  }

  if (entry._honeypot) {
    console.log(`         ${Y}⚠ NOTE: this was a honeypot entry${RESET}`);
  }

  console.log();
}

// ─── Results summary ─────────────────────────────────────────

export function printResultsSummary(results: VerificationResult[]) {
  const sat = results.filter((r) => r.response.result === "SAT");
  const uncertain = results.filter(
    (r) => !isSatLike(r.response.result) && !isUnsatLike(r.response.result)
  );
  const unsat = results.filter((r) => isUnsatLike(r.response.result));
  const honeypotsCaught = [...unsat, ...uncertain].filter(
    (r) => r.entry._honeypot
  );

  console.log(`${BOLD}[3/3] RESULTS${RESET}`);
  console.log(line());

  console.log(`\n  ${G}${BOLD}Verified (SAT) — safe to install:${RESET}`);
  if (sat.length === 0) {
    console.log(`    ${DIM}(none)${RESET}`);
  }
  for (const r of sat) {
    console.log(
      `    ${G}✔${RESET} ${r.entry.displayName} ${DIM}(${r.entry.name})${RESET}`
    );
  }

  if (uncertain.length > 0) {
    console.log(
      `\n  ${Y}${BOLD}Uncertain (AR inconclusive) — needs review:${RESET}`
    );
    for (const r of uncertain) {
      const honeypotTag = r.entry._honeypot
        ? ` ${Y}← honeypot${RESET}`
        : "";
      console.log(
        `    ${Y}⚠${RESET} ${r.entry.displayName} ${DIM}(${r.entry.name})${RESET}${honeypotTag}`
      );
    }
  }

  console.log(`\n  ${R}${BOLD}Rejected (UNSAT) — do not install:${RESET}`);
  if (unsat.length === 0) {
    console.log(`    ${DIM}(none)${RESET}`);
  }
  for (const r of unsat) {
    const honeypotTag = r.entry._honeypot
      ? ` ${Y}← honeypot caught!${RESET}`
      : "";
    console.log(
      `    ${R}✘${RESET} ${r.entry.displayName} ${DIM}(${r.entry.name})${RESET}${honeypotTag}`
    );
  }

  console.log(`\n  ${line("─", 40)}`);
  console.log(`  Total checked:    ${results.length}`);
  console.log(`  Passed (SAT):     ${G}${sat.length}${RESET}`);
  console.log(`  Uncertain:        ${Y}${uncertain.length}${RESET}`);
  console.log(`  Failed (UNSAT):   ${R}${unsat.length}${RESET}`);
  console.log(
    `  Honeypots caught: ${Y}${honeypotsCaught.length}/${results.filter((r) => r.entry._honeypot).length}${RESET}`
  );
  console.log();
}
