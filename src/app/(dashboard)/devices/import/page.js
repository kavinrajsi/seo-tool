"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { DEVICE_TYPES, STATUSES } from "@/lib/device-constants";
import QRCode from "qrcode";
import {
  UploadIcon, FileSpreadsheetIcon, CheckCircleIcon,
  AlertTriangleIcon, XIcon, DownloadIcon, LoaderIcon,
} from "lucide-react";

const REQUIRED_COLUMNS = ["serial_number", "device_type", "vendor", "model_name"];
const ALL_COLUMNS = ["serial_number", "device_type", "vendor", "model_name", "purchase_date", "status"];

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = parseLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h.trim().toLowerCase().replace(/\s+/g, "_")] = (values[i] || "").trim(); });
    return obj;
  });
  return { headers: headers.map((h) => h.trim().toLowerCase().replace(/\s+/g, "_")), rows };
}

function parseLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ",") { result.push(current); current = ""; }
      else { current += ch; }
    }
  }
  result.push(current);
  return result;
}

function validateRow(row, index) {
  const errors = [];
  if (!row.serial_number) errors.push("Missing serial number");
  if (!row.device_type) errors.push("Missing device type");
  else if (!DEVICE_TYPES.includes(row.device_type)) errors.push(`Invalid device type: "${row.device_type}"`);
  if (!row.vendor) errors.push("Missing vendor");
  if (!row.model_name) errors.push("Missing model name");
  if (row.status && !STATUSES.includes(row.status)) errors.push(`Invalid status: "${row.status}"`);
  return errors;
}

