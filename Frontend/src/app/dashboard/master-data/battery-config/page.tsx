"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Cpu, 
  ArrowLeft, 
  Plus, 
  RefreshCw, 
  Edit3, 
  CheckCircle2, 
  XCircle, 
  Layers, 
  Box, 
  Binary, 
  X, 
  Save,
  Search,
  Calendar,
  Check,
  AlertCircle
} from "lucide-react";
import { BASE_URL } from "../../../../utils/utilsapi";

// API Endpoints
const API_BATTERY_CONFIG = `${BASE_URL}/api/v1/cellmes_master_battery_config`;
const API_PACK_CONFIG = `${BASE_URL}/api/v1/cellmes_master_pack_config/`;
const API_BMS_CONFIG = `${BASE_URL}/api/v1/cellmes_master_bms_config/`;
const API_MODULE_CONFIG = `${BASE_URL}/api/v1/cellmes_master_module_config/`;

// Interfaces
interface BatteryConfig {
  id: number;
  pack_id: number;
  pack_name?: string;
  pack_material_id?: string;
  bms_id: number;
  bms_name?: string;
  bms_material_id?: string;
  module_id: number;
  module_name?: string;
  module_material_id?: string;
  is_active: string;
  creation_date?: string;
  updation_date?: string;
}

interface PackMaster {
  id: number;
  pack_name: string;
  pack_material_id: string;
  is_active: string;
}

interface BmsMaster {
  id: number;
  bms_name: string;
  bms_material_id: string;
  is_active: string;
}

interface ModuleMaster {
  id: number;
  module_name: string;
  module_material_id: string;
  is_active: string;
}

