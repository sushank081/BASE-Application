"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { 
  Users, 
  ShieldCheck, 
  ChevronRight 
} from "lucide-react";

export default function ProductionGridPage() {
  const router = useRouter();

  // Configured user administration stations mapped to their nested route folders
  const stations = [
    { id: "user-group", name: "User Group", icon: ShieldCheck, path: "/dashboard/users/user-group", description: "Manage group roles and station permissions" },
    { id: "user-manage", name: "User Management", icon: Users, path: "/dashboard/users/user-manage", description: "Provision and configure station operator credentials" },
  ];

  return (
    <div className="space-y-8 max-w-7xl w-full mx-auto">
      
      {/* Header Section */}
      <div className="border-b border-slate-200/80 pb-5">
        <h1 className="text-3xl font-black tracking-wider text-slate-900 uppercase">
          User <span className="text-cyan-600">Management</span>
        </h1>
        <p className="text-xs font-medium text-slate-500 mt-1">
          Configure station access levels, security groups, and operator credentials
        </p>
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
                  {station.description && (
                    <p className="text-xs text-slate-500 font-medium mt-0.5 leading-snug">
                      {station.description}
                    </p>
                  )}
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