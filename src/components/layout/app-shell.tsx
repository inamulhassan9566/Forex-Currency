"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { useAuth } from "@/components/providers/auth-provider";
import { LoginCard } from "@/components/auth/login-card";
import Link from "next/link";
import {
  LayoutDashboard,
  Boxes,
  TrendingUp,
  BarChart3,
  Menu,
} from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // If on /login route or unauthenticated, IMMEDIATELY show the Login Card
  if (pathname === "/login" || !user) {
    return <LoginCard />;
  }

  const mobileNav = [
    { name: "Home", href: "/", icon: LayoutDashboard },
    { name: "Inventory", href: "/inventory", icon: Boxes },
    { name: "Sales", href: "/sales", icon: TrendingUp },
    { name: "Reports", href: "/reports", icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen flex bg-[#050505] text-white apple-bg-glow">
      {/* Desktop Floating Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm animate-in fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-[270px]">
            <Sidebar onCloseMobile={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Floating Top Header */}
        <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} />

        {/* Page Content Body */}
        <main className="flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10 max-w-[1600px] w-full mx-auto pb-24 lg:pb-12">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#09090B]/95 backdrop-blur-2xl border-t border-white/[0.08] px-4 py-2 flex items-center justify-around">
        {mobileNav.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-medium transition ${
                isActive ? "text-white" : "text-white/40 hover:text-white"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-white/40"}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}

        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-medium text-white/40 hover:text-white"
        >
          <Menu className="w-4 h-4" />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}
