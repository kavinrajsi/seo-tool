"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { logError } from "@/lib/logger";
import { useTeam } from "@/lib/team-context";
import { useProject } from "@/lib/project-context";
import { QR_TYPES } from "@/lib/qr-types";
import {
  DownloadIcon,
  CopyIcon,
  CheckIcon,
  PaletteIcon,
  SaveIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";

const DOT_STYLES = ["square", "dots", "rounded", "extra-rounded", "classy", "classy-rounded"];
const CORNER_STYLES = ["square", "dot", "extra-rounded"];

export default function QrGenerator() {
  const router = useRouter();
  const { activeTeam } = useTeam();
  const { activeProject } = useProject();
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(1);
  const [editingId, setEditingId] = useState(null);

  // Step 1
  const [activeType, setActiveType] = useState("");

  // Step 1 content
  const [formData, setFormData] = useState({});
  const [label, setLabel] = useState("");
  const [utmSource, setUtmSource] = useState("");
  const [utmMedium, setUtmMedium] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");

  // Step 3
  const [fgColor, setFgColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [dotStyle, setDotStyle] = useState("square");
  const [cornerStyle, setCornerStyle] = useState("square");
  const [size, setSize] = useState(300);
  const [margin, setMargin] = useState(10);
  const [logoUrl, setLogoUrl] = useState("");

  // Output
  const qrRef = useRef(null);
  const qrInstanceRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser(data.user);
    });

    // Load QR code for editing from localStorage
    const editData = localStorage.getItem("editQR");
    if (editData) {
      localStorage.removeItem("editQR");
      try {
        const qr = JSON.parse(editData);
        setEditingId(qr.id);
        setActiveType(qr.type || qr.qr_type || "");
        setFormData(qr.data || {});
        setLabel(qr.label || qr.name || "");
        setUtmSource(qr.utm_source || "");
        setUtmMedium(qr.utm_medium || "");
        setUtmCampaign(qr.utm_campaign || "");
        const opts = qr.options || {};
        if (opts.fgColor) setFgColor(opts.fgColor);
        if (opts.bgColor) setBgColor(opts.bgColor);
        if (opts.dotStyle) setDotStyle(opts.dotStyle);
        if (opts.cornerStyle) setCornerStyle(opts.cornerStyle);
        if (opts.size) setSize(opts.size);
        if (opts.margin !== undefined) setMargin(opts.margin);
        if (opts.logoUrl) setLogoUrl(opts.logoUrl);
        setStep(1);
      } catch (err) { logError("qr-generator/load-edit-qr", err); }
    }
  }, []);

  const currentType = QR_TYPES.find((t) => t.value === activeType);

  // Generate QR code
  const generateQR = useCallback(async () => {
    if (!currentType) return;
    const encoded = currentType.encode(formData);
    if (!encoded) return;

    const QRCodeStyling = (await import("qr-code-styling")).default;
    if (qrRef.current) qrRef.current.innerHTML = "";

    const qrCode = new QRCodeStyling({
      width: size, height: size, data: encoded, margin,
      dotsOptions: { color: fgColor, type: dotStyle },
      backgroundOptions: { color: bgColor },
      cornersSquareOptions: { type: cornerStyle },
      cornersDotOptions: { type: cornerStyle === "square" ? "square" : "dot" },
      imageOptions: { crossOrigin: "anonymous", margin: 5 },
      ...(logoUrl ? { image: logoUrl } : {}),
    });
    qrInstanceRef.current = qrCode;
    if (qrRef.current) qrCode.append(qrRef.current);
  }, [currentType, formData, fgColor, bgColor, dotStyle, cornerStyle, size, margin, logoUrl]);

  // Regenerate when on step 2
  useEffect(() => {
    if (step < 2 || !currentType) return;
    const encoded = currentType.encode(formData);
    if (encoded) {
      const timer = setTimeout(generateQR, 300);
      return () => clearTimeout(timer);
    }
  }, [step, formData, fgColor, bgColor, dotStyle, cornerStyle, size, margin, logoUrl, generateQR, currentType]);

  function updateField(name, value) {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogoUrl(ev.target.result);
    reader.readAsDataURL(file);
  }

  async function handleDownload(format) {
    if (!qrInstanceRef.current) return;
    await qrInstanceRef.current.download({ name: `qr-${activeType}-${Date.now()}`, extension: format });
  }

  async function handleCopy() {
    if (!qrRef.current) return;
    const canvas = qrRef.current.querySelector("canvas");
    if (!canvas) return;
    try {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) { logError("qr-generator/copy-to-clipboard", err); setError("Copy failed — try downloading instead"); }
  }

  async function handleSave() {
    if (!user) return;
    setError("");
    const encoded = currentType?.encode(formData);
    if (!encoded) { setError("Generate a QR code first"); return; }

    const qrName = label || currentType.label;
    const payload = {
      name: qrName,
      qr_type: activeType,
      destination_url: encoded,
      content_data: formData,
      qr_color: fgColor,
      bg_color: bgColor,
      dot_style: dotStyle,
      corner_style: cornerStyle,
      logo_url: logoUrl || null,
      frame_color: fgColor,
      utm_source: utmSource || null,
      utm_medium: utmMedium || null,
      utm_campaign: utmCampaign || null,
      type: activeType,
      label: qrName,
      data: formData,
      options: { fgColor, bgColor, dotStyle, cornerStyle, size, margin, logoUrl: logoUrl || null },
    };

    let inserted;
    if (editingId) {
      // Update existing QR code
      const { data, error: updateErr } = await supabase.from("qr_codes")
        .update(payload)
        .eq("id", editingId)
        .select().single();
      if (updateErr) { setError(updateErr.message); return; }
      inserted = data;
    } else {
      // Create new QR code
      const slug = `${activeType}-${Date.now()}`;
      const { data, error: insertErr } = await supabase.from("qr_codes").insert({
        ...payload,
        user_id: user.id,
        team_id: activeTeam?.id || null,
        project_id: activeProject?.id || null,
        slug,
        logo_size: 0.2,
        is_dynamic: false,
        is_active: true,
        outer_frame: "none",
        frame_label: "",
        label_font: "sans-serif",
      }).select().single();
      if (insertErr) { setError(insertErr.message); return; }
      inserted = data;
    }

    if (!inserted) { setError("Save failed"); return; }

    if (inserted) {
      // For vCard with photo: update destination_url with hosted photo URL
      if (activeType === "vcard" && formData.photo && formData.photo.startsWith("data:")) {
        const photoUrl = `${window.location.origin}/api/qr/photo/${inserted.id}`;
        const vcardWithPhoto = encoded.replace(
          "END:VCARD",
          `PHOTO;VALUE=URI:${photoUrl}\nEND:VCARD`
        );
        await supabase.from("qr_codes").update({ destination_url: vcardWithPhoto }).eq("id", inserted.id);
      }

      // Log "created" analytics event
      supabase.rpc("track_qr_event", {
        p_qr_code_id: inserted.id,
        p_event_type: "created",
        p_utm_source: utmSource || null,
        p_utm_medium: utmMedium || null,
        p_utm_campaign: utmCampaign || null,
      });
    }

    router.push("/qr-generator/all");
  }

  // Validation
  function validateField(field, value) {
    if (field.required && !value) return `${field.label} is required`;
    if (field.type === "url" && value && !/^https:\/\/.+/.test(value)) return "URL must start with https://";
    if (field.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Enter a valid email";
    if (field.type === "tel" && value && !/^[+]?[\d\s()-]+$/.test(value)) return "Enter a valid phone number";
    return null;
  }

  function canGoNext() {
    if (step === 1) {
      if (!activeType || !currentType || !label.trim()) return false;
      const requiredFields = currentType.fields.filter(f => f.required);
      return requiredFields.every(f => formData[f.name]);
    }
    return true;
  }

  const STEPS = [
    { num: 1, label: "Type & Content" },
    { num: 2, label: "Design & Download" },
  ];

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {editingId ? "Edit QR Code" : "QR Code Generator"}
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {editingId ? "Update your QR code details and design." : "Create a QR code in 2 simple steps."}
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.num} className="flex items-center gap-2">
            <button
              onClick={() => { if (s.num < step || (s.num === step)) return; if (s.num <= step) setStep(s.num); }}
              disabled={s.num > step}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                step === s.num
                  ? "bg-primary text-primary-foreground"
                  : s.num < step
                    ? "bg-primary/10 text-primary cursor-pointer"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                step === s.num ? "bg-primary-foreground/20" : s.num < step ? "bg-primary/20" : "bg-muted-foreground/20"
              }`}>
                {s.num < step ? "✓" : s.num}
              </span>
              {s.label}
            </button>
            {i < STEPS.length - 1 && <div className={`h-px w-6 ${s.num < step ? "bg-primary/40" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      {/* Step 1: Type & Content */}
      {step === 1 && (
        <>
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-medium mb-4">What kind of QR code do you need?</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {QR_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => { setActiveType(t.value); setFormData({}); setLabel(""); }}
                className={`flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors ${
                  activeType === t.value
                    ? "border-primary bg-primary/5"
                    : "border-border/50 hover:border-border hover:bg-accent/30"
                }`}
              >
                <span className="text-2xl">{t.icon}</span>
                <span className="text-xs font-medium">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {currentType && (
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-medium mb-4">
            {currentType.icon} Enter {currentType.label} details
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Label <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="My QR Code"
                required
                className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            {currentType.fields.map((field) => {
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
                      {field.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                );
              }
              if (field.type === "file") {
                return (
                  <div key={field.name}>
                    <label className="text-xs text-muted-foreground mb-1 block">{field.label}</label>
                    <input
                      type="file"
                      accept={field.accept || "image/*"}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => updateField(field.name, ev.target.result);
                        reader.readAsDataURL(file);
                      }}
                      className="text-xs file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary hover:file:bg-primary/20"
                    />
                    {val && (
                      <div className="mt-2 flex items-center gap-3">
                        <img src={val} alt="Preview" className="h-12 w-12 rounded-full object-cover border border-border" />
                        <button onClick={() => updateField(field.name, "")} className="text-xs text-red-400 hover:underline">Remove</button>
                      </div>
                    )}
                  </div>
                );
              }
              if (field.type === "checkbox") {
                return (
                  <label key={field.name} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={!!val} onChange={(e) => updateField(field.name, e.target.checked)} className="rounded" />
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

            {/* UTM Tracking */}
            <div className="border-t border-border pt-3 mt-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">UTM Tracking (optional)</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Source</label>
                  <input type="text" value={utmSource} onChange={(e) => setUtmSource(e.target.value)} placeholder="e.g. instagram"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Medium</label>
                  <input type="text" value={utmMedium} onChange={(e) => setUtmMedium(e.target.value)} placeholder="e.g. qr_code"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Campaign</label>
                  <input type="text" value={utmCampaign} onChange={(e) => setUtmCampaign(e.target.value)} placeholder="e.g. spring_sale"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
              </div>
            </div>
          </div>
        </div>
        )}
        </>
      )}

      {/* Step 2: Design & Download */}
      {step === 2 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
              <PaletteIcon className="h-4 w-4 text-muted-foreground" />
              Customize Design
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Foreground</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={fgColor} onChange={(e) => setFgColor(e.target.value)} className="h-8 w-8 rounded cursor-pointer border-0" />
                    <input type="text" value={fgColor} onChange={(e) => setFgColor(e.target.value)} className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-mono" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Background</label>
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
                    <button key={s} onClick={() => setDotStyle(s)}
                      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${dotStyle === s ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent/30"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Corner Style</label>
                <div className="flex flex-wrap gap-1.5">
                  {CORNER_STYLES.map((s) => (
                    <button key={s} onClick={() => setCornerStyle(s)}
                      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${cornerStyle === s ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent/30"}`}>
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
                <input type="file" accept="image/*" onChange={handleLogoUpload}
                  className="text-xs file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary hover:file:bg-primary/20" />
                {logoUrl && (
                  <button onClick={() => setLogoUrl("")} className="text-xs text-red-400 hover:underline mt-1 block">Remove logo</button>
                )}
              </div>
            </div>
          </div>

          {/* Preview & Download */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-medium mb-4">Preview</h3>
            <div className="flex items-center justify-center rounded-lg border border-border p-6 min-h-[320px]" style={{ backgroundColor: bgColor }}>
              <div ref={qrRef} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
              <button onClick={() => handleDownload("png")}
                className="rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2">
                <DownloadIcon className="h-4 w-4" /> PNG
              </button>
              <button onClick={() => handleDownload("svg")}
                className="rounded-md border border-border px-4 py-2.5 text-sm font-medium hover:bg-accent flex items-center justify-center gap-2">
                <DownloadIcon className="h-4 w-4" /> SVG
              </button>
              <button onClick={handleCopy}
                className="rounded-md border border-border px-4 py-2.5 text-sm font-medium hover:bg-accent flex items-center justify-center gap-2">
                {copied ? <CheckIcon className="h-4 w-4 text-green-400" /> : <CopyIcon className="h-4 w-4" />}
                {copied ? "Copied!" : "Copy"}
              </button>
              <button onClick={handleSave}
                className="rounded-md border border-border px-4 py-2.5 text-sm font-medium hover:bg-accent flex items-center justify-center gap-2">
                <SaveIcon className="h-4 w-4" /> {editingId ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent flex items-center gap-2 disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronLeftIcon className="h-4 w-4" /> Back
        </button>

        {step < 2 ? (
          <button
            onClick={() => setStep(2)}
            disabled={!canGoNext()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 flex items-center gap-2 disabled:opacity-30 disabled:pointer-events-none"
          >
            Next <ChevronRightIcon className="h-4 w-4" />
          </button>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
