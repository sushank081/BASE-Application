"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { 
  FileBarChart2, 
  Boxes, 
  BatteryCharging, 
  CalendarDays, 
  Clock, 
  Layers, 
  Gauge,
  FileSpreadsheet,
  ChevronRight 
} from "lucide-react";

export default function ReportGridPage() {
  const router = useRouter();

  // Configured production line report consoles mapped to their nested route folders
  const stations = [
    { 
      id: "module-wo", 
      name: "Module Work Orders", 
      icon: Boxes, 
      path: "/dashboard/report/module-wo", 
      description: "Module sub-assembly work orders reports" 
    },
    { 
      id: "battery-wo", 
      name: "Battery Work Orders", 
      icon: BatteryCharging, 
      path: "/dashboard/report/pack-wo", 
      description: "Pack assembly line work order history and status tracking" 
    },
    { 
      id: "daily-report", 
      name: "Daily Report", 
      icon: CalendarDays, 
      path: "/dashboard/report/daily-report", 
      description: "Daily output breakdown" 
    },
    { 
      id: "hourly-report", 
      name: "Hourly Report", 
      icon: Clock, 
      path: "/dashboard/report/hourly-report", 
      description: "Hourly output breakdown" 
    },
    { 
      id: "shift-report", 
      name: "Shift Report", 
      icon: Layers, 
      path: "/dashboard/report/shift-report", 
      description: "Shift Wise output breakdown" 
    },
    { 
      id: "pack-dash", 
      name: "Pack Dashboard", 
      icon: Gauge, 
      path: "/dashboard/report/pack-dash", 
      description: "Pack Overall Statistics" 
    },
    { 
      id: "pack-data", 
      name: "Pack Report", 
      icon: FileSpreadsheet, 
      path: "/dashboard/report/pack-data", 
      description: "Pack Overall Reports" 
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl w-full mx-auto">

      {/* Header Section */}
      <div className="flex items-center gap-3.5 border-b border-slate-200/80 pb-5">
        <div className="p-3.5 rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-600">
          <FileBarChart2 className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-wider text-slate-900 uppercase">
            Re<span className="text-cyan-600">ports</span>
          </h1>
        </div>
      </div>

      {/* Grid Layout System */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stations.map((station) => {
          const Icon = station.icon;

          return (
            <button
              key={station.id}
              onClick={() => router.push(station.path)}
              className="text-left p-6 rounded-2xl border border-slate-200/80 bg-white/70 backdrop-blur-md shadow-xl hover:shadow-2xl transition-all duration-200 group relative flex items-center justify-between gap-4 min-h-[120px] cursor-pointer active:scale-[0.98] hover:bg-white hover:border-cyan-500/40"
            >
              <div className="flex items-center gap-4">
                <div className="p-3.5 rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-700 transition-colors duration-200 group-hover:bg-cyan-600 group-hover:text-white group-hover:border-cyan-600 flex-shrink-0">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-slate-900 group-hover:text-cyan-900">
                    {station.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5 leading-snug">
                    {station.description}
                  </p>
                </div>
              </div>

              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-cyan-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
            </button>
          );
        })}
      </div>

    </div>
  );
}