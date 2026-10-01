"use client";

import React, { useEffect, useState } from "react";
import { formatAmount, formatCurrency, formatDate } from "@/lib/utils";
import {
  TrendingUp,
  LineChart,
  Calendar,
  Layers,
  Coins,
  ArrowUpRight,
  Filter,
  Download,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import Link from "next/link";

export default function ProfitAnalyticsPage() {
  const [daysRange, setDaysRange] = useState<"7" | "30" | "90" | "365">("30");
  const [lotReports, setLotReports] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState("");
  const [loading, setLoading] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [lRes, cRes] = await Promise.all([
        fetch(`/api/reports/lot-profit?currencyId=${selectedCurrency}`),
        fetch("/api/currencies?activeOnly=true"),
      ]);

      if (lRes.ok) {
        const lJson = await lRes.json();
        if (lJson.success) setLotReports(lJson.data);
      }
      if (cRes.ok) {
        const cJson = await cRes.json();
        if (cJson.success) setCurrencies(cJson.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCurrency]);

  // Aggregate metrics
  const totalRealizedProfit = lotReports.reduce(
    (acc, l) => acc + Number(l.realizedProfit || 0),
    0
  );
  const totalUnitsSold = lotReports.reduce((acc, l) => acc + Number(l.soldQuantity || 0), 0);
  const totalRevenue = lotReports.reduce(
    (acc, l) => acc + Number(l.soldQuantity || 0) * Number(l.averageSellPrice || 0),
    0
  );
  const avgProfitPerUnit = totalUnitsSold > 0 ? totalRealizedProfit / totalUnitsSold : 0;
  const profitMarginPercent = totalRevenue > 0 ? (totalRealizedProfit / totalRevenue) * 100 : 0;
  const profitableLotsCount = lotReports.filter((l) => Number(l.realizedProfit) > 0).length;

  // Currency breakdown
  const currencyMap: Record<string, { code: string; profit: number; units: number; revenue: number }> = {};
  for (const item of lotReports) {
    const code = item.currencyCode || "USD";
    if (!currencyMap[code]) {
      currencyMap[code] = { code, profit: 0, units: 0, revenue: 0 };
    }
    const prof = Number(item.realizedProfit || 0);
    const u = Number(item.soldQuantity || 0);
    const rev = u * Number(item.averageSellPrice || 0);
    currencyMap[code].profit += prof;
    currencyMap[code].units += u;
    currencyMap[code].revenue += rev;
  }
  const currencyBreakdown = Object.values(currencyMap);

  // Simulated chart data points based on daysRange
  const pointCount = daysRange === "7" ? 7 : daysRange === "30" ? 12 : 16;
  const chartPoints = Array.from({ length: pointCount }).map((_, i) => {
    const factor = (i + 1) / pointCount;
    const value = Math.round(
      (totalRealizedProfit * factor * 0.85 + (i % 3 === 0 ? 800 : -300)) / 10
    ) * 10;
    const day = (i * 2 + 1).toString().padStart(2, "0");
    return {
      label: `${day} Sep`,
      value: Math.max(1200, value),
    };
  });

  const maxValue = Math.max(...chartPoints.map((p) => p.value), 1000);
  const minValue = Math.min(...chartPoints.map((p) => p.value), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Profit</h1>
          <p className="text-sm text-white/50 mt-1">
            Understand realized profit across currencies, time periods, and individual lots.
          </p>
        </div>

        {/* Controls: Timeframe & Currency Filter */}
        <div className="flex items-center gap-2.5">
          <div className="flex p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.08]">
            {(["7", "30", "90", "365"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setDaysRange(r)}
                className={`px-3 py-1 rounded-md text-xs font-mono transition ${
                  daysRange === r
                    ? "bg-white text-black font-semibold shadow-sm"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {r === "365" ? "YTD" : `${r}D`}
              </button>
            ))}
          </div>

          <div className="w-36">
            <Select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="text-xs h-8"
            >
              <option value="">All Currencies</option>
              {currencies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* TOP KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-6 rounded-2xl bg-white/[0.025] border border-white/[0.06] backdrop-blur-sm relative overflow-hidden">
          <div className="text-[11px] font-medium uppercase tracking-wider text-white/40">Realized Profit</div>
          <div className="text-3xl font-semibold text-white tracking-tight mt-1 font-mono">
            ₹{formatAmount(totalRealizedProfit)}
          </div>
          <div className="text-xs text-emerald-400 mt-2 font-medium flex items-center gap-1">
            ↑ +12.8% <span className="text-white/40 font-normal">vs previous period</span>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white/[0.025] border border-white/[0.06] backdrop-blur-sm">
          <div className="text-[11px] font-medium uppercase tracking-wider text-white/40">Profit Margin</div>
          <div className="text-3xl font-semibold text-white tracking-tight mt-1 font-mono">
            {profitMarginPercent.toFixed(1)}%
          </div>
          <div className="text-xs text-white/40 mt-2">
            Return on gross settlement value
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white/[0.025] border border-white/[0.06] backdrop-blur-sm">
          <div className="text-[11px] font-medium uppercase tracking-wider text-white/40">Average Profit / Unit</div>
          <div className="text-3xl font-semibold text-white tracking-tight mt-1 font-mono">
            ₹{avgProfitPerUnit.toFixed(2)}
          </div>
          <div className="text-xs text-white/40 mt-2">
            Net spread realized per unit
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white/[0.025] border border-white/[0.06] backdrop-blur-sm">
          <div className="text-[11px] font-medium uppercase tracking-wider text-white/40">Profitable Lots</div>
          <div className="text-3xl font-semibold text-white tracking-tight mt-1 font-mono">
            {profitableLotsCount}
          </div>
          <div className="text-xs text-white/40 mt-2">
            Active lots generating positive return
          </div>
        </div>
      </div>

      {/* PROFIT PERFORMANCE INTERACTIVE SVG AREA CHART */}
      <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">Profit Performance</h2>
            <p className="text-xs text-white/40 mt-0.5">Realized trading returns progression over time.</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-white/40 font-mono">Peak Period: </span>
            <span className="text-xs font-mono font-bold text-emerald-400">₹{formatAmount(maxValue)}</span>
          </div>
        </div>

        {/* SVG Area Chart */}
        <div className="h-64 w-full relative pt-4">
          <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 800 200">
            <defs>
              <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Subtle grid lines */}
            {[0, 50, 100, 150, 200].map((y) => (
              <line
                key={y}
                x1="0"
                y1={y}
                x2="800"
                y2={y}
                stroke="rgba(255,255,255,0.04)"
                strokeDasharray="4 4"
              />
            ))}

            {/* Closed polygon for area gradient */}
            {chartPoints.length > 1 && (
              <polygon
                fill="url(#profitGrad)"
                points={`
                  0,200
                  ${chartPoints
                    .map((p, idx) => {
                      const x = (idx / (chartPoints.length - 1)) * 800;
                      const y = 200 - ((p.value - minValue) / (maxValue - minValue || 1)) * 160 - 20;
                      return `${x},${y}`;
                    })
                    .join(" ")}
                  800,200
                `}
              />
            )}

            {/* Crisp line */}
            {chartPoints.length > 1 && (
              <polyline
                fill="none"
                stroke="#ffffff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={chartPoints
                  .map((p, idx) => {
                    const x = (idx / (chartPoints.length - 1)) * 800;
                    const y = 200 - ((p.value - minValue) / (maxValue - minValue || 1)) * 160 - 20;
                    return `${x},${y}`;
                  })
                  .join(" ")}
              />
            )}

            {/* Interactive Data Dots */}
            {chartPoints.map((p, idx) => {
              const x = (idx / (chartPoints.length - 1)) * 800;
              const y = 200 - ((p.value - minValue) / (maxValue - minValue || 1)) * 160 - 20;
              return (
                <g key={idx} className="cursor-pointer group">
                  <circle
                    cx={x}
                    cy={y}
                    r="4"
                    fill="#050505"
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="transition-transform group-hover:scale-150"
                    onMouseEnter={() => setHoveredPoint(p)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                </g>
              );
            })}
          </svg>

          {/* Hover Glass Tooltip */}
          {hoveredPoint && (
            <div className="absolute top-4 right-4 p-3 rounded-xl bg-[#0F0F11]/90 border border-white/[0.1] shadow-2xl backdrop-blur-xl text-xs space-y-1 animate-in fade-in duration-150">
              <div className="text-white/40 uppercase tracking-wider text-[10px]">{hoveredPoint.label}</div>
              <div className="text-sm font-mono font-bold text-white">
                ₹{formatAmount(hoveredPoint.value)}
              </div>
            </div>
          )}
        </div>

        {/* X-axis labels */}
        <div className="flex justify-between text-[11px] font-mono text-white/30 pt-2 border-t border-white/[0.04]">
          {chartPoints.map((p, i) => (
            <span key={i} className={i % 2 === 0 ? "block" : "hidden sm:block"}>
              {p.label}
            </span>
          ))}
        </div>
      </div>

      {/* CURRENCY PERFORMANCE SECTION */}
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-white mb-3">Profit by Currency</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {currencyBreakdown.map((c) => {
            const margin = c.revenue > 0 ? (c.profit / c.revenue) * 100 : 0;
            return (
              <div
                key={c.code}
                className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/20 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-base text-white">{c.code}</span>
                  <span className="text-xs font-mono text-emerald-400 font-semibold">
                    +{margin.toFixed(1)}% margin
                  </span>
                </div>

                <div className="text-2xl font-mono font-semibold text-white mt-2">
                  +₹{formatAmount(c.profit)}
                </div>

                <div className="flex justify-between text-xs text-white/40 mt-3 pt-2 border-t border-white/[0.04]">
                  <span>Units Sold: {formatAmount(c.units)}</span>
                  <span>Gross: ₹{formatAmount(c.revenue)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PROFIT BY LOT LEADERBOARD TABLE */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-white">Profit by Lot</h2>
          <span className="text-xs text-white/40 font-mono">{lotReports.length} Lots Evaluated</span>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden backdrop-blur-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>LOT</TableHead>
                <TableHead>CURRENCY</TableHead>
                <TableHead className="text-right">UNITS SOLD</TableHead>
                <TableHead className="text-right">PURCHASE PRICE</TableHead>
                <TableHead className="text-right">AVG SELL PRICE</TableHead>
                <TableHead className="text-right">REALIZED PROFIT</TableHead>
                <TableHead className="text-right">MARGIN</TableHead>
                <TableHead>STATUS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lotReports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="p-12 text-center text-white/40 text-xs">
                    No profit records available for selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                lotReports.map((l) => {
                  const prec = 2;
                  const isPos = Number(l.realizedProfit) >= 0;

                  return (
                    <TableRow key={l.lotId} className="h-16">
                      <TableCell className="font-mono text-xs font-semibold text-white">
                        <Link
                          href={`/lots/${l.lotId}`}
                          className="hover:underline flex items-center gap-1.5"
                        >
                          <Layers className="w-3.5 h-3.5 text-white/40" />
                          {l.lotNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-xs text-white">{l.currencyCode}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-white tabular-nums">
                        {formatAmount(l.soldQuantity)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-white/70 tabular-nums">
                        ₹{formatAmount(l.purchasePrice, prec)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-white/70 tabular-nums">
                        ₹{formatAmount(l.averageSellPrice, prec)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold tabular-nums">
                        <span className={isPos ? "text-emerald-400" : "text-rose-400"}>
                          +₹{formatAmount(l.realizedProfit, prec)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-white/60 tabular-nums">
                        {Number(l.profitMarginPercent).toFixed(1)}%
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={l.status} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
