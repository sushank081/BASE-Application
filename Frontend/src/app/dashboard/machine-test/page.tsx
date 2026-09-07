"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { 
  Cpu, 
  Zap, 
  Activity, 
  ChevronRight 
} from "lucide-react";

export default function MachineTestGridPage() {
  const router = useRouter();

  // Configured production line stations mapped to their nested route folders
  const stations = [
    { 
      id: "pre-eol", 
      name: "Pre EOL Station", 
      icon: Zap, 
      path: "/dashboard/machine-test/pre-eol", 
      description: "Pre-EOL testing and validation" 
    },
    { 
      id: "eol", 
      name: "Chroma Test Station", 
      icon: Activity, 
      path: "/dashboard/machine-test/eol", 
      description: "Chroma tester telemetry" 
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl w-full mx-auto">
      
      {/* Header Section */}
      <div className="flex items-center gap-3.5 border-b border-slate-200/80 pb-5">
        <div className="p-3.5 rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-600">
          <Cpu className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-wider text-slate-900 uppercase">
            Machine Test <span className="text-cyan-600">Stations</span>
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