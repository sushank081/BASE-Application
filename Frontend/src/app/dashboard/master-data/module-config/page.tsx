"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Cpu, 
  ArrowLeft, 
  Plus, 
  Edit3, 
  RotateCcw, 
  Save, 
  X, 
  CheckCircle, 
  XCircle,
  Calendar,
  ToggleLeft
} from "lucide-react";
import { BASE_URL } from "../../../../utils/utilsapi";

interface ModuleConfig {
  id: number;
  module_name: string;
  module_material_id: string;
  is_active: string;
  creation_date: string;
  updation_date: string | null;
}

export default function ModuleConfigPage() {
  const router = useRouter();

  // Core Master Telemetry Ledger States
  const [configs, setConfigs] = useState<ModuleConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMutationProcessing, setIsMutationProcessing] = useState(false);

  // Form Modal Context States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ModuleConfig | null>(null);
  
  // Controlled Input Parameters
  const [moduleName, setModuleName] = useState("");
  const [moduleMaterialId, setModuleMaterialId] = useState("");
  const [isActiveStatus, setIsActiveStatus] = useState("ACTIVE");

  // Hook up line execution parameters on components mounting
  useEffect(() => {
    fetchModuleConfigurations();
  }, []);

  // 1. GET METHOD: Hydrate Tracking Tables from Backend
  const fetchModuleConfigurations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/v1/cellmes_master_module_config`, {
        method: "GET",
        headers: { "Accept": "application/json" }
      });
      const data = await response.json();
      if (!response.ok) throw new Error("Failed to pull configuration blueprints.");
      setConfigs(data);
    } catch (err: any) {
      console.error(err);
      alert(`Ledger Synchronize Error:\n${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. POST & 3. PATCH METHOD: Single Action Form Submission Route
  const handleSaveConfiguration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleName.trim() || !moduleMaterialId.trim() || isMutationProcessing) return;

    setIsMutationProcessing(true);
    const isEditMode = !!editingConfig;
    
    const targetUrl = isEditMode 
      ? `${BASE_URL}/api/v1/cellmes_master_module_config/${editingConfig.id}`
      : `${BASE_URL}/api/v1/cellmes_master_module_config`;

    const computedPayload = isEditMode 
      ? {
          id: editingConfig.id,
          module_name: moduleName.trim(),
          module_material_id: moduleMaterialId.trim(),
          is_active: isActiveStatus,
          creation_date: editingConfig.creation_date,
          updation_date: new Date().toISOString()
        }
      : {
          module_name: moduleName.trim(),
          module_material_id: moduleMaterialId.trim()
        };

    try {
      const response = await fetch(targetUrl, {
        method: isEditMode ? "PATCH" : "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(computedPayload)
      });

      if (!response.ok) throw new Error(`Mutation sequence rejected with status: ${response.status}`);

      alert(`BOM Recipe successfully ${isEditMode ? "updated" : "added to master ledger"}!`);
      closeModalWorkflow();
      fetchModuleConfigurations(); // Re-sync state

    } catch (err: any) {
      console.error(err);
      alert(`MUTATION FAILURE:\n${err.message}`);
    } finally {
      setIsMutationProcessing(false);
    }
  };

  // Open modal for editing existing records
  const openEditModal = (config: ModuleConfig) => {
    setEditingConfig(config);
    setModuleName(config.module_name);
    setModuleMaterialId(config.module_material_id);
    setIsActiveStatus(config.is_active);
    setIsModalOpen(true);
  };

  const closeModalWorkflow = () => {
    setIsModalOpen(false);
    setEditingConfig(null);
    setModuleName("");
    setModuleMaterialId("");
    setIsActiveStatus("ACTIVE");
  };

  const formatDateToken = (isoString: string) => {
    if (!isoString) return "—";
    return new Date(isoString).toLocaleString('en-US', { hour12: false });
  };

  return (
    <div className="space-y-8 max-w-7xl w-full mx-auto p-4">
      
      {/* Header Management Navigation Block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-emerald-800/10 pb-5">
        <div className="flex items-center gap-4">
          {/* Back button updated to standard tracking history pop */}
          <button 
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-white/40 hover:bg-white/80 border border-white/50 text-emerald-950 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-emerald-950 flex items-center gap-2">
              <Cpu className="w-6 h-6 text-emerald-600" /> Module Variant Master
            </h1>
            <p className="text-xs text-emerald-800/60 mt-0.5">Bill of Materials (BOM) Material Mapping Settings</p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 px-4 py-3 font-bold text-sm text-white shadow-md transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Variant Recipe
        </button>
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* SECTOR 1: DATA DISPLAY LEDGER TRACKING TABLE */}
      {/* ------------------------------------------------------------------------- */}
      <div className="bg-white/40 backdrop-blur-md border border-white/40 rounded-2xl shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-emerald-950/60 font-semibold animate-pulse text-sm">
            Fetching Master Data Enclosures...
          </div>
        ) : configs.length === 0 ? (
          <div className="p-12 text-center text-emerald-950/40 text-sm font-medium">
            No Module Variants mapped inside this database schema node.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-gray-900">
              <thead className="bg-emerald-900 text-emerald-100 font-semibold tracking-wider uppercase text-[10px]">
                <tr>
                  <th className="px-6 py-4">Database ID</th>
                  <th className="px-6 py-4">Module Name Variant</th>
                  <th className="px-6 py-4">Material Number Code</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Creation Timeline</th>
                  <th className="px-6 py-4">Last Modified</th>
                  <th className="px-6 py-4 text-center">Action Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/60 bg-white/30 font-medium">
                {configs.map((config) => (
                  <tr key={config.id} className="hover:bg-white/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-gray-500">#{config.id}</td>
                    <td className="px-6 py-4 text-emerald-950 font-bold">{config.module_name}</td>
                    <td className="px-6 py-4 font-mono text-xs tracking-wider text-gray-700">{config.module_material_id}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border
                        ${config.is_active === "ACTIVE" 
                          ? "bg-emerald-100 border-emerald-300 text-emerald-800" 
                          : "bg-red-100 border-red-300 text-red-800"
                        }`}
                      >
                        {config.is_active === "ACTIVE" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {config.is_active}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 font-normal">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {formatDateToken(config.creation_date)}</span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 font-normal">
                      {config.updation_date ? (
                        <span className="flex items-center gap-1"><RotateCcw className="w-3.5 h-3.5" /> {formatDateToken(config.updation_date)}</span>
                      ) : "—"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => openEditModal(config)}
                        className="p-2 rounded-lg border border-emerald-800/10 hover:border-emerald-800/30 text-emerald-900 bg-white/40 hover:bg-white cursor-pointer transition-all"
                      >
                        <Edit3 className="w-4 h-4" />
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
      {/* SECTOR 2 & 3: FORM MODAL INTERACTION DRAWER (ADD/EDIT PIPELINE) */}
      {/* ------------------------------------------------------------------------- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-emerald-900/10 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Modal Heading Title area */}
            <div className="bg-emerald-900 text-white px-6 py-4 flex items-center justify-between border-b border-emerald-950">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold tracking-tight">
                  {editingConfig ? `Modify Blueprint Variant #${editingConfig.id}` : "Register New Module Configuration"}
                </h2>
              </div>
              <button onClick={closeModalWorkflow} className="p-1 rounded-lg bg-emerald-950/50 hover:bg-emerald-950 text-white cursor-pointer transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Core Mutation Parameter Ingestion Panel */}
            <form onSubmit={handleSaveConfiguration} className="p-6 space-y-5">
              
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Module Display Identity Name</label>
                <input
                  type="text"
                  required
                  value={moduleName}
                  onChange={(e) => setModuleName(e.target.value)}
                  className="block w-full mt-2 rounded-lg border border-gray-300 p-3 text-sm text-gray-900 bg-gray-50 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
                  placeholder="e.g., Variant Alpha 60kW Pack Module"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Master Material Part Number Code</label>
                <input
                  type="text"
                  required
                  value={moduleMaterialId}
                  onChange={(e) => setModuleMaterialId(e.target.value)}
                  className="block w-full mt-2 rounded-lg border border-gray-300 p-3 text-sm font-mono tracking-wider text-gray-900 bg-gray-50 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  placeholder="e.g., MM-4079-FG-02A"
                />
              </div>

              {/* Status configuration dropdown added dynamically into the Edit View overlay */}
              {editingConfig && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Functional Lifecycle Status</label>
                  <div className="relative mt-2">
                    <select
                      value={isActiveStatus}
                      onChange={(e) => setIsActiveStatus(e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm text-gray-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none font-semibold cursor-pointer"
                    >
                      <option value="ACTIVE" className="text-emerald-700 font-bold">ACTIVE (Production Allowed)</option>
                      <option value="INACTIVE" className="text-red-700 font-bold">INACTIVE (Halt Station Routing)</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
                      <ToggleLeft className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic Footer Controls Row Segment */}
              <div className="flex gap-4 pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={!moduleName.trim() || !moduleMaterialId.trim() || isMutationProcessing}
                  className="flex-1 flex justify-center items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-600 disabled:opacity-40 disabled:pointer-events-none transition-all active:scale-95 cursor-pointer"
                >
                  <Save className="w-4 h-4" /> {isMutationProcessing ? "Transmitting Master Parameters..." : "Commit Variant Parameters"}
                </button>
                
                <button
                  type="button"
                  onClick={closeModalWorkflow}
                  className="px-5 py-3 border border-gray-300 hover:border-gray-400 text-gray-700 font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer bg-gray-50 hover:bg-gray-100"
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