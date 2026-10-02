"use client";

import React, { useEffect, useState } from "react";
import { formatAmount, formatCurrency, formatDate } from "@/lib/utils";
import {
  BarChart3,
  Download,
  Filter,
  Layers,
  Coins,
  TrendingUp,
  FileSpreadsheet,
  ArrowRight,
  ShoppingCart,
  BookOpen,
  Scale,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import Link from "next/link";

type ReportType =
  | "LOT_PROFIT"
  | "SALES"
  | "PURCHASES"
  | "INVENTORY"
  | "STOCK_MOVEMENT"
  | "RECONCILIATION";

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportType>("LOT_PROFIT");
  const [lotData, setLotData] = useState<any[]>([]);
  const [currencyData, setCurrencyData] = useState<any[]>([]);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [purchaseData, setPurchaseData] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [ledgerData, setLedgerData] = useState<any[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState("");
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [lRes, cRes, sRes, pRes, curRes, ledRes] = await Promise.all([
        fetch(`/api/reports/lot-profit?currencyId=${selectedCurrency}`),
        fetch("/api/reports/currency"),
        fetch("/api/sales"),
        fetch("/api/purchases"),
        fetch("/api/currencies?activeOnly=true"),
        fetch("/api/ledger"),
      ]);

      if (lRes.ok) {
        const json = await lRes.json();
        if (json.success) setLotData(json.data);
      }
      if (ledRes.ok) {
        const json = await ledRes.json();
        if (json.success) setLedgerData(json.data.items);
      }
      if (cRes.ok) {
        const json = await cRes.json();
        if (json.success) setCurrencyData(json.data);
      }
      if (sRes.ok) {
        const json = await sRes.json();
        if (json.success) setSalesData(json.data.items);
      }
      if (pRes.ok) {
        const json = await pRes.json();
        if (json.success) setPurchaseData(json.data.items);
      }
      if (curRes.ok) {
        const json = await curRes.json();
        if (json.success) setCurrencies(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCurrency]);

  const handleExportCurrent = () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let filename = `report_${selectedReport.toLowerCase()}_${Date.now()}.csv`;

    if (selectedReport === "LOT_PROFIT") {
      headers = ["Lot Number", "Currency", "Units Sold", "Buy Rate", "Sell Rate", "Realized Profit", "Margin %", "Status"];
      rows = lotData.map((l) => [
        `"${l.lotNumber}"`,
        `"${l.currencyCode}"`,
        l.soldQuantity,
        l.purchasePrice,
        l.averageSellPrice,
        l.realizedProfit,
        l.profitMarginPercent,
        `"${l.status}"`,
      ]);
    } else if (selectedReport === "INVENTORY") {
      headers = ["Currency", "Available Stock", "Stock Value (INR)", "Min Threshold", "Low Stock Alert"];
      rows = currencyData.map((c) => [
        `"${c.currencyCode}"`,
        c.totalRemaining,
        c.totalInventoryValue,
        c.minStockThreshold,
        c.isLowStock ? "YES" : "NO",
      ]);
    } else if (selectedReport === "SALES") {
      headers = ["Sale ID", "Date", "Currency", "Quantity", "Sell Price", "Total Sale", "Profit", "Status"];
      rows = salesData.map((s) => [
        `"${s.saleNumber}"`,
        `"${formatDate(s.saleDate)}"`,
        `"${s.currency.code}"`,
        s.totalQuantity,
        s.averageSellPrice,
        s.totalSaleAmount,
        s.totalRealizedProfit,
        `"${s.status}"`,
      ]);
    } else if (selectedReport === "PURCHASES") {
      headers = ["PO ID", "Date", "Currency", "Quantity", "Buy Price", "Total Cost", "Lot Created", "Status"];
      rows = purchaseData.map((p) => [
        `"${p.purchaseNumber}"`,
        `"${formatDate(p.purchaseDate)}"`,
        `"${p.currency.code}"`,
        p.quantity,
        p.purchasePrice,
        p.totalAmount,
        `"${p.lot.lotNumber}"`,
        `"${p.lot.status}"`,
      ]);
    } else if (selectedReport === "STOCK_MOVEMENT") {
      headers = ["Date", "Lot Number", "Currency", "Movement Type", "Quantity In (+)", "Quantity Out (-)", "Balance After", "Notes"];
      rows = ledgerData.map((tx) => [
        `"${formatDate(tx.transactionDate)}"`,
        `"${tx.lot?.lotNumber || ""}"`,
        `"${tx.currency?.code || ""}"`,
        `"${tx.transactionType === "OPENING_BALANCE" ? "OPENING_STOCK" : tx.transactionType}"`,
        tx.quantityIn,
        tx.quantityOut,
        tx.balanceAfter,
        `"${tx.notes || tx.referenceType}"`,
      ]);
    }

    if (rows.length === 0) return;

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reportCards = [
    {
      id: "LOT_PROFIT" as ReportType,
      title: "Lot Profit Report",
      description: "Lot-by-lot realized profit, buy rate vs sell rate spread, and net percentage yield.",
      icon: TrendingUp,
      lastGenerated: "Just now",
    },
    {
      id: "SALES" as ReportType,
      title: "Sales Report",
      description: "Dispatched currency volume, counterparty settlement amounts, and realized returns.",
      icon: BarChart3,
      lastGenerated: "Today",
    },
    {
      id: "PURCHASES" as ReportType,
      title: "Purchase Report",
      description: "Inbound forex transactions, capital outlays, supplier counterparty trades, and lot generation.",
      icon: ShoppingCart,
      lastGenerated: "Today",
    },
    {
      id: "INVENTORY" as ReportType,
      title: "Inventory Report",
      description: "Aggregate vault positions, remaining units, cost valuations, and compliance thresholds.",
      icon: Coins,
      lastGenerated: "Just now",
    },
    {
      id: "STOCK_MOVEMENT" as ReportType,
      title: "Stock Movement",
      description: "Complete immutable audit ledger of all lot deposits, deductions, and adjustments.",
      icon: BookOpen,
      lastGenerated: "Live Feed",
    },
    {
      id: "RECONCILIATION" as ReportType,
      title: "Reconciliation",
      description: "Variance analysis comparing expected stock equation against actual physical vault counts.",
      icon: Scale,
      lastGenerated: "Daily Audit",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Reports</h1>
          <p className="text-sm text-white/50 mt-1">
            Export structured financial statements, position sheets, and audit proofs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-40">
            <Select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
            >
              <option value="">All Currencies</option>
              {currencies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code}
                </option>
              ))}
            </Select>
          </div>

          <Button variant="primary" onClick={handleExportCurrent} className="gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* 6 LARGE REPORT CARDS (SECTION 27) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportCards.map((r) => {
          const Icon = r.icon;
          const isSelected = selectedReport === r.id;

          return (
            <div
              key={r.id}
              onClick={() => setSelectedReport(r.id)}
              className={`p-6 rounded-2xl border cursor-pointer transition-all ${
                isSelected
                  ? "bg-white/[0.05] border-white/40 shadow-[0_0_30px_rgba(255,255,255,0.04)]"
                  : "bg-white/[0.02] border-white/[0.06] hover:border-white/20"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-[11px] font-mono text-white/40">{r.lastGenerated}</span>
              </div>

              <h3 className="text-base font-semibold text-white tracking-tight mt-4">
                {r.title}
              </h3>
              <p className="text-xs text-white/50 mt-1.5 line-clamp-2 leading-relaxed">
                {r.description}
              </p>

              <div className="flex items-center justify-between mt-5 pt-3 border-t border-white/[0.04] text-xs">
                <span className={`font-medium ${isSelected ? "text-white" : "text-white/40"}`}>
                  {isSelected ? "Active Preview" : "Click to view"}
                </span>
                <span className="text-xs font-mono text-white/70 flex items-center gap-1">
                  Generate <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* LIVE REPORT TABLE PREVIEW */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-white">
            {reportCards.find((r) => r.id === selectedReport)?.title} Preview
          </h2>
          <span className="text-xs text-white/40 font-mono">Live Data Feed</span>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden backdrop-blur-sm">
          {selectedReport === "LOT_PROFIT" && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>LOT</TableHead>
                  <TableHead>CURRENCY</TableHead>
                  <TableHead className="text-right">UNITS SOLD</TableHead>
                  <TableHead className="text-right">BUY RATE</TableHead>
                  <TableHead className="text-right">SELL RATE</TableHead>
                  <TableHead className="text-right">REALIZED PROFIT</TableHead>
                  <TableHead className="text-right">MARGIN</TableHead>
                  <TableHead>STATUS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lotData.map((l) => (
                  <TableRow key={l.lotId} className="h-16">
                    <TableCell className="font-mono text-xs font-semibold text-white">
                      {l.lotNumber}
                    </TableCell>
                    <TableCell className="font-semibold text-xs text-white">
                      {l.currencyCode}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-white">
                      {formatAmount(l.soldQuantity)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-white/70">
                      ₹{formatAmount(l.purchasePrice)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-white/70">
                      ₹{formatAmount(l.averageSellPrice)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold text-emerald-400">
                      +₹{formatAmount(l.realizedProfit)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-white/60">
                      {Number(l.profitMarginPercent).toFixed(1)}%
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={l.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {selectedReport === "INVENTORY" && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CURRENCY</TableHead>
                  <TableHead className="text-right">VAULT STOCK</TableHead>
                  <TableHead className="text-right">STOCK VALUATION (INR)</TableHead>
                  <TableHead className="text-right">MIN THRESHOLD</TableHead>
                  <TableHead>COMPLIANCE</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currencyData.map((c) => (
                  <TableRow key={c.currencyCode} className="h-16">
                    <TableCell className="font-semibold text-xs text-white">
                      {c.currencyCode}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold text-white">
                      {formatAmount(c.totalRemaining)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold text-white">
                      ₹{formatAmount(c.totalInventoryValue)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-white/60">
                      {c.minStockThreshold} units
                    </TableCell>
                    <TableCell>
                      {c.isLowStock ? (
                        <span className="text-amber-400 text-xs font-medium">Below Target Threshold</span>
                      ) : (
                        <span className="text-emerald-400 text-xs font-medium">Sufficient Reserves</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {selectedReport === "SALES" && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SALE ID</TableHead>
                  <TableHead>DATE</TableHead>
                  <TableHead>CURRENCY</TableHead>
                  <TableHead className="text-right">UNITS</TableHead>
                  <TableHead className="text-right">RATE</TableHead>
                  <TableHead className="text-right">TOTAL SALE</TableHead>
                  <TableHead className="text-right">PROFIT</TableHead>
                  <TableHead>STATUS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesData.map((s) => (
                  <TableRow key={s.id} className="h-16">
                    <TableCell className="font-mono text-xs font-semibold text-white">
                      {s.saleNumber}
                    </TableCell>
                    <TableCell className="text-xs text-white/50">{formatDate(s.saleDate)}</TableCell>
                    <TableCell className="font-semibold text-xs text-white">{s.currency.code}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-white">
                      {formatAmount(s.totalQuantity)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-white/70">
                      ₹{formatAmount(s.averageSellPrice)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold text-white">
                      ₹{formatAmount(s.totalSaleAmount)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold text-emerald-400">
                      +₹{formatAmount(s.totalRealizedProfit)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={s.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {selectedReport === "PURCHASES" && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO ID</TableHead>
                  <TableHead>DATE</TableHead>
                  <TableHead>CURRENCY</TableHead>
                  <TableHead className="text-right">UNITS</TableHead>
                  <TableHead className="text-right">RATE</TableHead>
                  <TableHead className="text-right">TOTAL COST</TableHead>
                  <TableHead>LOT CREATED</TableHead>
                  <TableHead>STATUS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseData.map((p) => (
                  <TableRow key={p.id} className="h-16">
                    <TableCell className="font-mono text-xs font-semibold text-white">
                      {p.purchaseNumber}
                    </TableCell>
                    <TableCell className="text-xs text-white/50">{formatDate(p.purchaseDate)}</TableCell>
                    <TableCell className="font-semibold text-xs text-white">{p.currency.code}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-white">
                      {formatAmount(p.quantity)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-white/70">
                      ₹{formatAmount(p.purchasePrice)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold text-white">
                      ₹{formatAmount(p.totalAmount)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-white/80">
                      {p.lot.lotNumber}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={p.lot.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {selectedReport === "STOCK_MOVEMENT" && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>DATE</TableHead>
                  <TableHead>LOT</TableHead>
                  <TableHead>CURRENCY</TableHead>
                  <TableHead>MOVEMENT TYPE</TableHead>
                  <TableHead className="text-right">IN (+)</TableHead>
                  <TableHead className="text-right">OUT (-)</TableHead>
                  <TableHead className="text-right">BALANCE AFTER</TableHead>
                  <TableHead>REFERENCE</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgerData.map((tx) => (
                  <TableRow key={tx.id} className="h-16">
                    <TableCell className="text-xs text-white/50 font-mono whitespace-nowrap">
                      {formatDate(tx.transactionDate)}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold text-white">
                      {tx.lot?.lotNumber}
                    </TableCell>
                    <TableCell className="font-semibold text-xs text-white">
                      {tx.currency?.code}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase ${
                          tx.transactionType === "OPENING_BALANCE"
                            ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                            : tx.transactionType === "PURCHASE"
                            ? "bg-white/10 text-white"
                            : tx.transactionType === "SALE"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-white/[0.05] text-white/60"
                        }`}
                      >
                        {tx.transactionType === "OPENING_BALANCE" ? "OPENING STOCK" : tx.transactionType.replace("_", " ")}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-emerald-400 tabular-nums">
                      {Number(tx.quantityIn) > 0 ? `+${formatAmount(tx.quantityIn)}` : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-rose-400 tabular-nums">
                      {Number(tx.quantityOut) > 0 ? `-${formatAmount(tx.quantityOut)}` : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold text-white tabular-nums">
                      {formatAmount(tx.balanceAfter)}
                    </TableCell>
                    <TableCell className="text-xs text-white/50">
                      {tx.notes || tx.referenceType}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
