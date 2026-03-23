# Verifiable MCP

**What if your AI agent could prove — mathematically — that a tool does what it claims before installing it?**

AI agents are starting to pick their own tools. Using the Model Context Protocol (MCP), an agent can search open registries, find a tool that looks right, and install it — all without a human in the loop. The problem is that any tool can say anything in its description. There's no verification. The agent just trusts the listing.

This project adds a verification gate between discovery and installation. The agent finds candidate tools through Forage, then each tool's claims are formally verified by ICME Preflight before anything gets installed.

## How it works

**1. The agent states what it needs**

A buyer agent defines its requirements in plain language — for example, "I need a project management tool that supports task assignment, labels, OAuth 2.0 authentication, creating new items, and project scoping."

**2. Requirements are compiled into formal logic**

The natural-language requirements are sent to ICME Preflight's `makeRules` endpoint. Under the hood, this uses AWS Automated Reasoning (ARc) — the same neurosymbolic framework behind Amazon Bedrock Guardrails — to translate plain English into SMT-LIB, a mathematically precise logic representation. This happens once. The result is a reusable policy ID.

**3. Forage discovers candidate tools**

Forage searches MCP registries (Smithery, MCP Registry, npm) and returns a list of tools that match the agent's search query. Each tool comes with a description published by the seller.

**4. Each tool's claims are formally verified**

This is the core step. Each tool's published description is submitted to ICME Preflight's `checkIt` endpoint along with the compiled policy. The verification pipeline works in two stages:

- An **LLM extracts structured facts** from the tool's natural-language description (e.g., "auth method = OAuth 2.0", "supports labels = true")
- A **Z3 constraint solver** checks whether those extracted facts satisfy every requirement in the formal policy

The result is **SAT** (all constraints satisfied) or **UNSAT** (at least one constraint fails) — not a confidence score, a mathematical proof.

**5. ICME wraps the result in a zero-knowledge proof**

This is what ICME adds on top of AWS ARc. Each verification result is wrapped in a cryptographic zero-knowledge proof using ICME's JOLT-Atlas zkVM. The proof is tamper-proof and independently verifiable — any third party can confirm the guardrail ran correctly, on the policy specified, without trusting ICME or any central authority.

**6. The agent installs only verified tools**

Tools that passed get installed with their cryptographic proof attached. Tools that didn't pass are rejected with a clear explanation of which constraint failed. No trust-on-first-use. No guessing.

## What the demo shows

The demo walks through this pipeline with five MCP tools:

| Tool | Source | Verdict | Why |
|------|--------|---------|-----|
| Linear MCP Server | Smithery | **SAT** | Meets all 5 requirements, cryptographic proof issued |
| Jira MCP Server | Smithery | **SAT** | Meets all 5 requirements, cryptographic proof issued |
| Asana MCP Server | MCP Registry | **SAT** | Meets all 5 requirements, cryptographic proof issued |
| TaskMaster Pro | npm | **UNSAT** | States API key auth, fails the OAuth 2.0 requirement |
| ProjectFlow AI | npm | **UNSAT** | Missing labels and project scoping — caught and rejected |

Three mainstream tools from reputable registries pass verification. Two tools that don't meet the policy constraints are caught and rejected. No human review required.

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
Agent requirements (plain English)
    |
    v
ICME makeRules (AWS ARc: English → SMT-LIB formal logic)
    |
    v
Compiled policy (reusable policy ID)
    |
    v
Forage search → Candidate MCP tools from registries
    |
    v
ICME checkIt (LLM extracts facts → Z3 solver checks constraints)
    |                        |
    v                        v
   SAT + ZK proof          UNSAT + failure explanation
    |
    v
forage_install (with cryptographic receipt)
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

MCP registries are growing fast. Agents are gaining the ability to install tools autonomously. The descriptions in those registries are self-attested — anyone can publish anything. Without a verification layer, an agent has no way to distinguish a tool that meets its requirements from one that just claims to.

ICME Preflight provides that layer. AWS Automated Reasoning translates requirements into formal logic and checks tool claims against them with mathematical precision. ICME adds zero-knowledge proofs so every verification result is cryptographically verifiable by any third party. The result is a trust boundary between discovery and installation that doesn't depend on reviews, download counts, or reputation — just verifiable proof of capability match.

Forage handles the discovery. AWS ARc handles the formal logic. ICME handles the cryptographic trust.
