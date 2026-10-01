"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Settings, Save, CheckCircle2, Building, Sliders, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { canManageSettings } from "@/lib/rbac";

export default function SettingsPage() {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [companyName, setCompanyName] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
  const [defaultAllocationMethod, setDefaultAllocationMethod] = useState<"FIFO" | "MANUAL">("FIFO");
  const [lotNumberPrefix, setLotNumberPrefix] = useState("LOT-");
  const [saleNumberPrefix, setSaleNumberPrefix] = useState("INV-");
  const [purchaseNumberPrefix, setPurchaseNumberPrefix] = useState("PO-");
  const [financialYear, setFinancialYear] = useState("2026-2027");

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            const s = json.data;
            setCompanyName(s.companyName || "");
            setBaseCurrency(s.baseCurrency || "USD");
            setTimezone(s.timezone || "Asia/Kolkata");
            setDateFormat(s.dateFormat || "DD/MM/YYYY");
            setDefaultAllocationMethod(s.defaultAllocationMethod || "FIFO");
            setLotNumberPrefix(s.lotNumberPrefix || "LOT-");
            setSaleNumberPrefix(s.saleNumberPrefix || "INV-");
            setPurchaseNumberPrefix(s.purchaseNumberPrefix || "PO-");
            setFinancialYear(s.financialYear || "2026-2027");
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          baseCurrency,
          timezone,
          dateFormat,
          defaultAllocationMethod,
          lotNumberPrefix,
          saleNumberPrefix,
          purchaseNumberPrefix,
          financialYear,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to save settings");
      }

      success("Settings Saved", "System configuration has been successfully updated.");
    } catch (err: any) {
      error("Settings Error", err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Settings</h1>
        <p className="text-sm text-white/50 mt-1">
          Trading desk parameters, sequential lot identifier prefixes, and ledger accounting rules.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Organization & Base Parameters */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm space-y-4">
          <h2 className="text-base font-semibold text-white tracking-tight">Organization Profile</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/70">Trading Desk / Company Name</label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Apex Forex Operations"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/70">Settlement Reporting Currency</label>
              <Input
                value={baseCurrency}
                onChange={(e) => setBaseCurrency(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/70">Operational Timezone</label>
              <Select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST)</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/70">Financial Year</label>
              <Input
                value={financialYear}
                onChange={(e) => setFinancialYear(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>
        </div>

        {/* Sequential Identifiers */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm space-y-4">
          <h2 className="text-base font-semibold text-white tracking-tight">Sequential Document Identifiers</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/70">Lot Number Prefix</label>
              <Input
                value={lotNumberPrefix}
                onChange={(e) => setLotNumberPrefix(e.target.value)}
                className="font-mono uppercase font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/70">Sales Order Prefix</label>
              <Input
                value={saleNumberPrefix}
                onChange={(e) => setSaleNumberPrefix(e.target.value)}
                className="font-mono uppercase font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/70">Purchase Order Prefix</label>
              <Input
                value={purchaseNumberPrefix}
                onChange={(e) => setPurchaseNumberPrefix(e.target.value)}
                className="font-mono uppercase font-bold"
              />
            </div>
          </div>
        </div>

        {/* Accounting Rule Engine */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm space-y-4">
          <h2 className="text-base font-semibold text-white tracking-tight">Accounting Rule Engine</h2>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/70">Default Lot Allocation Method</label>
            <Select
              value={defaultAllocationMethod}
              onChange={(e) => setDefaultAllocationMethod(e.target.value as any)}
            >
              <option value="FIFO">FIFO (First-In, First-Out - Standard Financial Principle)</option>
              <option value="MANUAL">MANUAL (Operator selects specific individual lots)</option>
            </Select>
            <p className="text-[11px] text-white/40 pt-1">
              Determines default pre-selection when initiating new outbound currency sales.
            </p>
          </div>
        </div>

        {user && canManageSettings(user.role) && (
          <div className="flex justify-end pt-2">
            <Button type="submit" variant="primary" isLoading={saving} className="gap-2">
              <Save className="w-4 h-4" /> Save Configuration
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
