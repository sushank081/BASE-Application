"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Layers, 
  ArrowLeft, 
  QrCode, 
  CheckCircle, 
  RotateCcw,
  Keyboard,
  Cpu,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  Timer
} from "lucide-react";
import { BASE_URL } from "../../../../utils/utilsapi";

export default function BatteryPackLinePage() {
  const router = useRouter();

  // Operational Mode State: "A" = MES (Automated), "M" = NON-MES (Manual)
  const [operationMode, setOperationMode] = useState<"A" | "M">("A");
  
  // 5-Second Warning Banner State
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-Submit Countdown Timer State
  const [countdown, setCountdown] = useState<number | null>(null);
  const autoSubmitTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Field Inputs State
  const [lhSerial, setLhSerial] = useState("");
  const [rhSerial, setRhSerial] = useState("");
  const [packSerial, setPackSerial] = useState("");
  const [bmsSerial, setBmsSerial] = useState("");
  
  // Operational Input Profiling State
  const [isScannerInput, setIsScannerInput] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Inline Telemetry Response Panel States
  const [scanSuccessData, setScanSuccessData] = useState<{
    linkedWo: string;
    recordId: string | number;
    method: string;
    mode: string;
  } | null>(null);
  const [scanErrorMessage, setScanErrorMessage] = useState<string | null>(null);
  
  // Timing references to calculate speed of input entries
  const lastKeyTimeRef = useRef<number>(0);
  const strokeIntervalsRef = useRef<number[]>([]);

  // Input Field References for automatic focus shifting
  const lhRef = useRef<HTMLInputElement>(null);
  const rhRef = useRef<HTMLInputElement>(null);
  const packRef = useRef<HTMLInputElement>(null);
  const bmsRef = useRef<HTMLInputElement>(null);

  // Automatically focus on the first entry block when line boots up
  useEffect(() => {
    if (lhRef.current) lhRef.current.focus();
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (autoSubmitTimerRef.current) clearTimeout(autoSubmitTimerRef.current);
    };
  }, []);

  // Switch Operational Mode & Trigger 5-second Warning
  const handleToggleMode = (newMode: "A" | "M") => {
    if (newMode === operationMode) return;

    setOperationMode(newMode);
    resetPackStation();
    setScanErrorMessage(null);

    const alertDetail = newMode === "A" 
      ? "MES Mode Enabled"
      : "NON-MES Enabled";

    setWarningMessage(alertDetail);

    // Clear existing timer if user toggles quickly
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);

    // Auto-dismiss warning after 5 seconds (5000 ms)
    warningTimerRef.current = setTimeout(() => {
      setWarningMessage(null);
    }, 5000);
  };

  // Central Keypress Profiling Engine
  const profileInputSpeed = () => {
    const now = Date.now();
    if (lastKeyTimeRef.current !== 0) {
      const interval = now - lastKeyTimeRef.current;
      strokeIntervalsRef.current.push(interval);
    }
    lastKeyTimeRef.current = now;

    if (strokeIntervalsRef.current.length > 4) {
      const averageSpeed = strokeIntervalsRef.current.reduce((a, b) => a + b, 0) / strokeIntervalsRef.current.length;
      if (averageSpeed > 45) {
        setIsScannerInput(false);
      }
    }
  };

  // Focus Navigation Helper for Sequence: LH -> RH -> Pack -> BMS
  const handleFieldKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    nextRef: React.RefObject<HTMLInputElement | null> | null
  ) => {
    profileInputSpeed();

    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      if (nextRef && nextRef.current) {
        nextRef.current.focus();
      }
    }
  };

  // Automated Watcher monitoring field completions and triggering 3-second Auto-Submission
  useEffect(() => {
    const allFieldsPopulated = 
      lhSerial.trim() !== "" && 
      rhSerial.trim() !== "" && 
      packSerial.trim() !== "" && 
      bmsSerial.trim() !== "";

    if (allFieldsPopulated && !isProcessing && !scanSuccessData && !scanErrorMessage) {
      if (countdown === null) {
        setCountdown(3);
      }
    } else {
      if (countdown !== null) {
        setCountdown(null);
        if (autoSubmitTimerRef.current) clearTimeout(autoSubmitTimerRef.current);
      }
    }
  }, [lhSerial, rhSerial, packSerial, bmsSerial, isProcessing, scanSuccessData, scanErrorMessage, countdown]);

  // Handle active countdown processing tick (3s -> 2s -> 1s -> Submit)
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      autoSubmitTimerRef.current = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (countdown === 0) {
      setCountdown(null);
      handlePackAssemblySubmit();
    }

    return () => {
      if (autoSubmitTimerRef.current) clearTimeout(autoSubmitTimerRef.current);
    };
  }, [countdown]);

  // Handle Form Submission Execution Loop
  const handlePackAssemblySubmit = async () => {
    if (!lhSerial || !rhSerial || !packSerial || !bmsSerial || isProcessing) return;
    
    setCountdown(null);
    if (autoSubmitTimerRef.current) clearTimeout(autoSubmitTimerRef.current);

    setIsProcessing(true);
    setScanSuccessData(null);
    setScanErrorMessage(null);

    console.log(`BASE-MES: Dispatching payload map in Mode '${operationMode}'...`);

    try {
      const response = await fetch(`${BASE_URL}/api/v1/production/pack-line/validate-and-scan`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: operationMode,
          lh_serial: lhSerial.trim(),
          rh_serial: rhSerial.trim(),
          pack_serial: packSerial.trim(),
          bms_serial: bmsSerial.trim()
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (Array.isArray(data.detail)) {
          const parsedDetailError = data.detail
            .map((err: any) => `Field [${err.loc[1] || "Payload"}]: ${err.msg}`)
            .join(" | ");
          setScanErrorMessage(parsedDetailError);
          return;
        }
        throw new Error(data.detail || `Server validation failed with status: ${response.status}`);
      }

      // Success Panel State Generation Loop
      setScanSuccessData({
        linkedWo: data.linked_wo_number || "N/A",
        recordId: data.pack_scan_record_id || "N/A",
        method: isScannerInput ? "AUTOMATED SCAN" : "MANUAL SUBMIT",
        mode: operationMode === "A" ? "MES (Mode A)" : "NON-MES (Mode M)"
      });

      // Maintain view state for 3.5 seconds before resetting line peripherals
      setTimeout(() => {
        resetPackStation();
        setScanSuccessData(null);
      }, 3500);

    } catch (err: any) {
      console.error("MES Interlock Rejection Error Context:", err);
      setScanErrorMessage(err.message || "Network timeout communicating with local MES engine server.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset Component Inputs and input profiles
  const resetPackStation = () => {
    setLhSerial("");
    setRhSerial("");
    setPackSerial("");
    setBmsSerial("");
    setCountdown(null);
    if (autoSubmitTimerRef.current) clearTimeout(autoSubmitTimerRef.current);
    setIsScannerInput(true);
    lastKeyTimeRef.current = 0;
    strokeIntervalsRef.current = [];
    if (lhRef.current) lhRef.current.focus();
  };

  return (
    <div className="space-y-8 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 font-sans text-slate-800">
      
      {/* Navigation Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cyan-200/60 pb-5">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push("/dashboard/production")}
            className="p-2.5 rounded-xl bg-white/80 hover:bg-white border border-cyan-200/80 text-slate-800 transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-cyan-700" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Layers className="w-7 h-7 text-cyan-600" /> Battery Pack Line Terminal
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Sub-Assembly Module Verification & Master Battery Serial Matching Gateway
            </p>
          </div>
        </div>

        {/* TOP CONTROLS: Mode Switch & Input Badge */}
        <div className="flex items-center gap-3">
          
          {/* MODE TOGGLE SWITCH (MES vs NON-MES) */}
          <div className="bg-slate-900/10 p-1 rounded-2xl border border-slate-300 flex items-center shadow-inner">
            <button
              type="button"
              onClick={() => handleToggleMode("A")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                operationMode === "A"
                  ? "bg-slate-900 text-white shadow-md"
                  : "text-slate-700 hover:bg-white/40"
              }`}
            >
              {operationMode === "A" && <ToggleRight className="w-4 h-4 text-cyan-400" />}
              MES
            </button>

            <button
              type="button"
              onClick={() => handleToggleMode("M")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                operationMode === "M"
                  ? "bg-amber-700 text-white shadow-md"
                  : "text-slate-700 hover:bg-white/40"
              }`}
            >
              {operationMode === "M" && <ToggleLeft className="w-4 h-4 text-amber-300" />}
              NON-MES
            </button>
          </div>

          {/* Input Profile Diagnostic Badge */}
          <div className={`px-3.5 py-2 rounded-xl border flex items-center gap-2 text-xs font-semibold shadow-xs transition-all
            ${isScannerInput 
              ? "bg-slate-900 text-cyan-400 border-slate-800" 
              : "bg-amber-500/10 text-amber-800 border-amber-500/20 animate-pulse"
            }`}
          >
            {isScannerInput ? <Cpu className="w-4 h-4 animate-pulse text-cyan-400" /> : <Keyboard className="w-4 h-4" />}
            {isScannerInput ? "Scanner" : "Keyboard"}
          </div>

        </div>
      </div>

      {/* DYNAMIC 5-SECOND WARNING BANNER ON MODE SWITCH */}
      {warningMessage && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs font-semibold flex items-center gap-3 shadow-sm animate-in slide-in-from-top-3 duration-200">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 animate-bounce" />
          <span className="leading-relaxed font-mono">{warningMessage}</span>
        </div>
      )}

      {/* Grid Split Workspace: Form vs Diagnostic Display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        
        {/* Left Forms Panel Layout (Expanded Container) */}
        <div className={`md:col-span-2 bg-white/70 backdrop-blur-md border p-8 sm:p-10 rounded-2xl shadow-sm flex flex-col justify-between transition-all duration-300 ${
          scanErrorMessage ? 'border-rose-300 bg-rose-50/20' : 'border-cyan-200/60'
        }`}>
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Battery Pack Assembly Inputs</h3>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
                operationMode === "A" ? "bg-cyan-100 border-cyan-300 text-cyan-900" : "bg-amber-100 border-amber-300 text-amber-900"
              }`}>
                Active Mode: {operationMode === "A" ? "MES (Mode A)" : "NON-MES (Mode M)"}
              </span>
            </div>

            {/* Step 1: Sub-Assembly Modules (LH & RH Split Row) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* LH Serial Input -> Advances to RH Serial */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">LH Serial Number</label>
                <div className="relative mt-2 rounded-xl shadow-xs">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <QrCode className="h-5 w-5 text-cyan-600/70" />
                  </div>
                  <input
                    type="text"
                    ref={lhRef}
                    value={lhSerial}
                    disabled={isProcessing}
                    onKeyDown={(e) => handleFieldKeyDown(e, rhRef)}
                    onChange={(e) => { setLhSerial(e.target.value); setScanErrorMessage(null); }}
                    className="block w-full rounded-xl border border-cyan-200/80 bg-white/90 py-3 pl-11 pr-4 font-mono text-xs text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-cyan-500/15 transition-all disabled:opacity-50"
                    placeholder="Scan LH Module serial"
                  />
                </div>
              </div>

              {/* RH Serial Input -> Advances to Pack Serial */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">RH Serial Number</label>
                <div className="relative mt-2 rounded-xl shadow-xs">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <QrCode className="h-5 w-5 text-cyan-600/70" />
                  </div>
                  <input
                    type="text"
                    ref={rhRef}
                    value={rhSerial}
                    disabled={isProcessing}
                    onKeyDown={(e) => handleFieldKeyDown(e, packRef)}
                    onChange={(e) => { setRhSerial(e.target.value); setScanErrorMessage(null); }}
                    className="block w-full rounded-xl border border-cyan-200/80 bg-white/90 py-3 pl-11 pr-4 font-mono text-xs text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-cyan-500/15 transition-all disabled:opacity-50"
                    placeholder="Scan RH Module serial"
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Full-Width Pack Serial Input -> Advances to BMS Serial */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Pack Serial Number</label>
              <div className="relative mt-2 rounded-xl shadow-xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <QrCode className="h-5 w-5 text-cyan-600/70" />
                </div>
                <input
                  type="text"
                  ref={packRef}
                  value={packSerial}
                  disabled={isProcessing}
                  onKeyDown={(e) => handleFieldKeyDown(e, bmsRef)}
                  onChange={(e) => { setPackSerial(e.target.value); setScanErrorMessage(null); }}
                  className="block w-full rounded-xl border border-cyan-200/80 bg-white/90 py-3.5 pl-11 pr-4 font-mono text-xs text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-cyan-500/15 transition-all disabled:opacity-50 tracking-wide"
                  placeholder="Scan or enter full Pack Serial Number..."
                />
              </div>
            </div>

            {/* Step 3: Full-Width BMS Serial Input (Final step in sequence) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">BMS Serial Number</label>
              <div className="relative mt-2 rounded-xl shadow-xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <QrCode className="h-5 w-5 text-cyan-600/70" />
                </div>
                <input
                  type="text"
                  ref={bmsRef}
                  value={bmsSerial}
                  disabled={isProcessing}
                  onKeyDown={(e) => handleFieldKeyDown(e, null)}
                  onChange={(e) => { setBmsSerial(e.target.value); setScanErrorMessage(null); }}
                  className="block w-full rounded-xl border border-cyan-200/80 bg-white/90 py-3.5 pl-11 pr-4 font-mono text-xs text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-cyan-500/15 transition-all disabled:opacity-50 tracking-wide"
                  placeholder="Scan or enter full BMS Serial Number..."
                />
              </div>
            </div>
          </div>

          {/* Form Bottom Control Button Bar */}
          <div className="pt-8 flex flex-col sm:flex-row gap-4 border-t border-slate-200 mt-8">
            <button
              type="button"
              onClick={handlePackAssemblySubmit}
              disabled={!lhSerial || !rhSerial || !packSerial || !bmsSerial || isProcessing}
              className={`flex-1 flex justify-center items-center gap-2 rounded-xl px-4 py-3.5 text-xs font-bold text-white shadow-md transition-all active:scale-[0.99] cursor-pointer
                ${isScannerInput 
                  ? "bg-cyan-600 hover:bg-cyan-500 shadow-cyan-600/20 disabled:opacity-40" 
                  : "bg-amber-600 hover:bg-amber-500 disabled:opacity-40"
                }`}
            >
              <CheckCircle className="w-4 h-4" /> 
              {isProcessing 
                ? "Registering Assembly Map..." 
                : countdown !== null
                  ? `Submitting in ${countdown}s...`
                  : isScannerInput 
                    ? "Awaiting Complete Scans..." 
                    : "Submit Component Log Layout Manually"
              }
            </button>

            <button
              type="button"
              onClick={() => { resetPackStation(); setScanErrorMessage(null); }}
              disabled={isProcessing}
              className="px-6 py-3.5 border border-slate-300 hover:border-slate-400 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer bg-white hover:bg-slate-50 disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" /> Clear Station
            </button>
          </div>
        </div>

        {/* Right Station Diagnostics Response Panel (Enlarged Height) */}
        <div className="bg-white/70 backdrop-blur-md border border-cyan-200/60 p-8 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center min-h-[440px]">
          {scanSuccessData ? (
            <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200 w-full">
              <div className="p-4 rounded-full bg-cyan-100 border border-cyan-300 text-cyan-600 w-fit mx-auto shadow-md">
                <CheckCircle2 className="w-12 h-12 animate-bounce" />
              </div>
              <div className="space-y-3">
                <h4 className="text-lg font-bold text-slate-900">Pack Trace Saved</h4>
                <div className="text-left font-mono text-xs bg-white/90 border border-slate-200 rounded-xl p-4 space-y-2.5 mx-auto max-w-[280px] shadow-xs">
                  <p className="text-slate-700"><span className="font-bold text-slate-900">Mode:</span> {scanSuccessData.mode}</p>
                  <p className="text-slate-700 break-all"><span className="font-bold text-slate-900">Linked WO:</span><br/>{scanSuccessData.linkedWo}</p>
                  <p className="text-slate-700"><span className="font-bold text-slate-900">Record ID:</span> #{scanSuccessData.recordId}</p>
                  <p className="text-slate-700"><span className="font-bold text-slate-900">Execution:</span> {scanSuccessData.method}</p>
                </div>
              </div>
            </div>
          ) : scanErrorMessage ? (
            <div className="space-y-5 animate-in fade-in shake duration-300 w-full">
              <div className="p-4 rounded-full bg-rose-100 border border-rose-300 text-rose-600 w-fit mx-auto shadow-md">
                <XCircle className="w-12 h-12" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-rose-950">Interlock Rejection</h4>
                <div className="text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-4 max-w-[280px] mx-auto mt-3 font-semibold text-left leading-relaxed shadow-xs">
                  {scanErrorMessage}
                </div>
              </div>
            </div>
          ) : countdown !== null ? (
            <div className="space-y-4 animate-pulse">
              <div className="p-4 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 w-fit mx-auto">
                <Timer className="w-10 h-10 animate-spin" style={{ animationDuration: '8s' }} />
              </div>
              <div>
                <h4 className="text-xl font-bold text-amber-950">Auto-Submitting in {countdown}s</h4>
                <p className="text-xs text-amber-900/70 max-w-[220px] mx-auto mt-2">
                  All component bar-tokens detected. Transmitting assembly marriage record...
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-5 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-600 w-fit mx-auto">
                <QrCode className="w-10 h-10" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Awaiting Sub-Assemblies</h4>
              <p className="text-xs text-slate-500 max-w-[220px] mx-auto leading-relaxed">
                Scan the LH/RH components alongside the master battery pack footprint tokens to verify routing sequence parameters under <span className="font-bold text-slate-900">{operationMode === "A" ? "MES Mode" : "Non-MES Mode"}</span>.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}