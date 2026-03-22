"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  ShoppingCartIcon, PlusIcon, SearchIcon, PencilIcon, TrashIcon, XIcon,
  PackageIcon, TruckIcon, CheckCircleIcon, ClockIcon, DownloadIcon,
  MailIcon, PhoneIcon,
} from "lucide-react";

const ORDER_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"];
const PAYMENT_STATUSES = ["unpaid", "paid", "refunded", "partial"];

const STATUS_COLORS = {
  pending: "bg-amber-500/20 text-amber-400", confirmed: "bg-blue-500/20 text-blue-400",
  processing: "bg-purple-500/20 text-purple-400", shipped: "bg-cyan-500/20 text-cyan-400",
  delivered: "bg-emerald-500/20 text-emerald-400", cancelled: "bg-red-500/20 text-red-400",
  refunded: "bg-zinc-500/20 text-zinc-400",
};

const PAY_COLORS = { unpaid: "bg-red-500/20 text-red-400", paid: "bg-emerald-500/20 text-emerald-400", refunded: "bg-zinc-500/20 text-zinc-400", partial: "bg-amber-500/20 text-amber-400" };

function fmtPrice(n, c = "INR") { return new Intl.NumberFormat("en-IN", { style: "currency", currency: c }).format(n || 0); }

const EMPTY = { order_number: "", customer_name: "", customer_email: "", customer_phone: "", total_amount: "", currency: "INR", status: "pending", payment_status: "unpaid", items: [], shipping_address: "", tracking_number: "", notes: "", order_date: new Date().toISOString().split("T")[0] };

