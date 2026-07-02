/**
 * Fetches ALL API registries for this client from the Portal backend.
 * No API_NAME env var needed — auto-discovers every API the Portal team has set up.
 */

const PORTAL_URL = process.env.PORTAL_API_URL || "http://localhost:4000";
const CLIENT_ID  = process.env.CLIENT_ID || "bajaj-finance";

let cachedRegistries = []; // one entry per API (loan, card, fd …)
let cachedTools      = [];

export async function loadTools() {
  if (!CLIENT_ID) {
    console.error("[Loader] CLIENT_ID env var is required");
    return [];
  }

  try {
    // Step 1: discover all APIs for this client
    const listRes = await fetch(`${PORTAL_URL}/api/registry/${CLIENT_ID}`);
    if (!listRes.ok) throw new Error(`Portal returned ${listRes.status}`);
    const { apis } = await listRes.json();

    if (!apis?.length) {
      console.warn(`[Loader] No APIs found for client ${CLIENT_ID} — have you completed Phase 5 in the Portal?`);
      cachedTools = buildAuthTools();
      return cachedTools;
    }

    // Step 2: load each registry in full
    const registries = [];
    for (const api of apis) {
      if (!api.apiName) continue;
      const res = await fetch(`${PORTAL_URL}/api/registry/${CLIENT_ID}/${api.apiName}`);
      if (!res.ok) { console.warn(`[Loader] Could not load ${api.apiName}`); continue; }
      registries.push(await res.json());
    }

    cachedRegistries = registries;
    cachedTools      = [
      ...buildAuthTools(),
      ...buildDomainTools(registries),
    ];

    console.log(
      `[Loader] ${CLIENT_ID} — loaded ${registries.length} API(s), ` +
      `${cachedTools.length} tools total: ${cachedTools.map(t => t.name).join(", ")}`
    );
  } catch (err) {
    console.error(`[Loader] Failed to load from portal: ${err.message}`);
    cachedTools = buildAuthTools();
  }

  return cachedTools;
}

export function getTools()        { return cachedTools; }
export function getRegistries()   { return cachedRegistries; }
export function getRegistry(name) { return cachedRegistries.find(r => r.api?.name === name) || cachedRegistries[0] || null; }
export async function reloadTools() { return loadTools(); }

// ── Auth tools — always present, no Portal config needed ─────────────────────
function buildAuthTools() {
  return [
    {
      name:        "send_otp",
      description: "Send a one-time password to the customer's registered mobile number. Always call this first if the customer has not authenticated yet.",
      inputSchema: {
        type: "object",
        properties: {
          mobile: { type: "string", description: "Customer's 10-digit registered mobile number" },
        },
        required: ["mobile"],
      },
    },
    {
      name:        "verify_otp",
      description: "Verify the OTP entered by the customer. Returns a session token. Call this after send_otp — the token must be passed to all subsequent tool calls.",
      inputSchema: {
        type: "object",
        properties: {
          mobile: { type: "string", description: "Customer's 10-digit registered mobile number" },
          otp:    { type: "string", description: "6-digit OTP received by the customer" },
        },
        required: ["mobile", "otp"],
      },
    },
  ];
}

// ── Domain tools — built from all API registries ──────────────────────────────
function buildDomainTools(registries) {
  const tools = [];

  for (const registry of registries) {
    const probingRules = registry.probingRules || [];

    for (const group of registry.toolGroups || []) {
      const relevantProbing = probingRules
        .filter((r) => group.fields?.some((f) => f.toLowerCase().includes(r.term.toLowerCase())))
        .map((r) => `PROBING — if user says "${r.term}" and context is unclear, ask: "${r.question}"`)
        .join("\n");

      const notApplicableNotes = Object.entries(group.notApplicable || {})
        .map(([prod, reason]) => `NOT APPLICABLE for ${prod}: ${reason}`)
        .join("\n");

      const applicability =
        group.applicableProducts === "all"
          ? "Applies to all product categories."
          : `Applies to: ${[].concat(group.applicableProducts).join(", ")}.`;

      tools.push({
        name:        group.name,
        description: [group.answers, applicability, relevantProbing, notApplicableNotes]
          .filter(Boolean).join("\n"),
        inputSchema: {
          type: "object",
          properties: {
            mobile: { type: "string", description: "Customer's registered mobile number" },
            token:  { type: "string", description: "Session token from verify_otp" },
          },
          required: ["mobile", "token"],
        },
        _registry: registry.api?.name, // internal tag for dispatcher
      });
    }
  }

  return tools;
}
