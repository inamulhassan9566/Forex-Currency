"use client";

import React from "react";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatAmount, formatCurrency } from "@/lib/utils";
import { ArrowRight, CheckCircle2, AlertTriangle } from "lucide-react";

interface AllocationItem {
  lotNumber: string;
  allocatedQuantity: number;
  availableBefore: number;
  remainingAfter: number;
  purchasePrice: number;
  sellPrice: number;
  profitPerUnit: number;
  totalProfit: number;
}

interface FinancialConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading?: boolean;
  currencyCode: string;
  totalQuantity: number;
  totalSaleAmount: number;
  totalProfit: number;
  allocations: AllocationItem[];
}

export function FinancialConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  currencyCode,
  totalQuantity,
  totalSaleAmount,
  totalProfit,
  allocations,
}: FinancialConfirmDialogProps) {
  const isLoss = totalProfit < 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} maxWidth="max-w-xl">
      <DialogHeader>
        <DialogTitle className="text-xl font-semibold text-white">
          Review Sale Allocation
        </DialogTitle>
        <DialogDescription>
          Verify the lot-wise execution details before committing this trade to the vault.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-5 my-2">
        {/* Main Summary Header */}
        <div className="rounded-[14px] bg-white/[0.035] border border-white/[0.08] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-medium tracking-wider text-white/50">
              Total Sale Volume
            </span>
            <span className="font-mono text-sm font-semibold text-white">
              {formatAmount(totalQuantity)} {currencyCode}
            </span>
          </div>

          <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-baseline justify-between">
            <div>
              <div className="text-[11px] text-white/40 uppercase tracking-wider font-medium">
                Total Realized Profit
              </div>
              <div
                className={`text-2xl font-bold font-mono tabular-nums mt-0.5 ${
                  isLoss ? "text-rose-400" : "text-emerald-400"
                }`}
              >
                {totalProfit >= 0 ? "+" : ""}
                {formatCurrency(totalProfit, currencyCode)}
              </div>
            </div>

            <div className="text-right">
              <div className="text-[11px] text-white/40 uppercase tracking-wider font-medium">
                Sale Revenue
              </div>
              <div className="text-lg font-semibold font-mono tabular-nums text-white mt-0.5">
                {formatCurrency(totalSaleAmount, currencyCode)}
              </div>
            </div>
          </div>
        </div>

        {isLoss && (
          <div className="flex items-center gap-2.5 p-3 rounded-[12px] bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Warning: Selling below historical cost produces a negative realized return.</span>
          </div>
        )}

        {/* Lot Allocation Breakdown */}
        <div className="rounded-[14px] border border-white/[0.08] overflow-hidden">
          <div className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider bg-white/[0.02] border-b border-white/[0.06] text-white/50">
            Lot Allocations ({allocations.length})
          </div>
          <div className="divide-y divide-white/[0.05] max-h-56 overflow-y-auto">
            {allocations.map((alloc, idx) => (
              <div key={idx} className="p-3.5 text-xs flex flex-col gap-1.5 hover:bg-white/[0.02] transition">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold text-white">{alloc.lotNumber}</span>
                  <span className="font-mono font-bold text-white tabular-nums">
                    {formatAmount(alloc.allocatedQuantity)} {currencyCode}
                  </span>
                </div>

                <div className="flex items-center justify-between text-white/50 text-[11px]">
                  <span>
                    Buy {formatAmount(alloc.purchasePrice)} → Sell {formatAmount(alloc.sellPrice)}
                  </span>
                  <span
                    className={`font-mono font-semibold tabular-nums ${
                      alloc.totalProfit >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {alloc.totalProfit >= 0 ? "+" : ""}
                    {formatCurrency(alloc.totalProfit, currencyCode)}
                  </span>
                </div>

                <div className="text-[10px] text-white/35 font-mono">
                  Remaining vault stock after: {formatAmount(alloc.remainingAfter)} {currencyCode}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isLoading}>
          Go Back
        </Button>
        <Button variant="primary" onClick={onConfirm} isLoading={isLoading}>
          Confirm Sale
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
