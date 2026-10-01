"use client";

import React, { useEffect, useState } from "react";
import { formatAmount, formatCurrency, formatDate } from "@/lib/utils";
import { Layers, Search, Eye, Filter, Coins, CheckCircle2 } from "lucide-react";
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
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LotsPage() {
  const router = useRouter();
  const [lots, setLots] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-3" />
          <Input
            placeholder="Search lot number (e.g. LOT-1001)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="w-full sm:w-44">
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
        <div className="w-full sm:w-44">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="AVAILABLE">AVAILABLE</option>
            <option value="PARTIALLY_SOLD">PARTIALLY SOLD</option>
            <option value="SOLD_OUT">SOLD OUT</option>
          </Select>
        </div>
      </div>

      {/* Lots Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden backdrop-blur-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>LOT</TableHead>
              <TableHead>CURRENCY</TableHead>
              <TableHead>PURCHASE DATE</TableHead>
              <TableHead className="text-right">ORIGINAL</TableHead>
              <TableHead className="text-right">REMAINING</TableHead>
              <TableHead className="text-right">BUY RATE</TableHead>
              <TableHead className="text-right">REALIZED PROFIT</TableHead>
              <TableHead>STATUS</TableHead>
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

                return (
                  <TableRow
                    key={lot.id}
                    onClick={() => router.push(`/lots/${lot.id}`)}
                    className="h-16 cursor-pointer hover:bg-white/[0.04] transition group"
                  >
                    <TableCell className="font-mono text-xs font-semibold text-white group-hover:text-white">
                      <div className="flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-white/40" />
                        <span>{lot.lotNumber}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-xs text-white">{lot.currency.code}</span>
                    </TableCell>
                    <TableCell className="text-xs text-white/50 whitespace-nowrap">
                      {formatDate(lot.purchaseDate)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-white/60 tabular-nums">
                      {formatAmount(lot.originalQuantity)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums font-semibold">
                      <span className={Number(lot.remainingQuantity) === 0 ? "text-white/30" : "text-emerald-400"}>
                        {formatAmount(lot.remainingQuantity)}
                      </span>
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
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
