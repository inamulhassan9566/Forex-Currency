"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { formatAmount, formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import {
  TrendingUp,
  Plus,
  Search,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Sparkles,
  Check,
  X,
  Printer,
  Download,
  Share2,
  ExternalLink,
} from "lucide-react";
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
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Drawer } from "@/components/ui/drawer";
import { canCreateTransaction, canReverseSale } from "@/lib/rbac";
import Link from "next/link";

export default function SalesPage() {
  const { user } = useAuth();
  const { success, error, warning } = useToast();

  const [sales, setSales] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Record Sale Modal & 5-Step Stepper
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [submitting, setSubmitting] = useState(false);
  const [successSaleResult, setSuccessSaleResult] = useState<any>(null);

  // Form Fields
  const [currencyId, setCurrencyId] = useState("");
  const [totalQuantity, setTotalQuantity] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10));
  const [customerName, setCustomerName] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [allocationMethod, setAllocationMethod] = useState<"FIFO" | "MANUAL">("FIFO");

  // Available lots for selected currency
  const [availableLots, setAvailableLots] = useState<any[]>([]);
  const [selectedLotIds, setSelectedLotIds] = useState<string[]>([]);
  const [manualAllocations, setManualAllocations] = useState<Record<string, { qty: string; price: string }>>({});

  // Dynamic FIFO Preview Plan
  const [previewPlan, setPreviewPlan] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Sale Detail Slide-over Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeSaleDrawer, setActiveSaleDrawer] = useState<any>(null);

  // Reversal Modal
  const [reverseModalOpen, setReverseModalOpen] = useState(false);
  const [saleToReverse, setSaleToReverse] = useState<any>(null);
  const [reversalReason, setReversalReason] = useState("");
  const [reversing, setReversing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sRes, cRes] = await Promise.all([
        fetch(
          `/api/sales?currencyId=${currencyFilter}&status=${statusFilter}&search=${encodeURIComponent(
            search
          )}`
        ),
        fetch("/api/currencies?activeOnly=true"),
      ]);

      if (sRes.ok) {
        const sJson = await sRes.json();
        if (sJson.success) setSales(sJson.data.items);
      }
      if (cRes.ok) {
        const cJson = await cRes.json();
        if (cJson.success) {
          setCurrencies(cJson.data);
          if (cJson.data.length > 0 && !currencyId) {
            setCurrencyId(cJson.data[0].id);
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
  }, [currencyFilter, statusFilter, search]);

  // Fetch available lots when currency changes
  useEffect(() => {
    if (!currencyId) return;
    async function fetchLots() {
      try {
        const res = await fetch(`/api/lots?currencyId=${currencyId}&status=AVAILABLE`);
        const res2 = await fetch(`/api/lots?currencyId=${currencyId}&status=PARTIALLY_SOLD`);
        const json1 = await res.json();
        const json2 = await res2.json();

        const combined = [...(json1.data?.items || []), ...(json2.data?.items || [])].filter(
          (l) => Number(l.remainingQuantity) > 0
        );
        setAvailableLots(combined);

        const initialManual: Record<string, { qty: string; price: string }> = {};
        for (const lot of combined) {
          initialManual[lot.id] = { qty: "", price: sellPrice || "" };
        }
        setManualAllocations(initialManual);
      } catch (e) {
        console.error(e);
      }
    }
    fetchLots();
  }, [currencyId, modalOpen]);

  // Compute live profit calculator
  const selectedCurrency = currencies.find((c) => c.id === currencyId) || currencies[0];
  const unitSellPrice = parseFloat(sellPrice) || 0;
  const targetQty = parseFloat(totalQuantity) || 0;

  // Real-time FIFO simulation for the live calculator
  const simulateFifoBreakdown = () => {
    let remainingToFill = targetQty;
    const allocations = [];

    for (const lot of availableLots) {
      if (remainingToFill <= 0) break;
      const lotAvail = Number(lot.remainingQuantity);
      const takeQty = Math.min(remainingToFill, lotAvail);
      const buyPrice = Number(lot.purchasePrice);
      const profitPerUnit = unitSellPrice - buyPrice;
      const totalLotProfit = profitPerUnit * takeQty;
      const totalLotSale = unitSellPrice * takeQty;

      allocations.push({
        lotId: lot.id,
        lotNumber: lot.lotNumber,
        purchaseDate: lot.purchaseDate,
        purchasePrice: buyPrice,
        allocatedQuantity: takeQty,
        sellPrice: unitSellPrice,
        profitPerUnit,
        totalProfit: totalLotProfit,
        totalSaleAmount: totalLotSale,
        remainingAfter: lotAvail - takeQty,
      });

      remainingToFill -= takeQty;
    }

    const totalAllocated = allocations.reduce((sum, a) => sum + a.allocatedQuantity, 0);
    const totalExpectedProfit = allocations.reduce((sum, a) => sum + a.totalProfit, 0);
    const totalSaleValue = allocations.reduce((sum, a) => sum + a.totalSaleAmount, 0);

    return {
      allocations,
      totalAllocated,
      totalExpectedProfit,
      totalSaleValue,
      shortfall: Math.max(0, targetQty - totalAllocated),
      isSufficient: remainingToFill <= 0,
    };
  };

  const fifoSimulation = simulateFifoBreakdown();

  // Dynamic simulation supporting both FIFO and MANUAL selections
  const currentSimulation =
    allocationMethod === "MANUAL"
      ? (() => {
          const allocations: any[] = [];
          for (const lotId of selectedLotIds) {
            const lot = availableLots.find((l) => l.id === lotId);
            if (!lot) continue;
            const curAlloc = manualAllocations[lotId] || { qty: "", price: "" };
            const takeQty = parseFloat(curAlloc.qty) || 0;
            const sp = parseFloat(curAlloc.price) || unitSellPrice;
            const buyPrice = Number(lot.purchasePrice) || 0;
            const profitPerUnit = sp - buyPrice;
            const totalProfit = profitPerUnit * takeQty;
            const totalSaleAmount = sp * takeQty;

            allocations.push({
              lotId,
              lotNumber: lot.lotNumber,
              purchaseDate: lot.purchaseDate,
              purchasePrice: buyPrice,
              allocatedQuantity: takeQty,
              sellPrice: sp,
              profitPerUnit,
              totalProfit,
              totalSaleAmount,
              remainingAfter: Number(lot.remainingQuantity) - takeQty,
            });
          }

          const totalAllocated = allocations.reduce((sum, a) => sum + a.allocatedQuantity, 0);
          const totalExpectedProfit = allocations.reduce((sum, a) => sum + a.totalProfit, 0);
          const totalSaleValue = allocations.reduce((sum, a) => sum + a.totalSaleAmount, 0);

          return {
            allocations,
            totalAllocated,
            totalExpectedProfit,
            totalSaleValue,
            shortfall: 0,
            isSufficient: true,
          };
        })()
      : fifoSimulation;

  const handleOpenSaleModal = () => {
    setStep(1);
    setSuccessSaleResult(null);
    setTotalQuantity("");
    setSellPrice("");
    setCustomerName("");
    setReferenceNumber("");
    setNotes("");
    setAllocationMethod("FIFO");
    setSelectedLotIds([]);
    setModalOpen(true);
  };

  const handleFetchPreviewAndReview = async () => {
    if (allocationMethod === "FIFO") {
      const q = parseFloat(totalQuantity);
      const sp = parseFloat(sellPrice);
      if (isNaN(q) || q <= 0 || isNaN(sp) || sp < 0) {
        error("Validation Error", "Please provide a valid total quantity and sell price");
        return;
      }

      setLoadingPreview(true);
      try {
        const res = await fetch("/api/sales/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currencyId,
            totalQuantity: q,
            sellPrice: sp,
            allocationMethod: "FIFO",
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || "Failed to generate FIFO preview");
        }

        if (!json.data.isSufficient) {
          warning(
            "Insufficient Stock",
            `Total active stock is ${json.data.allocatedQuantity}, but ${q} was requested. Shortfall: ${json.data.shortfall}`
          );
          return;
        }

        setPreviewPlan(json.data);
        setStep(5);
      } catch (err: any) {
        error("Preview Failed", err.message);
      } finally {
        setLoadingPreview(false);
      }
    } else {
      // Manual lot selection
      const sp = parseFloat(sellPrice);
      const activeAllocations = Object.entries(manualAllocations)
        .filter(([lotId, val]) => selectedLotIds.includes(lotId) && parseFloat(val.qty) > 0)
        .map(([lotId, val]) => ({
          lotId,
          quantity: parseFloat(val.qty),
          sellPrice: parseFloat(val.price) || (isNaN(sp) ? 0 : sp),
        }));

      if (activeAllocations.length === 0) {
        error("Validation Error", "Please select at least one lot and enter quantity to sell");
        return;
      }

      const hasInvalidPrice = activeAllocations.some((a) => isNaN(a.sellPrice) || a.sellPrice <= 0);
      if (hasInvalidPrice) {
        error("Validation Error", "Please provide a valid selling price greater than 0");
        return;
      }

      const totalAllocQty = activeAllocations.reduce((s, a) => s + a.quantity, 0);

      setLoadingPreview(true);
      try {
        const res = await fetch("/api/sales/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currencyId,
            totalQuantity: totalAllocQty,
            sellPrice: isNaN(sp) ? 0 : sp,
            allocationMethod: "MANUAL",
            manualAllocations: activeAllocations,
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || "Failed to validate manual lot selection");
        }

        setPreviewPlan(json.data);
        setStep(5);
      } catch (err: any) {
        error("Manual Allocation Error", err.message);
      } finally {
        setLoadingPreview(false);
      }
    }
  };

  const handleExecuteSale = async () => {
    if (!previewPlan) return;
    setSubmitting(true);

    try {
      const payload = {
        currencyId,
        totalQuantity: previewPlan.allocatedQuantity,
        saleDate,
        customerName: customerName.trim() || undefined,
        referenceNumber: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        allocationMethod,
        allocations: previewPlan.allocations.map((a: any) => ({
          lotId: a.lotId,
          quantity: a.allocatedQuantity,
          sellPrice: a.sellPrice,
        })),
      };

      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Sale execution failed");
      }

      const createdSale = json.data?.sale || json.data;

      setSuccessSaleResult({
        sale: createdSale,
        profit: previewPlan.totalProfit,
        allocations: previewPlan.allocations,
      });

      success(
        "Sale Executed Successfully",
        `Created ${createdSale?.saleNumber || "Transaction"} with ₹${formatAmount(previewPlan.totalProfit)} realized profit.`
      );
      loadData();
    } catch (err: any) {
      error("Sale Error", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReverseSale = async () => {
    if (!saleToReverse || !reversalReason.trim()) {
      error("Validation", "Please provide a mandatory audit reason for reversal");
      return;
    }

    setReversing(true);
    try {
      const res = await fetch(`/api/sales/${saleToReverse.id}/reverse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reversalReason.trim() }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Reversal failed");
      }

      success(
        "Sale Reversed",
        `Sale #${saleToReverse.saleNumber} successfully reversed. Stock returned to lots.`
      );
      setReverseModalOpen(false);
      setSaleToReverse(null);
      setReversalReason("");
      setDrawerOpen(false);
      loadData();
    } catch (err: any) {
      error("Reversal Error", err.message);
    } finally {
      setReversing(false);
    }
  };

  // KPI calculations
  const totalRealizedProfit = sales
    .filter((s) => s.status === "COMPLETED")
    .reduce((acc, s) => acc + Number(s.totalRealizedProfit), 0);
  const totalVolumeSold = sales
    .filter((s) => s.status === "COMPLETED")
    .reduce((acc, s) => acc + Number(s.totalQuantity), 0);
  const totalSalesRevenue = sales
    .filter((s) => s.status === "COMPLETED")
    .reduce((acc, s) => acc + Number(s.totalSaleAmount), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Sales</h1>
          <p className="text-sm text-white/50 mt-1">
            Track completed currency sales and realized profit across individual lots.
          </p>
        </div>

        {user && canCreateTransaction(user.role) && (
          <Button variant="primary" onClick={handleOpenSaleModal} className="gap-2">
            <Plus className="w-4 h-4" />
            New Sale
          </Button>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white/[0.025] border border-white/[0.06] backdrop-blur-sm">
          <div className="text-[11px] font-medium uppercase tracking-wider text-white/40">Realized Profit</div>
          <div className="text-2xl font-semibold text-white tracking-tight mt-1 tabular-nums font-mono">
            ₹{formatAmount(totalRealizedProfit)}
          </div>
          <div className="text-xs text-emerald-400 mt-1">Verified lot-wise gain</div>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.025] border border-white/[0.06] backdrop-blur-sm">
          <div className="text-[11px] font-medium uppercase tracking-wider text-white/40">Total Revenue</div>
          <div className="text-2xl font-semibold text-white tracking-tight mt-1 tabular-nums font-mono">
            ₹{formatAmount(totalSalesRevenue)}
          </div>
          <div className="text-xs text-white/40 mt-1">Gross settlement value</div>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.025] border border-white/[0.06] backdrop-blur-sm">
          <div className="text-[11px] font-medium uppercase tracking-wider text-white/40">Volume Sold</div>
          <div className="text-2xl font-semibold text-white tracking-tight mt-1 tabular-nums font-mono">
            {formatAmount(totalVolumeSold)}
          </div>
          <div className="text-xs text-white/40 mt-1">Total units dispatched</div>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.025] border border-white/[0.06] backdrop-blur-sm">
          <div className="text-[11px] font-medium uppercase tracking-wider text-white/40">Transactions</div>
          <div className="text-2xl font-semibold text-white tracking-tight mt-1 tabular-nums">
            {sales.length}
          </div>
          <div className="text-xs text-white/40 mt-1">Total completed & reversed</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-3" />
          <Input
            placeholder="Search sale number, customer, reference, lot..."
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
            <option value="COMPLETED">Completed</option>
            <option value="REVERSED">Reversed</option>
          </Select>
        </div>
      </div>

      {/* Sales Data Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden backdrop-blur-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SALE ID</TableHead>
              <TableHead>DATE</TableHead>
              <TableHead>CURRENCY</TableHead>
              <TableHead className="text-right">QUANTITY</TableHead>
              <TableHead className="text-right">SELL PRICE</TableHead>
              <TableHead className="text-right">TOTAL SALE</TableHead>
              <TableHead className="text-right">PROFIT</TableHead>
              <TableHead>LOTS DEDUCTED</TableHead>
              <TableHead>STATUS</TableHead>
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
            ) : sales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="p-12 text-center">
                  <EmptyState
                    title="No sales transactions found"
                    description="Record a new sale above to sell foreign currency from active lots."
                  />
                </TableCell>
              </TableRow>
            ) : (
              sales.map((s) => {
                const prec = s.currency.decimalPrecision;
                const isReversed = s.status === "REVERSED";

                return (
                  <TableRow
                    key={s.id}
                    onClick={() => {
                      setActiveSaleDrawer(s);
                      setDrawerOpen(true);
                    }}
                    className="h-16 cursor-pointer hover:bg-white/[0.04] transition group"
                  >
                    <TableCell className="font-mono text-xs font-semibold text-white group-hover:text-white">
                      {s.saleNumber}
                    </TableCell>
                    <TableCell className="text-xs text-white/50 whitespace-nowrap">
                      {formatDate(s.saleDate)}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-xs text-white">{s.currency.code}</span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-medium text-white tabular-nums">
                      {formatAmount(s.totalQuantity)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-white/70 tabular-nums">
                      ₹{formatAmount(s.averageSellPrice, prec)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-medium text-white tabular-nums">
                      ₹{formatAmount(s.totalSaleAmount, prec)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold tabular-nums">
                      <span className={isReversed ? "text-white/30 line-through" : "text-emerald-400"}>
                        +₹{formatAmount(s.totalRealizedProfit, prec)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {s.allocations?.map((a: any) => (
                          <span
                            key={a.id}
                            className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-[11px] font-mono text-white/70"
                          >
                            {a.lot?.lotNumber} ({formatAmount(a.quantity)})
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={s.status} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* RIGHT-SIDE SLIDE-OVER SALE DETAIL DRAWER */}
      <Drawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={activeSaleDrawer ? `SALE #${activeSaleDrawer.saleNumber}` : "Sale Details"}
        subtitle={activeSaleDrawer ? `Recorded on ${formatDate(activeSaleDrawer.saleDate)}` : undefined}
      >
        {activeSaleDrawer && (
          <div className="p-6 space-y-6 flex-1 overflow-y-auto">
            {/* Top Status & Profit Banner */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-white/40">Realized Lot Profit</div>
                <div className="text-2xl font-mono font-bold text-emerald-400 mt-0.5">
                  +₹{formatAmount(activeSaleDrawer.totalRealizedProfit)}
                </div>
              </div>
              <StatusBadge status={activeSaleDrawer.status} />
            </div>

            {/* Sale Metrics */}
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-white/[0.06]">
                <span className="text-white/40">Currency</span>
                <span className="font-semibold text-white">{activeSaleDrawer.currency?.code} — {activeSaleDrawer.currency?.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/[0.06]">
                <span className="text-white/40">Units Sold</span>
                <span className="font-mono text-white font-medium">{formatAmount(activeSaleDrawer.totalQuantity)} units</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/[0.06]">
                <span className="text-white/40">Sell Rate</span>
                <span className="font-mono text-white">₹{formatAmount(activeSaleDrawer.averageSellPrice)} / unit</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/[0.06]">
                <span className="text-white/40">Total Settlement Value</span>
                <span className="font-mono font-bold text-white">₹{formatAmount(activeSaleDrawer.totalSaleAmount)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/[0.06]">
                <span className="text-white/40">Executed By</span>
                <span className="text-white">{activeSaleDrawer.createdBy?.name || "Trading Desk"}</span>
              </div>
              {activeSaleDrawer.customerName && (
                <div className="flex justify-between py-2 border-b border-white/[0.06]">
                  <span className="text-white/40">Customer</span>
                  <span className="text-white">{activeSaleDrawer.customerName}</span>
                </div>
              )}
              {activeSaleDrawer.referenceNumber && (
                <div className="flex justify-between py-2 border-b border-white/[0.06]">
                  <span className="text-white/40">Reference</span>
                  <span className="font-mono text-white">{activeSaleDrawer.referenceNumber}</span>
                </div>
              )}
            </div>

            {/* Lot Allocation Breakdown */}
            <div>
              <div className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
                Lot Deductions Breakdown
              </div>
              <div className="space-y-2">
                {activeSaleDrawer.allocations?.map((a: any) => (
                  <div
                    key={a.id}
                    className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/lots/${a.lot?.id}`}
                        className="font-mono font-bold text-white hover:underline flex items-center gap-1.5"
                      >
                        <Layers className="w-3.5 h-3.5 text-white/50" />
                        {a.lot?.lotNumber}
                      </Link>
                      <span className="font-mono text-emerald-400 font-semibold">
                        +₹{formatAmount(a.realizedProfit)} profit
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-white/40 font-mono">
                      <span>Deducted: {formatAmount(a.quantity)} units</span>
                      <span>Buy: ₹{formatAmount(a.purchasePrice)} → Sell: ₹{formatAmount(a.sellPrice)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 space-y-2.5 border-t border-white/[0.06]">
              {user && canReverseSale(user.role) && activeSaleDrawer.status === "COMPLETED" && (
                <Button
                  variant="danger"
                  className="w-full gap-2"
                  onClick={() => {
                    setSaleToReverse(activeSaleDrawer);
                    setReverseModalOpen(true);
                  }}
                >
                  <RotateCcw className="w-4 h-4" />
                  Reverse Sale & Restore Lots
                </Button>
              )}
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setDrawerOpen(false)}
              >
                Close Drawer
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* 5-STEP NEW SALE CREATION MODAL */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen} maxWidth="max-w-2xl">
        {successSaleResult ? (
          /* Success State */
          <div className="py-6 text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white tracking-tight">Sale Completed</h2>
              <p className="text-xs text-white/50 mt-1">
                Transaction #{successSaleResult.sale?.saleNumber} confirmed with realized gain.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.025] border border-white/[0.06] text-left space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-white/40">Realized Profit:</span>
                <span className="font-mono text-emerald-400 font-bold text-sm">
                  +₹{formatAmount(successSaleResult.profit)}
                </span>
              </div>
              <div className="text-white/40 text-[11px] pt-1">Lots Updated:</div>
              <div className="space-y-1">
                {successSaleResult.allocations?.map((a: any) => (
                  <div key={a.lotId} className="flex justify-between font-mono text-[11px] bg-white/[0.02] p-2 rounded-lg">
                    <span className="text-white">{a.lotNumber}</span>
                    <span className="text-white/70">-{formatAmount(a.allocatedQuantity)} units</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                Back to Sales
              </Button>
              <Button variant="primary" onClick={handleOpenSaleModal}>
                Create Another Sale
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle>New Sale</DialogTitle>
                  <DialogDescription>
                    Sell currency from available inventory.
                  </DialogDescription>
                </div>
                <div className="text-[11px] font-mono text-white/40 uppercase tracking-widest">
                  Step 0{step} / 05
                </div>
              </div>

              {/* Progress Bar */}
              <div className="grid grid-cols-5 gap-1.5 pt-4">
                {[1, 2, 3, 4, 5].map((s) => (
                  <div
                    key={s}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      s <= step ? "bg-white" : "bg-white/[0.1]"
                    }`}
                  />
                ))}
              </div>
            </DialogHeader>

            <div className="py-6">
              {/* STEP 1: SELECT CURRENCY */}
              {step === 1 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="text-xs font-medium uppercase tracking-wider text-white/50">
                    Step 1: Select Currency
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {currencies.map((c) => {
                      const isSelected = c.id === currencyId;
                      return (
                        <div
                          key={c.id}
                          onClick={() => setCurrencyId(c.id)}
                          className={`p-4 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? "bg-white/[0.08] border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                              : "bg-white/[0.02] border-white/[0.06] hover:border-white/20"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-base text-white">{c.code}</span>
                            <span className="text-xs text-white/40 font-mono">{c.symbol}</span>
                          </div>
                          <div className="text-xs text-white/50 mt-1 truncate">{c.name}</div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-white/50 flex justify-between">
                    <span>Active Lots Available:</span>
                    <span className="text-white font-mono font-medium">{availableLots.length} lots</span>
                  </div>
                </div>
              )}

              {/* STEP 2: QUANTITY */}
              {step === 2 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="text-xs font-medium uppercase tracking-wider text-white/50">
                    Step 2: Units to Sell ({selectedCurrency?.code})
                  </div>

                  <div className="space-y-1.5">
                    <Input
                      type="number"
                      step="any"
                      min="0.0001"
                      autoFocus
                      placeholder="e.g. 700"
                      value={totalQuantity}
                      onChange={(e) => setTotalQuantity(e.target.value)}
                      className="text-2xl font-mono h-14"
                    />
                  </div>

                  {/* Available Stock Indicator */}
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs">
                    <span className="text-white/40">Vault Stock Available:</span>
                    <span className="font-mono text-white font-medium">
                      {formatAmount(
                        availableLots.reduce((acc, l) => acc + Number(l.remainingQuantity), 0)
                      )}{" "}
                      {selectedCurrency?.code}
                    </span>
                  </div>
                </div>
              )}

              {/* STEP 3: ALLOCATION (MANUAL VS FIFO) */}
              {step === 3 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium uppercase tracking-wider text-white/50">
                      Step 3: Lot Allocation Mode
                    </div>

                    {/* FIFO vs MANUAL Toggle */}
                    <div className="flex p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.08]">
                      <button
                        type="button"
                        onClick={() => setAllocationMethod("FIFO")}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                          allocationMethod === "FIFO"
                            ? "bg-white text-black font-semibold shadow-sm"
                            : "text-white/60 hover:text-white"
                        }`}
                      >
                        FIFO
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllocationMethod("MANUAL")}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                          allocationMethod === "MANUAL"
                            ? "bg-white text-black font-semibold shadow-sm"
                            : "text-white/60 hover:text-white"
                        }`}
                      >
                        MANUAL
                      </button>
                    </div>
                  </div>

                  {allocationMethod === "FIFO" ? (
                    /* FIFO Queue Preview */
                    <div className="space-y-3">
                      <div className="text-xs text-white/60">
                        Automatically depletes oldest inventory lots first according to standard accounting principles.
                      </div>

                      <div className="p-4 rounded-xl bg-white/[0.025] border border-white/[0.06] space-y-2.5">
                        <div className="text-[11px] uppercase tracking-wider text-white/40 font-medium">
                          FIFO Allocation Preview
                        </div>
                        {fifoSimulation.allocations.map((a) => (
                          <div
                            key={a.lotId}
                            className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] text-xs font-mono"
                          >
                            <span className="font-semibold text-white">{a.lotNumber}</span>
                            <span className="text-white/70">{formatAmount(a.allocatedQuantity)} units</span>
                            <span className="text-white/40">Cost: ₹{formatAmount(a.purchasePrice)}</span>
                          </div>
                        ))}

                        <div className="pt-2 border-t border-white/[0.06] flex justify-between text-xs font-mono">
                          <span className="text-white/50">Total Allocated:</span>
                          <span className="text-white font-bold">{formatAmount(fifoSimulation.totalAllocated)} {selectedCurrency?.code}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* MANUAL SELECTABLE LOT CARDS */
                    <div className="space-y-3">
                      <div className="text-xs text-white/60">
                        Select specific lots to sell from:
                      </div>

                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {availableLots.map((lot) => {
                          const isSelected = selectedLotIds.includes(lot.id);
                          const curAlloc = manualAllocations[lot.id] || { qty: "", price: "" };

                          return (
                            <div
                              key={lot.id}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedLotIds(selectedLotIds.filter((id) => id !== lot.id));
                                } else {
                                  setSelectedLotIds([...selectedLotIds, lot.id]);
                                }
                              }}
                              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                                isSelected
                                  ? "bg-white/[0.06] border-white/50 shadow-[0_0_20px_rgba(255,255,255,0.06)]"
                                  : "bg-white/[0.02] border-white/[0.06] hover:border-white/20"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-4 h-4 rounded flex items-center justify-center border ${
                                      isSelected
                                        ? "bg-white border-white text-black"
                                        : "border-white/20"
                                    }`}
                                  >
                                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                  </div>
                                  <span className="font-mono font-semibold text-sm text-white">
                                    {lot.lotNumber}
                                  </span>
                                </div>
                                <span className="text-xs font-mono text-emerald-400 font-medium">
                                  {formatAmount(lot.remainingQuantity)} available
                                </span>
                              </div>

                              <div className="flex items-center justify-between mt-2 text-xs text-white/40">
                                <span>Purchase: ₹{formatAmount(lot.purchasePrice)}</span>
                                <span>Purchased: {formatDate(lot.purchaseDate)}</span>
                              </div>

                              {isSelected && (
                                <div
                                  className="mt-3 pt-2.5 border-t border-white/[0.08] flex items-center gap-2"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="flex-1">
                                    <label className="text-[10px] text-white/40">Units to sell</label>
                                    <Input
                                      type="number"
                                      step="any"
                                      min="0"
                                      max={lot.remainingQuantity}
                                      placeholder="Units"
                                      value={curAlloc.qty}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setManualAllocations((prev) => ({
                                          ...prev,
                                          [lot.id]: { ...prev[lot.id], qty: val },
                                        }));
                                      }}
                                      className="h-8 font-mono text-xs"
                                    />
                                  </div>
                                  <div className="flex-1">
                                    <label className="text-[10px] text-white/40">Sell rate (INR)</label>
                                    <Input
                                      type="number"
                                      step="any"
                                      min="0"
                                      placeholder={sellPrice || "Rate"}
                                      value={curAlloc.price}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setManualAllocations((prev) => ({
                                          ...prev,
                                          [lot.id]: { ...prev[lot.id], price: val },
                                        }));
                                      }}
                                      className="h-8 font-mono text-xs"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 4: SELL PRICE & LIVE PROFIT CALCULATOR */}
              {step === 4 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="text-xs font-medium uppercase tracking-wider text-white/50">
                    Step 4: Unit Sell Price & Live Profit Calculator
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-white/70">
                      Selling Price per Unit (INR) *
                    </label>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      autoFocus
                      placeholder="e.g. 96.50"
                      value={sellPrice}
                      onChange={(e) => setSellPrice(e.target.value)}
                      className="text-xl font-mono h-12"
                    />
                  </div>

                  {/* LIVE PROFIT CALCULATOR CARD */}
                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                      Live Profit Breakdown
                    </div>

                    <div className="space-y-2">
                      {currentSimulation.allocations.map((a: any) => {
                        const isUnitPositive = a.profitPerUnit >= 0;
                        const isTotalPositive = a.totalProfit >= 0;
                        return (
                          <div
                            key={a.lotId}
                            className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs"
                          >
                            <div>
                              <div className="text-white/40 text-[10px]">LOT</div>
                              <div className="font-mono font-semibold text-white">{a.lotNumber}</div>
                            </div>
                            <div>
                              <div className="text-white/40 text-[10px]">PURCHASE</div>
                              <div className="font-mono text-white/70">₹{formatAmount(a.purchasePrice)}</div>
                            </div>
                            <div>
                              <div className="text-white/40 text-[10px]">PROFIT / UNIT</div>
                              <div className={`font-mono font-medium ${isUnitPositive ? "text-emerald-400" : "text-rose-400"}`}>
                                {isUnitPositive ? "+" : "-"}₹{formatAmount(Math.abs(a.profitPerUnit))}
                              </div>
                            </div>
                            <div>
                              <div className="text-white/40 text-[10px]">EXPECTED PROFIT</div>
                              <div className={`font-mono font-bold ${isTotalPositive ? "text-emerald-400" : "text-rose-400"}`}>
                                {isTotalPositive ? "+" : "-"}₹{formatAmount(Math.abs(a.totalProfit))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-white/40 uppercase">Total Expected Profit</div>
                        <div className={`text-2xl font-mono font-bold ${currentSimulation.totalExpectedProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {currentSimulation.totalExpectedProfit >= 0 ? "+" : "-"}₹{formatAmount(Math.abs(currentSimulation.totalExpectedProfit))}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-white/40 uppercase">Total Sale Revenue</div>
                        <div className="text-xl font-mono font-semibold text-white">
                          ₹{formatAmount(currentSimulation.totalSaleValue)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Optional settlement details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-white/70">Customer Name</label>
                      <Input
                        placeholder="e.g. Apex Trading Ltd"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-white/70">Reference / Deal ID</label>
                      <Input
                        placeholder="e.g. DEAL-2026-X"
                        value={referenceNumber}
                        onChange={(e) => setReferenceNumber(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: REVIEW SALE */}
              {step === 5 && previewPlan && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="text-xs font-medium uppercase tracking-wider text-white/50">
                    Step 5: Review Sale
                  </div>

                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                      <span className="text-white/50 text-xs">Total Units to Dispatch</span>
                      <span className="text-base font-mono font-semibold text-white">
                        {formatAmount(previewPlan.allocatedQuantity)} {previewPlan.currencyCode}
                      </span>
                    </div>

                    {/* Lot-by-lot breakdown */}
                    <div className="space-y-2">
                      <div className="text-[11px] uppercase tracking-wider text-white/40 font-medium">
                        Allocated Lots
                      </div>
                      {previewPlan.allocations?.map((a: any) => {
                        const profVal = a.realizedProfit !== undefined ? a.realizedProfit : a.totalProfit;
                        const isProfPos = (profVal ?? 0) >= 0;
                        return (
                          <div
                            key={a.lotId}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs font-mono"
                          >
                            <div>
                              <span className="font-semibold text-white">{a.lotNumber}</span>
                              <span className="text-white/40 text-[11px] ml-2">
                                ({formatAmount(a.allocatedQuantity)} units)
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-white/50">
                                ₹{formatAmount(a.purchasePrice)} → ₹{formatAmount(a.sellPrice)}
                              </span>
                              <span className={`ml-3 font-semibold ${isProfPos ? "text-emerald-400" : "text-rose-400"}`}>
                                {isProfPos ? "+" : "-"}₹{formatAmount(Math.abs(profVal ?? 0))}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
                      <div>
                        <div className="text-xs text-white/50 uppercase">Expected Profit</div>
                        <div className={`text-2xl font-mono font-bold ${(previewPlan.totalProfit ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {(previewPlan.totalProfit ?? 0) >= 0 ? "+" : "-"}₹{formatAmount(Math.abs(previewPlan.totalProfit ?? 0))}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-white/50 uppercase">Total Sale</div>
                        <div className="text-xl font-mono font-semibold text-white">
                          ₹{formatAmount(previewPlan.totalSaleAmount)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex items-center justify-between border-t border-white/[0.06] pt-4">
              {step > 1 ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setStep((s) => (s - 1) as any)}
                  disabled={submitting || loadingPreview}
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
              )}

              {step < 4 && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    if (step === 1 && !currencyId) {
                      error("Selection", "Please select a currency");
                      return;
                    }
                    if (step === 2 && (!totalQuantity || Number(totalQuantity) <= 0)) {
                      error("Validation", "Please enter units to sell");
                      return;
                    }
                    setStep((s) => (s + 1) as any);
                  }}
                >
                  Continue <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              )}

              {step === 4 && (
                <Button
                  type="button"
                  variant="primary"
                  isLoading={loadingPreview}
                  onClick={handleFetchPreviewAndReview}
                >
                  Review Sale <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              )}

              {step === 5 && (
                <Button
                  type="button"
                  variant="primary"
                  isLoading={submitting}
                  onClick={handleExecuteSale}
                >
                  Confirm Sale
                </Button>
              )}
            </DialogFooter>
          </div>
        )}
      </Dialog>

      {/* Sale Reversal Dialog */}
      <Dialog open={reverseModalOpen} onOpenChange={setReverseModalOpen} maxWidth="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-400">
            <RotateCcw className="w-5 h-5" />
            Reverse Confirmed Sale #{saleToReverse?.saleNumber}
          </DialogTitle>
          <DialogDescription>
            Reversing will restore sold currency back to the allocated lots, reverse realized profits, and record an immutable audit entry.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-white/40">Currency:</span>
              <span className="font-semibold text-white">{saleToReverse?.currency.code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Units to Restore:</span>
              <span className="font-mono font-semibold text-white">
                {formatAmount(saleToReverse?.totalQuantity)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Profit to Reverse:</span>
              <span className="font-mono font-semibold text-rose-400">
                ₹{formatAmount(saleToReverse?.totalRealizedProfit)}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white">
              Reason for Reversal * (Mandatory Audit Requirement)
            </label>
            <Input
              required
              placeholder="e.g. Counterparty cancelled trade due to settlement failure"
              value={reversalReason}
              onChange={(e) => setReversalReason(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => setReverseModalOpen(false)}
            disabled={reversing}
          >
            Abort
          </Button>
          <Button
            variant="danger"
            onClick={handleReverseSale}
            isLoading={reversing}
          >
            Confirm Reversal
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
