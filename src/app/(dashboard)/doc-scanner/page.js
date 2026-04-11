"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { CURRENCIES } from "@/lib/doc-scanner";
import {
  ScanLineIcon,
  UploadIcon,
  SearchIcon,
  XIcon,
  FileTextIcon,
  ImageIcon,
  Loader2Icon,
  CheckCircle2Icon,
  AlertCircleIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ArrowUpDownIcon,
  DownloadIcon,
  RotateCcwIcon,
  Trash2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  SaveIcon,
  EyeIcon,
} from "lucide-react";

const STATUS_BADGE = {
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  processing: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  completed: "bg-green-500/10 text-green-400 border-green-500/20",
  failed: "bg-red-500/10 text-red-400 border-red-500/20",
};

const DOC_TYPE_LABEL = {
  receipt: "Receipt",
  invoice: "Invoice",
  bank_statement: "Bank Statement",
  other: "Other",
};

export default function DocScannerPage() {
  // Data
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [loading, setLoading] = useState(true);

  // Projects & clients (from Basecamp)
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Sort
  const [sortCol, setSortCol] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");

  // Upload
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState([]); // {file, status, id, error}
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Detail drawer
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editField, setEditField] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [showRawText, setShowRawText] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Search debounce
  const debounceRef = useRef(null);

  // --- Load data ---
  const loadDocuments = useCallback(async (searchQuery) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (categoryFilter) params.set("category", categoryFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (projectFilter) params.set("project", projectFilter);
      if (clientFilter) params.set("client", clientFilter);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);

      const res = await apiFetch(`/api/doc-scanner/documents?${params}`);
      const json = await res.json();
      setDocuments(json.documents || []);
    } catch (err) {
      console.error("Load error:", err);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, statusFilter, projectFilter, clientFilter, dateFrom, dateTo]);

  useEffect(() => {
    loadDocuments(search);
  }, [categoryFilter, statusFilter, projectFilter, clientFilter, dateFrom, dateTo]);

  useEffect(() => {
    apiFetch("/api/doc-scanner/categories").then((r) => r.json()).then((j) => setCategories(j.categories || []));
    apiFetch("/api/doc-scanner/custom-fields").then((r) => r.json()).then((j) => setCustomFields(j.fields || []));
    // Load Basecamp projects and clients for dropdowns
    apiFetch("/api/basecamp/projects").then((r) => r.json()).then((j) => setProjects(j.projects || [])).catch(() => {});
    apiFetch("/api/basecamp/people").then((r) => r.json()).then((j) => {
      const people = (j.people || []).filter((p) => p.personable_type === "Client");
      const unique = [...new Set(people.map((p) => p.company_name).filter(Boolean))].sort();
      setClients(unique);
    }).catch(() => {});
  }, []);

  // Debounced search
  function handleSearchChange(val) {
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadDocuments(val), 300);
  }

  // --- Sort ---
  function handleSort(col) {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("asc"); }
  }

  const sorted = [...documents].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    const av = a[sortCol] ?? "";
    const bv = b[sortCol] ?? "";
    if (sortCol === "total" || sortCol === "subtotal") return dir * ((Number(av) || 0) - (Number(bv) || 0));
    return dir * String(av).localeCompare(String(bv));
  });

  // --- Upload ---
  async function handleFiles(files) {
    const items = Array.from(files).map((f) => ({ file: f, status: "pending", id: null, error: null }));
    setUploadQueue((prev) => [...prev, ...items]);
    setShowUpload(true);
    setUploading(true);

    for (const item of items) {
      item.status = "uploading";
      setUploadQueue((prev) => [...prev]);

      try {
        const formData = new FormData();
        formData.append("file", item.file);
        const res = await apiFetch("/api/doc-scanner/upload", { method: "POST", body: formData });
        const json = await res.json();

        if (!res.ok) throw new Error(json.error || "Upload failed");

        item.id = json.id;
        item.status = "processing";
        setUploadQueue((prev) => [...prev]);

        // Trigger processing (don't await — let it run)
        apiFetch("/api/doc-scanner/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId: json.id }),
        }).then(() => {
          item.status = "done";
          setUploadQueue((prev) => [...prev]);
          loadDocuments(search);
        }).catch((err) => {
          item.status = "error";
          item.error = err.message;
          setUploadQueue((prev) => [...prev]);
          loadDocuments(search);
        });
      } catch (err) {
        item.status = "error";
        item.error = err.message;
        setUploadQueue((prev) => [...prev]);
      }
    }
    setUploading(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  }

  // --- Detail drawer ---
  async function openDetail(doc) {
    setSelected(doc);
    setEditField(null);
    setShowRawText(false);
    setDetailLoading(true);
    // Revoke previous blob URL
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    try {
      const [docRes, fileRes] = await Promise.all([
        apiFetch(`/api/doc-scanner/documents/${doc.id}`),
        apiFetch(`/api/doc-scanner/documents/${doc.id}/file`),
      ]);
      const full = await docRes.json();
      setSelected(full);
      if (fileRes.ok) {
        const blob = await fileRes.blob();
        setPreviewUrl(URL.createObjectURL(blob));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  }

  async function saveField(field, value) {
    if (!selected) return;
    const update = { [field]: value };
    // When saving project_name, also save project_id
    if (field === "project_name") {
      const proj = projects.find((p) => p.name === value);
      update.project_id = proj?.id?.toString() || null;
    }
    await apiFetch(`/api/doc-scanner/documents/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });
    setSelected((prev) => ({ ...prev, ...update }));
    setDocuments((prev) => prev.map((d) => (d.id === selected.id ? { ...d, ...update } : d)));
    setEditField(null);
  }

  async function handleReprocess() {
    if (!selected) return;
    setDetailLoading(true);
    await apiFetch("/api/doc-scanner/reprocess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: selected.id }),
    });
    await loadDocuments(search);
    const res = await apiFetch(`/api/doc-scanner/documents/${selected.id}`);
    setSelected(await res.json());
    setDetailLoading(false);
  }

  async function handleDelete() {
    if (!selected || !confirm("Delete this document permanently?")) return;
    await apiFetch("/api/doc-scanner/documents", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selected.id }),
    });
    setSelected(null);
    loadDocuments(search);
  }

  // --- CSV export ---
  function exportCSV() {
    const baseHeaders = ["File", "Type", "Vendor", "Date", "Category", "Project", "Client", "Subtotal", "Tax", "GST", "Total", "Currency", "Notes"];
    const cfHeaders = customFields.map((f) => f.field_name);
    const headers = [...baseHeaders, ...cfHeaders];

    const rows = sorted.map((d) => {
      const base = [d.file_name, d.document_type, d.vendor, d.document_date, d.category, d.project_name, d.client_name, d.subtotal, d.tax, d.gst, d.total, d.currency, d.notes];
      const cf = customFields.map((f) => d.custom_fields?.[f.field_key] || "");
      return [...base, ...cf];
    });

    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `expenses-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  async function exportWithLinks() {
    const ids = sorted.map((d) => d.id);
    const res = await apiFetch("/api/doc-scanner/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentIds: ids }),
    });
    if (!res.ok) return alert("Export failed");
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `expenses-with-links-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  // --- Helpers ---
  const totalAmount = sorted.reduce((sum, d) => sum + (Number(d.total) || 0), 0);
  const completedCount = documents.filter((d) => d.status === "completed").length;

  const SortButton = ({ label, col }) => (
    <button onClick={() => handleSort(col)} className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
      {label}
      {sortCol === col ? (sortDir === "asc" ? <ChevronUpIcon size={12} /> : <ChevronDownIcon size={12} />) : <ArrowUpDownIcon size={11} className="opacity-40" />}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <ScanLineIcon className="h-5 w-5 text-muted-foreground" />
            Track every expense effortlessly
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Log expenses with receipts, categorize by vendor, and see where your money goes.
            {documents.length > 0 && <> &middot; {documents.length} expense{documents.length !== 1 ? "s" : ""} &middot; {completedCount} processed</>}
            {totalAmount > 0 && <> &middot; Total: <span className="font-mono font-medium text-foreground">{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="text-xs border border-border text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5">
            <DownloadIcon size={13} /> CSV
          </button>
          <button onClick={exportWithLinks} className="text-xs border border-border text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5">
            <DownloadIcon size={13} /> CSV + Links
          </button>
          <button onClick={() => { setShowUpload(true); setUploadQueue([]); }} className="text-xs bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5">
            <UploadIcon size={13} /> Upload
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-[360px]">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search documents..."
            className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
          />
          {search && (
            <button onClick={() => { setSearch(""); loadDocuments(""); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <XIcon size={14} />
            </button>
          )}
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-md border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/60">
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="rounded-md border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/60">
          <option value="">All Projects</option>
          {projects.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
        </select>
        <select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className="rounded-md border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/60">
          <option value="">All Clients</option>
          {clients.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-md border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/60">
          <option value="">All Status</option>
          <option value="completed">Completed</option>
          <option value="processing">Processing</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/60" />
        <span className="text-xs text-muted-foreground">to</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/60" />
      </div>

      {/* Data table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_120px_100px_110px_110px_100px_90px_80px] gap-2 px-4 py-2.5 border-b border-border bg-muted/30">
          <SortButton label="Document" col="file_name" />
          <SortButton label="Vendor" col="vendor" />
          <SortButton label="Date" col="document_date" />
          <SortButton label="Project" col="project_name" />
          <SortButton label="Client" col="client_name" />
          <SortButton label="Category" col="category" />
          <SortButton label="Total" col="total" />
          <SortButton label="Status" col="status" />
        </div>

        {/* Rows */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2Icon className="h-5 w-5 animate-spin mr-2" /> Loading...
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ScanLineIcon className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">No expenses yet</p>
            <p className="text-xs mt-1">Upload receipts by drag & drop to start tracking expenses</p>
          </div>
        ) : (
          sorted.map((doc) => (
            <button
              key={doc.id}
              onClick={() => openDetail(doc)}
              className={`w-full grid grid-cols-[1fr_120px_100px_110px_110px_100px_90px_80px] gap-2 px-4 py-2.5 border-b border-border/50 hover:bg-muted/30 transition-colors text-left ${selected?.id === doc.id ? "bg-muted/40" : ""}`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded bg-muted/50 flex items-center justify-center shrink-0">
                  {doc.file_type?.startsWith("image/") ? <ImageIcon size={14} className="text-muted-foreground" /> : <FileTextIcon size={14} className="text-muted-foreground" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm truncate">{doc.file_name}</p>
                  <p className="text-[10px] text-muted-foreground">{DOC_TYPE_LABEL[doc.document_type] || doc.document_type}</p>
                </div>
              </div>
              <div className="flex items-center">
                <p className="text-sm truncate">{doc.vendor || "—"}</p>
              </div>
              <div className="flex items-center">
                <p className="text-xs text-muted-foreground font-mono">{doc.document_date || "—"}</p>
              </div>
              <div className="flex items-center">
                <p className="text-xs truncate">{doc.project_name || "—"}</p>
              </div>
              <div className="flex items-center">
                <p className="text-xs truncate">{doc.client_name || "—"}</p>
              </div>
              <div className="flex items-center">
                {doc.category ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full border" style={{ borderColor: categories.find((c) => c.name === doc.category)?.color || "#6b7280", color: categories.find((c) => c.name === doc.category)?.color || "#6b7280" }}>
                    {doc.category}
                  </span>
                ) : <span className="text-xs text-muted-foreground">—</span>}
              </div>
              <div className="flex items-center">
                {doc.total != null ? (
                  <p className="text-xs font-mono font-medium">{doc.currency} {Number(doc.total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                ) : <span className="text-xs text-muted-foreground">—</span>}
              </div>
              <div className="flex items-center">
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_BADGE[doc.status] || ""}`}>
                  {doc.status}
                </span>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={(e) => { if (e.target === e.currentTarget) setShowUpload(false); }}>
          <div className="bg-card border border-border rounded-xl w-full max-w-lg p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Upload Receipts</h2>
              <button onClick={() => setShowUpload(false)} className="text-muted-foreground hover:text-foreground"><XIcon size={16} /></button>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"}`}
            >
              <UploadIcon className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm">Drop receipts here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP, HEIC, PDF — max 10MB each</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
                multiple
                className="hidden"
                onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = ""; }}
              />
            </div>

            {/* Upload queue */}
            {uploadQueue.length > 0 && (
              <div className="mt-4 space-y-2 max-h-[200px] overflow-y-auto">
                {uploadQueue.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-md border border-border/50 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs truncate">{item.file.name}</p>
                      <p className="text-[10px] text-muted-foreground">{(item.file.size / 1024).toFixed(0)} KB</p>
                    </div>
                    {item.status === "uploading" && <Loader2Icon size={14} className="animate-spin text-blue-400 shrink-0" />}
                    {item.status === "processing" && <Loader2Icon size={14} className="animate-spin text-yellow-400 shrink-0" />}
                    {item.status === "done" && <CheckCircle2Icon size={14} className="text-green-400 shrink-0" />}
                    {item.status === "error" && (
                      <span className="text-[10px] text-red-400 shrink-0 max-w-[120px] truncate" title={item.error}>{item.error}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {selected && (
        <div className="fixed inset-y-0 right-0 z-40 w-full max-w-lg bg-card border-l border-border shadow-xl overflow-y-auto">
          <div className="sticky top-0 z-10 bg-card border-b border-border px-5 py-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold truncate">{selected.file_name}</h2>
            <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground"><XIcon size={16} /></button>
          </div>

          {detailLoading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <Loader2Icon className="h-5 w-5 animate-spin mr-2" /> Loading...
            </div>
          ) : (
            <div className="p-5 space-y-5">
              {/* Document preview */}
              <div className="rounded-lg border border-border overflow-hidden bg-muted/20">
                {!previewUrl ? (
                  <div className="flex items-center justify-center py-10 text-muted-foreground">
                    <Loader2Icon className="h-4 w-4 animate-spin mr-2" /> Loading preview...
                  </div>
                ) : selected.file_type?.startsWith("image/") ? (
                  <img
                    src={previewUrl}
                    alt={selected.file_name}
                    className="w-full max-h-[300px] object-contain"
                  />
                ) : (
                  <iframe
                    src={previewUrl}
                    title={selected.file_name}
                    className="w-full h-[300px]"
                  />
                )}
              </div>

              {/* Status + actions */}
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_BADGE[selected.status] || ""}`}>{selected.status}</span>
                {selected.llm_provider && <span className="text-[10px] text-muted-foreground">{selected.llm_provider} / {selected.llm_model}</span>}
                <div className="ml-auto flex items-center gap-1.5">
                  <button onClick={handleReprocess} className="text-xs border border-border text-muted-foreground hover:text-foreground px-2 py-1 rounded transition-colors flex items-center gap-1">
                    <RotateCcwIcon size={11} /> Reprocess
                  </button>
                  <button onClick={handleDelete} className="text-xs border border-red-500/30 text-red-400 hover:text-red-300 px-2 py-1 rounded transition-colors flex items-center gap-1">
                    <Trash2Icon size={11} /> Delete
                  </button>
                </div>
              </div>

              {selected.processing_error && (
                <div className="rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-400">
                  <AlertCircleIcon size={12} className="inline mr-1" /> {selected.processing_error}
                </div>
              )}

              {/* Extracted fields */}
              <div className="space-y-2">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Extracted Data</h3>
                {[
                  { key: "vendor", label: "Vendor" },
                  { key: "document_date", label: "Date" },
                  { key: "document_type", label: "Type" },
                  { key: "project_name", label: "Project" },
                  { key: "client_name", label: "Client" },
                  { key: "subtotal", label: "Subtotal" },
                  { key: "tax", label: "Tax" },
                  { key: "gst", label: "GST" },
                  { key: "total", label: "Total" },
                  { key: "currency", label: "Currency" },
                  { key: "category", label: "Category" },
                  { key: "notes", label: "Notes" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between py-1.5 border-b border-border/30">
                    <span className="text-xs text-muted-foreground w-[90px] shrink-0">{label}</span>
                    {editField === key ? (
                      <div className="flex items-center gap-1 flex-1 ml-2">
                        {key === "project_name" ? (
                          <select
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/60"
                          >
                            <option value="">—</option>
                            {projects.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                          </select>
                        ) : key === "client_name" ? (
                          <select
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/60"
                          >
                            <option value="">—</option>
                            {clients.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        ) : key === "category" ? (
                          <select
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/60"
                          >
                            <option value="">—</option>
                            {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                          </select>
                        ) : key === "currency" ? (
                          <select
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/60"
                          >
                            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        ) : (
                          <input
                            type={["subtotal", "tax", "gst", "total"].includes(key) ? "number" : "text"}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/60"
                            autoFocus
                          />
                        )}
                        <button onClick={() => saveField(key, ["subtotal", "tax", "gst", "total"].includes(key) ? Number(editValue) || null : editValue || null)} className="text-green-400 hover:text-green-300"><SaveIcon size={13} /></button>
                        <button onClick={() => setEditField(null)} className="text-muted-foreground hover:text-foreground"><XIcon size={13} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 flex-1 ml-2 min-w-0">
                        <span className="text-sm truncate flex-1">{selected[key] ?? "—"}</span>
                        <button onClick={() => { setEditField(key); setEditValue(selected[key] ?? ""); }} className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 shrink-0">
                          <PencilIcon size={11} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Line items */}
              {selected.line_items?.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Line Items</h3>
                  <div className="rounded-md border border-border overflow-hidden">
                    <div className="grid grid-cols-[1fr_50px_70px_70px] gap-2 px-3 py-1.5 bg-muted/30 text-[10px] font-medium text-muted-foreground">
                      <span>Item</span><span>Qty</span><span>Price</span><span>Total</span>
                    </div>
                    {selected.line_items.map((item, i) => (
                      <div key={i} className="grid grid-cols-[1fr_50px_70px_70px] gap-2 px-3 py-1.5 border-t border-border/30 text-xs">
                        <span className="truncate">{item.name}</span>
                        <span className="font-mono">{item.quantity ?? "—"}</span>
                        <span className="font-mono">{item.unit_price != null ? Number(item.unit_price).toFixed(2) : "—"}</span>
                        <span className="font-mono">{item.total != null ? Number(item.total).toFixed(2) : "—"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom fields */}
              {customFields.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Custom Fields</h3>
                  {customFields.map((f) => (
                    <div key={f.id} className="flex items-center justify-between py-1.5 border-b border-border/30">
                      <span className="text-xs text-muted-foreground">{f.field_name}</span>
                      <span className="text-sm">{selected.custom_fields?.[f.field_key] || "—"}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Raw text */}
              {selected.raw_text && (
                <div className="space-y-2">
                  <button onClick={() => setShowRawText(!showRawText)} className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                    <EyeIcon size={12} /> Raw Text {showRawText ? "(hide)" : "(show)"}
                  </button>
                  {showRawText && (
                    <pre className="rounded-md border border-border bg-muted/20 p-3 text-xs whitespace-pre-wrap max-h-[300px] overflow-y-auto font-mono">
                      {selected.raw_text}
                    </pre>
                  )}
                </div>
              )}

              {/* Tags */}
              {selected.tags?.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {selected.tags.map((tag) => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
