"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Layers,
  Activity,
  Zap,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  GitFork
} from "lucide-react";
import { BASE_URL } from "../../../utils/utilsapi";

// -----------------------------------------------------------------------------
// DATA INTERFACES
// -----------------------------------------------------------------------------
interface PackLineData {
  lh_serial: string | null;
  rh_serial: string | null;
  bms_number: string | null;
  overall_status: string | null;
  created_date: string | null;
}

interface LeakTestData {
  leak_test_value: number | null;
  leak_test_status: string | null;
  leak_test_result: string | null;
  test_start_time: string | null;
  created_date: string | null;
}

interface PreEolData {
  pre_eol_status: string | null;
  category: string | null;
  remarks: string | null;
  created_date: string | null;
}

interface EolData {
  inspectiondate: string | null;
  tester_id: string | null;
  channel_id: number | null;
  // Complete Chroma Telemetry Fields
  cell_deviation: string | null;
  cell_minimum: string | null;
  temperature_diff_pdu: string | null;
  final_pack_voltage: string | null;
  final_soc: string | null;
  bms_dcdc_voltage: string | null;
  cell_maximum: string | null;
  start_soc: string | null;
  battery_pack_temperature: string | null;
  minimumdischargevoltage: string | null;
  dc_dc: string | null;
  cycle_count: string | null;
  battery_pack_temp: string | null;
  cell_voltage: string | null;
  temperature_difference: string | null;
  total_voltage: string | null;
  pdu_temp_difference: string | null;
  soc_states: string | null;
  cell_voltage_deviation: string | null;
  final_status: string | null;
  finalstatus?: string | null;
  start_time: string | null;
  end_time: string | null;
}

interface PdiData {
  pdi: string | null;
  leak_test_status: string | null;
  pre_eol_status: string | null;
  chroma_test: string | null;
  defect_name: string | null;
  pdi_remarks: string | null;
  pack_status: string | null;
  defect_source: string | null;
  rework_count: number | null;
  is_reworked: number | null;
  created_date: string | null;
}

interface PackGenealogyResponse {
  pack_serial: string;
  pack_id: number;
  pack_line: PackLineData | null;
  leak_test: LeakTestData[];
  pre_eol: PreEolData[];
  eol: EolData[];
  pdi: PdiData[];
}

