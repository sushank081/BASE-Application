"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  CheckSquare, 
  ArrowLeft, 
  QrCode, 
  Calendar,
  RotateCcw,
  Send,
  ClipboardList,
  Search,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from "lucide-react";
import { BASE_URL } from "../../../../utils/utilsapi";

// Full Telemetry Data Interface aligned strictly with all cellmes_app_eol fields
interface TelemetryData {
  lh_serial: string;
  rh_serial: string;
  bms_number: string;
  leak_test_value: number | null;
  pre_eol_status: string;
  inspectiondate: string | null;
  start_time: string | null;
  end_time: string | null;
  tester_id: string | null;
  channel_id: number | null;
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
}

// Master List Option Interfaces
interface DefectOption {
  id: number;
  defect_name: string;
  is_active: string;
}

interface DefectSourceOption {
  id: number;
  defect_name: string;
  is_active: string;
}

interface BatteryStatusOption {
  id: number;
  status_name: string;
  is_active: string;
}

export default function PDIPage() {
  const router = useRouter();

  // Helper function to extract current system date formatted as YYYY-MM-DD
  const getCurrentDateString = () => new Date().toISOString().split("T")[0];

  // Primary Forms & Selections State
  const [packSerial, setPackSerial] = useState("");
  const [inspectionDate, setInspectionDate] = useState(getCurrentDateString());
  const [pdiStatus, setPdiStatus] = useState("OK");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [historicalTelemetry, setHistoricalTelemetry] = useState<TelemetryData | null>(null);

  // Dynamic Master Dropdown Data States
  const [masterDefects, setMasterDefects] = useState<DefectOption[]>([]);
  const [masterDefectSources, setMasterDefectSources] = useState<DefectSourceOption[]>([]);
  const [masterBatteryStatuses, setMasterBatteryStatuses] = useState<BatteryStatusOption[]>([]);
  const [isLoadingMasterData, setIsLoadingMasterData] = useState(false);

  // Hidden NOK Quality Section Specific States
  const [defectName, setDefectName] = useState("");
  const [defectActualValue, setDefectActualValue] = useState("");
  const [packStatusOption, setPackStatusOption] = useState("");
  const [defectSourceOption, setDefectSourceOption] = useState("");
  const [nokRemarks, setNokRemarks] = useState("");

  // UI Inline Status Banner State
  const [statusBanner, setStatusBanner] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Fetch dynamic master lists whenever PDI status is switched to "NOK"
  useEffect(() => {
    if (pdiStatus === "NOK") {
      fetchMasterDropdownData();
    }
  }, [pdiStatus]);

  // Dynamic Fetcher for Defect, Defect Source, and Battery Status Masters
  const fetchMasterDropdownData = async () => {
    setIsLoadingMasterData(true);
    try {
      // 1. Fetch Defect List
      const defectRes = await fetch(`${BASE_URL}/api/v1/master/defects`, {
        headers: { Accept: "application/json" }
      });
      if (defectRes.ok) {
        const defectData: DefectOption[] = await defectRes.json();
        setMasterDefects(defectData.filter(item => item.is_active === "ACTIVE" || item.is_active === "YES"));
      }

      // 2. Fetch Defect Source List
      const sourceRes = await fetch(`${BASE_URL}/api/v1/master/defect-sources`, {
        headers: { Accept: "application/json" }
      });
      if (sourceRes.ok) {
        const sourceData: DefectSourceOption[] = await sourceRes.json();
        setMasterDefectSources(sourceData.filter(item => item.is_active === "ACTIVE" || item.is_active === "YES"));
      }

      // 3. Fetch Battery Status List
      const statusRes = await fetch(`${BASE_URL}/api/v1/master/battery-statuses`, {
        headers: { Accept: "application/json" }
      });
      if (statusRes.ok) {
        const statusData: BatteryStatusOption[] = await statusRes.json();
        setMasterBatteryStatuses(statusData.filter(item => item.is_active === "ACTIVE" || item.is_active === "YES"));
      }

    } catch (err) {
      console.error("Failed to load master dropdown options:", err);
    } finally {
      setIsLoadingMasterData(false);
    }
  };

  // Helper formatting logic for raw ISO or comma-separated timestamps
  const formatTimeToken = (isoString: string | null) => {
    if (!isoString) return "—";
    try {
      const cleanStr = isoString.replace(",", "T");
      const dateObj = new Date(cleanStr);
      return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    } catch {
      return isoString;
    }
  };

  // Clean raw Enum strings like "FinalResultEnum.PASS" to "PASS"
  const cleanEnumValue = (val: any) => {
    if (!val) return "—";
    return String(val).replace(/^.*Enum\./, "");
  };

  // Run validation queries against upstream ledgers
  const handleFetchPackHistory = async () => {
    if (!packSerial.trim() || isFetchingHistory) return;

    setIsFetchingHistory(true);
    setHistoricalTelemetry(null);
    setStatusBanner(null);

    try {
      const response = await fetch(`${BASE_URL}/api/v1/production/pack-review/summary/${encodeURIComponent(packSerial.trim())}`, {
        method: "GET",
        headers: {
          "Accept": "application/json"
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || `Summary ledger returned error code: ${response.status}`);
      }

      setHistoricalTelemetry(data);
      setStatusBanner({
        type: "info",
        text: `Traceability Link Established: Historical telemetry retrieved for Pack Serial [${packSerial.trim()}].`
      });

    } catch (err: any) {
      console.error("Historical verification search trace error:", err);
      setStatusBanner({
        type: "error",
        text: `TRACEABILITY SEARCH REJECTION: ${err.message || "Failed to establish link with local history query subsystem."}`
      });
    } finally {
      setIsFetchingHistory(false);
    }
  };

  // Complete Render mapping for ALL telemetry keys into matrix grid
  const telemetryItems = [
    // Traceability Core & Timestamps
    { label: "LH Module", value: historicalTelemetry?.lh_serial },
    { label: "RH Module", value: historicalTelemetry?.rh_serial },
    { label: "BMS Number", value: historicalTelemetry?.bms_number },
    { 
      label: "Leak Test Value", 
      value: historicalTelemetry?.leak_test_value !== null && historicalTelemetry?.leak_test_value !== undefined 
        ? `${historicalTelemetry.leak_test_value} mbar/s` 
        : null 
    },
    { label: "Pre-EOL Status", value: cleanEnumValue(historicalTelemetry?.pre_eol_status) },
    { label: "Start Time", value: formatTimeToken(historicalTelemetry?.start_time) },
    { label: "End Time", value: formatTimeToken(historicalTelemetry?.end_time) },
    { label: "Tester ID", value: historicalTelemetry?.tester_id },
    { label: "Channel ID", value: historicalTelemetry?.channel_id },
    
    // Cell Voltages & Deviations
    { label: "Cell Min", value: historicalTelemetry?.cell_minimum ? `${historicalTelemetry.cell_minimum} V` : null },
    { label: "Cell Max", value: historicalTelemetry?.cell_maximum ? `${historicalTelemetry.cell_maximum} V` : null },
    { label: "Cell Deviation", value: historicalTelemetry?.cell_deviation },
    { label: "Cell Volt Dev", value: historicalTelemetry?.cell_voltage_deviation },
    { label: "Cell Voltage", value: historicalTelemetry?.cell_voltage ? `${historicalTelemetry.cell_voltage} V` : null },
    
    // Pack Voltages
    { label: "Final Pack Volt", value: historicalTelemetry?.final_pack_voltage ? `${historicalTelemetry.final_pack_voltage} V` : null },
    { label: "Total Voltage", value: historicalTelemetry?.total_voltage ? `${historicalTelemetry.total_voltage} V` : null },
    { label: "Min Discharge Volt", value: historicalTelemetry?.minimumdischargevoltage ? `${historicalTelemetry.minimumdischargevoltage} V` : null },
    { label: "BMS DC-DC Volt", value: historicalTelemetry?.bms_dcdc_voltage ? `${historicalTelemetry.bms_dcdc_voltage} V` : null },
    { label: "DC-DC", value: historicalTelemetry?.dc_dc },

    // State of Charge & Cycles
    { label: "Start SOC", value: historicalTelemetry?.start_soc ? `${historicalTelemetry.start_soc} %` : null },
    { label: "Final SOC", value: historicalTelemetry?.final_soc ? `${historicalTelemetry.final_soc} %` : null },
    { label: "SOC States", value: historicalTelemetry?.soc_states },
    { label: "Cycle Count", value: historicalTelemetry?.cycle_count },

    // Thermal Metrics
    { label: "Pack Temp", value: historicalTelemetry?.battery_pack_temperature ? `${historicalTelemetry.battery_pack_temperature} °C` : null },
    { label: "Battery Pack Temp", value: historicalTelemetry?.battery_pack_temp ? `${historicalTelemetry.battery_pack_temp} °C` : null },
    { label: "Temp Diff PDU", value: historicalTelemetry?.temperature_diff_pdu ? `${historicalTelemetry.temperature_diff_pdu} °C` : null },
    { label: "Temp Difference", value: historicalTelemetry?.temperature_difference ? `${historicalTelemetry.temperature_difference} °C` : null },
    { label: "PDU Temp Diff", value: historicalTelemetry?.pdu_temp_difference ? `${historicalTelemetry.pdu_temp_difference} °C` : null },

    // Final Gate Result
    { label: "Final Status", value: cleanEnumValue(historicalTelemetry?.final_status) }
  ];

  // Dispatch payloads directly to local transaction gateway router
  const handleSubmitPDI = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusBanner(null);
    
    if (!packSerial.trim() || !inspectionDate || !pdiStatus || isProcessing) return;
    if (pdiStatus === "NOK" && (!defectName || !defectActualValue || !packStatusOption || !defectSourceOption)) {
      setStatusBanner({
        type: "error",
        text: "Quality Control Interlock: Please populate all required non-conformance parameters within the active NOK section."
      });
      return;
    }

    setIsProcessing(true);

    const computedPayload = {
      pack_serial: packSerial.trim(),
      pdi_status: pdiStatus, 
      defect_name: pdiStatus === "NOK" ? defectName : "NONE",
      pdi_remarks: pdiStatus === "NOK" ? nokRemarks.trim() : `Nominal gate log saved on context time: ${inspectionDate}`,
      pack_status: pdiStatus === "NOK" ? packStatusOption : "GOOD",
      defect_source: pdiStatus === "NOK" ? defectSourceOption : "NONE",
      rework_count: 0
    };

    try {
      const response = await fetch(`${BASE_URL}/api/v1/production/pdi/process-result`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(computedPayload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || `PDI transaction engine rejected payload layout with status: ${response.status}`);
      }

      // Display UI Success Message Banner
      setStatusBanner({
        type: "success",
        text: `PDI Inspection Form Saved Successfully! Disposition Verdict: [${data.status || pdiStatus}] | Record ID: #${data.pdi_record_id}`
      });

      // Clear layout fields after 3 seconds
      setTimeout(() => {
        handleResetStation();
        setStatusBanner(null);
      }, 3000);

    } catch (err: any) {
      console.error("PDI transaction execution lock aborted:", err);
      setStatusBanner({
        type: "error",
        text: `SHOP FLOOR INTERLOCK ERROR: ${err.message || "Failed to communicate updates to database servers."}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetStation = () => {
    setPackSerial("");
    setInspectionDate(getCurrentDateString());
    setPdiStatus("OK");
    setHistoricalTelemetry(null);
    setDefectName("");
    setDefectActualValue("");
    setPackStatusOption("");
    setDefectSourceOption("");
    setNokRemarks("");
  };

  return (
    <div className="space-y-8 max-w-7xl w-full mx-auto font-sans text-slate-800 p-4 sm:p-6 lg:p-8">
      
      {/* Navigation Header Bar */}
      <div className="flex items-center justify-between border-b border-cyan-200/60 pb-5">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push("/dashboard/production")}
            className="p-2.5 rounded-xl bg-white/80 hover:bg-white border border-cyan-200/80 text-slate-800 transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-cyan-700" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <CheckSquare className="w-6 h-6 text-cyan-600" /> PDI Terminal
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Pre-Delivery Quality Inspection & End-of-Line Gate Release</p>
          </div>
        </div>
      </div>

      {/* DYNAMIC UI FEEDBACK SUCCESS / ERROR BANNER */}
      {statusBanner && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-start gap-3 shadow-sm transition-all animate-in slide-in-from-top-3 duration-200 ${
            statusBanner.type === "success"
              ? "bg-cyan-50 border-cyan-200 text-cyan-950"
              : statusBanner.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-950"
              : "bg-sky-50 border-sky-200 text-sky-950"
          }`}
        >
          {statusBanner.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5 animate-bounce" />
          ) : statusBanner.type === "error" ? (
            <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
          )}
          <span className="leading-relaxed font-mono">{statusBanner.text}</span>
        </div>
      )}

      {/* Main Core Layout Form */}
      <form onSubmit={handleSubmitPDI} className="space-y-6">
        
        {/* UPPER CAPTURE: Serial & Telemetry Matrix Grid */}
        <div className="bg-white/70 backdrop-blur-md border border-cyan-200/60 p-6 rounded-2xl shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2">Traceability Logging</h3>
          
          <div className="max-w-xl">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Battery Pack Serial Number</label>
            <div className="flex gap-3 mt-2">
              <div className="relative rounded-xl shadow-xs flex-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <QrCode className="h-5 w-5 text-cyan-600/70" />
                </div>
                <input
                  type="text"
                  required
                  disabled={isProcessing || isFetchingHistory}
                  value={packSerial}
                  onChange={(e) => {
                    setPackSerial(e.target.value);
                    setStatusBanner(null);
                  }}
                  className="block w-full rounded-xl border border-cyan-200/80 bg-white/90 py-3 pl-11 pr-3 font-mono text-sm text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-cyan-500/15 transition-all disabled:opacity-50"
                  placeholder="Scan Pack Serial to link parameters"
                />
              </div>
              <button
                type="button"
                onClick={handleFetchPackHistory}
                disabled={!packSerial.trim() || isFetchingHistory || isProcessing}
                className="px-5 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-bold text-xs text-white shadow-md shadow-cyan-600/20 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-2 cursor-pointer"
              >
                <Search className="w-4 h-4" /> {isFetchingHistory ? "Verifying..." : "Check"}
              </button>
            </div>
          </div>

          {/* TELEMETRY DATA FIELDS */}
          <div className="pt-2">
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">Historical Test Execution Matrix</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {telemetryItems.map((item, index) => (
                <div 
                  key={index}
                  className="bg-white/90 border border-slate-200/80 p-3.5 rounded-xl flex flex-col justify-between shadow-xs transition-all hover:border-cyan-300"
                >
                  <span className="text-[10px] uppercase font-bold tracking-wide text-slate-400 block truncate">
                    {item.label}
                  </span>
                  <span className={`text-sm font-semibold tracking-wide font-mono mt-1.5 block truncate
                    ${!historicalTelemetry ? "text-slate-300 select-none" : "text-slate-900"}`}
                  >
                    {historicalTelemetry && item.value !== undefined && item.value !== null ? String(item.value) : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* LOWER DECISION: Manual Calendar & Drop Down Decision Cards */}
        <div className="bg-white/70 backdrop-blur-md border border-cyan-200/60 p-6 rounded-2xl shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2">Quality Release Parameters</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl">
            {/* Manual Inspection Calendar Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Inspection Date Selection</label>
              <div className="relative mt-2 rounded-xl shadow-xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <Calendar className="h-5 w-5 text-cyan-600/70" />
                </div>
                <input
                  type="date"
                  required
                  disabled={isProcessing}
                  value={inspectionDate}
                  onChange={(e) => setInspectionDate(e.target.value)}
                  className="block w-full rounded-xl border border-cyan-200/80 bg-white/90 py-3 pl-11 pr-3 text-slate-900 focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-cyan-500/15 text-sm transition-all cursor-pointer disabled:opacity-50 font-mono"
                />
              </div>
            </div>

            {/* PDI Status Drop Down Card */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">PDI Disposition Status</label>
              <div className="relative mt-2 rounded-xl shadow-xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <ClipboardList className="h-5 w-5 text-cyan-600/70" />
                </div>
                <select
                  required
                  disabled={isProcessing}
                  value={pdiStatus}
                  onChange={(e) => {
                    setPdiStatus(e.target.value);
                    if (e.target.value !== "NOK") {
                      setDefectName("");
                      setDefectActualValue("");
                      setPackStatusOption("");
                      setDefectSourceOption("");
                      setNokRemarks("");
                    }
                  }}
                  className="block w-full rounded-xl border border-cyan-200/80 bg-white/90 py-3 pl-11 pr-8 text-slate-900 focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-cyan-500/15 text-sm transition-all cursor-pointer appearance-none disabled:opacity-50 font-bold"
                >
                  <option value="" disabled>Select Release Verdict</option>
                  <option value="OK" className="text-cyan-900 font-bold">OK</option>
                  <option value="Conditionally OK" className="text-amber-700 font-bold">Conditionally OK</option>
                  <option value="NOK" className="text-rose-700 font-bold">NOK</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* DYNAMIC SECURE LAYER: NON-CONFORMANCE ESCALATION FORM BLOCK */}
          {pdiStatus === "NOK" && (
            <div className="border border-rose-200 bg-rose-50/50 p-6 rounded-2xl space-y-4 animate-in slide-in-from-top-4 duration-200">
              <div className="flex items-center justify-between text-rose-950 font-bold text-xs border-b border-rose-200 pb-2">
                <div className="flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-rose-600 animate-pulse" />
                  Defect Escalation Log Matrix
                </div>
                {isLoadingMasterData && (
                  <span className="text-xs text-rose-700 font-normal animate-pulse">
                    Loading master options...
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                
                {/* 1. Defect Name Parameter */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Defect</label>
                  <select
                    required
                    value={defectName}
                    onChange={(e) => setDefectName(e.target.value)}
                    className="block w-full rounded-xl border border-rose-200 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-4 focus:ring-rose-500/15 mt-1.5 transition-all cursor-pointer font-medium"
                  >
                    <option value="">-- Select Registered Defect --</option>
                    {masterDefects.map((def) => (
                      <option key={def.id} value={def.defect_name}>
                        {def.defect_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Defect Actual Value Parameter */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Defect Actual Value</label>
                  <input
                    type="number"
                    step="1"
                    required
                    placeholder="0"
                    value={defectActualValue}
                    onChange={(e) => setDefectActualValue(e.target.value)}
                    className="block w-full rounded-xl border border-rose-200 bg-white p-2.5 text-xs font-mono text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-4 focus:ring-rose-500/15 mt-1.5 transition-all"
                  />
                </div>

                {/* 3. Battery Pack Status Parameter */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Battery Pack Status</label>
                  <select
                    required
                    value={packStatusOption}
                    onChange={(e) => setPackStatusOption(e.target.value)}
                    className="block w-full rounded-xl border border-rose-200 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-4 focus:ring-rose-500/15 mt-1.5 transition-all cursor-pointer font-medium"
                  >
                    <option value="">-- Select Status --</option>
                    {masterBatteryStatuses.map((stat) => (
                      <option key={stat.id} value={stat.status_name}>
                        {stat.status_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Defect Source Parameter */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Defect Origin Source</label>
                  <select
                    required
                    value={defectSourceOption}
                    onChange={(e) => setDefectSourceOption(e.target.value)}
                    className="block w-full rounded-xl border border-rose-200 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-4 focus:ring-rose-500/15 mt-1.5 transition-all cursor-pointer font-medium"
                  >
                    <option value="">-- Select Origin Source --</option>
                    {masterDefectSources.map((src) => (
                      <option key={src.id} value={src.defect_name}>
                        {src.defect_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Descriptive Remarks Block */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Remarks</label>
                  <input
                    type="text"
                    placeholder="Provide non-conformance details"
                    value={nokRemarks}
                    onChange={(e) => setNokRemarks(e.target.value)}
                    className="block w-full rounded-xl border border-rose-200 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-4 focus:ring-rose-500/15 mt-1.5 transition-all"
                  />
                </div>

              </div>
            </div>
          )}

          {/* Action Control Buttons Footer Bar */}
          <div className="pt-6 flex flex-col sm:flex-row gap-4 border-t border-slate-200">
            <button
              type="submit"
              disabled={!packSerial.trim() || !inspectionDate || !pdiStatus || isProcessing || !historicalTelemetry}
              className="flex-1 flex justify-center items-center gap-2 rounded-xl bg-cyan-600 px-4 py-3.5 text-xs font-bold text-white shadow-md shadow-cyan-600/20 hover:bg-cyan-500 disabled:opacity-40 disabled:pointer-events-none transition-all active:scale-[0.99] cursor-pointer"
            >
              <Send className="w-4 h-4" /> {isProcessing ? "Transmitting Master Log..." : "Submit Inspection Record"}
            </button>

            <button
              type="button"
              onClick={() => {
                handleResetStation();
                setStatusBanner(null);
              }}
              disabled={isProcessing || isFetchingHistory}
              className="px-5 py-3.5 border border-slate-300 hover:border-slate-400 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer bg-white hover:bg-slate-50 disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4 text-slate-600" /> Reset Layout Fields
            </button>
          </div>
        </div>

      </form>

    </div>
  );
}