"use client";

import React, { useRef } from "react";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, ShieldCheck, Tag, QrCode } from "lucide-react";
import { formatAmount, formatDate } from "@/lib/utils";

interface VaultTagModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lot: any | null;
}

export function VaultTagModal({ open, onOpenChange, lot }: VaultTagModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!lot) return null;

  const handlePrint = () => {
    window.print();
  };

  const prec = lot.currency?.decimalPrecision ?? 2;
  const totalCost = Number(lot.originalQuantityNum ?? lot.originalQuantity) * Number(lot.purchasePriceNum ?? lot.purchasePrice);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} maxWidth="max-w-md">
      <div className="space-y-6">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle>Physical Vault Tag</DialogTitle>
              <DialogDescription>
                Printable custody label for envelopes, cash bundles, and vault safes.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Printable Physical Slip Container */}
        <div
          ref={printRef}
          id="printable-vault-tag"
          className="p-6 rounded-2xl bg-[#09090b] border-2 border-dashed border-white/20 text-white space-y-5 print:border-black print:text-black print:bg-white print:p-8"
        >
          {/* Slip Header */}
          <div className="border-b border-white/10 pb-4 text-center space-y-1">
            <div className="text-[10px] tracking-widest uppercase font-mono text-white/50 print:text-black/60">
              FOREX VAULT CUSTODY ARCHIVE
            </div>
            <div className="text-sm font-bold tracking-tight text-white uppercase print:text-black">
              Physical Currency Bundle Tag
            </div>
            <div className="text-[11px] font-mono text-white/40 print:text-black/50">
              Acquisition Date: {formatDate(lot.purchaseDate)}
            </div>
          </div>

          {/* Barcode Mock Visual */}
          <div className="py-2 px-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center print:bg-gray-100 print:border-gray-300">
            <div className="font-mono text-2xl tracking-[0.25em] text-white select-none py-1 print:text-black">
              ||| | |||| | ||||| |||| || |
            </div>
            <div className="text-xs font-mono font-bold tracking-widest text-emerald-400 print:text-black">
              {lot.lotNumber}
            </div>
          </div>

          {/* Main Key Details Grid */}
          <div className="grid grid-cols-2 gap-3.5 text-xs">
            <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05] print:border-gray-200">
              <div className="text-[10px] uppercase text-white/40 font-mono print:text-black/60">Currency</div>
              <div className="text-base font-bold text-white font-mono mt-0.5 print:text-black">
                {lot.currency?.code}
              </div>
              <div className="text-[10px] text-white/50 truncate print:text-black/60">{lot.currency?.name}</div>
            </div>

            <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05] print:border-gray-200">
              <div className="text-[10px] uppercase text-white/40 font-mono print:text-black/60">Bundle Count</div>
              <div className="text-base font-bold text-white font-mono mt-0.5 print:text-black">
                {formatAmount(lot.originalQuantityNum ?? lot.originalQuantity)}
              </div>
              <div className="text-[10px] text-white/50 print:text-black/60">Original units</div>
            </div>

            <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05] print:border-gray-200">
              <div className="text-[10px] uppercase text-white/40 font-mono print:text-black/60">Acquisition Rate</div>
              <div className="text-sm font-semibold font-mono text-white mt-0.5 print:text-black">
                ₹{formatAmount(lot.purchasePriceNum ?? lot.purchasePrice, prec)}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05] print:border-gray-200">
              <div className="text-[10px] uppercase text-white/40 font-mono print:text-black/60">Total Cost</div>
              <div className="text-sm font-semibold font-mono text-white mt-0.5 print:text-black">
                ₹{formatAmount(totalCost, prec)}
              </div>
            </div>
          </div>

          {/* Supplier & Storage Location */}
          <div className="space-y-1.5 text-xs border-t border-white/10 pt-3 print:border-gray-200">
            <div className="flex justify-between">
              <span className="text-white/40 print:text-black/60">Source Desk:</span>
              <span className="text-white font-medium print:text-black">
                {lot.purchase?.supplier || "Direct Desk Inwarding"}
              </span>
            </div>
            {lot.notes && (
              <div className="flex justify-between">
                <span className="text-white/40 print:text-black/60">Vault Location:</span>
                <span className="text-white font-mono print:text-black">{lot.notes}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-white/40 print:text-black/60">Current Status:</span>
              <span className="text-emerald-400 font-semibold print:text-black">{lot.status}</span>
            </div>
          </div>

          {/* Verification & Signature Line */}
          <div className="border-t border-white/10 pt-4 space-y-3 print:border-gray-300">
            <div className="flex items-center gap-1.5 text-[11px] text-white/60 print:text-black/70">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 print:text-black" />
              <span>Verified physical count & counterfeit screening passed</span>
            </div>
            <div className="pt-3 flex justify-between items-end text-[10px] font-mono text-white/40 print:text-black/60">
              <div>
                <div>CUSTODIAN SIGNATURE</div>
                <div className="mt-4 border-b border-white/20 w-36 print:border-black" />
              </div>
              <div>DATE: ___/___/20___</div>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button variant="primary" onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" /> Print Vault Slip
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
