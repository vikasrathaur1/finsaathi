export function success(data) {
  const lines = Object.entries(data)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");
  return { content: [{ type: "text", text: lines }] };
}

export function failure(message) {
  return { content: [{ type: "text", text: `❌ ${message}` }], isError: true };
}

export function notApplicable(message) {
  return { content: [{ type: "text", text: `ℹ️ ${message}` }] };
}

export function formatCurrency(value, symbol = "₹") {
  if (value === null || value === undefined) return "N/A";
  const num = parseFloat(value);
  if (isNaN(num)) return String(value);
  return `${symbol}${num.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatDate(value) {
  if (!value) return "N/A";
  try {
    // Handle DD/MM/YYYY (API format) and ISO strings
    let date;
    if (typeof value === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      const [d, m, y] = value.split("/");
      date = new Date(`${y}-${m}-${d}`);
    } else {
      date = new Date(value);
    }
    if (isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return String(value);
  }
}

export function formatPct(value) {
  if (value === null || value === undefined) return "N/A";
  return `${parseFloat(value).toFixed(2)}% p.a.`;
}
