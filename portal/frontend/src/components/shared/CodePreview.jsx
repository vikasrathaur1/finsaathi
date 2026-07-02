import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

export default function CodePreview({ files }) {
  const fileNames = Object.keys(files || {});
  const [active, setActive] = useState(fileNames[0] || "");
  const [copied, setCopied] = useState(false);

  if (!fileNames.length) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(files[active] || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const getLang = (name) => {
    if (name.endsWith(".js") || name.endsWith(".jsx")) return "javascript";
    if (name.endsWith(".json")) return "json";
    if (name.endsWith(".ts")) return "typescript";
    if (name.endsWith(".sh")) return "bash";
    return "text";
  };

  return (
    <div className="flex flex-col h-full rounded-xl border border-[#2d3148] overflow-hidden">
      {/* Tabs */}
      <div className="flex items-center gap-0.5 px-2 pt-2 bg-[#0f1117] border-b border-[#2d3148] overflow-x-auto flex-shrink-0">
        {fileNames.map((name) => (
          <button
            key={name}
            onClick={() => setActive(name)}
            className={`px-3 py-1.5 text-xs font-mono rounded-t transition-colors flex-shrink-0 ${
              active === name
                ? "bg-card text-white border border-b-0 border-[#2d3148]"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {name.split("/").pop()}
          </button>
        ))}
      </div>

      {/* Header with path + copy */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0a0c12] border-b border-[#2d3148] flex-shrink-0">
        <span className="text-[11px] text-gray-500 font-mono">{active}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {/* Code */}
      <div className="flex-1 overflow-auto">
        <SyntaxHighlighter
          language={getLang(active)}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            padding: "1rem",
            background: "transparent",
            fontSize: "12px",
            lineHeight: "1.6",
          }}
          showLineNumbers
          lineNumberStyle={{ color: "#3a3f55", fontSize: "11px" }}
        >
          {files[active] || ""}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
