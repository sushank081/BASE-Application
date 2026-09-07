"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Wind, 
  ArrowLeft, 
  QrCode, 
  Gauge, 
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Send,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { BASE_URL } from "../../../../utils/utilsapi";

export default function LeakTestPage() {
  const router = useRouter();

  // State Variables
  const [packSerial, setPackSerial] = useState("");
  const [leakValue, setLeakValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Dynamic Telemetry State Windows
  const [scanSuccessMessage, setScanSuccessMessage] = useState<string | null>(null);
  const [scanErrorMessage, setScanErrorMessage] = useState<string | null>(null);

  // Parse leak value to float dynamically for validation check
  const leakNumeric = parseFloat(leakValue);
  const hasValue = !isNaN(leakNumeric) && leakValue.trim() !== "";
  
  // Quality Check Parameter: Pass limit threshold set to 500.0 mbar/s max
  const passLimit = 500.0; 
  const isPassed = hasValue && leakNumeric <= passLimit;

  // Form Submission Execution Loop
  const handleSubmitTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packSerial.trim() || !hasValue || isProcessing) return;

    setIsProcessing(true);
    setScanSuccessMessage(null);
    setScanErrorMessage(null);

    console.log("BASE-MES: Dispatching diagnostics payload to local shop-floor gateway...", {
      packSerial,
      leak_test_value: leakNumeric,
      status: isPassed ? "PASS" : "FAIL"
    });

    try {
      const response = await fetch(`${BASE_URL}/api/v1/production/leak-test/process-result`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          pack_serial: packSerial.trim(),
          leak_test_value: Math.round(leakNumeric), // Cast to integer matching backend expectation
          status: isPassed ? "PASS" : "FAIL"
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // Intercept validation exceptions (e.g., Pydantic structural array errors)
        if (Array.isArray(data.detail)) {
          const parsedDetailError = data.detail
            .map((err: any) => `Field [${err.loc[1] || "Payload"}]: ${err.msg}`)
            .join(" | ");
          setScanErrorMessage(parsedDetailError);
          return;
        }
        throw new Error(data.detail || `Server rejected entry payload with status: ${response.status}`);
      }

      // Success Path Response Handling: Display success message regardless of PASS or FAIL status
      const verdictText = isPassed ? "PASSED" : "FAILED";
      setScanSuccessMessage(data.message || `Leak test logged successfully. Verdict: ${verdictText}`);

      // Auto-clear success visualization panel after 3 seconds and reset station
      setTimeout(() => {
        handleResetStation();
        setScanSuccessMessage(null);
      }, 3000);

    } catch (err: any) {
      console.error("MES Operational Exception Context:", err);
      setScanErrorMessage(err.message || "Network Timeout: Failed to communicate with local MES gateway process.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset Station State
  const handleResetStation = () => {
    setPackSerial("");
    setLeakValue("");
  };

  return (
    <div className="space-y-8 max-w-5xl w-full mx-auto font-sans text-slate-800">
      
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
              <Wind className="w-6 h-6 text-cyan-600" /> Leak Test Terminal
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Hermetic Seal & Pressure Drop Testing Station</p>
          </div>
        </div>
      </div>

      {/* Main Core Layout Workspace Split */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        
        {/* LEFT & CENTER PANEL: Manual & Scanner Inputs */}
        <form 
          onSubmit={handleSubmitTest} 
          className={`md:col-span-2 bg-white/70 backdrop-blur-md border p-6 rounded-2xl shadow-sm flex flex-col justify-between space-y-6 transition-all duration-300 ${
            scanErrorMessage ? 'border-rose-300 bg-rose-50/20' : 'border-cyan-200/60'
          }`}
        >
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2">Diagnostic Input Capture</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Battery Pack Serial Field */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Battery Pack Serial</label>
                <div className="relative mt-2 rounded-xl shadow-xs">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <QrCode className="h-5 w-5 text-cyan-600/70" />
                  </div>
                  <input
                    type="text"
                    required
                    disabled={isProcessing}
                    value={packSerial}
                    onChange={(e) => { setPackSerial(e.target.value); setScanErrorMessage(null); }}
                    className="block w-full rounded-xl border border-cyan-200/80 bg-white/90 py-3 pl-11 pr-3 font-mono text-sm text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-cyan-500/15 transition-all disabled:opacity-50"
                    placeholder="Scan Pack Serial Number"
                  />
                </div>
              </div>

              {/* Leak Rate Input Value Field */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Leak Test Value <span className="text-xs text-slate-400 font-normal">(mbar/s)</span></label>
                <div className="relative mt-2 rounded-xl shadow-xs">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <Gauge className="h-5 w-5 text-cyan-600/70" />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    required
                    disabled={isProcessing}
                    value={leakValue}
                    onChange={(e) => { setLeakValue(e.target.value); setScanErrorMessage(null); }}
                    className="block w-full rounded-xl border border-cyan-200/80 bg-white/90 py-3 pl-11 pr-3 font-mono text-sm text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-cyan-500/15 transition-all disabled:opacity-50"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Execution Button Footer Bar */}
          <div className="pt-4 flex flex-col sm:flex-row gap-4 border-t border-slate-200">
            <button
              type="submit"
              disabled={!packSerial.trim() || !hasValue || isProcessing}
              className="flex-1 flex justify-center items-center gap-2 rounded-xl bg-cyan-600 px-4 py-3.5 text-sm font-bold text-white shadow-md shadow-cyan-600/20 hover:bg-cyan-500 disabled:opacity-40 disabled:pointer-events-none transition-all active:scale-[0.99] cursor-pointer"
            >
              <Send className="w-4 h-4" /> {isProcessing ? "Transmitting Logs..." : "Submit Log Record"}
            </button>

            <button
              type="button"
              onClick={() => { handleResetStation(); setScanErrorMessage(null); }}
              disabled={isProcessing}
              className="px-5 py-3.5 border border-slate-300 hover:border-slate-400 text-slate-700 font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer bg-white hover:bg-slate-50 disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4 text-slate-600" /> Reset 
            </button>
          </div>
        </form>

        {/* RIGHT PANEL: Live Validation Pass/Fail Results & Response Feedback Card */}
        <div className="flex flex-col space-y-4">
          {/* Top Half: Transaction Telemetry Response Display */}
          <div className="bg-white/70 backdrop-blur-md border border-cyan-200/60 p-5 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center min-h-[160px] flex-1">
            {scanSuccessMessage ? (
              <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                <div className="p-3 rounded-full bg-cyan-100 border border-cyan-300 text-cyan-600 w-fit mx-auto shadow-md">
                  <CheckCircle2 className="w-8 h-8 animate-bounce" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Record Transmitted</h4>
                  <p className="text-xs text-slate-600 max-w-[200px] mx-auto mt-1.5 font-mono bg-slate-50 border border-slate-200 rounded-lg p-2 font-semibold">
                    {scanSuccessMessage}
                  </p>
                </div>
              </div>
            ) : scanErrorMessage ? (
              <div className="space-y-3 animate-in fade-in shake duration-300">
                <div className="p-3 rounded-full bg-rose-100 border border-rose-300 text-rose-600 w-fit mx-auto shadow-md">
                  <XCircle className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-rose-950">Interlock Violation</h4>
                  <div className="text-[11px] text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-3 max-w-[220px] mx-auto mt-1.5 font-semibold text-left leading-relaxed">
                    {scanErrorMessage}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="p-3 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-600 w-fit mx-auto">
                  <Gauge className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-bold text-slate-700">Awaiting Network Actions</h4>
                <p className="text-[11px] text-slate-400 max-w-[160px] mx-auto leading-relaxed">
                  Data payload telemetry responses display here automatically.
                </p>
              </div>
            )}
          </div>

          {/* Bottom Half: Pre-Flight Parametric Pass/Fail Threshold Alert Box */}
          <div className={`backdrop-blur-md border rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center transition-all duration-300 min-h-[220px]
            ${!hasValue 
              ? "bg-white/70 border-cyan-200/60 text-slate-400" 
              : isPassed 
                ? "bg-cyan-50 border-cyan-400 text-slate-900 shadow-md shadow-cyan-900/5" 
                : "bg-rose-50 border-rose-400 text-rose-950 shadow-md shadow-rose-900/5"
            }`}
          >
            {!hasValue ? (
              <div className="space-y-3">
                <div className="p-4 rounded-full bg-slate-100 border border-slate-200 text-slate-400 w-fit mx-auto">
                  <Gauge className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-bold text-slate-500">Awaiting Calculations</h4>
              </div>
            ) : isPassed ? (
              <div className="space-y-4 animate-fadeIn">
                <div className="p-4 rounded-full bg-cyan-100 border border-cyan-300 text-cyan-600 w-fit mx-auto shadow-md">
                  <CheckCircle className="w-10 h-10 animate-pulse" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-cyan-900 bg-cyan-200/70 border border-cyan-300 px-3 py-1 rounded-full">
                    PASSED
                  </span>
                  <h4 className="text-2xl font-black text-slate-900 mt-3">{leakNumeric.toFixed(2)} mbar/s</h4>
                  <p className="text-xs text-slate-600 max-w-[180px] mx-auto mt-2">
                    Leak value is within nominal execution threshold parameters. Clear to seal.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-fadeIn">
                <div className="p-4 rounded-full bg-rose-100 border border-rose-300 text-rose-600 w-fit mx-auto shadow-md">
                  <AlertTriangle className="w-10 h-10 animate-bounce" style={{ animationDuration: '2s' }} />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-rose-900 bg-rose-200/70 border border-rose-300 px-3 py-1 rounded-full">
                    REJECTED / FAILED
                  </span>
                  <h4 className="text-2xl font-black text-rose-950 mt-3">{leakNumeric.toFixed(2)} mbar/s</h4>
                  <p className="text-xs text-rose-800 max-w-[180px] mx-auto mt-2">
                    Hermetic seal failure detected. Route component block to manual troubleshooting bay.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}