import React, { useState } from "react";
import {
  Wifi, Clipboard, Plus, Trash2, Loader2, AlertCircle,
  CheckCircle, ChevronDown, ChevronUp, Download
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

/**
 * Accepts both valid JSON and JavaScript object literal notation.
 * Handles: single quotes, unquoted keys, trailing commas, null values.
 * Covers the common case of pasting a Node.js console.log() output.
 */
function parseFlexible(raw) {
  const str = raw.trim();

  // Try valid JSON first
  try { return JSON.parse(str); } catch (_) { /* fall through */ }

  // Convert JS object notation → JSON
  const sanitized = str
    // Remove JS comments
    .replace(/\/\/[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    // Quote unquoted object keys: word: → "word":
    .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')
    // Replace single-quoted strings with double-quoted (handles escaped \')
    .replace(/'((?:[^'\\]|\\.)*)'/g, (_, inner) => '"' + inner.replace(/\\'/g, "'").replace(/"/g, '\\"') + '"')
    // Remove trailing commas before } or ]
    .replace(/,(\s*[}\]])/g, "$1")
    // Replace undefined → null
    .replace(/:\s*undefined\b/g, ": null")
    // Handle unquoted string values that aren't keywords
    .trim();

  try {
    return JSON.parse(sanitized);
  } catch (err) {
    throw new Error("Could not parse as JSON or JavaScript object. Please check for syntax errors.");
  }
}

