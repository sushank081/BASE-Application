"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Layers,
  ArrowLeft,
  RefreshCw,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  PlayCircle,
  PauseCircle,
  RotateCcw,
  Gauge,
  Zap,
  Activity,
  ShieldCheck,
  PackageCheck,
  Boxes,
  Cpu,
  Database,
  Download,
  Calendar
} from "lucide-react";
import { BASE_URL } from "../../../../utils/utilsapi";

type TimeRangeOption = "all" | "day" | "week" | "month";

interface StatusMaterialCount {
  total: number;
  by_material: Record<string, number>;
}

interface PassFailByMaterial {
  passed: number;
  failed: number;
  wip: number;
  total: number;
  passed_by_material: Record<string, number>;
  failed_by_material: Record<string, number>;
  wip_by_material: Record<string, number>;
}

interface MetricsData {
  status: string;
  work_orders: {
    scheduled: StatusMaterialCount;
    started: StatusMaterialCount;
    reworked: StatusMaterialCount;
    hold: StatusMaterialCount;
    completed: StatusMaterialCount;
    total_all_status: number;
  };
  pack_stations: {
    completed_pack_line: StatusMaterialCount;
    leak_test: PassFailByMaterial;
    pre_eol: PassFailByMaterial;
    eol_chroma: PassFailByMaterial;
    pdi: PassFailByMaterial;
  };
}

