"use client";
import { useEffect, useState } from 'react';

export default function ReportPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem("latest_report");
    if (stored) setData(jsonParseSafe(stored));
  }, []);

  const jsonParseSafe = (str: string) => {
    try { return JSON.parse(str); } catch { return null; }
  };

  if (!data) return <div className="text-center py-12">No current trade data loaded.</div>;

  const primaryDoc = data.documents?.[0] || {};
  const isHighRisk = data.risk?.risk_level === "HIGH RISK";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center bg-slate-800 p-6 rounded-xl border border-slate-700">
        <div>
          <h2 className="text-2xl font-bold text-white">Audit Execution Ledger</h2>
          <p className="text-slate-400 text-sm">Cross-Document Verification Matrix Completed</p>
        </div>
        {/* Updated link from localhost to your Localtunnel instance */}
        <a 
          href="https://few-hands-design.loca.lt/api/download-report" 
          target="_blank" 
          rel="noreferrer"
          className="bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
        >
          Download Official PDF Report
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Summary Details */}
        <div className="md:col-span-2 bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-4">
          <h3 className="text-lg font-bold border-b border-slate-700 pb-2 text-emerald-400">Shipment Extract Summary</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-slate-400 block">Exporter</span><strong>{primaryDoc.exporter || "N/A"}</strong></div>
            <div><span className="text-slate-400 block">Importer</span><strong>{primaryDoc.importer || "N/A"}</strong></div>
            <div><span className="text-slate-400 block">Invoice Reference</span><strong>{primaryDoc.invoice_number || "N/A"}</strong></div>
            <div><span className="text-slate-400 block">Gross Weight</span><strong>{primaryDoc.weight || "N/A"}</strong></div>
            <div><span className="text-slate-400 block">Incoterm</span><strong>{primaryDoc.incoterms || "N/A"}</strong></div>
            <div><span className="text-slate-400 block">Total Declared Value</span><strong>{primaryDoc.declared_value || "N/A"}</strong></div>
          </div>
        </div>

        {/* Risk Assessment Component */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col justify-between items-center text-center">
          <h3 className="text-md font-bold text-slate-300 uppercase tracking-wider">Computed Risk Matrix</h3>
          <div className="my-4">
            <span className={`text-5xl font-extrabold ${isHighRisk ? 'text-rose-500' : 'text-emerald-400'}`}>
              {data.risk?.risk_score ?? 0}%
            </span>
            <div className={`mt-2 text-xs font-bold px-3 py-1 rounded-full ${isHighRisk ? 'bg-rose-950 text-rose-300' : 'bg-emerald-950 text-emerald-300'}`}>
              {data.risk?.risk_level || "LOW RISK"}
            </div>
          </div>
          <p className="text-xs text-slate-400">Calculated across structured item cross-matching parameters</p>
        </div>
      </div>

      {/* Validation Checks Checklist Grid */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-3">
        <h3 className="text-lg font-bold text-white mb-2">Automated Data Consistency Checks</h3>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center space-x-2">
            <span>{data.validation?.invoice_matches_packing_list ? "✅" : "❌"}</span>
            <span>Invoice matches Packing List dimensions data</span>
          </li>
          <li className="flex items-center space-x-2">
            <span>{data.validation?.weight_matches ? "✅" : "❌"}</span>
            <span>Gross and net weight measurements structural match</span>
          </li>
          <li className="flex items-center space-x-2">
            <span>{data.validation?.quantity_matches ? "✅" : "❌"}</span>
            <span>Package unit quantities cross-validation check</span>
          </li>
          <li className="flex items-center space-x-2">
            <span>{data.validation?.hs_code_matches ? "✅" : "❌"}</span>
            <span>Global Harmonized System tariffs categorization consensus</span>
          </li>
        </ul>
      </div>

      {/* Warnings & Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-2">
          <h4 className="text-md font-bold text-rose-400">Discrepancy Flags Raised</h4>
          <ul className="list-disc pl-4 text-xs text-slate-300 space-y-1">
            {data.validation?.warnings?.map((w: string, i: number) => <li key={i}>{w}</li>) || <li>None</li>}
          </ul>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-2">
          <h4 className="text-md font-bold text-emerald-400">Actionable Remediations</h4>
          <ul className="list-disc pl-4 text-xs text-slate-300 space-y-1">
            {data.risk?.recommendations?.map((r: string, i: number) => <li key={i}>{r}</li>) || <li>Clear</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}