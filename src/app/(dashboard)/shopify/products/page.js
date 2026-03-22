"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  PackageIcon, PlusIcon, SearchIcon, PencilIcon, TrashIcon, XIcon,
  LayoutGridIcon, ListIcon, ExternalLinkIcon, DownloadIcon,
  TagIcon, BoxIcon,
} from "lucide-react";

const STATUS_COLORS = {
  active: "bg-emerald-500/20 text-emerald-400",
  draft: "bg-zinc-500/20 text-zinc-400",
  archived: "bg-red-500/20 text-red-400",
};

function fmtPrice(n, c = "INR") { return new Intl.NumberFormat("en-IN", { style: "currency", currency: c }).format(n || 0); }

const EMPTY = { product_name: "", sku: "", price: "", compare_at_price: "", currency: "INR", category: "", status: "active", inventory_count: "", vendor: "", product_type: "", image_url: "", description: "", tags: [], shopify_url: "" };

export default function Products() {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [view, setView] = useState("list");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState("add");
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tagInput, setTagInput] = useState("");

  useEffect(() => { supabase.auth.getUser().then(({ data }) => { if (data.user) setUser(data.user); }); }, []);

  useEffect(() => { if (user) load(); }, [user]);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("shopify_products").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (data) setProducts(data);
    setLoading(false);
  }

  function openAdd() { setDrawerMode("add"); setEditId(null); setForm(EMPTY); setDrawerOpen(true); setError(""); }
  function openEdit(p) { setDrawerMode("edit"); setEditId(p.id); setForm({ ...EMPTY, ...p, price: p.price || "", compare_at_price: p.compare_at_price || "", inventory_count: p.inventory_count || "" }); setDrawerOpen(true); setError(""); }

  async function handleSave() {
    if (!form.product_name.trim() || !user) return;
    setSaving(true); setError("");
    const payload = { ...form, price: Number(form.price) || 0, compare_at_price: Number(form.compare_at_price) || 0, inventory_count: Number(form.inventory_count) || 0, updated_at: new Date().toISOString() };
    delete payload.id; delete payload.created_at; delete payload.user_id;
    if (drawerMode === "add") {
      const { error: e } = await supabase.from("shopify_products").insert({ ...payload, user_id: user.id });
      if (e) setError(e.message);
    } else {
      const { error: e } = await supabase.from("shopify_products").update(payload).eq("id", editId);
      if (e) setError(e.message);
    }
    setSaving(false);
    if (!error) { setDrawerOpen(false); load(); }
  }

  async function handleDelete(id) { if (!confirm("Delete product?")) return; await supabase.from("shopify_products").delete().eq("id", id); load(); }

  function addTag() { if (tagInput.trim() && !form.tags.includes(tagInput.trim())) { setForm({ ...form, tags: [...form.tags, tagInput.trim()] }); setTagInput(""); } }

  function exportCSV() {
    const headers = ["Name", "SKU", "Price", "Status", "Inventory", "Vendor", "Category", "Type"];
    const rows = products.map((p) => [p.product_name, p.sku, p.price, p.status, p.inventory_count, p.vendor, p.category, p.product_type]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = `products-${new Date().toISOString().split("T")[0]}.csv`; a.click();
  }

  const filtered = products.filter((p) => {
    if (search) { const s = search.toLowerCase(); if (!p.product_name.toLowerCase().includes(s) && !p.sku?.toLowerCase().includes(s) && !p.vendor?.toLowerCase().includes(s)) return false; }
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    return true;
  });

  const totalValue = products.reduce((s, p) => s + (p.price || 0) * (p.inventory_count || 0), 0);

  if (loading) return <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">Loading...</div>;

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><PackageIcon size={24} className="text-emerald-400" /> Product Catalog</h1>
          <p className="text-muted-foreground mt-1">{products.length} products · {fmtPrice(totalValue)} inventory value</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="rounded-md border border-border p-2 hover:bg-muted/50" title="Export CSV"><DownloadIcon size={14} /></button>
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button onClick={() => setView("grid")} className={`p-2 ${view === "grid" ? "bg-primary/20 text-primary" : "text-muted-foreground"}`}><LayoutGridIcon size={16} /></button>
            <button onClick={() => setView("list")} className={`p-2 ${view === "list" ? "bg-primary/20 text-primary" : "text-muted-foreground"}`}><ListIcon size={16} /></button>
          </div>
          <button onClick={openAdd} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 flex items-center gap-2"><PlusIcon size={16} /> Add Product</button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search by name, SKU, or vendor..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-md border border-border bg-card px-3 py-2 text-xs outline-none">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {view === "grid" ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <div key={p.id} className="rounded-xl border border-border bg-card p-5 flex flex-col">
              {p.image_url && <img src={p.image_url} alt={p.product_name} className="w-full h-40 object-cover rounded-lg mb-3" />}
              <div className="flex items-start justify-between mb-2">
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${STATUS_COLORS[p.status]}`}>{p.status}</span>
                {p.sku && <span className="text-[10px] text-muted-foreground font-mono">{p.sku}</span>}
              </div>
              <h3 className="text-sm font-semibold mb-1">{p.product_name}</h3>
              <p className="text-lg font-bold text-primary">{fmtPrice(p.price, p.currency)}</p>
              {p.compare_at_price > 0 && <p className="text-xs text-muted-foreground line-through">{fmtPrice(p.compare_at_price, p.currency)}</p>}
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span><BoxIcon size={10} className="inline mr-1" />{p.inventory_count} in stock</span>
                {p.vendor && <span>{p.vendor}</span>}
              </div>
              <div className="flex gap-1 mt-auto pt-3 border-t border-border/50">
                <button onClick={() => openEdit(p)} className="p-1.5 text-muted-foreground hover:text-foreground rounded hover:bg-accent"><PencilIcon size={12} /></button>
                <button onClick={() => handleDelete(p.id)} className="p-1.5 text-muted-foreground hover:text-red-500 rounded hover:bg-red-500/10 ml-auto"><TrashIcon size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-[1fr_80px_80px_80px_80px_60px] gap-2 px-4 py-2.5 border-b border-border text-xs text-muted-foreground font-medium">
            <span>Product</span><span className="text-right">Price</span><span className="text-right">Stock</span><span>Status</span><span>Vendor</span><span className="text-right">Actions</span>
          </div>
          {filtered.length === 0 ? <div className="text-center py-8 text-sm text-muted-foreground">No products found.</div> : filtered.map((p, i) => (
            <div key={p.id} className={`grid grid-cols-[1fr_80px_80px_80px_80px_60px] gap-2 px-4 py-3 items-center hover:bg-muted/20 transition-colors ${i < filtered.length - 1 ? "border-b border-border/50" : ""}`}>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{p.product_name}</p>
                <p className="text-xs text-muted-foreground truncate">{p.sku || p.category || ""}</p>
              </div>
              <span className="text-sm font-medium text-right">{fmtPrice(p.price, p.currency)}</span>
              <span className={`text-xs text-right ${p.inventory_count <= 0 ? "text-red-400" : p.inventory_count <= 5 ? "text-amber-400" : ""}`}>{p.inventory_count}</span>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded w-fit ${STATUS_COLORS[p.status]}`}>{p.status}</span>
              <span className="text-xs text-muted-foreground truncate">{p.vendor || "—"}</span>
              <div className="flex gap-1 justify-end">
                <button onClick={() => openEdit(p)} className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-accent"><PencilIcon size={12} /></button>
                <button onClick={() => handleDelete(p.id)} className="p-1 text-muted-foreground hover:text-red-500 rounded hover:bg-red-500/10"><TrashIcon size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setDrawerOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-card border-l border-border z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-semibold">{drawerMode === "add" ? "Add Product" : "Edit Product"}</h2>
              <button onClick={() => setDrawerOpen(false)} className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-accent"><XIcon size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {error && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">{error}</div>}
              <div><label className="text-xs font-medium mb-1.5 block">Product Name *</label><input type="text" value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} autoFocus className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium mb-1.5 block">SKU</label><input type="text" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" /></div>
                <div><label className="text-xs font-medium mb-1.5 block">Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"><option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option></select></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-xs font-medium mb-1.5 block">Price</label><input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" /></div>
                <div><label className="text-xs font-medium mb-1.5 block">Compare At</label><input type="number" value={form.compare_at_price} onChange={(e) => setForm({ ...form, compare_at_price: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" /></div>
                <div><label className="text-xs font-medium mb-1.5 block">Currency</label><select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"><option value="INR">INR</option><option value="USD">USD</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium mb-1.5 block">Inventory</label><input type="number" value={form.inventory_count} onChange={(e) => setForm({ ...form, inventory_count: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" /></div>
                <div><label className="text-xs font-medium mb-1.5 block">Vendor</label><input type="text" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium mb-1.5 block">Category</label><input type="text" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" /></div>
                <div><label className="text-xs font-medium mb-1.5 block">Product Type</label><input type="text" value={form.product_type} onChange={(e) => setForm({ ...form, product_type: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" /></div>
              </div>
              <div><label className="text-xs font-medium mb-1.5 block">Image URL</label><input type="text" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" /></div>
              <div><label className="text-xs font-medium mb-1.5 block">Shopify URL</label><input type="text" value={form.shopify_url} onChange={(e) => setForm({ ...form, shopify_url: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" /></div>
              <div><label className="text-xs font-medium mb-1.5 block">Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40" /></div>
              <div>
                <label className="text-xs font-medium mb-1.5 block">Tags</label>
                <div className="flex gap-1 flex-wrap mb-2">{(form.tags || []).map((t) => <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">{t}<button onClick={() => setForm({ ...form, tags: form.tags.filter((x) => x !== t) })}><XIcon size={8} /></button></span>)}</div>
                <div className="flex gap-2"><input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} placeholder="Add tag..." className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none" /><button onClick={addTag} className="text-xs bg-muted px-3 py-1.5 rounded-md">Add</button></div>
              </div>
            </div>
            <div className="p-5 border-t border-border flex gap-2">
              <button onClick={handleSave} disabled={!form.product_name.trim() || saving} className="flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">{saving ? "Saving..." : drawerMode === "add" ? "Add Product" : "Save Changes"}</button>
              <button onClick={() => setDrawerOpen(false)} className="rounded-md border border-border px-4 py-2.5 text-sm hover:bg-accent">Cancel</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
