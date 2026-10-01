import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "success" | "warning" | "danger" | "destructive";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants: Record<string, string> = {
    default: "bg-white text-black border-transparent",
    secondary: "bg-white/[0.06] text-white/80 border border-white/[0.08]",
    outline: "text-white/60 border border-white/[0.1] bg-transparent",
    success: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    danger: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
    destructive: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-tight select-none",
        variants[variant] || variants.default,
        className
      )}
      {...props}
    />
  );
}

export { Badge };
