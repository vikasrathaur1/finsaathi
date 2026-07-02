import React, { useState } from "react";
import { CheckCircle, ChevronDown, ChevronRight, AlertCircle } from "lucide-react";

const FEATURES = [
  { id: "emi",          label: "EMI Repayment"   },
  { id: "flexi",        label: "Flexi Facility"  },
  { id: "foreclosure",  label: "Foreclosure"     },
  { id: "prepayment",   label: "Part Prepayment" },
  { id: "topup",        label: "Top Up"          },
  { id: "bt",           label: "Balance Transfer" },
];

export default function Phase3ProductRules({ registry, onRulesApproved }) {
  const [expanded, setExpanded] = useState({});

  const productRules = registry?.productRules || {};
  const categories   = registry?.enumValues?.prodCategory?.map((v) => v.value) || Object.keys(productRules);

  if (!categories.length) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-8 text-center">
          <AlertCircle size={32} className="text-amber-400 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No product categories found in the registry.</p>
          <p className="text-xs text-gray-600 mt-1">Make sure Sheet 5 (Feature Matrix) was filled in the Excel.</p>
        </div>
      </div>
    );
  }

  const toggle = (cat) => setExpanded((e) => ({ ...e, [cat]: !e[cat] }));

  const getApplicable = (cat, featureId) => {
    const rules = productRules[cat];
    if (!rules) return null;
    const f = rules[featureId];
    if (!f) return null;
    return f.applicable;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Product Rules</h1>
        <p className="text-sm text-gray-500 mt-1">
          Confirm feature applicability per product category. Driven by{" "}
          <code className="text-accent text-xs bg-accent/10 px-1 py-0.5 rounded">prodCategory</code>.
        </p>
      </div>

      {/* Feature matrix table */}
      <div className="card overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#0f1117] border-b border-[#2d3148]">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-3 font-medium w-48">Product Category</th>
                {FEATURES.map((f) => (
                  <th key={f.id} className="px-3 py-3 font-medium text-center">{f.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <React.Fragment key={cat}>
                  <tr
                    className="border-b border-[#1e2235] hover:bg-[#1e2235]/50 cursor-pointer"
                    onClick={() => toggle(cat)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {expanded[cat] ? (
                          <ChevronDown size={13} className="text-gray-500" />
                        ) : (
                          <ChevronRight size={13} className="text-gray-500" />
                        )}
                        <span className="text-gray-200 font-medium">{cat}</span>
                      </div>
                    </td>
                    {FEATURES.map((f) => {
                      const applicable = getApplicable(cat, f.id);
                      return (
                        <td key={f.id} className="px-3 py-3 text-center">
                          {applicable === null ? (
                            <span className="text-gray-700">—</span>
                          ) : applicable ? (
                            <span className="text-green-400">✓</span>
                          ) : (
                            <span className="text-red-400/70">✗</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  {expanded[cat] && (
                    <tr className="border-b border-[#1e2235] bg-[#0f1117]/50">
                      <td colSpan={FEATURES.length + 1} className="px-6 py-4">
                        <div className="space-y-2">
                          {FEATURES.map((f) => {
                            const rules = productRules[cat]?.[f.id];
                            if (!rules) return null;
                            return (
                              <div key={f.id} className="flex gap-4 items-start text-[11px]">
                                <span className="text-gray-500 w-32 flex-shrink-0">{f.label}</span>
                                {rules.applicable ? (
                                  <div className="text-green-400">
                                    Applicable
                                    {rules.conditions?.length > 0 && (
                                      <span className="text-gray-400 ml-2">
                                        · {rules.conditions.map((c) => c.message).join("; ")}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-gray-500">
                                    Not applicable
                                    {rules.message && (
                                      <span className="text-gray-600 ml-2">· {rules.message}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-accent/5 border border-accent/20 rounded-xl p-4">
        <p className="text-xs text-gray-400">
          <span className="text-accent font-medium">Note:</span>{" "}
          <code className="text-accent/80">prodDesc</code> variants (e.g. "GOLD LOAN BT") inherit rules from their{" "}
          <code className="text-accent/80">prodCategory</code> ("GOLD LOAN"). These rules drive tool behaviour in Phase 6.
        </p>
      </div>

      <button
        onClick={() => onRulesApproved(registry)}
        className="btn-primary flex items-center gap-2"
      >
        <CheckCircle size={15} />
        Approve Rules & Continue →
      </button>
    </div>
  );
}
