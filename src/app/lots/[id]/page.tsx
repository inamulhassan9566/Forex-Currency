"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatAmount, formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import {
  Layers,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  ShoppingCart,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  Clock,
  ExternalLink,
  Edit2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { EditLotModal } from "@/components/lots/edit-lot-modal";
import Link from "next/link";

export default function LotDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [lot, setLot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    async function loadLot() {
      try {
        const res = await fetch(`/api/lots/${params.id}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success) setLot(json.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadLot();
  }, [params.id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 bg-white/[0.04] animate-pulse rounded" />
        <div className="h-64 bg-white/[0.02] border border-white/[0.06] rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!lot) {
    return (
      <div className="p-16 text-center space-y-4">
        <h2 className="text-xl font-semibold text-white">Lot Not Found</h2>
        <p className="text-xs text-white/50">The requested inventory lot does not exist.</p>
        <Button variant="secondary" onClick={() => router.push("/lots")}>
          Back to Lots
        </Button>
      </div>
    );
  }

  const prec = lot.currency.decimalPrecision;
  const isPosProfit = lot.realizedProfitNum >= 0;

  return (
    <div className="space-y-8">
      {/* Top Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => router.push("/lots")} className="gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xl font-semibold text-white">{lot.lotNumber}</span>
            <span className="text-sm font-semibold text-white/60">{lot.currency.code}</span>
            <StatusBadge status={lot.status} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-white/40 hidden sm:block">
            Acquired on {formatDate(lot.purchaseDate)}
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setEditOpen(true)}
            className="gap-1.5 border-white/[0.1] hover:border-white/20"
          >
            <Edit2 className="w-3.5 h-3.5" /> Edit Lot
          </Button>
        </div>
      </div>


      {/* Hero Remaining Stock Display */}
      <div className="p-8 rounded-3xl bg-white/[0.025] border border-white/[0.08] backdrop-blur-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="text-xs uppercase tracking-widest text-white/40 font-semibold">
              UNITS REMAINING
            </div>
            <div className="text-6xl font-light tracking-tight text-white font-mono mt-2 tabular-nums">
              {formatAmount(lot.remainingQuantityNum)}
            </div>
            <div className="text-xs text-white/40 mt-2 font-mono">
              of {formatAmount(lot.originalQuantityNum)} {lot.currency.code} initial acquisition
            </div>
          </div>

          <div className="flex flex-wrap gap-8 md:gap-12 border-t md:border-t-0 md:border-l border-white/[0.08] pt-4 md:pt-0 md:pl-12">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-white/40">Original</div>
              <div className="text-2xl font-semibold text-white font-mono mt-1">
                {formatAmount(lot.originalQuantityNum)}
              </div>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-wider text-white/40">Sold</div>
              <div className="text-2xl font-semibold text-white font-mono mt-1">
                {formatAmount(lot.soldQuantityNum)}
              </div>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-wider text-white/40">Purchase Price</div>
              <div className="text-2xl font-semibold text-white font-mono mt-1">
                ₹{formatAmount(lot.purchasePriceNum, prec)}
              </div>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-wider text-white/40">Realized Profit</div>
              <div className={`text-2xl font-semibold font-mono mt-1 ${isPosProfit ? "text-emerald-400" : "text-rose-400"}`}>
                +₹{formatAmount(lot.realizedProfitNum, prec)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TRANSACTION HISTORY VISUAL TIMELINE */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white">Transaction History</h2>
          <p className="text-xs text-white/50 mt-0.5">
            Chronological lifecycle and ledger balance progression for this lot.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
          <div className="relative pl-6 space-y-8 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-white/[0.1]">
            {lot.inventoryTransactions?.map((tx: any, idx: number) => {
              const isPurchase = tx.transactionType === "PURCHASE";
              const isSale = tx.transactionType === "SALE";
              const isReversal = tx.transactionType === "SALE_REVERSAL";

              return (
                <div key={tx.id} className="relative group">
                  {/* Timeline Node Indicator */}
                  <div
                    className={`absolute -left-[27px] top-1.5 w-3 h-3 rounded-full border-2 ${
                      isPurchase
                        ? "bg-white border-white"
                        : isSale
                        ? "bg-[#070708] border-emerald-400"
                        : isReversal
                        ? "bg-[#070708] border-rose-400"
                        : "bg-[#070708] border-white/40"
                    }`}
                  />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-medium text-white/40 uppercase">
                          {formatDate(tx.transactionDate)}
                        </span>
                        <span className="text-xs font-semibold text-white">
                          {isPurchase && `Purchase +${formatAmount(tx.quantityIn)} ${lot.currency.code}`}
                          {isSale && `Sale -${formatAmount(tx.quantityOut)} ${lot.currency.code}`}
                          {isReversal && `Reversal +${formatAmount(tx.quantityIn)} ${lot.currency.code}`}
                        </span>
                      </div>
                      <div className="text-xs text-white/50 mt-1">
                        {tx.notes || (tx.referenceType === "PURCHASE" ? "Initial lot creation" : "Sales deduction")}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wider text-white/40">Current Balance</div>
                      <div className="text-sm font-mono font-semibold text-white">
                        {formatAmount(tx.balanceAfter)} {lot.currency.code}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Lot Notes & Physical Storage Info */}
      {lot.notes && (
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-start gap-3 text-xs">
          <FileText className="w-4 h-4 text-white/40 mt-0.5 shrink-0" />
          <div>
            <div className="text-white/40 font-medium uppercase tracking-wider text-[10px]">
              Vault Notes & Physical Storage
            </div>
            <div className="text-white/80 mt-1 leading-relaxed">{lot.notes}</div>
          </div>
        </div>
      )}

      {/* Edit Lot Modal */}
      <EditLotModal
        open={editOpen}
        onOpenChange={setEditOpen}
        lot={lot}
        onSuccess={(updated) => {
          setLot((prev: any) => ({
            ...prev,
            lotNumber: updated.lotNumber,
            notes: updated.notes,
            status: updated.status,
          }));
        }}
      />
    </div>
  );
}

