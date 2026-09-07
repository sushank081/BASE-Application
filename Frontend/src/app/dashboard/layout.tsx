"use client";

import React, { useState } from "react";
import Sidebar from "../../components/Sidebar"; // Standard Next.js TSConfig absolute path mapping
import RoleGuard from "../../components/RoleGuard"; // 👈 Add RoleGuard

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-gradient-to-br from-cyan-100 via-sky-100 to-cyan-200 font-sans overflow-hidden relative text-slate-800">
      
      {/* SOFT AMBIENT GLOW ORBS FOR A RICH GRADIENT FEEL */}
      <div className="absolute top-1/4 -left-20 w-[500px] h-[500px] rounded-full bg-cyan-400/20 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-20 w-[500px] h-[500px] rounded-full bg-sky-400/25 blur-3xl pointer-events-none"></div>

      {/* RENDER DYNAMIC SHIFTING SIDEBAR */}
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

      {/* INTERNAL CONTENT INJECTION FRAME */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto relative z-10 p-8 lg:p-12">
        {children}
      </main>

    </div>
  );
}