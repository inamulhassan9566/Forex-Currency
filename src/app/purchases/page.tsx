"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { formatAmount, formatCurrency, formatDate } from "@/lib/utils";
import {
  ShoppingCart,
  Plus,
  Search,
  Filter,
  Layers,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Building,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
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
import { canCreateTransaction } from "@/lib/rbac";
import Link from "next/link";

export default function PurchasesPage() {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [purchases, setPurchases] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("");

  // Modal State & Stepper
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{ purchaseNumber: string; lotNumber: string; totalCost: number; currency: string } | null>(null);

  // Form Fields
  const [currencyId, setCurrencyId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [supplier, setSupplier] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [customLotNumber, setCustomLotNumber] = useState("");
  const [suggestedLotNumber, setSuggestedLotNumber] = useState("");
  const [entryType, setEntryType] = useState<"PURCHASE" | "OPENING_BALANCE">("PURCHASE");

  const fetchNextLot = async () => {
    try {
      const res = await fetch("/api/lots/next-number");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.nextLotNumber) {
          setSuggestedLotNumber(json.data.nextLotNumber);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        fetch(`/api/purchases?currencyId=${currencyFilter}&search=${encodeURIComponent(search)}`),
        fetch("/api/currencies?activeOnly=true"),
      ]);

      if (pRes.ok) {
        const pJson = await pRes.json();
        if (pJson.success) setPurchases(pJson.data.items);
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
  }, [currencyFilter, search]);

  const selectedCurrency = currencies.find((c) => c.id === currencyId) || currencies[0];
  const totalCost = Number(quantity || 0) * Number(purchasePrice || 0);

  const resetForm = () => {
    setStep(1);
    setSuccessData(null);
    setQuantity("");
    setPurchasePrice("");
    setSupplier("");
    setReferenceNumber("");
    setNotes("");
    setCustomLotNumber("");
    setEntryType("PURCHASE");
    setPurchaseDate(new Date().toISOString().slice(0, 10));
    fetchNextLot();
  };

  const handleOpenModal = () => {
    resetForm();
    setModalOpen(true);
  };


  const handleCreatePurchase = async () => {
    if (!currencyId || !quantity || !purchasePrice) {
      error("Validation Error", "Please fill in Currency, Quantity, and Purchase Price");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currencyId,
          quantity: parseFloat(quantity),
          purchasePrice: parseFloat(purchasePrice),
          purchaseDate,
          supplier: supplier.trim() || undefined,
          referenceNumber: referenceNumber.trim() || undefined,
          notes: notes.trim() || undefined,
          customLotNumber: customLotNumber.trim() || undefined,
          entryType,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to create purchase");
      }

      setSuccessData({
        purchaseNumber: json.data.purchase.purchaseNumber,
        lotNumber: json.data.lot.lotNumber,
        totalCost,
        currency: selectedCurrency?.code || "USD",
      });

      success(
        "Purchase Recorded Successfully",
        `Created ${json.data.purchase.purchaseNumber} and unique lot ${json.data.lot.lotNumber}`
      );
      loadData();
    } catch (err: any) {
      error("Purchase Error", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Quick stats
  const totalPurchasesCount = purchases.length;
  const totalUnitsAcquired = purchases.reduce((acc, p) => acc + Number(p.quantity), 0);
  const totalSpendINR = purchases.reduce((acc, p) => acc + Number(p.totalAmount), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Purchases</h1>
          <p className="text-sm text-white/50 mt-1">
            Add currency stock and create new traceable inventory lots.
          </p>
        </div>

        {user && canCreateTransaction(user.role) && (
          <Button variant="primary" onClick={handleOpenModal} className="gap-2">
            <Plus className="w-4 h-4" />
            New Purchase
          </Button>
        )}
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white/[0.025] border border-white/[0.06] backdrop-blur-sm">
          <div className="text-[11px] font-medium uppercase tracking-wider text-white/40">Total Purchases</div>
          <div className="text-2xl font-semibold text-white tracking-tight mt-1 tabular-nums">
            {totalPurchasesCount}
          </div>
          <div className="text-xs text-white/40 mt-1">Inbound currency transactions</div>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.025] border border-white/[0.06] backdrop-blur-sm">
          <div className="text-[11px] font-medium uppercase tracking-wider text-white/40">Total Units Acquired</div>
          <div className="text-2xl font-semibold text-white tracking-tight mt-1 tabular-nums font-mono">
            {formatAmount(totalUnitsAcquired)}
          </div>
          <div className="text-xs text-white/40 mt-1">Across all currencies</div>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.025] border border-white/[0.06] backdrop-blur-sm">
          <div className="text-[11px] font-medium uppercase tracking-wider text-white/40">Capital Deployed</div>
          <div className="text-2xl font-semibold text-white tracking-tight mt-1 tabular-nums font-mono">
            ₹{formatAmount(totalSpendINR)}
          </div>
          <div className="text-xs text-white/40 mt-1">Gross purchase valuation</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-3" />
          <Input
            placeholder="Search PO number, lot number, supplier, reference..."
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

      {/* Purchases Data Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden backdrop-blur-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO NUMBER</TableHead>
              <TableHead>LOT CREATED</TableHead>
              <TableHead>DATE</TableHead>
              <TableHead>CURRENCY</TableHead>
              <TableHead className="text-right">QUANTITY</TableHead>
              <TableHead className="text-right">UNIT PRICE</TableHead>
              <TableHead className="text-right">TOTAL COST</TableHead>
              <TableHead className="text-right">REMAINING</TableHead>
              <TableHead>STATUS</TableHead>
              <TableHead>SUPPLIER / REF</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={10} className="py-5 text-center">
                    <div className="h-6 w-full bg-white/[0.03] animate-pulse rounded-lg" />
                  </TableCell>
                </TableRow>
              ))
            ) : purchases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="p-12 text-center">
                  <EmptyState
                    title="No purchases found"
                    description="No currency purchases match your current filters. Record a new purchase above to add stock."
                  />
                </TableCell>
              </TableRow>
            ) : (
              purchases.map((p) => {
                const prec = p.currency.decimalPrecision;
                const isOpening =
                  p.supplier?.toLowerCase().includes("opening") ||
                  p.referenceNumber?.toLowerCase().includes("opening") ||
                  false;
                return (
                  <TableRow key={p.id} className="h-16">
                    <TableCell className="font-mono text-xs font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <span>{p.purchaseNumber}</span>
                        {isOpening && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-sans font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            🏛️ Opening
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/lots/${p.lot.id}`}
                        className="font-mono text-xs font-medium text-white/80 hover:text-white flex items-center gap-1.5 transition"
                      >
                        <Layers className="w-3.5 h-3.5 text-white/40" />
                        {p.lot.lotNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-white/50 whitespace-nowrap">
                      {formatDate(p.purchaseDate)}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-xs text-white">{p.currency.code}</span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-medium text-white/90 tabular-nums">
                      {formatAmount(p.quantity)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-white/70 tabular-nums">
                      ₹{formatAmount(p.purchasePrice, prec)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold text-white tabular-nums">
                      ₹{formatAmount(p.totalAmount, prec)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">
                      <span
                        className={
                          Number(p.lot.remainingQuantity) === 0
                            ? "text-white/30"
                            : "text-emerald-400 font-medium"
                        }
                      >
                        {formatAmount(p.lot.remainingQuantity)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={p.lot.status} />
                    </TableCell>
                    <TableCell className="text-xs text-white/40">
                      <div>{p.supplier || "—"}</div>
                      {p.referenceNumber && (
                        <div className="text-[10px] text-white/30 font-mono">
                          {p.referenceNumber}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Stepped New Purchase Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen} maxWidth="max-w-xl">
        {successData ? (
          /* Step 5: Success State */
          <div className="py-6 text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white tracking-tight">Purchase Recorded</h2>
              <p className="text-xs text-white/50 mt-1">
                {successData.lotNumber} created successfully with {formatAmount(quantity)} {successData.currency} added to active vault.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.025] border border-white/[0.06] text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-white/40">PO Identifier:</span>
                <span className="font-mono text-white font-medium">{successData.purchaseNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">New Inventory Lot:</span>
                <span className="font-mono text-white font-medium">{successData.lotNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Total Capital Cost:</span>
                <span className="font-mono text-white font-semibold">₹{formatAmount(successData.totalCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Status:</span>
                <span className="text-emerald-400 font-medium">AVAILABLE (100% In Stock)</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                Back to Purchases
              </Button>
              <Button variant="primary" onClick={resetForm}>
                Record Another Purchase
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle>New Purchase</DialogTitle>
                  <DialogDescription>
                    Add currency stock and create a new lot.
                  </DialogDescription>
                </div>
                <div className="text-[11px] font-mono text-white/40 uppercase tracking-widest">
                  Step 0{step} / 04
                </div>
              </div>

              {/* Minimal Progress Bar */}
              <div className="grid grid-cols-4 gap-1.5 pt-4">
                {[1, 2, 3, 4].map((s) => (
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
              {/* STEP 1: CURRENCY */}
              {step === 1 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="text-xs font-medium uppercase tracking-wider text-white/50">
                    01 Select Currency
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

                  <div className="space-y-1.5 pt-2">
                    <label className="text-xs font-medium text-white/70">Acquisition Date</label>
                    <Input
                      type="date"
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: QUANTITY */}
              {step === 2 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="text-xs font-medium uppercase tracking-wider text-white/50">
                    02 Enter Units to Acquire ({selectedCurrency?.code})
                  </div>

                  <div className="space-y-1.5">
                    <Input
                      type="number"
                      step="any"
                      min="0.0001"
                      autoFocus
                      placeholder="e.g. 500"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="text-2xl font-mono h-14"
                    />
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex gap-2">
                    {["100", "250", "500", "1000", "5000"].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setQuantity(preset)}
                        className="px-3 py-1.5 rounded-lg text-xs font-mono bg-white/[0.03] border border-white/[0.08] text-white/70 hover:text-white hover:bg-white/[0.08] transition"
                      >
                        +{preset}
                      </button>
                    ))}
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-white/50 flex justify-between">
                    <span>Currency Selected:</span>
                    <span className="text-white font-medium">{selectedCurrency?.code} — {selectedCurrency?.name}</span>
                  </div>
                </div>
              )}

              {/* STEP 3: PRICE & COUNTERPARTY */}
              {step === 3 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="text-xs font-medium uppercase tracking-wider text-white/50">
                    03 Purchase Price & Settlement Details
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <button
                      type="button"
                      onClick={() => {
                        setEntryType("PURCHASE");
                        if (supplier === "Opening Vault Balance") setSupplier("");
                      }}
                      className={`py-1.5 px-3 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5 ${
                        entryType === "PURCHASE"
                          ? "bg-white text-black font-semibold shadow-sm"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Vendor Purchase</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEntryType("OPENING_BALANCE");
                        setSupplier("Opening Vault Balance");
                        if (!notes) setNotes("Initial vault cash balance");
                      }}
                      className={`py-1.5 px-3 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5 ${
                        entryType === "OPENING_BALANCE"
                          ? "bg-amber-400 text-black font-semibold shadow-sm"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Opening Stock Balance</span>
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-white/70">
                      Buying Price per Unit (INR) *
                    </label>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      autoFocus
                      placeholder="e.g. 94.50"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
                      className="text-xl font-mono h-12"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-white/70">Supplier / Desk</label>
                      <Input
                        placeholder="e.g. Global Liquidity Desk"
                        value={supplier}
                        onChange={(e) => setSupplier(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-white/70">Reference / Deal ID</label>
                      <Input
                        placeholder="e.g. FX-REF-2026-09"
                        value={referenceNumber}
                        onChange={(e) => setReferenceNumber(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-white/70">
                        Lot Number / Vault Tag
                      </label>
                      {suggestedLotNumber && (
                        <span className="text-[11px] text-white/40 font-mono">
                          Auto: {suggestedLotNumber}
                        </span>
                      )}
                    </div>
                    <Input
                      placeholder={suggestedLotNumber ? `Leave blank for auto (${suggestedLotNumber}), or enter custom tag` : "e.g. LOT-1008 or VAULT-BAG-01"}
                      value={customLotNumber}
                      onChange={(e) => setCustomLotNumber(e.target.value)}
                      className="font-mono text-xs"
                    />
                    <p className="text-[11px] text-white/40">
                      Leave blank to auto-generate sequential number, or enter your internal vault envelope/tag.
                    </p>
                  </div>

                  {/* Real-time spend calculation strip */}
                  <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-white/40">Total Capital Outlay</div>
                      <div className="text-xl font-semibold text-white font-mono mt-0.5">
                        ₹{formatAmount(totalCost)}
                      </div>
                    </div>
                    <div className="text-right text-xs text-white/50">
                      <div>{formatAmount(quantity || 0)} {selectedCurrency?.code}</div>
                      <div>@ ₹{formatAmount(purchasePrice || 0)}/unit</div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: REVIEW */}
              {step === 4 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="text-xs font-medium uppercase tracking-wider text-white/50">
                    04 Review Purchase
                  </div>

                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3.5">
                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                      <span className="text-white/50 text-xs">Currency</span>
                      <span className="text-base font-semibold text-white">
                        {selectedCurrency?.code} — {selectedCurrency?.name}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                      <span className="text-white/50 text-xs">Units to Ingest</span>
                      <span className="text-base font-mono font-semibold text-white">
                        {formatAmount(quantity)} units
                      </span>
                    </div>

                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                      <span className="text-white/50 text-xs">Purchase Price</span>
                      <span className="text-base font-mono text-white">
                        ₹{formatAmount(purchasePrice)} / unit
                      </span>
                    </div>

                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                      <span className="text-white/50 text-xs">Total Cost</span>
                      <span className="text-xl font-mono font-bold text-white">
                        ₹{formatAmount(totalCost)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                      <span className="text-white/50 text-xs">Purchase Date</span>
                      <span className="text-xs font-mono text-white/80">
                        {formatDate(purchaseDate)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-white/50 text-xs">Lot Assignment</span>
                      <span className="text-xs font-mono text-white/80">
                        {customLotNumber ? `${customLotNumber} (Custom Tag)` : (suggestedLotNumber || "Auto-assigned (Next sequential)")}
                      </span>
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
                  disabled={submitting}
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

              {step < 4 ? (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    if (step === 1 && !currencyId) {
                      error("Selection", "Please select a currency");
                      return;
                    }
                    if (step === 2 && (!quantity || Number(quantity) <= 0)) {
                      error("Validation", "Please enter a valid quantity");
                      return;
                    }
                    if (step === 3 && (!purchasePrice || Number(purchasePrice) <= 0)) {
                      error("Validation", "Please enter a valid unit purchase price");
                      return;
                    }
                    setStep((s) => (s + 1) as any);
                  }}
                >
                  Continue <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  isLoading={submitting}
                  onClick={handleCreatePurchase}
                >
                  Confirm Purchase
                </Button>
              )}
            </DialogFooter>
          </div>
        )}
      </Dialog>
    </div>
  );
}