export default function ImportDevices() {
  const router = useRouter();
  const fileRef = useRef(null);
  const [step, setStep] = useState("upload"); // upload | preview | importing | done
  const [rows, setRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});
  const [importResult, setImportResult] = useState({ success: 0, failed: 0, errors: [] });
  const [progress, setProgress] = useState(0);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { headers: h, rows: r } = parseCSV(ev.target.result);
      const missing = REQUIRED_COLUMNS.filter((c) => !h.includes(c));
      if (missing.length > 0) {
        alert(`Missing required columns: ${missing.join(", ")}\n\nRequired: ${REQUIRED_COLUMNS.join(", ")}`);
        return;
      }
      const errs = {};
      r.forEach((row, i) => {
        const rowErrs = validateRow(row, i);
        if (rowErrs.length > 0) errs[i] = rowErrs;
      });
      setHeaders(h);
      setRows(r);
      setValidationErrors(errs);
      setStep("preview");
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    const validRows = rows.filter((_, i) => !validationErrors[i]);
    if (validRows.length === 0) return;

    setStep("importing");
    let success = 0;
    let failed = 0;
    const errors = [];

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        const qrPayload = {
          serial: row.serial_number, type: row.device_type, vendor: row.vendor,
          model: row.model_name, specs: {},
          assigned_to: null,
        };
        let qrData = "";
        try { qrData = await QRCode.toDataURL(JSON.stringify(qrPayload), { width: 200 }); } catch {}

        const { error } = await supabase.from("devices").insert({
          serial_number: row.serial_number,
          device_type: row.device_type,
          vendor: row.vendor,
          model_name: row.model_name,
          purchase_date: row.purchase_date || null,
          status: row.status || "Available",
          specs: {},
          qr_data: qrData,
        });

        if (error) {
          failed++;
          errors.push({ row: row.serial_number, error: error.message.includes("devices_serial_number_key") ? "Duplicate serial number" : error.message });
        } else {
          success++;
        }
      } catch (err) {
        failed++;
        errors.push({ row: row.serial_number, error: err.message });
      }
      setProgress(Math.round(((i + 1) / validRows.length) * 100));
    }

    setImportResult({ success, failed, errors });
    setStep("done");
  }

  function downloadTemplate() {
    const csv = ALL_COLUMNS.join(",") + "\nSN001,MacBook,Apple,MacBook Pro 14,2024-01-15,Available";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "device-import-template.csv";
    a.click();
  }

  function reset() {
    setStep("upload");
    setRows([]);
    setHeaders([]);
    setValidationErrors({});
    setImportResult({ success: 0, failed: 0, errors: [] });
    setProgress(0);
    if (fileRef.current) fileRef.current.value = "";
  }

  const validCount = rows.filter((_, i) => !validationErrors[i]).length;
  const errorCount = Object.keys(validationErrors).length;

  return (
    <div className="flex flex-1 flex-col gap-6 py-4 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <UploadIcon size={24} className="text-blue-400" />
          Import Devices
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Bulk import devices from a CSV file.</p>
      </div>

      {/* Upload Step */}
      {step === "upload" && (
        <div className="space-y-4">
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-border rounded-xl p-12 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary/40 hover:bg-muted/10 transition-colors"
          >
            <FileSpreadsheetIcon size={40} className="text-muted-foreground" />
            <p className="text-sm font-medium">Click to upload CSV file</p>
            <p className="text-xs text-muted-foreground">Supports .csv files with device data</p>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-medium mb-3">CSV Format Requirements</h3>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p><strong className="text-foreground">Required columns:</strong> serial_number, device_type, vendor, model_name</p>
              <p><strong className="text-foreground">Optional columns:</strong> purchase_date, status</p>
              <p><strong className="text-foreground">Valid device types:</strong> {DEVICE_TYPES.join(", ")}</p>
              <p><strong className="text-foreground">Valid statuses:</strong> {STATUSES.join(", ")} (defaults to Available)</p>
            </div>
            <button onClick={downloadTemplate} className="flex items-center gap-1.5 text-xs text-primary hover:underline mt-4">
              <DownloadIcon size={12} /> Download template CSV
            </button>
          </div>
        </div>
      )}

      {/* Preview Step */}
      {step === "preview" && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="flex gap-3">
            <div className="flex-1 rounded-xl border border-border bg-card p-4 text-center">
              <p className="text-2xl font-bold">{rows.length}</p>
              <p className="text-xs text-muted-foreground">Total Rows</p>
            </div>
            <div className="flex-1 rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-center">
              <p className="text-2xl font-bold text-green-400">{validCount}</p>
              <p className="text-xs text-muted-foreground">Valid</p>
            </div>
            {errorCount > 0 && (
              <div className="flex-1 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center">
                <p className="text-2xl font-bold text-red-400">{errorCount}</p>
                <p className="text-xs text-muted-foreground">Errors</p>
              </div>
            )}
          </div>

          {/* Validation errors */}
          {errorCount > 0 && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <h3 className="text-sm font-medium text-red-400 flex items-center gap-2 mb-2"><AlertTriangleIcon size={14} /> Validation Errors</h3>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {Object.entries(validationErrors).map(([i, errs]) => (
                  <p key={i} className="text-xs text-red-400">Row {Number(i) + 1}: {errs.join(", ")}</p>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Rows with errors will be skipped during import.</p>
            </div>
          )}

          {/* Preview table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground w-8">#</th>
                    {REQUIRED_COLUMNS.concat(headers.filter((h) => !REQUIRED_COLUMNS.includes(h))).map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h.replace(/_/g, " ")}</th>
                    ))}
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 50).map((row, i) => (
                    <tr key={i} className={`border-b border-border/50 ${validationErrors[i] ? "bg-red-500/5" : ""}`}>
                      <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                      {REQUIRED_COLUMNS.concat(headers.filter((h) => !REQUIRED_COLUMNS.includes(h))).map((h) => (
                        <td key={h} className="px-3 py-2 truncate max-w-[200px]">{row[h] || "—"}</td>
                      ))}
                      <td className="px-3 py-2">
                        {validationErrors[i] ? (
                          <span className="text-red-400 flex items-center gap-1"><XIcon size={10} /> Error</span>
                        ) : (
                          <span className="text-green-400 flex items-center gap-1"><CheckCircleIcon size={10} /> Valid</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 50 && <p className="text-xs text-muted-foreground text-center py-2">Showing first 50 of {rows.length} rows</p>}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button onClick={reset} className="rounded-lg border border-border px-6 py-3 text-sm font-medium hover:bg-muted/30 transition-colors">
              Cancel
            </button>
            <button onClick={handleImport} disabled={validCount === 0} className="rounded-lg bg-primary px-8 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 transition-colors">
              <UploadIcon size={14} /> Import {validCount} Device{validCount !== 1 ? "s" : ""}
            </button>
          </div>
        </div>
      )}

      {/* Importing Step */}
      {step === "importing" && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <LoaderIcon size={32} className="animate-spin text-primary" />
          <p className="text-sm font-medium">Importing devices...</p>
          <div className="w-64 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">{progress}% complete</p>
        </div>
      )}

      {/* Done Step */}
      {step === "done" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-6 text-center">
            <CheckCircleIcon size={40} className="text-green-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold">Import Complete</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {importResult.success} device{importResult.success !== 1 ? "s" : ""} imported successfully
              {importResult.failed > 0 && `, ${importResult.failed} failed`}
            </p>
          </div>

          {importResult.errors.length > 0 && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <h3 className="text-sm font-medium text-red-400 mb-2">Failed Rows</h3>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {importResult.errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-400">SN: {e.row} — {e.error}</p>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button onClick={reset} className="rounded-lg border border-border px-6 py-3 text-sm font-medium hover:bg-muted/30 transition-colors">
              Import More
            </button>
            <button onClick={() => router.push("/devices")} className="rounded-lg bg-primary px-8 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              View All Devices
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
