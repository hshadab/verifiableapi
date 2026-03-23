/**
 * Mock MCP tool registry.
 *
 * Each entry mirrors the shape a real Forage search would return,
 * but we control the data so the demo is deterministic.
 *
 * Mix: 3 honest tools + 2 honeypots with inflated claims.
 */

export interface RegistryEntry {
  /** npm package or server identifier */
  name: string;
  /** Human-readable display name */
  displayName: string;
  /** Short blurb shown in search results (what the seller publishes) */
  description: string;
  /** Source registry — real entries cite "smithery" or "mcp-registry" */
  source: "smithery" | "mcp-registry" | "npm";
  /** Weekly downloads (social proof signal, not a quality guarantee) */
  weeklyDownloads: number;
  /** Ground truth — hidden from the agent, used to build the bid */
  capabilities: {
    supportsTaskAssignment: boolean;
    supportsLabels: boolean;
    authMethod: "oauth2" | "api_key" | "pat" | "none";
    supportsCreateItems: boolean;
    supportsProjectScoping: boolean;
  };
  /** Is this entry intentionally deceptive? (for demo narration only) */
  _honeypot: boolean;
}

// ─── Honest entries ──────────────────────────────────────────

const linear: RegistryEntry = {
  name: "@mcp-servers/linear",
  displayName: "Linear MCP Server",
  description:
    "MCP server for Linear project management. The tool supports assigning tasks to team members. The tool supports labels and tags for categorization. The tool authentication method is OAuth 2.0. The tool supports creating new items and tasks. The tool supports scoping work to a project or team.",
  source: "smithery",
  weeklyDownloads: 4200,
  capabilities: {
    supportsTaskAssignment: true,
    supportsLabels: true,
    authMethod: "oauth2",
    supportsCreateItems: true,
    supportsProjectScoping: true,
  },
  _honeypot: false,
};

const jira: RegistryEntry = {
  name: "@mcp-servers/jira",
  displayName: "Jira MCP Server",
  description:
    "MCP server for Atlassian Jira. The tool supports assigning tasks to team members. The tool supports labels and tags for categorization. The tool authentication method is OAuth 2.0. The tool supports creating new items and tasks. The tool supports scoping work to a project or team.",
  source: "smithery",
  weeklyDownloads: 5800,
  capabilities: {
    supportsTaskAssignment: true,
    supportsLabels: true,
    authMethod: "oauth2",
    supportsCreateItems: true,
    supportsProjectScoping: true,
  },
  _honeypot: false,
};

const asana: RegistryEntry = {
  name: "@mcp-servers/asana",
  displayName: "Asana MCP Server",
  description:
    "MCP server for Asana work management. The tool supports assigning tasks to team members. The tool supports labels and tags for categorization. The tool authentication method is OAuth 2.0. The tool supports creating new items and tasks. The tool supports scoping work to a project or team.",
  source: "mcp-registry",
  weeklyDownloads: 3900,
  capabilities: {
    supportsTaskAssignment: true,
    supportsLabels: true,
    authMethod: "oauth2",
    supportsCreateItems: true,
    supportsProjectScoping: true,
  },
  _honeypot: false,
};

// ─── Honeypots ───────────────────────────────────────────────

const taskMasterPro: RegistryEntry = {
  name: "taskmaster-pro-mcp",
  displayName: "TaskMaster Pro",
  description:
    "All-in-one project management MCP server. The tool authentication method is API key. Task assignment, labels, sprints, and more. Enterprise-grade project scoping with SSO integration.",
  source: "npm",
  weeklyDownloads: 180,
  capabilities: {
    // Reality: uses API keys, not OAuth 2.0 — description lies
    supportsTaskAssignment: true,
    supportsLabels: true,
    authMethod: "api_key",
    supportsCreateItems: true,
    supportsProjectScoping: true,
  },
  _honeypot: true,
};

const projectFlowAI: RegistryEntry = {
  name: "projectflow-ai-mcp",
  displayName: "ProjectFlow AI",
  description:
    "AI-powered project management MCP server with OAuth 2.0. Smart task assignment with automated priority scoring. Create and manage work items. Does not support labels or tags. No project or team scoping.",
  source: "npm",
  weeklyDownloads: 45,
  capabilities: {
    // Reality: no label support, no project scoping — description is honest about these gaps
    supportsTaskAssignment: true,
    supportsLabels: false,
    authMethod: "oauth2",
    supportsCreateItems: true,
    supportsProjectScoping: false,
  },
  _honeypot: true,
};

// ─── Registry API ────────────────────────────────────────────

const ALL_ENTRIES: RegistryEntry[] = [
  linear,
  jira,
  asana,
  taskMasterPro,
  projectFlowAI,
];

/**
 * Simulates `forage_search` — returns all entries matching a keyword.
 * In the real Forage, this queries Smithery + MCP Registry + npm in parallel.
 */
export function searchRegistry(query: string): RegistryEntry[] {
  const q = query.toLowerCase();
  return ALL_ENTRIES.filter(
    (e) =>
      e.displayName.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.name.toLowerCase().includes(q)
  );
}

/** Return all entries (for the demo walkthrough). */
export function getAllEntries(): RegistryEntry[] {
  return ALL_ENTRIES;
}
