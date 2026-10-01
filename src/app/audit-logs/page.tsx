"use client";

import React, { useEffect, useState } from "react";
import { formatDateTime } from "@/lib/utils";
import { ShieldCheck, Search, Filter, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/audit-logs?action=${actionFilter}&entity=${entityFilter}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) setLogs(json.data.items);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [actionFilter, entityFilter]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Audit Logs</h1>
          <p className="text-sm text-white/50 mt-1">
            Tamper-proof record of every financial and operational event: purchases, sales, reversals, and adjustments.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="w-full sm:w-64">
          <Select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="">All Action Types</option>
            <option value="PURCHASE_CREATED">Purchase Created</option>
            <option value="SALE_CREATED">Sale Created</option>
            <option value="SALE_REVERSED">Sale Reversed</option>
            <option value="STOCK_ADJUSTED">Stock Adjusted</option>
            <option value="CURRENCY_CREATED">Currency Created</option>
            <option value="USER_CREATED">User Created</option>
            <option value="LOGIN_SUCCESS">Login Success</option>
          </Select>
        </div>
        <div className="w-full sm:w-64">
          <Select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
          >
            <option value="">All Entity Types</option>
            <option value="Purchase">Purchase</option>
            <option value="Sale">Sale</option>
            <option value="Lot">Lot</option>
            <option value="Currency">Currency</option>
            <option value="User">User</option>
          </Select>
        </div>
      </div>

      {/* Audit Log Table (Section 31) */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden backdrop-blur-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>TIMESTAMP</TableHead>
              <TableHead>USER / AGENT</TableHead>
              <TableHead>ACTION</TableHead>
              <TableHead>ENTITY</TableHead>
              <TableHead>RECORD ID</TableHead>
              <TableHead>AUDIT DETAILS & IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6} className="py-5 text-center">
                    <div className="h-6 w-full bg-white/[0.03] animate-pulse rounded-lg" />
                  </TableCell>
                </TableRow>
              ))
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="p-12 text-center">
                  <EmptyState
                    title="No audit entries found"
                    description="No events match your current filter parameters."
                  />
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id} className="h-16">
                  <TableCell className="text-xs text-white/50 font-mono whitespace-nowrap">
                    {formatDateTime(log.createdAt)}
                  </TableCell>
                  <TableCell className="font-semibold text-xs text-white">
                    {log.user?.name || "System"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase ${
                        log.action.includes("REVERS")
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : log.action.includes("SALE")
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : log.action.includes("PURCHASE")
                          ? "bg-white/10 text-white border border-white/20"
                          : "bg-white/[0.04] text-white/60 border border-white/[0.06]"
                      }`}
                    >
                      {log.action.replace("_", " ")}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-white/60">
                    {log.entityType}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-white/40">
                    {log.entityId ? log.entityId.slice(0, 12) + "..." : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-white/50 max-w-xs truncate">
                    <span>
                      {log.metadata
                        ? JSON.stringify(log.metadata).slice(0, 60) + "..."
                        : log.ipAddress || "Direct connection"}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
