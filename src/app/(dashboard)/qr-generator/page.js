"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useTeam } from "@/lib/team-context";
import { QR_TYPES, PRESETS } from "@/lib/qr-types";
import {
  DownloadIcon,
  CopyIcon,
  CheckIcon,
  TrashIcon,
  PaletteIcon,
  HistoryIcon,
  SparklesIcon,
  ShareIcon,
} from "lucide-react";

const DOT_STYLES = ["square", "dots", "rounded", "extra-rounded", "classy", "classy-rounded"];
const CORNER_STYLES = ["square", "dot", "extra-rounded"];

export default function QrGenerator() {
  const router = useRouter();
  const { activeTeam } = useTeam();
  const [user, setUser] = useState(null);
  const [activeType, setActiveType] = useState("link");
  const [formData, setFormData] = useState({});
  const [label, setLabel] = useState("");

  // Customization
  const [fgColor, setFgColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [dotStyle, setDotStyle] = useState("square");
  const [cornerStyle, setCornerStyle] = useState("square");
  const [size, setSize] = useState(300);
  const [margin, setMargin] = useState(10);
  const [logoFile, setLogoFile] = useState(null);
  const [logoUrl, setLogoUrl] = useState("");

  // Output
  const qrRef = useRef(null);
  const qrInstanceRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  // History
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push("/signin");
      else setUser(data.user);
    });
    loadHistory();
  }, [router, activeTeam]);

  async function loadHistory() {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) return;

    let query = supabase
      .from("qr_codes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (activeTeam) {
      query = query.eq("team_id", activeTeam.id);
    } else {
      query = query.eq("user_id", u.id).is("team_id", null);
    }

    const { data } = await query;
    if (data) setHistory(data);
  }

  // Generate QR code
  const generateQR = useCallback(async () => {
    const typeConfig = QR_TYPES.find((t) => t.value === activeType);
    if (!typeConfig) return;

    const encoded = typeConfig.encode(formData);
    if (!encoded) return;

    // Dynamic import of qr-code-styling (browser only)
    const QRCodeStyling = (await import("qr-code-styling")).default;

    // Clean up previous instance
    if (qrRef.current) {
      qrRef.current.innerHTML = "";
    }

    const options = {
      width: size,
      height: size,
      data: encoded,
      margin,
      dotsOptions: {
        color: fgColor,
        type: dotStyle,
      },
      backgroundOptions: {
        color: bgColor,
      },
      cornersSquareOptions: {
        type: cornerStyle,
      },
      cornersDotOptions: {
        type: cornerStyle === "square" ? "square" : "dot",
      },
      imageOptions: {
        crossOrigin: "anonymous",
        margin: 5,
      },
    };

    if (logoUrl) {
      options.image = logoUrl;
    }

    const qrCode = new QRCodeStyling(options);
    qrInstanceRef.current = qrCode;

    if (qrRef.current) {
      qrCode.append(qrRef.current);
    }
  }, [activeType, formData, fgColor, bgColor, dotStyle, cornerStyle, size, margin, logoUrl]);

  // Regenerate on changes
  useEffect(() => {
    const typeConfig = QR_TYPES.find((t) => t.value === activeType);
    if (!typeConfig) return;
    const encoded = typeConfig.encode(formData);
    if (encoded) {
      const timer = setTimeout(generateQR, 300);
      return () => clearTimeout(timer);
    }
  }, [activeType, formData, fgColor, bgColor, dotStyle, cornerStyle, size, margin, logoUrl, generateQR]);

  // Handle logo file upload
  function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoUrl(ev.target.result);
    reader.readAsDataURL(file);
  }

  // Download
  async function handleDownload(format) {
    if (!qrInstanceRef.current) return;
    await qrInstanceRef.current.download({
      name: `qr-${activeType}-${Date.now()}`,
      extension: format,
    });
  }

  // Copy to clipboard
  async function handleCopy() {
    if (!qrRef.current) return;
    const canvas = qrRef.current.querySelector("canvas");
    if (!canvas) return;

    try {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copy failed — try downloading instead");
    }
  }

  // Save to Supabase
  async function handleSave() {
    if (!user) return;
    setError("");

    const typeConfig = QR_TYPES.find((t) => t.value === activeType);
    const encoded = typeConfig?.encode(formData);
    if (!encoded) { setError("Generate a QR code first"); return; }

    const { error: insertErr } = await supabase.from("qr_codes").insert({
      user_id: user.id,
      team_id: activeTeam?.id || null,
      type: activeType,
      label: label || typeConfig.label,
      data: formData,
      options: { fgColor, bgColor, dotStyle, cornerStyle, size, margin },
    });

    if (insertErr) setError(insertErr.message);
    else loadHistory();
  }

  // Load from history
  function loadFromHistory(item) {
    setActiveType(item.type);
    setFormData(item.data || {});
    setLabel(item.label || "");
    if (item.options) {
      setFgColor(item.options.fgColor || "#000000");
      setBgColor(item.options.bgColor || "#ffffff");
      setDotStyle(item.options.dotStyle || "square");
      setCornerStyle(item.options.cornerStyle || "square");
      setSize(item.options.size || 300);
      setMargin(item.options.margin || 10);
    }
    setShowHistory(false);
  }

  // Load preset
  function loadPreset(preset) {
    setActiveType(preset.type);
    setFormData(preset.data);
    setLabel(preset.name);
  }

  // Delete from history
  async function handleDeleteHistory(id) {
    await supabase.from("qr_codes").delete().eq("id", id);
    loadHistory();
  }

  function updateField(name, value) {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  const currentType = QR_TYPES.find((t) => t.value === activeType);

  // Validation
  function validateField(field, value) {
    if (field.required && !value) return `${field.label} is required`;
    if (field.type === "url" && value && !/^https?:\/\/.+/.test(value)) return "Enter a valid URL";
    if (field.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Enter a valid email";
    if (field.type === "tel" && value && !/^[+]?[\d\s()-]+$/.test(value)) return "Enter a valid phone number";
    return null;
  }

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">QR Code Generator</h1>
          <p className="text-muted-foreground mt-1">Generate customizable QR codes for any purpose.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent flex items-center gap-2"
          >
            <HistoryIcon className="h-4 w-4" />
            History ({history.length})
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      {/* Presets */}
      <div className="flex gap-2 flex-wrap">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            onClick={() => loadPreset(p)}
            className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent flex items-center gap-1.5"
          >
            <SparklesIcon className="h-3 w-3" />
            {p.name}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Type selector */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">Type</p>
            <div className="space-y-0.5 max-h-[500px] overflow-y-auto">
              {QR_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => { setActiveType(t.value); setFormData({}); }}
                  className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left transition-colors ${
                    activeType === t.value ? "bg-primary/10 text-primary" : "hover:bg-accent/30"
                  }`}
                >
                  <span className="text-sm">{t.icon}</span>
                  <span className="text-xs font-medium">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Middle: Form */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-medium mb-4">
              {currentType?.icon} {currentType?.label}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Label (optional)</label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="My QR Code"
                  className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {currentType?.fields.map((field) => {
                const val = formData[field.name] || "";
                const err = val ? validateField(field, val) : null;

                if (field.type === "textarea") {
                  return (
                    <div key={field.name}>
                      <label className="text-xs text-muted-foreground mb-1 block">{field.label}</label>
                      <textarea
                        value={val}
                        onChange={(e) => updateField(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        rows={3}
                        className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
                      />
                      {err && <p className="text-xs text-red-400 mt-1">{err}</p>}
                    </div>
                  );
                }

                if (field.type === "select") {
                  return (
                    <div key={field.name}>
                      <label className="text-xs text-muted-foreground mb-1 block">{field.label}</label>
                      <select
                        value={val}
                        onChange={(e) => updateField(field.name, e.target.value)}
                        className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm"
                      >
                        <option value="">Select...</option>
                        {field.options?.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </div>
                  );
                }

                if (field.type === "checkbox") {
                  return (
                    <label key={field.name} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!val}
                        onChange={(e) => updateField(field.name, e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">{field.label}</span>
                    </label>
                  );
                }

                return (
                  <div key={field.name}>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      {field.label} {field.required && <span className="text-red-400">*</span>}
                    </label>
                    <input
                      type={field.type}
                      value={val}
                      onChange={(e) => updateField(field.name, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    {err && <p className="text-xs text-red-400 mt-1">{err}</p>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Customization panel */}
          <div className="rounded-lg border border-border bg-card">
            <button
              onClick={() => setShowCustomize(!showCustomize)}
              className="flex w-full items-center justify-between p-5 text-left"
            >
              <h3 className="text-sm font-medium flex items-center gap-2">
                <PaletteIcon className="h-4 w-4 text-muted-foreground" />
                Design & Customize
              </h3>
              <span className="text-xs text-muted-foreground">{showCustomize ? "▴" : "▾"}</span>
            </button>

            {showCustomize && (
              <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Foreground Color</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={fgColor} onChange={(e) => setFgColor(e.target.value)} className="h-8 w-8 rounded cursor-pointer border-0" />
                      <input type="text" value={fgColor} onChange={(e) => setFgColor(e.target.value)} className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-mono" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Background Color</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="h-8 w-8 rounded cursor-pointer border-0" />
                      <input type="text" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-mono" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Dot Style</label>
                  <div className="flex flex-wrap gap-1.5">
                    {DOT_STYLES.map((s) => (
                      <button
                        key={s}
                        onClick={() => setDotStyle(s)}
                        className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                          dotStyle === s ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent/30"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Corner Style</label>
                  <div className="flex flex-wrap gap-1.5">
                    {CORNER_STYLES.map((s) => (
                      <button
                        key={s}
                        onClick={() => setCornerStyle(s)}
                        className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                          cornerStyle === s ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent/30"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Size: {size}px</label>
                    <input type="range" min={150} max={600} step={10} value={size} onChange={(e) => setSize(Number(e.target.value))} className="w-full" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Margin: {margin}px</label>
                    <input type="range" min={0} max={50} step={5} value={margin} onChange={(e) => setMargin(Number(e.target.value))} className="w-full" />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Logo (center)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="text-xs file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary hover:file:bg-primary/20"
                  />
                  {logoUrl && (
                    <button
                      onClick={() => { setLogoFile(null); setLogoUrl(""); }}
                      className="text-xs text-red-400 hover:underline mt-1"
                    >
                      Remove logo
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Preview + Actions */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-medium mb-4">Preview</h3>

            <div
              className="flex items-center justify-center rounded-lg border border-border p-4 min-h-[320px]"
              style={{ backgroundColor: bgColor }}
            >
              <div ref={qrRef} />
              {!qrInstanceRef.current && (
                <p className="text-sm text-muted-foreground">Fill in the form to generate a QR code</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 mt-4">
              <button onClick={() => handleDownload("png")} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 flex items-center gap-2">
                <DownloadIcon className="h-4 w-4" /> PNG
              </button>
              <button onClick={() => handleDownload("svg")} className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent flex items-center gap-2">
                <DownloadIcon className="h-4 w-4" /> SVG
              </button>
              <button onClick={handleCopy} className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent flex items-center gap-2">
                {copied ? <CheckIcon className="h-4 w-4 text-green-400" /> : <CopyIcon className="h-4 w-4" />}
                {copied ? "Copied!" : "Copy"}
              </button>
              <button onClick={handleSave} className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent flex items-center gap-2">
                <ShareIcon className="h-4 w-4" /> Save
              </button>
            </div>
          </div>

          {/* History */}
          {showHistory && history.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                <HistoryIcon className="h-4 w-4 text-muted-foreground" />
                Saved QR Codes
              </h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {history.map((item) => {
                  const typeConfig = QR_TYPES.find((t) => t.value === item.type);
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-md border border-border/50 px-4 py-3"
                    >
                      <button
                        onClick={() => loadFromHistory(item)}
                        className="flex items-center gap-3 text-left flex-1 min-w-0"
                      >
                        <span className="text-base">{typeConfig?.icon || "📱"}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{item.label || typeConfig?.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(item.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </button>
                      <button
                        onClick={() => handleDeleteHistory(item.id)}
                        className="rounded p-1.5 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 shrink-0"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
