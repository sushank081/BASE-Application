"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Cpu,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Save,
  RefreshCw,
  Gauge,
  Activity,
  Zap,
  ShieldCheck,
  Server,
  CheckSquare,
  Square
} from "lucide-react";
import { BASE_URL } from "../../../../utils/utilsapi";

// Interface defining the state for all available telemetry parameter fields
interface TelemetryFields {
  "Cell Deviation": string;
  "Cell Minimum": string;
  "Temperature difference of PDU- Balancing": string;
  "Final Pack Voltage": string;
  "Final SOC%": string;
  "BMS DC DC Voltage": string;
  "Cell Maximum": string;
  "Start SOC %": string;
  "Battery Pack Temperature": string;
  "MinimumDischargeVoltage": string;
  "DC-DC": string;
  "CycleCount": string;
  "Battery Pack Temp": string;
  "CellVoltage": string;
  "Temperature Difference": string;
  "TotalVoltage": string;
  "PDU Temp Difference": string;
  "SOCStates": string;
  "Cell voltage deviation": string;
}

export default function ChromaEOLManualEntryPage() {
  const router = useRouter();

  // Active Execution Step State: 1 = Interlock Start Check, 2 = Complete Data Submission
  const [activeStep, setActiveStep] = useState<1 | 2>(1);

  // Status & Processing Flags
  const [isProcessing, setIsProcessing] = useState(false);
  const [interlockPassed, setInterlockPassed] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // -------------------------------------------------------------------------
  // FORM STATES: CHROMA START (STEP 1)
  // -------------------------------------------------------------------------
  const [batteryPackSr, setBatteryPackSr] = useState("");
  const [startChannelID, setStartChannelID] = useState("");
  const [machineID, setMachineID] = useState("");

  // -------------------------------------------------------------------------
  // FORM STATES: CHROMA COMPLETE METADATA (STEP 2)
  // -------------------------------------------------------------------------
  const [testerID, setTesterID] = useState("");
  const [channelID, setChannelID] = useState("");
  const [finalStatus, setFinalStatus] = useState<"PASS" | "FAIL">("PASS");
  const [inspectionDate, setInspectionDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  // -------------------------------------------------------------------------
  // FORM STATES & SELECTION TOGGLES: CHROMA COMPLETE TELEMETRY PARAMETERS
  // -------------------------------------------------------------------------
  const initialTelemetryValues: TelemetryFields = {
    "Cell Deviation": "",
    "Cell Minimum": "",
    "Temperature difference of PDU- Balancing": "",
    "Final Pack Voltage": "",
    "Final SOC%": "",
    "BMS DC DC Voltage": "",
    "Cell Maximum": "",
    "Start SOC %": "",
    "Battery Pack Temperature": "",
    "MinimumDischargeVoltage": "",
    "DC-DC": "",
    "CycleCount": "",
    "Battery Pack Temp": "",
    "CellVoltage": "",
    "Temperature Difference": "",
    "TotalVoltage": "",
    "PDU Temp Difference": "",
    "SOCStates": "",
    "Cell voltage deviation": ""
  };

  const [telemetryValues, setTelemetryValues] = useState<TelemetryFields>(initialTelemetryValues);

  // Map tracking which parameters are enabled/checked by the user (default: all checked)
  const [selectedFields, setSelectedFields] = useState<Record<keyof TelemetryFields, boolean>>({
    "Cell Deviation": true,
    "Cell Minimum": true,
    "Temperature difference of PDU- Balancing": true,
    "Final Pack Voltage": true,
    "Final SOC%": true,
    "BMS DC DC Voltage": true,
    "Cell Maximum": true,
    "Start SOC %": true,
    "Battery Pack Temperature": true,
    "MinimumDischargeVoltage": true,
    "DC-DC": true,
    "CycleCount": true,
    "Battery Pack Temp": true,
    "CellVoltage": true,
    "Temperature Difference": true,
    "TotalVoltage": true,
    "PDU Temp Difference": true,
    "SOCStates": true,
    "Cell voltage deviation": true
  });

  // Helper to handle text updates for telemetry input fields
  const handleTelemetryValueChange = (key: keyof TelemetryFields, value: string) => {
    setTelemetryValues((prev) => ({ ...prev, [key]: value }));
  };

  // Helper to toggle checkbox state for a parameter
  const handleToggleField = (key: keyof TelemetryFields) => {
    setSelectedFields((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Bulk actions for parameter selection
  const handleSelectAllFields = (select: boolean) => {
    const updated: Record<string, boolean> = {};
    Object.keys(selectedFields).forEach((key) => {
      updated[key] = select;
    });
    setSelectedFields(updated as Record<keyof TelemetryFields, boolean>);
  };

  // Check if at least one telemetry parameter checkbox is enabled
  const hasAtLeastOneParameterSelected = Object.values(selectedFields).some(Boolean);

  // Helper to convert standard HTML datetime-local value (YYYY-MM-DDTHH:mm) to string format (YYYY-MM-DD,HH:mm:ss)
  const formatDateTimeForApi = (datetimeStr: string): string => {
    if (!datetimeStr || !datetimeStr.trim()) return "";
    const cleanStr = datetimeStr.replace("T", ",");
    return cleanStr.length === 16 ? `${cleanStr}:00` : cleanStr;
  };

  // -------------------------------------------------------------------------
  // STEP 1: EXECUTE CHROMA START INTERLOCK CHECK
  // -------------------------------------------------------------------------
  const handleExecuteStartInterlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batteryPackSr.trim() || !startChannelID.trim() || !machineID.trim() || isProcessing) return;

    setIsProcessing(true);
    setStatusMessage(null);
    setInterlockPassed(false);

    const payload = {
      OLA_BCTCheckStatus: {
        Request: {
          BatteryPackSr: batteryPackSr.trim(),
          ChannelID: startChannelID.trim(),
          MachineID: machineID.trim()
        }
      }
    };

    try {
      const response = await fetch(`${BASE_URL}/api/v1/production/eol/chroma-start`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.Succeeded === false) {
        let errorDetail = "Interlock Validation Failed";

        if (typeof data.detail === "string") {
          errorDetail = data.detail;
        } else if (Array.isArray(data.detail)) {
          errorDetail = data.detail.map((errItem: any) => errItem.msg || JSON.stringify(errItem)).join(", ");
        } else if (data.SitUafExecutionDetail) {
          errorDetail = data.SitUafExecutionDetail;
        } else if (data.Error?.ErrorMessage) {
          errorDetail = `${data.Error.ErrorMessage} (Code: ${data.Error.ErrorCode})`;
        }

        throw new Error(errorDetail);
      }

      setInterlockPassed(true);

      // Auto-populate Step 2 Tester ID & Channel ID
      setTesterID(machineID.trim());
      setChannelID(startChannelID.trim());

      setStatusMessage({
        type: "success",
        text: `INTERLOCK PASSED: Pack [${data.PackSerialNumber || batteryPackSr.trim()}] cleared for EOL testing. ${data.SitUafExecutionDetail || ""}`
      });

      // Advance to Step 2
      setActiveStep(2);
    } catch (err: any) {
      console.error("Chroma Start Interlock Error:", err);
      const actualError = typeof err === "string" ? err : err?.message || "Failed to authorize test execution.";
      setStatusMessage({
        type: "error",
        text: `INTERLOCK REJECTED: ${actualError}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // -------------------------------------------------------------------------
  // STEP 2: SUBMIT CHROMA COMPLETE TELEMETRY RESULTS
  // -------------------------------------------------------------------------
  const handleExecuteCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasAtLeastOneParameterSelected) {
      setStatusMessage({
        type: "error",
        text: "VALIDATION REJECTION: You must enable and select at least one diagnostic parameter before submitting test results."
      });
      return;
    }

    if (!batteryPackSr.trim() || isProcessing) return;

    setIsProcessing(true);
    setStatusMessage(null);

    // Build base request metadata
    const requestObject: Record<string, string> = {
      BatteryPackSr: batteryPackSr.trim(),
      InspectionDate: inspectionDate.trim(),
      TesterID: testerID.trim(),
      ChannelID: channelID.trim(),
      FinalStatus: finalStatus,
      Start_time: formatDateTimeForApi(startTime),
      End_time: formatDateTimeForApi(endTime)
    };

    // Dynamically include only checked telemetry parameters in the payload
    (Object.keys(selectedFields) as Array<keyof TelemetryFields>).forEach((paramKey) => {
      if (selectedFields[paramKey]) {
        requestObject[paramKey] = String(telemetryValues[paramKey]).trim();
      }
    });

    const payload = {
      OLA_BCTTestResult: {
        Request: requestObject
      }
    };

    try {
      const response = await fetch(`${BASE_URL}/api/v1/production/eol/chroma-complete`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.Succeeded === false) {
        let errorDetail = "Telemetry Submission Failed";

        if (typeof data.detail === "string") {
          errorDetail = data.detail;
        } else if (Array.isArray(data.detail)) {
          errorDetail = data.detail
            .map((errItem: any) => `${errItem.loc?.slice(-1)[0] || "field"}: ${errItem.msg}`)
            .join(" | ");
        } else if (data.SitUafExecutionDetail) {
          errorDetail = data.SitUafExecutionDetail;
        } else if (data.Error?.ErrorMessage) {
          errorDetail = `${data.Error.ErrorMessage} (Code: ${data.Error.ErrorCode})`;
        }

        throw new Error(errorDetail);
      }

      // Display Success Banner
      setStatusMessage({
        type: "success",
        text: `TRANSACTION COMPLETE: EOL Chroma results successfully logged [Status: ${finalStatus}]. ${data.SitUafExecutionDetail || ""}`
      });

      // Show success message for 2 seconds before resetting to default state
      setTimeout(() => {
        handleResetWorkflow();
        setStatusMessage(null);
      }, 2000);
    } catch (err: any) {
      console.error("Chroma Complete Submission Error:", err);
      const actualError = typeof err === "string" ? err : err?.message || "Failed to commit telemetry data.";
      setStatusMessage({
        type: "error",
        text: `TRANSACTION ERROR: ${actualError}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetWorkflow = () => {
    setActiveStep(1);
    setInterlockPassed(false);
    setBatteryPackSr("");
    setStartChannelID("");
    setMachineID("");
    setTesterID("");
    setChannelID("");
    setFinalStatus("PASS");
    setInspectionDate("");
    setStartTime("");
    setEndTime("");
    setTelemetryValues(initialTelemetryValues);
    handleSelectAllFields(true);
  };

  return (
    <div className="space-y-6 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 font-sans text-slate-800">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cyan-200/60 pb-5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2.5 rounded-xl bg-white/80 hover:bg-white border border-cyan-200/80 text-slate-800 transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-cyan-700" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Zap className="w-7 h-7 text-cyan-600" /> Chroma EOL Manual Testing
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              End-Of-Line Battery Testing Machine Gateway & Manual Override Station
            </p>
          </div>
        </div>

        <button
          onClick={handleResetWorkflow}
          className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-300 shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <RefreshCw className="w-4 h-4 text-slate-600" /> Reset Form
        </button>
      </div>

      {/* DYNAMIC FEEDBACK BANNER */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-start gap-3 shadow-sm transition-all ${
            statusMessage.type === "success"
              ? "bg-cyan-50 border-cyan-200 text-cyan-900"
              : statusMessage.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-900"
              : "bg-sky-50 border-sky-200 text-sky-900"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
          ) : statusMessage.type === "error" ? (
            <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
          )}
          <span className="leading-relaxed">{statusMessage.text}</span>
        </div>
      )}

      {/* STEP NAVIGATION TABS */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setActiveStep(1)}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
            activeStep === 1
              ? "bg-slate-900 text-white border-slate-800 shadow-md"
              : "bg-white/70 text-slate-800 border-cyan-200/60 hover:bg-white"
          }`}
        >
          <div className={`p-2.5 rounded-xl ${activeStep === 1 ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-600"}`}>
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider block text-cyan-400">Operation 1</span>
            <span className="text-sm font-bold block">Chroma Start Interlock</span>
          </div>
        </button>

        <button
          onClick={() => interlockPassed && setActiveStep(2)}
          disabled={!interlockPassed}
          className={`p-4 rounded-2xl border text-left transition-all flex items-center gap-3 ${
            !interlockPassed
              ? "opacity-50 cursor-not-allowed bg-slate-100/60 border-slate-200 text-slate-400"
              : activeStep === 2
              ? "bg-slate-900 text-white border-slate-800 shadow-md cursor-pointer"
              : "bg-white/70 text-slate-800 border-cyan-200/60 hover:bg-white cursor-pointer"
          }`}
        >
          <div className={`p-2.5 rounded-xl ${activeStep === 2 ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-600"}`}>
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider block text-cyan-400">Operation 2</span>
            <span className="text-sm font-bold block">Chroma Complete Data</span>
          </div>
        </button>
      </div>

      {/* STEP 1: CHROMA START INTERLOCK FORM */}
      {activeStep === 1 && (
        <div className="bg-white/70 backdrop-blur-md border border-cyan-200/60 p-6 rounded-2xl shadow-sm space-y-6 text-slate-800">
          <div className="border-b border-slate-200 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Server className="w-5 h-5 text-cyan-600" /> Verify Gate Sequence Interlocks
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Validates Pack Registration, Work Order State, Quality HOLD Tickets, and Pre-EOL Completion before authorizing testing.
            </p>
          </div>

          <form onSubmit={handleExecuteStartInterlock} className="space-y-5 max-w-xl text-slate-800">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Battery Pack Serial Number
              </label>
              <input
                type="text"
                required
                value={batteryPackSr}
                onChange={(e) => setBatteryPackSr(e.target.value)}
                placeholder="e.g. BB000000004655.B.000000HS01.G.208.1.1.B2PJCB27GG4700"
                className="w-full px-4 py-3 rounded-xl border border-cyan-200/80 bg-white/90 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-4 focus:ring-cyan-500/15"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Channel ID
                </label>
                <input
                  type="text"
                  required
                  value={startChannelID}
                  onChange={(e) => setStartChannelID(e.target.value)}
                  placeholder="e.g. 1"
                  className="w-full px-4 py-3 rounded-xl border border-cyan-200/80 bg-white/90 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-4 focus:ring-cyan-500/15"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Machine ID
                </label>
                <input
                  type="text"
                  required
                  value={machineID}
                  onChange={(e) => setMachineID(e.target.value)}
                  placeholder="e.g. 6A"
                  className="w-full px-4 py-3 rounded-xl border border-cyan-200/80 bg-white/90 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-4 focus:ring-cyan-500/15"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!batteryPackSr.trim() || !startChannelID.trim() || !machineID.trim() || isProcessing}
              className="w-full py-3.5 px-6 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md shadow-cyan-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-40"
            >
              <Play className="w-4 h-4" />
              {isProcessing ? "Verifying Interlocks..." : "Authorize Test Execution (Chroma Start)"}
            </button>
          </form>
        </div>
      )}

      {/* STEP 2: CHROMA COMPLETE DATA MUTATION FORM */}
      {activeStep === 2 && (
        <form onSubmit={handleExecuteCompleteSubmit} className="space-y-6 text-slate-800">
          {/* Machine & Hardware Settings Block */}
          <div className="bg-white/70 backdrop-blur-md border border-cyan-200/60 p-6 rounded-2xl shadow-sm space-y-4 text-slate-800">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-600" /> Machine Metadata & Execution Verdict
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Tester Station ID</label>
                <input
                  type="text"
                  required
                  value={testerID}
                  onChange={(e) => setTesterID(e.target.value)}
                  placeholder="e.g. 6A"
                  className="w-full p-2.5 rounded-lg border border-cyan-200/80 bg-white/90 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-4 focus:ring-cyan-500/15"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Test Channel ID</label>
                <input
                  type="text"
                  required
                  value={channelID}
                  onChange={(e) => setChannelID(e.target.value)}
                  placeholder="e.g. 1"
                  className="w-full p-2.5 rounded-lg border border-cyan-200/80 bg-white/90 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-4 focus:ring-cyan-500/15"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Final Test Status</label>
                <select
                  value={finalStatus}
                  onChange={(e) => setFinalStatus(e.target.value as "PASS" | "FAIL")}
                  className={`w-full p-2.5 rounded-lg border text-xs font-bold cursor-pointer ${
                    finalStatus === "PASS"
                      ? "bg-cyan-50 text-cyan-900 border-cyan-300"
                      : "bg-rose-50 text-rose-900 border-rose-300"
                  }`}
                >
                  <option value="PASS" className="text-slate-900 bg-white">
                    PASS — Release Pack
                  </option>
                  <option value="FAIL" className="text-slate-900 bg-white">
                    FAIL — Trigger Quality HOLD Ticket
                  </option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Inspection Date</label>
                <input
                  type="date"
                  required
                  value={inspectionDate}
                  onChange={(e) => setInspectionDate(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-cyan-200/80 bg-white/90 text-xs font-mono text-slate-900 cursor-pointer focus:border-cyan-500 focus:outline-none focus:ring-4 focus:ring-cyan-500/15"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Start Date & Time</label>
                <input
                  type="datetime-local"
                  step="1"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-cyan-200/80 bg-white/90 text-xs font-mono text-slate-900 cursor-pointer focus:border-cyan-500 focus:outline-none focus:ring-4 focus:ring-cyan-500/15"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">End Date & Time</label>
                <input
                  type="datetime-local"
                  step="1"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-cyan-200/80 bg-white/90 text-xs font-mono text-slate-900 cursor-pointer focus:border-cyan-500 focus:outline-none focus:ring-4 focus:ring-cyan-500/15"
                />
              </div>
            </div>
          </div>

          {/* TELEMETRY DIAGNOSTICS MEASUREMENT SELECTION GRID */}
          <div className="bg-white/70 backdrop-blur-md border border-cyan-200/60 p-6 rounded-2xl shadow-sm space-y-5 text-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-cyan-600" /> Diagnostic Parameter Configurator
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Check parameters to include in submission payload. Unchecked parameters will be excluded.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectAllFields(true)}
                  className="px-3 py-1.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-800 font-bold text-[11px] border border-cyan-200 transition-all cursor-pointer"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectAllFields(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] border border-slate-300 transition-all cursor-pointer"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Validation warning when no parameters are selected */}
            {!hasAtLeastOneParameterSelected && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>At least one diagnostic parameter must be selected for submission.</span>
              </div>
            )}

            {/* TELEMETRY DYNAMIC INPUT GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(Object.keys(selectedFields) as Array<keyof TelemetryFields>).map((paramKey) => {
                const isSelected = selectedFields[paramKey];

                return (
                  <div
                    key={paramKey}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isSelected
                        ? "bg-white border-cyan-300/80 shadow-sm"
                        : "bg-slate-50/70 border-slate-200 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <label
                        htmlFor={`checkbox-${paramKey}`}
                        className="text-xs font-bold text-slate-800 cursor-pointer select-none truncate pr-2"
                      >
                        {paramKey}
                      </label>

                      <button
                        type="button"
                        id={`checkbox-${paramKey}`}
                        onClick={() => handleToggleField(paramKey)}
                        className={`p-0.5 rounded transition-colors cursor-pointer ${
                          isSelected ? "text-cyan-600" : "text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </button>
                    </div>

                    <input
                      type="text"
                      disabled={!isSelected}
                      value={telemetryValues[paramKey]}
                      onChange={(e) => handleTelemetryValueChange(paramKey, e.target.value)}
                      placeholder={isSelected ? `Enter ${paramKey}` : "Parameter disabled"}
                      className={`w-full p-2.5 rounded-lg border text-xs font-mono transition-all ${
                        isSelected
                          ? "bg-white border-cyan-200 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                          : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* FORM CONTROLS */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isProcessing || !hasAtLeastOneParameterSelected}
              className="flex-1 py-3.5 px-6 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md shadow-cyan-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-40"
            >
              <Save className="w-4 h-4" />
              {isProcessing ? "Committing Telemetry..." : "Submit EOL Results (Chroma Complete)"}
            </button>

            <button
              type="button"
              onClick={() => setActiveStep(1)}
              className="px-6 py-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer shadow-sm"
            >
              Back to Start
            </button>
          </div>
        </form>
      )}
    </div>
  );
}