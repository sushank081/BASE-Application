"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider"; // Clean relative import for same folder
import { 
  LayoutDashboard, 
  Factory,
  GitFork, 
  Cpu, 
  FileBarChart2, 
  Database, 
  ShieldAlert,
  Users,
  CheckSquare,
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  BatteryCharging,
  AlertTriangle,
  X
} from "lucide-react";

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

interface MenuItem {
  name: string;
  icon: React.ElementType;
  path: string;
}

// 15 Minutes Inactivity Period
const INACTIVITY_LIMIT_MS = 15 * 60 * 1000;

export default function Sidebar({ isCollapsed, setIsCollapsed }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth(); // Consume central auth logout function

  const [userGroup, setUserGroup] = useState<string>("ADMIN");
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);

  // Reference to hold the active inactivity timer ID
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // -------------------------------------------------------------------------
  // 15-MINUTE AUTOMATIC INACTIVITY LOGOUT ENGINE
  // -------------------------------------------------------------------------
  const handleAutoLogout = useCallback(() => {
    console.warn("User inactive for 15 minutes. Automatically logging out station session...");
    logout();
  }, [logout]);

  const resetInactivityTimer = useCallback(() => {
    // Clear existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    // Set a new 15-minute timer
    timerRef.current = setTimeout(() => {
      handleAutoLogout();
    }, INACTIVITY_LIMIT_MS);
  }, [handleAutoLogout]);

  useEffect(() => {
    // List of user interaction events to track activity
    const activityEvents: (keyof WindowEventMap)[] = [
      "mousemove",
      "keydown",
      "click",
      "scroll",
      "touchstart",
    ];

    // Event handler to reset countdown on interaction
    const handleUserActivity = () => {
      resetInactivityTimer();
    };

    // Attach listeners to window object
    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserActivity);
    });

    // Start initial timer countdown on mount
    resetInactivityTimer();

    // Cleanup listeners and clear timer on unmount
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [resetInactivityTimer]);

  // Read User Group context from storage on component load
  useEffect(() => {
    try {
      const storedUserStr =
        localStorage.getItem("bat_mes_user") ||
        sessionStorage.getItem("bat_mes_user");

      if (storedUserStr) {
        const userObj = JSON.parse(storedUserStr);
        // Normalize group name (e.g., "QUALITY", "PRODUCTION", "ADMIN")
        const groupName = userObj?.group_name
          ? String(userObj.group_name).toUpperCase().trim()
          : "ADMIN";
        setUserGroup(groupName);
      }
    } catch (err) {
      console.error("Failed to parse stored user context:", err);
    }
  }, []);

  // -------------------------------------------------------------------------
  // ROLE-BASED NAVIGATION FILTERING ENGINE (UNIQUE ICONS ASSIGNED)
  // -------------------------------------------------------------------------
  const getFilteredMenuItems = (): MenuItem[] => {
    switch (userGroup) {
      case "QUALITY":
        return [
          { name: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
          { name: "Genealogy", icon: GitFork, path: "/dashboard/genealogy" },
          { name: "Report", icon: FileBarChart2, path: "/dashboard/report" },
          { name: "Production -> PDI", icon: CheckSquare, path: "/dashboard/production/pdi" },
        ];
		case "REWORK":
        return [
          { name: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
          { name: "NC Clearance", icon: ShieldAlert, path: "/dashboard/nc-clear" },
        ];

      case "PRODUCTION":
        return [
          { name: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
          { name: "Production", icon: Factory, path: "/dashboard/production" },
          { name: "Genealogy", icon: GitFork, path: "/dashboard/genealogy" },
        ];

      case "REPORT":
        return [
          { name: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
          { name: "Genealogy", icon: GitFork, path: "/dashboard/genealogy" },
          { name: "Report", icon: FileBarChart2, path: "/dashboard/report" },
        ];

      case "SUPERVISOR":
        return [
          { name: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
          { name: "Production", icon: Factory, path: "/dashboard/production" },
          { name: "Genealogy", icon: GitFork, path: "/dashboard/genealogy" },
          { name: "Pre EOL and Chroma", icon: Cpu, path: "/dashboard/machine-test" },
          { name: "Report", icon: FileBarChart2, path: "/dashboard/report" },
          { name: "NC Clearance", icon: ShieldAlert, path: "/dashboard/nc-clear" },
        ];

      case "ADMIN":
      default:
        // Admin or default view gets all menu items with unique icons
        return [
          { name: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
          { name: "Production", icon: Factory, path: "/dashboard/production" },
          { name: "Genealogy", icon: GitFork, path: "/dashboard/genealogy" },
          { name: "Pre EOL and Chroma", icon: Cpu, path: "/dashboard/machine-test" },
          { name: "Report", icon: FileBarChart2, path: "/dashboard/report" },
          { name: "Master Data", icon: Database, path: "/dashboard/master-data" },
          { name: "NC Clearance", icon: ShieldAlert, path: "/dashboard/nc-clear" },
          { name: "User Management", icon: Users, path: "/dashboard/users" },
        ];
    }
  };

  const menuItems = getFilteredMenuItems();

  const handleConfirmLogout = () => {
    // Clear timer before manual logout
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    // Invoke central logout from AuthProvider
    logout();
  };

  return (
    <>
      <aside 
        className={`bg-slate-900 text-slate-100 flex flex-col justify-between relative z-20 transition-all duration-300 shadow-2xl h-full border-r border-slate-800/80
          ${isCollapsed ? "w-20" : "w-64"}`}
      >
        {/* Sidebar Toggle Trigger Button */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute top-6 -right-3.5 bg-cyan-600 hover:bg-cyan-500 border border-slate-700 rounded-full p-1 text-white transition-colors shadow-md cursor-pointer z-30"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Top Header Section */}
        <div>
          <div className={`p-6 flex items-center gap-3 border-b border-slate-800/60 ${isCollapsed ? "justify-center" : ""}`}>
            <BatteryCharging className="w-8 h-8 text-cyan-400 flex-shrink-0 animate-pulse" />
            {!isCollapsed && (
              <div>
                <h1 className="text-2xl font-black tracking-wider text-white select-none leading-none">
                  BA<span className="text-cyan-400">SE</span>
                </h1>
                <span className="text-[10px] uppercase tracking-widest font-bold text-cyan-400/80 block mt-1">
                  {userGroup} PORTAL
                </span>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <button
                  key={item.name}
                  onClick={() => router.push(item.path)}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-150 group cursor-pointer
                    ${isActive 
                      ? "bg-cyan-600 text-white shadow-lg shadow-cyan-950/40" 
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                    }`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? "text-white" : "text-cyan-400/70"}`} />
                  {!isCollapsed && <span className="truncate">{item.name}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer/Logout Action Container at Bottom */}
        <div className="p-4 border-t border-slate-800/60">
          <button
            onClick={() => setShowLogoutModal(true)}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-150 text-rose-300 hover:bg-rose-950/30 hover:text-rose-400 group cursor-pointer ${isCollapsed ? "justify-center" : ""}`}
          >
            <LogOut className="w-5 h-5 flex-shrink-0 transition-transform group-hover:translate-x-0.5" />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* LOGOUT CONFIRMATION UI MODAL */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-sm w-full overflow-hidden text-slate-900">
            
            {/* Modal Header */}
            <div className="p-5 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-bold text-rose-950">
                  Station Logout
                </h3>
              </div>
              <button
                onClick={() => setShowLogoutModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-rose-100/50 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Are you sure you want to log out of the station? Your active session credentials will be cleared.
              </p>

              {/* Actions */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={handleConfirmLogout}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  Yes, Log Out
                </button>

                <button
                  type="button"
                  onClick={() => setShowLogoutModal(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}