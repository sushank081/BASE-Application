"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  ClipboardList, 
  ArrowLeft, 
  Calendar, 
  Search, 
  Filter, 
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Layers,
  Loader2
} from "lucide-react";
import { BASE_URL } from "../../../../utils/utilsapi";

interface ModuleWorkOrder {
  id: number;
  wo_number: string;
  po_number: string;
  material_number: string;
  part_name: string;
  bop_id: string;
  work_station: string;
  status: string;
  schedule_time: string | null;
  job_end_time: string | null;
  created_on: string;
  updated_on: string | null;
  wo_used: number;
  line_id: number | null;
}

const ROWS_PER_PAGE = 30;

export default function ModuleWorkOrdersPage() {
  const router = useRouter();

  // Core Data & Loading States
  const [workOrders, setWorkOrders] = useState<ModuleWorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filter States
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchMaterial, setSearchMaterial] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  // 1. GET METHOD: Hydrate Tracking Table from Backend Endpoint
  const fetchWorkOrders = useCallback(async () => {
    setIsLoading(true);

    try {
      // Build dynamic URL with query parameters
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      if (searchMaterial.trim()) params.append("material_number", searchMaterial.trim());
      if (statusFilter) params.append("status", statusFilter);

      const url = `${BASE_URL}/api/v1/production/module-work-orders/?${params.toString()}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Accept": "application/json"
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || `Server returned status: ${response.status}`);
      }

      setWorkOrders(data);
    } catch (err: any) {
      console.error("Error fetching module work orders:", err);
      alert(`LEDGER RECOVERY ERROR:\n${err.message || "Failed to establish a link with database gateway."}`);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, searchMaterial, statusFilter]);

  // Fetch data on initial mount and whenever filter criteria change
  useEffect(() => {
    fetchWorkOrders();
  }, [fetchWorkOrders]);

  // Compute pagination parameters dynamically
  const totalPages = Math.ceil(workOrders.length / ROWS_PER_PAGE) || 1;

  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
    return workOrders.slice(startIndex, startIndex + ROWS_PER_PAGE);
  }, [workOrders, currentPage]);

  const handleResetFilters = () => {
    setStartDate("");
    setEndDate("");
    setSearchMaterial("");
    setStatusFilter("");
    setCurrentPage(1);
  };

  const formatDateToken = (isoString: string | null) => {
    if (!isoString) return "—";
    try {
      return new Date(isoString).toLocaleString("en-US", { hour12: false });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 font-sans text-slate-800">
      
      {/* ------------------------------------------------------------------------- */}
      {/* HEADER BAR */}
      {/* ------------------------------------------------------------------------- */}
      <div className="flex items-center justify-between border-b border-cyan-200/60 pb-5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2.5 rounded-xl bg-white/80 hover:bg-white border border-cyan-200/80 text-slate-800 transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-cyan-700" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-cyan-600" /> Module Work Orders
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5 font-sans">
              Production Planning Schedule & Work Order Status Ledger
            </p>
          </div>
        </div>

        <div className="bg-slate-900 text-white px-4 py-2 rounded-xl text-right shadow-md border border-slate-800 hidden sm:block">
          <span className="block text-[10px] uppercase font-bold tracking-widest text-cyan-400">Total Work Orders</span>
          <span className="font-mono text-sm font-semibold">{workOrders.length} Entries</span>
        </div>
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* TOP FILTER TOOLBAR */}
      {/* ------------------------------------------------------------------------- */}
      <div className="bg-white/70 backdrop-blur-md border border-cyan-200/60 p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 font-sans">
            <Filter className="w-3.5 h-3.5 text-cyan-600" /> Query Filters
          </span>
          {(startDate || endDate || searchMaterial || statusFilter) && (
            <button
              onClick={handleResetFilters}
              className="text-xs font-bold text-cyan-700 hover:text-cyan-900 flex items-center gap-1 cursor-pointer transition-all font-sans"
            >
              <RotateCcw className="w-3 h-3" /> Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Start Date Picker */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 font-sans">Start Date</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Calendar className="h-4 w-4 text-cyan-600/70" />
              </div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                className="block w-full rounded-xl border border-cyan-200/80 bg-white/90 py-2 pl-9 pr-3 text-xs text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-4 focus:ring-cyan-500/15 transition-all cursor-pointer font-mono"
              />
            </div>
          </div>

          {/* End Date Picker */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 font-sans">End Date</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Calendar className="h-4 w-4 text-cyan-600/70" />
              </div>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                className="block w-full rounded-xl border border-cyan-200/80 bg-white/90 py-2 pl-9 pr-3 text-xs text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-4 focus:ring-cyan-500/15 transition-all cursor-pointer font-mono"
              />
            </div>
          </div>

          {/* Search Material Number */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 font-sans">Search Material Number</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-cyan-600/70" />
              </div>
              <input
                type="text"
                placeholder="e.g. 3L10002938"
                value={searchMaterial}
                onChange={(e) => { setSearchMaterial(e.target.value); setCurrentPage(1); }}
                className="block w-full rounded-xl border border-cyan-200/80 bg-white/90 py-2 pl-9 pr-3 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-4 focus:ring-cyan-500/15 transition-all"
              />
            </div>
          </div>

          {/* Status Select Dropdown (Default Unselected) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 font-sans">Filter by Status</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="block w-full rounded-xl border border-cyan-200/80 bg-white/90 p-2 text-xs font-bold text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-4 focus:ring-cyan-500/15 transition-all cursor-pointer font-sans"
            >
              <option value="">-- All Statuses --</option>
              <option value="SCHEDULED" className="text-amber-700 font-bold bg-white">SCHEDULED</option>
              <option value="COMPLETED" className="text-cyan-900 font-bold bg-white">COMPLETED</option>
            </select>
          </div>

        </div>
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* DATA TABLE LEDGER */}
      {/* ------------------------------------------------------------------------- */}
      <div className="bg-white/70 backdrop-blur-md border border-cyan-200/60 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-700 font-semibold flex items-center justify-center gap-2 text-sm font-sans">
            <Loader2 className="w-5 h-5 animate-spin text-cyan-600" /> Fetching Module Work Orders...
          </div>
        ) : paginatedOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm font-medium italic font-sans">
            No Work Orders match the specified filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs text-slate-800 font-sans">
              <thead className="bg-slate-900 text-slate-100 font-semibold tracking-wider uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3.5">ID</th>
                  <th className="px-4 py-3.5">WO Number</th>
                  <th className="px-4 py-3.5">PO Number</th>
                  <th className="px-4 py-3.5">Material Number</th>
                  <th className="px-4 py-3.5">Part Name</th>
                  <th className="px-4 py-3.5">Work Station</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Schedule Time</th>
                  <th className="px-4 py-3.5">Job End Time</th>
                  <th className="px-4 py-3.5">Created On</th>
                  <th className="px-4 py-3.5">Updated On</th>
                  <th className="px-4 py-3.5 text-center">WO Used</th>
                  <th className="px-4 py-3.5 text-center">Line ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {paginatedOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-400">#{order.id}</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">{order.wo_number}</td>
                    <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">{order.po_number}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-800 whitespace-nowrap">{order.material_number}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{order.part_name}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{order.work_station}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border
                          ${
                            order.status === "COMPLETED"
                              ? "bg-cyan-100 border-cyan-300 text-cyan-900"
                              : "bg-amber-100 border-amber-300 text-amber-900"
                          }`}
                      >
                        {order.status === "COMPLETED" ? (
                          <CheckCircle2 className="w-3 h-3 text-cyan-700" />
                        ) : (
                          <Clock className="w-3 h-3 text-amber-700" />
                        )}
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] font-mono text-slate-600 whitespace-nowrap">{formatDateToken(order.schedule_time)}</td>
                    <td className="px-4 py-3 text-[11px] font-mono text-slate-600 whitespace-nowrap">{formatDateToken(order.job_end_time)}</td>
                    <td className="px-4 py-3 text-[11px] font-mono text-slate-600 whitespace-nowrap">{formatDateToken(order.created_on)}</td>
                    <td className="px-4 py-3 text-[11px] font-mono text-slate-600 whitespace-nowrap">{formatDateToken(order.updated_on)}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block w-5 h-5 leading-5 rounded-full text-[10px] font-bold font-mono ${
                          order.wo_used === 1 ? "bg-cyan-100 text-cyan-900" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {order.wo_used}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {order.line_id ? (
                        <span className="inline-flex items-center gap-1 font-bold text-xs text-slate-900">
                          <Layers className="w-3 h-3 text-cyan-600" /> Line {order.line_id}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* DYNAMIC PAGINATION CONTROLS */}
      {/* ------------------------------------------------------------------------- */}
      {!isLoading && workOrders.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/70 backdrop-blur-md border border-cyan-200/60 p-4 rounded-2xl shadow-sm font-sans">
          <div className="text-xs text-slate-600 font-medium">
            Showing <span className="font-bold text-slate-900 font-mono">{(currentPage - 1) * ROWS_PER_PAGE + 1}</span> to{" "}
            <span className="font-bold text-slate-900 font-mono">
              {Math.min(currentPage * ROWS_PER_PAGE, workOrders.length)}
            </span>{" "}
            of <span className="font-bold text-slate-900 font-mono">{workOrders.length}</span> Work Orders
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Dynamic Numbered Page Buttons */}
            {Array.from({ length: totalPages }).map((_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer font-mono ${
                    currentPage === pageNum
                      ? "bg-cyan-600 border-cyan-700 text-white shadow-sm"
                      : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}