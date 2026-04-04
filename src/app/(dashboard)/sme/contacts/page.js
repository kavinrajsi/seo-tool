"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import {
  UsersIcon, PlusIcon, PencilIcon, Trash2Icon, XIcon,
  SearchIcon, DownloadIcon, PhoneIcon, MailIcon, GlobeIcon,
  MapPinIcon, CalendarIcon, CheckCircleIcon, ClockIcon,
  ArrowLeftIcon, BuildingIcon, FilterIcon,
} from "lucide-react";

const DISTRICTS = [
  "Chennai","Coimbatore","Tiruppur","Salem","Thiruvallur","Madurai","Krishnagiri",
  "Erode","Tiruchirappalli","Cuddalore","Vellore","Kanchipuram","Thanjavur",
  "Dharmapuri","Chengalpattu","Dindigul","Tiruvannamalai","Kanniyakumari",
  "Tirupathur","Namakkal","Villupuram","Tirunelveli","Virudhunagar","Tuticorin",
  "Pudukkottai","Ranipet","Theni","Ramanathapuram","Sivaganga","Thiruvarur",
  "Tenkasi","Karur","The Nilgiris","Kallakurichi","Mayiladuthurai","Nagapattinam",
  "Ariyalur","Perambalur",
];

const INDUSTRIES = [
  "Agro Processing","Auto Components","Bronze Casting","Bus Body Building","Cashew",
  "Cement","Ceramics","Chemicals","Coir","Cotton Mills","Dairy","Dyeing & Bleaching",
  "Electronics","Engineering","Essential Oils","Fireworks & Crackers","Food Processing",
  "Footwear","Foundry","Fruit Processing","Granite","Handlooms","Healthcare",
  "Heavy Engineering","Home Textiles","IT/ITES","Knitwear & Hosiery","Leather",
  "Limestone","Locks","Logistics","Marine Products","Musical Instruments","Pharma",
  "Port/Logistics","Poultry","Poultry & Eggs","Printing & Packaging","Pumps & Motors",
  "Renewable Energy","Rice Mills","Rubber","Safety Matches","Sago","Sago & Tapioca",
  "Salt","Sericulture","Silk","Silk Sarees","Spices","Steel","Sugar","Tanjore Art",
  "Tea & Coffee","Textiles","Tourism","Transport","Turmeric & Spices",
];

const SERVICES = [
  "B2B SEO","B2B Website","Content SEO","eCommerce SEO","GEO","Google Business",
  "Instagram SMO","International SEO","LinkedIn SMO","Local SEO","Shopify Store",
  "SMO","Technical SEO",
];

const SIZES = ["micro", "small", "medium"];
const STATUSES = ["lead", "contacted", "proposal", "negotiation", "client", "lost"];
const STATUS_COLORS = {
  lead:        "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  contacted:   "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  proposal:    "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20",
  negotiation: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
  client:      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  lost:        "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
};

const EMPTY_FORM = {
  company_name: "", contact_person: "", phone: "", email: "", website: "",
  district: "", address: "", city: "", pincode: "",
  industry: "", business_size: "micro", services_needed: [],
  status: "lead", notes: "", follow_up_date: "", last_contacted: "",
};

