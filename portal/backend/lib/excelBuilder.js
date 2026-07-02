import * as XLSX from "xlsx";

const EX = "// EXAMPLE — delete this row //";

export function buildExcel(registry) {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Field Registry ──────────────────────────────────────────────
  // ONE ROW PER API RESPONSE KEY — portal pre-fills, team edits Include + Label
  const s1Rows = [
    ["Field Name", "Auto Type", "Friendly Label", "Include (Yes/No)", "Role", "Notes"],
    [EX, "enum",      "Loan Status",        "Yes", "status",  "Enum values filled in Sheet 2"],
    [EX, "currency",  "Outstanding Amount", "Yes", "display", "Format: ₹ amount"],
    [EX, "reference", "Agreement No",       "No",  "skip",    "Internal ID — skip in tools"],
  ];
  for (const [key, f] of Object.entries(registry.fields || {})) {
    s1Rows.push([key, f.type, f.label, f.include ? "Yes" : "No", f.role || "", ""]);
  }
  const ws1 = XLSX.utils.aoa_to_sheet(s1Rows);
  ws1["!cols"] = [26, 14, 28, 16, 12, 36].map((w) => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws1, "1. Field Registry");

  // ── Sheet 2: Enum Values ─────────────────────────────────────────────────
  // ONE ROW PER POSSIBLE VALUE — team fills Meaning + Severity for each value
  const s2Rows = [
    ["Field Name", "Value", "Meaning", "Severity (normal/warning/critical/info)"],
    [EX, "Active",   "Loan is currently running",  "normal"],
    [EX, "Overdue",  "Payment has been missed",    "warning"],
    [EX, "NPA",      "Non-performing asset",       "critical"],
    [EX, "Closed",   "Loan is fully repaid",       "info"],
  ];
  for (const [key, f] of Object.entries(registry.fields || {})) {
    if (f.type === "enum") {
      // 4 placeholder rows per enum field — team fills each distinct value
      for (let i = 1; i <= 4; i++) {
        s2Rows.push([key, `(value ${i})`, "", i === 1 ? "normal" : ""]);
      }
    }
  }
  const ws2 = XLSX.utils.aoa_to_sheet(s2Rows);
  ws2["!cols"] = [26, 30, 46, 20].map((w) => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws2, "2. Enum Values");

  // ── Sheet 3: Thresholds ──────────────────────────────────────────────────
  const s3Rows = [
    ["Field Name", "Condition (===0 / >0 / <0)", "Meaning", "Severity"],
    [EX, "===0", "Loan fully repaid — no outstanding",  "info"],
    [EX, ">0",   "Amount still to be repaid",           "normal"],
    [EX, ">0",   "Overdue payment is pending",          "warning"],
  ];
  for (const [key, f] of Object.entries(registry.fields || {})) {
    if (f.type === "currency" || f.type === "number") {
      s3Rows.push([key, "===0", "", "info"]);
      s3Rows.push([key, ">0",   "", "normal"]);
    }
  }
  const ws3 = XLSX.utils.aoa_to_sheet(s3Rows);
  ws3["!cols"] = [26, 28, 46, 14].map((w) => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws3, "3. Thresholds");

  // ── Sheet 4: Term Conflicts ──────────────────────────────────────────────
  const s4Rows = [
    ["Term", "API Name", "Field Name", "Current Label", "Resolved Label", "Meaning Here"],
    [EX, "loan", "nextEMIAmount", "Next EMI Amount", "Loan EMI",  "Monthly loan repayment amount"],
    [EX, "card", "emiAmount",     "EMI Amount",      "Card EMI",  "Card installment amount"],
  ];
  const labelMap = {};
  for (const [key, f] of Object.entries(registry.fields || {})) {
    const label = f.label.toLowerCase();
    if (!labelMap[label]) labelMap[label] = [];
    labelMap[label].push(key);
  }
  for (const [label, keys] of Object.entries(labelMap)) {
    if (keys.length > 1) {
      for (const key of keys) {
        const f = registry.fields[key];
        s4Rows.push([label, registry.api?.name || "", key, f.label, "", ""]);
      }
    }
  }
  if (s4Rows.length === 3) {
    s4Rows.push(["(no conflicts auto-detected — add any ambiguous terms manually)", "", "", "", "", ""]);
  }
  const ws4 = XLSX.utils.aoa_to_sheet(s4Rows);
  ws4["!cols"] = [18, 12, 24, 26, 26, 46].map((w) => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws4, "4. Term Conflicts");

  // ── Sheet 5: Feature Matrix ──────────────────────────────────────────────
  const FEATURES = ["EMI Repayment", "Flexi Facility", "Foreclosure", "Part Prepayment", "Top Up", "Balance Transfer"];
  const s5Rows = [
    ["prodCategory", ...FEATURES],
    [EX + " PERSONAL LOAN", "Yes", "Yes", "No",  "Yes", "Yes", "Yes"],
    [EX + " GOLD LOAN",     "No",  "No",  "Yes", "Yes", "No",  "No"],
  ];
  const enumCats = (registry.enumValues?.prodCategory || []).map((e) => e.value);
  const cats = enumCats.length
    ? enumCats
    : ["PERSONAL LOAN", "GOLD LOAN", "HOME LOAN", "(add more rows as needed)"];
  for (const cat of cats) {
    s5Rows.push([cat, ...FEATURES.map(() => "")]);
  }
  const ws5 = XLSX.utils.aoa_to_sheet(s5Rows);
  ws5["!cols"] = [30, ...FEATURES.map(() => 18)].map((w) => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws5, "5. Feature Matrix");

  // ── Sheet 6: Feature Rules ───────────────────────────────────────────────
  const s6Rows = [
    ["prodCategory", "Feature", "Condition Field", "Operator", "Value", "Charge%", "Message"],
    [EX, "prepayment",  "balanceTenure", ">",  "6",  "0", "No prepayment charge after 6 EMIs"],
    [EX, "prepayment",  "balanceTenure", "<=", "6",  "4", "4% charge if prepaid within 6 EMIs"],
    [EX, "foreclosure", "balanceTenure", ">",  "12", "0", "No foreclosure charge after 12 EMIs"],
    [EX, "emi",         "",              "",   "",   "",  "Bullet repayment — no EMI schedule (Gold Loan)"],
    [EX, "flexi",       "",              "",   "",   "",  "Flexi not available for this product"],
  ];
  const ws6 = XLSX.utils.aoa_to_sheet(s6Rows);
  ws6["!cols"] = [30, 16, 22, 10, 10, 10, 58].map((w) => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws6, "6. Feature Rules");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}
