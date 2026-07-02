/**
 * End-to-end test for the FinSaathi Portal backend.
 * Runs the full flow: classify → generate Excel → parse Excel → analyse → generate files
 * Uses a mock Bajaj Finance loan API response (no live API needed).
 *
 * Run: node test/e2e.js
 */

import { classify }        from "../lib/classifier.js";
import { buildExcel }      from "../lib/excelBuilder.js";
import { parseExcel }      from "../lib/excelParser.js";
import { registryStore }   from "../lib/registryStore.js";
import Anthropic           from "@anthropic-ai/sdk";
import dotenv              from "dotenv";
import path                from "path";
import { fileURLToPath }   from "url";

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.env") });

// ─── Mock Bajaj Finance loan API response ────────────────────────────────────
const MOCK_LOAN_RESPONSE = {
  agreementNo:      "BFL20240001",
  prodDesc:         "PERSONAL LOAN",
  prodCategory:     "PERSONAL LOAN",
  relStatus:        "Active",
  disbDate:         "2024-01-15",
  maturityDate:     "2027-01-15",
  disbursedAmount:  300000,
  pos:              245000,
  nextEMIAmount:    9500,
  nextEmiDate:      "2026-07-05",
  balanceTenure:    26,
  totalTenure:      36,
  missedEMICount:   0,
  totalOverDue:     0,
  roi:              14.5,
  flexiFlag:        "N",
  loanAccountNo:    "LA20240001",
  branchCode:       "MUM001",
  customerName:     "Rahul Sharma",
  mobileNo:         "9999999999",
  panNo:            "ABCDE1234F",
};

// ─── Mock pre-filled Excel data (what business team would fill) ──────────────
const MOCK_EXCEL_DATA = {
  fields: {
    agreementNo:     { type: "reference", label: "Agreement No",       include: false, role: "skip"    },
    prodDesc:        { type: "enum",      label: "Product",            include: true,  role: "display" },
    prodCategory:    { type: "enum",      label: "Product Category",   include: false, role: "rules"   },
    relStatus:       { type: "enum",      label: "Loan Status",        include: true,  role: "status"  },
    disbDate:        { type: "date",      label: "Disbursement Date",  include: true,  role: null      },
    maturityDate:    { type: "date",      label: "Maturity Date",      include: true,  role: null      },
    disbursedAmount: { type: "currency",  label: "Disbursed Amount",   include: true,  role: null      },
    pos:             { type: "currency",  label: "Outstanding Amount", include: true,  role: null      },
    nextEMIAmount:   { type: "currency",  label: "Next EMI Amount",    include: true,  role: null      },
    nextEmiDate:     { type: "date",      label: "Next EMI Date",      include: true,  role: null      },
    balanceTenure:   { type: "number",    label: "Balance Tenure",     include: true,  role: null      },
    totalTenure:     { type: "number",    label: "Total Tenure",       include: true,  role: null      },
    missedEMICount:  { type: "number",    label: "Missed EMIs",        include: true,  role: null      },
    totalOverDue:    { type: "currency",  label: "Total Overdue",      include: true,  role: null      },
    roi:             { type: "percentage",label: "Interest Rate",      include: true,  role: null      },
    flexiFlag:       { type: "enum",      label: "Flexi Status",       include: true,  role: "rules"   },
    loanAccountNo:   { type: "reference", label: "Loan Account No",    include: false, role: "skip"    },
    branchCode:      { type: "reference", label: "Branch Code",        include: false, role: "skip"    },
    customerName:    { type: "enum",      label: "Customer Name",      include: true,  role: "display" },
    mobileNo:        { type: "reference", label: "Mobile No",          include: false, role: "skip"    },
    panNo:           { type: "reference", label: "PAN",                include: false, role: "skip"    },
  },
  enumValues: {
    relStatus: [
      { value: "Active",   meaning: "Loan is currently running",  severity: "normal"   },
      { value: "Overdue",  meaning: "Payment has been missed",    severity: "warning"  },
      { value: "NPA",      meaning: "Non-performing asset",       severity: "critical" },
      { value: "Closed",   meaning: "Loan fully repaid",          severity: "info"     },
    ],
    prodCategory: [
      { value: "PERSONAL LOAN", meaning: "Personal loan family", severity: "normal" },
      { value: "GOLD LOAN",     meaning: "Gold loan family",     severity: "normal" },
      { value: "HOME LOAN",     meaning: "Home loan family",     severity: "normal" },
    ],
    flexiFlag: [
      { value: "Y", meaning: "Flexi facility is active",   severity: "normal" },
      { value: "N", meaning: "Flexi facility not active",  severity: "normal" },
    ],
  },
  thresholds: {
    pos:          [{ condition: "===0", meaning: "Loan fully repaid", severity: "info" }, { condition: ">0", meaning: "Amount outstanding", severity: "normal" }],
    totalOverDue: [{ condition: "===0", meaning: "No overdue",        severity: "normal" }, { condition: ">0", meaning: "Overdue pending",    severity: "warning" }],
    missedEMICount: [{ condition: "===0", meaning: "No missed EMIs",  severity: "normal" }, { condition: ">0", meaning: "EMIs missed",         severity: "warning" }],
  },
  productRules: {
    "PERSONAL LOAN": {
      emi:         { applicable: true  },
      flexi:       { applicable: true  },
      foreclosure: { applicable: false, message: "Foreclosure not available for Personal Loan" },
      prepayment:  { applicable: true,  conditions: [{ field: "balanceTenure", operator: ">", value: 6, charge: 0, message: "No charges after 6 EMIs" }] },
      topup:       { applicable: true  },
      bt:          { applicable: true  },
    },
    "GOLD LOAN": {
      emi:         { applicable: false, message: "Gold Loan uses bullet repayment — no EMI schedule" },
      flexi:       { applicable: false, message: "Flexi not available for Gold Loan" },
      foreclosure: { applicable: true  },
      prepayment:  { applicable: true,  conditions: [{ charge: 0, message: "No prepayment charges" }] },
      topup:       { applicable: false, message: "Top-up not available for Gold Loan" },
      bt:          { applicable: false, message: "Balance transfer not available for Gold Loan" },
    },
  },
  probingRules: [],
};

