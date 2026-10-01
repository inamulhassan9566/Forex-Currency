"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { formatAmount } from "@/lib/utils";
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Plus,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { canAdjustStock } from "@/lib/rbac";
import Link from "next/link";

export default function ReconciliationPage() {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [reconciliations, setReconciliations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Adjustment Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lots, setLots] = useState<any[]>([]);

  // Adjustment fields
  const [selectedLotId, setSelectedLotId] = useState("");
  const [adjustmentType, setAdjustmentType] = useState<"INCREASE" | "DECREASE">("INCREASE");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [rRes, lRes] = await Promise.all([
        fetch("/api/reconciliation"),
        fetch("/api/lots"),
      ]);

      if (rRes.ok) {
        const rJson = await rRes.json();
        if (rJson.success) setReconciliations(rJson.data);
      }
      if (lRes.ok) {
        const lJson = await lRes.json();
        if (lJson.success) {
          setLots(lJson.data.items);
          if (lJson.data.items.length > 0 && !selectedLotId) {
            setSelectedLotId(lJson.data.items[0].id);
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLotId || !quantity || !reason.trim()) {
      error("Validation", "Please select a lot, provide a quantity, and state an audited reason");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/reconciliation/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lotId: selectedLotId,
          type: adjustmentType,
          quantity: parseFloat(quantity),
          reason: reason.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Stock adjustment failed");
      }

      success(
        "Stock Adjustment Executed",
        `Adjusted ${adjustmentType} of ${formatAmount(quantity)} units recorded into immutable ledger.`
      );
      setModalOpen(false);
      setQuantity("");
      setReason("");
      loadData();
    } catch (err: any) {
      error("Adjustment Error", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Inventory Reconciliation</h1>
          <p className="text-sm text-white/50 mt-1">
            Mathematical proof comparing theoretical ledger balance against physical vault counts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={loadData} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>

          {user && canAdjustStock(user.role) && (
            <Button variant="primary" onClick={() => setModalOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Create Adjustment
            </Button>
          )}
        </div>
      </div>

      {/* SUMMARY VARIANCE CARDS (SECTION 28) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {reconciliations.map((rec) => {
          const isMismatch = rec.variance !== 0;

          return (
            <div
              key={rec.currencyCode}
              className={`p-6 rounded-2xl border transition-all ${
                isMismatch
                  ? "bg-amber-500/[0.03] border-amber-500/30"
                  : "bg-white/[0.02] border-white/[0.06]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-lg text-white">{rec.currencyCode}</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                    isMismatch
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  }`}
                >
                  {isMismatch ? "Mismatch" : "Balanced"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-white/[0.06]">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-white/40">Expected Stock</div>
                  <div className="text-2xl font-mono font-semibold text-white mt-1">
                    {formatAmount(rec.expectedBalance)}
                  </div>
                  <div className="text-[11px] text-white/40 mt-0.5">From purchases & sales</div>
                </div>

                <div>
                  <div className="text-[10px] uppercase tracking-wider text-white/40">Actual Stock</div>
                  <div className="text-2xl font-mono font-semibold text-white mt-1">
                    {formatAmount(rec.actualLotSum)}
                  </div>
                  <div className="text-[11px] text-white/40 mt-0.5">Sum of active lot balances</div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-5 pt-3 border-t border-white/[0.04] text-xs">
                <span className="text-white/40">Difference:</span>
                <span
                  className={`font-mono font-bold text-sm ${
                    isMismatch ? "text-amber-400" : "text-emerald-400"
                  }`}
                >
                  {rec.variance > 0 ? `+${formatAmount(rec.variance)}` : formatAmount(rec.variance)} {rec.currencyCode}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* DETAILED RECONCILIATION EQUATION TABLE */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-white">
            Audit Ledger Equation Breakdown
          </h2>
          <span className="text-xs text-white/40 font-mono">
            Equation: Expected = Purchases - Sales ± Adjustments
          </span>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden backdrop-blur-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CURRENCY</TableHead>
                <TableHead className="text-right">TOTAL PURCHASES (+)</TableHead>
                <TableHead className="text-right">TOTAL SALES (-)</TableHead>
                <TableHead className="text-right">ADJUSTMENTS (±)</TableHead>
                <TableHead className="text-right">EXPECTED BALANCE</TableHead>
                <TableHead className="text-right">ACTIVE LOT BALANCE</TableHead>
                <TableHead className="text-right">VARIANCE</TableHead>
                <TableHead>STATUS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8} className="py-5 text-center">
                      <div className="h-6 w-full bg-white/[0.03] animate-pulse rounded-lg" />
                    </TableCell>
                  </TableRow>
                ))
              ) : reconciliations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="p-12 text-center text-white/40 text-xs">
                    No active currency ledgers found.
                  </TableCell>
                </TableRow>
              ) : (
                reconciliations.map((r) => {
                  const isClean = r.variance === 0;

                  return (
                    <TableRow key={r.currencyCode} className="h-16">
                      <TableCell className="font-semibold text-xs text-white">
                        {r.currencyCode}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-white/70">
                        +{formatAmount(r.totalPurchased)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-white/70">
                        -{formatAmount(r.totalSold)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-white/70">
                        {Number(r.totalAdjusted) >= 0 ? `+${formatAmount(r.totalAdjusted)}` : formatAmount(r.totalAdjusted)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold text-white">
                        {formatAmount(r.expectedBalance)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold text-white">
                        {formatAmount(r.actualLotSum)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold">
                        <span className={isClean ? "text-emerald-400" : "text-amber-400"}>
                          {isClean ? "0.00" : formatAmount(r.variance)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                            isClean
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-amber-500/10 text-amber-400"
                          }`}
                        >
                          {isClean ? "Verified" : "Mismatch"}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* CREATE STOCK ADJUSTMENT DIALOG */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen} maxWidth="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-amber-400" />
            Audit Stock Adjustment
          </DialogTitle>
          <DialogDescription>
            Record an audited inventory adjustment to resolve count variances or physical discrepancy.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreateAdjustment} className="space-y-4 my-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/70">Select Target Lot *</label>
            <Select
              value={selectedLotId}
              onChange={(e) => setSelectedLotId(e.target.value)}
              required
            >
              {lots.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.lotNumber} — {l.currency.code} ({formatAmount(l.remainingQuantity)} available)
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/70">Adjustment Type *</label>
              <Select
                value={adjustmentType}
                onChange={(e) => setAdjustmentType(e.target.value as any)}
              >
                <option value="INCREASE">Increase Stock (+)</option>
                <option value="DECREASE">Decrease Stock (-)</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/70">Units to Adjust *</label>
              <Input
                type="number"
                step="any"
                min="0.0001"
                required
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/70">Audited Reason * (Mandatory)</label>
            <Input
              required
              placeholder="e.g. Physical vault count discrepancy audited by Treasury head"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting}>
              Execute Adjustment
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
