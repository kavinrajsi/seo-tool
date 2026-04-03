"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  ZapIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  RefreshCwIcon,
  CopyIcon,
  ExternalLinkIcon,
} from "lucide-react";

export default function IndexNow() {
  const [apiKey, setApiKey] = useState("");
  const [urls, setUrls] = useState([""]);
  const [bulkInput, setBulkInput] = useState("");
  const [mode, setMode] = useState("single"); // single | bulk
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [keyGenerated, setKeyGenerated] = useState(false);


  function generateKey() {
    // IndexNow key: 32 hex chars
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    const key = Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
    setApiKey(key);
    setKeyGenerated(true);
  }

  function addUrlField() {
    setUrls((prev) => [...prev, ""]);
  }

  function updateUrl(idx, value) {
    setUrls((prev) => prev.map((u, i) => (i === idx ? value : u)));
  }

  function removeUrl(idx) {
    setUrls((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setResult(null);
    setSubmitting(true);

    let urlList;
    if (mode === "bulk") {
      urlList = bulkInput
        .split("\n")
        .map((u) => u.trim())
        .filter((u) => u && u.startsWith("http"));
    } else {
      urlList = urls.filter((u) => u.trim() && u.trim().startsWith("http")).map((u) => u.trim());
    }

    if (urlList.length === 0) {
      setError("Enter at least one valid URL (must start with http)");
      setSubmitting(false);
      return;
    }

    if (!apiKey.trim()) {
      setError("IndexNow API key is required");
      setSubmitting(false);
      return;
    }

    try {
      const res = await apiFetch("/api/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: urlList, apiKey: apiKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">IndexNow</h1>
        <p className="text-muted-foreground mt-1">
          Instantly notify search engines when your pages are created, updated, or deleted.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      {result && (
        <div className="rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400 flex items-center gap-2">
          <CheckCircleIcon className="h-4 w-4" />
          Successfully submitted {result.submitted} URL{result.submitted !== 1 ? "s" : ""} to IndexNow for {result.host}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: API Key Setup */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <ZapIcon className="h-4 w-4 text-muted-foreground" />
              API Key
            </h3>
            <div className="space-y-3">
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Your IndexNow API key"
                className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
              />
              <button
                onClick={generateKey}
                className="w-full rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent flex items-center justify-center gap-2"
              >
                <RefreshCwIcon className="h-3.5 w-3.5" />
                Generate New Key
              </button>
            </div>

            {keyGenerated && (
              <div className="mt-3 rounded-md border border-orange-500/30 bg-orange-500/10 px-3 py-2">
                <p className="text-xs text-orange-400 flex items-start gap-1.5">
                  <AlertTriangleIcon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  You must host a file at <code className="font-mono">{`yoursite.com/${apiKey}.txt`}</code> containing this key for verification.
                </p>
              </div>
            )}
          </div>

          {/* How it works */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-medium mb-3">How IndexNow Works</h3>
            <ol className="space-y-2 text-xs text-muted-foreground list-decimal list-inside">
              <li>Generate or enter your IndexNow API key</li>
              <li>
                Host a verification file at your domain:
                <code className="block mt-1 px-2 py-1 rounded bg-background border border-border font-mono">
                  yoursite.com/{apiKey || "{key}"}.txt
                </code>
              </li>
              <li>The file content should be: <code className="font-mono">{apiKey || "{key}"}</code></li>
              <li>Submit URLs — Bing, Yandex, Naver & Seznam get notified instantly</li>
            </ol>
          </div>
        </div>

        {/* Right: URL Submission */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Submit URLs</h3>
              <div className="flex items-center gap-1 rounded-md border border-border bg-background p-0.5">
                <button
                  type="button"
                  onClick={() => setMode("single")}
                  className={`rounded-sm px-3 py-1.5 text-xs font-medium transition-colors ${
                    mode === "single" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Single URLs
                </button>
                <button
                  type="button"
                  onClick={() => setMode("bulk")}
                  className={`rounded-sm px-3 py-1.5 text-xs font-medium transition-colors ${
                    mode === "bulk" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Bulk Paste
                </button>
              </div>
            </div>

            {mode === "single" ? (
              <div className="space-y-2">
                {urls.map((u, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={u}
                      onChange={(e) => updateUrl(i, e.target.value)}
                      placeholder="https://example.com/page"
                      className="flex-1 rounded-md border border-border bg-background px-4 py-2 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
                    />
                    {urls.length > 1 && (
                      <button type="button" onClick={() => removeUrl(i)} className="rounded-md border border-border p-2 hover:bg-red-500/10 text-muted-foreground hover:text-red-500">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addUrlField}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <PlusIcon className="h-3.5 w-3.5" /> Add another URL
                </button>
              </div>
            ) : (
              <div>
                <textarea
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  placeholder="Paste URLs, one per line:&#10;https://example.com/page-1&#10;https://example.com/page-2&#10;https://example.com/page-3"
                  rows={10}
                  className="w-full rounded-md border border-border bg-background px-4 py-3 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60 resize-y"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {bulkInput.split("\n").filter((l) => l.trim().startsWith("http")).length} valid URLs detected
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !apiKey.trim()}
              className="mt-4 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <><RefreshCwIcon className="h-4 w-4 animate-spin" /> Submitting...</>
              ) : (
                <><ZapIcon className="h-4 w-4" /> Submit to IndexNow</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
