"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/providers/toast-provider";
import { Layers, FileEdit, Check, AlertCircle, Calendar, Hash, Coins } from "lucide-react";
import { formatAmount, formatDate } from "@/lib/utils";

interface EditLotModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lot: any | null;
  onSuccess: (updatedLot: any) => void;
}

export function EditLotModal({
  open,
  onOpenChange,
  lot,
  onSuccess,
}: EditLotModalProps) {
  const { success, error } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const [lotNumber, setLotNumber] = useState("");
  const [status, setStatus] = useState<string>("AVAILABLE");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (lot) {
      setLotNumber(lot.lotNumber || "");
      setStatus(lot.status || "AVAILABLE");
      setNotes(lot.notes || "");
    }
  }, [lot, open]);

  if (!lot) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lotNumber.trim()) {
      error("Validation Error", "Lot number cannot be empty.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/lots/${lot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lotNumber: lotNumber.trim(),
          status,
          notes: notes.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update lot");
      }

      success(
        "Lot Updated Successfully",
        `Lot ${json.data.lotNumber} has been updated in the registry.`
      );
      onSuccess(json.data);
      onOpenChange(false);
    } catch (err: any) {
      error("Update Failed", err.message || "Could not update lot.");
    } finally {
      setSubmitting(false);
    }
  };

  const prec = lot.currency?.decimalPrecision ?? 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white">
              <FileEdit className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle>Edit Lot Information</DialogTitle>
              <DialogDescription>
                Modify lot identifier, audit notes, or vault inventory status.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Read-only Context Summary Card */}
        <div className="p-4 rounded-xl bg-white/[0.025] border border-white/[0.06] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <div className="text-white/40 text-[10px] uppercase tracking-wider">Currency</div>
            <div className="text-white font-semibold font-mono mt-0.5">{lot.currency?.code || "—"}</div>
          </div>
          <div>
            <div className="text-white/40 text-[10px] uppercase tracking-wider">Remaining</div>
            <div className="text-emerald-400 font-mono font-semibold mt-0.5">
              {formatAmount(lot.remainingQuantityNum ?? lot.remainingQuantity)}
            </div>
          </div>
          <div>
            <div className="text-white/40 text-[10px] uppercase tracking-wider">Buy Rate</div>
            <div className="text-white font-mono mt-0.5">
              ₹{formatAmount(lot.purchasePriceNum ?? lot.purchasePrice, prec)}
            </div>
          </div>
          <div>
            <div className="text-white/40 text-[10px] uppercase tracking-wider">Acquired</div>
            <div className="text-white/70 font-mono text-[11px] mt-0.5">
              {formatDate(lot.purchaseDate)}
            </div>
          </div>
        </div>

        {/* Editable Fields */}
        <div className="space-y-4">
          {/* Lot Number Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/70 flex items-center justify-between">
              <span>Lot Number / Identifier *</span>
              <span className="text-[11px] text-white/40 font-normal">Vault bag or custom tag</span>
            </label>
            <div className="relative">
              <Hash className="w-4 h-4 text-white/40 absolute left-3 top-3.5 pointer-events-none" />
              <Input
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
                placeholder="e.g. LOT-1001 or VAULT-BAG-09"
                className="pl-9 font-mono text-sm"
                required
              />
            </div>
          </div>

          {/* Status Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/70">
              Inventory Status
            </label>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="AVAILABLE">AVAILABLE (Active for sales)</option>
              <option value="PARTIALLY_SOLD">PARTIALLY SOLD (Active balance remaining)</option>
              <option value="SOLD_OUT">SOLD OUT (Depleted)</option>
              <option value="CANCELLED">CANCELLED (Locked / Voided from trading)</option>
            </Select>
            <p className="text-[11px] text-white/40">
              Marking as Cancelled holds this lot so it cannot be matched in new sales orders.
            </p>
          </div>

          {/* Notes / Physical Storage details */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/70">
              Vault Notes / Comments
            </label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Stored in Top Vault A, clean notes, supplier envelope ref #44"
              className="text-xs"
            />
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
            disabled={submitting || !lotNumber.trim()}
            className="gap-2"
          >
            {submitting ? "Saving Changes..." : "Save Lot Details"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
