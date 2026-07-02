import React, { useState } from "react";
import {
  CheckCircle, Circle, Loader2, Server, RefreshCw, Plus,
  AlertCircle, Download, ExternalLink
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function Phase7Deploy({ clientConfig, registry, generatedFiles, onAddAnotherApi }) {
  const domain      = clientConfig?.domain || "mcp.example.in";
  const clientId    = clientConfig?.clientId || "client";
  const sandboxOtp  = clientConfig?.auth?.sandboxOtp || "123456";
  const apiName     = registry?.api?.name || "api";
  const toolCount   = Object.keys(generatedFiles || {}).length;

  const [checked, setChecked]       = useState({});
  const [health,  setHealth]        = useState(null);
  const [checking, setChecking]     = useState(false);
  const [healthUrl, setHealthUrl]   = useState(`https://mcp.${domain}/health`);

  const toggleCheck = (id) => setChecked((c) => ({ ...c, [id]: !c[id] }));

  const checkHealth = async () => {
    setChecking(true); setHealth(null);
    try {
      const res = await fetch(`${API_URL}/api/deploy/health/${clientId}?url=${encodeURIComponent(healthUrl)}`);
      const data = await res.json();
      setHealth(data);
    } catch {
      setHealth({ status: "error", message: "Could not reach server" });
    } finally {
      setChecking(false);
    }
  };

  const downloadChecklist = () => {
    const text = buildChecklistText({ clientId, domain, sandboxOtp, toolCount, apiName });
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${clientId}-deploy-checklist.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const STEPS = [
    {
      id: "step1",
      title: "Add Generated Files",
      items: [
        { id: "s1a", text: `Drop src/tools/${domain}/ into server's src/tools/` },
        { id: "s1b", text: `Drop config/rules/${domain}-products.js into config/rules/` },
        { id: "s1c", text: "Merge config/probing.js with existing (if any)" },
        { id: "s1d", text: "Replace config/client.js" },
      ],
    },
    {
      id: "step2",
      title: "Set Environment Variables",
      items: [
        { id: "s2a", text: "PORT=3000" },
        { id: "s2b", text: `CLIENT_ID=${clientId}` },
        { id: "s2c", text: "MCP_SECRET=<your secret>" },
      ],
    },
    {
      id: "step3",
      title: "Deploy",
      items: [
        { id: "s3a", text: "npm install && npm run dev  (local test)" },
        { id: "s3b", text: "Push to Render / Railway / your cloud" },
      ],
    },
    {
      id: "step4",
      title: "Verify",
      items: [
        { id: "s4a", text: `GET https://mcp.${domain}/health → { status: "ok", tools: ${toolCount}, client: "${clientId}" }` },
        { id: "s4b", text: "Connect Claude.ai → Settings → Connectors → Add → URL: https://mcp." + domain + "/sse" },
        { id: "s4c", text: 'Test: "What loan do I have?"' },
      ],
    },
    {
      id: "step5",
      title: "Sandbox Credentials",
      items: [
        { id: "s5a", text: "Test mobile: 9999999999" },
        { id: "s5b", text: `Sandbox OTP: ${sandboxOtp}` },
      ],
    },
  ];

  const totalItems = STEPS.flatMap((s) => s.items).length;
  const checkedCount = Object.values(checked).filter(Boolean).length;
  const progress = Math.round((checkedCount / totalItems) * 100);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Deploy</h1>
        <p className="text-sm text-gray-500 mt-1">Follow the checklist to get your MCP server live.</p>
      </div>

      {/* Progress bar */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">Deployment progress</span>
          <span className="text-xs text-gray-300 font-medium">{checkedCount} / {totalItems}</span>
        </div>
        <div className="h-1.5 bg-[#2d3148] rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-4">
        {STEPS.map((step, si) => (
          <div key={step.id} className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-medium text-accent bg-accent/10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
                {si + 1}
              </span>
              <h3 className="text-sm font-medium text-white">{step.title}</h3>
            </div>
            <div className="space-y-2 pl-8">
              {step.items.map((item) => (
                <label key={item.id} className="flex items-start gap-3 cursor-pointer group">
                  <button
                    type="button"
                    onClick={() => toggleCheck(item.id)}
                    className="mt-0.5 flex-shrink-0"
                  >
                    {checked[item.id] ? (
                      <CheckCircle size={15} className="text-green-400" />
                    ) : (
                      <Circle size={15} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
                    )}
                  </button>
                  <span className={`text-xs leading-relaxed font-mono ${checked[item.id] ? "text-gray-600 line-through" : "text-gray-300"}`}>
                    {item.text}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Health check */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Server size={14} className="text-accent" />
          <h3 className="text-sm font-medium text-white">Server Health Check</h3>
        </div>
        <div className="flex gap-3">
          <input
            className="input-field flex-1 text-sm font-mono"
            value={healthUrl}
            onChange={(e) => setHealthUrl(e.target.value)}
          />
          <button
            onClick={checkHealth}
            disabled={checking}
            className="btn-secondary flex items-center gap-2 text-sm flex-shrink-0"
          >
            {checking ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Check
          </button>
        </div>

        {health && (
          <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2.5 ${
            health.status === "ok"
              ? "bg-green-400/10 text-green-400 border border-green-400/20"
              : "bg-red-400/10 text-red-400 border border-red-400/20"
          }`}>
            {health.status === "ok" ? (
              <CheckCircle size={14} />
            ) : (
              <AlertCircle size={14} />
            )}
            {health.status === "ok"
              ? `✓ Live · ${health.tools || "?"} tools · client: ${health.client || clientId}`
              : `✗ ${health.message || "Not reachable"}`
            }
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={downloadChecklist} className="btn-secondary flex items-center gap-2 text-sm">
          <Download size={13} />
          Download Checklist
        </button>
        <button
          onClick={onAddAnotherApi}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus size={13} />
          Add Another API
        </button>
      </div>
    </div>
  );
}

function buildChecklistText({ clientId, domain, sandboxOtp, toolCount, apiName }) {
  return `FinSaathi Deploy Checklist
Client: ${clientId}
Generated: ${new Date().toISOString()}

STEP 1 — Add Generated Files
□ Drop src/tools/${domain}/ into server's src/tools/
□ Drop config/rules/${domain}-products.js into config/rules/
□ Merge config/probing.js with existing (if any)
□ Replace config/client.js

STEP 2 — Environment Variables
□ PORT=3000
□ CLIENT_ID=${clientId}
□ MCP_SECRET=<your secret>

STEP 3 — Deploy
□ npm install && npm run dev (local test)
□ Push to Render / Railway / your cloud

STEP 4 — Verify
□ GET https://mcp.${domain}/health
    Expected: { status: "ok", tools: ${toolCount}, client: "${clientId}" }
□ Connect Claude.ai → Settings → Connectors → Add → URL: https://mcp.${domain}/sse
□ Test: "What loan do I have?"

STEP 5 — Sandbox Credentials
□ Test mobile: 9999999999
□ Sandbox OTP: ${sandboxOtp}
`;
}
