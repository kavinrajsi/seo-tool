"use client";

import { useState, useMemo } from "react";

// ─── Data ─────────────────────────────────────────────────────────────────────

const DISTRICTS = [
  { name: "Chennai",         micro: 87574, small: 1262, medium: 96,  tier: 1, region: "North",   industries: ["IT/ITES","Auto Components","Engineering","Electronics","Leather","Pharma","Logistics"] },
  { name: "Coimbatore",      micro: 68570, small: 642,  medium: 29,  tier: 1, region: "West",    industries: ["Textiles","Pumps & Motors","Foundry","Engineering","IT/ITES","Food Processing"] },
  { name: "Tiruppur",        micro: 41520, small: 442,  medium: 19,  tier: 1, region: "West",    industries: ["Knitwear & Hosiery","Garment Export","Textiles","Dyeing & Bleaching"] },
  { name: "Salem",           micro: 40847, small: 279,  medium: 10,  tier: 2, region: "West",    industries: ["Steel","Textiles","Sago & Tapioca","Sericulture","Agro Processing"] },
  { name: "Thiruvallur",     micro: 36822, small: 199,  medium: 12,  tier: 2, region: "North",   industries: ["Auto Components","Engineering","Leather","Electronics","Logistics"] },
  { name: "Madurai",         micro: 33991, small: 225,  medium: 14,  tier: 2, region: "South",   industries: ["Textiles","Food Processing","Rubber","Granite","Tourism","Healthcare"] },
  { name: "Krishnagiri",     micro: 31598, small: 136,  medium: 8,   tier: 2, region: "North",   industries: ["Fruit Processing","Silk","Granite","Poultry","Agro Processing"] },
  { name: "Erode",           micro: 27487, small: 247,  medium: 6,   tier: 2, region: "West",    industries: ["Textiles","Turmeric & Spices","Handlooms","Sugar","Agro Processing"] },
  { name: "Tiruchirappalli", micro: 27531, small: 164,  medium: 5,   tier: 2, region: "Central", industries: ["Heavy Engineering","Leather","Food Processing","Agro Processing"] },
  { name: "Cuddalore",       micro: 26052, small: 66,   medium: 5,   tier: 3, region: "North",   industries: ["Chemicals","Sugar","Salt","Marine Products","Leather"] },
  { name: "Vellore",         micro: 25574, small: 88,   medium: 3,   tier: 2, region: "North",   industries: ["Leather","Footwear","Auto Components","Agro Processing"] },
  { name: "Kanchipuram",     micro: 24587, small: 160,  medium: 38,  tier: 2, region: "North",   industries: ["Silk Sarees","Handlooms","Auto Components","Electronics","Engineering"] },
  { name: "Thanjavur",       micro: 23659, small: 110,  medium: 5,   tier: 3, region: "Central", industries: ["Rice Mills","Tanjore Art","Musical Instruments","Sugar","Tourism"] },
  { name: "Dharmapuri",      micro: 23551, small: 82,   medium: 3,   tier: 3, region: "North",   industries: ["Sericulture","Sago","Poultry","Agro Processing"] },
  { name: "Chengalpattu",    micro: 23234, small: 98,   medium: 3,   tier: 2, region: "North",   industries: ["Auto Components","IT/ITES","Electronics","Logistics"] },
  { name: "Dindigul",        micro: 22785, small: 91,   medium: 6,   tier: 3, region: "South",   industries: ["Locks","Leather","Textiles","Agro Processing","Spices"] },
  { name: "Tiruvannamalai",  micro: 21878, small: 70,   medium: 10,  tier: 3, region: "North",   industries: ["Agro Processing","Rice Mills","Handlooms","Sugar","Tourism"] },
  { name: "Kanniyakumari",   micro: 20807, small: 76,   medium: 6,   tier: 3, region: "South",   industries: ["Marine Products","Rubber","Coir","Cashew","Tourism"] },
  { name: "Tirupathur",      micro: 19718, small: 36,   medium: 0,   tier: 3, region: "North",   industries: ["Leather","Agro Processing","Poultry"] },
  { name: "Namakkal",        micro: 19415, small: 235,  medium: 8,   tier: 3, region: "West",    industries: ["Poultry & Eggs","Transport","Textiles","Agro Processing"] },
  { name: "Villupuram",      micro: 19577, small: 64,   medium: 4,   tier: 3, region: "North",   industries: ["Sugar","Rice Mills","Leather","Agro Processing"] },
  { name: "Tirunelveli",     micro: 19175, small: 74,   medium: 3,   tier: 3, region: "South",   industries: ["Renewable Energy","Rice Mills","Agro Processing"] },
  { name: "Virudhunagar",    micro: 18986, small: 105,  medium: 2,   tier: 2, region: "South",   industries: ["Fireworks & Crackers","Printing & Packaging","Safety Matches","Textiles"] },
  { name: "Tuticorin",       micro: 18834, small: 100,  medium: 9,   tier: 3, region: "South",   industries: ["Salt","Marine Products","Chemicals","Port/Logistics"] },
  { name: "Pudukkottai",     micro: 16614, small: 63,   medium: 2,   tier: 3, region: "Central", industries: ["Cement","Granite","Agro Processing","Marine Products"] },
  { name: "Ranipet",         micro: 15689, small: 50,   medium: 2,   tier: 3, region: "North",   industries: ["Leather","Heavy Engineering","Chemicals","Ceramics"] },
  { name: "Theni",           micro: 13221, small: 64,   medium: 0,   tier: 3, region: "South",   industries: ["Spices","Cotton Mills","Agro Processing","Tourism"] },
  { name: "Ramanathapuram",  micro: 12895, small: 39,   medium: 2,   tier: 3, region: "South",   industries: ["Marine Products","Salt","Agro Processing"] },
  { name: "Sivaganga",       micro: 11863, small: 53,   medium: 2,   tier: 3, region: "South",   industries: ["Cement","Agro Processing","Handlooms","Tourism"] },
  { name: "Thiruvarur",      micro: 11520, small: 42,   medium: 3,   tier: 3, region: "Central", industries: ["Rice Mills","Bronze Casting","Agro Processing"] },
  { name: "Tenkasi",         micro: 11333, small: 44,   medium: 3,   tier: 3, region: "South",   industries: ["Agro Processing","Spices","Rice Mills"] },
  { name: "Karur",           micro: 10472, small: 66,   medium: 2,   tier: 2, region: "Central", industries: ["Home Textiles","Textiles","Bus Body Building"] },
  { name: "The Nilgiris",    micro: 10091, small: 31,   medium: 0,   tier: 3, region: "West",    industries: ["Tea & Coffee","Essential Oils","Tourism","Spices"] },
  { name: "Kallakurichi",    micro: 8429,  small: 39,   medium: 4,   tier: 3, region: "North",   industries: ["Agro Processing","Rice Mills","Handlooms"] },
  { name: "Mayiladuthurai",  micro: 7775,  small: 25,   medium: 0,   tier: 3, region: "Central", industries: ["Rice Mills","Agro Processing","Tourism"] },
  { name: "Nagapattinam",    micro: 7334,  small: 25,   medium: 0,   tier: 3, region: "Central", industries: ["Marine Products","Chemicals","Salt","Rice Mills"] },
  { name: "Ariyalur",        micro: 7273,  small: 15,   medium: 2,   tier: 3, region: "Central", industries: ["Cement","Limestone","Agro Processing"] },
  { name: "Perambalur",      micro: 4476,  small: 23,   medium: 0,   tier: 3, region: "Central", industries: ["Agro Processing","Rice Mills","Dairy"] },
];

