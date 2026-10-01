import React from "react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  className?: string;
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  className,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        "rounded-[16px] border border-white/[0.07] bg-[#0A0A0A]/90 p-6 backdrop-blur-md transition-all duration-200 hover:border-white/[0.14] hover:bg-white/[0.04]",
        className
      )}
    >
      <div className="flex items-center justify-between text-white/50 text-[11px] font-medium uppercase tracking-wider">
        <span>{title}</span>
        {icon && <span className="text-white/40">{icon}</span>}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <div className="text-3xl font-semibold tracking-tight text-white tabular-nums">
          {value}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2 text-xs">
        {trend && (
          <span
            className={cn(
              "font-medium text-[11px]",
              trend.isPositive ? "text-emerald-400" : "text-rose-400"
            )}
          >
            {trend.isPositive ? "↑" : "↓"} {trend.value}
          </span>
        )}
        {subtitle && <span className="text-white/40 text-[11px] truncate">{subtitle}</span>}
      </div>
    </div>
  );
}
