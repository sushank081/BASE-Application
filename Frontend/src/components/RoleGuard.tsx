"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ShieldAlert, LogOut } from "lucide-react";

// MASTER PERMISSION MATRIX (Covers top-level AND all nested sub-routes)
const ROUTE_PERMISSIONS: Record<string, string[]> = {
  "/dashboard/master-data": ["ADMIN"],
  "/dashboard/users": ["ADMIN"],
  "/dashboard/nc-clear": ["ADMIN", "SUPERVISOR","REWORK"],
  "/dashboard/machine-test": ["ADMIN", "SUPERVISOR"],
  "/dashboard/production/pdi": ["ADMIN", "SUPERVISOR", "QUALITY", "PRODUCTION"],
  "/dashboard/production": ["ADMIN", "SUPERVISOR", "PRODUCTION"],
  "/dashboard/report": ["ADMIN", "SUPERVISOR", "QUALITY", "REPORT","PRODUCTION"],
  "/dashboard/genealogy": ["ADMIN", "SUPERVISOR", "PRODUCTION", "QUALITY", "REPORT"],
  "/dashboard": ["ADMIN", "SUPERVISOR", "PRODUCTION", "QUALITY", "REPORT", "REWORK"],
};

export default function RoleGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    try {
      const storedUserStr =
        localStorage.getItem("bat_mes_user") ||
        sessionStorage.getItem("bat_mes_user");

      if (!storedUserStr) {
        // Unauthenticated -> Kick to Login Page
        router.push("/");
        return;
      }

      const userObj = JSON.parse(storedUserStr);
      const role = userObj?.group_name
        ? String(userObj.group_name).toUpperCase().trim()
        : "ADMIN";

      setUserRole(role);

      // Check if current path starts with any restricted route prefix
      // Sort routes by length (descending) so sub-paths evaluate before top-level paths
      const sortedRoutes = Object.keys(ROUTE_PERMISSIONS).sort(
        (a, b) => b.length - a.length
      );

      const matchedRoute = sortedRoutes.find(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
      );

      if (matchedRoute) {
        const allowedRoles = ROUTE_PERMISSIONS[matchedRoute];
        if (!allowedRoles.includes(role)) {
          setIsAuthorized(false); // DENY ACCESS
          return;
        }
      }

      setIsAuthorized(true); // PERMIT ACCESS
    } catch (err) {
      console.error("RoleGuard Evaluation Error:", err);
      router.push("/");
    }
  }, [pathname, router]);

  const handleLogout = () => {
    // Clear storage and authentication state
    localStorage.removeItem("bat_mes_user");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    sessionStorage.clear();

    // Clear session cookies
    document.cookie = "bat_mes_user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

    // Dynamic relative redirect
    window.location.href = "/";
  };

  // 1. Evaluating State
  if (isAuthorized === null) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 font-['Open_Sans',sans-serif]">
        <div className="w-8 h-8 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
          Verifying station security permissions...
        </p>
      </div>
    );
  }

  // 2. Access Denied Screen
  if (isAuthorized === false) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center font-['Open_Sans',sans-serif]">
        <div className="p-4 bg-rose-100 text-rose-600 rounded-full mb-4 shadow-xl border border-rose-200">
          <ShieldAlert className="w-12 h-12" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-wider">
          Access Denied
        </h1>
        <p className="text-xs font-semibold text-slate-500 mt-2 max-w-md">
          Your station role (<span className="text-rose-600 font-extrabold">{userRole}</span>) is restricted from accessing <span className="font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{pathname}</span>.
        </p>

        <button
          onClick={handleLogout}
          className="mt-6 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all cursor-pointer active:scale-95"
        >
          <LogOut className="w-4 h-4" /> Logout & Return to Home
        </button>
      </div>
    );
  }

  // 3. Authorized View
  return <>{children}</>;
}