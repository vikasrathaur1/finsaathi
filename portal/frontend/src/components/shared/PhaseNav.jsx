import React from "react";
import { CheckCircle, Circle, Lock } from "lucide-react";

export default function PhaseNav({ phases, currentPhase, onNavigate, clientConfig }) {
  const phaseOrder = phases.map((p) => p.id);
  const currentIdx = phaseOrder.indexOf(currentPhase);

  const getStatus = (phaseId) => {
    const idx = phaseOrder.indexOf(phaseId);
    if (idx < currentIdx) return "done";
    if (idx === currentIdx) return "active";
    return "locked";
  };

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col bg-card border-r border-[#2d3148]">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#2d3148]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">FS</span>
          </div>
          <span className="font-semibold text-white text-sm">FinSaathi</span>
        </div>
        <p className="text-[11px] text-gray-500 mt-1 ml-9">Portal</p>
      </div>

      {/* Phase steps */}
      <nav className="flex-1 py-4 px-3 space-y-0.5">
        {phases.map((phase, i) => {
          const status = getStatus(phase.id);
          const isClickable = status === "done";

          return (
            <button
              key={phase.id}
              onClick={() => isClickable && onNavigate(phase.id)}
              disabled={!isClickable && status !== "active"}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group ${
                status === "active"
                  ? "bg-accent/10 text-white"
                  : status === "done"
                  ? "hover:bg-[#22263a] text-gray-400 cursor-pointer"
                  : "text-gray-600 cursor-default"
              }`}
            >
              <span className="flex-shrink-0">
                {status === "done" ? (
                  <CheckCircle size={16} className="text-accent" />
                ) : status === "active" ? (
                  <div className="w-4 h-4 rounded-full bg-accent flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                ) : (
                  <Circle size={16} className="text-gray-700" />
                )}
              </span>
              <div className="min-w-0">
                <p className={`text-xs font-medium truncate ${status === "active" ? "text-white" : ""}`}>
                  {phase.label}
                </p>
                {phase.id === 4 && (
                  <p className="text-[10px] text-gray-600 mt-0.5">Auto</p>
                )}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Client info at bottom */}
      {clientConfig && (
        <div className="px-4 py-3 border-t border-[#2d3148]">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Client</p>
          <p className="text-xs font-medium text-gray-300 truncate">{clientConfig.name}</p>
          <p className="text-[10px] text-gray-500 truncate">{clientConfig.domain}</p>
        </div>
      )}
    </aside>
  );
}
