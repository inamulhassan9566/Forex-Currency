"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { KpiCard } from "@/components/shared/kpi-card";
import { formatAmount, formatCurrency, formatDate } from "@/lib/utils";
import {
  TrendingUp,
  Coins,
  ShoppingCart,
  Layers,
  ArrowRight,
  AlertTriangle,
  Plus,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  // Time-based greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  useEffect(() => {
    if (!user) return;
    async function loadDashboard() {
      setLoading(true);
      try {
        const res = await fetch(`/api/dashboard?days=${days}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success) setData(json.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [user, days]);

  if (loading && !data) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-white/[0.04] rounded-lg" />
          <div className="h-4 w-48 bg-white/[0.02] rounded" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-white/[0.03] border border-white/[0.06] rounded-[16px]" />
          ))}
        </div>
      </div>
    );
  }

  const kpi = data?.kpi || {};
  const charts = data?.charts || {};
  const lowStockAlerts = data?.lowStockAlerts || [];
  const recentActivity = data?.recentActivity || [];

  return (
    <div className="space-y-10">
      {/* Header Greeting Banner */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs uppercase font-mono tracking-wider text-white/40">
            {todayFormatted}
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
            {greeting}, {user?.name?.split(" ")[0] || "Operator"}.
          </h1>
          <p className="text-xs text-white/50">
            Here is your foreign exchange operation overview.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/sales">
            <Button variant="primary" size="sm" className="gap-1.5 shadow-md">
              <TrendingUp className="w-3.5 h-3.5 text-black" />
              <span>New Sale</span>
            </Button>
          </Link>
          <Link href="/purchases">
            <Button variant="secondary" size="sm" className="gap-1.5">
              <Plus className="w-3.5 h-3.5 text-white/70" />
              <span>New Purchase</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Low Stock Attention Warning */}
      {lowStockAlerts.length > 0 && (
        <div className="rounded-[16px] bg-amber-500/[0.04] border border-amber-500/20 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">
                Liquidity Threshold Warning: {lowStockAlerts.length} Currencies Require Restocking
              </div>
              <div className="text-[11px] text-white/45 mt-0.5">
                {lowStockAlerts.map((a: any) => `${a.code}: ${a.stock} units (min ${a.threshold})`).join(" • ")}
              </div>
            </div>
          </div>
          <Link href="/purchases">
            <Button variant="secondary" size="sm" className="text-xs shrink-0">
              Restock Vault
            </Button>
          </Link>
        </div>
      )}

      {/* 4 Focused Apple-Style KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Realized Profit"
          value={formatCurrency(kpi.totalRealizedProfit, "USD")}
          trend={{ value: "12.8% vs last month", isPositive: true }}
          subtitle="All confirmed lot-wise sales"
        />

        <KpiCard
          title="Total Stock Value"
          value={formatCurrency(kpi.totalStockValue, "USD")}
          subtitle={`${formatAmount(kpi.totalStockQuantity)} active vault units`}
        />

        <KpiCard
          title="Today's Sales"
          value={formatCurrency(kpi.todaySalesAmount, "USD")}
          subtitle={`${kpi.todaySalesCount} completed trade allocations`}
        />

        <KpiCard
          title="Active Lots in Vault"
          value={kpi.activeLotsCount ?? 0}
          subtitle={`${kpi.unsoldLotsCount ?? 0} completely unsold lots`}
        />
      </div>

      {/* Large Profit Performance Chart */}
      <div className="rounded-[20px] border border-white/[0.07] bg-[#0A0A0C]/90 p-6 sm:p-8 backdrop-blur-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">
              Profit Performance
            </h2>
            <p className="text-xs text-white/40 mt-0.5">
              Historical realized lot profits vs sales transaction volume.
            </p>
          </div>

          <div className="flex items-center rounded-[10px] border border-white/[0.08] bg-white/[0.02] p-1 text-xs">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1 rounded-[8px] font-medium transition text-xs ${
                  days === d
                    ? "bg-white text-black shadow-sm"
                    : "text-white/40 hover:text-white"
                }`}
              >
                {d}D
              </button>
            ))}
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={charts.dailyTrend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ffffff" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#ffffff" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.04)" />
              <XAxis
                dataKey="date"
                tickFormatter={(val) => val.slice(5)}
                stroke="rgba(255, 255, 255, 0.25)"
                fontSize={11}
                tickLine={false}
              />
              <YAxis stroke="rgba(255, 255, 255, 0.25)" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(10, 10, 12, 0.95)",
                  borderColor: "rgba(255, 255, 255, 0.12)",
                  borderRadius: "12px",
                  fontSize: "12px",
                  color: "#fff",
                }}
              />
              <Area
                type="monotone"
                dataKey="profit"
                name="Realized Profit ($)"
                stroke="#ffffff"
                strokeWidth={1.75}
                fillOpacity={1}
                fill="url(#profitGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Column Layout: Inventory Vault Holdings + Recent Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventory Holdings by Currency */}
        <div className="rounded-[20px] border border-white/[0.07] bg-[#0A0A0C]/90 p-6 sm:p-8 backdrop-blur-md space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">
                Vault Inventory Holdings
              </h2>
              <p className="text-xs text-white/40 mt-0.5">
                Current currency reserves and valuation.
              </p>
            </div>
            <Link href="/inventory" className="text-xs text-white/60 hover:text-white transition flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {(charts.inventoryByCurrency || []).map((curr: any) => (
              <div
                key={curr.currency}
                className="p-4 rounded-[14px] bg-white/[0.025] border border-white/[0.06] hover:bg-white/[0.04] transition flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center font-bold text-xs text-white font-mono">
                    {curr.currency}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-white">{curr.currency}</div>
                    <div className="text-xs text-white/40 font-mono">
                      {formatAmount(curr.quantity)} units in vault
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-semibold font-mono text-sm text-white tabular-nums">
                    {formatCurrency(curr.value, curr.currency)}
                  </div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wider">
                    Holding Value
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions Feed */}
        <div className="rounded-[20px] border border-white/[0.07] bg-[#0A0A0C]/90 p-6 sm:p-8 backdrop-blur-md space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">
                Recent Ledger Activity
              </h2>
              <p className="text-xs text-white/40 mt-0.5">
                Sequential immutable stock movements.
              </p>
            </div>
            <Link href="/ledger" className="text-xs text-white/60 hover:text-white transition flex items-center gap-1">
              Ledger <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="divide-y divide-white/[0.05] -my-2">
            {recentActivity.slice(0, 5).map((tx: any) => (
              <div key={tx.id} className="py-3.5 flex items-center justify-between hover:bg-white/[0.02] px-2 rounded-lg transition">
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 rounded-[6px] text-[10px] font-bold font-mono uppercase ${
                      tx.type === "PURCHASE"
                        ? "bg-white/[0.06] text-white"
                        : tx.type === "SALE"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-rose-500/10 text-rose-400"
                    }`}
                  >
                    {tx.type.replace("_", " ")}
                  </span>
                  <div>
                    <div className="font-medium text-xs text-white font-mono flex items-center gap-1.5">
                      <span>{tx.lotNumber}</span>
                      <span className="text-white/30">•</span>
                      <span>{tx.currencyCode}</span>
                    </div>
                    <div className="text-[11px] text-white/40 mt-0.5">
                      {tx.notes || `Processed by ${tx.createdBy}`}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono text-xs font-semibold tabular-nums text-white">
                    {tx.qtyIn > 0 ? `+${formatAmount(tx.qtyIn)}` : `-${formatAmount(tx.qtyOut)}`} {tx.currencyCode}
                  </div>
                  <div className="text-[10px] text-white/40 font-mono">
                    Bal: {formatAmount(tx.balanceAfter)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
