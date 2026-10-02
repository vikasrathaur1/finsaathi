import React, { useState } from "react";
import {
  CheckCircle, Loader2, Server, RefreshCw, Plus, AlertCircle, KeyRound,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function Phase6GoLive({ clientConfig, registry, toolGroups, onAddAnotherApi }) {
  const clientId   = clientConfig?.clientId || "client";
  const apiName    = registry?.api?.name || "api";
  const toolCount  = toolGroups?.length || 0;
  const sandboxOtp = clientConfig?.auth?.sandboxOtp || "123456";

  const [mcpUrl, setMcpUrl]       = useState("http://localhost:3001");
  const [adminSecret, setSecret] = useState("");
  const [reloading, setReloading] = useState(false);
  const [reloadResult, setReloadResult] = useState(null);
  const [checking, setChecking]   = useState(false);
  const [health, setHealth]       = useState(null);

  const reloadTools = async () => {
    setReloading(true); setReloadResult(null);
    try {
      const res = await fetch(`${API_URL}/api/deploy/reload/${clientId}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ url: `${mcpUrl}/admin/reload`, adminSecret }),
      });
      const data = await res.json();
      setReloadResult(data);
    } catch (err) {
      setReloadResult({ status: "error", message: err.message });
    } finally {
      setReloading(false);
    }
  };

  const checkHealth = async () => {
    setChecking(true); setHealth(null);
    try {
      const res = await fetch(`${API_URL}/api/deploy/health/${clientId}?url=${encodeURIComponent(`${mcpUrl}/health`)}`);
      const data = await res.json();
      setHealth(data);
    } catch {
      setHealth({ status: "error", message: "Could not reach server" });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Go Live</h1>
        <p className="text-sm text-gray-500 mt-1">
          The MCP server reads tools live from this Portal — nothing to generate or copy.
          Just tell it to reload.
        </p>
      </div>

      {/* Registry saved confirmation */}
      <div className="card p-5 flex items-center gap-3">
        <CheckCircle size={18} className="text-green-400 flex-shrink-0" />
        <div className="text-sm">
          <p className="text-white font-medium">{apiName} saved to the registry</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {toolCount} tool{toolCount === 1 ? "" : "s"} · client <code className="font-mono">{clientId}</code> · available at{" "}
            <code className="font-mono">GET /api/registry/{clientId}</code>
          </p>
        </div>
      </div>

      {/* MCP server target */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Server size={14} className="text-accent" />
          <h3 className="text-sm font-medium text-white">MCP Server</h3>
        </div>
        <label className="text-xs text-gray-500">Server URL</label>
        <input
          className="input-field w-full text-sm font-mono"
          value={mcpUrl}
          onChange={(e) => setMcpUrl(e.target.value)}
          placeholder="http://localhost:3001"
        />
        <label className="text-xs text-gray-500 flex items-center gap-1.5 mt-2">
          <KeyRound size={11} /> Admin secret (optional — only if ADMIN_SECRET is set on the server)
        </label>
        <input
          className="input-field w-full text-sm font-mono"
          value={adminSecret}
          onChange={(e) => setSecret(e.target.value)}
          type="password"
          placeholder="leave blank in dev"
        />

        <div className="flex gap-3 pt-2">
          <button onClick={reloadTools} disabled={reloading} className="btn-primary flex items-center gap-2 text-sm">
            {reloading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Reload Tools
          </button>
          <button onClick={checkHealth} disabled={checking} className="btn-secondary flex items-center gap-2 text-sm">
            {checking ? <Loader2 size={13} className="animate-spin" /> : <Server size={13} />}
            Check Health
          </button>
        </div>

        {reloadResult && (
          <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2.5 ${
            reloadResult.status === "ok"
              ? "bg-green-400/10 text-green-400 border border-green-400/20"
              : "bg-red-400/10 text-red-400 border border-red-400/20"
          }`}>
            {reloadResult.status === "ok" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            {reloadResult.status === "ok"
              ? `✓ Reloaded · ${reloadResult.tools ?? "?"} tools now live`
              : `✗ ${reloadResult.message || "Reload failed"}`}
          </div>
        )}

        {health && (
          <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2.5 ${
            health.status === "ok"
              ? "bg-green-400/10 text-green-400 border border-green-400/20"
              : "bg-red-400/10 text-red-400 border border-red-400/20"
          }`}>
            {health.status === "ok" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            {health.status === "ok"
              ? `✓ Live · ${health.tools ?? "?"} tools · client: ${health.client || clientId}`
              : `✗ ${health.message || "Not reachable"}`}
          </div>
        )}
      </div>

      {/* Sandbox credentials */}
      <div className="card p-5">
        <h3 className="text-sm font-medium text-white mb-3">Sandbox Credentials</h3>
        <div className="space-y-1.5 text-xs font-mono">
          <p className="text-gray-400">Test mobile: <span className="text-gray-200">9999999999</span></p>
          <p className="text-gray-400">Sandbox OTP: <span className="text-gray-200">{sandboxOtp}</span></p>
        </div>
        <p className="text-xs text-gray-600 mt-3">
          Connect in Claude.ai → Settings → Connectors → Add → URL: <code className="font-mono">{mcpUrl}/sse</code>
        </p>
      </div>

      <button onClick={onAddAnotherApi} className="btn-primary flex items-center gap-2 text-sm">
        <Plus size={13} />
        Add Another API
      </button>
    </div>
  );
}
