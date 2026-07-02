import { Router }    from "express";
import archiver     from "archiver";
import { claudeClient } from "../lib/claude.js";

const router = Router();

// File specs — one Claude call per file to avoid truncation
const FILE_SPECS = (domain) => [
  {
    path: `src/tools/${domain}/definition.js`,
    instruction: `Generate ONLY definition.js — the MCP tool definitions array.
Export a const named "tools" (array of MCP tool objects with name, description, inputSchema).
Import RESPONSE_RULES from "../../../config/tools.js" and PROBING_RULES from "../../../config/probing.js".
Include probing rule instructions in each relevant tool's description.`,
  },
  {
    path: `src/tools/${domain}/handler.js`,
    instruction: `Generate ONLY handler.js — the async handler functions.
Export a const named "handlers" (object mapping tool name to async function).
Import: success, failure, notApplicable, formatCurrency, formatDate, formatPct from "../../helpers.js"
Import: PRODUCT_RULES from "../../config/rules/${domain}-products.js"
Import: getCustomer from "../../data/customers.js"
Rules:
- Always check PRODUCT_RULES[c.prodCategory].featureId.applicable before returning data
- Return notApplicable(rule.message) when applicable === false
- Use friendly labels (field.label from registry) — never raw field names
- Use formatCurrency for currency fields, formatDate for dates, formatPct for percentages`,
  },
  {
    path: `src/tools/${domain}/index.js`,
    instruction: `Generate ONLY index.js — re-exports only.
export { tools } from "./definition.js";
export { handlers } from "./handler.js";`,
  },
  {
    path: `config/rules/${domain}-products.js`,
    instruction: `Generate ONLY the product rules config file.
Export a const named PRODUCT_RULES.
Use the productRules from the registry to build this object.
Each product category key maps to an object with feature IDs (emi, flexi, foreclosure, prepayment, topup, bt).
Each feature has: applicable (boolean), message (string, when not applicable), conditions (array, when applicable).`,
  },
  {
    path: `config/probing.js`,
    instruction: `Generate ONLY probing.js — exports PROBING_RULES array.
Use the probingRules from the registry.
Each rule: { term, tools, question }.
If no probing rules exist, export an empty array.`,
  },
  {
    path: `config/client.js`,
    instruction: `Generate ONLY client.js — exports CLIENT_CONFIG object.
Use the clientConfig data: clientId, name, domain, channels, auth method, branding.`,
  },
];

router.post("/generate-files", async (req, res) => {
  try {
    const { registry, toolGroups, clientConfig } = req.body;
    if (!registry || !toolGroups) return res.status(400).json({ error: "registry and toolGroups are required" });

    const domain = (clientConfig?.domain || "client").replace(/\./g, "-");

    const system = `You are a senior Node.js developer generating MCP tool files for a financial chatbot.
Rules to follow STRICTLY:
1. Use friendly labels — never raw field names (e.g. use "Outstanding Amount" not c.pos)
2. Import helpers (formatCurrency, formatDate etc.) — never implement inline
3. Check PRODUCT_RULES[c.prodCategory].featureId.applicable before returning data
4. Not-applicable → return notApplicable(message), never an error
5. Use prodCategory for rules, prodDesc for display strings
6. ES module syntax (import/export)
7. Return ONLY the raw file content — no markdown fences, no explanation`;

    const contextMessage = `Registry:
${JSON.stringify({ ...registry, toolGroups }, null, 2)}

Client Config:
${JSON.stringify(clientConfig, null, 2)}

Domain slug: ${domain}`;

    const files = {};

    // Generate each file in a separate Claude call to avoid truncation
    for (const spec of FILE_SPECS(domain)) {
      const response = await claudeClient.messages.create({
        model:      "claude-sonnet-4-6",
        max_tokens: 4096,
        system,
        messages: [
          { role: "user", content: contextMessage },
          { role: "assistant", content: "I have the full context. Ready for each file." },
          { role: "user", content: spec.instruction },
        ],
      });

      const content = response.content[0].text
        .trim()
        .replace(/^```(?:javascript|js)?\n?/i, "")
        .replace(/\n?```$/i, "")
        .trim();

      files[spec.path] = content;
    }

    res.json({ files });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/download-zip", async (req, res) => {
  try {
    const { files, clientId } = req.body;
    if (!files) return res.status(400).json({ error: "files are required" });

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${clientId}-mcp-tools.zip"`);

    const archive = archiver("zip");
    archive.pipe(res);

    for (const [filePath, content] of Object.entries(files)) {
      archive.append(content, { name: filePath });
    }

    await archive.finalize();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
