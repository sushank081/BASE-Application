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
  ToggleLeft,
  Mail,
  UserCheck,
  Lock,
  ShieldCheck
} from "lucide-react";
import { BASE_URL } from "../../../../utils/utilsapi";

interface MasterUser {
  id: number;
  user_group: number;
  group_name: string;
  user_name: string;
  user_id: string;
  email: string | null;
  failed_attempt: number;
  last_login_attemt: string | null;
  is_active: string;
}

interface UserGroupOption {
  id: number;
  group_name: string;
  is_active: string;
}

export default function MasterUsersPage() {
  const router = useRouter();

  // Core Ledger States
  const [users, setUsers] = useState<MasterUser[]>([]);
  const [availableGroups, setAvailableGroups] = useState<UserGroupOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMutationProcessing, setIsMutationProcessing] = useState(false);

  // Form Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<MasterUser | null>(null);
  
  // Controlled Input Parameters
  const [userName, setUserName] = useState("");
  const [userIdCode, setUserIdCode] = useState("");
  const [userGroupId, setUserGroupId] = useState<number | "">("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isActiveStatus, setIsActiveStatus] = useState("YES");

  // Fetch initial users and available group options on mount
  useEffect(() => {
    fetchUsersAndGroups();
  }, []);

  // Hydrate Data from Backend
  const fetchUsersAndGroups = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Users List
      const usersRes = await fetch(`${BASE_URL}/api/v1/master/users`, {
        headers: { Accept: "application/json" }
      });
      const usersData = await usersRes.json().catch(() => null);
      if (!usersRes.ok) {
        const errorDetail = typeof usersData?.detail === "string" ? usersData.detail : "Failed to pull master user records.";
        throw new Error(errorDetail);
      }
      setUsers(usersData || []);

      // 2. Fetch User Groups for Selection Dropdown
      const groupsRes = await fetch(`${BASE_URL}/api/v1/master/user-groups`, {
        headers: { Accept: "application/json" }
      });
      const groupsData = await groupsRes.json().catch(() => null);
      if (!groupsRes.ok) {
        const errorDetail = typeof groupsData?.detail === "string" ? groupsData.detail : "Failed to pull user group choices.";
        throw new Error(errorDetail);
      }
      
      // Filter active groups only for dropdown selection
      if (Array.isArray(groupsData)) {
        setAvailableGroups(groupsData.filter((g: UserGroupOption) => g.is_active === "YES"));
      }

    } catch (err: any) {
      console.error("Fetch Error:", err);
      const msg = typeof err === "string" ? err : err?.message || "An unexpected error occurred while fetching data.";
      alert(`Ledger Synchronize Error:\n${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  // POST & PATCH Form Submission Handler
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !userIdCode.trim() || !userGroupId || isMutationProcessing) return;

    const isEditMode = !!editingUser;

    // Validate password entry for new creation
    if (!isEditMode && !password) {
      alert("Validation Error:\nA valid password is required to create a new user account.");
      return;
    }

    setIsMutationProcessing(true);
    
    const targetUrl = isEditMode 
      ? `${BASE_URL}/api/v1/master/users/${editingUser.id}`
      : `${BASE_URL}/api/v1/master/users`;

    const computedPayload = isEditMode 
      ? {
          user_group: Number(userGroupId),
          user_name: userName.trim(),
          user_id: userIdCode.trim(),
          email: email.trim() || null,
          is_active: isActiveStatus,
          ...(password.trim() ? { password: password.trim() } : {}) // Include password only if updated
        }
      : {
          user_group: Number(userGroupId),
          user_name: userName.trim(),
          user_id: userIdCode.trim(),
          email: email.trim() || null,
          password: password.trim()
        };

    try {
      const response = await fetch(targetUrl, {
        method: isEditMode ? "PATCH" : "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(computedPayload)
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        let detailedMsg = `Mutation sequence rejected with status: ${response.status}`;
        
        if (typeof data.detail === "string") {
          detailedMsg = data.detail;
        } else if (Array.isArray(data.detail)) {
          detailedMsg = data.detail.map((errItem: any) => errItem.msg || JSON.stringify(errItem)).join(", ");
        } else if (data.message) {
          detailedMsg = data.message;
        }

        throw new Error(detailedMsg);
      }

      alert(`User account successfully ${isEditMode ? "updated" : "added to master ledger"}!`);
      closeModalWorkflow();
      fetchUsersAndGroups(); // Re-sync state

    } catch (err: any) {
      console.error("Save User Error:", err);
      const actualErrorString = typeof err === "string" ? err : err?.message || "An error occurred while saving the user.";
      alert(`MUTATION FAILURE:\n${actualErrorString}`);
    } finally {
      setIsMutationProcessing(false);
    }
  };

  // Open modal for editing existing records
  const openEditModal = (user: MasterUser) => {
    setEditingUser(user);
    setUserName(user.user_name);
    setUserIdCode(user.user_id);
    setUserGroupId(user.user_group);
    setEmail(user.email || "");
    setPassword(""); // Clear password field for edit view
    setIsActiveStatus(user.is_active);
    setIsModalOpen(true);
  };

  const closeModalWorkflow = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setUserName("");
    setUserIdCode("");
    setUserGroupId("");
    setEmail("");
    setPassword("");
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
    <div className="space-y-8 max-w-7xl w-full mx-auto p-4 font-sans">
      
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
              <UserCheck className="w-6 h-6 text-emerald-600" /> Master Users Registry
            </h1>
            <p className="text-xs text-emerald-800/60 mt-0.5">Shop Floor User Authentication & Access Management</p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 px-4 py-3 font-bold text-sm text-white shadow-md transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add User Account
        </button>
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* SECTOR 1: DATA DISPLAY LEDGER TRACKING TABLE */}
      {/* ------------------------------------------------------------------------- */}
      <div className="bg-white/40 backdrop-blur-md border border-white/40 rounded-2xl shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-emerald-950/60 font-semibold animate-pulse text-sm">
            Fetching Master Users Registry...
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-emerald-950/40 text-sm font-medium">
            No Master User accounts registered inside this database schema node.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-gray-900">
              <thead className="bg-emerald-900 text-emerald-100 font-semibold tracking-wider uppercase text-[10px]">
                <tr>
                  <th className="px-6 py-4">Database ID</th>
                  <th className="px-6 py-4">User Identity Code</th>
                  <th className="px-6 py-4">Full Name</th>
                  <th className="px-6 py-4">User Group</th>
                  <th className="px-6 py-4">Email Address</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Last Login Attempt</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/60 bg-white/30 font-medium">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-white/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-gray-500">#{user.id}</td>
                    <td className="px-6 py-4 font-mono font-bold text-emerald-950">{user.user_id}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">{user.user_name}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-100/70 border border-emerald-200 text-emerald-900 font-bold text-[10px] font-mono uppercase">
                        <ShieldCheck className="w-3 h-3 text-emerald-700" /> {user.group_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-600">
                      {user.email ? (
                        <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-gray-400" /> {user.email}</span>
                      ) : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border
                        ${user.is_active === "YES" 
                          ? "bg-emerald-100 border-emerald-300 text-emerald-800" 
                          : "bg-red-100 border-red-300 text-red-800"
                        }`}
                      >
                        {user.is_active === "YES" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {user.is_active === "YES" ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 font-normal">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {formatDateToken(user.last_login_attemt)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => openEditModal(user)}
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
                  {editingUser ? `Modify User Account #${editingUser.id}` : "Register New Master User"}
                </h2>
              </div>
              <button onClick={closeModalWorkflow} className="p-1 rounded-lg bg-emerald-950/50 hover:bg-emerald-950 text-white cursor-pointer transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Core Mutation Parameter Ingestion Panel */}
            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              
              {/* User Group Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Assigned User Group</label>
                <select
                  required
                  value={userGroupId}
                  onChange={(e) => setUserGroupId(Number(e.target.value))}
                  className="block w-full mt-1.5 rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-xs font-bold text-gray-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer"
                >
                  <option value="" disabled>-- Select Active User Group --</option>
                  {availableGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.group_name} (ID: #{g.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* User ID / Code */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">User ID / Employee Code</label>
                <input
                  type="text"
                  required
                  value={userIdCode}
                  onChange={(e) => setUserIdCode(e.target.value)}
                  className="block w-full mt-1.5 rounded-lg border border-gray-300 p-2.5 text-xs text-gray-900 font-mono bg-gray-50 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  placeholder="e.g., EMP1024 or OP_SMITH"
                />
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="block w-full mt-1.5 rounded-lg border border-gray-300 p-2.5 text-xs text-gray-900 bg-gray-50 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
                  placeholder="e.g., John Doe"
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Email Address (Optional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full mt-1.5 rounded-lg border border-gray-300 p-2.5 text-xs text-gray-900 font-mono bg-gray-50 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  placeholder="e.g., john.doe@company.com"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  {editingUser ? "New Password (Leave blank to keep existing)" : "Account Password"}
                </label>
                <div className="relative mt-1.5">
                  <input
                    type="password"
                    required={!editingUser}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 p-2.5 text-xs text-gray-900 bg-gray-50 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    placeholder={editingUser ? "••••••••" : "Enter initial password"}
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
                    <Lock className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>

              {/* Status configuration dropdown (Edit View overlay) */}
              {editingUser && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Active Status</label>
                  <div className="relative mt-1.5">
                    <select
                      value={isActiveStatus}
                      onChange={(e) => setIsActiveStatus(e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-xs text-gray-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none font-semibold cursor-pointer"
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

              {/* Dynamic Footer Controls */}
              <div className="flex gap-4 pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={!userName.trim() || !userIdCode.trim() || !userGroupId || isMutationProcessing}
                  className="flex-1 flex justify-center items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-600 disabled:opacity-40 disabled:pointer-events-none transition-all active:scale-95 cursor-pointer"
                >
                  <Save className="w-4 h-4" /> {isMutationProcessing ? "Transmitting Parameters..." : "Commit User Parameters"}
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