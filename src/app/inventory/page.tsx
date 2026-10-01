"use client";

import React, { useEffect, useState } from "react";
import { formatAmount, formatCurrency, formatDate } from "@/lib/utils";
import { Boxes, Search, Download, Layers, Eye, AlertTriangle, Plus, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function InventoryPage() {
  const router = useRouter();
  const [lots, setLots] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [currencyPositions, setCurrencyPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [lRes, cRes, pRes] = await Promise.all([
        fetch(`/api/lots?currencyId=${currencyFilter}&status=${statusFilter}&search=${encodeURIComponent(search)}`),
        fetch("/api/currencies?activeOnly=true"),
        fetch("/api/reports/currency"),
      ]);

      if (lRes.ok) {
        const lJson = await lRes.json();
        if (lJson.success) setLots(lJson.data.items);
      }
      if (cRes.ok) {
        const cJson = await cRes.json();
        if (cJson.success) setCurrencies(cJson.data);
      }
      if (pRes.ok) {
        const pJson = await pRes.json();
        if (pJson.success) setCurrencyPositions(pJson.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currencyFilter, statusFilter, search]);

  const handleExportCsv = () => {
    if (lots.length === 0) return;

    const headers = [
      "Lot Number",
      "Currency",
      "Purchase Date",
      "Original Quantity",
      "Sold Quantity",
      "Remaining Quantity",
      "Purchase Price",
      "Stock Value",
      "Realized Profit",
      "Status",
    ];

    const rows = lots.map((l) => [
      `"${l.lotNumber}"`,
      `"${l.currency.code}"`,
      `"${formatDate(l.purchaseDate)}"`,
      l.originalQuantity,
      l.soldQuantity,
      l.remainingQuantity,
      l.purchasePrice,
      l.stockValue,
      l.realizedProfit,
      `"${l.status}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `forex_inventory_lots_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Summary Metrics
  const totalStockUnits = lots.reduce((acc, l) => acc + Number(l.remainingQuantity), 0);
  const totalStockValueINR = lots.reduce((acc, l) => acc + Number(l.stockValue), 0);
  const activeLotsCount = lots.filter((l) => l.status !== "SOLD_OUT").length;
  const lowStockCurrenciesCount = currencyPositions.filter((p) => p.isLowStock).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Inventory</h1>
          <p className="text-sm text-white/50 mt-1">
            Manage currency stock across active lots and vault positions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={handleExportCsv} className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button variant="primary" onClick={() => router.push("/purchases")} className="gap-2">
            <Plus className="w-4 h-4" />
            + New Purchase
          </Button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white/[0.025] border border-white/[0.06] backdrop-blur-sm">
          <div className="text-[11px] font-medium uppercase tracking-wider text-white/40">Total Stock</div>
          <div className="text-2xl font-semibold text-white tracking-tight mt-1 tabular-nums font-mono">
            {formatAmount(totalStockUnits)}
          </div>
          <div className="text-xs text-white/40 mt-1">Units available across vaults</div>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.025] border border-white/[0.06] backdrop-blur-sm">
          <div className="text-[11px] font-medium uppercase tracking-wider text-white/40">Stock Value</div>
          <div className="text-2xl font-semibold text-white tracking-tight mt-1 tabular-nums font-mono">
            ₹{formatAmount(totalStockValueINR)}
          </div>
          <div className="text-xs text-white/40 mt-1">Valued at historical acquisition cost</div>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.025] border border-white/[0.06] backdrop-blur-sm">
          <div className="text-[11px] font-medium uppercase tracking-wider text-white/40">Active Lots</div>
          <div className="text-2xl font-semibold text-white tracking-tight mt-1 tabular-nums font-mono">
            {activeLotsCount}
          </div>
          <div className="text-xs text-white/40 mt-1">Lots currently with positive stock</div>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.025] border border-white/[0.06] backdrop-blur-sm">
          <div className="text-[11px] font-medium uppercase tracking-wider text-white/40">Low Stock</div>
          <div className={`text-2xl font-semibold tracking-tight mt-1 tabular-nums font-mono ${
            lowStockCurrenciesCount > 0 ? "text-amber-400" : "text-white"
          }`}>
            {lowStockCurrenciesCount}
          </div>
          <div className="text-xs text-white/40 mt-1">Currencies below minimum threshold</div>
        </div>
      </div>

      {/* Currency Position Overview Cards with Progress */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {currencyPositions.map((pos) => {
          const isLow = pos.isLowStock;
          const ratio = Math.min(100, Math.round((Number(pos.totalRemaining) / (Number(pos.minStockThreshold) * 3 || 1000)) * 100));

          return (
            <div
              key={pos.currencyCode}
              onClick={() => {
                const c = currencies.find((cur) => cur.code === pos.currencyCode);
                if (c) setCurrencyFilter(c.id);
              }}
              className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/20 transition cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-base text-white">{pos.currencyCode}</span>
                <span className="text-xs text-white/40 font-mono">{pos.symbol}</span>
              </div>

              <div className="text-2xl font-semibold text-white tracking-tight mt-2 tabular-nums font-mono">
                {formatAmount(pos.totalRemaining)}{" "}
                <span className="text-xs font-normal text-white/40 font-sans">units</span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-white/[0.06] h-1.5 rounded-full overflow-hidden mt-3">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isLow ? "bg-amber-400" : "bg-white"
                  }`}
                  style={{ width: `${Math.max(8, ratio)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-white/40 mt-3 pt-2 border-t border-white/[0.04]">
                <span>Stock Value:</span>
                <span className="font-mono text-white font-medium">
                  {formatCurrency(pos.totalInventoryValue, pos.currencyCode)}
                </span>
              </div>

              {isLow && (
                <div className="text-[11px] font-medium text-amber-400 flex items-center gap-1.5 mt-2">
                  <AlertTriangle className="w-3.5 h-3.5" /> Below target threshold ({pos.minStockThreshold})
                </div>
              )}
            </div>
          );
        })}
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

      {/* Inventory Lot Registry Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden backdrop-blur-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>LOT</TableHead>
              <TableHead>CURRENCY</TableHead>
              <TableHead>PURCHASE DATE</TableHead>
              <TableHead className="text-right">ORIGINAL</TableHead>
              <TableHead className="text-right">REMAINING</TableHead>
              <TableHead className="text-right">PURCHASE PRICE</TableHead>
              <TableHead className="text-right">STOCK VALUE</TableHead>
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
                    title="No inventory lots found"
                    description="No active lots match the selected currency or status criteria."
                  />
                </TableCell>
              </TableRow>
            ) : (
              lots.map((lot) => {
                const prec = lot.currency.decimalPrecision;
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
                    <TableCell className="text-right font-mono text-xs font-semibold text-white tabular-nums">
                      ₹{formatAmount(lot.stockValue, prec)}
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
