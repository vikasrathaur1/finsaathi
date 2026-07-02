import React from "react";
import { ChevronRight } from "lucide-react";

export default function ClientHeader({ clientConfig, currentPhase, phases }) {
  const phase = phases.find((p) => p.id === currentPhase);

  return (
    <header className="flex items-center justify-between px-6 py-3.5 border-b border-[#2d3148] bg-card flex-shrink-0">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        {clientConfig ? (
          <>
            <span className="text-white font-medium">{clientConfig.name}</span>
            <ChevronRight size={14} className="text-gray-600" />
            <span className="text-gray-400">{phase?.label}</span>
          </>
        ) : (
          <span className="text-gray-400">{phase?.label}</span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {clientConfig && (
          <span className="text-xs bg-accent/10 text-accent border border-accent/20 px-2.5 py-1 rounded-full font-medium">
            {clientConfig.clientId}
          </span>
        )}
        <div className="w-7 h-7 rounded-full bg-[#22263a] border border-[#2d3148] flex items-center justify-center">
          <span className="text-xs font-medium text-gray-400">V</span>
        </div>
      </div>
    </header>
  );
}
