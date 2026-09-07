"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  ArrowLeft,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  RefreshCw,
  AlertTriangle,
  FileEdit,
  Check,
  X,
  Layers,
  Wrench
} from "lucide-react";
import { BASE_URL } from "../../../utils/utilsapi";
interface NcTicket {
  id: number;
  pack_id: number;
  pack_serial: string;
  station_id: string;
  fail_reason: string;
  remarks: string | null;
  nc_cleared: string; // "YES" or "NO"
  created_date: string;
  updated_date: string | null;
  nc_cleared_date: string | null;
}

export default function NCManagementPage() {
  const router = useRouter();

  // Dynamic API Base URL fallback supporting local host & network IP bindings
  const API_BASE = BASE_URL;

  // Primary Data & Query States
  const [tickets, setTickets] = useState<NcTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "CLEARED">("PENDING");
  const [stationFilter, setStationFilter] = useState<string>("ALL");

  // Modal / Action States
  const [selectedTicket, setSelectedTicket] = useState<NcTicket | null>(null);
  const [modalFailReason, setModalFailReason] = useState("");
  const [modalRemarks, setModalRemarks] = useState("");
  const [modalNcCleared, setModalNcCleared] = useState<"YES" | "NO">("YES");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic UI Feedback Banner State
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Fetch all NC records from backend API
  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/production/nc-management/tickets`, {
        method: "GET",
        headers: {
          Accept: "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`Server returned error code: ${response.status}`);
      }

      const data = await response.json();
      setTickets(data);
    } catch (err: any) {
      console.error("Error fetching NC tickets:", err);
      setStatusMessage({
        type: "error",
        text: `FETCH ERROR: ${err.message || "Failed to establish connection with local clearance subsystem."}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // Filtered & Searched List
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesSearch =
        ticket.pack_serial.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.station_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.fail_reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(ticket.id).includes(searchQuery);

      const matchesStatus =
        statusFilter === "ALL"
          ? true
          : statusFilter === "PENDING"
          ? ticket.nc_cleared === "NO"
          : ticket.nc_cleared === "YES";

      const matchesStation =
        stationFilter === "ALL" ? true : ticket.station_id.toUpperCase() === stationFilter.toUpperCase();

      return matchesSearch && matchesStatus && matchesStation;
    });
  }, [tickets, searchQuery, statusFilter, stationFilter]);

  // Statistics Summary Metrics
  const stats = useMemo(() => {
    const total = tickets.length;
    const pending = tickets.filter((t) => t.nc_cleared === "NO").length;
    const cleared = tickets.filter((t) => t.nc_cleared === "YES").length;
    return { total, pending, cleared };
  }, [tickets]);

  // Open modal and prepopulate fields
  const handleOpenModal = (ticket: NcTicket) => {
    setSelectedTicket(ticket);
    setModalFailReason(ticket.fail_reason || "");
    setModalRemarks(ticket.remarks || "");
    setModalNcCleared(ticket.nc_cleared === "YES" ? "YES" : "YES"); // Default to clearing
  };

  // Submit PATCH request to clear / update ticket
  const handleUpdateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || isSubmitting) return;

    setIsSubmitting(true);
    setStatusMessage(null);

    const payload = {
      fail_reason: modalFailReason.trim() || undefined,
      remarks: modalRemarks.trim() || undefined,
      nc_cleared: modalNcCleared
    };

    try {
      const response = await fetch(
        `${API_BASE}/api/v1/production/nc-management/tickets/${selectedTicket.id}/clearance`,
        {
          method: "PATCH",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || `Transaction rejected with status code: ${response.status}`);
      }

      // Display UI Success Banner
      setStatusMessage({
        type: "success",
        text: `QUALITY CLEARANCE UPDATED: NC #${data.nc_record_id} status updated to [${data.updated_nc_status}].`
      });

      setSelectedTicket(null);
      fetchTickets(); // Refresh list

      // Clear success banner after 3 seconds
      setTimeout(() => {
        setStatusMessage(null);
      }, 3000);

    } catch (err: any) {
      console.error("NC Clearance submission failed:", err);
      setStatusMessage({
        type: "error",
        text: `CLEARANCE INTERLOCK ERROR: ${err.message || "Failed to transmit clearance updates."}`
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toLocaleString([], {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 font-sans text-slate-800">
      
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cyan-200/60 pb-5">
        <div className="flex items-center gap-4">
          
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-7 h-7 text-amber-500" /> Non-Conformance Clearance
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5 font-sans">
              Quality Hold Management & Station Interlock Unlatching Console
            </p>
          </div>
        </div>

        <button
          onClick={fetchTickets}
          disabled={isLoading}
          className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs tracking-wide shadow-md shadow-cyan-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} /> Refresh Ledger
        </button>
      </div>

      {/* DYNAMIC FEEDBACK BANNER */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-start gap-3 shadow-sm transition-all animate-in slide-in-from-top-3 duration-200 ${
            statusMessage.type === "success"
              ? "bg-cyan-50 border-cyan-200 text-cyan-900"
              : statusMessage.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-900"
              : "bg-sky-50 border-sky-200 text-sky-900"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5 animate-bounce" />
          ) : statusMessage.type === "error" ? (
            <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
          )}
          <span className="leading-relaxed font-mono">{statusMessage.text}</span>
        </div>
      )}

      {/* METRIC SUMMARY STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/70 backdrop-blur-md border border-cyan-200/60 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total NC</span>
            <span className="text-2xl font-extrabold text-slate-900 mt-1 block font-mono">{stats.total}</span>
          </div>
          <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-xl text-cyan-600">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-md border border-cyan-200/60 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block">Pending NC</span>
            <span className="text-2xl font-extrabold text-amber-600 mt-1 block font-mono">{stats.pending}</span>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-600">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-md border border-cyan-200/60 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-cyan-800 uppercase tracking-wider block">Cleared NC</span>
            <span className="text-2xl font-extrabold text-cyan-700 mt-1 block font-mono">{stats.cleared}</span>
          </div>
          <div className="p-3 bg-cyan-100 border border-cyan-300 rounded-xl text-cyan-700">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* FILTERS & SEARCH CONTROLS */}
      <div className="bg-white/70 backdrop-blur-md border border-cyan-200/60 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-600/70" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Serial, Station, Ticket ID or Reason..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-cyan-200/80 bg-white/90 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-4 focus:ring-cyan-500/15 transition-all"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-cyan-200/80 shadow-xs">
            <Filter className="w-3.5 h-3.5 text-cyan-600" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-white">All Statuses</option>
              <option value="PENDING" className="bg-white text-amber-700">Pending (HOLD)</option>
              <option value="CLEARED" className="bg-white text-cyan-900">Cleared (YES)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-cyan-200/80 shadow-xs">
            <Wrench className="w-3.5 h-3.5 text-cyan-600" />
            <select
              value={stationFilter}
              onChange={(e) => setStationFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-white">All Stations</option>
              <option value="LEAK" className="bg-white">LEAK Test</option>
              <option value="PREEOL" className="bg-white">Pre-EOL</option>
              <option value="EOL" className="bg-white">Chroma EOL</option>
              <option value="PDI" className="bg-white">PDI Gate</option>
            </select>
          </div>
        </div>
      </div>

      {/* TICKETS TABLE */}
      <div className="bg-white/70 backdrop-blur-md border border-cyan-200/60 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-slate-800">
            <thead>
              <tr className="bg-slate-900 text-slate-100 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4 w-24">Ticket ID</th>
                <th className="py-3.5 px-4 min-w-[380px]">Pack Serial Number</th>
                <th className="py-3.5 px-4">Station</th>
                <th className="py-3.5 px-4">Defect Reason</th>
                <th className="py-3.5 px-4">Interlock Status</th>
                <th className="py-3.5 px-4">Logged At</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-semibold">
                    Loading quality clearance records...
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-semibold italic">
                    No matching non-conformance records found.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => {
                  const isCleared = ticket.nc_cleared === "YES";
                  return (
                    <tr
                      key={ticket.id}
                      className="hover:bg-slate-50/80 transition-all border-b border-slate-100"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-400">
                        #{ticket.id}
                      </td>

                      {/* FULL BARCODE VISIBILITY IN TABLE CELL */}
                      <td className="py-3.5 px-4 min-w-[380px] max-w-[500px]">
                        <span 
                          className="font-mono text-xs font-bold text-slate-900 break-all leading-relaxed block whitespace-pre-wrap select-all"
                          title={ticket.pack_serial}
                        >
                          {ticket.pack_serial}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-md bg-cyan-50 border border-cyan-200 text-cyan-900 font-bold text-[10px] font-mono">
                          {ticket.station_id}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-800 max-w-xs">
                        <span className="font-semibold block truncate text-slate-900">{ticket.fail_reason}</span>
                        {ticket.remarks && (
                          <span className="text-[10px] text-slate-500 block truncate mt-0.5">{ticket.remarks}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {isCleared ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-100 text-cyan-900 text-[10px] font-bold border border-cyan-300">
                            <CheckCircle2 className="w-3 h-3 text-cyan-700" /> CLEARED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-300">
                            <Clock className="w-3 h-3 text-amber-700 animate-spin" /> ON HOLD
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 text-[11px] font-mono">
                        {formatDate(ticket.created_date)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenModal(ticket)}
                          className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs ${
                            isCleared
                              ? "bg-white hover:bg-slate-50 text-slate-700 border border-slate-300"
                              : "bg-amber-600 hover:bg-amber-500 text-white"
                          }`}
                        >
                          <FileEdit className="w-3.5 h-3.5" />
                          {isCleared ? "Edit NC" : "Clear NC"}
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

      {/* ACTION / CLEARANCE MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-cyan-200/80 shadow-2xl max-w-lg w-full overflow-hidden text-slate-900">
            
            {/* Modal Header */}
            <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Quality Clearance — Ticket #{selectedTicket.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleUpdateTicket} className="p-6 space-y-4">
              
              {/* ASSET SNAPSHOT CARD WITH FULL BARCODE VISIBILITY */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-sans">
                    Battery Pack Serial Number:
                  </span>
                  <div className="bg-white border border-slate-200 p-2.5 rounded-lg text-slate-900 font-mono text-xs font-bold break-all whitespace-pre-wrap leading-relaxed select-all">
                    {selectedTicket.pack_serial}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1 border-t border-slate-200 text-xs font-mono">
                  <span className="text-slate-500 font-sans">Target Station:</span>
                  <span className="font-bold text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                    {selectedTicket.station_id}
                  </span>
                </div>
              </div>

              {/* Defect Reason Field */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Defect Reason / Failure Context</label>
                <input
                  type="text"
                  required
                  value={modalFailReason}
                  onChange={(e) => setModalFailReason(e.target.value)}
                  className="mt-1.5 block w-full rounded-xl border border-cyan-200/80 bg-white p-2.5 text-xs text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-4 focus:ring-cyan-500/15"
                />
              </div>

              {/* Remarks Field */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Rework / Clearance Remarks</label>
                <textarea
                  rows={3}
                  placeholder="Enter details of rework performed or justification for unlatching..."
                  value={modalRemarks}
                  onChange={(e) => setModalRemarks(e.target.value)}
                  className="mt-1.5 block w-full rounded-xl border border-cyan-200/80 bg-white p-2.5 text-xs text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-4 focus:ring-cyan-500/15"
                />
              </div>

              {/* Clearance Status Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Set Non-Conformance State</label>
                <select
                  value={modalNcCleared}
                  onChange={(e) => setModalNcCleared(e.target.value as "YES" | "NO")}
                  className="mt-1.5 block w-full rounded-xl border border-cyan-200/80 bg-white p-2.5 text-xs font-bold text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-4 focus:ring-cyan-500/15 cursor-pointer"
                >
                  <option value="YES">YES — Clear Ticket & Unlatch Station (REWORKED)</option>
                  <option value="NO">NO — Maintain Quality HOLD Lock</option>
                </select>
              </div>

              {/* Actions */}
              <div className="pt-4 flex gap-3 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md shadow-cyan-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {isSubmitting ? "Processing Unlatch..." : "Confirm & Save Changes"}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  disabled={isSubmitting}
                  className="py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 cursor-pointer transition-colors"
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