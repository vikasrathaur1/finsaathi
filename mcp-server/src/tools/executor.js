/**
 * Executes a tool call by:
 * 1. Validating the customer session token
 * 2. Calling the NBFC API with the customer's mobile
 * 3. Mapping raw API fields to friendly labels using the registry
 * 4. Applying product rules (applicable / not-applicable)
 * 5. Returning a formatted response
 */

import { validateToken }           from "../auth/session.js";
import { getTools, getRegistry }   from "./loader.js";
import { success, failure, notApplicable, formatCurrency, formatDate, formatPct } from "../helpers.js";

const NBFC_API_URL = process.env.NBFC_API_URL || "";
const NBFC_API_KEY = process.env.NBFC_API_KEY || "";

export async function executeTool(toolName, args) {
  const { mobile, token } = args;

  // ── Session validation ────────────────────────────────────────────────────
  if (!token) {
    return failure("Authentication required. Please call send_otp first.");
  }
  const session = validateToken(token);
  if (!session.valid) {
    return failure(`Session expired or invalid. Please call send_otp again. (${session.reason})`);
  }
  if (session.mobile !== mobile) {
    return failure("Token does not match the provided mobile number.");
  }

  // Find which registry owns this tool (each tool is tagged with _registry: apiName)
  const toolDef  = getTools().find((t) => t.name === toolName);
  const registry = getRegistry(toolDef?._registry);
  if (!registry) {
    return failure("Tool registry not loaded. Please contact support.");
  }

  // ── Find tool group in registry ───────────────────────────────────────────
  const toolGroup = (registry.toolGroups || []).find((g) => g.name === toolName);
  if (!toolGroup) {
    return failure(`Unknown tool: ${toolName}`);
  }

  // ── Fetch customer data from NBFC API ─────────────────────────────────────
  let rawData;
  try {
    rawData = await fetchNbfcData(mobile, registry.api);
  } catch (err) {
    return failure(`Could not reach the loan server. Please try again. (${err.message})`);
  }

  if (!rawData) {
    return failure("Customer data not found. Please check your registered mobile number.");
  }

  // ── Product rules check ───────────────────────────────────────────────────
  const prodCategory = getByPath(rawData, "data.prodCategory") || rawData.prodCategory || "";
  const productRules = registry.productRules?.[prodCategory];

  // Map tool name to feature ID for rule lookup
  const featureId = toolNameToFeatureId(toolName);
  if (featureId && productRules) {
    const rule = productRules[featureId];
    if (rule && rule.applicable === false) {
      return notApplicable(rule.message || `${featureId} is not available for ${prodCategory}`);
    }
  }

  // ── Build formatted response ───────────────────────────────────────────────
  const response = buildResponse(rawData, toolGroup, registry);
  return success(response);
}

async function fetchNbfcData(mobile, apiConfig) {
  if (!NBFC_API_URL && !apiConfig?.endpoint) {
    // Sandbox mode — return mock data
    return SANDBOX_DATA[mobile] || null;
  }

  const endpoint = apiConfig?.endpoint || `${NBFC_API_URL}/loan/details`;
  const method   = apiConfig?.method   || "POST";

  const res = await fetch(endpoint, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(NBFC_API_KEY ? { Authorization: `Bearer ${NBFC_API_KEY}` } : {}),
    },
    body: method !== "GET" ? JSON.stringify({ mobile }) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`NBFC API ${res.status}: ${text.slice(0, 100)}`);
  }

  return res.json();
}

// Resolve dotted paths like "data.prodDesc" into nested object access
function getByPath(obj, path) {
  return path.split(".").reduce((curr, key) => curr?.[key], obj);
}

function buildResponse(rawData, toolGroup, registry) {
  const result = {};
  const fields  = registry.fields || {};

  for (const fieldKey of (toolGroup.fields || [])) {
    const fieldMeta = fields[fieldKey];
    if (!fieldMeta || !fieldMeta.include) continue;

    const rawValue = getByPath(rawData, fieldKey);
    if (rawValue === null || rawValue === undefined) continue;

    const label = fieldMeta.label || fieldKey;
    result[label] = formatValue(rawValue, fieldMeta.type);
  }

  return result;
}

function formatValue(value, type) {
  switch (type) {
    case "currency":   return formatCurrency(value);
    case "date":       return formatDate(value);
    case "percentage": return formatPct(value);
    default:           return String(value);
  }
}

function toolNameToFeatureId(toolName) {
  const map = {
    get_emi_details:         "emi",
    get_flexi_details:       "flexi",
    get_foreclosure_status:  "foreclosure",
    check_loan_closure_eligibility: "foreclosure",
    get_prepayment_details:  "prepayment",
    get_topup_details:       "topup",
    get_balance_transfer:    "bt",
  };
  return map[toolName] || null;
}

// Sandbox data for testing without a live NBFC API.
// Nested under "data" to match the real API shape { success, data: { ... } }.
const SANDBOX_DATA = {
  "9999999999": {
    success: true,
    data: {
      agreementNo:    "BFL20240001",
      prodDesc:       "PERSONAL LOAN",
      prodCategory:   "PERSONAL LOAN",
      relStatus:      "Active",
      disbDate:       "2024-01-15",
      loanExpiryDate: "2027-01-15",
      relAmount:      300000,
      pos:            245000,
      nextEMIAmount:  9500,
      nextEmiDate:    "2026-07-05",
      balanceTenure:  26,
      netTenure:      36,
      missedEmi:      0,
      totalOverDue:   0,
      roi:            14.5,
      flexiFlag:      "N",
      customer_Name:  "Rahul Sharma",
    },
  },
};
