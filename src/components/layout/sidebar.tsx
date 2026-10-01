"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import {
  LayoutDashboard,
  ShoppingCart,
  TrendingUp,
  Layers,
  BookOpen,
  BarChart3,
  Scale,
  Coins,
  Users,
  Settings,
  ShieldCheck,
  UploadCloud,
  LogOut,
  LineChart,
} from "lucide-react";
import { canManageUsers } from "@/lib/rbac";

interface SidebarProps {
  onCloseMobile?: () => void;
}

export function Sidebar({ onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isRoleSuperAdmin = user?.role === "SUPER_ADMIN";
  const isRoleAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";

  const navigation = [
    {
      group: "OVERVIEW",
      items: [{ name: "Dashboard", href: "/", icon: LayoutDashboard }],
    },
    {
      group: "TRANSACTIONS",
      items: [
        { name: "Purchases", href: "/purchases", icon: ShoppingCart },
        { name: "Sales", href: "/sales", icon: TrendingUp },
      ],
    },
    {
      group: "INVENTORY",
      items: [
        { name: "Lots Registry", href: "/lots", icon: Layers },
        { name: "Stock Ledger", href: "/ledger", icon: BookOpen },
        { name: "Vault Positions", href: "/inventory", icon: Coins },
      ],
    },
    {
      group: "ANALYTICS",
      items: [
        { name: "Profit Analytics", href: "/profit", icon: LineChart },
        { name: "Reports", href: "/reports", icon: BarChart3 },
        { name: "Reconciliation", href: "/reconciliation", icon: Scale },
      ],
    },
    {
      group: "MANAGEMENT",
      items: [
        ...(isRoleAdmin
          ? [{ name: "Currencies", href: "/currencies", icon: Coins }]
          : []),
        ...(isRoleSuperAdmin
          ? [{ name: "Users", href: "/users", icon: Users }]
          : []),
        ...(isRoleAdmin
          ? [{ name: "Batch Import", href: "/import", icon: UploadCloud }]
          : []),
      ],
    },
    {
      group: "SYSTEM",
      items: [
        ...(isRoleAdmin
          ? [{ name: "Audit Logs", href: "/audit-logs", icon: ShieldCheck }]
          : []),
        ...(isRoleSuperAdmin
          ? [{ name: "Settings", href: "/settings", icon: Settings }]
          : []),
      ],
    },
  ];

  return (
    <aside className="w-[260px] flex-shrink-0 flex flex-col h-screen border-r border-white/[0.06] bg-[#070708] select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-white/[0.06]">
        <Link href="/" className="flex items-center gap-2.5" onClick={onCloseMobile}>
          <div className="w-5 h-5 rounded-md bg-white flex items-center justify-center">
            <span className="text-black font-black text-xs">FX</span>
          </div>
          <div className="font-semibold text-xs tracking-tight text-white flex items-center gap-2">
            <span>FOREX OS</span>
            <span className="text-[10px] text-white/40 font-mono tracking-normal font-normal">
              v1.0
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6">
        {navigation.map((sec, idx) => (
          <div key={idx} className="space-y-1">
            <div className="px-3 text-[10px] font-semibold uppercase tracking-wider text-white/35">
              {sec.group}
            </div>
            <div className="space-y-0.5 pt-1">
              {sec.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onCloseMobile}
                    className={`relative flex items-center gap-2.5 px-3 py-2 text-xs rounded-[10px] transition-all duration-150 ${
                      isActive
                        ? "bg-white/[0.08] text-white font-medium shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
                        : "text-white/60 hover:text-white hover:bg-white/[0.035]"
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-1 w-1 h-3.5 rounded-full bg-white" />
                    )}
                    <Icon className="w-4 h-4 opacity-75 shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Profile & Status */}
      <div className="p-3 border-t border-white/[0.06] bg-[#0A0A0C]">
        <div className="flex items-center justify-between p-2.5 rounded-[12px] bg-white/[0.02] border border-white/[0.06]">
          <div className="min-w-0 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center font-bold text-[11px] text-white/80 shrink-0">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : "FX"}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-white truncate">{user?.name || "Operator"}</div>
              <div className="text-[10px] text-white/40 font-mono uppercase truncate">
                {user?.role || "Viewer"}
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            title="Sign out"
            className="p-1.5 rounded-md text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
