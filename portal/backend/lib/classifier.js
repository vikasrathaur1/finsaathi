/**
 * Auto-classifies fields from a raw API JSON response.
 * Returns { fields, summary } to populate the registry.
 */

const REFERENCE_SUFFIXES  = ["no", "id", "code", "ref", "num", "number"];
const PERCENTAGE_KEYWORDS = ["roi", "rate", "pct", "percent", "interest", "irr", "apr"];
const CURRENCY_KEYWORDS   = ["amount", "pos", "due", "charge", "fee", "limit", "outstanding", "balance", "overdue", "principal", "installment", "emi", "disburs", "repay", "foreclos"];
const NUMBER_KEYWORDS     = ["tenure", "count", "missed", "bounce", "pending", "remaining", "total", "days", "month", "year"];
const DATE_PATTERNS       = [
  /^\d{4}-\d{2}-\d{2}(T.*)?$/,
  /^\d{2}\/\d{2}\/\d{4}$/,
  /^\d{2}-\d{2}-\d{4}$/,
];
const SKIP_MARKERS        = ["internal", "sys", "hash", "token", "secret", "key"];

const SPECIAL_ROLES = {
  prodDesc:    "display",
  prodCategory:"rules",
  relStatus:   "status",
  status:      "status",
  loanStatus:  "status",
  loanType:    "rules",
};

export function classify(responseData, prefix = "") {
  // Unwrap array — take first element as the schema sample
  if (Array.isArray(responseData)) {
    if (responseData.length === 0) return { fields: {}, summary: { total: 0, flagged: 0, skipped: 0 } };
    responseData = responseData[0];
  }
  // Unwrap common wrapper patterns:
  //   { data: {...} }   → unwrap to inner object
  //   { loan: [{...}] } → unwrap to first array element  (Bajaj Finance pattern)
  const topKeys = Object.keys(responseData);
  if (topKeys.length === 1) {
    const inner = responseData[topKeys[0]];
    if (Array.isArray(inner) && inner.length > 0) {
      responseData = inner[0]; // { loan: [{...}] } → first loan object
    } else if (typeof inner === "object" && inner !== null && Object.keys(inner).length > 2) {
      responseData = inner;    // { data: {...} } → inner object
    }
  }

  const fields  = {};
  let flagged   = 0;
  let skipped   = 0;
  const seenVals = new Set();

  const walk = (obj, path = "") => {
    if (typeof obj !== "object" || obj === null || Array.isArray(obj)) return;

    for (const [key, val] of Object.entries(obj)) {
      const fullKey = path ? `${path}.${key}` : key;

      // Skip objects/arrays — recurse
      if (typeof val === "object" && val !== null && !Array.isArray(val)) {
        walk(val, fullKey);
        continue;
      }

      const lk = key.toLowerCase();

      // Skip internal keys
      if (SKIP_MARKERS.some((m) => lk.includes(m))) {
        fields[fullKey] = { type: "skip", label: toLabel(key), include: false, role: null };
        skipped++;
        continue;
      }

      // Skip nulls
      if (val === null || val === undefined) {
        fields[fullKey] = { type: "skip", label: toLabel(key), include: false, role: null };
        skipped++;
        continue;
      }

      // Duplicate value detection — skip if another field already has same value
      // BUT never skip fields that have a special role (prodCategory, relStatus etc.)
      const valStr  = String(val);
      const hasRole = !!SPECIAL_ROLES[key];
      if (!hasRole && seenVals.has(valStr) && typeof val === "string") {
        fields[fullKey] = { type: "skip", label: toLabel(key), include: false, role: "duplicate" };
        skipped++;
        continue;
      }
      if (typeof val === "string" && val.length > 0) seenVals.add(valStr);

      // Reference (ID/code fields)
      if (REFERENCE_SUFFIXES.some((s) => lk.endsWith(s))) {
        fields[fullKey] = { type: "reference", label: toLabel(key), include: false, role: "skip" };
        skipped++;
        continue;
      }

      const type = detectType(key, val, lk);
      const role = SPECIAL_ROLES[key] || null;
      const include = !["skip", "reference"].includes(type);

      if (include) flagged++;
      else skipped++;

      fields[fullKey] = { type, label: toLabel(key), include, role };
    }
  };

  walk(responseData);

  return {
    fields,
    summary: {
      total:   Object.keys(fields).length,
      flagged,
      skipped,
    },
  };
}

function detectType(key, val, lk) {
  // Date
  if (typeof val === "string" && DATE_PATTERNS.some((r) => r.test(val))) return "date";

  // Percentage
  if (PERCENTAGE_KEYWORDS.some((k) => lk.includes(k))) return "percentage";

  // Enum — short non-numeric string
  if (typeof val === "string" && val.length > 0 && val.length <= 50 && isNaN(Number(val))) {
    return "enum";
  }

  // Number check BEFORE currency — more specific keywords win (tenure beats balance)
  if (
    (typeof val === "number" || (typeof val === "string" && !isNaN(Number(val)))) &&
    NUMBER_KEYWORDS.some((k) => lk.includes(k))
  ) {
    return "number";
  }

  // Currency — numeric + currency keyword
  if (
    (typeof val === "number" || (typeof val === "string" && !isNaN(Number(val)))) &&
    CURRENCY_KEYWORDS.some((k) => lk.includes(k))
  ) {
    return "currency";
  }

  // Number fallback — numeric but no specific keyword
  if (
    (typeof val === "number" || (typeof val === "string" && !isNaN(Number(val)))) &&
    NUMBER_KEYWORDS.some((k) => lk.includes(k))
  ) {
    return "number";
  }

  // Fallback: if it's a number, treat as number
  if (typeof val === "number") return "number";

  // Fallback: generic string → enum (small) or skip (large)
  if (typeof val === "string") {
    return val.length <= 100 ? "enum" : "skip";
  }

  return "skip";
}

function toLabel(key) {
  // camelCase → "Friendly Label"
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .trim()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
