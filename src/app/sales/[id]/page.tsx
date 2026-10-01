"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { formatAmount, formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import {
  TrendingUp,
  ArrowLeft,
  Layers,
  FileText,
  Calendar,
  Building,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import Link from "next/link";

export default function SaleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [sale, setSale] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSale() {
      try {
        const res = await fetch(`/api/sales/${params.id}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success) setSale(json.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadSale();
  }, [params.id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-32 bg-muted/40 animate-pulse rounded" />
        <div className="h-48 bg-card border rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-lg font-bold">Sale Not Found</h2>
        <Button variant="outline" onClick={() => router.push("/sales")} className="mt-4">
          Back to Sales
        </Button>
      </div>
    );
  }

  const prec = sale.currency.decimalPrecision;
  const isPositiveProfit = Number(sale.totalRealizedProfit) >= 0;

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-border/80 pb-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.push("/sales")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-mono text-foreground">{sale.saleNumber}</h1>
              <StatusBadge status={sale.status} />
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Recorded on {formatDateTime(sale.createdAt)} by {sale.createdBy.name}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-muted-foreground uppercase font-semibold">Total Realized Profit</div>
          <div
            className={`text-2xl font-bold font-mono tabular-nums ${
              isPositiveProfit ? "text-emerald-500" : "text-rose-500"
            }`}
          >
            {isPositiveProfit ? "+" : ""}
            {formatCurrency(sale.totalRealizedProfit, sale.currency.code, prec)}
          </div>
        </div>
      </div>

      {/* Sale Info Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground uppercase font-bold">Currency & Units</div>
            <div className="text-xl font-bold mt-1 text-foreground tabular-nums">
              {formatAmount(sale.totalQuantity)} <span className="text-xs font-mono">{sale.currency.code}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Method: <span className="font-semibold text-foreground">{sale.allocationMethod}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground uppercase font-bold">Total Sale Revenue</div>
            <div className="text-xl font-bold mt-1 text-foreground tabular-nums">
              {formatCurrency(sale.totalSaleAmount, sale.currency.code, prec)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Avg Sell Rate: <span className="font-mono text-foreground">{formatAmount(sale.averageSellPrice, prec)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground uppercase font-bold">Total Purchase Cost</div>
            <div className="text-xl font-bold mt-1 text-foreground tabular-nums">
              {formatCurrency(sale.totalPurchaseCost, sale.currency.code, prec)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Historical lot buy value</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground uppercase font-bold">Customer / Counterparty</div>
            <div className="text-base font-bold mt-1 text-foreground truncate">
              {sale.customerName || "Walk-in Customer"}
            </div>
            <div className="text-xs text-muted-foreground mt-1 font-mono truncate">
              Ref: {sale.referenceNumber || "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reversal notice if reversed */}
      {sale.status === "REVERSED" && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs space-y-1">
          <div className="font-bold text-rose-500 flex items-center gap-1.5">
            <RotateCcw className="w-4 h-4" /> This sale was reversed on {formatDateTime(sale.reversedAt)}
          </div>
          <div className="text-muted-foreground">
            Reversal Reason: <span className="text-foreground font-medium">{sale.reversalReason}</span>
          </div>
          {sale.reversedBy && (
            <div className="text-muted-foreground">
              Authorized By: <span className="text-foreground font-medium">{sale.reversedBy.name}</span>
            </div>
          )}
        </div>
      )}

      {/* Lot-Wise Allocation Breakdown */}
      <Card className="shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-500" />
            Lot-Wise Execution Breakdown
          </CardTitle>
          <CardDescription className="text-xs">
            Actual lots from which currency was drawn, with historical purchase prices and unit margins.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lot Number</TableHead>
                <TableHead>Purchase Date</TableHead>
                <TableHead className="text-right">Quantity Sold</TableHead>
                <TableHead className="text-right">Buy Price</TableHead>
                <TableHead className="text-right">Sell Price</TableHead>
                <TableHead className="text-right">Cost Spend</TableHead>
                <TableHead className="text-right">Sale Revenue</TableHead>
                <TableHead className="text-right">Profit / Unit</TableHead>
                <TableHead className="text-right font-bold">Total Profit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sale.allocations?.map((alloc: any) => {
                const isPos = Number(alloc.totalProfit) >= 0;
                return (
                  <TableRow key={alloc.id}>
                    <TableCell>
                      <Link
                        href={`/lots/${alloc.lot.id}`}
                        className="font-mono font-bold text-primary hover:underline flex items-center gap-1"
                      >
                        <Layers className="w-3.5 h-3.5 text-amber-500" />
                        {alloc.lot.lotNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(alloc.lot.purchaseDate)}
                    </TableCell>
                    <TableCell className="text-right font-semibold font-mono">
                      {formatAmount(alloc.quantity)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatAmount(alloc.purchasePrice, prec)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatAmount(alloc.sellPrice, prec)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(alloc.totalPurchaseCost, sale.currency.code, prec)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-foreground font-semibold">
                      {formatCurrency(alloc.totalSaleAmount, sale.currency.code, prec)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      <span className={isPos ? "text-emerald-500" : "text-rose-500"}>
                        {isPos ? "+" : ""}
                        {formatAmount(alloc.profitPerUnit, prec)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      <span className={isPos ? "text-emerald-500" : "text-rose-500"}>
                        {isPos ? "+" : ""}
                        {formatCurrency(alloc.totalProfit, sale.currency.code, prec)}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
