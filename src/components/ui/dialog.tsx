"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
  maxWidth?: string;
}

export function Dialog({
  open,
  onOpenChange,
  children,
  className,
  maxWidth = "max-w-xl",
}: DialogProps) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop with 8px blur */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-[8px] transition-opacity duration-200 animate-in fade-in"
        onClick={() => onOpenChange(false)}
      />
      {/* Modern floating glass dialog: rounded-3xl (20px), padding 24-32px */}
      <div
        className={cn(
          "relative z-50 w-full rounded-[20px] bg-[#0E0E10]/95 border border-white/[0.12] p-6 sm:p-8 shadow-[0_32px_80px_rgba(0,0,0,0.8)] backdrop-blur-2xl transition-all duration-200 animate-in-apple max-h-[90vh] overflow-y-auto",
          maxWidth,
          className
        )}
      >
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-5 top-5 rounded-full p-1.5 text-white/40 hover:text-white hover:bg-white/[0.06] transition"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 mb-5", className)}
      {...props}
    />
  );
}

export function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2.5 pt-5 border-t border-white/[0.06] mt-6 gap-2",
        className
      )}
      {...props}
    />
  );
}

export function DialogTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("text-lg font-semibold tracking-tight text-white", className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-xs text-white/50 leading-relaxed", className)}
      {...props}
    />
  );
}
