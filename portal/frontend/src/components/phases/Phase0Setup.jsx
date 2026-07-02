import React, { useState } from "react";
import { Building2, Globe, KeyRound, MessageSquare, Loader2, AlertCircle } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function Phase0Setup({ onClientSetup }) {
  const [form, setForm] = useState({
    name: "",
    clientId: "",
    domain: "",
    primaryColour: "#6366f1",
    channels: ["claude"],
    authMethod: "otp",
    oauthDomain: "",
    tokenTtl: "3600",
    smsProvider: "",
    templateId: "",
    sandboxOtp: "123456",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const set = (key, val) =>
    setForm((f) => ({
      ...f,
      ...(key === "name" ? { name: val, clientId: slugify(val) } : { [key]: val }),
    }));

  const toggleChannel = (ch) =>
    setForm((f) => ({
      ...f,
      channels: f.channels.includes(ch)
        ? f.channels.filter((c) => c !== ch)
        : [...f.channels, ch],
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.clientId || !form.domain) {
      setError("Name, Client ID and Domain are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/client/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Setup failed");
      onClientSetup(data.config);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Client Setup</h1>
        <p className="text-sm text-gray-500 mt-1">Create an isolated workspace for your NBFC client.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Identity */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Building2 size={15} className="text-accent" />
            <h2 className="text-sm font-medium text-white">Identity</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">NBFC Name *</label>
              <input
                className="input-field"
                placeholder="Bajaj Finance"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Client ID (auto)</label>
              <input
                className="input-field font-mono text-sm"
                placeholder="bajaj-finance"
                value={form.clientId}
                onChange={(e) => set("clientId", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Domain *</label>
              <div className="relative">
                <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  className="input-field pl-8"
                  placeholder="bajajfinance.in"
                  value={form.domain}
                  onChange={(e) => set("domain", e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Primary Colour</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={form.primaryColour}
                  onChange={(e) => set("primaryColour", e.target.value)}
                  className="w-10 h-9 rounded-lg border border-[#2d3148] bg-[#0f1117] cursor-pointer p-0.5"
                />
                <input
                  className="input-field font-mono text-sm flex-1"
                  value={form.primaryColour}
                  onChange={(e) => set("primaryColour", e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Channels */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare size={15} className="text-accent" />
            <h2 className="text-sm font-medium text-white">Channels</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: "claude",   label: "Claude.ai",      sub: "SSE transport",           live: true  },
              { id: "chatgpt",  label: "ChatGPT",         sub: "Streamable HTTP",         live: true  },
              { id: "whatsapp", label: "WhatsApp",        sub: "Coming soon",             live: false },
              { id: "copilot",  label: "Copilot",         sub: "Coming soon",             live: false },
            ].map((ch) => (
              <button
                key={ch.id}
                type="button"
                disabled={!ch.live}
                onClick={() => ch.live && toggleChannel(ch.id)}
                className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                  !ch.live
                    ? "border-[#2d3148] opacity-40 cursor-not-allowed"
                    : form.channels.includes(ch.id)
                    ? "border-accent bg-accent/5"
                    : "border-[#2d3148] hover:border-[#3d4158]"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded border mt-0.5 flex-shrink-0 flex items-center justify-center ${
                    form.channels.includes(ch.id) ? "bg-accent border-accent" : "border-[#3d4158]"
                  }`}
                >
                  {form.channels.includes(ch.id) && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{ch.label}</p>
                  <p className="text-[11px] text-gray-500">{ch.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Auth */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <KeyRound size={15} className="text-accent" />
            <h2 className="text-sm font-medium text-white">Authentication</h2>
          </div>

          <div className="flex gap-3">
            {["otp", "oauth"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => set("authMethod", m)}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  form.authMethod === m
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-[#2d3148] text-gray-400 hover:border-[#3d4158]"
                }`}
              >
                {m === "otp" ? "OTP" : "OAuth 2.1"}
              </button>
            ))}
          </div>

          {form.authMethod === "oauth" ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Auth Server Domain</label>
                <input
                  className="input-field"
                  placeholder="auth.bajajfinance.in"
                  value={form.oauthDomain}
                  onChange={(e) => set("oauthDomain", e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Token TTL (seconds)</label>
                <input
                  className="input-field"
                  type="number"
                  value={form.tokenTtl}
                  onChange={(e) => set("tokenTtl", e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">SMS Provider</label>
                <input
                  className="input-field"
                  placeholder="Twilio / MSG91"
                  value={form.smsProvider}
                  onChange={(e) => set("smsProvider", e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Template ID</label>
                <input
                  className="input-field"
                  placeholder="FINBAJ_OTP"
                  value={form.templateId}
                  onChange={(e) => set("templateId", e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="border-t border-[#2d3148] pt-4">
            <label className="text-xs text-gray-400 mb-1.5 block">
              Sandbox OTP{" "}
              <span className="text-gray-600">(for reviewer testing)</span>
            </label>
            <input
              className="input-field w-40 font-mono"
              value={form.sandboxOtp}
              onChange={(e) => set("sandboxOtp", e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
            <AlertCircle size={15} />
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 flex items-center justify-center gap-2">
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Creating workspace…
            </>
          ) : (
            "Create Workspace & Continue →"
          )}
        </button>
      </form>
    </div>
  );
}
