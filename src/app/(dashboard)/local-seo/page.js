"use client";

import { useState, useEffect, Fragment } from "react";
import { supabase } from "@/lib/supabase";
import { useTeam } from "@/lib/team-context";
import { useProject } from "@/lib/project-context";
import {
  MapPinIcon,
  PlusIcon,
  TrashIcon,
  CopyIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  BuildingIcon,
  ClockIcon,
  CodeIcon,
  MapIcon,
  PencilIcon,
  XIcon,
} from "lucide-react";

/* ── Constants ──────────────────────────────────────────────────────── */

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const BUSINESS_TYPES = [
  "LocalBusiness",
  "Restaurant",
  "Store",
  "ProfessionalService",
  "MedicalBusiness",
  "HealthAndBeautyBusiness",
  "AutomotiveBusiness",
  "FinancialService",
  "LegalService",
  "RealEstateAgent",
  "TravelAgency",
  "FoodEstablishment",
  "LodgingBusiness",
  "SportsActivityLocation",
  "EntertainmentBusiness",
  "EducationalOrganization",
];

const EMPTY_HOURS = DAYS.map((day) => ({
  day,
  open: "09:00",
  close: "17:00",
  closed: false,
}));

const EMPTY_LOCATION = {
  name: "",
  address_street: "",
  address_city: "",
  address_state: "",
  address_zip: "",
  address_country: "US",
  phone: "",
  email: "",
  website: "",
  business_type: "LocalBusiness",
  latitude: "",
  longitude: "",
  opening_hours: EMPTY_HOURS,
};

/* ── Schema Generator ───────────────────────────────────────────────── */

function generateSchema(loc) {
  const hours = (loc.opening_hours || [])
    .filter((h) => !h.closed)
    .map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.day,
      opens: h.open,
      closes: h.close,
    }));

  const schema = {
    "@context": "https://schema.org",
    "@type": loc.business_type || "LocalBusiness",
    name: loc.name,
    telephone: loc.phone,
    email: loc.email,
    url: loc.website,
    address: {
      "@type": "PostalAddress",
      streetAddress: loc.address_street,
      addressLocality: loc.address_city,
      addressRegion: loc.address_state,
      postalCode: loc.address_zip,
      addressCountry: loc.address_country,
    },
    ...(hours.length > 0 && { openingHoursSpecification: hours }),
    ...(loc.latitude &&
      loc.longitude && {
        geo: {
          "@type": "GeoCoordinates",
          latitude: parseFloat(loc.latitude),
          longitude: parseFloat(loc.longitude),
        },
      }),
  };

  return JSON.stringify(schema, null, 2);
}

function generateEmbedSnippet(loc) {
  const schema = generateSchema(loc);
  return `<script type="application/ld+json">\n${schema}\n</script>`;
}

/* ── Google Maps Embed (free, no API key needed) ────────────────────── */

function MapEmbed({ location }) {
  const address = [
    location.address_street,
    location.address_city,
    location.address_state,
    location.address_zip,
    location.address_country,
  ]
    .filter(Boolean)
    .join(", ");

  if (!address.trim()) {
    return (
      <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-border bg-secondary/30">
        <p className="text-sm text-muted-foreground">Enter an address to see the map</p>
      </div>
    );
  }

  return (
    <iframe
      title="Business Location"
      width="100%"
      height="200"
      className="rounded-md border border-border"
      style={{ border: 0 }}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      src={`https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed`}
    />
  );
}

/* ── Opening Hours Editor ───────────────────────────────────────────── */

