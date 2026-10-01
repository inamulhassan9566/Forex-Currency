"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { usePathname } from "next/navigation";
import {
  Menu,
  Search,
  Bell,
  Plus,
  Command,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommandPalette } from "./command-palette";
import Link from "next/link";
import { canCreateTransaction } from "@/lib/rbac";

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

export function Header({ onOpenMobileMenu }: HeaderProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [alerts, setAlerts] = useState<Array<{ code: string; stock: number; threshold: number }>>([]);
  const [showAlertsMenu, setShowAlertsMenu] = useState(false);

  // Keyboard shortcut: ⌘K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch low stock alerts
  useEffect(() => {
    async function loadAlerts() {
      try {
        const res = await fetch("/api/dashboard?days=1");
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data?.lowStockAlerts) {
            setAlerts(json.data.lowStockAlerts);
          }
        }
      } catch (e) {
        // silent
      }
    }
    loadAlerts();
  }, []);

  // Generate clean breadcrumb
  const pageTitle =
    pathname === "/"
      ? "Overview"
      : pathname.slice(1).split("/")[0].replace(/-/g, " ");

  return (
    <>
      <header className="h-16 border-b border-white/[0.06] bg-[#070708]/85 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-30">
        {/* Left: Mobile Toggle & Page Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-1.5 rounded-lg text-white/50 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-white/40 font-mono">App</span>
            <span className="text-white/20">/</span>
            <span className="font-medium text-white capitalize">{pageTitle}</span>
          </div>
        </div>

        {/* Center: Command Palette Trigger Input */}
        <div className="hidden sm:flex items-center justify-center flex-1 max-w-md mx-6">
          <button
            onClick={() => setCmdOpen(true)}
            className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-[12px] bg-white/[0.04] border border-white/[0.08] text-xs text-white/40 hover:text-white/70 hover:bg-white/[0.06] hover:border-white/[0.14] transition duration-150"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5" />
              <span>Search lots, currency, sales...</span>
            </div>
            <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.1] text-[10px] font-mono text-white/60">
              <span>⌘</span>K
            </kbd>
          </button>
        </div>

        {/* Right: Quick Action & Notification Center */}
        <div className="flex items-center gap-2.5">
          {user && canCreateTransaction(user.role) && (
            <div className="flex items-center gap-2">
              <Link href="/purchases">
                <Button variant="secondary" size="sm" className="hidden md:flex gap-1.5">
                  <Plus className="w-3 h-3 text-white/70" />
                  <span>Buy Currency</span>
                </Button>
              </Link>
              <Link href="/sales">
                <Button variant="primary" size="sm" className="flex gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-black" />
                  <span>Sell (Lot)</span>
                </Button>
              </Link>
            </div>
          )}

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowAlertsMenu((prev) => !prev)}
              className="relative p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.04] transition"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {alerts.length > 0 && (
                <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-amber-400 ring-2 ring-[#070708]" />
              )}
            </button>

            {showAlertsMenu && (
              <div className="absolute right-0 mt-2 w-80 rounded-[16px] bg-[#0E0E10]/95 border border-white/[0.12] shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl p-4 z-50 animate-in-apple">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
                  <span className="text-xs font-semibold text-white">Notifications</span>
                  <span className="text-[10px] text-white/40 font-mono">
                    {alerts.length} Warnings
                  </span>
                </div>

                {alerts.length === 0 ? (
                  <div className="py-6 text-center text-xs text-white/40">
                    Vault inventory optimal across all currencies.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {alerts.map((al) => (
                      <div
                        key={al.code}
                        className="p-3 rounded-[12px] bg-amber-500/5 border border-amber-500/15 text-xs flex items-start gap-2.5"
                      >
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-white">Low Vault Stock: {al.code}</div>
                          <div className="text-[11px] text-white/50 mt-0.5">
                            Stock: {al.stock} units (Threshold: {al.threshold})
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-3 mt-3 border-t border-white/[0.06] text-center">
                  <Link
                    href="/inventory"
                    onClick={() => setShowAlertsMenu(false)}
                    className="text-[11px] text-white/60 hover:text-white transition flex items-center justify-center gap-1 font-medium"
                  >
                    View All Vault Positions <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </>
  );
}
