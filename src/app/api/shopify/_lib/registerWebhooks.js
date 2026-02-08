const WEBHOOK_TOPICS = [
  "products/create",
  "products/update",
  "products/delete",
  "collections/create",
  "collections/update",
  "collections/delete",
];

/**
 * Register Shopify webhooks for a connected store
 *
 * @param {string} shopDomain - Normalized shop domain (e.g. "my-store.myshopify.com")
 * @param {string} accessToken - Shopify access token
 * @param {string} baseUrl - Base URL for webhook endpoints (e.g. "https://example.com")
 * @returns {{ registered: Array, failed: Array }}
 */
export async function registerWebhooks(shopDomain, accessToken, baseUrl) {
  const registered = [];
  const failed = [];

  // Get existing webhooks to avoid duplicates
  let existingWebhooks = [];
  try {
    const listRes = await fetch(
      `https://${shopDomain}/admin/api/2024-01/webhooks.json`,
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      }
    );

    if (listRes.ok) {
      const listData = await listRes.json();
      existingWebhooks = listData.webhooks || [];
    }
  } catch {
    // Continue even if listing fails
  }

  for (const topic of WEBHOOK_TOPICS) {
    const resource = topic.split("/")[0];
    const fullWebhookUrl = `${baseUrl}/api/webhooks/shopify/${resource}`;

    // Skip if already registered
    const exists = existingWebhooks.find(
      (wh) => wh.topic === topic && wh.address === fullWebhookUrl
    );

    if (exists) {
      registered.push({
        id: exists.id,
        topic,
        status: "already_exists",
      });
      continue;
    }

    try {
      const createRes = await fetch(
        `https://${shopDomain}/admin/api/2024-01/webhooks.json`,
        {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            webhook: {
              topic,
              address: fullWebhookUrl,
              format: "json",
            },
          }),
        }
      );

      if (createRes.ok) {
        const createData = await createRes.json();
        registered.push({
          id: createData.webhook.id,
          topic: createData.webhook.topic,
          status: "created",
        });
      } else {
        const errorData = await createRes.json().catch(() => ({}));
        failed.push({
          topic,
          error: errorData.errors || createRes.statusText,
        });
      }
    } catch (err) {
      failed.push({
        topic,
        error: err.message,
      });
    }
  }

  return { registered, failed };
}

export { WEBHOOK_TOPICS };
