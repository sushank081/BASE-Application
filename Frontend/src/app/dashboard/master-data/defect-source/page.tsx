"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Edit3,
  Save,
  X,
  CheckCircle,
  XCircle,
  GitBranch,
  RefreshCw,
  ToggleLeft
} from "lucide-react";
import { BASE_URL } from "../../../../utils/utilsapi";

interface MasterDefectSource {
  id: number;
  defect_name: string;
  is_active: string;
}

export default function MasterDefectSourcesPage() {
  const router = useRouter();

  // Core Data & Processing States
  const [sources, setSources] = useState<MasterDefectSource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMutationProcessing, setIsMutationProcessing] = useState(false);

  // Form Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<MasterDefectSource | null>(null);

  // Controlled Form Inputs
  const [defectName, setDefectName] = useState("");
  const [isActiveStatus, setIsActiveStatus] = useState("ACTIVE");

  // Fetch all defect source records on mount
  useEffect(() => {
    fetchDefectSources();
  }, []);

  // -------------------------------------------------------------------------
  // 1. GET METHOD: FETCH ALL DEFECT SOURCES
  // -------------------------------------------------------------------------
  const fetchDefectSources = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/master/defect-sources`, {
        headers: { Accept: "application/json" }
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const errorDetail =
          typeof data?.detail === "string"
            ? data.detail
            : "Failed to pull master defect source records.";
        throw new Error(errorDetail);
      }

      setSources(data || []);
    } catch (err: any) {
      console.error("Fetch Defect Sources Error:", err);
      const actualMsg =
        typeof err === "string"
          ? err
          : err?.message || "An unexpected error occurred while fetching defect source list.";
      alert(`Master Defect Source Sync Error:\n${actualMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // 2. POST & 3. PATCH METHOD: SAVE / UPDATE DEFECT SOURCE
  // -------------------------------------------------------------------------
  const handleSaveDefectSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!defectName.trim() || isMutationProcessing) return;

    const isEditMode = !!editingSource;
    setIsMutationProcessing(true);

    const targetUrl = isEditMode
      ? `${BASE_URL}/api/v1/master/defect-sources/${editingSource.id}`
      : `${BASE_URL}/api/v1/master/defect-sources`;

    // Build payload matching backend schemas
    const payload = isEditMode
      ? {
          defect_name: defectName.trim(),
          is_active: isActiveStatus
        }
      : {
          defect_name: defectName.trim()
        };

    try {
      const response = await fetch(targetUrl, {
        method: isEditMode ? "PATCH" : "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        let detailedMsg = `Mutation rejected with HTTP status: ${response.status}`;

        if (typeof data.detail === "string") {
          detailedMsg = data.detail;
        } else if (Array.isArray(data.detail)) {
          detailedMsg = data.detail
            .map((errItem: any) => errItem.msg || JSON.stringify(errItem))
            .join(", ");
        } else if (data.message) {
          detailedMsg = data.message;
        }

        throw new Error(detailedMsg);
      }

      alert(
        `Master defect source record successfully ${
          isEditMode ? "updated" : "added to registry"
        }!`
      );
      closeModalWorkflow();
      fetchDefectSources(); // Re-sync table data
    } catch (err: any) {
      console.error("Save Defect Source Error:", err);
      const actualErrorString =
        typeof err === "string"
          ? err
          : err?.message || "An error occurred while saving the defect source record.";
      alert(`TRANSACTION FAILURE:\n${actualErrorString}`);
    } finally {
      setIsMutationProcessing(false);
    }
  };

  // Open modal for editing existing records
  const openEditModal = (source: MasterDefectSource) => {
    setEditingSource(source);
    setDefectName(source.defect_name);
    setIsActiveStatus(source.is_active);
    setIsModalOpen(true);
  };

  // Reset form and close modal
  const closeModalWorkflow = () => {
    setIsModalOpen(false);
    setEditingSource(null);
    setDefectName("");
    setIsActiveStatus("ACTIVE");
  };

  return (
    <div className="space-y-8 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 font-sans text-black">
      
      {/* HEADER NAVIGATION BLOCK */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-emerald-800/10 pb-5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2.5 rounded-xl bg-white/60 hover:bg-white border border-white/80 text-black transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-black" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-black flex items-center gap-2">
              <GitBranch className="w-7 h-7 text-emerald-600" /> Master Defect Source Registry
            </h1>
            <p className="text-xs text-black/70 mt-0.5 font-medium">
              Shop Floor Defect Origin Station & Subsystem Catalog
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDefectSources}
            className="p-3 rounded-xl bg-white/80 hover:bg-white text-black font-semibold text-xs border border-emerald-900/10 shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-black" /> Refresh
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 px-5 py-3 font-bold text-xs text-white shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Defect Source
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* SECTOR 1: MASTER DEFECT SOURCES TABLE (GET DISPLAY) */}
      {/* ------------------------------------------------------------------------- */}
      <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-2xl shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-black/70 font-semibold animate-pulse text-sm">
            Fetching Master Defect Source Records...
          </div>
        ) : sources.length === 0 ? (
          <div className="p-12 text-center text-black/50 text-sm font-medium">
            No defect origin sources registered inside master dataset.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs text-black">
              <thead className="bg-emerald-900 text-white font-bold tracking-wider uppercase text-[10px]">
                <tr>
                  <th className="px-6 py-4">Database ID</th>
                  <th className="px-6 py-4">Defect Origin Source</th>
                  <th className="px-6 py-4">Active Status</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/80 bg-white/40 font-mono font-medium text-black">
                {sources.map((item) => (
                  <tr key={item.id} className="hover:bg-white/80 transition-colors text-black">
                    <td className="px-6 py-4 font-bold text-gray-600">#{item.id}</td>
                    <td className="px-6 py-4 font-bold text-black font-sans text-sm">
                      {item.defect_name || "—"}
                    </td>
                    <td className="px-6 py-4 font-sans">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                          item.is_active === "ACTIVE" || item.is_active === "YES"
                            ? "bg-emerald-100 border-emerald-300 text-emerald-950"
                            : "bg-red-100 border-red-300 text-red-950"
                        }`}
                      >
                        {item.is_active === "ACTIVE" || item.is_active === "YES" ? (
                          <CheckCircle className="w-3 h-3 text-emerald-700" />
                        ) : (
                          <XCircle className="w-3 h-3 text-red-700" />
                        )}
                        {item.is_active}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-sans">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-2 rounded-lg border border-gray-300 hover:border-emerald-600 text-black bg-white hover:bg-emerald-50 cursor-pointer transition-all shadow-xs"
                      >
                        <Edit3 className="w-4 h-4 text-black" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* SECTOR 2: MODAL FORM (POST & PATCH) */}
      {/* ------------------------------------------------------------------------- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full overflow-hidden text-black animate-in zoom-in-95 duration-150">
            
            {/* Modal Title Bar */}
            <div className="bg-emerald-900 text-white px-6 py-4 flex items-center justify-between border-b border-emerald-950">
              <div className="flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-emerald-400" />
                <h2 className="text-sm font-bold tracking-tight">
                  {editingSource
                    ? `Modify Defect Source #${editingSource.id}`
                    : "Register New Defect Source"}
                </h2>
              </div>
              <button
                onClick={closeModalWorkflow}
                className="p-1 rounded-lg bg-emerald-950/50 hover:bg-emerald-950 text-white cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Ingestion Form Body */}
            <form onSubmit={handleSaveDefectSource} className="p-6 space-y-4 text-black">
              
              {/* Defect Source Name Input */}
              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">
                  Defect Origin Source Name
                </label>
                <input
                  type="text"
                  required
                  value={defectName}
                  onChange={(e) => setDefectName(e.target.value)}
                  placeholder="e.g. Pack Line, EOL, or Charging"
                  className="block w-full rounded-xl border border-gray-300 bg-gray-50 p-3 text-xs font-semibold text-black focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>

              {/* Status Select (Available in Edit View / PATCH Mode) */}
              {editingSource && (
                <div>
                  <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">
                    Is Active Status
                  </label>
                  <div className="relative">
                    <select
                      value={isActiveStatus}
                      onChange={(e) => setIsActiveStatus(e.target.value)}
                      className="block w-full rounded-xl border border-gray-300 bg-gray-50 p-3 text-xs font-bold text-black focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none cursor-pointer"
                    >
                      <option value="ACTIVE" className="text-black bg-white font-bold">ACTIVE</option>
                      <option value="INACTIVE" className="text-black bg-white font-bold">INACTIVE</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500">
                      <ToggleLeft className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Control Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={!defectName.trim() || isMutationProcessing}
                  className="flex-1 flex justify-center items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-600 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {isMutationProcessing ? "Saving..." : "Commit Source Entry"}
                </button>

                <button
                  type="button"
                  onClick={closeModalWorkflow}
                  className="px-5 py-3 border border-gray-300 hover:border-gray-400 text-black font-bold text-xs rounded-xl flex items-center justify-center transition-all cursor-pointer bg-gray-50 hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}