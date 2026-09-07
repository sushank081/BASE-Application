"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  BarChart3, 
  RotateCcw, 
  Layers, 
  Boxes, 
  Activity, 
  CheckCircle2, 
  PlayCircle, 
  AlertTriangle, 
  Clock,
  TrendingUp,
  PackageCheck
} from "lucide-react";
import { BASE_URL } from "../../utils/utilsapi";

interface MaterialCount {
  material_number: string;
  count: number;
}

interface AnalyticsData {
  modules: {
    total_fresh_module_wos: number;
    total_completed_module_wos: number;
    line_1: { fresh_by_material: MaterialCount[]; completed_by_material: MaterialCount[] };
    line_2: { fresh_by_material: MaterialCount[]; completed_by_material: MaterialCount[] };
  };
  packs: {
    total_fresh_pack_wos: number;
    total_started_pack_wos: number;
    total_hold_pack_wos: number;
    started_by_material: MaterialCount[];
    completed_by_material: MaterialCount[];
  };
}

export default function DashboardAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");

  // 1. Live Analytics Telemetry Extraction
  const fetchTelemetry = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/v1/production/dashboard-analytics/`, {
        method: "GET",
        headers: { "Accept": "application/json" }
      });
      if (!response.ok) throw new Error("API network interlock rejected telemetry request.");
      const payload = await response.json();
      setData(payload);
      setLastRefreshed(new Date().toLocaleTimeString('en-US', { hour12: false }));
    } catch (err) {
      console.error("Dashboard Analytics Pull Failure:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Set up continuous 5-minute tracking loop (300,000ms)
  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 300000); 
    return () => clearInterval(interval);
  }, [fetchTelemetry]);

  if (!data) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Activity className="w-8 h-8 text-cyan-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Synchronizing plant-wide shop floor metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl w-full mx-auto p-4 text-slate-800">
      
      {/* ------------------------------------------------------------------------- */}
      {/* HEADER CONTROLS BAR */}
      {/* ------------------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-cyan-200/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-cyan-600" /> Battery Shop Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <span className="text-[11px] font-mono text-slate-600 font-semibold bg-white/80 px-3 py-1.5 rounded-xl border border-cyan-200/80 shadow-sm">
            Last Sync: {lastRefreshed || "00:00:00"}
          </span>
          <button
            onClick={fetchTelemetry}
            disabled={isLoading}
            className="p-2 rounded-xl bg-white/80 hover:bg-white border border-cyan-200/80 text-slate-800 shadow-sm hover:shadow active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className={`w-4 h-4 text-cyan-700 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* SECTION 1: MODULE MANUFACTURING STREAMS */}
      {/* ------------------------------------------------------------------------- */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold tracking-wider text-slate-600 uppercase flex items-center gap-2">
          <Boxes className="w-4 h-4 text-cyan-600" /> Module Assembly Line
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-200/80 p-5 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <span className="block text-xs font-bold text-amber-800/80 uppercase tracking-wider">Total Scheduled WO</span>
              <span className="block text-3xl font-bold text-amber-950 mt-1 font-mono">{data.modules.total_fresh_module_wos}</span>
            </div>
            <Clock className="w-8 h-8 text-amber-600/30" />
          </div>

          <div className="bg-gradient-to-br from-cyan-50 to-white border border-cyan-200/80 p-5 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <span className="block text-xs font-bold text-cyan-900/80 uppercase tracking-wider">Total Completed WO</span>
              <span className="block text-3xl font-bold text-slate-900 mt-1 font-mono">{data.modules.total_completed_module_wos}</span>
            </div>
            <CheckCircle2 className="w-8 h-8 text-cyan-600/30" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {["line_1", "line_2"].map((lineKey, index) => {
            const lineData = data.modules[lineKey as "line_1" | "line_2"];
            return (
              <div key={lineKey} className="bg-white/70 backdrop-blur-md border border-cyan-200/60 rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-slate-900 text-cyan-400 px-4 py-3 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800">
                  <Layers className="w-3.5 h-3.5" /> Line {index + 1} {index === 0 ? "PARI" : "RUHLAMAT"} DB
                </div>
                
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1"><Clock className="w-3 h-3" /> Scheduled Quantity</span>
                    {lineData.fresh_by_material.length === 0 ? (
                      <p className="text-xs text-slate-400 italic p-2 border border-dashed border-slate-200 rounded-xl">Clear queue</p>
                    ) : (
                      <div className="max-h-40 overflow-y-auto border border-slate-200/80 rounded-xl divide-y divide-slate-100 bg-white/60">
                        {lineData.fresh_by_material.map((item) => (
                          <div key={item.material_number} className="p-2 flex items-center justify-between text-xs font-medium">
                            <span className="font-mono text-slate-700">{item.material_number}</span>
                            <span className="font-mono bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold">{item.count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-cyan-800 uppercase tracking-wider flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Completed Quantity</span>
                    {lineData.completed_by_material.length === 0 ? (
                      <p className="text-xs text-slate-400 italic p-2 border border-dashed border-slate-200 rounded-xl">No outputs logged</p>
                    ) : (
                      <div className="max-h-40 overflow-y-auto border border-slate-200/80 rounded-xl divide-y divide-slate-100 bg-white/60">
                        {lineData.completed_by_material.map((item) => (
                          <div key={item.material_number} className="p-2 flex items-center justify-between text-xs font-medium">
                            <span className="font-mono text-slate-700">{item.material_number}</span>
                            <span className="font-mono bg-cyan-100 text-cyan-900 px-1.5 py-0.5 rounded font-bold">{item.count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* SECTION 2: PACK ASSEMBLY LINES TRACKING */}
      {/* ------------------------------------------------------------------------- */}
      <div className="space-y-4 pt-4">
        <h2 className="text-xs font-bold tracking-wider text-slate-600 uppercase flex items-center gap-2">
          <PackageCheck className="w-4 h-4 text-cyan-600" /> Battery Pack Assembly Line
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white/70 border border-slate-200/80 p-4 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Scheduled Queue</span>
              <span className="block text-2xl font-bold text-slate-900 mt-0.5 font-mono">{data.packs.total_fresh_pack_wos}</span>
            </div>
            <Clock className="w-6 h-6 text-slate-400" />
          </div>

          <div className="bg-gradient-to-br from-sky-50 to-white border border-sky-200/80 p-4 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <span className="block text-[10px] font-bold text-sky-800/80 uppercase tracking-wider">Active In-Process</span>
              <span className="block text-2xl font-bold text-sky-950 mt-0.5 font-mono">{data.packs.total_started_pack_wos}</span>
            </div>
            <PlayCircle className="w-6 h-6 text-sky-500" />
          </div>

          <div className="bg-gradient-to-br from-rose-50 to-white border border-rose-200/80 p-4 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <span className="block text-[10px] font-bold text-rose-800/80 uppercase tracking-wider">Pending Work Orders</span>
              <span className="block text-2xl font-bold text-rose-950 mt-0.5 font-mono">{data.packs.total_hold_pack_wos}</span>
            </div>
            <AlertTriangle className="w-6 h-6 text-rose-500" />
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-md border border-cyan-200/60 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-slate-900 text-cyan-400 px-4 py-3 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800">
            <TrendingUp className="w-3.5 h-3.5" /> Battery Work Order Status
          </div>

          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-sky-900 uppercase tracking-wider flex items-center gap-1">
                <PlayCircle className="w-3.5 h-3.5 text-sky-600" /> Active Work Orders
              </span>
              {data.packs.started_by_material.length === 0 ? (
                <p className="text-xs text-slate-400 italic p-4 border border-dashed border-slate-200 rounded-xl text-center bg-white/40">No packs actively flowing through cells.</p>
              ) : (
                <div className="overflow-hidden border border-slate-200/80 rounded-xl bg-white/80">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold text-[9px] border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2">Material ID</th>
                        <th className="px-4 py-2 text-right">WIP Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {data.packs.started_by_material.map((item) => (
                        <tr key={item.material_number} className="hover:bg-slate-50/80">
                          <td className="px-4 py-2.5 font-mono text-slate-700">{item.material_number}</td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-sky-900">{item.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-bold text-cyan-900 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600" /> Completed Work Orders
              </span>
              {data.packs.completed_by_material.length === 0 ? (
                <p className="text-xs text-slate-400 italic p-4 border border-dashed border-slate-200 rounded-xl text-center bg-white/40">No outputs registered this schedule shift.</p>
              ) : (
                <div className="overflow-hidden border border-slate-200/80 rounded-xl bg-white/80">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold text-[9px] border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2">Material ID</th>
                        <th className="px-4 py-2 text-right">Completed Quantity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {data.packs.completed_by_material.map((item) => (
                        <tr key={item.material_number} className="hover:bg-slate-50/80">
                          <td className="px-4 py-2.5 font-mono text-slate-700">{item.material_number}</td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-cyan-900">{item.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}