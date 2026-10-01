"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-6">
        <span className="font-mono text-sm font-semibold text-white/60">404</span>
      </div>

      <h1 className="text-3xl font-semibold tracking-tight text-white">Page Not Found</h1>
      <p className="text-sm text-white/50 mt-2 max-w-sm">
        The requested financial ledger, lot record, or operational view does not exist.
      </p>

      <div className="mt-8 flex items-center gap-3">
        <Link href="/">
          <Button variant="primary" className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
