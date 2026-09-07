"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { 
  Cpu, 
  BatteryCharging, 
  Box, 
  Sliders, 
  AlertTriangle, 
  GitBranch, 
  CheckSquare,
  Database
} from "lucide-react";

export default function MasterDataGridPage() {
  const router = useRouter();

  // Configured production line stations mapped with specific icons and routes
  const stations = [
    { 
      id: "module-config", 
      name: "Module Configuration", 
      icon: Cpu, 
      path: "/dashboard/master-data/module-config" 
    },
    { 
      id: "battery-config", 
      name: "Battery Configuration", 
      icon: BatteryCharging, 
      path: "/dashboard/master-data/battery-config" 
    },
    { 
      id: "pack-config", 
      name: "Pack Configuration", 
      icon: Box, 
      path: "/dashboard/master-data/pack-config" 
    },
    { 
      id: "bms-config", 
      name: "BMS Configuration", 
      icon: Sliders, 
      path: "/dashboard/master-data/bms-config" 
    },
    { 
      id: "master-defect", 
      name: "Defect List Master", 
      icon: AlertTriangle, 
      path: "/dashboard/master-data/master-defect" 
    },
    { 
      id: "defect-source", 
      name: "Defect Source Master", 
      icon: GitBranch, 
      path: "/dashboard/master-data/defect-source" 
    },
    { 
      id: "battery-status", 
      name: "Battery Status Master", 
      icon: CheckSquare, 
      path: "/dashboard/master-data/battery-status" 
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 font-sans text-slate-800">
      
      {/* Header section */}
      <div className="flex items-center gap-3 border-b border-cyan-200/60 pb-5">
        <Database className="w-7 h-7 text-cyan-600" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Master Data Configuration
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            System Parameters, Master Registries & BOM Configuration Consoles
          </p>
        </div>
      </div>

      {/* 3x3 Layout Grid System */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stations.map((station) => {
          const Icon = station.icon;

          return (
            <button
              key={station.id}
              onClick={() => router.push(station.path)}
              className="text-left p-6 rounded-2xl border backdrop-blur-md shadow-sm transition-all duration-200 group relative flex items-center gap-4 min-h-[120px] cursor-pointer active:scale-[0.98] bg-white/70 border-cyan-200/60 text-slate-900 hover:bg-white hover:shadow-lg hover:shadow-cyan-900/10 hover:border-cyan-400"
            >
              <div className="p-3.5 rounded-xl border transition-colors duration-200 flex-shrink-0 bg-cyan-50 border-cyan-200 text-cyan-600 group-hover:bg-cyan-100 group-hover:text-cyan-700">
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold tracking-tight text-slate-900 group-hover:text-cyan-900 transition-colors">
                  {station.name}
                </h3>
                
              </div>
            </button>
          );
        })}
      </div>

    </div>
  );
}