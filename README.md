# Verified Forage

**What if your AI agent could prove — mathematically — that a tool does what it claims before installing it?**

AI agents are starting to pick their own tools. Using the Model Context Protocol (MCP), an agent can search open registries, find a tool that looks right, and install it — all without a human in the loop. The problem is that any tool can say anything in its description. There's no verification. The agent just trusts the listing.

This project adds a verification gate between discovery and installation. The agent finds candidate tools through Forage, then each tool's claims are formally checked by ICME Preflight before anything gets installed.

## How it works

**1. The agent states what it needs**

A buyer agent defines its requirements in plain language — for example, "I need a project management tool that supports task assignment, labels, OAuth 2.0 authentication, creating new items, and project scoping."

**2. ICME Preflight compiles the requirements into a machine-checkable policy**

The natural-language requirements are sent to ICME Preflight's `makeRules` endpoint, which compiles them into formal logic constraints. This happens once. The result is a reusable policy ID.

**3. Forage discovers candidate tools**

Forage searches MCP registries (Smithery, MCP Registry, npm) and returns a list of tools that match the agent's search query. Each tool comes with a description published by the seller.

**4. ICME Preflight verifies each tool's claims**

This is the core step. Each tool's published description is submitted to ICME Preflight's `checkIt` endpoint along with the compiled policy. ICME runs the claims through three independent verification engines:

- An **LLM solver** that interprets the natural-language claims
- An **abstraction-refinement engine** that applies formal reasoning
- A **Z3 constraint solver** that checks satisfiability

All three must agree. If a tool satisfies every constraint, ICME issues a **cryptographic proof of compliance** — a tamper-proof receipt that the tool meets the buyer's requirements. If any constraint fails, the tool is rejected with a clear explanation of what it failed on.

**5. The agent installs only verified tools**

Tools that passed get installed with their proof attached. Tools that didn't pass are rejected. No trust-on-first-use. No guessing.

## What the demo shows

The demo walks through this pipeline with five MCP tools:

| Tool | Source | Verdict | Why |
|------|--------|---------|-----|
| Linear MCP Server | Smithery | **SAT** | Meets all 5 requirements, proof issued |
| Jira MCP Server | Smithery | **SAT** | Meets all 5 requirements, proof issued |
| Asana MCP Server | MCP Registry | **SAT** | Meets all 5 requirements, proof issued |
| TaskMaster Pro | npm | **UNSAT** | Claims OAuth 2.0 in description but actually uses API keys — caught |
| ProjectFlow AI | npm | **UNSAT** | Claims full feature set but missing labels and project scoping — caught |

The three mainstream tools from reputable registries pass. The two deceptive tools (honeypots) get caught and rejected. The verification system distinguishes honest descriptions from inflated ones without any human review.

## Running the demo

```bash
npm install
npm run build
```

**Web UI** (recommended):
```bash
npm run ui
# Open http://localhost:3000
# Click "Run Verification" and watch the three phases animate
```

**CLI**:
```bash
npm run demo        # Full pipeline with ICME API calls
npm run demo:mock   # Mock mode, no API calls needed
```

The web UI is a three-column layout — buyer agent requirements on the left, discovered tools in the middle, verification results on the right — with a full-width annotation banner that narrates each phase as it happens.

## Architecture

```
Agent requirements
    |
    v
ICME Preflight makeRules  -->  Compiled policy (reusable)
    |
    v
Forage search  -->  Candidate MCP tools from registries
    |
    v
ICME Preflight checkIt  -->  3 solvers reach consensus
    |                        |
    v                        v
   SAT + ZK proof          UNSAT + failure explanation
    |
    v
forage_install (with proof)
```

## Project structure

```
src/
  index.ts            Demo orchestrator (discover -> verify -> results)
  registry.ts         Mock MCP tool registry (3 honest + 2 honeypots)
  verifier.ts         ICME Preflight verification (real API calls)
  mock-verifier.ts    Offline mock verification (no API calls)
  icme-client.ts      ICME API client (makeRules + checkIt)
  bid-formatter.ts    Converts registry entries to natural-language bids
  server.ts           HTTP server for the web UI
  display.ts          Terminal output formatting
  compile-policy.ts   One-time policy compilation script
web/
  index.html          Three-column demo UI
  app.js              Client-side demo orchestration
  style.css           Light theme (warm sand palette)
```

## Environment

Requires an ICME API key for live verification:

```bash
echo "ICME_API_KEY=your-key-here" > .env
```

Mock mode (`npm run demo:mock`) works without an API key.

## Why this matters

MCP registries are growing fast. Agents are gaining the ability to install tools autonomously. The descriptions in those registries are self-attested — anyone can publish anything. Without a verification layer, an agent has no way to distinguish a tool that actually meets its requirements from one that just claims to.

ICME Preflight provides that verification layer. It turns natural-language requirements into formal constraints, checks tool claims against those constraints using multiple independent solvers, and issues cryptographic proofs when tools pass. The result is a trust boundary between discovery and installation that doesn't depend on reviews, download counts, or reputation — just verifiable proof of capability match.

Forage handles the discovery. ICME Preflight handles the truth.
