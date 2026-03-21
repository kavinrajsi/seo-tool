"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useTeam } from "@/lib/team-context";
import { useProject } from "@/lib/project-context";
import { QR_TYPES } from "@/lib/qr-types";
import {
  SearchIcon,
  TrashIcon,
  DownloadIcon,
  XIcon,
  QrCodeIcon,
  PlusIcon,
  CopyIcon,
  PencilIcon,
} from "lucide-react";

export default function AllQRCodes() {
  const router = useRouter();
  const { activeTeam } = useTeam();
  const { activeProject } = useProject();
  const [user, setUser] = useState(null);
  const [qrcodes, setQrcodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewingQR, setViewingQR] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser(data.user);
    });
    loadAllQRCodes();
  }, [activeTeam, activeProject]);

  async function loadAllQRCodes() {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) return;

    setLoading(true);
    let query = supabase
      .from("qr_codes")
      .select("*")
      .order("created_at", { ascending: false });

    if (activeTeam) {
      query = query.eq("team_id", activeTeam.id);
    } else {
      query = query.eq("user_id", u.id).is("team_id", null);
    }

    const { data } = await query;
    setQrcodes(data || []);
    setLoading(false);
  }

  function handleEdit(qr) {
    localStorage.setItem("editQR", JSON.stringify(qr));
    router.push("/qr-generator");
  }

  async function handleDelete(id) {
    if (!confirm("Delete this QR code?")) return;
    await supabase.from("qr_codes").delete().eq("id", id);
    loadAllQRCodes();
  }

  async function handleDownload(qr, format = "png") {
    const QRCodeStyling = (await import("qr-code-styling")).default;
    const typeConfig = QR_TYPES.find(t => t.value === qr.type);
    if (!typeConfig) return;

    const photoUrl = qr.type === "vcard" && qr.data?.photo?.startsWith("data:")
      ? `${window.location.origin}/api/qr/photo/${qr.id}` : undefined;
    const encoded = typeConfig.encode(qr.data || {}, { photoUrl });
    if (!encoded) return;

    const opts = qr.options || {};
    const logoSrc = opts.logoUrl || qr.logo_url || null;
    const qrCode = new QRCodeStyling({
      width: 300,
      height: 300,
      data: encoded,
      margin: opts.margin || 10,
      dotsOptions: { color: opts.fgColor || "#000000", type: opts.dotStyle || "square" },
      backgroundOptions: { color: opts.bgColor || "#ffffff" },
      cornersSquareOptions: { type: opts.cornerStyle || "square" },
      cornersDotOptions: { type: opts.cornerStyle === "square" ? "square" : "dot" },
      ...(logoSrc ? { image: logoSrc, imageOptions: { crossOrigin: "anonymous", margin: 5 } } : {}),
    });
    await qrCode.download({ name: `qr-${qr.type}-${Date.now()}`, extension: format });

    // Log download event
    supabase.rpc("track_qr_event", {
      p_qr_code_id: qr.id,
      p_event_type: "download",
      p_download_format: format,
    });
  }

  const filtered = qrcodes.filter(qr => {
    if (!search) return true;
    const s = search.toLowerCase();
    return qr.label?.toLowerCase().includes(s) || qr.type?.toLowerCase().includes(s);
  });

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">All QR Codes</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{qrcodes.length} saved</p>
        </div>
        <Link href="/qr-generator" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2">
          <PlusIcon className="h-4 w-4" /> New QR
        </Link>
      </div>

      {/* Search */}
      {qrcodes.length > 0 && (
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by label or type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-border bg-background pl-10 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <QrCodeIcon className="h-12 w-12" />
          <p className="text-lg font-medium text-foreground">
            {qrcodes.length === 0 ? "No QR codes yet" : "No results"}
          </p>
          <p className="text-sm">
            {qrcodes.length === 0 ? "Create your first one to get started." : "Try a different search."}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Label</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Type</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Tracking URL</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Created</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((qr) => {
                const typeConfig = QR_TYPES.find(t => t.value === qr.type);
                return (
                  <tr key={qr.id} className="border-b border-border/50 last:border-0 hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3">
                      <button onClick={() => setViewingQR(qr)} className="text-left hover:underline">
                        <span className="font-medium">{qr.label || typeConfig?.label || qr.type}</span>
                        <span className="block text-xs text-muted-foreground sm:hidden">{typeConfig?.label || qr.type}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                        {typeConfig?.icon || "📱"} {typeConfig?.label || qr.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex items-center gap-1.5">
                        <code className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded truncate max-w-[200px]">
                          {`${typeof window !== "undefined" ? window.location.origin : ""}/api/qr/${qr.slug}`}
                        </code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/api/qr/${qr.slug}`);
                          }}
                          title="Copy tracking URL"
                          className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
                        >
                          <CopyIcon className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">
                      {new Date(qr.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(qr)}
                          title="Edit"
                          className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        {["svg", "png", "jpeg"].map((fmt) => (
                          <button
                            key={fmt}
                            onClick={() => handleDownload(qr, fmt)}
                            title={`Download ${fmt.toUpperCase()}`}
                            className="rounded px-1.5 py-1 text-[10px] font-semibold uppercase text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                          >
                            {fmt}
                          </button>
                        ))}
                        <button
                          onClick={() => handleDelete(qr.id)}
                          title="Delete"
                          className="rounded p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* View Modal */}
      {viewingQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setViewingQR(null)}>
          <div className="relative w-full max-w-md rounded-lg border border-border bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setViewingQR(null)}
              className="absolute top-3 right-3 rounded p-1.5 hover:bg-accent text-muted-foreground hover:text-foreground"
            >
              <XIcon className="h-4 w-4" />
            </button>

            <h2 className="text-lg font-semibold mb-1">
              {viewingQR.label || QR_TYPES.find(t => t.value === viewingQR.type)?.label}
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              {new Date(viewingQR.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>

            <div
              className="flex items-center justify-center rounded-lg border border-border p-6 mb-4"
              style={{ backgroundColor: viewingQR.options?.bgColor || "#ffffff" }}
            >
              <QRCodePreview qr={viewingQR} />
            </div>

            <div className="flex gap-2">
              {["svg", "png", "jpeg"].map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => handleDownload(viewingQR, fmt)}
                  className={`flex-1 rounded-md px-4 py-2 text-sm font-medium inline-flex items-center justify-center gap-2 ${fmt === "png" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border border-border hover:bg-accent"}`}
                >
                  <DownloadIcon className="h-4 w-4" /> {fmt.toUpperCase()}
                </button>
              ))}
              <button
                onClick={() => setViewingQR(null)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QRCodePreview({ qr }) {
  const ref = useRef(null);

  useEffect(() => {
    async function generate() {
      const QRCodeStyling = (await import("qr-code-styling")).default;
      const typeConfig = QR_TYPES.find(t => t.value === qr.type);
      if (!typeConfig) return;

      const photoUrl = qr.type === "vcard" && qr.data?.photo?.startsWith("data:")
        ? `${window.location.origin}/api/qr/photo/${qr.id}` : undefined;
      const encoded = typeConfig.encode(qr.data || {}, { photoUrl });
      if (!encoded) return;

      const opts = qr.options || {};
      const logoSrc = opts.logoUrl || qr.logo_url || null;
      const qrCode = new QRCodeStyling({
        width: 250,
        height: 250,
        data: encoded,
        margin: opts.margin || 10,
        dotsOptions: { color: opts.fgColor || "#000000", type: opts.dotStyle || "square" },
        backgroundOptions: { color: opts.bgColor || "#ffffff" },
        cornersSquareOptions: { type: opts.cornerStyle || "square" },
        cornersDotOptions: { type: opts.cornerStyle === "square" ? "square" : "dot" },
        ...(logoSrc ? { image: logoSrc, imageOptions: { crossOrigin: "anonymous", margin: 5 } } : {}),
      });
      if (ref.current) {
        ref.current.innerHTML = "";
        qrCode.append(ref.current);
      }
    }
    generate();
  }, [qr]);

  return <div ref={ref} />;
}