export default function PackDashboardAnalyticsPage() {
  const router = useRouter();

  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRangeOption>("all");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  const fetchMetrics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const cleanBase = (BASE_URL || "").replace(/\/+$/, "");
      const res = await fetch(
        `${cleanBase}/api/v1/production/pack-dashboard/metrics-summary?time_range=${timeRange}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || `HTTP ${res.status}: Failed to fetch metrics`);
      }

      setMetrics(data);
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.error("Failed to load metrics summary:", err);
      setError(err.message || "Network error loading metrics summary");
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Auto-refresh interval (every 30 seconds)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchMetrics();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchMetrics]);

  // -------------------------------------------------------------------------
  // EXPORT TO EXCEL / CSV WITH DEDICATED TABLES PER STATION
  // -------------------------------------------------------------------------
  const exportToExcel = () => {
    if (!metrics) return;

    const rows: string[][] = [];

    // Header Meta & Report Overview
    rows.push(["BATTERY PACK ASSEMBLY - SHOP FLOOR PRODUCTION METRICS REPORT"]);
    rows.push(["Generated Date & Time", new Date().toLocaleString()]);
    rows.push(["Active Time Window", timeRange.toUpperCase()]);
    rows.push(["System API Status", metrics.status]);
    rows.push([]);

    // =========================================================================
    // TABLE 1: WORK ORDER PRODUCTION STATUS
    // =========================================================================
    rows.push(["============================================================"]);
    rows.push(["TABLE 1: WORK ORDERS PRODUCTION STATUS"]);
    rows.push(["============================================================"]);
    rows.push([
      "Material Number",
      "Scheduled (Qty)",
      "Started (Qty)",
      "Completed (Qty)",
      "Reworked (Qty)",
      "On Hold (Qty)",
      "Total Orders (Qty)"
    ]);

    const woMaterials = Array.from(
      new Set([
        ...Object.keys(metrics.work_orders.scheduled.by_material || {}),
        ...Object.keys(metrics.work_orders.started.by_material || {}),
        ...Object.keys(metrics.work_orders.completed.by_material || {}),
        ...Object.keys(metrics.work_orders.reworked.by_material || {}),
        ...Object.keys(metrics.work_orders.hold.by_material || {}),
      ])
    ).sort();

    if (woMaterials.length === 0) {
      rows.push(["No Data Logged", "0", "0", "0", "0", "0", "0"]);
    } else {
      woMaterials.forEach((mat) => {
        const sched = metrics.work_orders.scheduled.by_material[mat] || 0;
        const start = metrics.work_orders.started.by_material[mat] || 0;
        const comp = metrics.work_orders.completed.by_material[mat] || 0;
        const rew = metrics.work_orders.reworked.by_material[mat] || 0;
        const hld = metrics.work_orders.hold.by_material[mat] || 0;
        const rowTotal = sched + start + comp + rew + hld;

        rows.push([
          `="${mat}"`,
          sched.toString(),
          start.toString(),
          comp.toString(),
          rew.toString(),
          hld.toString(),
          rowTotal.toString()
        ]);
      });
    }

    rows.push([
      "TOTAL WORK ORDERS",
      metrics.work_orders.scheduled.total.toString(),
      metrics.work_orders.started.total.toString(),
      metrics.work_orders.completed.total.toString(),
      metrics.work_orders.reworked.total.toString(),
      metrics.work_orders.hold.total.toString(),
      metrics.work_orders.total_all_status.toString()
    ]);
    rows.push([]);
    rows.push([]);

    // =========================================================================
    // TABLE 2: PACK MARRIAGE (ASSEMBLY)
    // =========================================================================
    rows.push(["============================================================"]);
    rows.push(["TABLE 2: PACK MARRIAGE (ASSEMBLY COMPLETED)"]);
    rows.push(["============================================================"]);
    rows.push(["Material Number", "Linked & Completed Packs (Qty)"]);

    const packMarriageMats = Object.keys(metrics.pack_stations.completed_pack_line.by_material).sort();
    if (packMarriageMats.length === 0) {
      rows.push(["No Data Logged", "0"]);
    } else {
      packMarriageMats.forEach((mat) => {
        const cnt = metrics.pack_stations.completed_pack_line.by_material[mat] || 0;
        rows.push([`="${mat}"`, cnt.toString()]);
      });
    }
    rows.push([
      "TOTAL PACK MARRIAGE",
      metrics.pack_stations.completed_pack_line.total.toString()
    ]);
    rows.push([]);
    rows.push([]);

    // Helper to generate a dedicated table for each inspection station
    const appendStationTable = (tableNumber: number, stationTitle: string, stationData: PassFailByMaterial) => {
      rows.push(["============================================================"]);
      rows.push([`TABLE ${tableNumber}: ${stationTitle.toUpperCase()}`]);
      rows.push(["============================================================"]);
      rows.push([
        "Material Number",
        "Passed (Qty)",
        "Failed (Qty)",
        "WIP (Under Rework) (Qty)",
        "Total Tested (Qty)"
      ]);

      const allMats = Array.from(
        new Set([
          ...Object.keys(stationData.passed_by_material || {}),
          ...Object.keys(stationData.failed_by_material || {}),
          ...Object.keys(stationData.wip_by_material || {}),
        ])
      ).sort();

      if (allMats.length === 0) {
        rows.push(["No Data Logged", "0", "0", "0", "0"]);
      } else {
        allMats.forEach((mat) => {
          const p = stationData.passed_by_material[mat] || 0;
          const f = stationData.failed_by_material[mat] || 0;
          const w = stationData.wip_by_material[mat] || 0;
          const totalTested = p + f + w;

          rows.push([
            `="${mat}"`,
            p.toString(),
            f.toString(),
            w.toString(),
            totalTested.toString()
          ]);
        });
      }

      rows.push([
        `TOTAL ${stationTitle.toUpperCase()}`,
        stationData.passed.toString(),
        stationData.failed.toString(),
        stationData.wip.toString(),
        stationData.total.toString()
      ]);
      rows.push([]);
      rows.push([]);
    };

    // =========================================================================
    // TABLES 3 TO 6: INDIVIDUAL STATION PASS / FAIL / WIP TABLES
    // =========================================================================
    appendStationTable(3, "Leak Test Station", metrics.pack_stations.leak_test);
    appendStationTable(4, "Pre-EOL Test Station", metrics.pack_stations.pre_eol);
    appendStationTable(5, "EOL / Chroma Test Station", metrics.pack_stations.eol_chroma);
    appendStationTable(6, "PDI Final Gate Station", metrics.pack_stations.pdi);

    // Build and download CSV file with UTF-8 BOM for Excel
    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\r\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Pack_Production_Metrics_${timeRange.toUpperCase()}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 font-sans text-slate-800">
      
      {/* --------------------------------------------------------------------- */}
      {/* SOLID HEADER BAR (NO GLASS EFFECT) */}
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
              
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2 mt-1">
              <Activity className="w-6 h-6 text-cyan-400 animate-pulse" /> Battery Pack Assembly Telemetry
            </h1>
          </div>
        </div>

        {/* Time-Range Selector, Refresh & Export Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 self-end lg:self-center">
          
          {/* Time Range Filter Pills */}
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 shadow-inner">
            <button
              onClick={() => setTimeRange("all")}
              className={`px-3 py-1 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer ${
                timeRange === "all"
                  ? "bg-cyan-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setTimeRange("day")}
              className={`px-3 py-1 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer ${
                timeRange === "day"
                  ? "bg-cyan-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setTimeRange("week")}
              className={`px-3 py-1 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer ${
                timeRange === "week"
                  ? "bg-cyan-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setTimeRange("month")}
              className={`px-3 py-1 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer ${
                timeRange === "month"
                  ? "bg-cyan-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              This Month
            </button>
          </div>

          {/* Export to CSV / Excel Button */}
          <button
            onClick={exportToExcel}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-cyan-500/40 bg-cyan-900/40 hover:bg-cyan-800/60 text-xs font-bold font-mono text-cyan-200 transition-all cursor-pointer shadow-sm"
            title="Export all station tables to Excel / CSV"
          >
            <Download className="w-3.5 h-3.5 text-cyan-300" /> EXPORT EXCEL
          </button>

          {/* 30s Poll Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono text-slate-300 shadow-inner">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                autoRefresh ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-slate-500"
              }`}
            />
            {autoRefresh ? "30s" : "PAUSED"}
          </div>

          <button
            onClick={() => setAutoRefresh((prev) => !prev)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-bold font-mono text-slate-200 transition-all cursor-pointer"
          >
            {autoRefresh ? "PAUSE" : "RESUME"}
          </button>

          <button
            onClick={() => fetchMetrics()}
            disabled={isLoading}
            className="p-2 rounded-xl bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
            title="Refresh Metrics Now"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50/90 backdrop-blur-md border border-rose-200 text-rose-900 text-xs font-mono flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>METRIC RECOVERY ERROR: {error}</span>
          </div>
          <button
            onClick={() => fetchMetrics()}
            className="text-xs font-bold text-rose-700 underline cursor-pointer"
          >
            Retry Poll
          </button>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 1: WORK ORDERS PRODUCTION STATUS (WHITE MATTE GLASS) */}
      {/* --------------------------------------------------------------------- */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 font-mono">
            <ClipboardList className="w-4 h-4 text-slate-700" /> Work Orders Production Status
          </h2>
          <span className="text-[11px] font-mono text-slate-800 font-bold bg-white/70 backdrop-blur-xl px-2.5 py-1 rounded-lg border border-white/60 shadow-xs flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-cyan-600" />
            TOTAL POs: <span className="text-slate-950 font-black">{metrics?.work_orders.total_all_status ?? 0}</span> | SYNC: {lastRefreshed || "—"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          
          {/* 1. Scheduled */}
          {renderWorkOrderStatusCard(
            "Scheduled",
            <Clock className="w-4 h-4 text-slate-600" />,
            metrics?.work_orders.scheduled
          )}

          {/* 2. Started */}
          {renderWorkOrderStatusCard(
            "Started",
            <PlayCircle className="w-4 h-4 text-slate-600" />,
            metrics?.work_orders.started
          )}

          {/* 3. Completed */}
          {renderWorkOrderStatusCard(
            "Completed",
            <CheckCircle2 className="w-4 h-4 text-slate-600" />,
            metrics?.work_orders.completed
          )}

          {/* 4. Reworked */}
          {renderWorkOrderStatusCard(
            "Reworked",
            <RotateCcw className="w-4 h-4 text-slate-600" />,
            metrics?.work_orders.reworked
          )}

          {/* 5. Hold */}
          {renderWorkOrderStatusCard(
            "On Hold",
            <PauseCircle className="w-4 h-4 text-slate-600" />,
            metrics?.work_orders.hold
          )}

        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 2: PRODUCTION STATIONS & QUALITY METRICS (WHITE MATTE GLASS) */}
      {/* --------------------------------------------------------------------- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 font-mono">
            <Layers className="w-4 h-4 text-slate-700" /> Station Throughput & Material Number Breakdown
          </h2>
          <span className="text-[11px] font-mono text-slate-600 flex items-center gap-1">
            <Database className="w-3.5 h-3.5 text-slate-600" /> Window: {timeRange.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">

          {/* Card 1: Pack Marriage Completed */}
          <div className="bg-white/70 backdrop-blur-xl border border-white/60 hover:border-slate-300 rounded-2xl p-4 shadow-lg flex flex-col justify-between text-slate-900 transition-all">
            <div>
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <PackageCheck className="w-4 h-4 text-slate-700" />
                  <h3 className="font-bold text-slate-900 text-xs font-mono uppercase tracking-wider">Pack Marriage</h3>
                </div>
                <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-100/90 text-slate-700 border border-slate-200">
                  Assembly
                </span>
              </div>

              {/* Big Stat Display */}
              <div className="my-3 bg-white/80 border border-slate-200/80 rounded-xl p-3 text-center shadow-xs">
                <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 block font-bold">
                  Total Linked Packs
                </span>
                <span className="text-3xl font-black font-mono text-slate-900 block mt-0.5 tracking-tight">
                  {metrics?.pack_stations.completed_pack_line.total ?? 0}
                </span>
              </div>
            </div>

            {/* Scrollable Material Breakdown Box */}
            <div className="pt-2 border-t border-slate-200/80">
              <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-600 uppercase mb-2">
                <span className="flex items-center gap-1">
                  <Boxes className="w-3 h-3 text-slate-600" /> Material Number
                </span>
                <span>Count</span>
              </div>

              <div className="space-y-1.5 h-44 overflow-y-auto pr-1 font-mono scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
                {Object.entries(metrics?.pack_stations.completed_pack_line.by_material || {}).map(
                  ([mat, count]) => (
                    <div
                      key={mat}
                      className="flex justify-between items-center text-[11px] bg-white/80 hover:bg-white p-2 rounded-lg border border-slate-200/70 transition-colors shadow-2xs"
                    >
                      <span className="text-slate-800 font-semibold break-all leading-tight">
                        {mat}
                      </span>
                      <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300 flex-shrink-0 ml-2 shadow-2xs">
                        {count}
                      </span>
                    </div>
                  )
                )}
                {Object.keys(metrics?.pack_stations.completed_pack_line.by_material || {}).length === 0 && (
                  <div className="h-full flex items-center justify-center text-[10px] text-slate-400 italic">
                    No material records logged
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Leak Test */}
          {renderStationQualityCard(
            "Leak Test",
            <Gauge className="w-4 h-4 text-slate-700" />,
            metrics?.pack_stations.leak_test
          )}

          {/* Card 3: Pre-EOL */}
          {renderStationQualityCard(
            "Pre-EOL Station",
            <Zap className="w-4 h-4 text-slate-700" />,
            metrics?.pack_stations.pre_eol
          )}

          {/* Card 4: EOL / Chroma */}
          {renderStationQualityCard(
            "EOL / Chroma",
            <Activity className="w-4 h-4 text-slate-700" />,
            metrics?.pack_stations.eol_chroma
          )}

          {/* Card 5: PDI Station */}
          {renderStationQualityCard(
            "PDI Final Gate",
            <ShieldCheck className="w-4 h-4 text-slate-700" />,
            metrics?.pack_stations.pdi
          )}

        </div>
      </div>

    </div>
  );
}

/**
 * Reusable White Matte Glass Work Order KPI Card
 */
function renderWorkOrderStatusCard(
  title: string,
  icon: React.ReactNode,
  data: StatusMaterialCount | undefined
) {
  const total = data?.total ?? 0;
  const byMaterial = data?.by_material || {};

  return (
    <div className="bg-white/70 backdrop-blur-xl border border-white/60 hover:border-slate-300 rounded-2xl p-3.5 shadow-lg flex flex-col justify-between text-slate-900 transition-all">
      <div>
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-700">
            {title}
          </span>
          {icon}
        </div>

        {/* Big Number KPI */}
        <div className="my-2.5 bg-white/80 border border-slate-200/80 rounded-xl p-2 text-center shadow-xs">
          <span className="text-2xl font-black font-mono text-slate-900 block">
            {total}
          </span>
        </div>
      </div>

      {/* Internal Scrollable Material List */}
      <div className="pt-2 border-t border-slate-200/80">
        <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
          <Boxes className="w-3 h-3 text-slate-600" /> By Material
        </span>

        <div className="space-y-1 h-28 overflow-y-auto pr-1 font-mono text-[10px] scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
          {Object.entries(byMaterial).map(([mat, count]) => (
            <div
              key={mat}
              className="flex justify-between items-center bg-white/80 p-1.5 rounded-md border border-slate-200/70 hover:bg-white transition-colors shadow-2xs"
            >
              <span className="text-slate-800 font-semibold break-all leading-tight">
                {mat}
              </span>
              <span className="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300 flex-shrink-0 ml-1.5 shadow-2xs">
                {count}
              </span>
            </div>
          ))}
          {Object.keys(byMaterial).length === 0 && (
            <div className="h-full flex items-center justify-center text-[10px] text-slate-400 italic">
              0 records
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Reusable White Matte Glass Station Inspection Telemetry Card
 */
function renderStationQualityCard(
  title: string,
  icon: React.ReactNode,
  stationData: PassFailByMaterial | undefined
) {
  const passed = stationData?.passed ?? 0;
  const failed = stationData?.failed ?? 0;
  const wip = stationData?.wip ?? 0;

  // Union of all material keys
  const allMaterials = Array.from(
    new Set([
      ...Object.keys(stationData?.passed_by_material || {}),
      ...Object.keys(stationData?.failed_by_material || {}),
      ...Object.keys(stationData?.wip_by_material || {}),
    ])
  );

  return (
    <div className="bg-white/70 backdrop-blur-xl border border-white/60 hover:border-slate-300 rounded-2xl p-4 shadow-lg flex flex-col justify-between text-slate-900 transition-all">
      <div>
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="font-bold text-slate-900 text-xs font-mono uppercase tracking-wider">{title}</h3>
          </div>
        </div>

        {/* Passed, Failed & WIP Metric Badges in Monochromatic Slate */}
        <div className="my-3 grid grid-cols-3 gap-1.5 text-center">
          <div className="bg-white/80 border border-slate-200/80 rounded-xl p-2 shadow-xs">
            <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
              Passed
            </span>
            <span className="text-lg font-black font-mono text-slate-900 block mt-0.5">
              {passed}
            </span>
          </div>

          <div className="bg-white/80 border border-slate-200/80 rounded-xl p-2 shadow-xs">
            <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
              Failed
            </span>
            <span className="text-lg font-black font-mono text-slate-900 block mt-0.5">
              {failed}
            </span>
          </div>

          <div className="bg-white/80 border border-slate-200/80 rounded-xl p-2 shadow-xs">
            <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
              WIP
            </span>
            <span className="text-lg font-black font-mono text-slate-900 block mt-0.5">
              {wip}
            </span>
          </div>
        </div>
      </div>

      {/* Internal Scrollable Material List */}
      <div className="pt-2 border-t border-slate-200/80">
        <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-600 uppercase mb-2">
          <span className="flex items-center gap-1">
            <Boxes className="w-3 h-3 text-slate-600" /> Material Number
          </span>
          <span>P / F / W</span>
        </div>

        <div className="space-y-1.5 h-44 overflow-y-auto pr-1 font-mono scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
          {allMaterials.map((mat) => {
            const p = stationData?.passed_by_material?.[mat] || 0;
            const f = stationData?.failed_by_material?.[mat] || 0;
            const w = stationData?.wip_by_material?.[mat] || 0;

            return (
              <div
                key={mat}
                className="flex flex-col gap-1 text-[11px] bg-white/80 hover:bg-white p-2 rounded-lg border border-slate-200/70 transition-colors shadow-2xs"
              >
                {/* Full, untruncated material number */}
                <span className="text-slate-900 font-bold break-all leading-tight">
                  {mat}
                </span>
                
                {/* Score Pill Row */}
                <div className="flex items-center justify-between gap-1 text-[10px] pt-0.5">
                  <span className="text-slate-800 font-bold bg-slate-100 border border-slate-300 px-2 py-0.5 rounded shadow-2xs">
                    P: {p}
                  </span>
                  <span className="text-slate-800 font-bold bg-slate-100 border border-slate-300 px-2 py-0.5 rounded shadow-2xs">
                    F: {f}
                  </span>
                  <span className="text-slate-800 font-bold bg-slate-100 border border-slate-300 px-2 py-0.5 rounded shadow-2xs">
                    WIP: {w}
                  </span>
                </div>
              </div>
            );
          })}
          {allMaterials.length === 0 && (
            <div className="h-full flex items-center justify-center text-[10px] text-slate-400 italic">
              No inspection records
            </div>
          )}
        </div>
      </div>
    </div>
  );
}