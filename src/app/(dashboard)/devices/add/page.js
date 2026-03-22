"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  DEVICE_TYPES, RAM_SIZES, RAM_TYPES, STORAGE_SIZES, STORAGE_TYPES,
  DISPLAY_TYPES, GPU_TYPES, WIFI_STANDARDS, BT_VERSIONS, CONNECTION_TYPES,
  COMPATIBILITY, isLaptop, isMobileOrTablet, isPeripheral,
} from "@/lib/device-constants";
import QRCode from "qrcode";
import {
  MonitorIcon, CpuIcon, HardDriveIcon, MonitorSmartphoneIcon,
  BatteryIcon, WifiIcon, PaletteIcon, CheckCircleIcon, LoaderIcon, ChevronDownIcon,
} from "lucide-react";

function Field({ label, required, error, note, children }) {
  return (
    <div>
      <label className="text-xs font-medium mb-1 block">{label} {required && <span className="text-red-400">*</span>}</label>
      {children}
      {note && !error && <p className="text-[10px] text-muted-foreground mt-1">{note}</p>}
      {error && <p className="text-[10px] text-red-400 mt-1">{error}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder, error, disabled, className = "" }) {
  return <input type="text" value={value} onChange={onChange} placeholder={placeholder} disabled={disabled} className={`w-full rounded-md border px-3 py-2 text-sm bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 ${error ? "border-red-400" : "border-border"} ${className}`} />;
}

function Select({ value, onChange, options, placeholder, error }) {
  return (
    <select value={value} onChange={onChange} className={`w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 ${error ? "border-red-400" : "border-border"} ${!value ? "text-muted-foreground" : ""}`}>
      <option value="">{placeholder || "Select..."}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function Section({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors">
        <span className="text-sm font-medium flex items-center gap-2">{Icon && <Icon size={14} className="text-muted-foreground" />} {title}</span>
        <ChevronDownIcon size={14} className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">{children}</div>}
    </div>
  );
}

export default function AddDevice() {
  const router = useRouter();
  const [vendors, setVendors] = useState([]);

  useEffect(() => {
    supabase.from("device_vendors").select("name").order("name").then(({ data }) => {
      if (data) setVendors(data.map((v) => v.name));
    });
  }, []);

  const [form, setForm] = useState({
    serial_number: "", device_type: "", vendor: "", model_name: "", purchase_date: "",
  });
  const [specs, setSpecs] = useState({});
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serialError, setSerialError] = useState("");

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  }

  function setSpec(field, value) {
    setSpecs((prev) => ({ ...prev, [field]: value }));
  }

  async function checkSerial() {
    if (!form.serial_number.trim()) return;
    const { data } = await supabase
      .from("devices")
      .select("device_id, device_type, model_name")
      .eq("serial_number", form.serial_number.trim())
      .maybeSingle();
    if (data) {
      setSerialError(`Serial number already registered to ${data.device_id} — ${data.device_type} ${data.model_name}`);
    } else {
      setSerialError("");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.serial_number.trim()) errs.serial_number = "Required";
    if (!form.device_type) errs.device_type = "Required";
    if (!form.vendor) errs.vendor = "Required";
    if (!form.model_name.trim()) errs.model_name = "Required";
    if (serialError) errs.serial_number = serialError;
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);

    // Build QR data
    const qrPayload = {
      serial: form.serial_number, type: form.device_type, vendor: form.vendor,
      model: form.model_name, specs,
    };
    let qrData = "";
    try { qrData = await QRCode.toDataURL(JSON.stringify(qrPayload), { width: 200 }); } catch {}

    const row = {
      serial_number: form.serial_number.trim(),
      device_type: form.device_type,
      vendor: form.vendor,
      model_name: form.model_name.trim(),
      purchase_date: form.purchase_date || null,
      status: "Available",
      specs,
      qr_data: qrData,
    };

    const { data, error } = await supabase.from("devices").insert(row).select("id").single();
    if (error) {
      if (error.message?.includes("devices_serial_number_key")) {
        setSerialError("This serial number is already registered.");
      }
      setSubmitting(false);
      return;
    }

    router.push(`/devices/${data.id}`);
  }

  const type = form.device_type;

  return (
    <div className="flex flex-1 flex-col gap-6 py-4 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add New Device</h1>
        <p className="text-muted-foreground mt-1 text-sm">Register a new device in the system.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Info */}
        <Section title="Device Information" icon={MonitorIcon}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Serial Number" required error={errors.serial_number || serialError}>
              <Input value={form.serial_number} onChange={(e) => { set("serial_number", e.target.value); setSerialError(""); }} placeholder="Enter serial number" error={errors.serial_number || serialError} />
              <button type="button" onClick={checkSerial} className="text-[10px] text-primary hover:underline mt-1">Check availability</button>
            </Field>
            <Field label="Device Type" required error={errors.device_type}>
              <Select value={form.device_type} onChange={(e) => { set("device_type", e.target.value); setSpecs({}); }} options={DEVICE_TYPES} placeholder="Select type" error={errors.device_type} />
            </Field>
            <Field label="Vendor" required error={errors.vendor}>
              <Select value={form.vendor} onChange={(e) => set("vendor", e.target.value)} options={vendors} placeholder="Select vendor" error={errors.vendor} />
            </Field>
            <Field label="Model Name" required error={errors.model_name}>
              <Input value={form.model_name} onChange={(e) => set("model_name", e.target.value)} placeholder="e.g. MacBook Pro 14" error={errors.model_name} />
            </Field>
            <Field label="Purchase Date">
              <Input value={form.purchase_date} onChange={(e) => set("purchase_date", e.target.value)} placeholder="DD-MM-YYYY" />
            </Field>
          </div>
        </Section>

        {/* Laptop Specs */}
        {isLaptop(type) && (
          <>
            <Section title="Processor" icon={CpuIcon} defaultOpen={false}>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Processor Brand"><Input value={specs.proc_brand || ""} onChange={(e) => setSpec("proc_brand", e.target.value)} placeholder="e.g. Apple Silicon" /></Field>
                <Field label="Processor Model"><Input value={specs.proc_model || ""} onChange={(e) => setSpec("proc_model", e.target.value)} placeholder="e.g. M3 Pro" /></Field>
                <Field label="Number of Cores"><Input value={specs.proc_cores || ""} onChange={(e) => setSpec("proc_cores", e.target.value)} placeholder="e.g. 12" /></Field>
                <Field label="Clock Speed"><Input value={specs.proc_speed || ""} onChange={(e) => setSpec("proc_speed", e.target.value)} placeholder="e.g. 3.7 GHz" /></Field>
              </div>
            </Section>
            <Section title="Memory & Storage" icon={HardDriveIcon} defaultOpen={false}>
              <div className="grid grid-cols-2 gap-3">
                <Field label="RAM Size"><Select value={specs.ram_size || ""} onChange={(e) => setSpec("ram_size", e.target.value)} options={RAM_SIZES} placeholder="Select" /></Field>
                <Field label="RAM Type"><Select value={specs.ram_type || ""} onChange={(e) => setSpec("ram_type", e.target.value)} options={RAM_TYPES} placeholder="Select" /></Field>
                <Field label="Storage Capacity"><Select value={specs.storage_size || ""} onChange={(e) => setSpec("storage_size", e.target.value)} options={STORAGE_SIZES} placeholder="Select" /></Field>
                <Field label="Storage Type"><Select value={specs.storage_type || ""} onChange={(e) => setSpec("storage_type", e.target.value)} options={STORAGE_TYPES} placeholder="Select" /></Field>
              </div>
            </Section>
            <Section title="Display & Graphics" icon={MonitorSmartphoneIcon} defaultOpen={false}>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Screen Size"><Input value={specs.screen_size || ""} onChange={(e) => setSpec("screen_size", e.target.value)} placeholder='e.g. 14"' /></Field>
                <Field label="Resolution"><Input value={specs.resolution || ""} onChange={(e) => setSpec("resolution", e.target.value)} placeholder="e.g. 3024x1964" /></Field>
                <Field label="Display Type"><Select value={specs.display_type || ""} onChange={(e) => setSpec("display_type", e.target.value)} options={DISPLAY_TYPES} placeholder="Select" /></Field>
                <Field label="GPU Type"><Select value={specs.gpu_type || ""} onChange={(e) => setSpec("gpu_type", e.target.value)} options={GPU_TYPES} placeholder="Select" /></Field>
                <Field label="GPU Model"><Input value={specs.gpu_model || ""} onChange={(e) => setSpec("gpu_model", e.target.value)} placeholder="e.g. Apple M3 Pro GPU" /></Field>
                {specs.gpu_type === "Dedicated" && <Field label="VRAM"><Input value={specs.vram || ""} onChange={(e) => setSpec("vram", e.target.value)} placeholder="e.g. 8GB" /></Field>}
              </div>
            </Section>
            <Section title="Connectivity" icon={WifiIcon} defaultOpen={false}>
              <div className="grid grid-cols-2 gap-3">
                <Field label="USB-A Ports"><Input value={specs.usb_a || ""} onChange={(e) => setSpec("usb_a", e.target.value)} placeholder="0" /></Field>
                <Field label="USB-C / Thunderbolt Ports"><Input value={specs.usb_c || ""} onChange={(e) => setSpec("usb_c", e.target.value)} placeholder="3" /></Field>
                <Field label="HDMI"><Select value={specs.hdmi || ""} onChange={(e) => setSpec("hdmi", e.target.value)} options={["Yes", "No"]} placeholder="Select" /></Field>
                <Field label="SD Card Slot"><Select value={specs.sd_slot || ""} onChange={(e) => setSpec("sd_slot", e.target.value)} options={["Yes", "No"]} placeholder="Select" /></Field>
                <Field label="Ethernet Port"><Select value={specs.ethernet || ""} onChange={(e) => setSpec("ethernet", e.target.value)} options={["Yes", "No"]} placeholder="Select" /></Field>
                <Field label="WiFi Standard"><Select value={specs.wifi || ""} onChange={(e) => setSpec("wifi", e.target.value)} options={WIFI_STANDARDS} placeholder="Select" /></Field>
                <Field label="Bluetooth Version"><Select value={specs.bluetooth || ""} onChange={(e) => setSpec("bluetooth", e.target.value)} options={BT_VERSIONS} placeholder="Select" /></Field>
              </div>
            </Section>
            <Section title="Battery & OS" icon={BatteryIcon} defaultOpen={false}>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Battery Capacity"><Input value={specs.battery || ""} onChange={(e) => setSpec("battery", e.target.value)} placeholder="e.g. 72Wh" /></Field>
                <Field label="Battery Life"><Input value={specs.battery_life || ""} onChange={(e) => setSpec("battery_life", e.target.value)} placeholder="e.g. Up to 18 hours" /></Field>
                <Field label="Charger Wattage"><Input value={specs.charger || ""} onChange={(e) => setSpec("charger", e.target.value)} placeholder="e.g. 96W" /></Field>
                <Field label="OS"><Input value={specs.os || ""} onChange={(e) => setSpec("os", e.target.value)} placeholder="e.g. macOS Sonoma" /></Field>
                <Field label="OS Version"><Input value={specs.os_version || ""} onChange={(e) => setSpec("os_version", e.target.value)} placeholder="e.g. 14.2.1" /></Field>
              </div>
            </Section>
            <Section title="Physical" icon={PaletteIcon} defaultOpen={false}>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Color"><Input value={specs.color || ""} onChange={(e) => setSpec("color", e.target.value)} placeholder="e.g. Space Gray" /></Field>
                <Field label="Weight"><Input value={specs.weight || ""} onChange={(e) => setSpec("weight", e.target.value)} placeholder="e.g. 1.6 kg" /></Field>
                <Field label="Warranty Expiry"><Input value={specs.warranty || ""} onChange={(e) => setSpec("warranty", e.target.value)} placeholder="DD-MM-YYYY" /></Field>
              </div>
            </Section>
          </>
        )}

        {/* iPad / Phone Specs */}
        {isMobileOrTablet(type) && (
          <Section title={`${type} Specifications`} icon={MonitorSmartphoneIcon} defaultOpen={false}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Screen Size"><Input value={specs.screen_size || ""} onChange={(e) => setSpec("screen_size", e.target.value)} placeholder='e.g. 11"' /></Field>
              <Field label="Storage"><Select value={specs.storage_size || ""} onChange={(e) => setSpec("storage_size", e.target.value)} options={STORAGE_SIZES} placeholder="Select" /></Field>
              <Field label="RAM"><Select value={specs.ram_size || ""} onChange={(e) => setSpec("ram_size", e.target.value)} options={RAM_SIZES} placeholder="Select" /></Field>
              <Field label="Processor / Chip"><Input value={specs.proc_model || ""} onChange={(e) => setSpec("proc_model", e.target.value)} placeholder="e.g. A16 Bionic" /></Field>
              <Field label="OS & Version"><Input value={specs.os || ""} onChange={(e) => setSpec("os", e.target.value)} placeholder="e.g. iOS 17.2" /></Field>
              <Field label="Color"><Input value={specs.color || ""} onChange={(e) => setSpec("color", e.target.value)} placeholder="e.g. Midnight" /></Field>
              <Field label="Cellular"><Select value={specs.cellular || ""} onChange={(e) => setSpec("cellular", e.target.value)} options={["Yes", "No"]} placeholder="Select" /></Field>
              <Field label="Warranty Expiry"><Input value={specs.warranty || ""} onChange={(e) => setSpec("warranty", e.target.value)} placeholder="DD-MM-YYYY" /></Field>
            </div>
          </Section>
        )}

        {/* Peripheral Specs */}
        {isPeripheral(type) && (
          <Section title={`${type} Specifications`} icon={MonitorSmartphoneIcon} defaultOpen={false}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Connection Type"><Select value={specs.connection || ""} onChange={(e) => setSpec("connection", e.target.value)} options={CONNECTION_TYPES} placeholder="Select" /></Field>
              <Field label="Color"><Input value={specs.color || ""} onChange={(e) => setSpec("color", e.target.value)} placeholder="e.g. Black" /></Field>
              <Field label="Compatibility"><Select value={specs.compatibility || ""} onChange={(e) => setSpec("compatibility", e.target.value)} options={COMPATIBILITY} placeholder="Select" /></Field>
              <Field label="Warranty Expiry"><Input value={specs.warranty || ""} onChange={(e) => setSpec("warranty", e.target.value)} placeholder="DD-MM-YYYY" /></Field>
            </div>
          </Section>
        )}

        <div className="flex justify-end pt-4 pb-8">
          <button type="submit" disabled={submitting} className="rounded-lg bg-primary px-8 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 transition-colors">
            {submitting && <LoaderIcon size={16} className="animate-spin" />}
            {submitting ? "Registering..." : "Register Device"}
          </button>
        </div>
      </form>
    </div>
  );
}