export default function Orders() {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState("add");
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [viewOrder, setViewOrder] = useState(null);

  useEffect(() => { supabase.auth.getUser().then(({ data }) => { if (data.user) setUser(data.user); }); }, []);
  useEffect(() => { if (user) load(); }, [user]);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("shopify_orders").select("*").eq("user_id", user.id).order("order_date", { ascending: false });
    if (data) setOrders(data);
    setLoading(false);
  }

  function openAdd() { setDrawerMode("add"); setEditId(null); setForm({ ...EMPTY, order_number: `ORD-${Date.now().toString().slice(-6)}` }); setDrawerOpen(true); setError(""); }
  function openEdit(o) { setDrawerMode("edit"); setEditId(o.id); setForm({ ...EMPTY, ...o, total_amount: o.total_amount || "", order_date: o.order_date?.split("T")[0] || "" }); setDrawerOpen(true); setError(""); }

  async function handleSave() {
    if (!form.order_number.trim() || !user) return;
    setSaving(true); setError("");
    const payload = { ...form, total_amount: Number(form.total_amount) || 0, updated_at: new Date().toISOString() };
    delete payload.id; delete payload.created_at; delete payload.user_id;
    if (drawerMode === "add") {
      const { error: e } = await supabase.from("shopify_orders").insert({ ...payload, user_id: user.id });
      if (e) setError(e.message);
    } else {
      const { error: e } = await supabase.from("shopify_orders").update(payload).eq("id", editId);
      if (e) setError(e.message);
    }
    setSaving(false);
    if (!error) { setDrawerOpen(false); load(); }
  }

  async function updateStatus(id, status) {
    await supabase.from("shopify_orders").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status } : o));
  }

  async function handleDelete(id) { if (!confirm("Delete order?")) return; await supabase.from("shopify_orders").delete().eq("id", id); load(); }

  function exportCSV() {
    const headers = ["Order #", "Customer", "Email", "Amount", "Status", "Payment", "Date", "Tracking"];
    const rows = orders.map((o) => [o.order_number, o.customer_name, o.customer_email, o.total_amount, o.status, o.payment_status, o.order_date, o.tracking_number]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = `orders-${new Date().toISOString().split("T")[0]}.csv`; a.click();
  }

  const filtered = orders.filter((o) => {
    if (search) { const s = search.toLowerCase(); if (!o.order_number.toLowerCase().includes(s) && !o.customer_name?.toLowerCase().includes(s) && !o.customer_email?.toLowerCase().includes(s)) return false; }
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    return true;
  });

  const totalRevenue = orders.filter((o) => o.payment_status === "paid").reduce((s, o) => s + (o.total_amount || 0), 0);
  const statusCounts = {};
  ORDER_STATUSES.forEach((s) => statusCounts[s] = orders.filter((o) => o.status === s).length);

  if (loading) return <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">Loading...</div>;

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><ShoppingCartIcon size={24} className="text-blue-400" /> Order Tracker</h1>
          <p className="text-muted-foreground mt-1">{orders.length} orders · {fmtPrice(totalRevenue)} revenue</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="rounded-md border border-border p-2 hover:bg-muted/50"><DownloadIcon size={14} /></button>
          <button onClick={openAdd} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 flex items-center gap-2"><PlusIcon size={16} /> Add Order</button>
        </div>
      </div>

      {/* Status pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setStatusFilter("all")} className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${statusFilter === "all" ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground"}`}>All ({orders.length})</button>
        {ORDER_STATUSES.map((s) => (
          <button key={s} onClick={() => setStatusFilter(statusFilter === s ? "all" : s)} className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${statusFilter === s ? STATUS_COLORS[s] + " border-current" : "border-border text-muted-foreground"}`}>{s} ({statusCounts[s] || 0})</button>
        ))}
      </div>

      <div className="relative">
        <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input type="text" placeholder="Search by order #, customer, or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
      </div>

      {/* Orders table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-[100px_1fr_100px_100px_100px_100px_60px] gap-2 px-4 py-2.5 border-b border-border text-xs text-muted-foreground font-medium">
          <span>Order #</span><span>Customer</span><span className="text-right">Amount</span><span>Status</span><span>Payment</span><span>Date</span><span className="text-right">Actions</span>
        </div>
        {filtered.length === 0 ? <div className="text-center py-8 text-sm text-muted-foreground">No orders found.</div> : filtered.map((o, i) => (
          <div key={o.id} onClick={() => setViewOrder(o)} className={`grid grid-cols-[100px_1fr_100px_100px_100px_100px_60px] gap-2 px-4 py-3 items-center cursor-pointer hover:bg-muted/20 transition-colors ${i < filtered.length - 1 ? "border-b border-border/50" : ""}`}>
            <span className="text-sm font-mono font-medium">{o.order_number}</span>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{o.customer_name || "—"}</p>
              <p className="text-xs text-muted-foreground truncate">{o.customer_email || ""}</p>
            </div>
            <span className="text-sm font-medium text-right">{fmtPrice(o.total_amount, o.currency)}</span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded w-fit ${STATUS_COLORS[o.status]}`}>{o.status}</span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded w-fit ${PAY_COLORS[o.payment_status]}`}>{o.payment_status}</span>
            <span className="text-xs text-muted-foreground">{o.order_date ? new Date(o.order_date).toLocaleDateString() : "—"}</span>
            <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => openEdit(o)} className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-accent"><PencilIcon size={12} /></button>
              <button onClick={() => handleDelete(o.id)} className="p-1 text-muted-foreground hover:text-red-500 rounded hover:bg-red-500/10"><TrashIcon size={12} /></button>
            </div>
          </div>
        ))}
      </div>

      {/* View Order Drawer */}
      {viewOrder && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setViewOrder(null)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-card border-l border-border z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h2 className="text-lg font-semibold font-mono">{viewOrder.order_number}</h2>
                <div className="flex gap-2 mt-1">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${STATUS_COLORS[viewOrder.status]}`}>{viewOrder.status}</span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${PAY_COLORS[viewOrder.payment_status]}`}>{viewOrder.payment_status}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { openEdit(viewOrder); setViewOrder(null); }} className="p-1.5 text-muted-foreground hover:text-foreground rounded hover:bg-accent"><PencilIcon size={14} /></button>
                <button onClick={() => setViewOrder(null)} className="p-1.5 text-muted-foreground hover:text-foreground rounded hover:bg-accent"><XIcon size={16} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="rounded-lg border border-border p-4 text-center">
                <p className="text-xs text-muted-foreground">Total Amount</p>
                <p className="text-3xl font-bold text-primary">{fmtPrice(viewOrder.total_amount, viewOrder.currency)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Customer</p>
                  <p className="text-sm font-medium">{viewOrder.customer_name || "—"}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Order Date</p>
                  <p className="text-sm font-medium">{viewOrder.order_date ? new Date(viewOrder.order_date).toLocaleDateString() : "—"}</p>
                </div>
                {viewOrder.customer_email && <a href={`mailto:${viewOrder.customer_email}`} className="rounded-lg border border-border p-3 hover:bg-muted/30"><p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><MailIcon size={10} /> Email</p><p className="text-sm font-medium truncate">{viewOrder.customer_email}</p></a>}
                {viewOrder.customer_phone && <a href={`tel:${viewOrder.customer_phone}`} className="rounded-lg border border-border p-3 hover:bg-muted/30"><p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><PhoneIcon size={10} /> Phone</p><p className="text-sm font-medium">{viewOrder.customer_phone}</p></a>}
              </div>
              {viewOrder.shipping_address && <div className="rounded-lg border border-border p-3"><p className="text-[10px] text-muted-foreground mb-1">Shipping Address</p><p className="text-sm">{viewOrder.shipping_address}</p></div>}
              {viewOrder.tracking_number && <div className="rounded-lg border border-border p-3"><p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><TruckIcon size={10} /> Tracking</p><p className="text-sm font-mono">{viewOrder.tracking_number}</p></div>}
              {viewOrder.notes && <div className="rounded-lg border border-border p-3"><p className="text-[10px] text-muted-foreground mb-1">Notes</p><p className="text-sm text-muted-foreground">{viewOrder.notes}</p></div>}
              <div>
                <p className="text-xs font-medium mb-2">Update Status</p>
                <div className="flex flex-wrap gap-1.5">
                  {ORDER_STATUSES.map((s) => (
                    <button key={s} onClick={() => { updateStatus(viewOrder.id, s); setViewOrder({ ...viewOrder, status: s }); }} className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${viewOrder.status === s ? STATUS_COLORS[s] + " border-current" : "border-border text-muted-foreground hover:text-foreground"}`}>{s}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add/Edit Drawer */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setDrawerOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-card border-l border-border z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-semibold">{drawerMode === "add" ? "Add Order" : "Edit Order"}</h2>
              <button onClick={() => setDrawerOpen(false)} className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-accent"><XIcon size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {error && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">{error}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium mb-1.5 block">Order # *</label><input type="text" value={form.order_number} onChange={(e) => setForm({ ...form, order_number: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" /></div>
                <div><label className="text-xs font-medium mb-1.5 block">Order Date</label><input type="date" value={form.order_date} onChange={(e) => setForm({ ...form, order_date: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" /></div>
              </div>
              <div><label className="text-xs font-medium mb-1.5 block">Customer Name</label><input type="text" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium mb-1.5 block">Email</label><input type="email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" /></div>
                <div><label className="text-xs font-medium mb-1.5 block">Phone</label><input type="tel" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium mb-1.5 block">Total Amount</label><input type="number" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" /></div>
                <div><label className="text-xs font-medium mb-1.5 block">Currency</label><select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"><option value="INR">INR</option><option value="USD">USD</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium mb-1.5 block">Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">{ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
                <div><label className="text-xs font-medium mb-1.5 block">Payment</label><select value={form.payment_status} onChange={(e) => setForm({ ...form, payment_status: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">{PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
              </div>
              <div><label className="text-xs font-medium mb-1.5 block">Shipping Address</label><textarea value={form.shipping_address} onChange={(e) => setForm({ ...form, shipping_address: e.target.value })} rows={2} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40" /></div>
              <div><label className="text-xs font-medium mb-1.5 block">Tracking Number</label><input type="text" value={form.tracking_number} onChange={(e) => setForm({ ...form, tracking_number: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" /></div>
              <div><label className="text-xs font-medium mb-1.5 block">Notes</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40" /></div>
            </div>
            <div className="p-5 border-t border-border flex gap-2">
              <button onClick={handleSave} disabled={!form.order_number.trim() || saving} className="flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">{saving ? "Saving..." : drawerMode === "add" ? "Add Order" : "Save Changes"}</button>
              <button onClick={() => setDrawerOpen(false)} className="rounded-md border border-border px-4 py-2.5 text-sm hover:bg-accent">Cancel</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
