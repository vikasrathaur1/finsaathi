import React, { useState, useEffect } from "react";
import {
  Sparkles, Loader2, AlertCircle, CheckCircle,
  RefreshCw, GripVertical, Plus, Trash2, ChevronDown, ChevronRight
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function Phase5Grouping({ clientConfig, registry, onGroupsApproved }) {
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [groups,     setGroups]     = useState(null);
  const [reasoning,  setReasoning]  = useState("");
  const [reNote,     setReNote]     = useState("");
  const [expanded,   setExpanded]   = useState({});
  const [editMode,   setEditMode]   = useState(false);
  const [dragOver,   setDragOver]   = useState(null); // tool name being dragged over

  useEffect(() => {
    if (registry && !groups) {
      analyse();
    }
  }, [registry]);

  const analyse = async (note = "") => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API_URL}/api/analyse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registry, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setGroups(data.toolGroups);
      setReasoning(data.reasoning);
      setExpanded(Object.fromEntries(data.toolGroups.map((g) => [g.name, true])));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggle = (name) => setExpanded((e) => ({ ...e, [name]: !e[name] }));

  const removeGroup = (name) => setGroups((g) => g.filter((t) => t.name !== name));

  const mergeGroups = (from, to) => {
    setGroups((g) =>
      g.map((t) => {
        if (t.name === to) return { ...t, fields: [...new Set([...t.fields, ...(g.find((x) => x.name === from)?.fields || [])])] };
        if (t.name === from) return null;
        return t;
      }).filter(Boolean)
    );
  };

  const handleApprove = async () => {
    setLoading(true); setError("");
    try {
      const apiName = registry?.api?.name;
      if (!apiName) throw new Error("Registry is missing api.name — please re-run API onboarding.");
      const res = await fetch(`${API_URL}/api/registry/${clientConfig.clientId}/${apiName}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...registry, toolGroups: groups }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      onGroupsApproved(groups);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Tool Grouping</h1>
          <p className="text-sm text-gray-500 mt-1">
            Claude proposes how to group fields into MCP tools. Review and approve before code is written.
          </p>
        </div>
        {groups && (
          <button
            onClick={() => setEditMode((m) => !m)}
            className={`btn-secondary text-xs px-3 py-1.5 ${editMode ? "border-accent text-accent" : ""}`}
          >
            {editMode ? "Done Editing" : "Modify Grouping"}
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="card p-10 flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-accent/20 flex items-center justify-center">
              <Sparkles size={20} className="text-accent animate-pulse" />
            </div>
            <Loader2 size={14} className="animate-spin text-accent absolute -top-1 -right-1" />
          </div>
          <p className="text-sm text-gray-400">Claude is analysing your field registry…</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {groups && !loading && (
        <div className="space-y-4">
          {/* Reasoning */}
          {reasoning && (
            <div className="card p-4 border-l-2 border-l-accent">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={13} className="text-accent" />
                <span className="text-xs font-medium text-accent">Claude's Reasoning</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">{reasoning}</p>
            </div>
          )}

          {/* Tool cards */}
          <div className="space-y-3">
            {groups.map((tool) => (
              <div
                key={tool.name}
                className={`card border transition-colors ${
                  dragOver === tool.name ? "border-accent bg-accent/5" : "border-[#2d3148]"
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(tool.name); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = e.dataTransfer.getData("toolName");
                  if (from && from !== tool.name) mergeGroups(from, tool.name);
                  setDragOver(null);
                }}
              >
                {/* Card header */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                  onClick={() => toggle(tool.name)}
                >
                  {editMode && (
                    <div
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("toolName", tool.name)}
                      className="cursor-grab text-gray-600 hover:text-gray-400"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <GripVertical size={15} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono text-accent">{tool.name}</code>
                      <span className="text-[10px] text-gray-600 bg-[#0f1117] px-2 py-0.5 rounded-full border border-[#2d3148]">
                        {tool.fields?.length || 0} fields
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">"{tool.answers}"</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {editMode && (
                      <button
                        onClick={(e) => { e.stopPropagation(); removeGroup(tool.name); }}
                        className="text-gray-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                    {expanded[tool.name] ? (
                      <ChevronDown size={14} className="text-gray-500" />
                    ) : (
                      <ChevronRight size={14} className="text-gray-500" />
                    )}
                  </div>
                </div>

                {expanded[tool.name] && (
                  <div className="px-4 pb-4 space-y-3 border-t border-[#1e2235] pt-3">
                    {/* Fields */}
                    <div>
                      <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Fields</p>
                      <div className="flex flex-wrap gap-1.5">
                        {tool.fields?.map((f) => (
                          <span key={f} className="font-mono text-xs bg-[#0f1117] border border-[#2d3148] px-2 py-0.5 rounded text-gray-300">
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Applicable products */}
                    <div>
                      <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Applicable Products</p>
                      <span className="text-xs text-gray-400">
                        {tool.applicableProducts === "all"
                          ? "All products"
                          : Array.isArray(tool.applicableProducts)
                          ? tool.applicableProducts.join(", ")
                          : tool.applicableProducts}
                      </span>
                    </div>

                    {/* Not applicable */}
                    {tool.notApplicable && Object.keys(tool.notApplicable).length > 0 && (
                      <div>
                        <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Not Applicable</p>
                        <div className="space-y-1">
                          {Object.entries(tool.notApplicable).map(([prod, reason]) => (
                            <div key={prod} className="flex gap-2 text-xs">
                              <span className="text-red-400/70 w-28 flex-shrink-0">{prod}</span>
                              <span className="text-gray-600">{reason}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Re-analyse */}
          <div className="card p-4 space-y-3">
            <p className="text-xs text-gray-500">Not satisfied? Add a note and re-analyse.</p>
            <div className="flex gap-3">
              <input
                className="input-field flex-1 text-sm"
                placeholder="e.g. Merge get_loan_summary and get_loan_details into one tool"
                value={reNote}
                onChange={(e) => setReNote(e.target.value)}
              />
              <button
                onClick={() => { analyse(reNote); setReNote(""); }}
                disabled={loading}
                className="btn-secondary flex items-center gap-2 text-sm flex-shrink-0"
              >
                <RefreshCw size={13} />
                Re-analyse
              </button>
            </div>
          </div>

          <button
            onClick={handleApprove}
            disabled={loading}
            className="btn-primary w-full py-2.5 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
            Approve & Generate Files →
          </button>
        </div>
      )}
    </div>
  );
}
