"use client";

import React, { useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { UploadCloud, FileText, CheckCircle2, AlertTriangle, ArrowRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatAmount } from "@/lib/utils";

export default function ImportStockPage() {
  const { user } = useAuth();
  const { success, error, warning } = useToast();

  const [rawText, setRawText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [importing, setImporting] = useState(false);

  // Template demo data
  const sampleCsv = `lotNumber,currencyCode,quantity,purchasePrice,purchaseDate,supplier,notes
LOT-2001,USD,250,93.80,2026-09-30,Bank Wholesale,Batch import USD
LOT-2002,EUR,400,111.20,2026-09-30,Frankfurt Clearing,Batch import EUR
LOT-2003,AED,350,25.90,2026-09-30,Dubai Exchange,Batch import AED`;

  const handleParseCsv = async () => {
    if (!rawText.trim()) {
      error("No Content", "Please paste or enter CSV rows first");
      return;
    }

    setAnalyzing(true);
    try {
      const lines = rawText.trim().split("\n");
      if (lines.length < 2) {
        throw new Error("CSV must include a header line and at least one data row");
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const parsedRows = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));

        const rowObj: any = {};
        headers.forEach((h, idx) => {
          if (h.includes("lot")) rowObj.lotNumber = cols[idx];
          else if (h.includes("curr")) rowObj.currencyCode = cols[idx];
          else if (h.includes("qty") || h.includes("quantity")) rowObj.quantity = parseFloat(cols[idx]);
          else if (h.includes("price")) rowObj.purchasePrice = parseFloat(cols[idx]);
          else if (h.includes("date")) rowObj.purchaseDate = cols[idx];
          else if (h.includes("supp")) rowObj.supplier = cols[idx];
          else if (h.includes("note")) rowObj.notes = cols[idx];
        });

        parsedRows.push(rowObj);
      }

      const res = await fetch("/api/import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: parsedRows }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Validation failed");
      }

      setPreviewData(json.data);
      success("CSV Analyzed", `Validated ${json.data.validRows.length} valid rows.`);
    } catch (err: any) {
      error("Parse Error", err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!previewData || previewData.validRows.length === 0) return;
    setImporting(true);

    try {
      const res = await fetch("/api/import/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: previewData.validRows }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Import execution failed");
      }

      success(
        "Batch Import Successful",
        `Successfully imported ${json.data.importedCount} lots into currency vaults.`
      );
      setRawText("");
      setPreviewData(null);
    } catch (err: any) {
      error("Import Error", err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Batch Import</h1>
          <p className="text-sm text-white/50 mt-1">
            Ingest external legacy inventory lots or bulk supplier transactions into active stock.
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={() => setRawText(sampleCsv)}
          className="gap-2 text-xs"
        >
          <FileText className="w-4 h-4" /> Load Sample CSV
        </Button>
      </div>

      {/* CSV Input Panel */}
      <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-white uppercase tracking-wider">
            Paste Comma-Separated Values (CSV)
          </label>
          <span className="text-xs text-white/40 font-mono">
            lotNumber, currencyCode, quantity, purchasePrice, purchaseDate
          </span>
        </div>

        <textarea
          rows={7}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder={`lotNumber,currencyCode,quantity,purchasePrice,purchaseDate,supplier\nLOT-1001,USD,200,93.50,2026-09-28,Wholesale Desk`}
          className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-white/20 rounded-xl p-4 text-xs font-mono text-white placeholder:text-white/20 focus:outline-none transition resize-none leading-relaxed"
        />

        <div className="flex justify-between items-center pt-2">
          <span className="text-xs text-white/40">
            Duplicate lot numbers will be rejected during validation.
          </span>
          <Button
            variant="primary"
            onClick={handleParseCsv}
            isLoading={analyzing}
            disabled={!rawText.trim()}
            className="gap-2"
          >
            Validate & Preview <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* PREVIEW OF VALID ROWS */}
      {previewData && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-white">Validation Results</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-emerald-400 font-semibold">
                {previewData.validRows.length} Valid Rows
              </span>
              {previewData.invalidRows.length > 0 && (
                <span className="text-xs font-mono text-rose-400 font-semibold">
                  {previewData.invalidRows.length} Errors
                </span>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden backdrop-blur-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>LOT NUMBER</TableHead>
                  <TableHead>CURRENCY</TableHead>
                  <TableHead className="text-right">QUANTITY</TableHead>
                  <TableHead className="text-right">PURCHASE PRICE</TableHead>
                  <TableHead>PURCHASE DATE</TableHead>
                  <TableHead>SUPPLIER</TableHead>
                  <TableHead>STATUS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.validRows.map((r: any, idx: number) => (
                  <TableRow key={idx} className="h-14">
                    <TableCell className="font-mono text-xs font-semibold text-white">{r.lotNumber}</TableCell>
                    <TableCell className="font-semibold text-xs text-white">{r.currencyCode}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-white">{formatAmount(r.quantity)}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-white/70">₹{formatAmount(r.purchasePrice)}</TableCell>
                    <TableCell className="text-xs text-white/50">{r.purchaseDate}</TableCell>
                    <TableCell className="text-xs text-white/40">{r.supplier || "—"}</TableCell>
                    <TableCell>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-emerald-500/10 text-emerald-400">
                        Valid
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="primary"
              onClick={handleExecuteImport}
              isLoading={importing}
              disabled={previewData.validRows.length === 0}
              className="gap-2"
            >
              Commit Ingestion to Vault <CheckCircle2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