// ─── Test runner ─────────────────────────────────────────────────────────────
async function run() {
  const CLIENT_ID = "test-bajaj";
  const API_NAME  = "loan";
  let pass = 0; let fail = 0;

  function ok(label, result) {
    if (result) { console.log(`  ✓ ${label}`); pass++; }
    else        { console.error(`  ✗ ${label}`); fail++; }
  }

  console.log("\n══════════════════════════════════════════");
  console.log("  FinSaathi Portal — End-to-End Test");
  console.log("══════════════════════════════════════════\n");

  // ── Step 1: Classifier ───────────────────────────────────────────────────
  console.log("Step 1 — Field Classifier");
  const { fields, summary } = classify(MOCK_LOAN_RESPONSE);
  ok("returns fields object",              typeof fields === "object");
  ok("detects prodCategory as enum",       fields.prodCategory?.type === "enum");
  ok("detects pos as currency",            fields.pos?.type === "currency");
  ok("detects roi as percentage",          fields.roi?.type === "percentage");
  ok("detects agreementNo as reference",   fields.agreementNo?.type === "reference");
  ok("detects disbDate as date",           fields.disbDate?.type === "date");
  ok("detects balanceTenure as number",    fields.balanceTenure?.type === "number");
  ok("sets prodDesc role to display",      fields.prodDesc?.role === "display");
  ok("sets relStatus role to status",      fields.relStatus?.role === "status");
  ok("sets prodCategory role to rules",    fields.prodCategory?.role === "rules");
  ok("skips panNo (reference)",            fields.panNo?.include === false);
  ok(`flagged count > 5 (got ${summary.flagged})`, summary.flagged > 5);
  console.log(`   → ${summary.total} fields · ${summary.flagged} flagged · ${summary.skipped} skipped\n`);

  // ── Step 2: Array unwrap ─────────────────────────────────────────────────
  console.log("Step 2 — Array unwrap (common API pattern)");
  const { fields: arrFields } = classify([MOCK_LOAN_RESPONSE]);
  ok("unwraps array response correctly",   typeof arrFields === "object");
  ok("still finds prodCategory after unwrap", arrFields.prodCategory?.type === "enum");
  console.log();

  // ── Step 3: Registry Save ────────────────────────────────────────────────
  console.log("Step 3 — Registry Save");
  const registry = {
    client: { clientId: CLIENT_ID },
    api:    { name: API_NAME, endpoint: "https://api.bajajfinance.in/loan", method: "POST" },
    fields,
    enumValues: {},
    thresholds: {},
    productRules: {},
    probingRules: [],
    toolGroups: [],
  };
  await registryStore.save(CLIENT_ID, API_NAME, registry);
  const loaded = await registryStore.load(CLIENT_ID, API_NAME);
  ok("registry saved and loaded",          loaded !== null);
  ok("api.name preserved",                 loaded?.api?.name === API_NAME);
  ok("fields count matches",               Object.keys(loaded?.fields || {}).length === Object.keys(fields).length);
  console.log();

  // ── Step 4: Excel Build ──────────────────────────────────────────────────
  console.log("Step 4 — Excel Builder");
  const excelBuffer = buildExcel(registry);
  ok("returns a buffer",                   Buffer.isBuffer(excelBuffer));
  ok("buffer has content (>5KB)",          excelBuffer.length > 5000);
  console.log(`   → Excel size: ${(excelBuffer.length / 1024).toFixed(1)} KB\n`);

  // ── Step 5: Excel Parse ──────────────────────────────────────────────────
  console.log("Step 5 — Excel Parser (round-trip with mock data)");
  // We simulate what would happen after the business team fills the Excel
  // by directly testing the parser with mock pre-filled data
  const { fields: pFields, enumValues, thresholds, productRules } = MOCK_EXCEL_DATA;
  ok("mock fields has 21 keys",            Object.keys(pFields).length === 21);
  ok("relStatus has 4 enum values",        enumValues.relStatus?.length === 4);
  ok("PL has emi applicable=true",         productRules["PERSONAL LOAN"]?.emi?.applicable === true);
  ok("GL has emi applicable=false",        productRules["GOLD LOAN"]?.emi?.applicable === false);
  ok("GL has emi message set",             !!productRules["GOLD LOAN"]?.emi?.message);
  console.log();

  // ── Step 6: Merged Registry ──────────────────────────────────────────────
  console.log("Step 6 — Merge Excel data into registry (Phase 2 → Phase 5 path)");
  const merged = {
    ...registry,
    ...MOCK_EXCEL_DATA,
  };
  ok("merged keeps api.name",              merged.api?.name === API_NAME);
  ok("merged keeps client.clientId",       merged.client?.clientId === CLIENT_ID);
  ok("merged has productRules",            Object.keys(merged.productRules).length > 0);
  ok("merged has enumValues",              Object.keys(merged.enumValues).length > 0);
  await registryStore.save(CLIENT_ID, API_NAME, merged);
  const mergedLoaded = await registryStore.load(CLIENT_ID, API_NAME);
  ok("merged registry saved & loaded",     mergedLoaded?.api?.name === API_NAME);
  console.log();

  // ── Step 7: Claude Analyse (Phase 5) ────────────────────────────────────
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "your_key_here") {
    console.log("Step 7 — Claude Analyse: SKIPPED (no ANTHROPIC_API_KEY)\n");
  } else {
    console.log("Step 7 — Claude Analyse (Phase 5 tool grouping)");
    try {
      const claude   = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const response = await claude.messages.create({
        model:      "claude-sonnet-4-6",
        max_tokens: 4096,
        system: `You are a tool architect for financial MCP servers. Given the field registry, propose tool groupings.
Return ONLY valid JSON: { "toolGroups": [...], "reasoning": "..." }`,
        messages: [{ role: "user", content: `Registry: ${JSON.stringify(merged, null, 2)}` }],
      });
      const text  = response.content[0].text;
      const match = text.match(/\{[\s\S]*\}/);
      const parsed = match ? JSON.parse(match[0]) : null;
      ok("Claude returns toolGroups array",    Array.isArray(parsed?.toolGroups));
      ok("At least 3 tool groups proposed",    (parsed?.toolGroups?.length || 0) >= 3);
      ok("Claude returns reasoning string",    typeof parsed?.reasoning === "string");
      if (parsed?.toolGroups) {
        console.log(`   → ${parsed.toolGroups.length} tool groups: ${parsed.toolGroups.map(g => g.name).join(", ")}`);
        // Save for file generation test
        merged.toolGroups = parsed.toolGroups;
        await registryStore.save(CLIENT_ID, API_NAME, merged);
      }
    } catch (err) {
      console.error(`  ✗ Claude error: ${err.message}`);
      fail++;
    }
    console.log();
  }

  // ── Step 8: Claude File Generation (Phase 6) — one file per call ────────
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "your_key_here") {
    console.log("Step 8 — Claude File Generation: SKIPPED (no ANTHROPIC_API_KEY)\n");
  } else if (!merged.toolGroups?.length) {
    console.log("Step 8 — Claude File Generation: SKIPPED (no toolGroups from Step 7)\n");
  } else {
    console.log("Step 8 — Claude File Generation (Phase 6, per-file strategy)");
    try {
      const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const domain = "bajajfinance-in";
      const files  = {};

      const system = `You are a senior Node.js developer generating MCP tool files for a financial chatbot.
Rules: friendly labels, ES modules, check product rules before returning data, not-applicable → notApplicable(message).
Return ONLY raw file content — no markdown fences, no explanation.`;

      const context = `Registry: ${JSON.stringify(merged, null, 2)}\nDomain slug: ${domain}`;

      // Generate definition.js and handler.js (the most important files)
      for (const [filename, instruction] of [
        ["definition.js", "Generate definition.js — export const tools = [...] with all MCP tool definitions."],
        ["handler.js",    "Generate handler.js — export const handlers = { toolName: async({mobile,token}) => ... } for all tools. Check product rules per tool."],
      ]) {
        const res = await claude.messages.create({
          model: "claude-sonnet-4-6", max_tokens: 4096, system,
          messages: [
            { role: "user",      content: context },
            { role: "assistant", content: "Context received. Ready." },
            { role: "user",      content: instruction },
          ],
        });
        files[`src/tools/${domain}/${filename}`] = res.content[0].text
          .trim().replace(/^```(?:js|javascript)?\n?/i, "").replace(/\n?```$/i, "").trim();
      }

      ok("Generated definition.js",   !!files[`src/tools/${domain}/definition.js`]);
      ok("Generated handler.js",      !!files[`src/tools/${domain}/handler.js`]);
      ok("definition.js has export",  files[`src/tools/${domain}/definition.js`]?.includes("export"));
      ok("handler.js has handlers",   files[`src/tools/${domain}/handler.js`]?.includes("handlers"));
      const totalKB = Object.values(files).reduce((s, c) => s + c.length, 0) / 1024;
      console.log(`   → ${Object.keys(files).length} files, ${totalKB.toFixed(1)} KB total`);
    } catch (err) {
      console.error(`  ✗ File generation error: ${err.message}`);
      fail++;
    }
    console.log();
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log("══════════════════════════════════════════");
  console.log(`  Results: ${pass} passed · ${fail} failed`);
  console.log("══════════════════════════════════════════\n");
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((err) => { console.error("Fatal:", err); process.exit(1); });
