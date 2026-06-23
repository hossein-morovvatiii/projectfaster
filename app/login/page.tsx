"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { KeyRound, User, ChevronLeft, Shield, AlertTriangle, Eye, EyeOff } from "lucide-react";

// Standard starter user accounts for robust fallback
const DEFAULT_ACCOUNT_POOL = [
  { id: "user-admin", username: "admin", password: "admin", name: "System Admin", is_admin: true, role: "super_admin", parent_id: null as (string | null), is_suspended: false },
  { id: "user-editor", username: "editor", password: "editor", name: "Senior Editor", is_admin: false, role: "editor", parent_id: null as (string | null), is_suspended: false }
];

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  
  // Mounted flag to avoid key issues
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 0);
    // If already logged in, skip login page and redirect to workspace dashboard immediately
    if (typeof window !== "undefined") {
      const activeUser = localStorage.getItem("vault_user");
      if (activeUser) {
        router.push("/");
      }
    }
    return () => clearTimeout(timer);
  }, [router]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMessage("Please enter both username and password.");
      return;
    }

    setIsSubmitLoading(true);
    setErrorMessage("");

    try {
      // 1. First fetch latest accounts from Supabase hossien_users table
      let fetchedUsers = [];
      try {
        const response = await fetch("/api/supabase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "fetch", table: "hossien_users" }),
        });
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          fetchedUsers = result.data;
          // Synchronize/cache to localStorage for offline robustness
          localStorage.setItem("vault_all_users_cache", JSON.stringify(fetchedUsers));
        }
      } catch (err) {
        console.warn("Could not grab remote users, fallback to cached users.", err);
      }

      // 2. Load cached users pool or fallback to defaults
      let userPool: any[] = [...DEFAULT_ACCOUNT_POOL];
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem("vault_all_users_cache");
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              userPool = parsed;
            }
          } catch (e) {}
        }
      }

      // Always ensure system defaults exist in pool if not already present
      DEFAULT_ACCOUNT_POOL.forEach(defAcc => {
        if (!userPool.some(u => u.username === defAcc.username)) {
          userPool.push(defAcc);
        }
      });

      // 3. Find matching user
      const targetUser = userPool.find(
        (u) => u.username.toLowerCase() === username.trim().toLowerCase()
      );

      if (!targetUser) {
        setErrorMessage("User with these details not found.");
        setIsSubmitLoading(false);
        return;
      }

      if (targetUser.password !== password) {
        setErrorMessage("Incorrect password.");
        setIsSubmitLoading(false);
        return;
      }

      if (targetUser.is_suspended) {
        setErrorMessage("Your account has been suspended by the administrator.");
        setIsSubmitLoading(false);
        return;
      }

      if (targetUser.valid_until) {
        const expiresAt = new Date(targetUser.valid_until);
        if (new Date() > expiresAt) {
          setErrorMessage("مدت زمان دسترسی حساب شما به پایان رسیده است. لطفاً برای تمدید با مدیر برند تماس بگیرید. (Your access limit has expired.)");
          setIsSubmitLoading(false);
          return;
        }
      }

      // Successfully logged in! Save user details.
      const sessionUser = {
        id: targetUser.id,
        username: targetUser.username,
        name: targetUser.name,
        is_admin: targetUser.role === "super_admin" || !!targetUser.is_admin,
        role: targetUser.role || (targetUser.is_admin ? "super_admin" : "editor"),
        parent_id: targetUser.parent_id || null,
      };

      localStorage.setItem("vault_user", JSON.stringify(sessionUser));
      
      // Navigate to main app
      router.push("/");
    } catch (err) {
      setErrorMessage("An error occurred during user login.");
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const handleGuestLogin = () => {
    // Generate guest credentials
    const guestUser = {
      id: "guest-session",
      username: "guest",
      name: "Guest User",
      is_admin: false,
      role: "guest"
    };

    localStorage.setItem("vault_user", JSON.stringify(guestUser));
    router.push("/");
  };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050508] text-white p-4 font-vazir relative overflow-hidden">
      {/* Visual glowing background blobs */}
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-purple-700/10 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="w-full max-w-md relative z-10">
        
        {/* Brand visual header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="w-14 h-14 bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-700 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-950/40 mx-auto mb-4 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
            </svg>
          </motion.div>
          <h1 className="text-xl font-black tracking-widest font-space text-white">
            EDITOR<span className="text-indigo-400">VAULT</span>
          </h1>
          <p className="text-[11px] text-gray-400 mt-1 font-bold">Log in to Video Coordination Panel</p>
        </div>

        {/* Main centered card frame */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-[#0f101a]/90 border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative"
        >
          <div className="absolute top-0 right-0 left-0 h-[2.5px] bg-gradient-to-r from-indigo-500 via-purple-600 to-indigo-700"></div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-gray-400">Username</label>
              <div className="relative flex items-center">
                <User className="absolute right-3.5 w-4 h-4 text-gray-500 pointer-events-none" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full bg-black/50 hover:bg-black/80 focus:bg-black/90 border border-white/[0.08] focus:border-indigo-500 rounded-xl py-3 pr-10 pl-4 text-xs text-left direction-ltr text-gray-100 placeholder-gray-600 focus:outline-none transition-all focus:shadow-[0_0_15px_rgba(99,102,241,0.15)]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-gray-400">Password</label>
              <div className="relative flex items-center">
                <KeyRound className="absolute right-3.5 w-4 h-4 text-gray-500 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-black/50 hover:bg-black/80 focus:bg-black/90 border border-white/[0.08] focus:border-indigo-500 rounded-xl py-3 pr-10 pl-11 text-xs text-left direction-ltr text-gray-100 placeholder-gray-600 focus:outline-none transition-all focus:shadow-[0_0_15px_rgba(99,102,241,0.15)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 p-1 rounded hover:bg-white/[0.05] text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Render any validation errors elegantly */}
            <AnimatePresence>
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg text-[10px] leading-relaxed font-semibold font-vazir"
                >
                  <Shield className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={isSubmitLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow-lg shadow-indigo-950/50 hover:shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 leading-none"
            >
              {isSubmitLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Verifying user credentials...</span>
                </>
              ) : (
                <>
                  <span>Log In</span>
                  <ChevronLeft className="w-4 h-4 text-indigo-400" />
                </>
              )}
            </button>
          </form>

          {/* Guest login options drawer section */}
          <div className="border-t border-white/[0.06] mt-6 pt-5 flex flex-col gap-3">
            <div className="text-center text-[10px] text-gray-500">Or for a quick panel evaluation:</div>
            
            <button
              type="button"
              onClick={handleGuestLogin}
              className="w-full py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 hover:text-emerald-300 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer relative overflow-hidden"
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="font-bold">Log in as Guest (Offline)</span>
            </button>

            <div className="flex items-start gap-1.5 p-2 bg-yellow-500/5 rounded-lg border border-yellow-500/10 text-[9px] text-yellow-400 leading-relaxed font-normal">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>Guest users are not allowed to auto-save directly to the database and must download backups manually. Default system admin credentials are username <code className="bg-white/[0.06] px-1 rounded text-white font-mono">admin</code> and password <code className="bg-white/[0.06] px-1 rounded text-white font-mono">admin</code>.</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
