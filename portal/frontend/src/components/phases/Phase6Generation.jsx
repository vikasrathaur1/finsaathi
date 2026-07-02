import React, { useState, useEffect } from "react";
import { Sparkles, Loader2, AlertCircle, Download, Eye, CheckCircle } from "lucide-react";
import CodePreview from "../shared/CodePreview.jsx";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function Phase6Generation({ clientConfig, registry, toolGroups, onFilesGenerated }) {
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [files,    setFiles]    = useState(null);
  const [preview,  setPreview]  = useState(false);

  useEffect(() => {
    if (registry && toolGroups && !files) {
      generate();
    }
  }, []);

  const generate = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API_URL}/api/generate-files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registry, toolGroups, clientConfig }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setFiles(data.files);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadZip = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/download-zip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files, clientId: clientConfig.clientId }),
      });
      if (!res.ok) throw new Error("ZIP generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${clientConfig.clientId}-mcp-tools.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">File Generation</h1>
        <p className="text-sm text-gray-500 mt-1">
          Claude generates all MCP tool files ready to drop into your server.
        </p>
      </div>

      {loading && (
        <div className="card p-10 flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-accent/20 flex items-center justify-center">
              <Sparkles size={20} className="text-accent animate-pulse" />
            </div>
            <Loader2 size={14} className="animate-spin text-accent absolute -top-1 -right-1" />
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-400">Generating MCP tool files…</p>
            <p className="text-xs text-gray-600 mt-1">This may take 15–30 seconds</p>
          </div>
        </div>
      )}

      {error && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
            <AlertCircle size={15} />
            {error}
          </div>
          <button onClick={generate} className="btn-secondary flex items-center gap-2 text-sm">
            <Sparkles size={13} />
            Retry Generation
          </button>
        </div>
      )}

      {files && !loading && (
        <div className="space-y-5">
          {/* File list */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-medium text-white">Generated Files</h3>
                <p className="text-xs text-gray-500 mt-0.5">{Object.keys(files).length} files · {toolGroups?.length || 0} tools</p>
              </div>
              <CheckCircle size={18} className="text-green-400" />
            </div>

            <div className="space-y-2">
              {Object.keys(files).map((path) => (
                <div key={path} className="flex items-center gap-3 py-2 border-b border-[#1e2235] last:border-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                  <code className="text-xs font-mono text-gray-300 flex-1">{path}</code>
                  <span className="text-[10px] text-gray-600">{(files[path].length / 1024).toFixed(1)} KB</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setPreview(!preview)}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <Eye size={13} />
                {preview ? "Hide" : "Preview"} Files
              </button>
              <button
                onClick={downloadZip}
                disabled={loading}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                Download ZIP
              </button>
            </div>
          </div>

          {/* Code preview */}
          {preview && (
            <div className="h-[500px]">
              <CodePreview files={files} />
            </div>
          )}

          <button
            onClick={() => onFilesGenerated(files)}
            className="btn-primary w-full py-2.5 flex items-center justify-center gap-2"
          >
            <CheckCircle size={15} />
            Proceed to Deploy →
          </button>
        </div>
      )}
    </div>
  );
}