export default function SMEContacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedContact, setSelectedContact] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) { setUser(data.user); loadContacts(data.user.id); }
    });
  }, []);

  async function loadContacts(uid) {
    setLoading(true);
    const { data } = await supabase
      .from("sme_contacts")
      .select("*")
      .eq("user_id", uid || user?.id)
      .order("created_at", { ascending: false });
    if (data) setContacts(data);
    setLoading(false);
  }

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(c) {
    setEditingId(c.id);
    setForm({
      company_name: c.company_name || "", contact_person: c.contact_person || "",
      phone: c.phone || "", email: c.email || "", website: c.website || "",
      district: c.district || "", address: c.address || "", city: c.city || "", pincode: c.pincode || "",
      industry: c.industry || "", business_size: c.business_size || "micro",
      services_needed: c.services_needed || [],
      status: c.status || "lead", notes: c.notes || "",
      follow_up_date: c.follow_up_date || "", last_contacted: c.last_contacted || "",
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.company_name.trim()) return;
    setSaving(true);
    const payload = {
      company_name: form.company_name.trim(),
      contact_person: form.contact_person.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      website: form.website.trim() || null,
      district: form.district || null,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      pincode: form.pincode.trim() || null,
      industry: form.industry || null,
      business_size: form.business_size,
      services_needed: form.services_needed.length > 0 ? form.services_needed : null,
      status: form.status,
      notes: form.notes.trim() || null,
      follow_up_date: form.follow_up_date || null,
      last_contacted: form.last_contacted || null,
      updated_at: new Date().toISOString(),
    };
    if (editingId) {
      await supabase.from("sme_contacts").update(payload).eq("id", editingId);
    } else {
      await supabase.from("sme_contacts").insert({ ...payload, user_id: user.id });
    }
    setSaving(false);
    setShowForm(false);
    setSelectedContact(null);
    loadContacts();
  }

  async function handleDelete(id, name) {
    if (!confirm(`Delete "${name}"?`)) return;
    await supabase.from("sme_contacts").delete().eq("id", id);
    if (selectedContact?.id === id) setSelectedContact(null);
    loadContacts();
  }

  async function updateStatus(id, status) {
    await supabase.from("sme_contacts").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    loadContacts();
  }

  function exportCSV() {
    const header = "Company,Contact Person,Phone,Email,Website,District,City,Industry,Size,Services,Status,Follow Up,Last Contacted,Notes";
    const rows = filtered.map(c =>
      [c.company_name, c.contact_person, c.phone, c.email, c.website, c.district, c.city,
       c.industry, c.business_size, (c.services_needed || []).join("; "), c.status,
       c.follow_up_date, c.last_contacted, c.notes?.replace(/,/g, ";")].map(v => `"${v || ""}"`).join(",")
    );
    const csv = header + "\n" + rows.join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `sme-contacts-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  }

  function toggleService(srv) {
    setForm(f => ({
      ...f,
      services_needed: f.services_needed.includes(srv)
        ? f.services_needed.filter(s => s !== srv)
        : [...f.services_needed, srv],
    }));
  }

  const filtered = contacts.filter(c => {
    if (search) {
      const q = search.toLowerCase();
      if (![c.company_name, c.contact_person, c.email, c.phone, c.district, c.industry]
        .some(v => (v || "").toLowerCase().includes(q))) return false;
    }
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (districtFilter !== "all" && c.district !== districtFilter) return false;
    return true;
  });

  const counts = {};
  STATUSES.forEach(s => { counts[s] = contacts.filter(c => c.status === s).length; });

  const inputCls = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60 placeholder:text-muted-foreground";

  if (loading) return <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">Loading...</div>;

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/sme" className="text-muted-foreground hover:text-foreground transition-colors"><ArrowLeftIcon size={18} /></Link>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <UsersIcon size={24} className="text-blue-700 dark:text-blue-400" />
              SME Contacts
            </h1>
          </div>
          <p className="text-muted-foreground text-sm ml-7">{contacts.length} contact{contacts.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="flex items-center gap-1.5 text-xs border border-border px-3 py-2 rounded-md hover:bg-muted/30 transition-colors">
            <DownloadIcon size={14} /> Export
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 text-xs bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md transition-colors">
            <PlusIcon size={14} /> Add Contact
          </button>
        </div>
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setStatusFilter("all")}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${statusFilter === "all" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
          All ({contacts.length})
        </button>
        {STATUSES.map(s => (
          <button key={s} onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors capitalize ${statusFilter === s ? STATUS_COLORS[s] + " border" : "border-border text-muted-foreground hover:text-foreground"}`}>
            {s} ({counts[s] || 0})
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search company, contact, email, district..."
            className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/60" />
        </div>
        <select value={districtFilter} onChange={e => setDistrictFilter(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/60">
          <option value="all">All Districts</option>
          {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Contacts list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <UsersIcon size={28} />
          <p className="text-sm">{contacts.length === 0 ? "No contacts yet. Add your first SME contact." : "No contacts match your filters."}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Company</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Contact</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">District</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Industry</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Follow Up</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground text-xs uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => {
                  const followDays = c.follow_up_date ? Math.ceil((new Date(c.follow_up_date) - new Date(new Date().toDateString())) / 86400000) : null;
                  return (
                    <tr key={c.id} className={`border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer ${i % 2 ? "bg-muted/10" : ""}`}
                      onClick={() => setSelectedContact(c)}>
                      <td className="px-4 py-3">
                        <p className="font-semibold">{c.company_name}</p>
                        <p className="text-[11px] text-muted-foreground capitalize">{c.business_size}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm">{c.contact_person || "—"}</p>
                        {c.phone && <p className="text-[11px] text-muted-foreground">{c.phone}</p>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{c.district || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.industry || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium border capitalize ${STATUS_COLORS[c.status] || ""}`}>{c.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        {c.follow_up_date ? (
                          <span className={`text-xs ${followDays !== null && followDays < 0 ? "text-red-700 dark:text-red-400" : followDays <= 3 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
                            {c.follow_up_date}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(c)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded transition-colors"><PencilIcon size={14} /></button>
                          <button onClick={() => handleDelete(c.id, c.company_name)} className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"><Trash2Icon size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Contact detail drawer */}
      {selectedContact && !showForm && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelectedContact(null)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-card border-l border-border z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <h2 className="text-base font-semibold truncate">{selectedContact.company_name}</h2>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(selectedContact)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"><PencilIcon size={14} /></button>
                <button onClick={() => setSelectedContact(null)} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"><XIcon size={16} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Status */}
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.map(s => (
                  <button key={s} onClick={() => { updateStatus(selectedContact.id, s); setSelectedContact(p => ({ ...p, status: s })); }}
                    className={`text-[11px] px-2.5 py-1 rounded-full border capitalize transition-colors ${selectedContact.status === s ? STATUS_COLORS[s] + " border" : "border-border text-muted-foreground hover:text-foreground"}`}>
                    {s}
                  </button>
                ))}
              </div>

              {/* Contact info */}
              <div className="rounded-xl border border-border overflow-hidden">
                {[
                  { icon: <UsersIcon size={13} />,   label: "Contact Person", value: selectedContact.contact_person },
                  { icon: <PhoneIcon size={13} />,    label: "Phone",          value: selectedContact.phone },
                  { icon: <MailIcon size={13} />,     label: "Email",          value: selectedContact.email },
                  { icon: <GlobeIcon size={13} />,    label: "Website",        value: selectedContact.website },
                  { icon: <MapPinIcon size={13} />,   label: "District",       value: selectedContact.district },
                  { icon: <MapPinIcon size={13} />,   label: "Address",        value: [selectedContact.address, selectedContact.city, selectedContact.pincode].filter(Boolean).join(", ") },
                  { icon: <BuildingIcon size={13} />, label: "Industry",       value: selectedContact.industry },
                  { icon: <BuildingIcon size={13} />, label: "Size",           value: selectedContact.business_size },
                  { icon: <CalendarIcon size={13} />, label: "Follow Up",      value: selectedContact.follow_up_date },
                  { icon: <ClockIcon size={13} />,    label: "Last Contacted", value: selectedContact.last_contacted },
                ].filter(r => r.value).map((row, i, arr) => (
                  <div key={row.label} className={`flex items-center justify-between px-4 py-3 ${i < arr.length - 1 ? "border-b border-border/50" : ""}`}>
                    <span className="text-xs text-muted-foreground flex items-center gap-2">{row.icon} {row.label}</span>
                    <span className="text-xs font-medium text-right max-w-[200px] truncate">{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Services */}
              {selectedContact.services_needed?.length > 0 && (
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">Services Needed</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedContact.services_needed.map(s => (
                      <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 font-medium">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedContact.notes && (
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">Notes</p>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{selectedContact.notes}</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Add/Edit drawer */}
      {showForm && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowForm(false)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-card border-l border-border z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <h2 className="text-base font-semibold">{editingId ? "Edit Contact" : "Add Contact"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"><XIcon size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Basic */}
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Basic Info</p>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Company Name *</label>
                <input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} placeholder="Company name" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Contact Person</label>
                  <input value={form.contact_person} onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))} placeholder="Full name" className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91..." className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@company.com" className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Website</label>
                  <input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="www.company.com" className={inputCls} />
                </div>
              </div>

              {/* Location */}
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold pt-2">Location</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">District</label>
                  <select value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} className={inputCls}>
                    <option value="">Select district</option>
                    {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">City</label>
                  <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="City" className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground mb-1 block">Address</label>
                  <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Street address" className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Pincode</label>
                  <input value={form.pincode} onChange={e => setForm(f => ({ ...f, pincode: e.target.value }))} placeholder="600001" className={inputCls} />
                </div>
              </div>

              {/* Business */}
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold pt-2">Business Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Industry</label>
                  <select value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} className={inputCls}>
                    <option value="">Select industry</option>
                    {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Business Size</label>
                  <select value={form.business_size} onChange={e => setForm(f => ({ ...f, business_size: e.target.value }))} className={inputCls}>
                    {SIZES.map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Services Needed</label>
                <div className="flex flex-wrap gap-1.5">
                  {SERVICES.map(srv => (
                    <button key={srv} type="button" onClick={() => toggleService(srv)}
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${form.services_needed.includes(srv) ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30" : "border-border text-muted-foreground hover:text-foreground"}`}>
                      {srv}
                    </button>
                  ))}
                </div>
              </div>

              {/* CRM */}
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold pt-2">CRM</p>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={inputCls}>
                  {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Follow Up Date</label>
                  <input type="date" value={form.follow_up_date} onChange={e => setForm(f => ({ ...f, follow_up_date: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Last Contacted</label>
                  <input type="date" value={form.last_contacted} onChange={e => setForm(f => ({ ...f, last_contacted: e.target.value }))} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Any notes..."
                  className={inputCls + " resize-none"} />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-border shrink-0 flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="rounded-lg border border-border px-5 py-2 text-sm font-medium hover:bg-muted/30 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.company_name.trim()}
                className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {saving ? "Saving..." : editingId ? "Update" : "Add Contact"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
