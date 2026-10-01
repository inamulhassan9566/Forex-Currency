import React from "react";
import { FolderOpen } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({
  title = "No records found",
  description = "No data is currently available for this view.",
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-xl border-border bg-card/50">
      <div className="p-3 mb-3 rounded-full bg-secondary/80 text-muted-foreground">
        {icon || <FolderOpen className="w-8 h-8" />}
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground max-w-sm">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
