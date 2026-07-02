import * as XLSX from "xlsx";

export function parseExcel(buffer) {
  const wb = XLSX.read(buffer, { type: "buffer" });

  const result = {
    fields:       {},
    enumValues:   {},
    thresholds:   {},
    productRules: {},
    probingRules: [],
  };

  // ── Sheet 1: Field Registry ──────────────────────────────────────────────
  const ws1 = wb.Sheets[wb.SheetNames[0]];
  if (ws1) {
    const rows = XLSX.utils.sheet_to_json(ws1, { header: 1, defval: "" });
    for (let i = 1; i < rows.length; i++) {
      const [fieldName, type, label, include, role, notes] = rows[i];
      if (!fieldName) continue;
      result.fields[fieldName] = {
        type:    type   || "skip",
        label:   label  || fieldName,
        include: String(include).toLowerCase() === "yes",
        role:    role   || null,
        notes:   notes  || "",
      };
    }
  }

  // ── Sheet 2: Enum Values ─────────────────────────────────────────────────
  const ws2 = wb.Sheets[wb.SheetNames[1]];
  if (ws2) {
    const rows = XLSX.utils.sheet_to_json(ws2, { header: 1, defval: "" });
    for (let i = 1; i < rows.length; i++) {
      const [fieldName, value, meaning, severity] = rows[i];
      if (!fieldName || !value) continue;
      if (!result.enumValues[fieldName]) result.enumValues[fieldName] = [];
      result.enumValues[fieldName].push({
        value:    String(value),
        meaning:  meaning  || "",
        severity: severity || "normal",
      });
    }
  }

  // ── Sheet 3: Thresholds ──────────────────────────────────────────────────
  const ws3 = wb.Sheets[wb.SheetNames[2]];
  if (ws3) {
    const rows = XLSX.utils.sheet_to_json(ws3, { header: 1, defval: "" });
    for (let i = 1; i < rows.length; i++) {
      const [fieldName, condition, meaning, severity] = rows[i];
      if (!fieldName || !condition) continue;
      if (!result.thresholds[fieldName]) result.thresholds[fieldName] = [];
      result.thresholds[fieldName].push({
        condition: String(condition),
        meaning:   meaning  || "",
        severity:  severity || "normal",
      });
    }
  }

  // ── Sheet 4: Term Conflicts (for probing rules) ──────────────────────────
  const ws4 = wb.Sheets[wb.SheetNames[3]];
  if (ws4) {
    const rows = XLSX.utils.sheet_to_json(ws4, { header: 1, defval: "" });
    const conflictGroups = {};
    for (let i = 1; i < rows.length; i++) {
      const [term, apiName, fieldName, , resolvedLabel, meaning] = rows[i];
      if (!term || term.startsWith("(")) continue;
      if (!conflictGroups[term]) conflictGroups[term] = { tools: [], question: "" };
      conflictGroups[term].tools.push(fieldName);
    }
    for (const [term, group] of Object.entries(conflictGroups)) {
      if (group.tools.length > 1) {
        result.probingRules.push({
          term,
          tools: group.tools,
          question: `Are you asking about your ${group.tools.map((t) => toLabel(t)).join(" or ")}?`,
        });
      }
    }
  }

  // ── Sheet 5: Feature Matrix ──────────────────────────────────────────────
  const ws5 = wb.Sheets[wb.SheetNames[4]];
  if (ws5) {
    const rows = XLSX.utils.sheet_to_json(ws5, { header: 1, defval: "" });
    if (rows.length > 0) {
      const featureHeaders = rows[0].slice(1); // skip prodCategory column
      for (let i = 1; i < rows.length; i++) {
        const [prodCategory, ...values] = rows[i];
        if (!prodCategory || prodCategory.startsWith("(")) continue;
        if (!result.productRules[prodCategory]) result.productRules[prodCategory] = {};
        featureHeaders.forEach((feature, fi) => {
          if (!feature) return;
          const featureId = featureToId(feature);
          const applicable = String(values[fi] || "").toLowerCase().startsWith("y");
          result.productRules[prodCategory][featureId] = { applicable };
        });
      }
    }
  }

  // ── Sheet 6: Feature Rules ───────────────────────────────────────────────
  const ws6 = wb.Sheets[wb.SheetNames[5]];
  if (ws6) {
    const rows = XLSX.utils.sheet_to_json(ws6, { header: 1, defval: "" });
    for (let i = 1; i < rows.length; i++) {
      const [prodCategory, feature, condField, operator, value, charge, message] = rows[i];
      if (!prodCategory || prodCategory.startsWith("(")) continue;
      const featureId = featureToId(feature);
      if (!result.productRules[prodCategory]) result.productRules[prodCategory] = {};
      const featureRule = result.productRules[prodCategory][featureId] || {};
      if (!featureRule.conditions) featureRule.conditions = [];
      featureRule.conditions.push({
        field: condField || null,
        operator: operator || null,
        value: value || null,
        charge: charge !== "" ? Number(charge) : null,
        message: message || "",
      });
      if (message) featureRule.message = message;
      result.productRules[prodCategory][featureId] = featureRule;
    }
  }

  return result;
}

function featureToId(label) {
  const map = {
    "EMI Repayment":   "emi",
    "Flexi Facility":  "flexi",
    "Foreclosure":     "foreclosure",
    "Part Prepayment": "prepayment",
    "Top Up":          "topup",
    "Balance Transfer":"bt",
  };
  return map[label] || label.toLowerCase().replace(/\s+/g, "_");
}

function toLabel(key) {
  return key.replace(/([A-Z])/g, " $1").replace(/[_-]+/g, " ").trim()
    .split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
