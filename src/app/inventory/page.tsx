"use client";

import React, { useEffect, useState } from "react";
import { formatAmount, formatCurrency, formatDate } from "@/lib/utils";
import {
  Layers,
  Search,
  Download,
  AlertTriangle,
  Plus,
  RefreshCw,
  Edit2,
  ExternalLink,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Coins,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { CreateLotModal } from "@/components/lots/create-lot-modal";
import { EditLotModal } from "@/components/lots/edit-lot-modal";
import { useRouter } from "next/navigation";

export default function InventoryPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"ACTIVE_LOTS" | "DAILY_DAYBOOK">("ACTIVE_LOTS");

  // Lots state
  const [lots, setLots] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [currencyPositions, setCurrencyPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  // Daily Daybook State
  const [daybookDate, setDaybookDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [daybookData, setDaybookData] = useState<any[]>([]);
  const [loadingDaybook, setLoadingDaybook] = useState(false);

  // Modals state
  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<"OPENING_STOCK" | "PURCHASE">("OPENING_STOCK");
  const [editOpen, setEditOpen] = useState(false);
  const [selectedLot, setSelectedLot] = useState<any>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"" | "OPENING" | "PURCHASE">("");

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);

    try {
      const [lRes, cRes, pRes] = await Promise.all([
        fetch(
          `/api/lots?currencyId=${currencyFilter}&status=${statusFilter}&source=${sourceFilter}&search=${encodeURIComponent(
            search
          )}`
        ),
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
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadDaybook = async () => {
    setLoadingDaybook(true);
    try {
      const res = await fetch(`/api/reports/daily-stock?date=${daybookDate}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) setDaybookData(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDaybook(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currencyFilter, statusFilter, sourceFilter, search]);

  useEffect(() => {
    if (viewMode === "DAILY_DAYBOOK") {
      loadDaybook();
    }
  }, [viewMode, daybookDate]);

  // Live Auto-Refresh every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      loadData(true);
      if (viewMode === "DAILY_DAYBOOK") loadDaybook();
    }, 30000);
    return () => clearInterval(timer);
  }, [currencyFilter, statusFilter, sourceFilter, search, viewMode, daybookDate]);

  const handleExportCsv = () => {
    if (lots.length === 0) return;

    const headers = [
      "Lot Number",
      "Type",
      "Currency",
      "Purchase Date",
      "Supplier / Source",
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
      `"${l.isOpeningStock ? "OPENING_STOCK" : "PURCHASE"}"`,
      `"${l.currency.code}"`,
      `"${formatDate(l.purchaseDate)}"`,
      `"${l.purchase?.supplier || ""}"`,
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
    link.setAttribute("download", `live_forex_inventory_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportDaybookCsv = () => {
    if (daybookData.length === 0) return;

    const headers = [
      "Date",
      "Currency Code",
      "Currency Name",
      "Opening Stock (00:00)",
      "Inward Purchases (+)",
      "Outward Sales (-)",
      "Closing Stock Balance",
      "Realized Profit Today (INR)",
    ];

    const rows = daybookData.map((d) => [
      `"${daybookDate}"`,
      `"${d.currencyCode}"`,
      `"${d.currencyName}"`,
      d.openingStock,
      d.inwardToday,
      d.outwardToday,
      d.closingStock,
      d.realizedProfitToday,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `daily_stock_register_${daybookDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Summary Metrics
  const totalStockUnits = lots.reduce((acc, l) => acc + Number(l.remainingQuantity), 0);
  const totalStockValueINR = lots.reduce((acc, l) => acc + Number(l.stockValue), 0);
  const openingLots = lots.filter((l) => l.isOpeningStock);
  const openingStockUnits = openingLots.reduce((acc, l) => acc + Number(l.remainingQuantity), 0);
  const openingStockValue = openingLots.reduce((acc, l) => acc + Number(l.stockValue), 0);
  const purchaseLots = lots.filter((l) => !l.isOpeningStock);
  const activeLotsCount = lots.filter((l) => l.status !== "SOLD_OUT").length;
  const lowStockCurrenciesCount = currencyPositions.filter((p) => p.isLowStock).length;

  // Daybook Summary Totals
  const dayOpeningTotal = daybookData.reduce((acc, d) => acc + Number(d.openingStock), 0);
  const dayInwardTotal = daybookData.reduce((acc, d) => acc + Number(d.inwardToday), 0);
  const dayOutwardTotal = daybookData.reduce((acc, d) => acc + Number(d.outwardToday), 0);
  const dayClosingTotal = daybookData.reduce((acc, d) => acc + Number(d.closingStock), 0);
  const dayProfitTotal = daybookData.reduce((acc, d) => acc + Number(d.realizedProfitToday), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-white">Live Stock & Vault Desk</h1>
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>LIVE DESK</span>
              {lastUpdated && <span className="text-white/40 border-l border-white/10 pl-2">Sync: {lastUpdated}</span>}
            </div>
          </div>
          <p className="text-sm text-white/50 mt-1">
            Real-time physical vault inventory, daily opening stock daybook, and active lot management.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              loadData(true);
              if (viewMode === "DAILY_DAYBOOK") loadDaybook();
            }}
            disabled={isRefreshing || loadingDaybook}
            className="gap-1.5"
            title="Refresh Live Stock"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || loadingDaybook ? "animate-spin text-emerald-400" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={viewMode === "DAILY_DAYBOOK" ? handleExportDaybookCsv : handleExportCsv}
            className="gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            {viewMode === "DAILY_DAYBOOK" ? "Export Daybook" : "Export CSV"}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setCreateMode("OPENING_STOCK");
              setCreateOpen(true);
            }}
            className="gap-1.5 bg-amber-500/10 border-amber-500/30 hover:border-amber-500/50 hover:bg-amber-500/15 text-amber-200"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            + Record Opening Stock
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setCreateMode("PURCHASE");
              setCreateOpen(true);
            }}
            className="gap-1.5 shadow-[0_0_20px_rgba(255,255,255,0.06)]"
          >
            <Plus className="w-3.5 h-3.5" />
            + Inward Stock
          </Button>
        </div>
      </div>

      {/* Main View Mode Selector (Active Lots vs Daily Daybook) */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.08] w-fit backdrop-blur-md">
        <button
          type="button"
          onClick={() => setViewMode("ACTIVE_LOTS")}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition flex items-center gap-2 ${
            viewMode === "ACTIVE_LOTS"
              ? "bg-white text-black font-semibold shadow-sm"
              : "text-white/60 hover:text-white hover:bg-white/[0.04]"
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Active Lots & Vault Positions</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode("DAILY_DAYBOOK")}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition flex items-center gap-2 ${
            viewMode === "DAILY_DAYBOOK"
              ? "bg-white text-black font-semibold shadow-sm"
              : "text-white/60 hover:text-white hover:bg-white/[0.04]"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Daily Stock Register (Daybook)</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
            Opening vs Closing
          </span>
        </button>
      </div>

      {/* VIEW MODE 1: ACTIVE LOTS & VAULT POSITIONS */}
      {viewMode === "ACTIVE_LOTS" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Summary KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Total Stock */}
            <div className="p-5 rounded-2xl bg-white/[0.025] border border-white/[0.06] backdrop-blur-sm">
              <div className="text-[11px] font-medium uppercase tracking-wider text-white/40">Total Live Stock</div>
              <div className="text-2xl font-semibold text-white tracking-tight mt-1 tabular-nums font-mono">
                {formatAmount(totalStockUnits)}
              </div>
              <div className="text-xs text-white/40 mt-1">Units available across vaults</div>
            </div>

            {/* Stock Value */}
            <div className="p-5 rounded-2xl bg-white/[0.025] border border-white/[0.06] backdrop-blur-sm">
              <div className="text-[11px] font-medium uppercase tracking-wider text-white/40">Vault Stock Value</div>
              <div className="text-2xl font-semibold text-white tracking-tight mt-1 tabular-nums font-mono">
                ₹{formatAmount(totalStockValueINR)}
              </div>
              <div className="text-xs text-white/40 mt-1">Valued at historical acquisition cost</div>
            </div>

            {/* Opening Stock KPI */}
            <div className="p-5 rounded-2xl bg-amber-500/[0.03] border border-amber-500/20 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-medium uppercase tracking-wider text-amber-300/80">Opening Stock</div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono">
                  {openingLots.length} {openingLots.length === 1 ? "lot" : "lots"}
                </span>
              </div>
              <div className="text-2xl font-semibold text-white tracking-tight mt-1 tabular-nums font-mono">
                {formatAmount(openingStockUnits)}{" "}
                <span className="text-xs font-normal text-white/40 font-sans">units</span>
              </div>
              <div className="text-xs text-amber-300/60 mt-1 font-mono">
                ₹{formatAmount(openingStockValue)} remaining balance
              </div>
            </div>

            {/* Active Lots */}
            <div className="p-5 rounded-2xl bg-white/[0.025] border border-white/[0.06] backdrop-blur-sm">
              <div className="text-[11px] font-medium uppercase tracking-wider text-white/40">Active Lots</div>
              <div className="text-2xl font-semibold text-white tracking-tight mt-1 tabular-nums font-mono">
                {activeLotsCount}
              </div>
              <div className="text-xs text-white/40 mt-1">Lots currently with positive stock</div>
            </div>

            {/* Low Stock */}
            <div className="p-5 rounded-2xl bg-white/[0.025] border border-white/[0.06] backdrop-blur-sm">
              <div className="text-[11px] font-medium uppercase tracking-wider text-white/40">Low Stock Alert</div>
              <div
                className={`text-2xl font-semibold tracking-tight mt-1 tabular-nums font-mono ${
                  lowStockCurrenciesCount > 0 ? "text-amber-400" : "text-white"
                }`}
              >
                {lowStockCurrenciesCount}
              </div>
              <div className="text-xs text-white/40 mt-1">Currencies below target threshold</div>
            </div>
          </div>

          {/* Currency Position Overview Cards with Progress */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {currencyPositions.map((pos) => {
              const isLow = pos.isLowStock;
              const ratio = Math.min(
                100,
                Math.round((Number(pos.totalRemaining) / (Number(pos.minStockThreshold) * 3 || 1000)) * 100)
              );

              const isFiltered = currencyFilter === currencies.find((c) => c.code === pos.currencyCode)?.id;

              return (
                <div
                  key={pos.currencyCode}
                  onClick={() => {
                    const c = currencies.find((cur) => cur.code === pos.currencyCode);
                    if (c) {
                      setCurrencyFilter(currencyFilter === c.id ? "" : c.id);
                    }
                  }}
                  className={`p-5 rounded-2xl bg-white/[0.02] border transition cursor-pointer ${
                    isFiltered
                      ? "border-white bg-white/[0.05] shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                      : "border-white/[0.06] hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base text-white">{pos.currencyCode}</span>
                      <span className="text-xs text-white/40 font-mono">{pos.symbol}</span>
                    </div>
                    {isFiltered && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white text-black font-sans">
                        Filtered
                      </span>
                    )}
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

          {/* Segmented Filter Bar: Source & Status */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Source Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-x-auto">
              {[
                { id: "", label: "All Stock" },
                { id: "OPENING", label: `🏛️ Opening Stock (${openingLots.length})` },
                { id: "PURCHASE", label: `📦 Purchases (${purchaseLots.length})` },
              ].map((tab) => {
                const isSelected = sourceFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setSourceFilter(tab.id as any)}
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

            {/* Quick Status Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-x-auto">
              {[
                { id: "", label: "All Status" },
                { id: "AVAILABLE", label: "In Stock" },
                { id: "PARTIALLY_SOLD", label: "Partially Sold" },
                { id: "SOLD_OUT", label: "Sold Out" },
              ].map((tab) => {
                const isSelected = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                      isSelected
                        ? "bg-white/20 text-white font-medium"
                        : "text-white/50 hover:text-white hover:bg-white/[0.03]"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search & Currency Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-3" />
              <Input
                placeholder="Search lot number or counterparty notes (e.g. LOT-1001, Opening Balance)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="w-full sm:w-52">
              <Select value={currencyFilter} onChange={(e) => setCurrencyFilter(e.target.value)}>
                <option value="">All Currencies</option>
                {currencies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Live Inventory Lot Registry Table */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden backdrop-blur-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>LOT IDENTIFIER</TableHead>
                  <TableHead>CURRENCY</TableHead>
                  <TableHead>ACQUIRED</TableHead>
                  <TableHead className="text-right">STOCK UTILIZATION</TableHead>
                  <TableHead className="text-right">BUY RATE</TableHead>
                  <TableHead className="text-right">STOCK VALUE</TableHead>
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
                        title="No inventory lots found"
                        description="No active stock matches the selected criteria or filters."
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  lots.map((lot) => {
                    const prec = lot.currency.decimalPrecision;
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
                        {/* Lot Identifier + Opening Stock badge + aging */}
                        <TableCell className="font-mono text-xs font-semibold text-white group-hover:text-white">
                          <div>
                            <div className="flex items-center gap-2">
                              <Layers className="w-3.5 h-3.5 text-white/40 group-hover:text-white transition" />
                              <span className="text-sm font-semibold">{lot.lotNumber}</span>
                              {lot.isOpeningStock && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-sans font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 inline-flex items-center gap-1">
                                  🏛️ Opening
                                </span>
                              )}
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

                        {/* Currency */}
                        <TableCell>
                          <span className="font-semibold text-xs text-white">{lot.currency.code}</span>
                          <div className="text-[10px] text-white/40">{lot.currency.name}</div>
                        </TableCell>

                        {/* Acquired Date & Source */}
                        <TableCell className="text-xs text-white/50 whitespace-nowrap">
                          <div>{formatDate(lot.purchaseDate)}</div>
                          <div className="text-[10px] text-white/40 truncate max-w-[130px]">
                            {lot.purchase?.supplier || (lot.isOpeningStock ? "Opening Balance" : "Vendor Purchase")}
                          </div>
                        </TableCell>

                        {/* Stock Utilization with Linear Micro-Depletion Progress Bar */}
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

                        {/* Purchase Price */}
                        <TableCell className="text-right font-mono text-xs text-white/70 tabular-nums">
                          ₹{formatAmount(lot.purchasePrice, prec)}
                        </TableCell>

                        {/* Stock Value */}
                        <TableCell className="text-right font-mono text-xs font-semibold text-white tabular-nums">
                          ₹{formatAmount(lot.stockValue, prec)}
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <StatusBadge status={lot.status} />
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedLot(lot);
                                setEditOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-medium text-white/60 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] transition inline-flex items-center gap-1.5"
                              title="Edit Lot Number and Notes"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => router.push(`/lots/${lot.id}`)}
                              className="p-1 rounded-lg text-white/40 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] transition"
                              title="View Lot Breakdown"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: DAILY STOCK REGISTER (DAYBOOK) */}
      {viewMode === "DAILY_DAYBOOK" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Daybook Date Selector Bar */}
          <div className="p-4 rounded-2xl bg-white/[0.025] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <div className="text-xs uppercase tracking-wider text-white/40 font-semibold">
                  Select Trading Day
                </div>
                <div className="text-sm font-semibold text-white">
                  Opening vs Closing Stock Equation Register
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDaybookDate(new Date().toISOString().slice(0, 10))}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  daybookDate === new Date().toISOString().slice(0, 10)
                    ? "bg-white text-black font-semibold shadow-sm"
                    : "bg-white/[0.04] text-white/60 hover:text-white"
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() - 1);
                  setDaybookDate(d.toISOString().slice(0, 10));
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.04] text-white/60 hover:text-white transition"
              >
                Yesterday
              </button>
              <Input
                type="date"
                value={daybookDate}
                onChange={(e) => setDaybookDate(e.target.value)}
                className="h-8 text-xs font-mono w-36 bg-black/40 border-white/[0.1]"
              />
            </div>
          </div>

          {/* Daily Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Opening Stock */}
            <div className="p-5 rounded-2xl bg-amber-500/[0.04] border border-amber-500/20 backdrop-blur-sm">
              <div className="text-[11px] font-medium uppercase tracking-wider text-amber-300">
                1. Daily Opening Stock
              </div>
              <div className="text-2xl font-semibold text-white tracking-tight mt-1 tabular-nums font-mono">
                {formatAmount(dayOpeningTotal)}
              </div>
              <div className="text-xs text-amber-300/60 mt-1">Starting vault balance at 00:00 hrs</div>
            </div>

            {/* Inward Purchases */}
            <div className="p-5 rounded-2xl bg-emerald-500/[0.03] border border-emerald-500/20 backdrop-blur-sm">
              <div className="text-[11px] font-medium uppercase tracking-wider text-emerald-400">
                2. Inward Today (+)
              </div>
              <div className="text-2xl font-semibold text-emerald-400 tracking-tight mt-1 tabular-nums font-mono">
                +{formatAmount(dayInwardTotal)}
              </div>
              <div className="text-xs text-white/40 mt-1">New currency bought/inwarded</div>
            </div>

            {/* Outward Sales */}
            <div className="p-5 rounded-2xl bg-rose-500/[0.03] border border-rose-500/20 backdrop-blur-sm">
              <div className="text-[11px] font-medium uppercase tracking-wider text-rose-400">
                3. Outward Today (-)
              </div>
              <div className="text-2xl font-semibold text-rose-400 tracking-tight mt-1 tabular-nums font-mono">
                -{formatAmount(dayOutwardTotal)}
              </div>
              <div className="text-xs text-white/40 mt-1">Dispatched in customer sales</div>
            </div>

            {/* Closing Stock */}
            <div className="p-5 rounded-2xl bg-white/[0.025] border border-white/[0.08] backdrop-blur-sm">
              <div className="text-[11px] font-medium uppercase tracking-wider text-white/70">
                4. Closing Vault Stock
              </div>
              <div className="text-2xl font-semibold text-white tracking-tight mt-1 tabular-nums font-mono">
                {formatAmount(dayClosingTotal)}
              </div>
              <div className="text-xs text-white/40 mt-1">Opening + Inward - Outward</div>
            </div>

            {/* Day Realized Profit */}
            <div className="p-5 rounded-2xl bg-emerald-500/[0.03] border border-emerald-500/20 backdrop-blur-sm">
              <div className="text-[11px] font-medium uppercase tracking-wider text-emerald-400">
                5. Day's Realized Profit
              </div>
              <div className="text-2xl font-semibold text-emerald-400 tracking-tight mt-1 tabular-nums font-mono">
                +₹{formatAmount(dayProfitTotal)}
              </div>
              <div className="text-xs text-white/40 mt-1">Net trading spread earned today</div>
            </div>
          </div>

          {/* Daily Stock Equation Formula Banner */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs font-mono text-white/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-amber-300">Opening Stock</span>
              <span>+</span>
              <span className="text-emerald-400">Inward Today</span>
              <span>-</span>
              <span className="text-rose-400">Outward Today</span>
              <span>=</span>
              <span className="text-white font-semibold">Closing Vault Stock</span>
            </div>
            <div className="text-white/40 text-[11px]">
              Forex Daybook Standard (Date: {daybookDate})
            </div>
          </div>

          {/* Daily Stock Register Table */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden backdrop-blur-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CURRENCY</TableHead>
                  <TableHead className="text-right">OPENING STOCK (00:00)</TableHead>
                  <TableHead className="text-right">INWARD TODAY (+)</TableHead>
                  <TableHead className="text-right">OUTWARD TODAY (-)</TableHead>
                  <TableHead className="text-right">CLOSING STOCK (VAULT)</TableHead>
                  <TableHead className="text-right">NET DAY VARIATION</TableHead>
                  <TableHead className="text-right">DAY'S REALIZED PROFIT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingDaybook ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7} className="py-5 text-center">
                        <div className="h-6 w-full bg-white/[0.03] animate-pulse rounded-lg" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : daybookData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="p-12 text-center">
                      <EmptyState
                        title="No daybook data found"
                        description="No currency ledger transactions recorded on this date."
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  daybookData.map((d) => {
                    const netChange = Number(d.inwardToday) - Number(d.outwardToday);
                    const isPosChange = netChange >= 0;

                    return (
                      <TableRow key={d.currencyId} className="h-16 hover:bg-white/[0.03] transition">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-white">{d.currencyCode}</span>
                            <span className="text-xs text-white/40 font-mono">({d.symbol})</span>
                          </div>
                          <div className="text-[10px] text-white/40">{d.currencyName}</div>
                        </TableCell>

                        {/* Opening Stock */}
                        <TableCell className="text-right font-mono text-xs font-semibold text-amber-300/90 tabular-nums">
                          {formatAmount(d.openingStock)}
                        </TableCell>

                        {/* Inward Purchases */}
                        <TableCell className="text-right font-mono text-xs text-emerald-400 tabular-nums font-medium">
                          {Number(d.inwardToday) > 0 ? `+${formatAmount(d.inwardToday)}` : "—"}
                        </TableCell>

                        {/* Outward Sales */}
                        <TableCell className="text-right font-mono text-xs text-rose-400 tabular-nums font-medium">
                          {Number(d.outwardToday) > 0 ? `-${formatAmount(d.outwardToday)}` : "—"}
                        </TableCell>

                        {/* Closing Stock */}
                        <TableCell className="text-right font-mono text-xs font-bold text-white tabular-nums">
                          {formatAmount(d.closingStock)}
                        </TableCell>

                        {/* Net Variation */}
                        <TableCell className="text-right font-mono text-xs tabular-nums">
                          <span
                            className={`inline-flex items-center gap-0.5 ${
                              netChange === 0
                                ? "text-white/40"
                                : isPosChange
                                ? "text-emerald-400"
                                : "text-rose-400"
                            }`}
                          >
                            {netChange > 0 && "+"}
                            {formatAmount(netChange)}
                          </span>
                        </TableCell>

                        {/* Realized Profit */}
                        <TableCell className="text-right font-mono text-xs font-semibold text-emerald-400 tabular-nums">
                          +₹{formatAmount(d.realizedProfitToday)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateLotModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        currencies={currencies}
        initialMode={createMode}
        onSuccess={() => {
          loadData(true);
          if (viewMode === "DAILY_DAYBOOK") loadDaybook();
        }}
      />

      <EditLotModal
        open={editOpen}
        onOpenChange={setEditOpen}
        lot={selectedLot}
        onSuccess={() => {
          loadData(true);
          if (viewMode === "DAILY_DAYBOOK") loadDaybook();
        }}
      />
    </div>
  );
}
