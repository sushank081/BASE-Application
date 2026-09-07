"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Boxes, 
  ArrowLeft, 
  QrCode, 
  Cpu, 
  RotateCcw,
  Timer,
  Layers,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { BASE_URL } from "../../../../utils/utilsapi";

export default function ModuleLinePage() {
  const router = useRouter();
  
  // Line Selection Modal States
  const [selectedLine, setSelectedLine] = useState<string | null>(null);
  const [lineId, setLineId] = useState<number | null>(null);
  const [showLineModal, setShowLineModal] = useState(true);
  const [modalSelection, setModalSelection] = useState("");

  // Terminal Scanning States
  const [lhSerial, setLhSerial] = useState("");
  const [rhSerial, setRhSerial] = useState("");
  const [moduleSerial, setModuleSerial] = useState("MOD-2026-XXXXX");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Telemetry Feedback Message States
  const [scanSuccessMessage, setScanSuccessMessage] = useState<string | null>(null);
  const [scanErrorMessage, setScanErrorMessage] = useState<string | null>(null);

  // Scanner Auto-Trigger Watcher Logic
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    // Trigger countdown only when both serials contain data and no current states are processing
    if (lhSerial.trim() && rhSerial.trim() && countdown === null && !isProcessing && !showLineModal && !scanSuccessMessage && !scanErrorMessage) {
      setCountdown(5);
    }

    // Handle active countdown processing tick
    if (countdown !== null && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0) {
      handleScanExecution();
    }

    return () => clearTimeout(timer);
  }, [lhSerial, rhSerial, countdown, isProcessing, showLineModal, scanSuccessMessage, scanErrorMessage]);

  // Handle Scan Execution & API Post Request
  const handleScanExecution = async () => {
    if (!lhSerial.trim() || !rhSerial.trim() || !lineId || isProcessing) return;

    setCountdown(null);
    setIsProcessing(true);
    setScanSuccessMessage(null);
    setScanErrorMessage(null);

    const computedPayload = {
      lh_serial: lhSerial.trim(),
      rh_serial: rhSerial.trim(),
      line_id: lineId
    };

    console.log("BASE-MES: Dispatching Module Line Scan Payload...", computedPayload);

    try {
      const response = await fetch(`${BASE_URL}/api/v1/production/module-line/validate-and-scan`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(computedPayload)
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle explicit structured backend HTTP exceptions cleanly
        throw new Error(data.detail || `Validation failed with server code: ${response.status}`);
      }

      // Extract generated module serial from response mapping schema
      const assignedSerial = data.module_serial || data.allocated_module_serial || "MOD-ASSIGNED";
      setModuleSerial(assignedSerial);
      setScanSuccessMessage(`Verified & Registered! Allocated Serial: ${assignedSerial}`);

      // Auto-reset station after 3 seconds for fresh scan
      setTimeout(() => {
        resetScanningInputs();
        setScanSuccessMessage(null);
      }, 3000);

    } catch (err: any) {
      console.error("Module Line Scan Execution Error:", err);
      // Populate inline error state display card mapping variables
      setScanErrorMessage(err.message || "Failed to communicate with local MES gateway process.");
      
      // Auto-clear validation hazard block after 5 seconds to reset terminal workflow loop
      setTimeout(() => {
        resetScanningInputs();
        setScanErrorMessage(null);
      }, 5000);
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset current station inputs
  const resetScanningInputs = () => {
    setLhSerial("");
    setRhSerial("");
    setCountdown(null);
    setModuleSerial("MOD-2026-XXXXX");
  };

  // Process selected manufacturing line option configuration
  const handleLineConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalSelection) {
      setSelectedLine(modalSelection);
      setLineId(modalSelection === "Line 1" ? 1 : 2);
      setShowLineModal(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl w-full mx-auto relative font-sans text-slate-800">
      
      {/* ------------------------------------------------------------------------- */}
      {/* INITIAL RUN INTERLOCK: LINE SELECTION POP-UP WINDOW OVERLAY */}
      {/* ------------------------------------------------------------------------- */}
      {showLineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-cyan-200/80 max-w-md w-full p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200 text-slate-900">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="p-2.5 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-600">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Line Configuration Required</h2>
                <p className="text-xs text-slate-500">Initialize shop floor layout environment context</p>
              </div>
            </div>

            <form onSubmit={handleLineConfirm} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Select Assembly Line
                </label>
                <select
                  required
                  value={modalSelection}
                  onChange={(e) => setModalSelection(e.target.value)}
                  className="block w-full rounded-xl border border-cyan-200/80 bg-slate-50 p-3 text-sm text-slate-900 focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-cyan-500/15 transition-all font-medium cursor-pointer"
                >
                  <option value="" disabled>-- Select Allocation Line --</option>
                  <option value="Line 1">Line 1 (PARI)</option>
                  <option value="Line 2">Line 2 (RUHLAMAT)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={!modalSelection}
                className="w-full flex justify-center items-center rounded-xl bg-cyan-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-cyan-600/20 hover:bg-cyan-500 disabled:opacity-40 disabled:pointer-events-none transition-all active:scale-[0.99] cursor-pointer"
              >
                Initialize Terminal Station
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* TERMINAL WORKING DASHBOARD FRAMEWORK */}
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
            {/* Dynamic Active Production Line Identifier display */}
            {selectedLine && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-cyan-100 text-cyan-900 border border-cyan-300 mb-1">
                <Layers className="w-3 h-3 text-cyan-700" /> {selectedLine} (ID: {lineId})
              </span>
            )}
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Boxes className="w-6 h-6 text-cyan-600" /> Module Line Terminal
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Component Registration & Serial Mapping Station</p>
          </div>
        </div>

        {/* Module ID Layout Box */}
        <div className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-right shadow-md border border-slate-800">
          <span className="block text-[10px] uppercase font-bold tracking-widest text-cyan-400">Assigned Module Serial</span>
          <span className="font-mono text-sm font-semibold tracking-wider text-white">{moduleSerial}</span>
        </div>
      </div>

      {/* Core Workspace Grid Layout Split */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        
        {/* Left inputs column block */}
        <div className={`md:col-span-2 bg-white/70 backdrop-blur-md border p-6 rounded-2xl shadow-sm space-y-6 transition-all duration-300 ${
          scanErrorMessage ? 'border-rose-300 bg-rose-50/20' : 'border-cyan-200/60'
        }`}>
          <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2">Hardware Wedge Capture</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* LH Serial Entry Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">LH Serial Number</label>
              <div className="relative mt-2 rounded-xl shadow-xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <QrCode className="h-5 w-5 text-cyan-600/70" />
                </div>
                <input
                  type="text"
                  value={lhSerial}
                  disabled={showLineModal || isProcessing}
                  onChange={(e) => { setLhSerial(e.target.value); setCountdown(null); setScanErrorMessage(null); }}
                  className="block w-full rounded-xl border border-cyan-200/80 bg-white/90 py-3 pl-11 pr-3 font-mono text-xs text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-cyan-500/15 transition-all disabled:opacity-50"
                  placeholder="Scan LH Component"
                />
              </div>
            </div>

            {/* RH Serial Entry Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">RH Serial Number</label>
              <div className="relative mt-2 rounded-xl shadow-xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <QrCode className="h-5 w-5 text-cyan-600/70" />
                </div>
                <input
                  type="text"
                  value={rhSerial}
                  disabled={showLineModal || isProcessing}
                  onChange={(e) => { setRhSerial(e.target.value); setCountdown(null); setScanErrorMessage(null); }}
                  className="block w-full rounded-xl border border-cyan-200/80 bg-white/90 py-3 pl-11 pr-3 font-mono text-xs text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-cyan-500/15 transition-all disabled:opacity-50"
                  placeholder="Scan RH Component"
                />
              </div>
            </div>
          </div>

          {/* Main Primary Interactive Scan Button Section */}
          <div className="pt-4 flex flex-col sm:flex-row gap-4">
            <button
              type="button"
              onClick={handleScanExecution}
              disabled={!lhSerial || !rhSerial || isProcessing || showLineModal}
              className="flex-1 flex justify-center items-center gap-2 rounded-xl bg-cyan-600 px-4 py-3.5 text-xs font-bold text-white shadow-md shadow-cyan-600/20 hover:bg-cyan-500 disabled:opacity-40 disabled:pointer-events-none transition-all active:scale-[0.99] cursor-pointer"
            >
              <Cpu className="w-4 h-4" /> {isProcessing ? "Transmitting Scans..." : "Scan & Verify Component"}
            </button>

            <button
              type="button"
              onClick={() => { resetScanningInputs(); setScanErrorMessage(null); setScanSuccessMessage(null); }}
              disabled={showLineModal || isProcessing}
              className="px-5 py-3.5 border border-slate-300 hover:border-slate-400 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer bg-white hover:bg-slate-50 disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4 text-slate-600" /> Reset 
            </button>
          </div>
        </div>

        {/* Right Live Verification Status & Error Context Box */}
        <div className="bg-white/70 backdrop-blur-md border border-cyan-200/60 p-6 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center min-h-[260px]">
          {scanSuccessMessage ? (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-4 rounded-full bg-cyan-100 border border-cyan-300 text-cyan-600 w-fit mx-auto shadow-md">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Registration Complete</h4>
                <p className="text-xs text-slate-600 font-mono max-w-[220px] mx-auto mt-2 font-semibold">
                  {scanSuccessMessage}
                </p>
                <p className="text-[10px] text-slate-400 mt-3 italic">
                  Resetting terminal inputs in 3s for fresh scan...
                </p>
              </div>
            </div>
          ) : scanErrorMessage ? (
            <div className="space-y-4 animate-in fade-in shake duration-300">
              <div className="p-4 rounded-full bg-rose-100 border border-rose-300 text-rose-600 w-fit mx-auto shadow-md">
                <XCircle className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-base font-bold text-rose-950">Interlock Rejection</h4>
                <div className="text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-3 max-w-[230px] mx-auto mt-2 font-semibold text-left leading-relaxed">
                  {scanErrorMessage}
                </div>
                <p className="text-[10px] text-rose-800/60 mt-3 italic">
                  Flushing duplicate logs in 5s to restart cycle...
                </p>
              </div>
            </div>
          ) : countdown !== null ? (
            <div className="space-y-4 animate-pulse">
              <div className="p-4 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 w-fit mx-auto">
                <Timer className="w-10 h-10 animate-spin" style={{ animationDuration: '12s' }} />
              </div>
              <div>
                <h4 className="text-xl font-bold text-amber-950">Auto-Submitting in {countdown}s</h4>
                <p className="text-xs text-amber-900/70 max-w-[200px] mx-auto mt-2">
                  Verifying components against engineering BOM matrices...
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-4 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-600 w-fit mx-auto">
                <QrCode className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Awaiting Hardware Input</h4>
              <p className="text-xs text-slate-500 max-w-[180px] mx-auto leading-relaxed">
                {showLineModal ? "Please choose assembly line configuration to unlock scanner data ingestion." : "Wedge input signals active. Awaiting serial numbers parsing cycle."}
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}