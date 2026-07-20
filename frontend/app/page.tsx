"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UploadPage() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files || files.length === 0) return;

    setLoading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    try {
      // Swapped to the live localtunnel URL and added the reminder bypass header
      const res = await fetch("https://few-hands-design.loca.lt/api/process-documents", {
        method: "POST",
        headers: {
          "Bypass-Tunnel-Reminder": "true",
        },
        body: formData,
      });
      
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("latest_report", JSON.stringify(data));
        router.push("/report");
      } else {
        alert("Processing pipeline validation failure.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed connecting to Arveniq parsing server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-16 bg-slate-800 p-8 rounded-xl border border-slate-700 shadow-xl">
      <h2 className="text-2xl font-bold mb-2 text-white">Audit Dossier Ingestion</h2>
      <p className="text-slate-400 text-sm mb-6">
        Drop your Commercial Invoice, Packing List, and Bills of Lading simultaneously for instant structural integrity cross-validation.
      </p>
      
      <form onSubmit={handleUpload} className="space-y-4">
        <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-emerald-500 transition-colors">
          <input 
            type="file" 
            multiple 
            accept=".pdf"
            onChange={(e) => setFiles(e.target.files)}
            className="hidden" 
            id="file-picker" 
          />
          <label htmlFor="file-picker" className="cursor-pointer block text-sm text-slate-300">
            {files && files.length > 0 ? (
              <span className="text-emerald-400 font-semibold">{files.length} documents queued ready</span>
            ) : (
              "Click to select trade PDF documents"
            )}
          </label>
        </div>
        
        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-medium py-3 rounded-lg transition-colors flex justify-center items-center"
        >
          {loading ? "Analyzing Core Documents Across 6 Agents..." : "Execute Automated Cross-Audit"}
        </button>
      </form>
    </div>
  );
}