export default function Phase1Onboarding({ clientConfig, onApiOnboarded }) {
  const [tab, setTab]           = useState("live"); // "live" | "paste"
  const [apiName, setApiName]   = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [method, setMethod]     = useState("GET");
  const [headers, setHeaders]   = useState([{ key: "", value: "" }]);
  const [body, setBody]         = useState("");
  const [rawJson, setRawJson]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [testResult, setTestResult] = useState(null);
  const [classified, setClassified] = useState(null);

  const addHeader = () => setHeaders((h) => [...h, { key: "", value: "" }]);
  const removeHeader = (i) => setHeaders((h) => h.filter((_, idx) => idx !== i));
  const setHeader = (i, field, val) =>
    setHeaders((h) => h.map((row, idx) => (idx === i ? { ...row, [field]: val } : row)));

  const headersObj = () =>
    Object.fromEntries(headers.filter((h) => h.key).map((h) => [h.key, h.value]));

  const testConnection = async () => {
    if (!endpoint) { setError("Endpoint is required"); return; }
    setLoading(true); setError(""); setTestResult(null);
    try {
      const res = await fetch(`${API_URL}/api/proxy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: endpoint, method, headers: headersObj(),
          body: method === "POST" ? body : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Connection failed");
      setTestResult(data.response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const classify = async (jsonData) => {
    if (!apiName) { setError("API Name is required"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API_URL}/api/classify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: clientConfig.clientId,
          apiName,
          response: jsonData,
          endpoint: tab === "live" ? endpoint : undefined,
          method: tab === "live" ? method : undefined,
          headers: tab === "live" ? headersObj() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Classification failed");
      setClassified(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyse = () => {
    try {
      const parsed = parseFlexible(rawJson);
      classify(parsed);
    } catch (err) {
      setError(`Could not parse the response. ${err.message}`);
    }
  };

  const downloadExcel = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/generate-excel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: clientConfig.clientId, apiName }),
      });
      if (!res.ok) throw new Error("Excel generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${clientConfig.clientId}-${apiName}-registry.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      // Fetch registry to pass forward
      const regRes = await fetch(`${API_URL}/api/registry/${clientConfig.clientId}/${apiName}`);
      const regData = await regRes.json();
      onApiOnboarded(regData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">API Onboarding</h1>
        <p className="text-sm text-gray-500 mt-1">Connect your NBFC API and auto-classify all response fields.</p>
      </div>

      {/* API Name */}
      <div className="card p-5">
        <label className="text-xs text-gray-400 mb-1.5 block">API Name (slug) *</label>
        <input
          className="input-field w-64 font-mono"
          placeholder="loan"
          value={apiName}
          onChange={(e) => setApiName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
        />
        <p className="text-[11px] text-gray-600 mt-1.5">Used in folder naming: src/tools/{"{domain}"}/{apiName}/</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-card p-1 rounded-xl border border-[#2d3148] w-fit">
        {[
          { id: "live",  Icon: Wifi,      label: "Live API"        },
          { id: "paste", Icon: Clipboard, label: "Paste Response"  },
        ].map(({ id, Icon, label }) => (
          <button
            key={id}
            onClick={() => { setTab(id); setError(""); setTestResult(null); setClassified(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === id ? "bg-accent/10 text-accent" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === "live" ? (
        <div className="card p-5 space-y-4">
          {/* Endpoint + method */}
          <div className="flex gap-3">
            <select
              className="input-field w-28 font-mono text-sm"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              {["GET", "POST", "PUT"].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <input
              className="input-field flex-1 font-mono text-sm"
              placeholder="https://api.bajajfinance.in/loan/details"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
            />
          </div>

          {/* Headers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-400">Headers</label>
              <button type="button" onClick={addHeader} className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover">
                <Plus size={12} /> Add
              </button>
            </div>
            <div className="space-y-2">
              {headers.map((h, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className="input-field flex-1 text-sm font-mono"
                    placeholder="Key"
                    value={h.key}
                    onChange={(e) => setHeader(i, "key", e.target.value)}
                  />
                  <input
                    className="input-field flex-1 text-sm font-mono"
                    placeholder="Value"
                    value={h.value}
                    onChange={(e) => setHeader(i, "value", e.target.value)}
                  />
                  <button type="button" onClick={() => removeHeader(i)} className="text-gray-600 hover:text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Body (POST only) */}
          {method === "POST" && (
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Request Body (JSON)</label>
              <textarea
                className="input-field font-mono text-sm h-32 resize-none"
                placeholder='{"mobile": "9999999999"}'
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
          )}

          <button
            type="button"
            onClick={testConnection}
            disabled={loading}
            className="btn-secondary flex items-center gap-2"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Wifi size={14} />}
            Test Connection
          </button>

          {/* Test result */}
          {testResult && (
            <div className="bg-[#0f1117] rounded-lg border border-[#2d3148] overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2d3148]">
                <CheckCircle size={13} className="text-green-400" />
                <span className="text-xs text-green-400 font-medium">Connection successful</span>
              </div>
              <pre className="p-3 text-[11px] text-gray-400 font-mono overflow-auto max-h-48">
                {JSON.stringify(testResult, null, 2)}
              </pre>
              <div className="px-3 py-2 border-t border-[#2d3148]">
                <button
                  onClick={() => classify(testResult)}
                  disabled={loading}
                  className="btn-primary text-sm flex items-center gap-2"
                >
                  {loading ? <Loader2 size={13} className="animate-spin" /> : null}
                  Auto-Classify Fields →
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card p-5 space-y-4">
          <label className="text-xs text-gray-400 block">Paste raw API JSON response</label>
          <textarea
            className="input-field font-mono text-sm h-56 resize-none"
            placeholder='{"agreementNo": "BFL001", "prodDesc": "PERSONAL LOAN", ...}'
            value={rawJson}
            onChange={(e) => setRawJson(e.target.value)}
          />
          <button
            type="button"
            onClick={handleAnalyse}
            disabled={loading}
            className="btn-primary flex items-center gap-2"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            Analyse →
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {/* Classification result summary */}
      {classified && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-white">Classification Complete</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {classified.summary.total} fields ·{" "}
                <span className="text-amber-400">{classified.summary.flagged} need review</span> ·{" "}
                <span className="text-gray-500">{classified.summary.skipped} auto-skipped</span>
              </p>
            </div>
            <CheckCircle size={20} className="text-green-400" />
          </div>

          {/* Field table */}
          <div className="overflow-auto max-h-64 rounded-lg border border-[#2d3148]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#0f1117]">
                <tr className="text-left text-gray-500 border-b border-[#2d3148]">
                  <th className="px-3 py-2 font-medium">Field</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Label</th>
                  <th className="px-3 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(classified.fields).map(([key, f]) => (
                  <tr key={key} className="border-b border-[#1e2235]">
                    <td className="px-3 py-2 font-mono text-gray-300">{key}</td>
                    <td className="px-3 py-2">
                      <span className={`phase-tag ${typeColor(f.type)}`}>{f.type}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-300">{f.label}</td>
                    <td className="px-3 py-2">
                      {f.include ? (
                        <span className="text-amber-400">⚠ Review</span>
                      ) : (
                        <span className="text-gray-600">Skip</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={downloadExcel}
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Download Excel Template
            </button>
            <p className="text-xs text-gray-500">Business team fills the yellow cells, then upload in Phase 2.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function typeColor(type) {
  const map = {
    reference: "bg-gray-700/40 text-gray-400",
    date:      "bg-blue-500/10 text-blue-400",
    percentage:"bg-purple-500/10 text-purple-400",
    enum:      "bg-amber-500/10 text-amber-400",
    currency:  "bg-green-500/10 text-green-400",
    number:    "bg-cyan-500/10 text-cyan-400",
    skip:      "bg-gray-700/20 text-gray-600",
  };
  return map[type] || "bg-gray-700/30 text-gray-400";
}
