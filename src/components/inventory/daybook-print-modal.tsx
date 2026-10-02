"use client";

import React, { useRef } from "react";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, ShieldCheck, FileSpreadsheet, Building2 } from "lucide-react";
import { formatAmount, formatDate } from "@/lib/utils";

interface DaybookPrintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  daybookData: any[];
  date: string;
}

export function DaybookPrintModal({
  open,
  onOpenChange,
  daybookData,
  date,
}: DaybookPrintModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const totalOpening = daybookData.reduce((acc, d) => acc + Number(d.openingStock), 0);
  const totalInward = daybookData.reduce((acc, d) => acc + Number(d.inwardToday), 0);
  const totalOutward = daybookData.reduce((acc, d) => acc + Number(d.outwardToday), 0);
  const totalClosing = daybookData.reduce((acc, d) => acc + Number(d.closingStock), 0);
  const totalProfit = daybookData.reduce((acc, d) => acc + Number(d.realizedProfitToday), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} maxWidth="max-w-3xl">
      <div className="space-y-6">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white">
              <Printer className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <DialogTitle>Print Daily Vault Stock Register</DialogTitle>
              <DialogDescription>
                Official regulatory daybook statement with opening stock, daily movements, and custodian sign-offs.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Printable Document Container */}
        <div
          ref={printRef}
          id="printable-daybook"
          className="p-8 rounded-2xl bg-[#09090b] border border-white/10 text-white space-y-6 print:border-black print:text-black print:bg-white print:p-8 print:m-0"
        >
          {/* Document Header */}
          <div className="border-b border-white/10 print:border-black/20 pb-5 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-white print:text-black" />
                <span className="text-xs font-bold tracking-widest uppercase text-white/50 print:text-black/60">
                  APEX FOREX TRADING CORP
                </span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white uppercase mt-1 print:text-black">
                Daily Vault Stock Register & Daybook
              </h2>
              <div className="text-xs text-white/60 print:text-black/70 mt-0.5">
                Official Currency Position, Opening Balances & Trading Settlement Sheet
              </div>
            </div>

            <div className="text-right text-xs font-mono space-y-1">
              <div>
                <span className="text-white/40 print:text-black/50">Trading Date: </span>
                <span className="font-bold text-white print:text-black">{formatDate(date)}</span>
              </div>
              <div>
                <span className="text-white/40 print:text-black/50">Document Ref: </span>
                <span className="text-white print:text-black">DAYBOOK-{date.replace(/-/g, "")}</span>
              </div>
              <div className="text-[10px] text-white/40 print:text-black/50">
                Printed on: {new Date().toLocaleString()}
              </div>
            </div>
          </div>

          {/* Golden Equation Formula Pill */}
          <div className="p-3 rounded-xl bg-white/[0.03] print:bg-black/5 border border-white/[0.08] print:border-black/10 text-xs font-mono flex items-center justify-between">
            <span className="text-amber-400 print:text-black font-semibold">Opening Stock (00:00)</span>
            <span>+</span>
            <span className="text-emerald-400 print:text-black font-semibold">Inward Purchases</span>
            <span>-</span>
            <span className="text-rose-400 print:text-black font-semibold">Outward Sales</span>
            <span>=</span>
            <span className="text-white print:text-black font-bold">Closing Vault Stock</span>
          </div>

          {/* Summary Strip */}
          <div className="grid grid-cols-5 gap-3 text-center border border-white/10 print:border-black/20 rounded-xl p-3 bg-white/[0.02] print:bg-black/5">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-white/40 print:text-black/60 font-semibold">
                Opening Stock
              </div>
              <div className="text-base font-bold font-mono text-white print:text-black mt-0.5">
                {formatAmount(totalOpening)}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-emerald-400 print:text-black/60 font-semibold">
                Inward (+)
              </div>
              <div className="text-base font-bold font-mono text-emerald-400 print:text-black mt-0.5">
                +{formatAmount(totalInward)}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-rose-400 print:text-black/60 font-semibold">
                Outward (-)
              </div>
              <div className="text-base font-bold font-mono text-rose-400 print:text-black mt-0.5">
                -{formatAmount(totalOutward)}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-white/70 print:text-black/60 font-semibold">
                Closing Stock
              </div>
              <div className="text-base font-bold font-mono text-white print:text-black mt-0.5">
                {formatAmount(totalClosing)}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-emerald-400 print:text-black/60 font-semibold">
                Day's Profit
              </div>
              <div className="text-base font-bold font-mono text-emerald-400 print:text-black mt-0.5">
                +₹{formatAmount(totalProfit)}
              </div>
            </div>
          </div>

          {/* Daybook Table */}
          <div className="border border-white/10 print:border-black/20 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.04] print:bg-black/10 border-b border-white/10 print:border-black/20 text-white/50 print:text-black/70 font-mono uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Currency</th>
                  <th className="py-2.5 px-3 text-right">Opening Stock</th>
                  <th className="py-2.5 px-3 text-right">Inward (+)</th>
                  <th className="py-2.5 px-3 text-right">Outward (-)</th>
                  <th className="py-2.5 px-3 text-right">Closing Stock</th>
                  <th className="py-2.5 px-3 text-right">Day's Profit (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] print:divide-black/10 font-mono">
                {daybookData.map((d) => (
                  <tr key={d.currencyId} className="print:text-black">
                    <td className="py-2.5 px-3 font-semibold text-white print:text-black">
                      {d.currencyCode} <span className="font-normal text-white/40 print:text-black/50">({d.currencyName})</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-amber-300 print:text-black">
                      {formatAmount(d.openingStock)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-400 print:text-black">
                      {Number(d.inwardToday) > 0 ? `+${formatAmount(d.inwardToday)}` : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right text-rose-400 print:text-black">
                      {Number(d.outwardToday) > 0 ? `-${formatAmount(d.outwardToday)}` : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-white print:text-black">
                      {formatAmount(d.closingStock)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-emerald-400 print:text-black">
                      +₹{formatAmount(d.realizedProfitToday)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Physical Verification & Sign-off Section */}
          <div className="pt-6 border-t border-white/10 print:border-black/20 space-y-4">
            <div className="text-[10px] uppercase font-mono tracking-widest text-white/40 print:text-black/50">
              PHYSICAL VAULT VERIFICATION & REGULATORY CUSTODY AUDIT
            </div>

            <div className="grid grid-cols-3 gap-6 pt-6 text-center text-xs font-mono">
              <div className="space-y-2">
                <div className="border-b border-white/20 print:border-black/40 pb-6" />
                <div className="font-semibold text-white print:text-black">Cashier / Counter Desk</div>
                <div className="text-[10px] text-white/40 print:text-black/50">Drawer Balance Reconciled</div>
              </div>

              <div className="space-y-2">
                <div className="border-b border-white/20 print:border-black/40 pb-6" />
                <div className="font-semibold text-white print:text-black">Vault Custodian</div>
                <div className="text-[10px] text-white/40 print:text-black/50">Safe Lock Verification</div>
              </div>

              <div className="space-y-2">
                <div className="border-b border-white/20 print:border-black/40 pb-6" />
                <div className="font-semibold text-white print:text-black">Branch / Compliance Manager</div>
                <div className="text-[10px] text-white/40 print:text-black/50">Daybook Sign-off & Lock</div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button variant="primary" onClick={handlePrint} className="gap-2 shadow-lg">
            <Printer className="w-4 h-4" /> Print / Save PDF
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