export default function BatteryConfigMasterPage() {
  const router = useRouter();

  // Data States
  const [configs, setConfigs] = useState<BatteryConfig[]>([]);
  const [filteredConfigs, setFilteredConfigs] = useState<BatteryConfig[]>([]);
  
  // Master Dropdown Reference Lists
  const [packOptions, setPackOptions] = useState<PackMaster[]>([]);
  const [bmsOptions, setBmsOptions] = useState<BmsMaster[]>([]);
  const [moduleOptions, setModuleOptions] = useState<ModuleMaster[]>([]);

  // UI States
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Status Alerts
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal Control States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<BatteryConfig | null>(null);

  // Form States
  const [createForm, setCreateForm] = useState({
    pack_id: "",
    bms_id: "",
    module_id: ""
  });

  const [editForm, setEditForm] = useState({
    pack_id: "",
    bms_id: "",
    module_id: "",
    is_active: "Y"
  });

  // =============================================================================
  // 1. FETCH ALL MASTER DATA & MAIN LIST
  // =============================================================================
  const fetchAllData = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Fetch Master Reference Lists in Parallel
      const [packRes, bmsRes, moduleRes] = await Promise.all([
        fetch(API_PACK_CONFIG).catch(() => null),
        fetch(API_BMS_CONFIG).catch(() => null),
        fetch(API_MODULE_CONFIG).catch(() => null)
      ]);

      if (packRes?.ok) setPackOptions(await packRes.json());
      if (bmsRes?.ok) setBmsOptions(await bmsRes.json());
      if (moduleRes?.ok) setModuleOptions(await moduleRes.json());

      // Fetch Main Configurations List
      let configRes = await fetch(API_BATTERY_CONFIG);
      if (configRes.status === 404) {
        configRes = await fetch(`${BASE_URL}/cellmes_master_battery_config`);
      }

      if (!configRes.ok) {
        throw new Error(`Server returned status ${configRes.status}`);
      }

      const configData: BatteryConfig[] = await configRes.json();
      setConfigs(configData);
      setFilteredConfigs(configData);

    } catch (err: any) {
      console.error("Data Fetch Exception:", err);
      setErrorMessage(err.message || "Failed to load master configuration registries.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Helper resolvers to get material_ids & names dynamically from master lists
  const getPackInfo = (packId: number, fallbackName?: string, fallbackMat?: string) => {
    const match = packOptions.find((p) => p.id === packId);
    return {
      materialId: match ? match.pack_material_id : fallbackMat || `Pack #${packId}`,
      name: match ? match.pack_name : fallbackName || "Pack Component"
    };
  };

  const getBmsInfo = (bmsId: number, fallbackName?: string, fallbackMat?: string) => {
    const match = bmsOptions.find((b) => b.id === bmsId);
    return {
      materialId: match ? match.bms_material_id : fallbackMat || `BMS #${bmsId}`,
      name: match ? match.bms_name : fallbackName || "BMS Module"
    };
  };

  const getModuleInfo = (moduleId: number, fallbackName?: string, fallbackMat?: string) => {
    const match = moduleOptions.find((m) => m.id === moduleId);
    return {
      materialId: match ? match.module_material_id : fallbackMat || `Module #${moduleId}`,
      name: match ? match.module_name : fallbackName || "Cell Module"
    };
  };

  // Search Filter Watching Hook
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredConfigs(configs);
      return;
    }
    const q = searchTerm.toLowerCase();
    const filtered = configs.filter((c) => {
      const pInfo = getPackInfo(c.pack_id, c.pack_name, c.pack_material_id);
      const bInfo = getBmsInfo(c.bms_id, c.bms_name, c.bms_material_id);
      const mInfo = getModuleInfo(c.module_id, c.module_name, c.module_material_id);

      return (
        pInfo.name.toLowerCase().includes(q) ||
        pInfo.materialId.toLowerCase().includes(q) ||
        bInfo.name.toLowerCase().includes(q) ||
        bInfo.materialId.toLowerCase().includes(q) ||
        mInfo.name.toLowerCase().includes(q) ||
        mInfo.materialId.toLowerCase().includes(q) ||
        c.id.toString().includes(q)
      );
    });
    setFilteredConfigs(filtered);
  }, [searchTerm, configs, packOptions, bmsOptions, moduleOptions]);

  // =============================================================================
  // 2. CREATE CONFIGURATION (POST)
  // Payload: { "pack_id": 5, "bms_id": 3, "module_id": 4 }
  // =============================================================================
  const handleCreateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.pack_id || !createForm.bms_id || !createForm.module_id) {
      setErrorMessage("Please select all required components.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const payload = {
      pack_id: parseInt(createForm.pack_id, 10),
      bms_id: parseInt(createForm.bms_id, 10),
      module_id: parseInt(createForm.module_id, 10)
    };

    try {
      let response = await fetch(API_BATTERY_CONFIG, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.status === 404) {
        response = await fetch(`${BASE_URL}/cellmes_master_battery_config`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to create battery configuration.");
      }

      setSuccessMessage("Battery Master Configuration successfully linked!");
      setIsCreateModalOpen(false);
      setCreateForm({ pack_id: "", bms_id: "", module_id: "" });
      fetchAllData();
      setTimeout(() => setSuccessMessage(null), 3500);

    } catch (err: any) {
      console.error("Create Exception:", err);
      setErrorMessage(err.message || "Failed to save configuration profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // =============================================================================
  // 3. UPDATE CONFIGURATION (PATCH)
  // Payload: { "pack_id": 1, "bms_id": 1, "module_id": 1, "is_active": "Y" }
  // =============================================================================
  const handleUpdateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConfig || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const payload = {
      pack_id: parseInt(editForm.pack_id, 10),
      bms_id: parseInt(editForm.bms_id, 10),
      module_id: parseInt(editForm.module_id, 10),
      is_active: editForm.is_active
    };

    try {
      let response = await fetch(`${API_BATTERY_CONFIG}/${editingConfig.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.status === 404) {
        response = await fetch(`${BASE_URL}/cellmes_master_battery_config/${editingConfig.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to patch configuration profile.");
      }

      setSuccessMessage(`Configuration #${editingConfig.id} updated successfully!`);
      setEditingConfig(null);
      fetchAllData();
      setTimeout(() => setSuccessMessage(null), 3500);

    } catch (err: any) {
      console.error("PATCH Exception:", err);
      setErrorMessage(err.message || "Failed to update configuration profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditing = (config: BatteryConfig) => {
    setEditingConfig(config);
    setEditForm({
      pack_id: config.pack_id.toString(),
      bms_id: config.bms_id.toString(),
      module_id: config.module_id.toString(),
      is_active: config.is_active || "Y"
    });
    setErrorMessage(null);
  };

  return (
    <div className="space-y-8 max-w-7xl w-full mx-auto p-4 sm:p-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-800/10 pb-5">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push("/dashboard/master-data")}
            className="p-2.5 rounded-xl bg-white/50 hover:bg-white border border-white/60 text-emerald-950 transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-emerald-950 flex items-center gap-2">
              <Cpu className="w-6 h-6 text-emerald-600" /> Master Battery Configurations
            </h1>
            <p className="text-xs text-emerald-800/60 mt-0.5">Component Integration Matrix (Pack Details ↔ BMS Details ↔ Module Details)</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAllData}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-emerald-800/20 bg-white/40 hover:bg-white/80 text-emerald-900 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh Registry"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => { setIsCreateModalOpen(true); setErrorMessage(null); }}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white shadow-md transition-all active:scale-[0.99] cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create Configuration
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {successMessage && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-950 font-semibold text-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-950 font-semibold text-sm animate-in fade-in">
          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Search & Statistics */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-800/40" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Pack, BMS, Module Names or Material IDs..."
            className="w-full rounded-xl border border-white/60 bg-white/60 py-2.5 pl-10 pr-4 text-xs font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-emerald-900/60">
          <span>Active Mappings: {filteredConfigs.filter(c => c.is_active === "Y" || c.is_active === "1" || c.is_active === "TRUE").length}</span>
          <span>•</span>
          <span>Total Links: {filteredConfigs.length}</span>
        </div>
      </div>

      {/* Configurations Table */}
      <div className="bg-white/40 backdrop-blur-md border border-white/40 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-emerald-950/5 border-b border-emerald-900/10 text-[11px] font-black text-emerald-900 uppercase tracking-wider">
                <th className="py-4 px-4 text-center">Config ID</th>
                <th className="py-4 px-6">Pack Details</th>
                <th className="py-4 px-6">BMS Details</th>
                <th className="py-4 px-6">Module Details</th>
                <th className="py-4 px-4 text-center">Status</th>
                <th className="py-4 px-6">Timestamps</th>
                <th className="py-4 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-900/5 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-emerald-900/60 font-medium">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    Loading master component mappings...
                  </td>
                </tr>
              ) : filteredConfigs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-emerald-900/60 font-medium">
                    No matching battery configurations located.
                  </td>
                </tr>
              ) : (
                filteredConfigs.map((config) => {
                  const packInfo = getPackInfo(config.pack_id, config.pack_name, config.pack_material_id);
                  const bmsInfo = getBmsInfo(config.bms_id, config.bms_name, config.bms_material_id);
                  const moduleInfo = getModuleInfo(config.module_id, config.module_name, config.module_material_id);

                  return (
                    <tr key={config.id} className="hover:bg-white/50 transition-all">
                      
                      {/* Config ID */}
                      <td className="py-4 px-4 font-mono font-bold text-emerald-950 text-center">
                        #{config.id}
                      </td>

                      {/* Pack Details */}
                      <td className="py-4 px-6">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 mt-0.5">
                            <Box className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-emerald-950 text-sm">{packInfo.name}</p>
                            <p className="font-mono text-gray-600 text-[11px] mt-0.5">
                              Mat ID: <span className="font-bold text-emerald-900">{packInfo.materialId}</span>
                            </p>
                            <p className="text-[10px] text-gray-400 font-mono">Pack ID: {config.pack_id}</p>
                          </div>
                        </div>
                      </td>

                      {/* BMS Details */}
                      <td className="py-4 px-6">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-700 mt-0.5">
                            <Binary className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-blue-950 text-sm">{bmsInfo.name}</p>
                            <p className="font-mono text-gray-600 text-[11px] mt-0.5">
                              Mat ID: <span className="font-bold text-blue-900">{bmsInfo.materialId}</span>
                            </p>
                            <p className="text-[10px] text-gray-400 font-mono">BMS ID: {config.bms_id}</p>
                          </div>
                        </div>
                      </td>

                      {/* Module Details */}
                      <td className="py-4 px-6">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-700 mt-0.5">
                            <Layers className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-purple-950 text-sm">{moduleInfo.name}</p>
                            <p className="font-mono text-gray-600 text-[11px] mt-0.5">
                              Mat ID: <span className="font-bold text-purple-900">{moduleInfo.materialId}</span>
                            </p>
                            <p className="text-[10px] text-gray-400 font-mono">Module ID: {config.module_id}</p>
                          </div>
                        </div>
                      </td>

                      {/* Active Status */}
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                          config.is_active === "ACTIVE" || config.is_active === "1" || config.is_active === "TRUE"
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800"
                            : "bg-gray-200/60 border-gray-300 text-gray-600"
                        }`}>
                          {config.is_active === "ACTIVE" || config.is_active === "1" || config.is_active === "TRUE" ? (
                            <><Check className="w-3 h-3 text-emerald-600" /> Active</>
                          ) : (
                            <><AlertCircle className="w-3 h-3 text-gray-500" /> Inactive</>
                          )}
                        </span>
                      </td>

                      {/* Dates */}
                      <td className="py-4 px-6 text-[11px] text-gray-600 space-y-1 font-mono">
                        <p className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span>Created: {config.creation_date ? new Date(config.creation_date).toLocaleDateString() : "N/A"}</span>
                        </p>
                        {config.updation_date && (
                          <p className="text-[10px] text-gray-400">
                            Updated: {new Date(config.updation_date).toLocaleDateString()}
                          </p>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => startEditing(config)}
                          className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-all cursor-pointer"
                          title="Edit Configuration"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================================= */}
      {/* MODAL 1: CREATE NEW BATTERY CONFIGURATION (POST)                             */}
      {/* Target Payload: { "pack_id": 5, "bms_id": 3, "module_id": 4 }                 */}
      {/* ============================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-white/60 max-w-md w-full p-6 space-y-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-emerald-950 flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" /> Link New Configuration
              </h3>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateConfig} className="space-y-4">
              
              {/* Pack Dropdown */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Pack Component <span className="text-emerald-700">(pack_id)</span>
                </label>
                <select
                  required
                  value={createForm.pack_id}
                  onChange={(e) => setCreateForm({ ...createForm, pack_id: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 px-3 text-xs font-semibold text-gray-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">-- Select Pack Component --</option>
                  {packOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.pack_name || "Pack"} - Mat ID: {p.pack_material_id} (ID #{p.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* BMS Dropdown */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  BMS Component <span className="text-blue-700">(bms_id)</span>
                </label>
                <select
                  required
                  value={createForm.bms_id}
                  onChange={(e) => setCreateForm({ ...createForm, bms_id: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 px-3 text-xs font-semibold text-gray-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">-- Select BMS Component --</option>
                  {bmsOptions.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bms_name || "BMS"} - Mat ID: {b.bms_material_id} (ID #{b.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Module Dropdown */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Module Component <span className="text-purple-700">(module_id)</span>
                </label>
                <select
                  required
                  value={createForm.module_id}
                  onChange={(e) => setCreateForm({ ...createForm, module_id: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 px-3 text-xs font-semibold text-gray-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">-- Select Module Component --</option>
                  {moduleOptions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.module_name || "Module"} - Mat ID: {m.module_material_id} (ID #{m.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex gap-3 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-sm font-bold text-white shadow-md transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Linking..." : "Save Configuration Profile"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ============================================================================= */}
      {/* MODAL 2: EDIT EXISTING BATTERY CONFIGURATION (PATCH)                         */}
      {/* Target Payload: { "pack_id": 1, "bms_id": 1, "module_id": 1, "is_active": "Y" } */}
      {/* ============================================================================= */}
      {editingConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-white/60 max-w-md w-full p-6 space-y-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-emerald-950 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-600" /> Edit Configuration #{editingConfig.id}
              </h3>
              <button 
                onClick={() => setEditingConfig(null)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateConfig} className="space-y-4">
              
              {/* Pack Dropdown */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Pack Component <span className="text-emerald-700">(pack_id)</span>
                </label>
                <select
                  required
                  value={editForm.pack_id}
                  onChange={(e) => setEditForm({ ...editForm, pack_id: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 px-3 text-xs font-semibold text-gray-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
                >
                  {packOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.pack_name || "Pack"} - Mat ID: {p.pack_material_id} (ID #{p.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* BMS Dropdown */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  BMS Component <span className="text-blue-700">(bms_id)</span>
                </label>
                <select
                  required
                  value={editForm.bms_id}
                  onChange={(e) => setEditForm({ ...editForm, bms_id: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 px-3 text-xs font-semibold text-gray-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
                >
                  {bmsOptions.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bms_name || "BMS"} - Mat ID: {b.bms_material_id} (ID #{b.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Module Dropdown */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Module Component <span className="text-purple-700">(module_id)</span>
                </label>
                <select
                  required
                  value={editForm.module_id}
                  onChange={(e) => setEditForm({ ...editForm, module_id: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 px-3 text-xs font-semibold text-gray-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
                >
                  {moduleOptions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.module_name || "Module"} - Mat ID: {m.module_material_id} (ID #{m.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Flag */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Is Active Flag</label>
                <select
                  value={editForm.is_active}
                  onChange={(e) => setEditForm({ ...editForm, is_active: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 px-3 text-xs font-bold text-gray-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Y">Y - Active</option>
                  <option value="N">N - Inactive</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-sm font-bold text-white shadow-md transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> {isSubmitting ? "Submitting..." : "Save Patch Updates"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingConfig(null)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50"
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