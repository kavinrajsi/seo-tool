"use client";

import { useState, useEffect } from "react";
import styles from "../page.module.css";

export default function StorePage() {
  const [connection, setConnection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [togglingWebhook, setTogglingWebhook] = useState(false);
  const [showWebhookUrl, setShowWebhookUrl] = useState(false);
  const [generatedWebhook, setGeneratedWebhook] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [creatingWebhooks, setCreatingWebhooks] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [connectionMethod, setConnectionMethod] = useState("api"); // "api" or "webhook"

  // Form state
  const [storeUrl, setStoreUrl] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [webhookStoreUrl, setWebhookStoreUrl] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const connRes = await fetch("/api/ecommerce/shopify");
        if (connRes.ok) {
          const connData = await connRes.json();
          setConnection(connData.connection);
        }
      } catch {
        setError("Failed to load data");
      }
      setLoading(false);
    }
    loadData();
  }, []);

  async function handleConnect(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setConnecting(true);

    try {
      const res = await fetch("/api/ecommerce/shopify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeUrl, accessToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to connect");
      } else {
        setConnection(data.connection);
        setSuccess("Connected to Shopify successfully!");
        setStoreUrl("");
        setAccessToken("");
      }
    } catch {
      setError("Network error");
    }
    setConnecting(false);
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect from Shopify? This will remove all synced products.")) return;

    setError("");
    try {
      const res = await fetch("/api/ecommerce/shopify", { method: "DELETE" });
      if (res.ok) {
        setConnection(null);
        setSuccess("Disconnected from Shopify");
      }
    } catch {
      setError("Failed to disconnect");
    }
  }

  async function handleGenerateWebhook() {
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/ecommerce/shopify/webhook/generate", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to generate webhook");
      } else {
        setGeneratedWebhook(data);
        setShowWebhookUrl(true);
        setConnection((prev) => prev ? { ...prev, webhooks_enabled: true, webhook_url: data.webhookUrl } : prev);
      }
    } catch {
      setError("Network error");
    }
  }

  async function handleWebhookOnlyConnect(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setConnecting(true);

    try {
      // Create a webhook-only connection
      const res = await fetch("/api/ecommerce/shopify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeUrl: webhookStoreUrl,
          webhookOnly: true
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to set up webhook connection");
      } else {
        setConnection(data.connection);
        setSuccess("Webhook connection created! Generate your webhook URL below.");
        setWebhookStoreUrl("");
        // Auto-generate webhook URL
        const webhookRes = await fetch("/api/ecommerce/shopify/webhook/generate", { method: "POST" });
        const webhookData = await webhookRes.json();
        if (webhookRes.ok) {
          setGeneratedWebhook(webhookData);
          setShowWebhookUrl(true);
        }
      }
    } catch {
      setError("Network error");
    }
    setConnecting(false);
  }

  async function copyToClipboard(text, field) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // fallback
    }
  }

  async function handleCreateWebhooks() {
    setError("");
    setSuccess("");
    setCreatingWebhooks(true);
    setWebhookStatus(null);

    try {
      const res = await fetch("/api/ecommerce/shopify/webhook/create", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create webhooks");
      } else {
        setWebhookStatus(data);
        setSuccess(`Created ${data.created.length} webhook(s) successfully!`);
        setConnection((prev) => prev ? {
          ...prev,
          webhooks_enabled: true,
          webhook_url: data.webhookUrl
        } : prev);
      }
    } catch {
      setError("Network error");
    }
    setCreatingWebhooks(false);
  }

  async function handleDisableWebhook() {
    if (!confirm("Disable webhooks? Products will no longer sync automatically.")) return;

    setError("");
    setSuccess("");
    setTogglingWebhook(true);

    try {
      const res = await fetch("/api/ecommerce/shopify/webhook/register", { method: "DELETE" });

      if (res.ok) {
        setSuccess("Webhooks disabled");
        setConnection((prev) => prev ? { ...prev, webhooks_enabled: false, webhook_url: null, last_webhook_at: null } : prev);
        setShowWebhookUrl(false);
        setGeneratedWebhook(null);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to disable webhooks");
      }
    } catch {
      setError("Network error");
    }
    setTogglingWebhook(false);
  }

  function formatDate(dateStr) {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  if (loading) {
    return <p className={styles.loading}>Loading...</p>;
  }

  return (
    <>
      <h1 className={styles.heading}>Store</h1>
      <p className={styles.subheading}>Connect and manage your Shopify store.</p>

      <div className={styles.connectionCard}>
        <div className={styles.connectionHeader}>
          <div className={styles.connectionTitle}>
            <svg className={styles.shopifyLogo} viewBox="0 0 109 124" fill="none">
              <path d="M95.8 23.4c-.1-.6-.6-1-1.1-1-.5 0-9.3-.2-9.3-.2s-6.2-6-6.9-6.7c-.7-.7-2-.5-2.5-.3-.1 0-1.3.4-3.5 1.1-2.1-6-5.8-11.5-12.3-11.5h-.6C57.4 2 55 0 53 0c-13 0-19.2 16.2-21.2 24.5-5.1 1.6-8.7 2.7-9.2 2.8-2.9.9-3 1-3.3 3.7-.3 2-7.8 60.2-7.8 60.2l62.6 11.7 33.9-7.3S95.9 24 95.8 23.4zM67.6 18l-5.7 1.8c0-3-.4-7.2-1.8-10.8 4.5.9 6.7 5.9 7.5 9zM56.8 21.2l-12.3 3.8c1.2-4.6 3.5-9.1 7.9-12.1.7-.5 1.5-.9 2.4-1.2 1.5 2.9 2 7 2 9.5zM53.2 5.6c.8 0 1.5.3 2.1.8-3.6 1.7-7.5 5.9-9.1 14.4l-9.7 3c2-6.9 6.8-18.2 16.7-18.2z" fill="#95BF47"/>
              <path d="M94.7 22.4c-.5 0-9.3-.2-9.3-.2s-6.2-6-6.9-6.7c-.2-.2-.5-.4-.8-.4l-4.8 97.6 33.9-7.3S95.9 24 95.8 23.4c-.1-.6-.6-1-1.1-1z" fill="#5E8E3E"/>
              <path d="M60.2 40.3l-4.4 13c-3.3-1.8-7.3-3.6-12.2-3.6-9.8 0-10.3 6.2-10.3 7.7 0 8.5 22.1 11.7 22.1 31.5 0 15.6-9.9 25.6-23.2 25.6-16 0-24.2-9.9-24.2-9.9l4.3-14.2s8.4 7.2 15.5 7.2c4.6 0 6.5-3.6 6.5-6.3 0-11-18.2-11.5-18.2-29.7 0-15.3 11-30.1 33.1-30.1 8.5 0 12.7 2.4 12.7 2.4l-1.7 6.4z" fill="#fff"/>
            </svg>
            Shopify
          </div>
          <span className={`${styles.statusBadge} ${connection ? styles.statusConnected : styles.statusDisconnected}`}>
            <span className={styles.statusDot}></span>
            {connection ? "Connected" : "Not Connected"}
          </span>
        </div>

        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}

        {connection ? (
          <>
            <div className={styles.connectedInfo}>
              <span className={styles.connectedStore}>{connection.store_name}</span>
              <span className={styles.connectedMeta}>{connection.store_url}</span>
              <span className={styles.connectedMeta}>
                Connected {formatDate(connection.connected_at)}
              </span>
            </div>
            <div className={styles.buttonRow}>
              <button
                className={styles.disconnectBtn}
                onClick={handleDisconnect}
              >
                Disconnect
              </button>
            </div>

            {/* Webhook Section */}
            <div className={styles.webhookSection}>
              <div className={styles.webhookHeader}>
                <div className={styles.webhookTitle}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 16.98h-5.99c-1.1 0-1.99.89-1.99 1.99v.02c0 1.1.89 1.99 1.99 1.99H18c1.1 0 1.99-.89 1.99-1.99v-.02c0-1.1-.89-1.99-1.99-1.99z" />
                    <path d="M12 8.02h5.99c1.1 0 1.99-.89 1.99-1.99V6c0-1.1-.89-1.99-1.99-1.99H12c-1.1 0-1.99.89-1.99 1.99v.02c0 1.1.89 1.99 1.99 1.99z" />
                    <path d="M6 12.02h.01" />
                    <path d="M6 6.02v12" />
                    <path d="M12 12.02h6" />
                  </svg>
                  Webhooks (Auto-Sync)
                </div>
                <span className={`${styles.webhookBadge} ${connection.webhooks_enabled ? styles.webhookEnabled : styles.webhookDisabled}`}>
                  {connection.webhooks_enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <p className={styles.webhookDesc}>
                Enable webhooks to automatically sync products when they are created, updated, or deleted in Shopify.
              </p>

              <div className={styles.webhookGeneratorCard}>
                <div className={styles.webhookGeneratorIcon}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                </div>
                <div className={styles.webhookGeneratorContent}>
                  <h4 className={styles.webhookGeneratorTitle}>Webhook Generator</h4>
                  <p className={styles.webhookGeneratorDesc}>
                    Generate webhook URL and secret for manual configuration in Shopify, or create webhooks automatically.
                  </p>
                  <div className={styles.webhookGeneratorBtns}>
                    <button
                      className={styles.webhookGeneratorBtn}
                      onClick={handleGenerateWebhook}
                      type="button"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                      Generate URL
                    </button>
                    <button
                      className={styles.webhookAutoCreateBtn}
                      onClick={handleCreateWebhooks}
                      disabled={creatingWebhooks}
                      type="button"
                    >
                      {creatingWebhooks ? (
                        <>Creating...</>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="23 4 23 10 17 10" />
                            <polyline points="1 20 1 14 7 14" />
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                          </svg>
                          Auto-Create in Shopify
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
              {connection.webhooks_enabled && connection.last_webhook_at && (
                <p className={styles.webhookMeta}>
                  Last webhook received: {formatDate(connection.last_webhook_at)}
                </p>
              )}

              {showWebhookUrl && generatedWebhook && (
                <div className={styles.webhookUrlBox}>
                  <div className={styles.webhookUrlHeader}>
                    <span>Webhook Configuration</span>
                    <button
                      className={styles.webhookUrlClose}
                      onClick={() => setShowWebhookUrl(false)}
                      type="button"
                    >
                      &times;
                    </button>
                  </div>
                  <p className={styles.webhookUrlInstructions}>
                    Copy these values and add them to your Shopify Admin → Settings → Notifications → Webhooks
                  </p>

                  <div className={styles.webhookUrlField}>
                    <label className={styles.webhookUrlLabel}>Webhook URL</label>
                    <div className={styles.webhookUrlInput}>
                      <input
                        type="text"
                        value={generatedWebhook.webhookUrl}
                        readOnly
                        className={styles.webhookUrlValue}
                      />
                      <button
                        className={styles.copyBtn}
                        onClick={() => copyToClipboard(generatedWebhook.webhookUrl, "url")}
                        type="button"
                      >
                        {copiedField === "url" ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>

                  <div className={styles.webhookUrlField}>
                    <label className={styles.webhookUrlLabel}>Webhook Secret (for verification)</label>
                    <div className={styles.webhookUrlInput}>
                      <input
                        type="text"
                        value={generatedWebhook.webhookSecret}
                        readOnly
                        className={styles.webhookUrlValue}
                      />
                      <button
                        className={styles.copyBtn}
                        onClick={() => copyToClipboard(generatedWebhook.webhookSecret, "secret")}
                        type="button"
                      >
                        {copiedField === "secret" ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>

                  <div className={styles.webhookTopics}>
                    <label className={styles.webhookUrlLabel}>Create webhooks for these topics:</label>
                    <ul className={styles.topicList}>
                      <li>products/create</li>
                      <li>products/update</li>
                      <li>products/delete</li>
                    </ul>
                  </div>
                </div>
              )}

              {webhookStatus && webhookStatus.created.length > 0 && (
                <div className={styles.webhookStatusBox}>
                  <div className={styles.webhookStatusHeader}>Created Webhooks</div>
                  <ul className={styles.webhookStatusList}>
                    {webhookStatus.created.map((wh, i) => (
                      <li key={i} className={styles.webhookStatusItem}>
                        <span className={styles.webhookStatusTopic}>{wh.topic}</span>
                        <span className={styles.webhookStatusCheck}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {connection.webhooks_enabled && (
                <div className={styles.webhookActions}>
                  <button
                    className={styles.webhookDisableBtn}
                    onClick={handleDisableWebhook}
                    disabled={togglingWebhook}
                  >
                    {togglingWebhook ? "Disabling..." : "Disable Webhooks"}
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Connection Method Tabs */}
            <div className={styles.connectionTabs}>
              <button
                type="button"
                className={`${styles.connectionTab} ${connectionMethod === "api" ? styles.connectionTabActive : ""}`}
                onClick={() => setConnectionMethod("api")}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                API Access Token
              </button>
              <button
                type="button"
                className={`${styles.connectionTab} ${connectionMethod === "webhook" ? styles.connectionTabActive : ""}`}
                onClick={() => setConnectionMethod("webhook")}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                Webhook Only
              </button>
            </div>

            {connectionMethod === "api" ? (
              <form className={styles.connectionForm} onSubmit={handleConnect}>
                <div className={styles.methodDesc}>
                  <strong>Full Access</strong> — Sync products, enable auto-sync via webhooks, and access all Shopify data.
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="storeUrl">
                    Store URL
                  </label>
                  <input
                    id="storeUrl"
                    className={styles.input}
                    type="text"
                    placeholder="your-store.myshopify.com"
                    value={storeUrl}
                    onChange={(e) => setStoreUrl(e.target.value)}
                    required
                  />
                  <span className={styles.hint}>Enter your Shopify store URL</span>
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="accessToken">
                    Admin API Access Token
                  </label>
                  <input
                    id="accessToken"
                    className={styles.input}
                    type="password"
                    placeholder="shpat_xxxxxxxxxxxxx"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    required
                  />
                  <span className={styles.hint}>
                    Create a custom app in Shopify Admin → Settings → Apps → Develop apps
                  </span>
                </div>

                <div className={styles.buttonRow}>
                  <button
                    className={styles.connectBtn}
                    type="submit"
                    disabled={connecting}
                  >
                    {connecting ? "Connecting..." : "Connect Store"}
                  </button>
                </div>
              </form>
            ) : (
              <form className={styles.connectionForm} onSubmit={handleWebhookOnlyConnect}>
                <div className={styles.methodDesc}>
                  <strong>Webhook Only</strong> — Receive product updates via webhooks without API access.
                </div>

                <div className={styles.webhookInstructions}>
                  <div className={styles.instructionsTitle}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    How to set up webhooks in Shopify:
                  </div>
                  <ol className={styles.instructionsList}>
                    <li>Enter your store URL below and click &quot;Generate Webhook URL&quot;</li>
                    <li>Copy the generated Webhook URL and Secret</li>
                    <li>Go to <strong>Shopify Admin → Settings → Notifications</strong></li>
                    <li>Scroll down to <strong>Webhooks</strong> section</li>
                    <li>Click <strong>&quot;Create webhook&quot;</strong></li>
                    <li>Select event (e.g., Product creation), paste the URL, and save</li>
                  </ol>
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="webhookStoreUrl">
                    Store URL
                  </label>
                  <input
                    id="webhookStoreUrl"
                    className={styles.input}
                    type="text"
                    placeholder="your-store.myshopify.com"
                    value={webhookStoreUrl}
                    onChange={(e) => setWebhookStoreUrl(e.target.value)}
                    required
                  />
                  <span className={styles.hint}>Enter your Shopify store URL (for identification only)</span>
                </div>

                <div className={styles.buttonRow}>
                  <button
                    className={styles.connectBtn}
                    type="submit"
                    disabled={connecting}
                  >
                    {connecting ? "Setting up..." : "Generate Webhook URL"}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </>
  );
}
