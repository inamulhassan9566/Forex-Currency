"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function Drawer({
  open,
  onOpenChange,
  children,
  title,
  subtitle,
}: DrawerProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    if (open) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in"
        onClick={() => onOpenChange(false)}
      />
      {/* Slide-over panel */}
      <div className="relative z-50 w-full max-w-md bg-[#0C0C0E]/95 border-l border-white/[0.1] h-full shadow-[0_0_80px_rgba(0,0,0,0.8)] backdrop-blur-2xl flex flex-col animate-slide-over">
        <div className="flex items-center justify-between p-6 border-b border-white/[0.08]">
          <div>
            {title && <h2 className="text-base font-semibold text-white tracking-tight">{title}</h2>}
            {subtitle && <p className="text-xs text-white/50 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1.5 rounded-full text-white/40 hover:text-white hover:bg-white/[0.06] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">{children}</div>
      </div>
    </div>
  );
}
