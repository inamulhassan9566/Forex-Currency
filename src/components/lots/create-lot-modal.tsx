"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/providers/toast-provider";
import { Layers, Plus, Hash, Coins, Calendar, Sparkles } from "lucide-react";
import { formatAmount } from "@/lib/utils";

interface CreateLotModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currencies: any[];
  onSuccess: () => void;
  initialMode?: "OPENING_STOCK" | "PURCHASE";
}

export function CreateLotModal({
  open,
  onOpenChange,
  currencies,
  onSuccess,
  initialMode = "PURCHASE",
}: CreateLotModalProps) {
  const { success, error } = useToast();
  const [submitting, setSubmitting] = useState(false);

  // Mode: Opening Stock vs Purchase
  const [entryType, setEntryType] = useState<"PURCHASE" | "OPENING_BALANCE">(
    initialMode === "OPENING_STOCK" ? "OPENING_BALANCE" : "PURCHASE"
  );

  // Form State
  const [lotNumber, setLotNumber] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [supplier, setSupplier] = useState(
    initialMode === "OPENING_STOCK" ? "Opening Vault Balance" : "Direct Lot Acquisition"
  );
  const [notes, setNotes] = useState("");

  // Auto lot number placeholder
  const [suggestedLotNumber, setSuggestedLotNumber] = useState("");

  const fetchNextLotNumber = async () => {
    try {
      const res = await fetch("/api/lots/next-number");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.nextLotNumber) {
          setSuggestedLotNumber(json.data.nextLotNumber);
          setLotNumber(json.data.nextLotNumber);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (open) {
      const isOpening = initialMode === "OPENING_STOCK";
      setEntryType(isOpening ? "OPENING_BALANCE" : "PURCHASE");
      fetchNextLotNumber();
      if (currencies.length > 0 && !currencyId) {
        setCurrencyId(currencies[0].id);
      }
      setQuantity("");
      setPurchasePrice("");
      setPurchaseDate(new Date().toISOString().slice(0, 10));
      setSupplier(isOpening ? "Opening Vault Balance" : "Direct Lot Acquisition");
    }
  }, [open, initialMode, currencies]);

  const selectedCurrency = currencies.find((c) => c.id === currencyId) || currencies[0];
  const totalCost = Number(quantity || 0) * Number(purchasePrice || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currencyId || !quantity || !purchasePrice) {
      error("Validation Error", "Please specify Currency, Quantity, and Buying Price.");
      return;
    }

    if (Number(quantity) <= 0) {
      error("Validation Error", "Quantity must be greater than 0.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/lots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currencyId,
          quantity: parseFloat(quantity),
          purchasePrice: parseFloat(purchasePrice),
          purchaseDate,
          lotNumber: lotNumber.trim() || undefined,
          supplier: supplier.trim() || undefined,
          notes: notes.trim() || undefined,
          entryType,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to create lot");
      }

      const createdLot = json.data?.lot || json.data;
      success(
        entryType === "OPENING_BALANCE" ? "Opening Stock Recorded" : "Lot Inwarded Successfully",
        `Recorded ${formatAmount(quantity)} ${selectedCurrency?.code} in active inventory (Lot: ${createdLot.lotNumber}).`
      );
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      error("Creation Error", err.message || "Failed to add lot.");
    } finally {
      setSubmitting(false);
    }
  };

  const isOpening = entryType === "OPENING_BALANCE";

  return (
    <Dialog open={open} onOpenChange={onOpenChange} maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white">
              {isOpening ? <Layers className="w-4 h-4 text-emerald-400" /> : <Plus className="w-4 h-4" />}
            </div>
            <div>
              <DialogTitle>
                {isOpening ? "Record Opening Stock Balance" : "Inward / Buy Currency Lot"}
              </DialogTitle>
              <DialogDescription>
                {isOpening
                  ? "Inward initial physical vault cash balance into active inventory."
                  : "Direct inwarding of physical foreign currency notes into active vault."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <button
            type="button"
            onClick={() => {
              setEntryType("OPENING_BALANCE");
              setSupplier("Opening Vault Balance");
              if (!notes) setNotes("Initial vault cash balance on system onboarding");
            }}
            className={`py-2 px-3 rounded-lg text-xs font-medium transition flex items-center justify-center gap-2 ${
              isOpening
                ? "bg-white text-black font-semibold shadow-sm"
                : "text-white/60 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Opening Stock Balance</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEntryType("PURCHASE");
              setSupplier("Direct Lot Acquisition");
              if (notes === "Initial vault cash balance on system onboarding") setNotes("");
            }}
            className={`py-2 px-3 rounded-lg text-xs font-medium transition flex items-center justify-center gap-2 ${
              !isOpening
                ? "bg-white text-black font-semibold shadow-sm"
                : "text-white/60 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Direct Inward / Buy</span>
          </button>
        </div>

        <div className="space-y-4">
          {/* Lot Number Input (Custom or Auto) */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/70 flex items-center justify-between">
              <span>Lot Number / Identifier</span>
              <button
                type="button"
                onClick={fetchNextLotNumber}
                className="text-[11px] text-white/50 hover:text-white flex items-center gap-1 transition"
              >
                <Sparkles className="w-3 h-3" /> Auto-suggest next ({suggestedLotNumber || "LOT-..."})
              </button>
            </label>
            <div className="relative">
              <Hash className="w-4 h-4 text-white/40 absolute left-3 top-3.5 pointer-events-none" />
              <Input
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
                placeholder="e.g. LOT-1008 or VAULT-USD-01"
                className="pl-9 font-mono text-sm"
              />
            </div>
            <p className="text-[11px] text-white/40">
              Leave as suggested or enter your custom vault bag / counterparty reference.
            </p>
          </div>

          {/* Currency Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/70">Currency *</label>
            <Select
              value={currencyId}
              onChange={(e) => setCurrencyId(e.target.value)}
              required
            >
              {currencies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name} ({c.symbol})
                </option>
              ))}
            </Select>
          </div>

          {/* Quantity Input with Quick Preset Buttons */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/70">
              Quantity / Units to Inward ({selectedCurrency?.code || "CUR"}) *
            </label>
            <Input
              type="number"
              step="any"
              min="0.0001"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 500"
              className="text-xl font-mono h-12"
              required
            />
            {/* Quick Presets */}
            <div className="flex gap-2 pt-1">
              {["100", "250", "500", "1000", "5000"].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setQuantity(preset)}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono bg-white/[0.03] border border-white/[0.08] text-white/70 hover:text-white hover:bg-white/[0.08] transition"
                >
                  +{preset}
                </button>
              ))}
            </div>
          </div>

          {/* Purchase Price & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/70">
                Buying Price per Unit (INR) *
              </label>
              <Input
                type="number"
                step="any"
                min="0"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="e.g. 84.50"
                className="font-mono h-10"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/70">
                Acquisition Date *
              </label>
              <Input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="h-10"
                required
              />
            </div>
          </div>

          {/* Supplier & Storage Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/70">
                Source / Counterparty
              </label>
              <Input
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="e.g. Opening Balance / Vault Stock"
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/70">
                Storage Notes / Details
              </label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Vault Safe A, Envelope #2"
                className="text-xs"
              />
            </div>
          </div>

          {/* Real-time Outlay Summary Banner */}
          <div className="p-4 rounded-xl bg-white/[0.035] border border-white/[0.08] flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-white/40">
                Total Capital Outlay
              </div>
              <div className="text-xl font-semibold text-white font-mono mt-0.5">
                ₹{formatAmount(totalCost)}
              </div>
            </div>
            <div className="text-right text-xs text-white/50">
              <div>{formatAmount(quantity || 0)} {selectedCurrency?.code}</div>
              <div>@ ₹{formatAmount(purchasePrice || 0)} / unit</div>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={submitting || !currencyId || !quantity || !purchasePrice}
            className="gap-2"
          >
            {submitting ? "Inwarding Lot..." : "Add to Vault"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
