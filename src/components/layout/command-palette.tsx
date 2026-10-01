"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import {
  Search,
  Layers,
  ShoppingCart,
  TrendingUp,
  Coins,
  ArrowRight,
  BookOpen,
  Scale,
  BarChart3,
  Settings,
  Sparkles,
} from "lucide-react";
import { formatAmount } from "@/lib/utils";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{
    lots: any[];
    purchases: any[];
    sales: any[];
    currencies: any[];
  }>({ lots: [], purchases: [], sales: [], currencies: [] });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults({ lots: [], purchases: [], sales: [], currencies: [] });
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ lots: [], purchases: [], sales: [], currencies: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setResults(json.data);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (url: string) => {
    onOpenChange(false);
    router.push(url);
  };

  const quickActions = [
    { title: "Record New Purchase", href: "/purchases", icon: ShoppingCart, desc: "Add currency stock & create lot" },
    { title: "Sell Currency (Lot Allocation)", href: "/sales", icon: TrendingUp, desc: "Liquidate lots via FIFO or manual" },
    { title: "Vault Position Registry", href: "/inventory", icon: Coins, desc: "Examine currency holdings" },
    { title: "Lot Profit Statements", href: "/reports", icon: BarChart3, desc: "Audited profit breakdown" },
    { title: "Inventory Reconciliation", href: "/reconciliation", icon: Scale, desc: "Verify Expected vs Actual stock" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange} maxWidth="max-w-2xl" className="p-0 overflow-hidden bg-[#0A0A0C]/95 border-white/[0.12] rounded-[20px]">
      <div className="flex items-center px-5 border-b border-white/[0.08] bg-transparent">
        <Search className="w-4 h-4 text-white/40 mr-3 shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a lot number, invoice, or action..."
          className="w-full h-14 bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
        />
        {loading && <div className="text-[10px] text-white/40 font-mono">Searching...</div>}
      </div>

      <div className="max-h-[380px] overflow-y-auto p-3 space-y-4">
        {/* Quick Actions if query is empty */}
        {!query && (
          <div className="space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-white/30 px-3 py-1">
              Quick Actions
            </div>
            {quickActions.map((action, idx) => {
              const Icon = action.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(action.href)}
                  className="w-full flex items-center justify-between p-2.5 rounded-[12px] text-left hover:bg-white/[0.05] transition text-xs group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-white/[0.04] text-white/70 group-hover:text-white transition">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-medium text-white">{action.title}</div>
                      <div className="text-[11px] text-white/40">{action.desc}</div>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-white/30 group-hover:text-white/80 group-hover:translate-x-0.5 transition" />
                </button>
              );
            })}
          </div>
        )}

        {/* Lots Group */}
        {results.lots.length > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-white/30 px-3 py-1">
              Matching Inventory Lots
            </div>
            {results.lots.map((lot) => (
              <button
                key={lot.id}
                onClick={() => handleSelect(`/lots/${lot.id}`)}
                className="w-full flex items-center justify-between p-2.5 rounded-[12px] text-left hover:bg-white/[0.05] transition text-xs"
              >
                <div className="flex items-center gap-3">
                  <Layers className="w-4 h-4 text-white/60" />
                  <div>
                    <div className="font-mono font-medium text-white">{lot.lotNumber}</div>
                    <div className="text-[11px] text-white/40">
                      {lot.currency.code} • Remaining: {formatAmount(lot.remainingQuantity)} units • Buy: {formatAmount(lot.purchasePrice)}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-white/30" />
              </button>
            ))}
          </div>
        )}

        {/* Sales Group */}
        {results.sales.length > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-white/30 px-3 py-1">
              Sales Invoices
            </div>
            {results.sales.map((sale) => (
              <button
                key={sale.id}
                onClick={() => handleSelect(`/sales/${sale.id}`)}
                className="w-full flex items-center justify-between p-2.5 rounded-[12px] text-left hover:bg-white/[0.05] transition text-xs"
              >
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="font-mono font-medium text-white">{sale.saleNumber}</div>
                    <div className="text-[11px] text-white/40">
                      {sale.currency.code} • {formatAmount(sale.totalQuantity)} units • {sale.customerName || "Customer"}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-white/30" />
              </button>
            ))}
          </div>
        )}

        {/* Purchases Group */}
        {results.purchases.length > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-white/30 px-3 py-1">
              Purchase Orders
            </div>
            {results.purchases.map((po) => (
              <button
                key={po.id}
                onClick={() => handleSelect(`/purchases`)}
                className="w-full flex items-center justify-between p-2.5 rounded-[12px] text-left hover:bg-white/[0.05] transition text-xs"
              >
                <div className="flex items-center gap-3">
                  <ShoppingCart className="w-4 h-4 text-white/60" />
                  <div>
                    <div className="font-mono font-medium text-white">{po.purchaseNumber}</div>
                    <div className="text-[11px] text-white/40">
                      {po.currency.code} • {formatAmount(po.quantity)} units • Assigned to {po.lot.lotNumber}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-white/30" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-white/[0.06] bg-white/[0.015] flex items-center justify-between text-[11px] text-white/40 px-5">
        <span>Press <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-[10px] font-mono text-white/70">ESC</kbd> to dismiss</span>
        <span>Forex OS Search Engine</span>
      </div>
    </Dialog>
  );
}