export default function PackGenealogyPage() {
  const router = useRouter();

  // Search & Processing States
  const [packSerialInput, setPackSerialInput] = useState("");
  const [genealogyData, setGenealogyData] = useState<PackGenealogyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Accordion Toggle States (All CLOSED by default)
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    packLine: false,
    leakTest: false,
    preEol: false,
    eol: false,
    pdi: false,
  });

  // Toggle individual collapsible sections
  const toggleSection = (sectionKey: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  // -----------------------------------------------------------------------------
  // HELPER: ASCENDING TIME SORTING
  // -----------------------------------------------------------------------------
  const sortAscendingByDate = <T,>(list: T[], dateField: keyof T): T[] => {
    if (!list || !Array.isArray(list)) return [];
    return [...list].sort((a, b) => {
      const valA = a[dateField] ? new Date(String(a[dateField])).getTime() : 0;
      const valB = b[dateField] ? new Date(String(b[dateField])).getTime() : 0;
      return valA - valB;
    });
  };

  // Helper Date Formatter
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleString("en-US", { hour12: false });
    } catch {
      return dateStr;
    }
  };

  // -----------------------------------------------------------------------------
  // API SEARCH HANDLER
  // -----------------------------------------------------------------------------
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!packSerialInput.trim() || isLoading) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(
        `${BASE_URL}/api/v1/production/genealogy/pack/${encodeURIComponent(
          packSerialInput.trim()
        )}`
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || `Query error with status code: ${res.status}`);
      }

      setGenealogyData(data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to retrieve pack genealogy records.");
      setGenealogyData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // -----------------------------------------------------------------------------
  // RESET PAGE HANDLER
  // -----------------------------------------------------------------------------
  const handleReset = () => {
    setPackSerialInput("");
    setGenealogyData(null);
    setErrorMsg(null);
    setOpenSections({
      packLine: false,
      leakTest: false,
      preEol: false,
      eol: false,
      pdi: false,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 font-['Open_Sans',sans-serif] text-slate-800">
      
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-600">
            <GitFork className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-wider text-slate-900 uppercase">
              Battery <span className="text-cyan-600">Genealogy</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Full Station-by-Station Production History & Quality Traceability Ledger
            </p>
          </div>
        </div>
      </div>

      {/* 1. TOP CONTROL BAR: INPUT & RESET BUTTON */}
      <div className="bg-white/70 backdrop-blur-md border border-slate-200/80 p-5 rounded-2xl shadow-xl space-y-3">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-600" />
            <input
              type="text"
              required
              value={packSerialInput}
              onChange={(e) => setPackSerialInput(e.target.value)}
              placeholder="Enter Pack Serial Number"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200/80 bg-white/90 text-sm font-mono text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-4 focus:ring-cyan-500/15 transition-all uppercase"
            />
          </div>

          <button
            type="submit"
            disabled={!packSerialInput.trim() || isLoading}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs tracking-wide shadow-lg shadow-cyan-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Search className="w-4 h-4" /> {isLoading ? "Searching..." : "Search"}
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-xs tracking-wide shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" /> Reset
          </button>
        </form>
      </div>

      {/* ERROR BANNER */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2. GENEALOGY DATA RESULTS SECTION */}
      {genealogyData && (
        <div className="space-y-4">
          
          {/* PACK CONTEXT BADGE */}
          <div className="p-5 rounded-2xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4 shadow-2xl border border-slate-800">
            <div>
              <span className="text-[10px] uppercase font-black tracking-widest text-cyan-400 block">
                Target Battery Pack Asset
              </span>
              <span className="text-xl font-black font-mono tracking-wide text-white">
                {genealogyData.pack_serial}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-black tracking-widest text-cyan-400 block">
                Database ID
              </span>
              <span className="text-sm font-bold font-mono text-white">#{genealogyData.pack_id}</span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* STATION 1: PACK LINE */}
          {/* ========================================================================= */}
          <div className="bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-lg overflow-hidden">
            <button
              onClick={() => toggleSection("packLine")}
              className="w-full p-4 bg-slate-100/50 hover:bg-cyan-50/50 flex items-center justify-between transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-5 h-5 text-cyan-600" />
                <span className="font-bold text-sm text-slate-900">Pack Line Registration</span>
              </div>
              {openSections.packLine ? (
                <ChevronUp className="w-5 h-5 text-slate-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-600" />
              )}
            </button>

            {openSections.packLine && (
              <div className="p-4 border-t border-slate-200/60 overflow-x-auto">
                {genealogyData.pack_line ? (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                        <th className="p-2.5">LH Serial</th>
                        <th className="p-2.5">RH Serial</th>
                        <th className="p-2.5">BMS Number</th>
                        <th className="p-2.5">Overall Status</th>
                        <th className="p-2.5">Created Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono font-medium text-slate-800">
                      <tr>
                        <td className="p-2.5 text-slate-800">{genealogyData.pack_line.lh_serial || "—"}</td>
                        <td className="p-2.5 text-slate-800">{genealogyData.pack_line.rh_serial || "—"}</td>
                        <td className="p-2.5 text-slate-800">{genealogyData.pack_line.bms_number || "—"}</td>
                        <td className="p-2.5 font-bold">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] ${
                              genealogyData.pack_line?.overall_status === "OK" || genealogyData.pack_line?.overall_status === "PASS"
                                ? "bg-cyan-100 text-cyan-900 font-bold"
                                : "bg-rose-100 text-rose-900 font-bold"
                            }`}
                          >
                            {genealogyData.pack_line?.overall_status || "—"}
                          </span>
                        </td>
                        <td className="p-2.5 font-sans text-slate-700">
                          {formatDate(genealogyData.pack_line.created_date)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <p className="text-xs text-slate-500 p-2 italic">No Pack Line record available.</p>
                )}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* STATION 2: LEAK TEST (ASCENDING SORTED BY test_start_time / created_date) */}
          {/* ========================================================================= */}
          {(() => {
            const sortedLeakTests = sortAscendingByDate(
              genealogyData.leak_test, 
              ("test_start_time" in (genealogyData.leak_test[0] || {}) ? "test_start_time" : "created_date") as keyof LeakTestData
            );
            return (
              <div className="bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-lg overflow-hidden">
                <button
                  onClick={() => toggleSection("leakTest")}
                  className="w-full p-4 bg-slate-100/50 hover:bg-cyan-50/50 flex items-center justify-between transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Activity className="w-5 h-5 text-cyan-600" />
                    <span className="font-bold text-sm text-slate-900">
                      Leak Test Station ({sortedLeakTests.length})
                    </span>
                  </div>
                  {openSections.leakTest ? (
                    <ChevronUp className="w-5 h-5 text-slate-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-600" />
                  )}
                </button>

                {openSections.leakTest && (
                  <div className="p-4 border-t border-slate-200/60 overflow-x-auto">
                    {sortedLeakTests.length > 0 ? (
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                            <th className="p-2.5">Test Start Time</th>
                            <th className="p-2.5">Leak Test Value</th>
                            <th className="p-2.5">Leak Test Result</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono font-medium text-slate-800">
                          {sortedLeakTests.map((item, idx) => {
                            const resultStatus = item.leak_test_status || item.leak_test_result;
                            const timestamp = item.test_start_time || item.created_date;
                            return (
                              <tr key={idx} className="hover:bg-slate-50/80 text-slate-800">
                                <td className="p-2.5 font-sans text-slate-700">
                                  {formatDate(timestamp)}
                                </td>
                                <td className="p-2.5 text-slate-800">{item.leak_test_value ?? "—"}</td>
                                <td className="p-2.5 font-bold">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] ${
                                      resultStatus === "PASS" || resultStatus === "OK"
                                        ? "bg-cyan-100 text-cyan-900 font-bold"
                                        : "bg-rose-100 text-rose-900 font-bold"
                                    }`}
                                  >
                                    {resultStatus || "—"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-xs text-slate-500 p-2 italic">No Leak Test records available.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ========================================================================= */}
          {/* STATION 3: PRE EOL (ASCENDING SORTED BY created_date) */}
          {/* ========================================================================= */}
          {(() => {
            const sortedPreEol = sortAscendingByDate(genealogyData.pre_eol, "created_date");
            return (
              <div className="bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-lg overflow-hidden">
                <button
                  onClick={() => toggleSection("preEol")}
                  className="w-full p-4 bg-slate-100/50 hover:bg-cyan-50/50 flex items-center justify-between transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-cyan-600" />
                    <span className="font-bold text-sm text-slate-900">
                      Pre EOL Station ({sortedPreEol.length})
                    </span>
                  </div>
                  {openSections.preEol ? (
                    <ChevronUp className="w-5 h-5 text-slate-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-600" />
                  )}
                </button>

                {openSections.preEol && (
                  <div className="p-4 border-t border-slate-200/60 overflow-x-auto">
                    {sortedPreEol.length > 0 ? (
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                            <th className="p-2.5">Created Date</th>
                            <th className="p-2.5">Pre EOL Status</th>
                            <th className="p-2.5">Category</th>
                            <th className="p-2.5">Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono font-medium text-slate-800">
                          {sortedPreEol.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/80 text-slate-800">
                              <td className="p-2.5 font-sans text-slate-700">
                                {formatDate(item.created_date)}
                              </td>
                              <td className="p-2.5 font-bold">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] ${
                                    item.pre_eol_status === "PASS" || item.pre_eol_status === "OK"
                                      ? "bg-cyan-100 text-cyan-900 font-bold"
                                      : "bg-rose-100 text-rose-900 font-bold"
                                  }`}
                                >
                                  {item.pre_eol_status || "—"}
                                </span>
                              </td>
                              <td className="p-2.5 text-slate-800">{item.category || "—"}</td>
                              <td className="p-2.5 font-sans text-slate-700">{item.remarks || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-xs text-slate-500 p-2 italic">No Pre EOL records available.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ========================================================================= */}
          {/* STATION 4: EOL (CHROMA TEST) (ASCENDING SORTED BY start_time) */}
          {/* ========================================================================= */}
          {(() => {
            const sortedEol = sortAscendingByDate(genealogyData.eol, "start_time");
            return (
              <div className="bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-lg overflow-hidden">
                <button
                  onClick={() => toggleSection("eol")}
                  className="w-full p-4 bg-slate-100/50 hover:bg-cyan-50/50 flex items-center justify-between transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Zap className="w-5 h-5 text-cyan-600" />
                    <span className="font-bold text-sm text-slate-900">
                      EOL (Chroma Test) Station ({sortedEol.length})
                    </span>
                  </div>
                  {openSections.eol ? (
                    <ChevronUp className="w-5 h-5 text-slate-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-600" />
                  )}
                </button>

                {openSections.eol && (
                  <div className="p-4 border-t border-slate-200/60 overflow-x-auto">
                    {sortedEol.length > 0 ? (
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                            <th className="p-2.5">Start Time</th>
                            <th className="p-2.5">End Time</th>
                            <th className="p-2.5">Inspection Date</th>
                            <th className="p-2.5">Tester ID</th>
                            <th className="p-2.5">Channel ID</th>
                            <th className="p-2.5">Final Status</th>
                            <th className="p-2.5">Cell Dev</th>
                            <th className="p-2.5">Cell Min</th>
                            <th className="p-2.5">Temp Diff PDU</th>
                            <th className="p-2.5">Final Pack V</th>
                            <th className="p-2.5">Final SOC</th>
                            <th className="p-2.5">BMS DC/DC V</th>
                            <th className="p-2.5">Cell Max</th>
                            <th className="p-2.5">Start SOC</th>
                            <th className="p-2.5">Pack Temp (°C)</th>
                            <th className="p-2.5">Min Discharge V</th>
                            <th className="p-2.5">DC/DC</th>
                            <th className="p-2.5">Cycle Count</th>
                            <th className="p-2.5">Temp Diff (°C)</th>
                            <th className="p-2.5">Total Voltage (V)</th>
                            <th className="p-2.5">PDU Temp Diff (°C)</th>
                            <th className="p-2.5">SOC States (%)</th>
                            <th className="p-2.5">Cell Volt Dev</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono font-medium text-slate-800">
                          {sortedEol.map((item, idx) => {
                            const statusVal = item.final_status || item.finalstatus;
                            return (
                              <tr key={idx} className="hover:bg-slate-50/80 text-slate-800">
                                <td className="p-2.5 font-sans text-slate-700">{formatDate(item.start_time)}</td>
                                <td className="p-2.5 font-sans text-slate-700">{formatDate(item.end_time)}</td>
                                <td className="p-2.5 font-sans text-slate-700">{item.inspectiondate || "—"}</td>
                                <td className="p-2.5 text-slate-800">{item.tester_id || "—"}</td>
                                <td className="p-2.5 text-slate-800">{item.channel_id ?? "—"}</td>
                                <td className="p-2.5 font-bold">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] ${
                                      statusVal === "PASS" || statusVal === "OK"
                                        ? "bg-cyan-100 text-cyan-900 font-bold"
                                        : "bg-rose-100 text-rose-900 font-bold"
                                    }`}
                                  >
                                    {statusVal || "—"}
                                  </span>
                                </td>
                                <td className="p-2.5 text-slate-800">{item.cell_deviation ?? "—"}</td>
                                <td className="p-2.5 text-slate-800">{item.cell_minimum ?? "—"}</td>
                                <td className="p-2.5 text-slate-800">{item.temperature_diff_pdu ?? "—"}</td>
                                <td className="p-2.5 text-slate-800">{item.final_pack_voltage ?? "—"}</td>
                                <td className="p-2.5 text-slate-800">{item.final_soc ?? "—"}</td>
                                <td className="p-2.5 text-slate-800">{item.bms_dcdc_voltage ?? "—"}</td>
                                <td className="p-2.5 text-slate-800">{item.cell_maximum ?? "—"}</td>
                                <td className="p-2.5 text-slate-800">{item.start_soc ?? "—"}</td>
                                <td className="p-2.5 text-slate-800">{item.battery_pack_temp || item.battery_pack_temperature || "—"}</td>
                                <td className="p-2.5 text-slate-800">{item.minimumdischargevoltage ?? "—"}</td>
                                <td className="p-2.5 text-slate-800">{item.dc_dc ?? "—"}</td>
                                <td className="p-2.5 text-slate-800">{item.cycle_count ?? "—"}</td>
                                <td className="p-2.5 text-slate-800">{item.temperature_difference ?? "—"}</td>
                                <td className="p-2.5 text-slate-800">{item.total_voltage ?? "—"}</td>
                                <td className="p-2.5 text-slate-800">{item.pdu_temp_difference ?? "—"}</td>
                                <td className="p-2.5 text-slate-800">{item.soc_states ?? "—"}</td>
                                <td className="p-2.5 text-slate-800">{item.cell_voltage_deviation ?? "—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-xs text-slate-500 p-2 italic">No EOL Chroma records available.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ========================================================================= */}
          {/* STATION 5: PDI (ASCENDING SORTED BY created_date) */}
          {/* ========================================================================= */}
          {(() => {
            const sortedPdi = sortAscendingByDate(genealogyData.pdi, "created_date");
            return (
              <div className="bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-lg overflow-hidden">
                <button
                  onClick={() => toggleSection("pdi")}
                  className="w-full p-4 bg-slate-100/50 hover:bg-cyan-50/50 flex items-center justify-between transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-cyan-600" />
                    <span className="font-bold text-sm text-slate-900">
                      PDI Station ({sortedPdi.length})
                    </span>
                  </div>
                  {openSections.pdi ? (
                    <ChevronUp className="w-5 h-5 text-slate-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-600" />
                  )}
                </button>

                {openSections.pdi && (
                  <div className="p-4 border-t border-slate-200/60 overflow-x-auto">
                    {sortedPdi.length > 0 ? (
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                            <th className="p-2.5">PDI Result</th>
                            <th className="p-2.5">Created Date</th>
                            <th className="p-2.5">Pack Status</th>
                            <th className="p-2.5">Leak Test Status</th>
                            <th className="p-2.5">Pre EOL Status</th>
                            <th className="p-2.5">Chroma Test</th>
                            <th className="p-2.5">Defect Name</th>
                            <th className="p-2.5">Defect Source</th>
                            <th className="p-2.5">Rework Count</th>
                            <th className="p-2.5">Is Reworked</th>
                            <th className="p-2.5">PDI Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono font-medium text-slate-800">
                          {sortedPdi.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/80 text-slate-800">
                              <td className="p-2.5 font-bold text-slate-900">{item.pdi || "—"}</td>
                              <td className="p-2.5 font-sans text-slate-700">{formatDate(item.created_date)}</td>
                              <td className="p-2.5 font-bold text-slate-900">{item.pack_status || "—"}</td>
                              <td className="p-2.5 text-slate-800">{item.leak_test_status || "—"}</td>
                              <td className="p-2.5 text-slate-800">{item.pre_eol_status || "—"}</td>
                              <td className="p-2.5 text-slate-800">{item.chroma_test || "—"}</td>
                              <td className="p-2.5 text-slate-800">{item.defect_name || "—"}</td>
                              <td className="p-2.5 text-slate-800">{item.defect_source || "—"}</td>
                              <td className="p-2.5 text-slate-800">{item.rework_count ?? "—"}</td>
                              <td className="p-2.5 text-slate-800">{item.is_reworked ?? "—"}</td>
                              <td className="p-2.5 font-sans text-slate-700">{item.pdi_remarks || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-xs text-slate-500 p-2 italic">No PDI records available.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

        </div>
      )}

    </div>
  );
}