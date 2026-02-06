#!/usr/bin/env node

/**
 * Shopify Webhook Test Utility
 *
 * Usage:
 *   node scripts/test-shopify-webhook.js [options]
 *
 * Options:
 *   --url       Webhook URL (default: http://localhost:3000/api/webhooks/shopify/products)
 *   --secret    Webhook secret for HMAC (optional)
 *   --topic     Webhook topic (default: products/create)
 *   --shop      Shop domain (default: test-store.myshopify.com)
 *
 * Examples:
 *   node scripts/test-shopify-webhook.js
 *   node scripts/test-shopify-webhook.js --secret "your_secret" --topic "products/update"
 */

const crypto = require("crypto");
const https = require("https");
const http = require("http");

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  url: "http://localhost:3000/api/webhooks/shopify/products",
  secret: null,
  topic: "products/create",
  shop: "test-store.myshopify.com",
};

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--url" && args[i + 1]) {
    options.url = args[++i];
  } else if (args[i] === "--secret" && args[i + 1]) {
    options.secret = args[++i];
  } else if (args[i] === "--topic" && args[i + 1]) {
    options.topic = args[++i];
  } else if (args[i] === "--shop" && args[i + 1]) {
    options.shop = args[++i];
  }
}

// Sample product payload
const sampleProduct = {
  id: Date.now(),
  title: "Test Product - " + new Date().toISOString(),
  body_html: "<p>This is a test product created by the webhook test script.</p>",
  vendor: "Test Vendor",
  product_type: "Test Category",
  handle: "test-product-" + Date.now(),
  status: "active",
  published_scope: "web",
  tags: "test, webhook, demo",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  published_at: new Date().toISOString(),
  variants: [
    {
      id: Date.now() + 1,
      product_id: Date.now(),
      title: "Default Title",
      price: "29.99",
      compare_at_price: "39.99",
      sku: "TEST-" + Date.now(),
      barcode: "123456789012",
      position: 1,
      inventory_policy: "deny",
      inventory_quantity: 100,
      option1: "Default",
      option2: null,
      option3: null,
      weight: 500,
      weight_unit: "g",
      requires_shipping: true,
      taxable: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: Date.now() + 2,
      product_id: Date.now(),
      title: "Large",
      price: "34.99",
      compare_at_price: "44.99",
      sku: "TEST-L-" + Date.now(),
      barcode: "123456789013",
      position: 2,
      inventory_policy: "deny",
      inventory_quantity: 50,
      option1: "Large",
      option2: null,
      option3: null,
      weight: 600,
      weight_unit: "g",
      requires_shipping: true,
      taxable: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  options: [
    {
      id: Date.now() + 100,
      product_id: Date.now(),
      name: "Size",
      position: 1,
      values: ["Default", "Large"],
    },
  ],
  images: [
    {
      id: Date.now() + 200,
      product_id: Date.now(),
      position: 1,
      src: "https://via.placeholder.com/800x800.png?text=Test+Product",
      alt: "Test product image",
      width: 800,
      height: 800,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  image: {
    id: Date.now() + 200,
    src: "https://via.placeholder.com/800x800.png?text=Test+Product",
    alt: "Test product image",
    width: 800,
    height: 800,
  },
};

// Generate HMAC signature
function generateHmac(body, secret) {
  return crypto.createHmac("sha256", secret).update(body, "utf8").digest("base64");
}

// Send webhook request
function sendWebhook() {
  const body = JSON.stringify(sampleProduct);
  const url = new URL(options.url);

  const headers = {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
    "X-Shopify-Topic": options.topic,
    "X-Shopify-Shop-Domain": options.shop,
    "X-Shopify-Webhook-Id": crypto.randomUUID(),
    "X-Shopify-API-Version": "2024-01",
  };

  // Add HMAC if secret provided
  if (options.secret) {
    headers["X-Shopify-Hmac-Sha256"] = generateHmac(body, options.secret);
    console.log("HMAC Signature:", headers["X-Shopify-Hmac-Sha256"]);
  }

  console.log("\n=== Shopify Webhook Test ===");
  console.log("URL:", options.url);
  console.log("Topic:", options.topic);
  console.log("Shop:", options.shop);
  console.log("Product ID:", sampleProduct.id);
  console.log("Product Title:", sampleProduct.title);
  console.log("Variants:", sampleProduct.variants.length);
  console.log("HMAC Enabled:", !!options.secret);
  console.log("\nSending request...\n");

  const protocol = url.protocol === "https:" ? https : http;

  const req = protocol.request(
    {
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname + url.search,
      method: "POST",
      headers,
    },
    (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        console.log("=== Response ===");
        console.log("Status:", res.statusCode, res.statusMessage);
        console.log("Headers:", JSON.stringify(res.headers, null, 2));

        try {
          const json = JSON.parse(data);
          console.log("Body:", JSON.stringify(json, null, 2));
        } catch {
          console.log("Body:", data);
        }

        if (res.statusCode === 200) {
          console.log("\n✅ Webhook processed successfully!");
        } else if (res.statusCode === 401) {
          console.log("\n❌ HMAC verification failed. Check your secret.");
        } else {
          console.log("\n⚠️ Webhook returned non-200 status.");
        }
      });
    }
  );

  req.on("error", (err) => {
    console.error("\n❌ Request failed:", err.message);
    if (err.code === "ECONNREFUSED") {
      console.log("Make sure your server is running on", options.url);
    }
  });

  req.write(body);
  req.end();
}

// Run
sendWebhook();
