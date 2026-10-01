"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, ShieldCheck, UserCheck, Eye } from "lucide-react";

export function LoginCard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async (e?: React.FormEvent, customEmail?: string, customPass?: string) => {
    if (e) e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    const targetEmail = customEmail || email;
    const targetPass = customPass || password;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, password: targetPass }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Invalid credentials");
      }

      login("", json.data.user);
      router.push("/");
    } catch (err: any) {
      setErrorMsg(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    handleLogin(undefined, demoEmail, demoPass);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#050505] text-white selection:bg-white/20 selection:text-white relative overflow-hidden">
      {/* Subtle radial glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-white/[0.04] to-transparent rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-[380px] space-y-8 z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-[12px] bg-white text-black font-bold text-sm mb-2 shadow-[0_0_20px_rgba(255,255,255,0.15)]">
            FX
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-white">
            FOREX OS
          </h1>
          <p className="text-xs text-white/40">
            Sign in to your trading desk
          </p>
        </div>

        {/* Minimal Auth Card */}
        <div className="rounded-[20px] bg-[#0A0A0C]/90 border border-white/[0.08] p-7 shadow-[0_24px_64px_rgba(0,0,0,0.8)] backdrop-blur-2xl space-y-5">
          {errorMsg && (
            <div className="p-3 text-xs rounded-[10px] bg-rose-500/10 border border-rose-500/20 text-rose-400">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-white/60 uppercase tracking-wider">
                Email
              </label>
              <Input
                type="email"
                required
                placeholder="operator@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/[0.03] border-white/[0.08]"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-medium text-white/60 uppercase tracking-wider">
                  Password
                </label>
              </div>
              <Input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/[0.03] border-white/[0.08]"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full h-11 text-xs"
              isLoading={loading}
            >
              Sign In <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </form>

          {/* One-Click Demo Profiles */}
          <div className="pt-4 border-t border-white/[0.06] space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-white/35 text-center">
              One-Click Operator Access
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              <button
                type="button"
                onClick={() => fillDemo("admin@example.com", "Admin@123456")}
                className="w-full flex items-center justify-between p-2.5 rounded-[10px] bg-white/[0.025] hover:bg-white/[0.06] border border-white/[0.06] text-left transition group"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-white/70" />
                  <span className="text-xs font-medium text-white">Super Admin</span>
                </div>
                <span className="text-[10px] text-white/30 group-hover:text-white/70 transition font-mono">
                  admin@example.com
                </span>
              </button>

              <button
                type="button"
                onClick={() => fillDemo("operator@example.com", "Operator@123456")}
                className="w-full flex items-center justify-between p-2.5 rounded-[10px] bg-white/[0.025] hover:bg-white/[0.06] border border-white/[0.06] text-left transition group"
              >
                <div className="flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5 text-white/70" />
                  <span className="text-xs font-medium text-white">Trading Operator</span>
                </div>
                <span className="text-[10px] text-white/30 group-hover:text-white/70 transition font-mono">
                  operator@example.com
                </span>
              </button>

              <button
                type="button"
                onClick={() => fillDemo("viewer@example.com", "Viewer@123456")}
                className="w-full flex items-center justify-between p-2.5 rounded-[10px] bg-white/[0.025] hover:bg-white/[0.06] border border-white/[0.06] text-left transition group"
              >
                <div className="flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5 text-white/70" />
                  <span className="text-xs font-medium text-white">Audit Viewer</span>
                </div>
                <span className="text-[10px] text-white/30 group-hover:text-white/70 transition font-mono">
                  viewer@example.com
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="text-center text-[11px] text-white/30">
          Institutional Security • Encrypted Sessions • PostgreSQL
        </div>
      </div>
    </div>
  );
}
