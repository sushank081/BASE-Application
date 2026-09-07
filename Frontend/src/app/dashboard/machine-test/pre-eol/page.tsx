"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Activity, 
  ArrowLeft, 
  QrCode, 
  Check, 
  X,
  RotateCcw,
  Send,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { BASE_URL } from "../../../../utils/utilsapi";

export default function PreEOLPage() {
  const router = useRouter();

  // State Variables
  const [packSerial, setPackSerial] = useState("");
  const [testResult, setTestResult] = useState<"PASS" | "FAIL" | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Custom Visual Alert Banner Container States
  const [scanSuccessMessage, setScanSuccessMessage] = useState<string | null>(null);
  const [scanErrorMessage, setScanErrorMessage] = useState<string | null>(null);

  // Form Submission Execution Loop using live API gateway integration
  const handleSubmitTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packSerial.trim() || !testResult || isProcessing) return;

    setIsProcessing(true);
    setScanSuccessMessage(null);
    setScanErrorMessage(null);

    // Realigned to match backend PreEolValidationPayload parameter keys perfectly
    const computedPayload = {
      BatteryPackNumber: packSerial.trim(),
      Status: testResult,
      ErrorInformation: testResult === "FAIL" ? "Pre-EOL Continuity test machine rejection logged." : "",
      FailReason: testResult === "FAIL" ? "Electrical Insulation Fault" : ""
    };

    console.log("BASE-MES: Transmitting Pre-EOL validation state telemetry...", computedPayload);

    try {
      const response = await fetch(`${BASE_URL}/api/v1/production/pre-eol/process-result`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(computedPayload)
      });

      const data = await response.json();

      if (!response.ok) {
        // Unpack structured array exceptions safely if dropped by Pydantic validator checks
        if (Array.isArray(data.detail)) {
          const parsedDetailError = data.detail
            .map((err: any) => `Field [${err.loc[1] || "Payload"}]: ${err.msg}`)
            .join(" | ");
          setScanErrorMessage(parsedDetailError);
          return;
        }
        
        // Handle normal explicit custom HTTP string updates thrown by backend gates
        setScanErrorMessage(data.detail || `Pre-EOL gate rejected payload with status: ${response.status}`);
        return;
      }

      // Success Path Configuration Layout
      setScanSuccessMessage(`Inspection Transmitted! Status: ${data.saved_status || "PASSED"}`);

      // Auto-refresh station context variables after 3 seconds for clean cycle loops
      setTimeout(() => {
        handleResetStation();
        setScanSuccessMessage(null);
      }, 3000);

    } catch (err: any) {
      console.error("MES Operational Exception Context:", err);
      setScanErrorMessage("Network Gateway Disconnected: Failed to establish contact with local MES engine.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset Station State
  const handleResetStation = () => {
    setPackSerial("");
    setTestResult(null);
  };

  return (
    <div className="space-y-8 max-w-5xl w-full mx-auto text-slate-800 font-sans">
      
      {/* Navigation Header Bar */}
      <div className="flex items-center justify-between border-b border-cyan-200/60 pb-5">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push("/dashboard/machine-test")}
            className="p-2.5 rounded-xl bg-white/80 hover:bg-white border border-cyan-200/80 text-slate-800 transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-cyan-700" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Activity className="w-6 h-6 text-cyan-600" /> Pre-EOL Terminal
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5 font-sans">Electrical Component Integration Validation Station</p>
          </div>
        </div>
      </div>

      {/* Main Core Layout Workspace Card Split Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        
        {/* Left Side: Capture Selection Panel Form */}
        <form 
          onSubmit={handleSubmitTest} 
          className={`md:col-span-2 bg-white/70 backdrop-blur-md border p-8 rounded-2xl shadow-sm space-y-8 transition-all duration-300 ${
            scanErrorMessage ? 'border-rose-300 bg-rose-50/20' : 'border-cyan-200/60'
          }`}
        >
          <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2">Electrical Status Capture</h3>
          
          {/* 1. Battery Pack Serial Input Field */}
          <div className="max-w-xl">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Battery Pack Serial</label>
            <div className="relative mt-2 rounded-xl shadow-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <QrCode className="h-5 w-5 text-cyan-600/70" />
              </div>
              <input
                type="text"
                required
                disabled={isProcessing}
                value={packSerial}
                onChange={(e) => { setPackSerial(e.target.value); setScanErrorMessage(null); }}
                className="block w-full rounded-xl border border-cyan-200/80 bg-white/90 py-3 pl-11 pr-3 font-mono text-sm text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-cyan-500/15 transition-all uppercase disabled:opacity-50"
                placeholder="Scan Pack Serial Number"
              />
            </div>
          </div>

          {/* 2. Interactive Selection Box Matrix (Pass / Fail Selection) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">Result</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
              
              {/* PASS Checkbox Card */}
              <div 
                onClick={() => !isProcessing && setTestResult("PASS")}
                className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all select-none
                  ${testResult === "PASS"
                    ? "bg-cyan-50 border-cyan-500 text-slate-900 shadow-md"
                    : "bg-white/60 border-slate-200 text-slate-400 hover:bg-white hover:border-slate-300"
                  } ${isProcessing ? "pointer-events-none opacity-50" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg border ${testResult === "PASS" ? "bg-cyan-600 text-white border-cyan-600" : "bg-slate-100 border-slate-200 text-transparent"}`}>
                    <Check className="w-4 h-4" />
                  </div>
                  <span className={`text-base font-bold ${testResult === "PASS" ? "text-cyan-900" : "text-slate-700"}`}>
                    Pass
                  </span>
                </div>
              </div>

              {/* FAIL Checkbox Card */}
              <div 
                onClick={() => !isProcessing && setTestResult("FAIL")}
                className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all select-none
                  ${testResult === "FAIL"
                    ? "bg-rose-50 border-rose-500 text-rose-950 shadow-md"
                    : "bg-white/60 border-slate-200 text-slate-400 hover:bg-white hover:border-slate-300"
                  } ${isProcessing ? "pointer-events-none opacity-50" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg border ${testResult === "FAIL" ? "bg-rose-600 text-white border-rose-600" : "bg-slate-100 border-slate-200 text-transparent"}`}>
                    <X className="w-4 h-4" />
                  </div>
                  <span className={`text-base font-bold ${testResult === "FAIL" ? "text-rose-900" : "text-slate-700"}`}>
                    Fail
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* Action Buttons Footer Bar */}
          <div className="pt-6 flex flex-col sm:flex-row gap-4 border-t border-slate-200">
            <button
              type="submit"
              disabled={!packSerial.trim() || !testResult || isProcessing}
              className="flex-1 flex justify-center items-center gap-2 rounded-xl bg-cyan-600 px-4 py-3.5 text-sm font-bold text-white shadow-md shadow-cyan-600/20 hover:bg-cyan-500 disabled:opacity-40 disabled:pointer-events-none transition-all active:scale-[0.99] cursor-pointer"
            >
              <Send className="w-4 h-4" /> {isProcessing ? "Transmitting Logs..." : "Submit Inspection"}
            </button>

            <button
              type="button"
              onClick={() => { handleResetStation(); setScanErrorMessage(null); }}
              disabled={isProcessing}
              className="px-5 py-3.5 border border-slate-300 hover:border-slate-400 text-slate-700 font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer bg-white hover:bg-slate-50 disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" /> Clear Fields
            </button>
          </div>
        </form>

        {/* Right Side: Interactive Response Telemetry Panel Display */}
        <div className="bg-white/70 backdrop-blur-md border border-cyan-200/60 p-6 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center min-h-[280px]">
          {scanSuccessMessage ? (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-4 rounded-full bg-cyan-100 border border-cyan-300 text-cyan-600 w-fit mx-auto shadow-md">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Record Saved</h4>
                <p className="text-xs text-slate-600 font-mono max-w-[220px] mx-auto mt-2 font-semibold">
                  {scanSuccessMessage}
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
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-4 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-600 w-fit mx-auto">
                <QrCode className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Awaiting Diagnostics</h4>
              <p className="text-xs text-slate-500 max-w-[180px] mx-auto leading-relaxed">
                Scan assembly footprint tracking numbers and select execution verdict metrics.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}