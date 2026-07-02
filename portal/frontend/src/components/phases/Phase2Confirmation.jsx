import React, { useState, useCallback } from "react";
import { Upload, CheckCircle, AlertCircle, Loader2, Edit2, X, Check } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function Phase2Confirmation({ clientConfig, registry, onConfirmed }) {
  const [dragging, setDragging]   = useState(false);
  const [parsed,   setParsed]     = useState(null);
  const [loading,  setLoading]    = useState(false);
  const [error,    setError]      = useState("");
  const [editRow,  setEditRow]    = useState(null); // field key being edited
  const [editVals, setEditVals]   = useState({});

  const uploadExcel = async (file) => {
    if (!file) return;
    setLoading(true); setError("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("clientId", clientConfig.clientId);
    fd.append("apiName", registry?.api?.name || "");
    try {
      const res = await fetch(`${API_URL}/api/parse-excel`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Parse failed");
      setParsed(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadExcel(file);
  }, [clientConfig, registry]);

  const startEdit = (key, field) => {
    setEditRow(key);
    setEditVals({ label: field.label, type: field.type, include: field.include });
  };

  const saveEdit = (key) => {
    setParsed((p) => ({
      ...p,
      fields: { ...p.fields, [key]: { ...p.fields[key], ...editVals } },
    }));
    setEditRow(null);
  };

  const handleApprove = async () => {
    setLoading(true); setError("");
    try {
      // Merge parsed Excel data into the existing registry — preserves api/client/toolGroups
      const merged = {
        ...registry,
        fields:       parsed.fields       || registry?.fields       || {},
        enumValues:   parsed.enumValues   || registry?.enumValues   || {},
        thresholds:   parsed.thresholds   || registry?.thresholds   || {},
        productRules: parsed.productRules || registry?.productRules || {},
        probingRules: parsed.probingRules || registry?.probingRules || [],
      };
      const res = await fetch(`${API_URL}/api/registry/${clientConfig.clientId}/${registry?.api?.name}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(merged),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      onConfirmed(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Confirmation</h1>
        <p className="text-sm text-gray-500 mt-1">Upload the filled Excel template. Review what the portal understood.</p>
      </div>

      {/* Drop zone */}
      {!parsed && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
            dragging ? "border-accent bg-accent/5" : "border-[#2d3148] hover:border-[#3d4158]"
          }`}
          onClick={() => document.getElementById("xl-upload").click()}
        >
          <input
            id="xl-upload"
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => uploadExcel(e.target.files[0])}
          />
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={32} className="text-accent animate-spin" />
              <p className="text-sm text-gray-400">Parsing Excel…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center">
                <Upload size={24} className="text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Drop filled Excel here</p>
                <p className="text-xs text-gray-500 mt-1">or click to browse · .xlsx only</p>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {/* Parsed results */}
      {parsed && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-white">Parsed Fields</h2>
            <div className="flex gap-2">
              <button
                onClick={() => { setParsed(null); setError(""); }}
                className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
              >
                <Upload size={12} /> Re-upload
              </button>
              <button
                onClick={handleApprove}
                disabled={loading}
                className="btn-primary text-sm flex items-center gap-2"
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                Approve & Continue →
              </button>
            </div>
          </div>

          {/* Field table */}
          <div className="card overflow-hidden">
            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-[#0f1117] border-b border-[#2d3148]">
                  <tr className="text-left text-gray-500">
                    <th className="px-4 py-2.5 font-medium">Field</th>
                    <th className="px-4 py-2.5 font-medium">Type</th>
                    <th className="px-4 py-2.5 font-medium">Friendly Label</th>
                    <th className="px-4 py-2.5 font-medium">Include</th>
                    <th className="px-4 py-2.5 font-medium">Role</th>
                    <th className="px-4 py-2.5 font-medium w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(parsed.fields || {}).map(([key, f]) => (
                    <tr key={key} className="border-b border-[#1e2235] hover:bg-[#1e2235]/50">
                      <td className="px-4 py-2.5 font-mono text-gray-300">{key}</td>
                      <td className="px-4 py-2.5">
                        {editRow === key ? (
                          <select
                            className="input-field text-xs py-1 px-2"
                            value={editVals.type}
                            onChange={(e) => setEditVals((v) => ({ ...v, type: e.target.value }))}
                          >
                            {["reference","date","percentage","enum","currency","number","skip"].map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`phase-tag ${typeColor(f.type)}`}>{f.type}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {editRow === key ? (
                          <input
                            className="input-field text-xs py-1"
                            value={editVals.label}
                            onChange={(e) => setEditVals((v) => ({ ...v, label: e.target.value }))}
                          />
                        ) : (
                          <span className="text-gray-200">{f.label}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {editRow === key ? (
                          <select
                            className="input-field text-xs py-1 px-2 w-20"
                            value={editVals.include ? "yes" : "no"}
                            onChange={(e) => setEditVals((v) => ({ ...v, include: e.target.value === "yes" }))}
                          >
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                          </select>
                        ) : (
                          <span className={f.include ? "text-green-400" : "text-gray-600"}>
                            {f.include ? "Yes" : "No"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-gray-500">{f.role || "—"}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        {editRow === key ? (
                          <div className="flex gap-1">
                            <button onClick={() => saveEdit(key)} className="text-green-400 hover:text-green-300">
                              <Check size={13} />
                            </button>
                            <button onClick={() => setEditRow(null)} className="text-gray-500 hover:text-gray-300">
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => startEdit(key, f)} className="text-gray-600 hover:text-gray-300">
                            <Edit2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Enum summary */}
          {parsed.enumValues && Object.keys(parsed.enumValues).length > 0 && (
            <div className="card p-4">
              <h3 className="text-xs font-medium text-gray-400 mb-3">Enum Values</h3>
              <div className="space-y-2">
                {Object.entries(parsed.enumValues).map(([field, values]) => (
                  <div key={field} className="flex gap-3 items-start">
                    <span className="font-mono text-xs text-gray-400 w-28 flex-shrink-0">{field}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {values.map((v, i) => (
                        <span key={i} className={`phase-tag ${severityColor(v.severity)}`}>
                          {v.value}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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

function severityColor(s) {
  const map = {
    normal:   "bg-gray-700/30 text-gray-400",
    warning:  "bg-amber-500/10 text-amber-400",
    critical: "bg-red-500/10 text-red-400",
    info:     "bg-blue-500/10 text-blue-400",
  };
  return map[s] || "bg-gray-700/30 text-gray-400";
}