function HoursEditor({ hours, onChange }) {
  function update(index, field, value) {
    const next = hours.map((h, i) =>
      i === index ? { ...h, [field]: value } : h
    );
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-2">
      {hours.map((h, i) => (
        <div
          key={h.day}
          className="flex items-center gap-3 text-sm"
        >
          <span className="w-24 shrink-0 font-medium text-muted-foreground">
            {h.day.slice(0, 3)}
          </span>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={h.closed}
              onChange={(e) => update(i, "closed", e.target.checked)}
              className="rounded border-border"
            />
            <span className="text-xs text-muted-foreground">Closed</span>
          </label>
          {!h.closed && (
            <>
              <input
                type="time"
                value={h.open}
                onChange={(e) => update(i, "open", e.target.value)}
                className="rounded-md border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <span className="text-muted-foreground">—</span>
              <input
                type="time"
                value={h.close}
                onChange={(e) => update(i, "close", e.target.value)}
                className="rounded-md border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Location Card ──────────────────────────────────────────────────── */

function LocationCard({ location, onSave, onDelete, isNew }) {
  const [form, setForm] = useState(location);
  const [expanded, setExpanded] = useState(isNew);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSchema, setShowSchema] = useState(false);

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  function handleCopy() {
    navigator.clipboard.writeText(generateEmbedSnippet(form));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const schemaPreview = generateSchema(form);

  return (
    <div className="rounded-lg border border-border bg-card">
      {/* Collapsed header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary">
            <BuildingIcon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">{form.name || "New Location"}</p>
            <p className="text-xs text-muted-foreground">
              {[form.address_city, form.address_state].filter(Boolean).join(", ") || "No address set"}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUpIcon className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Expanded form */}
      {expanded && (
        <div className="border-t border-border p-5 flex flex-col gap-6">
          {/* Business Info */}
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <BuildingIcon className="h-4 w-4" />
              Business Information
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">Business Name</label>
                <input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Your Business Name"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Business Type</label>
                <select
                  value={form.business_type}
                  onChange={(e) => set("business_type", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {BUSINESS_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
                <input
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="info@business.com"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Website</label>
                <input
                  value={form.website}
                  onChange={(e) => set("website", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="https://yourbusiness.com"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <MapPinIcon className="h-4 w-4" />
              Address
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">Street Address</label>
                <input
                  value={form.address_street}
                  onChange={(e) => set("address_street", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="123 Main Street"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">City</label>
                <input
                  value={form.address_city}
                  onChange={(e) => set("address_city", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="San Francisco"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">State / Region</label>
                <input
                  value={form.address_state}
                  onChange={(e) => set("address_state", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="CA"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">ZIP / Postal Code</label>
                <input
                  value={form.address_zip}
                  onChange={(e) => set("address_zip", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="94105"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Country</label>
                <input
                  value={form.address_country}
                  onChange={(e) => set("address_country", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="US"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 mt-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Latitude (optional)</label>
                <input
                  value={form.latitude}
                  onChange={(e) => set("latitude", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="37.7749"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Longitude (optional)</label>
                <input
                  value={form.longitude}
                  onChange={(e) => set("longitude", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="-122.4194"
                />
              </div>
            </div>
          </div>

          {/* Map */}
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <MapIcon className="h-4 w-4" />
              Google Maps Preview
            </h3>
            <MapEmbed location={form} />
          </div>

          {/* Opening Hours */}
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <ClockIcon className="h-4 w-4" />
              Opening Hours
            </h3>
            <HoursEditor
              hours={form.opening_hours || EMPTY_HOURS}
              onChange={(hours) => set("opening_hours", hours)}
            />
          </div>

          {/* Schema Preview */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <CodeIcon className="h-4 w-4" />
                Local Business Schema (JSON-LD)
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSchema(!showSchema)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showSchema ? "Hide" : "Preview"}
                </button>
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium hover:bg-accent transition-colors"
                >
                  {copied ? (
                    <>
                      <CheckIcon className="h-3 w-3 text-emerald-400" />
                      Copied
                    </>
                  ) : (
                    <>
                      <CopyIcon className="h-3 w-3" />
                      Copy Schema
                    </>
                  )}
                </button>
              </div>
            </div>
            {showSchema && (
              <pre className="rounded-md bg-zinc-900 border border-border p-4 text-xs text-zinc-300 overflow-x-auto font-mono leading-relaxed">
                {`<script type="application/ld+json">\n${schemaPreview}\n</script>`}
              </pre>
            )}
            {!showSchema && (
              <p className="text-xs text-muted-foreground">
                Schema markup is auto-generated from your business info. Click &quot;Copy Schema&quot; to paste it into your site&apos;s &lt;head&gt;.
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between border-t border-border pt-4">
            <button
              onClick={() => onDelete(form.id, form._tempId)}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-red-400 hover:bg-red-900/30 transition-colors"
            >
              <TrashIcon className="h-4 w-4" />
              Delete Location
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Location"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────────────── */

export default function LocalSeoManager() {
  const { activeTeam } = useTeam();
  const { activeProject } = useProject();
  const [user, setUser] = useState(null);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Auth + load locations
  useEffect(() => {
    async function init() {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;
      setUser(authData.user);

      let locQuery = supabase
        .from("business_locations")
        .select("*")
        .order("created_at", { ascending: true });

      if (activeTeam) {
        locQuery = locQuery.eq("team_id", activeTeam.id);
      } else {
        locQuery = locQuery.eq("user_id", authData.user.id).is("team_id", null);
      }

      const { data } = await locQuery;

      if (data) setLocations(data);
      setLoading(false);
    }
    init();
  }, [activeTeam, activeProject]);

  async function handleSave(loc) {
    if (!user) return;

    if (loc.id) {
      // Update existing
      const { data, error } = await supabase
        .from("business_locations")
        .update({
          name: loc.name,
          address_street: loc.address_street,
          address_city: loc.address_city,
          address_state: loc.address_state,
          address_zip: loc.address_zip,
          address_country: loc.address_country,
          phone: loc.phone,
          email: loc.email,
          website: loc.website,
          business_type: loc.business_type,
          latitude: loc.latitude || null,
          longitude: loc.longitude || null,
          opening_hours: loc.opening_hours,
          updated_at: new Date().toISOString(),
        })
        .eq("id", loc.id)
        .select()
        .single();

      if (data) {
        setLocations((prev) =>
          prev.map((l) => (l.id === data.id ? data : l))
        );
      }
    } else {
      // Insert new
      const { data, error } = await supabase
        .from("business_locations")
        .insert({
          user_id: user.id,
          team_id: activeTeam?.id || null,
          name: loc.name,
          address_street: loc.address_street,
          address_city: loc.address_city,
          address_state: loc.address_state,
          address_zip: loc.address_zip,
          address_country: loc.address_country,
          phone: loc.phone,
          email: loc.email,
          website: loc.website,
          business_type: loc.business_type,
          latitude: loc.latitude || null,
          longitude: loc.longitude || null,
          opening_hours: loc.opening_hours,
        })
        .select()
        .single();

      if (data) {
        setLocations((prev) =>
          prev.map((l) => (l._tempId === loc._tempId ? data : l))
        );
      }
    }
  }

  async function handleDelete(id, tempId) {
    if (!id) {
      // Remove unsaved new location by tempId
      setLocations((prev) => prev.filter((l) => l._tempId !== tempId));
      return;
    }

    await supabase.from("business_locations").delete().eq("id", id);
    setLocations((prev) => prev.filter((l) => l.id !== id));
  }

  function handleAddLocation() {
    setLocations((prev) => [...prev, {
      ...EMPTY_LOCATION,
      website: activeProject?.domain ? `https://${activeProject.domain}` : "",
      _tempId: crypto.randomUUID(),
    }]);
  }

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Local SEO Manager</h1>
          <p className="text-muted-foreground mt-1">
            Manage business locations, generate schema markup, and optimize for local search.
          </p>
        </div>
        <button
          onClick={handleAddLocation}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          Add Location
        </button>
      </div>

      {/* Feature summary */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <BuildingIcon className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Locations</span>
          </div>
          <p className="text-2xl font-semibold">{locations.filter((l) => l.id).length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <CodeIcon className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Schema Ready</span>
          </div>
          <p className="text-2xl font-semibold">
            {locations.filter((l) => l.name && l.address_street).length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <ClockIcon className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Hours Set</span>
          </div>
          <p className="text-2xl font-semibold">
            {locations.filter((l) => l.opening_hours?.some((h) => !h.closed)).length}
          </p>
        </div>
      </div>

      {/* Location cards */}
      {loading ? (
        <div className="flex justify-center py-12">
          <p className="text-sm text-muted-foreground">Loading locations...</p>
        </div>
      ) : locations.length > 0 ? (
        <div className="flex flex-col gap-3">
          {locations.map((loc) => (
            <LocationCard
              key={loc.id || loc._tempId}
              location={loc}
              onSave={handleSave}
              onDelete={handleDelete}
              isNew={!loc.id}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border p-12">
          <div className="text-center">
            <MapPinIcon className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <h3 className="mt-3 font-medium">No locations yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your first business location to generate local SEO schema markup.
            </p>
            <button
              onClick={handleAddLocation}
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              Add Location
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
