"use client";

import React, { useEffect, useState } from "react";
import { formatAmount, formatCurrency, formatDate } from "@/lib/utils";
import { Layers, Search, Eye, Filter, Coins, CheckCircle2, Plus, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { EditLotModal } from "@/components/lots/edit-lot-modal";
import { CreateLotModal } from "@/components/lots/create-lot-modal";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LotsPage() {
  const router = useRouter();
  const [lots, setLots] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedLot, setSelectedLot] = useState<any>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const loadLots = async () => {
    setLoading(true);
    try {
      const [lRes, cRes] = await Promise.all([
        fetch(`/api/lots?currencyId=${currencyFilter}&status=${statusFilter}&search=${encodeURIComponent(search)}`),
        fetch("/api/currencies?activeOnly=true"),
      ]);

      if (lRes.ok) {
        const lJson = await lRes.json();
        if (lJson.success) setLots(lJson.data.items);
      }
      if (cRes.ok) {
        const cJson = await cRes.json();
        if (cJson.success) setCurrencies(cJson.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLots();
  }, [currencyFilter, statusFilter, search]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Lots</h1>
          <p className="text-sm text-white/50 mt-1">
            Individual currency lots with original cost basis, remaining units, and realized returns.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            onClick={() => setCreateOpen(true)}
            className="gap-2 shadow-[0_0_20px_rgba(255,255,255,0.06)]"
          >
            <Plus className="w-4 h-4" /> Buy / Add Lot
          </Button>
        </div>
      </div>


      {/* Segmented Status Tabs & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-x-auto">
          {[
            { id: "", label: "All Lots" },
            { id: "AVAILABLE", label: "In Stock" },
            { id: "PARTIALLY_SOLD", label: "Partially Sold" },
            { id: "SOLD_OUT", label: "Depleted" },
          ].map((tab) => {
            const isSelected = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isSelected
                    ? "bg-white text-black font-semibold shadow-sm"
                    : "text-white/60 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (lots.length === 0) return;
              const csvContent =
                "data:text/csv;charset=utf-8," +
                ["Lot Number,Currency,Purchase Date,Original Qty,Remaining Qty,Buy Rate,Realized Profit,Status"]
                  .concat(
                    lots.map(
                      (l) =>
                        `"${l.lotNumber}","${l.currency.code}","${l.purchaseDate}","${l.originalQuantity}","${l.remainingQuantity}","${l.purchasePrice}","${l.realizedProfit}","${l.status}"`
                    )
                  )
                  .join("\n");
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement("a");
              link.setAttribute("href", encodedUri);
              link.setAttribute("download", `lot_registry_${new Date().toISOString().slice(0, 10)}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="text-xs gap-1.5 border-white/[0.08]"
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-3" />
          <Input
            placeholder="Search lot number (e.g. LOT-1001 or custom tag)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value)}
          >
            <option value="">All Currencies</option>
            {currencies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Lots Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden backdrop-blur-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>LOT IDENTIFIER</TableHead>
              <TableHead>CURRENCY</TableHead>
              <TableHead>ACQUIRED</TableHead>
              <TableHead className="text-right">STOCK UTILIZATION</TableHead>
              <TableHead className="text-right">BUY RATE</TableHead>
              <TableHead className="text-right">REALIZED PROFIT</TableHead>
              <TableHead>STATUS</TableHead>
              <TableHead className="text-right">ACTION</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={8} className="py-5 text-center">
                    <div className="h-6 w-full bg-white/[0.03] animate-pulse rounded-lg" />
                  </TableCell>
                </TableRow>
              ))
            ) : lots.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="p-12 text-center">
                  <EmptyState
                    title="No lots found"
                    description="No inventory lots match your selected filters."
                  />
                </TableCell>
              </TableRow>
            ) : (
              lots.map((lot) => {
                const prec = lot.currency.decimalPrecision;
                const isPos = Number(lot.realizedProfit) >= 0;

                const orig = Number(lot.originalQuantity);
                const rem = Number(lot.remainingQuantity);
                const sold = orig - rem;
                const pctSold = orig > 0 ? Math.min(100, Math.max(0, Math.round((sold / orig) * 100))) : 0;

                const daysOld = Math.floor(
                  (Date.now() - new Date(lot.purchaseDate).getTime()) / (1000 * 60 * 60 * 24)
                );

                return (
                  <TableRow
                    key={lot.id}
                    onClick={() => router.push(`/lots/${lot.id}`)}
                    className="h-18 cursor-pointer hover:bg-white/[0.04] transition group"
                  >
                    <TableCell className="font-mono text-xs font-semibold text-white group-hover:text-white">
                      <div>
                        <div className="flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5 text-white/40 group-hover:text-white transition" />
                          <span className="text-sm font-semibold">{lot.lotNumber}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          {daysOld <= 3 ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Fresh ({daysOld}d)
                            </span>
                          ) : daysOld <= 30 ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/[0.04] text-white/50 border border-white/[0.08]">
                              {daysOld}d in vault
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Aged ({daysOld}d)
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="font-semibold text-xs text-white">{lot.currency.code}</span>
                      <div className="text-[10px] text-white/40">{lot.currency.name}</div>
                    </TableCell>

                    <TableCell className="text-xs text-white/50 whitespace-nowrap">
                      {formatDate(lot.purchaseDate)}
                    </TableCell>

                    {/* Linear Micro Depletion Bar & Balance */}
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-1.5">
                        <div className="flex items-center gap-1.5 font-mono text-xs tabular-nums">
                          <span className={rem === 0 ? "text-white/30" : "text-emerald-400 font-semibold"}>
                            {formatAmount(rem)}
                          </span>
                          <span className="text-[11px] text-white/40">/ {formatAmount(orig)}</span>
                        </div>
                        <div className="w-28 h-1.5 bg-white/[0.06] rounded-full overflow-hidden flex">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              rem === 0
                                ? "bg-white/20"
                                : pctSold >= 80
                                ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]"
                                : "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.3)]"
                            }`}
                            style={{ width: `${100 - pctSold}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-white/40">
                          {pctSold}% sold
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="text-right font-mono text-xs text-white/70 tabular-nums">
                      ₹{formatAmount(lot.purchasePrice, prec)}
                    </TableCell>

                    <TableCell className="text-right font-mono text-xs font-semibold tabular-nums">
                      <span className={isPos ? "text-emerald-400" : "text-rose-400"}>
                        +₹{formatAmount(lot.realizedProfit, prec)}
                      </span>
                    </TableCell>

                    <TableCell>
                      <StatusBadge status={lot.status} />
                    </TableCell>

                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedLot(lot);
                          setEditOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium text-white/60 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] transition inline-flex items-center gap-1.5"
                        title="Edit Lot Number and Details"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>

        </Table>
      </div>

      {/* Modals */}
      <CreateLotModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        currencies={currencies}
        onSuccess={loadLots}
      />

      <EditLotModal
        open={editOpen}
        onOpenChange={setEditOpen}
        lot={selectedLot}
        onSuccess={loadLots}
      />
    </div>
  );
}

