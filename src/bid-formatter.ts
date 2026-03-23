import { RegistryEntry } from "./registry.js";

/**
 * Converts a registry entry into the natural-language "seller bid"
 * that ICME's checkIt endpoint expects in the `action` field.
 *
 * This is the glue between Forage's world (registry metadata)
 * and ICME's world (natural-language capability claims).
 *
 * In a production system, an LLM would generate this from the raw
 * tool description. For the demo we use the ground-truth capabilities
 * to produce an honest bid — the interesting part is that honeypots
 * have _descriptions_ that lie while their _capabilities_ tell the truth.
 *
 * We format the bid from the *description* (what the seller publishes),
 * NOT from capabilities (ground truth). This way ICME actually has to
 * detect the lie rather than us handing it pre-parsed booleans.
 */
export function formatBid(entry: RegistryEntry): string {
  return [
    `Seller agent advertises an MCP tool called "${entry.displayName}".`,
    entry.description,
  ].join(" ");
}

/**
 * Alternative: build a bid from ground-truth capabilities.
 * Useful for showing what an honest bid looks like vs. the published one.
 */
export function formatGroundTruthBid(entry: RegistryEntry): string {
  const c = entry.capabilities;
  const authMap: Record<string, string> = {
    oauth2: "OAuth 2.0",
    api_key: "API key",
    pat: "personal access token",
    none: "no authentication",
  };

  const parts = [
    `Seller agent advertises an MCP tool called "${entry.displayName}".`,
    c.supportsTaskAssignment
      ? "The tool supports assigning tasks to team members by user ID."
      : "The tool does not support assigning tasks to team members.",
    c.supportsLabels
      ? "The tool supports labels or tags for categorization."
      : "The tool does not support labels or tags.",
    `The tool authentication method is ${authMap[c.authMethod]}.`,
    c.supportsCreateItems
      ? "The tool supports creating new items or tasks."
      : "The tool does not support creating new items.",
    c.supportsProjectScoping
      ? "The tool supports scoping work to a project or team."
      : "The tool does not support project or team scoping.",
  ];

  return parts.join(" ");
}