const SM = {
  "Textiles":             { s: ["eCommerce SEO","International SEO","Shopify Store","Instagram SMO","GEO"],  i: "🧵" },
  "Knitwear & Hosiery":   { s: ["International SEO","B2B Website","LinkedIn SMO","GEO"],                    i: "👕" },
  "Garment Export":       { s: ["International SEO","B2B Website","GEO","LinkedIn SMO"],                    i: "📦" },
  "Home Textiles":        { s: ["eCommerce SEO","International SEO","Shopify Store","GEO"],                 i: "🛏️" },
  "Leather":              { s: ["International SEO","B2B Website","GEO","LinkedIn SMO"],                    i: "👞" },
  "Footwear":             { s: ["eCommerce SEO","Shopify Store","Instagram SMO","Local SEO"],               i: "👟" },
  "Auto Components":      { s: ["B2B SEO","LinkedIn SMO","B2B Website","GEO"],                              i: "⚙️" },
  "IT/ITES":              { s: ["Technical SEO","LinkedIn SMO","GEO","Content SEO"],                        i: "💻" },
  "Food Processing":      { s: ["Local SEO","eCommerce SEO","Instagram SMO","Google Business"],             i: "🍱" },
  "Chemicals":            { s: ["B2B SEO","B2B Website","LinkedIn SMO","GEO"],                              i: "🧪" },
  "Pharma":               { s: ["B2B SEO","Content SEO","LinkedIn SMO","GEO"],                              i: "💊" },
  "Marine Products":      { s: ["International SEO","B2B Website","GEO"],                                   i: "🐟" },
  "Tourism":              { s: ["Local SEO","Google Business","Instagram SMO","Content SEO"],               i: "🏛️" },
  "Healthcare":           { s: ["Local SEO","Google Business","Content SEO","SMO"],                         i: "🏥" },
  "Electronics":          { s: ["B2B SEO","LinkedIn SMO","Technical SEO","GEO"],                            i: "📱" },
  "Engineering":          { s: ["B2B SEO","LinkedIn SMO","B2B Website","GEO"],                              i: "🔧" },
  "Heavy Engineering":    { s: ["B2B SEO","LinkedIn SMO","B2B Website","GEO"],                              i: "🏗️" },
  "Silk Sarees":          { s: ["eCommerce SEO","Shopify Store","Instagram SMO","GEO"],                     i: "👗" },
  "Handlooms":            { s: ["eCommerce SEO","Shopify Store","Instagram SMO","Local SEO"],               i: "🪡" },
  "Spices":               { s: ["eCommerce SEO","International SEO","Shopify Store","GEO"],                 i: "🌶️" },
  "Poultry & Eggs":       { s: ["B2B SEO","B2B Website","Local SEO"],                                       i: "🥚" },
  "Poultry":              { s: ["B2B SEO","B2B Website","Local SEO"],                                       i: "🐔" },
  "Sugar":                { s: ["B2B SEO","B2B Website","LinkedIn SMO"],                                    i: "🍬" },
  "Agro Processing":      { s: ["Local SEO","B2B Website","eCommerce SEO"],                                 i: "🌾" },
  "Cement":               { s: ["B2B SEO","B2B Website","LinkedIn SMO"],                                    i: "🧱" },
  "Granite":              { s: ["International SEO","B2B Website","GEO"],                                   i: "🪨" },
  "Fireworks & Crackers": { s: ["eCommerce SEO","Shopify Store","Instagram SMO","Local SEO"],               i: "🎆" },
  "Printing & Packaging": { s: ["B2B SEO","B2B Website","LinkedIn SMO"],                                    i: "🖨️" },
  "Tea & Coffee":         { s: ["eCommerce SEO","Shopify Store","Instagram SMO","GEO"],                     i: "☕" },
  "Pumps & Motors":       { s: ["B2B SEO","B2B Website","LinkedIn SMO","GEO"],                              i: "🔩" },
  "Foundry":              { s: ["B2B SEO","B2B Website","LinkedIn SMO"],                                    i: "🔥" },
  "Logistics":            { s: ["B2B SEO","LinkedIn SMO","Local SEO"],                                      i: "🚛" },
  "Renewable Energy":     { s: ["B2B SEO","LinkedIn SMO","Content SEO","GEO"],                              i: "⚡" },
  "Coir":                 { s: ["eCommerce SEO","International SEO","B2B Website"],                         i: "🌴" },
  "Salt":                 { s: ["B2B SEO","B2B Website","International SEO"],                               i: "🧂" },
  "Rubber":               { s: ["B2B SEO","B2B Website","LinkedIn SMO"],                                    i: "🛞" },
  "Locks":                { s: ["eCommerce SEO","B2B SEO","Shopify Store"],                                  i: "🔒" },
  "Tanjore Art":          { s: ["eCommerce SEO","Shopify Store","Instagram SMO","GEO"],                     i: "🎨" },
  "Sericulture":          { s: ["eCommerce SEO","B2B Website","Local SEO"],                                 i: "🦋" },
  "Rice Mills":           { s: ["B2B SEO","B2B Website","Local SEO"],                                       i: "🍚" },
  "Dyeing & Bleaching":   { s: ["B2B SEO","B2B Website","LinkedIn SMO"],                                    i: "🎨" },
  "Sago & Tapioca":       { s: ["B2B SEO","B2B Website","International SEO"],                               i: "🫘" },
  "Sago":                 { s: ["B2B SEO","B2B Website","International SEO"],                               i: "🫘" },
  "Steel":                { s: ["B2B SEO","B2B Website","LinkedIn SMO"],                                    i: "🏭" },
  "Cashew":               { s: ["eCommerce SEO","Shopify Store","International SEO"],                       i: "🥜" },
  "Safety Matches":       { s: ["B2B SEO","B2B Website"],                                                   i: "🔥" },
  "Fruit Processing":     { s: ["eCommerce SEO","Shopify Store","Local SEO","GEO"],                         i: "🥭" },
  "Silk":                 { s: ["eCommerce SEO","Shopify Store","Instagram SMO"],                           i: "🧶" },
  "Turmeric & Spices":    { s: ["eCommerce SEO","International SEO","Shopify Store","GEO"],                 i: "🌿" },
  "Ceramics":             { s: ["eCommerce SEO","B2B Website","Local SEO"],                                 i: "🏺" },
  "Bronze Casting":       { s: ["eCommerce SEO","Shopify Store","Instagram SMO"],                           i: "🔔" },
  "Essential Oils":       { s: ["eCommerce SEO","Shopify Store","Instagram SMO","GEO"],                     i: "🌸" },
  "Bus Body Building":    { s: ["B2B SEO","B2B Website","LinkedIn SMO"],                                    i: "🚌" },
  "Musical Instruments":  { s: ["eCommerce SEO","Shopify Store","Instagram SMO"],                           i: "🎵" },
  "Transport":            { s: ["B2B SEO","Local SEO","Google Business"],                                   i: "🚚" },
  "Dairy":                { s: ["Local SEO","Google Business","Instagram SMO"],                             i: "🥛" },
  "Limestone":            { s: ["B2B SEO","B2B Website"],                                                   i: "🪨" },
  "Cotton Mills":         { s: ["B2B SEO","B2B Website","LinkedIn SMO"],                                    i: "🏭" },
  "Port/Logistics":       { s: ["B2B SEO","LinkedIn SMO","B2B Website"],                                    i: "🚢" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n) { return n.toLocaleString("en-IN"); }

function tierStyle(t) {
  if (t === 1) return { background: "#1e3a5f", color: "#60a5fa" };
  if (t === 2) return { background: "#1a2e1a", color: "#34d399" };
  return { background: "#2a1f1a", color: "#fbbf24" };
}

function srvStyle(s) {
  if (s.includes("SEO"))     return { background: "#1e3a5f", color: "#60a5fa" };
  if (s.includes("SMO") || s.includes("LinkedIn") || s.includes("Instagram"))
                              return { background: "#2a1a3a", color: "#a78bfa" };
  if (s.includes("GEO"))     return { background: "#1a2e1a", color: "#34d399" };
  if (s.includes("Shopify")) return { background: "#2a2a1a", color: "#fbbf24" };
  return                           { background: "#1e293b",  color: "#94a3b8" };
}

function pitchTip(d) {
  if (d.tier === 1)
    return `${d.name} has the highest digital readiness. Lead with full SEO + GEO + SMO packages. These businesses understand digital value — focus on ROI and competitor gaps.`;
  if (d.tier === 2)
    return `${d.name} has strong potential. Start with a website audit or Google Business setup as a foot-in-the-door service, then upsell to monthly SEO packages.`;
  return `${d.name} is an emerging market. Offer affordable one-time services (website build, Google Business Profile) first. Build trust, then propose ongoing SEO.`;
}

function Stars({ tier }) {
  const n = tier === 1 ? 5 : tier === 2 ? 4 : 3;
  return (
    <span style={{ color: "#fbbf24", letterSpacing: -1 }}>
      {"★".repeat(n)}
      <span style={{ opacity: 0.15 }}>{"★".repeat(5 - n)}</span>
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

const inputCss = {
  width: "100%", padding: "8px 10px", background: "#0a0f1a",
  border: "1px solid #1e293b", borderRadius: 7, color: "#e2e8f0",
  fontSize: 13, outline: "none", fontFamily: "inherit",
};

export default function SMEPage() {
  const [viewMode,      setViewMode]      = useState("table");
  const [selected,      setSelected]      = useState(null);
  const [search,        setSearch]        = useState("");
  const [tierFilter,    setTierFilter]    = useState("All");
  const [regionFilter,  setRegionFilter]  = useState("All");
  const [industryFilter,setIndustryFilter]= useState("All");
  const [serviceFilter, setServiceFilter] = useState("All");
  const [sortBy,        setSortBy]        = useState("total");

  const allIndustries = useMemo(() => [...new Set(DISTRICTS.flatMap(d => d.industries))].sort(), []);
  const allServices   = useMemo(() => [...new Set(Object.values(SM).flatMap(s => s.s))].sort(), []);
  const maxTotal      = useMemo(() => Math.max(...DISTRICTS.map(d => d.micro + d.small + d.medium)), []);

  const filtered = useMemo(() => {
    let r = DISTRICTS.filter(d => {
      if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (tierFilter   !== "All" && d.tier   !== parseInt(tierFilter))    return false;
      if (regionFilter !== "All" && d.region !== regionFilter)            return false;
      if (industryFilter !== "All" && !d.industries.includes(industryFilter)) return false;
      if (serviceFilter  !== "All") return d.industries.some(ind => SM[ind]?.s?.includes(serviceFilter));
      return true;
    });
    r.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      const v = k => k === "micro" ? k : k === "small" ? k : k === "medium" ? k : null;
      const va = sortBy === "micro" ? a.micro : sortBy === "small" ? a.small : sortBy === "medium" ? a.medium : a.micro + a.small + a.medium;
      const vb = sortBy === "micro" ? b.micro : sortBy === "small" ? b.small : sortBy === "medium" ? b.medium : b.micro + b.small + b.medium;
      return vb - va;
    });
    return r;
  }, [search, tierFilter, regionFilter, industryFilter, serviceFilter, sortBy]);

  function toggle(name) { setSelected(s => s === name ? null : name); }

  function resetFilters() {
    setSearch(""); setTierFilter("All"); setRegionFilter("All");
    setIndustryFilter("All"); setServiceFilter("All"); setSortBy("total");
    setSelected(null);
  }

  const tM  = filtered.reduce((s, d) => s + d.micro,  0);
  const tS  = filtered.reduce((s, d) => s + d.small,  0);
  const tMd = filtered.reduce((s, d) => s + d.medium, 0);
  const tA  = tM + tS + tMd;
  const sel = selected ? DISTRICTS.find(d => d.name === selected) : null;

  return (
    <div className="flex flex-1 flex-col gap-0 py-4">
      <style>{`
        .sme-table { width:100%; border-collapse:collapse; font-size:13px; }
        .sme-table thead tr { background:#131b2e; }
        .sme-table th { padding:10px 12px; font-weight:600; color:#94a3b8; font-size:11px;
          text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid #1e293b; white-space:nowrap; }
        .sme-table td { padding:10px 12px; }
        .sme-table .tr-r { text-align:right; }
        .sme-table tbody tr { cursor:pointer; transition:background 0.15s; border-left:3px solid transparent; }
        .sme-table tbody tr:hover { background:#151f35 !important; }
        .sme-table tbody tr.row-sel { background:#1e293b !important; border-left-color:#60a5fa; }
        .bar-track { background:#1e293b; border-radius:4px; height:8px; overflow:hidden; width:130px; }
        .bar-fill  { height:100%; border-radius:4px; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ background:"linear-gradient(135deg,#0f172a 0%,#1a1040 50%,#0f2027 100%)", border:"1px solid #1e293b", borderRadius:12, padding:"22px 20px 18px", marginBottom:20 }}>
        <div className="flex items-center gap-2 mb-1">
          <span style={{ fontSize:26 }}>📊</span>
          <h1 style={{ fontSize:21, fontWeight:700, background:"linear-gradient(90deg,#60a5fa,#a78bfa,#f472b6)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", letterSpacing:-0.5 }}>
            Tamil Nadu MSME Explorer
          </h1>
        </div>
        <p style={{ color:"#94a3b8", fontSize:13, marginLeft:38 }}>
          District-wise data with SEO/SMO/GEO service mapping — 8,78,713 registered MSMEs across 38 districts
        </p>
      </div>

      {/* ── Summary Cards ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12, marginBottom:20 }}>
        {[
          { label:"Showing Districts", value:filtered.length,  color:"#60a5fa", sub:`of 38` },
          { label:"Total MSMEs",       value:fmt(tA),          color:"#a78bfa", sub:"filtered" },
          { label:"Micro",             value:fmt(tM),          color:"#34d399", sub: tA > 0 ? ((tM/tA)*100).toFixed(1)+"%" : "0%" },
          { label:"Small",             value:fmt(tS),          color:"#fbbf24", sub: tA > 0 ? ((tS/tA)*100).toFixed(1)+"%" : "0%" },
          { label:"Medium",            value:fmt(tMd),         color:"#f472b6", sub: tA > 0 ? ((tMd/tA)*100).toFixed(1)+"%" : "0%" },
        ].map(c => (
          <div key={c.label} style={{ background:"#131b2e", border:"1px solid #1e293b", borderRadius:10, padding:"14px 16px", textAlign:"center" }}>
            <div style={{ fontSize:11, color:"#64748b", fontWeight:600, textTransform:"uppercase", letterSpacing:0.5, marginBottom:6 }}>{c.label}</div>
            <div style={{ fontSize:22, fontWeight:700, fontFamily:"monospace", color:c.color }}>{c.value}</div>
            <div style={{ fontSize:11, color:"#475569", marginTop:2 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div style={{ background:"#131b2e", border:"1px solid #1e293b", borderRadius:12, padding:"16px 20px", marginBottom:20 }}>
        <div className="flex items-center justify-between mb-3">
          <span style={{ fontSize:13, fontWeight:600, color:"#94a3b8" }}>🔍 Filters</span>
          <button onClick={resetFilters} style={{ background:"none", border:"1px solid #334155", color:"#94a3b8", fontSize:11, padding:"4px 10px", borderRadius:6, cursor:"pointer" }}>
            Reset All
          </button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:10 }}>
          {[
            { label:"Search District",
              el: <input style={inputCss} value={search} onChange={e => setSearch(e.target.value)} placeholder="Type district name..." /> },
            { label:"Opportunity Tier",
              el: <select style={inputCss} value={tierFilter} onChange={e => setTierFilter(e.target.value)}>
                    <option value="All">All Tiers</option>
                    <option value="1">Tier 1 — Highest</option>
                    <option value="2">Tier 2 — Strong</option>
                    <option value="3">Tier 3 — Moderate</option>
                  </select> },
            { label:"Region",
              el: <select style={inputCss} value={regionFilter} onChange={e => setRegionFilter(e.target.value)}>
                    <option value="All">All Regions</option>
                    <option value="North">North TN</option>
                    <option value="West">West TN</option>
                    <option value="Central">Central TN</option>
                    <option value="South">South TN</option>
                  </select> },
            { label:"Industry",
              el: <select style={inputCss} value={industryFilter} onChange={e => setIndustryFilter(e.target.value)}>
                    <option value="All">All Industries</option>
                    {allIndustries.map(ind => <option key={ind} value={ind}>{SM[ind]?.i || "📍"} {ind}</option>)}
                  </select> },
            { label:"Service Needed",
              el: <select style={inputCss} value={serviceFilter} onChange={e => setServiceFilter(e.target.value)}>
                    <option value="All">All Services</option>
                    {allServices.map(s => <option key={s} value={s}>{s}</option>)}
                  </select> },
            { label:"Sort By",
              el: <select style={inputCss} value={sortBy} onChange={e => setSortBy(e.target.value)}>
                    <option value="total">Total MSMEs (High → Low)</option>
                    <option value="micro">Micro Count</option>
                    <option value="small">Small Count</option>
                    <option value="medium">Medium Count</option>
                    <option value="name">District Name (A-Z)</option>
                  </select> },
          ].map(({ label, el }) => (
            <div key={label}>
              <label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:4, fontWeight:500 }}>{label}</label>
              {el}
            </div>
          ))}
        </div>
      </div>

      {/* ── View Toggle ── */}
      <div className="flex gap-2 mb-4">
        {[["table","📋 Table View"],["cards","🃏 Card View"]].map(([mode, label]) => (
          <button key={mode} onClick={() => setViewMode(mode)} style={{
            padding:"6px 16px", borderRadius:6, fontSize:12, fontWeight:600, cursor:"pointer",
            border:`1px solid ${viewMode === mode ? "#60a5fa" : "#1e293b"}`,
            background: viewMode === mode ? "#1e3a5f" : "#131b2e",
            color:       viewMode === mode ? "#60a5fa" : "#64748b",
          }}>{label}</button>
        ))}
      </div>

      {/* ── Main grid ── */}
      <div style={{ display:"grid", gridTemplateColumns: sel ? "1fr 360px" : "1fr", gap:20, alignItems:"start" }}>

        {/* Table or Cards */}
        <div>
          {viewMode === "table" ? (
            <div style={{ overflowX:"auto", borderRadius:12, border:"1px solid #1e293b" }}>
              <table className="sme-table">
                <thead>
                  <tr>
                    <th>#</th><th>District</th>
                    <th className="tr-r">Micro</th><th className="tr-r">Small</th><th className="tr-r">Medium</th>
                    <th className="tr-r">Total</th><th>Rating</th><th>Bar</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((d, i) => {
                    const total = d.micro + d.small + d.medium;
                    const pct   = (total / maxTotal) * 100;
                    const isSel = selected === d.name;
                    const bg    = isSel ? "#1e293b" : i % 2 === 0 ? "#0d1424" : "#0a0f1a";
                    const grad  = d.tier === 1
                      ? "linear-gradient(90deg,#3b82f6,#8b5cf6)"
                      : d.tier === 2
                      ? "linear-gradient(90deg,#10b981,#34d399)"
                      : "linear-gradient(90deg,#f59e0b,#fbbf24)";
                    return (
                      <tr key={d.name} className={isSel ? "row-sel" : ""} style={{ background:bg }} onClick={() => toggle(d.name)}>
                        <td style={{ color:"#475569", fontSize:11, fontFamily:"monospace" }}>{i+1}</td>
                        <td style={{ fontWeight:600, whiteSpace:"nowrap" }}>
                          {d.name}
                          <span style={{ marginLeft:8, fontSize:9, padding:"2px 6px", borderRadius:4, fontWeight:600, ...tierStyle(d.tier) }}>T{d.tier}</span>
                        </td>
                        <td className="tr-r" style={{ color:"#34d399", fontSize:12, fontFamily:"monospace" }}>{fmt(d.micro)}</td>
                        <td className="tr-r" style={{ color:"#fbbf24", fontSize:12, fontFamily:"monospace" }}>{fmt(d.small)}</td>
                        <td className="tr-r" style={{ color:"#f472b6", fontSize:12, fontFamily:"monospace" }}>{fmt(d.medium)}</td>
                        <td className="tr-r" style={{ fontWeight:700, fontSize:13, fontFamily:"monospace" }}>{fmt(total)}</td>
                        <td><Stars tier={d.tier} /></td>
                        <td><div className="bar-track"><div className="bar-fill" style={{ width:`${pct}%`, background:grad }} /></div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))", gap:12 }}>
              {filtered.map(d => {
                const total = d.micro + d.small + d.medium;
                const isSel = selected === d.name;
                return (
                  <div key={d.name} onClick={() => toggle(d.name)} style={{
                    background: isSel ? "#1e293b" : "#131b2e",
                    border:`1px solid ${isSel ? "#60a5fa" : "#1e293b"}`,
                    borderRadius:10, padding:16, cursor:"pointer", transition:"all 0.2s",
                  }}>
                    <div className="flex items-center justify-between mb-2">
                      <span style={{ fontWeight:700, fontSize:15 }}>{d.name}</span>
                      <span style={{ fontSize:10, padding:"3px 8px", borderRadius:4, fontWeight:600, ...tierStyle(d.tier) }}>Tier {d.tier}</span>
                    </div>
                    <div style={{ fontFamily:"monospace", fontSize:20, fontWeight:700, marginBottom:8 }}>{fmt(total)}</div>
                    <div className="flex gap-3 mb-3" style={{ fontSize:11, color:"#94a3b8" }}>
                      <span><span style={{ color:"#34d399" }}>●</span> {fmt(d.micro)}</span>
                      <span><span style={{ color:"#fbbf24" }}>●</span> {fmt(d.small)}</span>
                      <span><span style={{ color:"#f472b6" }}>●</span> {fmt(d.medium)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {d.industries.slice(0, 4).map(ind => (
                        <span key={ind} style={{ fontSize:10, background:"#0a0f1a", padding:"3px 7px", borderRadius:4, color:"#94a3b8", border:"1px solid #1e293b" }}>
                          {SM[ind]?.i || "📍"} {ind}
                        </span>
                      ))}
                      {d.industries.length > 4 && (
                        <span style={{ fontSize:10, color:"#475569", padding:"3px 4px" }}>+{d.industries.length - 4}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Detail Panel ── */}
        {sel && (
          <div style={{ background:"#131b2e", border:"1px solid #1e293b", borderRadius:12, padding:20, position:"sticky", top:20, maxHeight:"85vh", overflowY:"auto" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ fontSize:18, fontWeight:700 }}>{sel.name}</h3>
              <button onClick={() => setSelected(null)} style={{ background:"none", border:"none", color:"#64748b", fontSize:18, cursor:"pointer" }}>✕</button>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:18 }}>
              {[["Micro",sel.micro,"#34d399"],["Small",sel.small,"#fbbf24"],["Medium",sel.medium,"#f472b6"]].map(([label,val,color]) => (
                <div key={label} style={{ background:"#0a0f1a", borderRadius:8, padding:"10px 12px", textAlign:"center" }}>
                  <div style={{ fontSize:10, color:"#64748b", marginBottom:4 }}>{label}</div>
                  <div style={{ fontFamily:"monospace", fontSize:16, fontWeight:700, color }}>{fmt(val)}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize:13, color:"#94a3b8", marginBottom:6, fontWeight:600 }}>
              Total:{" "}<span style={{ fontFamily:"monospace", color:"#e2e8f0" }}>{fmt(sel.micro+sel.small+sel.medium)}</span>
              <span style={{ marginLeft:8 }}><Stars tier={sel.tier} /></span>
            </div>
            <div style={{ fontSize:11, color:"#64748b", marginBottom:18 }}>Region: {sel.region} Tamil Nadu</div>

            <div style={{ fontSize:12, fontWeight:700, color:"#60a5fa", marginBottom:10, textTransform:"uppercase", letterSpacing:0.5 }}>
              Industries & Recommended Services
            </div>

            {sel.industries.map(ind => {
              const m = SM[ind];
              return (
                <div key={ind} style={{ background:"#0a0f1a", border:"1px solid #1e293b", borderRadius:8, padding:"10px 12px", marginBottom:8 }}>
                  <div style={{ fontSize:13, fontWeight:600, marginBottom:6 }}>{m?.i || "📍"} {ind}</div>
                  <div className="flex flex-wrap gap-1">
                    {m?.s?.map(srv => (
                      <span key={srv} style={{ fontSize:10, padding:"3px 8px", borderRadius:4, fontWeight:500, ...srvStyle(srv) }}>{srv}</span>
                    ))}
                  </div>
                </div>
              );
            })}

            <div style={{ background:"linear-gradient(135deg,#1e293b,#1a1040)", borderRadius:8, padding:14, marginTop:12, border:"1px solid #334155" }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#a78bfa", marginBottom:6 }}>💡 PITCH TIP</div>
              <div style={{ fontSize:12, color:"#cbd5e1", lineHeight:1.6 }}>{pitchTip(sel)}</div>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{ marginTop:24, paddingTop:16, borderTop:"1px solid #1e293b", textAlign:"center", color:"#475569", fontSize:11 }}>
        Data Source: MSME-DFO Chennai Annual Report 2023–24 (Udyam Registration) · Tamil Nadu — SEO/SMO/GEO Service Planning
      </div>
    </div>
  );
}
