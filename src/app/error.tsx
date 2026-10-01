"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("System error boundary caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-6">
        <AlertTriangle className="w-6 h-6" />
      </div>

      <h1 className="text-2xl font-semibold tracking-tight text-white">System Error</h1>
      <p className="text-sm text-white/50 mt-2 max-w-md">
        {error.message || "An unexpected operational error occurred while processing this financial record."}
      </p>

      <div className="mt-8 flex items-center gap-3">
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Reload View
        </Button>
        <Button variant="primary" onClick={() => reset()} className="gap-2">
          <RotateCcw className="w-4 h-4" /> Try Again
        </Button>
      </div>
    </div>
  );
}
