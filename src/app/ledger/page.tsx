"use client";

import React, { useEffect, useState } from "react";
import { formatAmount, formatDate, formatDateTime } from "@/lib/utils";
import { BookOpen, Search, Download, Filter, Layers, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import Link from "next/link";

export default function LedgerPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [currencyFilter, setCurrencyFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [lRes, cRes] = await Promise.all([
        fetch(`/api/ledger?currencyId=${currencyFilter}&transactionType=${typeFilter}`),
        fetch("/api/currencies?activeOnly=true"),
      ]);

      if (lRes.ok) {
        const lJson = await lRes.json();
        if (lJson.success) setTransactions(lJson.data.items);
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
    loadData();
  }, [currencyFilter, typeFilter]);

  const handleExportCsv = () => {
    if (transactions.length === 0) return;

    const headers = [
      "Timestamp",
      "Lot Number",
      "Currency",
      "Movement Type",
      "Quantity In (+)",
      "Quantity Out (-)",
      "Balance After",
      "Reference",
      "Operator",
    ];

    const rows = transactions.map((tx) => [
      `"${formatDateTime(tx.transactionDate)}"`,
      `"${tx.lot.lotNumber}"`,
      `"${tx.currency.code}"`,
      `"${tx.transactionType}"`,
      tx.quantityIn,
      tx.quantityOut,
      tx.balanceAfter,
      `"${tx.notes || tx.referenceType}"`,
      `"${tx.createdBy?.name || "System"}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `stock_ledger_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Stock Ledger</h1>
          <p className="text-sm text-white/50 mt-1">
            Immutable double-entry inventory movement history across all currency vaults.
          </p>
        </div>

        <Button variant="secondary" onClick={handleExportCsv} className="gap-2">
          <Download className="w-4 h-4" /> Export Ledger CSV
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
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
        <div className="w-full sm:w-48">
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Movement Types</option>
            <option value="OPENING_BALANCE">🏛️ Opening Stock Balance</option>
            <option value="PURCHASE">Purchase (Inbound)</option>
            <option value="SALE">Sale (Outbound)</option>
            <option value="SALE_REVERSAL">Sale Reversal (+)</option>
            <option value="ADJUSTMENT_INCREASE">Adjustment (+)</option>
            <option value="ADJUSTMENT_DECREASE">Adjustment (-)</option>
          </Select>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden backdrop-blur-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>DATE & TIME</TableHead>
              <TableHead>LOT</TableHead>
              <TableHead>CURRENCY</TableHead>
              <TableHead>MOVEMENT TYPE</TableHead>
              <TableHead className="text-right">IN (+)</TableHead>
              <TableHead className="text-right">OUT (-)</TableHead>
              <TableHead className="text-right">BALANCE AFTER</TableHead>
              <TableHead>REFERENCE</TableHead>
              <TableHead>OPERATOR</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={9} className="py-5 text-center">
                    <div className="h-6 w-full bg-white/[0.03] animate-pulse rounded-lg" />
                  </TableCell>
                </TableRow>
              ))
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="p-12 text-center">
                  <EmptyState
                    title="No ledger entries found"
                    description="No inventory transactions match your criteria."
                  />
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((tx) => (
                <TableRow key={tx.id} className="h-16">
                  <TableCell className="text-xs text-white/50 font-mono whitespace-nowrap">
                    {formatDateTime(tx.transactionDate)}
                  </TableCell>
                  <TableCell className="font-mono text-xs font-semibold text-white">
                    <Link
                      href={`/lots/${tx.lot.id}`}
                      className="hover:underline flex items-center gap-1.5"
                    >
                      <Layers className="w-3.5 h-3.5 text-white/40" />
                      {tx.lot.lotNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-xs text-white">{tx.currency.code}</span>
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
                          : tx.transactionType === "SALE_REVERSAL"
                          ? "bg-rose-500/10 text-rose-400"
                          : "bg-amber-500/10 text-amber-400"
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
                    <div>{tx.notes || tx.referenceType}</div>
                  </TableCell>
                  <TableCell className="text-xs text-white/40">
                    {tx.createdBy?.name || "System"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
