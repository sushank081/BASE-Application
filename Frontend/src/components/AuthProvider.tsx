"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { BASE_URL } from "../utils/utilsapi";

interface AuthContextType {
  token: string | null;
  logout: () => void;
  login: (accessToken: string, refreshToken: string, userData?: any) => void;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  logout: () => {},
  login: () => {},
  fetchWithAuth: async () => new Response(),
});

// 15 Minutes Inactivity Period (in milliseconds)
const INACTIVITY_LIMIT_MS = 30 * 60 * 1000;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isLoggingOutRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const router = useRouter();
  const pathname = usePathname();

  // -------------------------------------------------------------------------
  // 1. ROBUST LOGOUT (Clears All LocalStorage, SessionStorage & Cookies)
  // -------------------------------------------------------------------------
  const logout = useCallback(() => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;

    // Clear active idle timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Clear Local Storage
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("bat_mes_user");

    // Clear Session Storage
    sessionStorage.clear();

    // Expire ALL Cookies (Crucial for Next.js Middleware)
    document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    document.cookie = "refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    document.cookie = "bat_mes_user=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";

    setToken(null);

    // Hard redirect to Base/Login URL
    if (window.location.pathname !== "/") {
      window.location.href = "/";
    }
  }, []);

  // -------------------------------------------------------------------------
  // 2. INACTIVITY TIMER ENGINE (15 Minutes)
  // -------------------------------------------------------------------------
  const resetInactivityTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      console.warn("15 minutes of station inactivity detected. Executing auto-logout...");
      logout();
    }, INACTIVITY_LIMIT_MS);
  }, [logout]);

  useEffect(() => {
    // Only attach activity listeners if user is authenticated
    const activeToken = localStorage.getItem("access_token");
    if (!activeToken) return;

    const activityEvents: (keyof WindowEventMap)[] = [
      "mousemove",
      "keydown",
      "click",
      "scroll",
      "touchstart",
    ];

    const handleUserActivity = () => {
      resetInactivityTimer();
    };

    // Attach activity listeners
    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserActivity);
    });

    // Start initial countdown
    resetInactivityTimer();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [resetInactivityTimer, pathname]);

  // -------------------------------------------------------------------------
  // 3. LOGIN FUNCTION (Syncs LocalStorage & Server Cookies)
  // -------------------------------------------------------------------------
  const login = (accessToken: string, refreshToken: string, userData?: any) => {
    isLoggingOutRef.current = false;

    // Save Tokens & User in LocalStorage
    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("refresh_token", refreshToken);

    if (userData) {
      const userStr = JSON.stringify(userData);
      localStorage.setItem("bat_mes_user", userStr);

      // Set Cookie for Next.js Middleware Route Enforcement
      document.cookie = `bat_mes_user=${encodeURIComponent(
        userStr
      )}; path=/; max-age=86400; SameSite=Lax`;
    }

    // Set Token Cookies
    document.cookie = `access_token=${accessToken}; path=/; max-age=86400; SameSite=Lax`;
    document.cookie = `refresh_token=${refreshToken}; path=/; max-age=604800; SameSite=Lax`;

    setToken(accessToken);
    resetInactivityTimer();
    router.push("/dashboard");
  };

  // -------------------------------------------------------------------------
  // 4. BACKGROUND REFRESH TOKEN MECHANISM
  // -------------------------------------------------------------------------
  const refreshSession = async (): Promise<string | null> => {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) return null;

    try {
      const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!res.ok) throw new Error("Failed to refresh token");

      const data = await res.json();
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);

      document.cookie = `access_token=${data.access_token}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `refresh_token=${data.refresh_token}; path=/; max-age=604800; SameSite=Lax`;

      setToken(data.access_token);
      return data.access_token;
    } catch (err) {
      console.error("Session refresh failed:", err);
      logout();
      return null;
    }
  };

  // -------------------------------------------------------------------------
  // 5. AUTHENTICATED FETCH HELPER
  // -------------------------------------------------------------------------
  const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
    let currentToken = localStorage.getItem("access_token") || token;

    const headers = new Headers(options.headers || {});
    if (currentToken) {
      headers.set("Authorization", `Bearer ${currentToken}`);
    }

    let response = await fetch(url, { ...options, headers });

    // If Access Token expired (401), try refreshing seamlessly
    if (response.status === 401) {
      const newToken = await refreshSession();
      if (newToken) {
        headers.set("Authorization", `Bearer ${newToken}`);
        response = await fetch(url, { ...options, headers });
      }
    }

    return response;
  };

  // -------------------------------------------------------------------------
  // 6. ROUTE & TOKEN VALIDATION EFFECT
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (isLoggingOutRef.current) return;

    const storedAccessToken = localStorage.getItem("access_token");

    // 1. If on Login Page ("/")
    if (pathname === "/") {
      if (storedAccessToken) {
        try {
          const payload = JSON.parse(atob(storedAccessToken.split(".")[1]));
          const currentTime = Math.floor(Date.now() / 1000);

          if (payload.exp && payload.exp > currentTime) {
            setToken(storedAccessToken);
            router.push("/dashboard");
            setIsLoading(false);
            return;
          }
        } catch {
          logout();
        }
      }
      setToken(null);
      setIsLoading(false);
      return;
    }

    // 2. If on Protected Dashboard Route
    if (!storedAccessToken) {
      logout();
      setIsLoading(false);
      return;
    }

    try {
      const payload = JSON.parse(atob(storedAccessToken.split(".")[1]));
      const currentTime = Math.floor(Date.now() / 1000);

      // If token expired, attempt background refresh
      if (payload.exp && payload.exp < currentTime) {
        refreshSession().then((newToken) => {
          if (!newToken) logout();
        });
      } else {
        setToken(storedAccessToken);
      }
    } catch {
      logout();
    } finally {
      setIsLoading(false);
    }
  }, [pathname, logout, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-cyan-500 font-mono text-sm">
        Authenticating session...
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ token, logout, login, fetchWithAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);