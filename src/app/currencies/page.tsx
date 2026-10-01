"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { formatAmount, formatCurrency } from "@/lib/utils";
import { Coins, Plus, Edit2, CheckCircle2, XCircle, AlertTriangle, Layers, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { canManageCurrencies } from "@/lib/rbac";

export default function CurrenciesPage() {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [currencies, setCurrencies] = useState<any[]>([]);
  const [currencyPositions, setCurrencyPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("$");
  const [decimalPrecision, setDecimalPrecision] = useState("2");
  const [minStockThreshold, setMinStockThreshold] = useState("100");
  const [isActive, setIsActive] = useState(true);

  const loadCurrencies = async () => {
    setLoading(true);
    try {
      const [cRes, pRes] = await Promise.all([
        fetch("/api/currencies"),
        fetch("/api/reports/currency"),
      ]);

      if (cRes.ok) {
        const json = await cRes.json();
        if (json.success) setCurrencies(json.data);
      }
      if (pRes.ok) {
        const pJson = await pRes.json();
        if (pJson.success) setCurrencyPositions(pJson.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurrencies();
  }, []);

  const openCreateModal = () => {
    setIsEditing(false);
    setEditId("");
    setCode("");
    setName("");
    setSymbol("$");
    setDecimalPrecision("2");
    setMinStockThreshold("100");
    setIsActive(true);
    setModalOpen(true);
  };

  const openEditModal = (c: any) => {
    setIsEditing(true);
    setEditId(c.id);
    setCode(c.code);
    setName(c.name);
    setSymbol(c.symbol);
    setDecimalPrecision(c.decimalPrecision.toString());
    setMinStockThreshold(c.minStockThreshold.toString());
    setIsActive(c.isActive);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = isEditing ? `/api/currencies/${editId}` : "/api/currencies";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          name: name.trim(),
          symbol: symbol.trim(),
          decimalPrecision: parseInt(decimalPrecision, 10),
          minStockThreshold: parseFloat(minStockThreshold),
          isActive,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Operation failed");
      }

      success(
        isEditing ? "Currency Updated" : "Currency Added",
        `${code.toUpperCase()} configured successfully.`
      );
      setModalOpen(false);
      loadCurrencies();
    } catch (err: any) {
      error("Currency Error", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Currencies</h1>
          <p className="text-sm text-white/50 mt-1">
            Configure tradeable foreign currencies, precision parameters, and minimum vault thresholds.
          </p>
        </div>

        {user && canManageCurrencies(user.role) && (
          <Button variant="primary" onClick={openCreateModal} className="gap-2">
            <Plus className="w-4 h-4" /> Add Currency
          </Button>
        )}
      </div>

      {/* CURRENCY CARDS (SECTION 29) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {currencies.map((c) => {
          const pos = currencyPositions.find((p) => p.currencyCode === c.code);
          const totalUnits = pos ? Number(pos.totalRemaining) : 0;
          const totalVal = pos ? Number(pos.totalInventoryValue) : 0;
          const activeLotsCount = c.lots?.filter((l: any) => l.status !== "SOLD_OUT").length || 0;
          const isLow = pos?.isLowStock;

          return (
            <div
              key={c.id}
              className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/20 transition group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center font-mono font-bold text-white text-base">
                    {c.symbol}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white tracking-tight">{c.code}</h3>
                    <p className="text-xs text-white/50">{c.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                      c.isActive
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-white/[0.06] text-white/40 border border-white/[0.08]"
                    }`}
                  >
                    {c.isActive ? "Active" : "Inactive"}
                  </span>

                  {user && canManageCurrencies(user.role) && (
                    <button
                      onClick={() => openEditModal(c)}
                      className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/[0.06] transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Position Data */}
              <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-white/[0.06]">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-white/40">Vault Stock</div>
                  <div className="text-2xl font-mono font-semibold text-white mt-1 tabular-nums">
                    {formatAmount(totalUnits)}
                  </div>
                  <div className="text-[11px] text-white/40 mt-0.5">{c.code} in active lots</div>
                </div>

                <div>
                  <div className="text-[10px] uppercase tracking-wider text-white/40">Active Lots</div>
                  <div className="text-2xl font-mono font-semibold text-white mt-1 tabular-nums">
                    {activeLotsCount}
                  </div>
                  <div className="text-[11px] text-white/40 mt-0.5">Holding positive stock</div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-5 pt-3 border-t border-white/[0.04] text-xs">
                <span className="text-white/40">Stock Value:</span>
                <span className="font-mono text-white font-medium">₹{formatAmount(totalVal)}</span>
              </div>

              {isLow && (
                <div className="text-[11px] font-medium text-amber-400 flex items-center gap-1.5 mt-2.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Below threshold ({c.minStockThreshold} units)
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CREATE / EDIT CURRENCY MODAL */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen} maxWidth="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Currency" : "Configure New Currency"}</DialogTitle>
          <DialogDescription>
            Set trading parameters, symbol representation, and minimum reserve threshold.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 my-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/70">ISO Currency Code *</label>
              <Input
                required
                maxLength={3}
                placeholder="e.g. USD"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                disabled={isEditing}
                className="font-mono uppercase font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/70">Symbol *</label>
              <Input
                required
                placeholder="e.g. $"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="font-mono text-center font-bold"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/70">Currency Full Name *</label>
            <Input
              required
              placeholder="e.g. United States Dollar"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/70">Decimal Precision</label>
              <Input
                type="number"
                min="0"
                max="4"
                required
                value={decimalPrecision}
                onChange={(e) => setDecimalPrecision(e.target.value)}
                className="font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/70">Min Reserve Threshold</label>
              <Input
                type="number"
                min="0"
                required
                placeholder="100"
                value={minStockThreshold}
                onChange={(e) => setMinStockThreshold(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting}>
              {isEditing ? "Save Changes" : "Create Currency"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
