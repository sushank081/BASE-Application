"use client";

import React, { useState } from "react";
import Image from "next/image";
import localFont from "next/font/local";
import { Lock, User, Eye, EyeOff, AlertCircle, Loader2, UserCircle2 } from "lucide-react";
import { useAuth } from "../components/AuthProvider";
import { BASE_URL } from "../utils/utilsapi";

// Load local font file directly from project directory
const orbitronLocal = localFont({
  src: "../fonts/Orbitron-VariableFont_wght.ttf", // Adjust relative path if needed
  variable: "--font-orbitron",
  display: "swap",
});

export default function LoginPage() {
  const { login } = useAuth();

  // Controlled Form Inputs
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // UI Processing & Feedback States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Handle Authentication Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId.trim() || !password.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId.trim(),
          password: password.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || `Authentication failed with error code: ${response.status}`
        );
      }

      // Store User Context Data based on Remember Me selection
      if (data.user) {
        const storage = rememberMe ? localStorage : sessionStorage;
        const userStr = JSON.stringify(data.user);

        // 1. Save to Client Storage
        storage.setItem("bat_mes_user", userStr);

        // 2. Set Cookie for Next.js Middleware Server Checks
        const cookieMaxAge = rememberMe ? 86400 * 7 : 86400; // 7 days or 1 day
        document.cookie = `bat_mes_user=${encodeURIComponent(
          userStr
        )}; path=/; max-age=${cookieMaxAge}; SameSite=Lax`;
      }

      // Execute AuthProvider login hook (Passes access_token & refresh_token)
      if (data.access_token && data.refresh_token) {
        login(data.access_token, data.refresh_token, data.user);
      } else {
        throw new Error("Authentication response did not contain valid access and refresh tokens.");
      }

    } catch (err: any) {
      console.error("Authentication error:", err);
      setErrorMessage(
        err.message || "Failed to establish communication with authentication server."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    /* PAGE CONTAINER WITH LOCAL FONT VARIABLE APPLIED */
    <div className={`flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-slate-950 via-cyan-950 to-slate-900 font-sans relative overflow-hidden text-slate-800 p-4 lg:p-8 ${orbitronLocal.variable}`}>
      
      {/* SOFT MATTE AMBIENT GLOW ORBS */}
      <div className="absolute top-1/4 -left-20 w-[500px] h-[500px] rounded-full bg-cyan-600/15 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-20 w-[500px] h-[500px] rounded-full bg-teal-500/15 blur-3xl pointer-events-none"></div>

      {/* SCOPED INLINE STYLES mapped to Next.js local font variable */}
      <style jsx global>{`
        .font-futuristic {
          font-family: var(--font-orbitron), sans-serif;
        }

        @keyframes chargeSteps {
          0%, 10% { opacity: 0.15; }
          15%, 30% { opacity: 1; }
        }
        @keyframes chargeStepsTwo {
          0%, 30% { opacity: 0.15; }
          35%, 55% { opacity: 1; }
        }
        @keyframes chargeStepsThree {
          0%, 55% { opacity: 0.15; }
          60%, 80% { opacity: 1; }
        }
        @keyframes chargeStepsFour {
          0%, 80% { opacity: 0.15; }
          85%, 100% { opacity: 1; }
        }

        .bar-step-1 { animation: chargeSteps 4s infinite ease-in-out; }
        .bar-step-2 { animation: chargeStepsTwo 4s infinite ease-in-out; }
        .bar-step-3 { animation: chargeStepsThree 4s infinite ease-in-out; }
        .bar-step-4 { animation: chargeStepsFour 4s infinite ease-in-out; }
      `}</style>
      
      {/* ------------------------------------------------------------------------- */}
      {/* MAIN CONTAINER */}
      {/* ------------------------------------------------------------------------- */}
      <div className="w-full max-w-6xl bg-slate-900/90 backdrop-blur-xl border-2 border-cyan-500/30 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-cyan-500/20 overflow-hidden flex flex-col lg:flex-row relative z-10 min-h-[620px]">
        
        {/* ----------------------------------------------------------------------- */}
        {/* LEFT PANEL: WHITE FORM SECTION */}
        {/* ----------------------------------------------------------------------- */}
        <div className="w-full lg:w-[35%] bg-white p-8 sm:p-10 flex flex-col justify-between z-10 relative border-r border-cyan-100">
          
          {/* Top Header: Centered LOGIN Heading */}
          <div className="text-center">
            <h1 className="font-futuristic text-3xl font-black tracking-[0.2em] text-slate-900 uppercase select-none leading-none">
              LOGIN
            </h1>
          </div>

          {/* Center Form Container */}
          <div className="my-auto py-6 space-y-6">
            
            {/* User Circle Avatar Icon */}
            <div className="flex justify-center">
              <UserCircle2 className="w-28 h-28 text-slate-900 stroke-[1.2]" />
            </div>

            {/* DYNAMIC ERROR MESSAGE BANNER */}
            {errorMessage && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200/60 text-rose-700 text-xs font-medium flex items-start gap-2.5 animate-in slide-in-from-top-2 duration-200">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* User ID Field */}
              <div className="relative rounded-full shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <User className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  name="userId"
                  id="userId"
                  required
                  disabled={isSubmitting}
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="block w-full rounded-full border border-slate-300 bg-slate-50/50 py-3 pl-11 pr-4 text-slate-900 font-mono text-xs placeholder-slate-400 focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-cyan-500/15 transition-all disabled:opacity-50"
                  placeholder="USERNAME / ID"
                />
              </div>

              {/* Password Field */}
              <div className="relative rounded-full shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  id="password"
                  required
                  disabled={isSubmitting}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-full border border-slate-300 bg-slate-50/50 py-3 pl-11 pr-11 text-slate-900 text-xs placeholder-slate-400 focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-cyan-500/15 transition-all disabled:opacity-50"
                  placeholder="PASSWORD"
                />
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-cyan-600 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Login Pill Button */}
              <button
                type="submit"
                disabled={isSubmitting || !userId.trim() || !password.trim()}
                className="flex w-full justify-center items-center gap-2 rounded-full bg-slate-900 px-4 py-3.5 text-xs font-bold text-white uppercase tracking-wider shadow-md hover:bg-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Authenticating...
                  </>
                ) : (
                  "LOGIN"
                )}
              </button>

              {/* Remember Me Checkbox */}
              <div className="flex items-center px-2 pt-1">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  disabled={isSubmitting}
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 bg-white cursor-pointer"
                />
                <label htmlFor="remember-me" className="ml-2.5 block text-[11px] font-semibold text-slate-500 select-none cursor-pointer">
                  Remember me
                </label>
              </div>

            </form>
          </div>

          {/* Bottom Space Holder */}
          <div className="hidden sm:block"></div>

        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* RIGHT PANEL: DARK SHADED GRAPHIC & BRANDING */}
        {/* ----------------------------------------------------------------------- */}
        <div className="hidden lg:flex w-[65%] relative flex-col justify-between p-12 bg-slate-950 overflow-hidden text-white">
          
          {/* GUARANTEED BACKGROUND IMAGE LAYER */}
          <div className="absolute inset-0 z-0 opacity-100 bg-cover bg-center pointer-events-none">
            <Image
              src="/IMG_20260803_130727.png"
              alt="Background pattern"
              fill
              sizes="(max-width: 1024px) 100vw, 65vw"
              priority
              className="object-cover opacity-100 mix-blend-soft-light"
            />
          </div>

          {/* OVERLAY GRADIENT SHADE */}
          <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/90 via-slate-900/70 to-cyan-950/60 z-0 pointer-events-none"></div>

          {/* Top Filler Space */}
          <div className="relative z-10"></div>

          {/* Center Content: Battery Animation, BASE Title & Expanded Caption */}
          <div className="relative z-10 flex flex-col items-start space-y-4 max-w-lg">
            
            {/* Battery Charging Graphic Container */}
            <div className="relative w-32 h-52 border-4 border-cyan-400/80 rounded-2xl p-2 bg-slate-900/80 shadow-2xl backdrop-blur-md flex flex-col-reverse justify-between mb-2">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-12 h-3 bg-cyan-400 rounded-t-lg"></div>
              <div className="bar-step-1 w-full h-[22%] bg-cyan-500 rounded-lg"></div>
              <div className="bar-step-2 w-full h-[22%] bg-cyan-500 rounded-lg"></div>
              <div className="bar-step-3 w-full h-[22%] bg-cyan-500 rounded-lg"></div>
              <div className="bar-step-4 w-full h-[22%] bg-cyan-400 rounded-lg"></div>
            </div>

            {/* FUTURISTIC BRANDING: BASE */}
            <div>
              <h1 className="font-futuristic text-8xl font-black tracking-widest uppercase select-none drop-shadow-xl leading-none">
                <span className="text-white">BA</span>
                <span className="text-cyan-400">SE</span>
              </h1>

              {/* CAPTION DIRECTLY BELOW BASE */}
              <p className="text-xl uppercase tracking-[0.25em] text-slate-300 font-medium mt-2">
                Battery Assembly & System Execution
              </p>
            </div>

          </div>

          {/* Bottom Footer Note */}
          <div className="relative z-10 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[15px] text-slate-400">
            <span>Powered By MES Team</span>
            <span>© 2026 BASE</span>
          </div>

        </div>

      </div>

    </div>
  );
}