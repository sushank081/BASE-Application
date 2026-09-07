"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  Search,
  Download,
  Calendar,
  Layers,
  Cpu,
  Database,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Boxes,
  Activity,
  Gauge,
  Zap,
  ShieldCheck,
  PackageCheck
} from "lucide-react";
import { BASE_URL } from "../../../../utils/utilsapi";

interface PackSerialRecord {
  pack_id: number;
  pack_serial: string;
  bms_serial: string;
  lh_serial: string | null;
  rh_serial: string | null;
  wo_number: string | null;
  material_number: string | null;
  created_date: string;
}

interface GenealogyApiResponse {
  status: string;
  filter_metadata: {
    start_date: string;
    end_date: string;
    shift: string;
    station_name: string;
    station_status: string;
    total_shift_windows: number;
    first_window_start: string;
    last_window_end: string;
    total_records: number;
  };
  total_count: number;
  data: PackSerialRecord[];
}

export default function PackGenealogySerialsPage() {
  const router = useRouter();

  // Helper to format date as YYYY-MM-DD
  const getTodayDateString = () => new Date().toISOString().slice(0, 10);

  // Filter States
  const [startDate, setStartDate] = useState<string>(getTodayDateString());
  const [endDate, setEndDate] = useState<string>(getTodayDateString());
  const [shift, setShift] = useState<string>("ALL");
  const [stationName, setStationName] = useState<string>("");
  const [stationStatus, setStationStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Data & Loading States
  const [genealogyData, setGenealogyData] = useState<PackSerialRecord[]>([]);
  const [metaInfo, setMetaInfo] = useState<GenealogyApiResponse["filter_metadata"] | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");

  const fetchGenealogy = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const cleanBase = (BASE_URL || "").replace(/\/+$/, "");
      const params = new URLSearchParams();

      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      if (shift) params.append("shift", shift);
      if (stationName) params.append("station_name", stationName);
      if (stationStatus && stationStatus !== "ALL") params.append("station_status", stationStatus);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await fetch(
        `${cleanBase}/api/v1/production/pack-genealogy/serials?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const data: GenealogyApiResponse = await res.json();

      if (!res.ok) {
        throw new Error((data as any).detail || `HTTP ${res.status}: Failed to fetch serials`);
      }

      setGenealogyData(data.data || []);
      setMetaInfo(data.filter_metadata);
      setTotalCount(data.total_count || 0);
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.error("Failed to load serials genealogy:", err);
      setError(err.message || "Network error loading serials genealogy");
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, shift, stationName, stationStatus, searchQuery]);

  useEffect(() => {
    fetchGenealogy();
  }, [fetchGenealogy]);

  // Helper to determine the correct timestamp column header label
  const getStationTimestampLabel = () => {
    switch (stationName) {
      case "LEAK_TEST":
        return "Leak Test Start Time";
      case "PRE_EOL":
        return "Pre-EOL Test Time";
      case "EOL":
        return "EOL Chroma Test Time";
      case "PDI":
        return "PDI Inspection Time";
      default:
        return "Pack Marriage Scan Time";
    }
  };

  // -------------------------------------------------------------------------
  // EXPORT TO EXCEL / CSV
  // -------------------------------------------------------------------------
  const exportToExcel = () => {
    if (!genealogyData || genealogyData.length === 0) return;

    const rows: string[][] = [];

    // Header Metadata
    rows.push(["BATTERY PACK SERIAL GENEALOGY & TRACEABILITY REPORT"]);
    rows.push([`Generated On: ${new Date().toLocaleString()}`]);
    rows.push([`Date Range Filter: ${startDate} to ${endDate}`]);
    rows.push([`Shift Selected: ${shift}`]);
    rows.push([`Station Target: ${metaInfo?.station_name || "ALL (Pack Marriage Default)"}`]);
    rows.push([`Station Quality Filter: ${metaInfo?.station_status || "ALL"}`]);
    rows.push([`Total Shift Windows Evaluated: ${metaInfo?.total_shift_windows || 1}`]);
    rows.push([`Total Records: ${totalCount}`]);
    rows.push([]);

    // Data Columns
    rows.push([
      "Pack ID",
      "Pack Serial",
      "BMS Serial",
      "LH Module Serial",
      "RH Module Serial",
      "Work Order Number",
      "Material Number",
      getStationTimestampLabel()
    ]);

    genealogyData.forEach((row) => {
      rows.push([
        row.pack_id.toString(),
        `="${row.pack_serial}"`,
        `="${row.bms_serial}"`,
        row.lh_serial ? `="${row.lh_serial}"` : "N/A",
        row.rh_serial ? `="${row.rh_serial}"` : "N/A",
        row.wo_number ? `="${row.wo_number}"` : "N/A",
        row.material_number ? `="${row.material_number}"` : "N/A",
        new Date(row.created_date).toLocaleString()
      ]);
    });

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\r\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Pack_Genealogy_${stationName || "ALL"}_${startDate}_to_${endDate}_${shift}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 font-sans text-slate-800">
      
      {/* --------------------------------------------------------------------- */}
      {/* SOLID HEADER BAR */}
      {/* --------------------------------------------------------------------- */}
      <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-white">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700 shadow-xs">
                <Cpu className="w-3 h-3 text-cyan-400" /> Serial Traceability
              </span>
              <span className="text-xs text-slate-400 font-mono">BATMES-GW // PACK-GENEALOGY</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2 mt-1">
              <Database className="w-6 h-6 text-cyan-400" /> Battery Pack Serial Genealogy
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 self-end lg:self-center">
          <button
            onClick={exportToExcel}
            disabled={genealogyData.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-cyan-500/40 bg-cyan-900/40 hover:bg-cyan-800/60 text-xs font-bold font-mono text-cyan-200 transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export Records to Excel CSV"
          >
            <Download className="w-4 h-4 text-cyan-300" /> EXPORT EXCEL
          </button>

          <button
            onClick={() => fetchGenealogy()}
            disabled={isLoading}
            className="p-2 rounded-xl bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
            title="Refresh Serials Now"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50/90 backdrop-blur-md border border-rose-200 text-rose-900 text-xs font-mono flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>TRACEABILITY ERROR: {error}</span>
          </div>
          <button
            onClick={() => fetchGenealogy()}
            className="text-xs font-bold text-rose-700 underline cursor-pointer"
          >
            Retry Fetch
          </button>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* FILTER CONTROLS (WHITE MATTE GLASS CONTAINER) */}
      {/* --------------------------------------------------------------------- */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/60 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200/80 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-700" />
            <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-700">
              Query & Station Shift Filter Controls
            </h2>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-600">
            <span>Target: <strong className="text-slate-900">{metaInfo?.station_name || "Pack Marriage"}</strong></span>
            <span>|</span>
            <span>Total: <strong className="text-slate-900">{totalCount}</strong> records</span>
          </div>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          
          {/* 1. Start Date (Calendar) */}
          <div>
            <label className="block text-[10px] font-mono font-bold uppercase text-slate-600 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-white/90 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-semibold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-slate-400 transition-all cursor-pointer"
            />
          </div>

          {/* 2. End Date (Calendar) */}
          <div>
            <label className="block text-[10px] font-mono font-bold uppercase text-slate-600 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-white/90 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-semibold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-slate-400 transition-all cursor-pointer"
            />
          </div>

          {/* 3. Shift (Dropdown) */}
          <div>
            <label className="block text-[10px] font-mono font-bold uppercase text-slate-600 mb-1">
              Shift
            </label>
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              className="w-full bg-white/90 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-semibold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-slate-400 transition-all cursor-pointer"
            >
              <option value="ALL">ALL (07:00 AM - 07:00 AM)</option>
              <option value="A">Shift A (09:00 AM - 05:30 PM)</option>
              <option value="B">Shift B (05:30 PM - 02:00 AM)</option>
              <option value="C">Shift C (02:00 AM - 09:00 AM)</option>
            </select>
          </div>

          {/* 4. Station List (Dropdown) */}
          <div>
            <label className="block text-[10px] font-mono font-bold uppercase text-slate-600 mb-1">
              Station
            </label>
            <select
              value={stationName}
              onChange={(e) => {
                setStationName(e.target.value);
                if (!e.target.value) setStationStatus("ALL");
              }}
              className="w-full bg-white/90 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-semibold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-slate-400 transition-all cursor-pointer"
            >
              <option value="">All (Pack Marriage Default)</option>
              <option value="LEAK_TEST">Leak Test Station</option>
              <option value="PRE_EOL">Pre-EOL Station</option>
              <option value="EOL">EOL / Chroma Station</option>
              <option value="PDI">PDI Final Gate</option>
            </select>
          </div>

          {/* 5. Quality Status (Dropdown) */}
          <div>
            <label className="block text-[10px] font-mono font-bold uppercase text-slate-600 mb-1">
              Quality Status
            </label>
            <select
              value={stationStatus}
              disabled={!stationName}
              onChange={(e) => setStationStatus(e.target.value)}
              className="w-full bg-white/90 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-semibold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-slate-400 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="ALL">All Results</option>
              <option value="PASS">PASS / OK</option>
              <option value="FAIL">FAIL / NOK</option>
              <option value="WIP">WIP (Under Rework)</option>
            </select>
          </div>

          {/* 6. Global Search Input */}
          <div>
            <label className="block text-[10px] font-mono font-bold uppercase text-slate-600 mb-1">
              Search Serials
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                placeholder="Pack / BMS / LH / RH..."
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/90 border border-slate-300 rounded-xl pl-8 pr-3 py-2 text-xs font-mono text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-slate-400 transition-all"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

        </div>

        {/* Informational Filter Breadcrumb */}
        <div className="pt-2 text-[10px] font-mono text-slate-500 flex flex-wrap items-center gap-2">
          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            Timestamp Source: <strong>{getStationTimestampLabel()}</strong>
          </span>
          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            Shift Windows: <strong>{metaInfo?.total_shift_windows ?? 1} Days Evaluated</strong>
          </span>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* SERIALS DATA MATRIX TABLE (WHITE MATTE GLASS CONTAINER) */}
      {/* --------------------------------------------------------------------- */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/60 rounded-2xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-slate-700" />
            <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-700">
              Genealogy Serial Records Ledger
            </h2>
          </div>
          <span className="text-xs font-mono font-bold text-slate-700">
            Showing <span className="text-slate-950 font-black">{genealogyData.length}</span> Records
          </span>
        </div>

        {/* Scrollable Table View */}
        <div className="overflow-x-auto rounded-xl border border-slate-200/80">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 border-b border-slate-200 text-[10px] uppercase tracking-wider font-bold">
                <th className="py-3 px-3">#</th>
                <th className="py-3 px-3">Pack Serial</th>
                <th className="py-3 px-3">BMS Serial</th>
                <th className="py-3 px-3">LH Module Serial</th>
                <th className="py-3 px-3">RH Module Serial</th>
                <th className="py-3 px-3">Work Order</th>
                <th className="py-3 px-3">Material Number</th>
                <th className="py-3 px-3">{getStationTimestampLabel()}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white/60">
              {genealogyData.map((row, idx) => (
                <tr
                  key={row.pack_id}
                  className="hover:bg-white/90 transition-colors text-[11px]"
                >
                  <td className="py-2.5 px-3 font-semibold text-slate-500">
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-900 break-all select-all">
                    {row.pack_serial}
                  </td>
                  <td className="py-2.5 px-3 text-slate-800 break-all select-all">
                    {row.bms_serial}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700 break-all select-all">
                    {row.lh_serial || <span className="text-slate-400 italic">N/A</span>}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700 break-all select-all">
                    {row.rh_serial || <span className="text-slate-400 italic">N/A</span>}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">
                    {row.wo_number || "—"}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">
                    {row.material_number || "—"}
                  </td>
                  <td className="py-2.5 px-3 text-[10px] text-slate-600 whitespace-nowrap">
                    {new Date(row.created_date).toLocaleString()}
                  </td>
                </tr>
              ))}

              {genealogyData.length === 0 && !isLoading && (
                <tr>
                  <td
                    colSpan={8}
                    className="py-10 text-center text-slate-400 italic font-mono text-xs"
                  >
                    No matching battery pack serials found for the selected shift and criteria.
                  </td>
                </tr>
              )}

              {isLoading && (
                <tr>
                  <td
                    colSpan={8}
                    className="py-10 text-center text-slate-600 font-mono text-xs"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-700" />
                      <span>Querying shop floor pack serials...</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}