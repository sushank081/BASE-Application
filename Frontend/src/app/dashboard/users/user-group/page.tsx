"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Users, 
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

interface UserGroup {
  id: number;
  group_name: string;
  is_active: string;
  created_date: string;
  updation_time: string | null;
}

export default function UserGroupsPage() {
  const router = useRouter();

  // Core Master Telemetry Ledger States
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMutationProcessing, setIsMutationProcessing] = useState(false);

  // Form Modal Context States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null);
  
  // Controlled Input Parameters
  const [groupName, setGroupName] = useState("");
  const [isActiveStatus, setIsActiveStatus] = useState("YES");

  // Fetch initial group records on component mount
  useEffect(() => {
    fetchUserGroups();
  }, []);

  // 1. GET METHOD: Hydrate Tracking Tables from Backend
  const fetchUserGroups = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/v1/master/user-groups`, {
        method: "GET",
        headers: { "Accept": "application/json" }
      });
      const data = await response.json();
      if (!response.ok) throw new Error("Failed to pull user group records.");
      setGroups(data);
    } catch (err: any) {
      console.error(err);
      alert(`Ledger Synchronize Error:\n${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. POST & 3. PATCH METHOD: Single Action Form Submission Route
  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || isMutationProcessing) return;

    setIsMutationProcessing(true);
    const isEditMode = !!editingGroup;
    
    const targetUrl = isEditMode 
      ? `${BASE_URL}/api/v1/master/user-groups/${editingGroup.id}`
      : `${BASE_URL}/api/v1/master/user-groups`;

    const computedPayload = isEditMode 
      ? {
          group_name: groupName.trim(),
          is_active: isActiveStatus
        }
      : {
          group_name: groupName.trim()
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || `Mutation sequence rejected with status: ${response.status}`);
      }

      alert(`User Group successfully ${isEditMode ? "updated" : "added to master ledger"}!`);
      closeModalWorkflow();
      fetchUserGroups(); // Re-sync state

    } catch (err: any) {
      console.error(err);
      alert(`MUTATION FAILURE:\n${err.message}`);
    } finally {
      setIsMutationProcessing(false);
    }
  };

  // Open modal for editing existing records
  const openEditModal = (group: UserGroup) => {
    setEditingGroup(group);
    setGroupName(group.group_name);
    setIsActiveStatus(group.is_active);
    setIsModalOpen(true);
  };

  const closeModalWorkflow = () => {
    setIsModalOpen(false);
    setEditingGroup(null);
    setGroupName("");
    setIsActiveStatus("YES");
  };

  const formatDateToken = (isoString: string | null) => {
    if (!isoString) return "—";
    try {
      return new Date(isoString).toLocaleString('en-US', { hour12: false });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl w-full mx-auto p-4">
      
      {/* Header Management Navigation Block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-emerald-800/10 pb-5">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-white/40 hover:bg-white/80 border border-white/50 text-emerald-950 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-emerald-950 flex items-center gap-2">
              <Users className="w-6 h-6 text-emerald-600" /> User Groups Master
            </h1>
            <p className="text-xs text-emerald-800/60 mt-0.5">Master Access Control & Role Group Settings</p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 px-4 py-3 font-bold text-sm text-white shadow-md transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add User Group
        </button>
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* SECTOR 1: DATA DISPLAY LEDGER TRACKING TABLE */}
      {/* ------------------------------------------------------------------------- */}
      <div className="bg-white/40 backdrop-blur-md border border-white/40 rounded-2xl shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-emerald-950/60 font-semibold animate-pulse text-sm">
            Fetching Master User Groups...
          </div>
        ) : groups.length === 0 ? (
          <div className="p-12 text-center text-emerald-950/40 text-sm font-medium">
            No User Groups mapped inside this database schema node.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-gray-900">
              <thead className="bg-emerald-900 text-emerald-100 font-semibold tracking-wider uppercase text-[10px]">
                <tr>
                  <th className="px-6 py-4">Database ID</th>
                  <th className="px-6 py-4">User Group Name</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Creation Timeline</th>
                  <th className="px-6 py-4">Last Modified</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/60 bg-white/30 font-medium">
                {groups.map((group) => (
                  <tr key={group.id} className="hover:bg-white/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-gray-500">#{group.id}</td>
                    <td className="px-6 py-4 text-emerald-950 font-bold uppercase">{group.group_name}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border
                        ${group.is_active === "YES" 
                          ? "bg-emerald-100 border-emerald-300 text-emerald-800" 
                          : "bg-red-100 border-red-300 text-red-800"
                        }`}
                      >
                        {group.is_active === "YES" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {group.is_active === "YES" ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 font-normal">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {formatDateToken(group.created_date)}</span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 font-normal">
                      {group.updation_time ? (
                        <span className="flex items-center gap-1"><RotateCcw className="w-3.5 h-3.5" /> {formatDateToken(group.updation_time)}</span>
                      ) : "—"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => openEditModal(group)}
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
                <Users className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold tracking-tight">
                  {editingGroup ? `Modify User Group #${editingGroup.id}` : "Register New User Group"}
                </h2>
              </div>
              <button onClick={closeModalWorkflow} className="p-1 rounded-lg bg-emerald-950/50 hover:bg-emerald-950 text-white cursor-pointer transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Core Mutation Parameter Ingestion Panel */}
            <form onSubmit={handleSaveGroup} className="p-6 space-y-5">
              
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">User Group Identity Name</label>
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="block w-full mt-2 rounded-lg border border-gray-300 p-3 text-sm text-gray-900 bg-gray-50 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono uppercase"
                  placeholder="e.g., QUALITY_INSPECTOR"
                />
              </div>

              {/* Status configuration dropdown added dynamically into the Edit View overlay */}
              {editingGroup && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Active Status</label>
                  <div className="relative mt-2">
                    <select
                      value={isActiveStatus}
                      onChange={(e) => setIsActiveStatus(e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm text-gray-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none font-semibold cursor-pointer"
                    >
                      <option value="YES" className="text-emerald-700 font-bold">YES (Active)</option>
                      <option value="NO" className="text-red-700 font-bold">NO (Inactive)</option>
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
                  disabled={!groupName.trim() || isMutationProcessing}
                  className="flex-1 flex justify-center items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-600 disabled:opacity-40 disabled:pointer-events-none transition-all active:scale-95 cursor-pointer"
                >
                  <Save className="w-4 h-4" /> {isMutationProcessing ? "Transmitting Parameters..." : "Commit Group Parameters"}
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