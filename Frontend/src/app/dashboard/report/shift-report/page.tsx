"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Calendar, RefreshCw, Filter, Layers, AlertCircle } from "lucide-react";
import { BASE_URL } from "../../../../utils/utilsapi";

// =============================================================================
// INLINE TYPES & INTERFACES (Eliminates @/types/shiftReport build dependency)
// =============================================================================
export interface ShiftMaterialReportRow {
  shift_name: string;
  shift_interval: string;
  [key: string]: string | number; // Handles dynamic material keys like BB000000002862_BAK, etc.
  Grand_Total_BAK: number;
  Grand_Total_LG: number;
  Grand_Total_All: number;
}

export interface ShiftMaterialReportResponse {
  status: string;
  report_type?: string;
  report_date?: string;
  data: ShiftMaterialReportRow[];
}

const MATERIAL_IDS = [
  "BB000000002862",
  "BB000000002500",
  "BB000000004656",
  "BB000000004655",
  "BB000000004657",
  "BB000000005500",
  "BBM00000000001",
  "SS000000001570",
  "SS000000001584",
  "BB000000005230",
  "BB000000005233",
  "BB000000005359",
  "BB000000004675",
];

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || `${BASE_URL}/api/v1`;

export default function ShiftMaterialReportTable() {
  const [selectedDate, setSelectedDate] = useState<string>("");

  const [reportData, setReportData] = useState<ShiftMaterialReportRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilterMode, setActiveFilterMode] = useState<"current_day" | "custom_day">("current_day");

  useEffect(() => {
    fetchCurrentDayReport();
  }, []);

  const fetchCurrentDayReport = async () => {
    setLoading(true);
    setError(null);
    setActiveFilterMode("current_day");

    try {
      const response = await fetch(`${API_BASE_URL}/shift-material-report/current-day`);
      if (!response.ok) {
        throw new Error(`Failed to fetch current day data (Status: ${response.status})`);
      }
      const json: ShiftMaterialReportResponse = await response.json();
      setReportData(json.data || []);
    } catch (err: any) {
      setError(err.message || "An error occurred while fetching the shift report.");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilter = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDate) {
      setError("Please select a date to filter the shift report.");
      return;
    }

    setLoading(true);
    setError(null);
    setActiveFilterMode("custom_day");

    try {
      const response = await fetch(
        `${API_BASE_URL}/shift-material-report/custom-day?report_date=${selectedDate}`
      );

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.detail || `Failed to fetch shift data (Status: ${response.status})`);
      }

      const json: ShiftMaterialReportResponse = await response.json();
      setReportData(json.data || []);
    } catch (err: any) {
      setError(err.message || "An error occurred while filtering by custom date.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilter = () => {
    setSelectedDate("");
    fetchCurrentDayReport();
  };

  // Calculate vertical column totals dynamically across shifts
  const columnTotals = useMemo(() => {
    const totals: Record<string, number> = {};

    MATERIAL_IDS.forEach((matId) => {
      totals[`${matId}_BAK`] = 0;
      totals[`${matId}_LG`] = 0;
      totals[`${matId}_TOTAL`] = 0;
    });

    totals["Grand_Total_BAK"] = 0;
    totals["Grand_Total_LG"] = 0;
    totals["Grand_Total_All"] = 0;

    reportData.forEach((row: any) => {
      MATERIAL_IDS.forEach((matId) => {
        totals[`${matId}_BAK`] += Number(row[`${matId}_BAK`]) || 0;
        totals[`${matId}_LG`] += Number(row[`${matId}_LG`]) || 0;
        totals[`${matId}_TOTAL`] += Number(row[`${matId}_TOTAL`]) || 0;
      });

      totals["Grand_Total_BAK"] += Number(row["Grand_Total_BAK"]) || 0;
      totals["Grand_Total_LG"] += Number(row["Grand_Total_LG"]) || 0;
      totals["Grand_Total_All"] += Number(row["Grand_Total_All"]) || 0;
    });

    return totals;
  }, [reportData]);

  return (
    <div className="w-full text-slate-800 font-sans p-4 max-w-[1920px] mx-auto">
      {/* PAGE HEADER */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl shadow-xs text-blue-600">
            <Layers className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Shift PDI Material Matrix Report
            </h1>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              Cell Chemistry (BAK / LG) Production Output Breakdown by Shift (A / B / C)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold px-3.5 py-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/80 shadow-2xs">
            Mode: {activeFilterMode === "current_day" ? "Today's Shifts (Default)" : `Date: ${selectedDate}`}
          </span>
          <button
            onClick={fetchCurrentDayReport}
            className="p-2 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 shadow-2xs transition flex items-center justify-center cursor-pointer"
            title="Refresh Report Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : "text-slate-600"}`} />
          </button>
        </div>
      </div>

      {/* FILTER BAR PANEL */}
      <form
        onSubmit={handleApplyFilter}
        className="mb-6 p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-end gap-5"
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-600" /> Select Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-50/70 border border-slate-300 text-slate-900 text-xs font-medium rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-xs transition flex items-center gap-2 cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5" /> Apply Filter
          </button>

          {(selectedDate || activeFilterMode === "custom_day") && (
            <button
              type="button"
              onClick={handleResetFilter}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition cursor-pointer"
            >
              Reset to Today
            </button>
          )}
        </div>
      </form>

      {/* ERROR ALERT */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium flex items-center gap-2.5 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* MATRIX TABLE CONTAINER */}
      <div className="relative overflow-x-auto rounded-2xl border border-slate-300 bg-white shadow-md max-h-[82vh]">
        <table className="w-full text-xs text-left border-collapse font-['Open_Sans',sans-serif]">
          {/* HEADER LAYER 1: MATERIAL GROUPS */}
          <thead className="bg-slate-100/90 text-slate-800 sticky top-0 z-20 border-b-2 border-slate-300 backdrop-blur-xs">
            <tr>
              <th
                rowSpan={2}
                className="p-3.5 border-r border-b-2 border-slate-300 bg-slate-100 sticky left-0 z-30 font-bold min-w-[90px] text-slate-900 text-center tracking-wide"
              >
                Shift
              </th>

              <th
                rowSpan={2}
                className="p-3.5 border-r-2 border-b-2 border-slate-300 bg-slate-100 sticky left-[90px] z-30 font-bold min-w-[150px] text-slate-900 text-center tracking-wide"
              >
                Shift Interval
              </th>

              {MATERIAL_IDS.map((matId) => (
                <th
                  key={matId}
                  colSpan={3}
                  className="p-3 text-center border-r-2 border-b-2 border-slate-300 font-bold text-slate-900 bg-slate-200/60 text-xs tracking-tight"
                >
                  {matId}
                </th>
              ))}

              <th
                colSpan={3}
                className="p-3 text-center border-b-2 border-blue-900 font-bold text-blue-100 bg-blue-950 text-xs tracking-wider"
              >
                SHIFT OVERALL TOTALS
              </th>
            </tr>

            {/* HEADER LAYER 2: CELL CHEMISTRY SUB-HEADINGS */}
            <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-300 text-[11px]">
              {MATERIAL_IDS.map((matId) => (
                <React.Fragment key={`${matId}-subheaders`}>
                  <th className="p-2 text-center border-r border-slate-300 min-w-[65px]">BAK</th>
                  <th className="p-2 text-center border-r border-slate-300 min-w-[65px]">LG</th>
                  <th className="p-2 text-center border-r-2 border-blue-900 min-w-[80px] bg-blue-950 text-blue-100 font-bold">
                    Total
                  </th>
                </React.Fragment>
              ))}

              <th className="p-2 text-center border-r border-slate-300 min-w-[85px] text-slate-800 font-semibold">BAK Total</th>
              <th className="p-2 text-center border-r border-slate-300 min-w-[85px] text-slate-800 font-semibold">LG Total</th>
              <th className="p-2 text-center border-slate-300 min-w-[95px] bg-blue-950 text-blue-100 font-bold">
                Grand Total
              </th>
            </tr>
          </thead>

          {/* TABLE BODY */}
          <tbody className="divide-y divide-slate-200 tabular-nums text-[13px]">
            {loading ? (
              // SKELETON LOADING STATE
              Array.from({ length: 3 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="p-3.5 bg-slate-50 sticky left-0 border-r border-slate-300">
                    <div className="h-3.5 bg-slate-200 rounded w-10 mx-auto"></div>
                  </td>
                  <td className="p-3.5 bg-slate-50 sticky left-[90px] border-r-2 border-slate-300">
                    <div className="h-3.5 bg-slate-200 rounded w-28 mx-auto"></div>
                  </td>
                  {Array.from({ length: MATERIAL_IDS.length * 3 + 3 }).map((_, cIdx) => (
                    <td key={cIdx} className="p-3 text-center border-r border-slate-200">
                      <div className="h-3.5 bg-slate-200/70 rounded w-7 mx-auto"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : reportData.length === 0 ? (
              <tr>
                <td
                  colSpan={MATERIAL_IDS.length * 3 + 5}
                  className="p-16 text-center text-slate-400 italic text-sm"
                >
                  No shift records found for the selected date.
                </td>
              </tr>
            ) : (
              reportData.map((row) => (
                <tr key={row.shift_name} className="hover:bg-slate-50/80 transition-colors">
                  {/* SHIFT NAME */}
                  <td className="p-3 border-r border-slate-300 font-extrabold text-slate-900 bg-slate-100 sticky left-0 z-10 shadow-xs text-center text-sm">
                    Shift {row.shift_name}
                  </td>

                  {/* SHIFT INTERVAL */}
                  <td className="p-3 border-r-2 border-slate-300 font-bold text-slate-700 bg-white sticky left-[90px] z-10 shadow-xs text-center text-xs">
                    {row.shift_interval}
                  </td>

                  {/* DYNAMIC MATERIAL COLUMNS */}
                  {MATERIAL_IDS.map((matId) => {
                    const bakCount = (row as any)[`${matId}_BAK`] || 0;
                    const lgCount = (row as any)[`${matId}_LG`] || 0;
                    const totalCount = (row as any)[`${matId}_TOTAL`] || 0;

                    return (
                      <React.Fragment key={`${row.shift_name}-${matId}`}>
                        <td className="p-2.5 text-center border-r border-slate-200 text-slate-900 font-semibold tracking-wider">
                          {bakCount}
                        </td>
                        <td className="p-2.5 text-center border-r border-slate-200 text-slate-900 font-semibold tracking-wider">
                          {lgCount}
                        </td>
                        {/* TOTAL COLUMN: Solid Dark Blue Background with Crisp White Count */}
                        <td className="p-2.5 text-center border-r-2 border-blue-950 bg-blue-900 text-white font-bold tracking-wider">
                          {totalCount}
                        </td>
                      </React.Fragment>
                    );
                  })}

                  {/* SHIFT OVERALL TOTALS */}
                  <td className="p-2.5 text-center border-r border-slate-200 text-slate-900 font-bold bg-slate-50/40 tracking-wider">
                    {row.Grand_Total_BAK}
                  </td>
                  <td className="p-2.5 text-center border-r border-slate-200 text-slate-900 font-bold bg-slate-50/40 tracking-wider">
                    {row.Grand_Total_LG}
                  </td>
                  {/* GRAND TOTAL COLUMN */}
                  <td className="p-2.5 text-center bg-blue-900 text-white font-extrabold tracking-wider">
                    {row.Grand_Total_All}
                  </td>
                </tr>
              ))
            )}
          </tbody>

          {/* TABLE FOOTER: VERTICAL COLUMN SUMS */}
          {!loading && reportData.length > 0 && (
            <tfoot className="bg-slate-100 border-t-2 border-slate-300 tabular-nums text-[13px] sticky bottom-0 z-20 shadow-lg">
              <tr>
                <td
                  colSpan={2}
                  className="p-3.5 text-center border-r-2 border-slate-300 bg-slate-200 sticky left-0 z-30 font-bold text-slate-900 text-xs tracking-wider"
                >
                  TOTAL COUNT
                </td>

                {/* SUMMED MATERIAL COLUMNS */}
                {MATERIAL_IDS.map((matId) => (
                  <React.Fragment key={`total-${matId}`}>
                    <td className="p-2.5 text-center border-r border-slate-300 text-slate-900 font-bold bg-slate-100 tracking-wider">
                      {columnTotals[`${matId}_BAK`]}
                    </td>
                    <td className="p-2.5 text-center border-r border-slate-300 text-slate-900 font-bold bg-slate-100 tracking-wider">
                      {columnTotals[`${matId}_LG`]}
                    </td>
                    {/* Highlighted Sum Total with Solid Dark Blue Background */}
                    <td className="p-2.5 text-center border-r-2 border-blue-950 bg-blue-950 text-white font-extrabold tracking-wider">
                      {columnTotals[`${matId}_TOTAL`]}
                    </td>
                  </React.Fragment>
                ))}

                {/* GRAND TOTAL SUMS */}
                <td className="p-2.5 text-center border-r border-slate-300 text-slate-900 font-extrabold bg-slate-200/70 tracking-wider">
                  {columnTotals["Grand_Total_BAK"]}
                </td>
                <td className="p-2.5 text-center border-r border-slate-300 text-slate-900 font-extrabold bg-slate-200/70 tracking-wider">
                  {columnTotals["Grand_Total_LG"]}
                </td>
                <td className="p-2.5 text-center bg-blue-950 text-white font-black text-sm tracking-wider">
                  {columnTotals["Grand_Total_All"]}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}