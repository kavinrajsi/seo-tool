// ============================================================
// Rank Scan Service Worker — API caching + offline mutation queue
// ============================================================

const STATIC_CACHE = "rank-scan-static-v2";
const API_CACHE = "rank-scan-api-v1";
const OFFLINE_CACHE = "rank-scan-offline-v1";
const CURRENT_CACHES = [STATIC_CACHE, API_CACHE, OFFLINE_CACHE];

const STATIC_ASSETS = [
  "/",
  "/login",
  "/register",
  "/dashboard",
  "/manifest.json",
  "/offline.html",
];

// ----- Cacheable GET API route patterns & TTLs (ms) -----
const API_CACHE_RULES = [
  { pattern: /^\/api\/reports\/[^/]+$/, ttl: 60 * 60 * 1000 },          // 1 hour
  { pattern: /^\/api\/reports(\?.*)?$/, ttl: 5 * 60 * 1000 },            // 5 min
  { pattern: /^\/api\/teams(\?.*)?$/, ttl: 10 * 60 * 1000 },             // 10 min
  { pattern: /^\/api\/usage(\?.*)?$/, ttl: 5 * 60 * 1000 },              // 5 min
  { pattern: /^\/api\/ecommerce\//, ttl: 5 * 60 * 1000 },                // 5 min
  { pattern: /^\/api\/webhooks\/shopify\/logs/, ttl: 2 * 60 * 1000 },    // 2 min
  { pattern: /^\/api\/admin\/users/, ttl: 10 * 60 * 1000 },              // 10 min
  { pattern: /^\/api\/qr-codes/, ttl: 10 * 60 * 1000 },                  // 10 min
  { pattern: /^\/api\/settings\/page-visibility/, ttl: 30 * 60 * 1000 }, // 30 min
  { pattern: /^\/api\/gsc\/status/, ttl: 10 * 60 * 1000 },               // 10 min
];

// ----- IndexedDB helpers for mutation queue -----
const DB_NAME = "rank-scan-offline";
const DB_VERSION = 1;
const STORE_NAME = "mutation_queue";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function enqueueMutation(entry) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.add(entry);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

async function getAllMutations() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      db.close();
      resolve(req.result);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

async function deleteMutation(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

async function updateMutation(entry) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(entry);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

async function getQueueCount() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.count();
    req.onsuccess = () => {
      db.close();
      resolve(req.result);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

// ----- Broadcast helper -----
async function notifyClients(message) {
  const clients = await self.clients.matchAll({ type: "window" });
  clients.forEach((client) => client.postMessage(message));
}

// ----- Install -----
self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)),
      caches.open(OFFLINE_CACHE).then((cache) => cache.add("/offline.html")),
    ])
  );
});

// ----- Activate — clean old caches -----
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => !CURRENT_CACHES.includes(name))
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

// ----- Fetch -----
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Ignore non-same-origin requests (external URLs, CDNs, etc.)
  if (url.origin !== self.location.origin) return;

  // --- API routes ---
  if (url.pathname.startsWith("/api/")) {
    if (event.request.method === "GET") {
      return event.respondWith(handleApiGet(event.request, url));
    }
    // Mutation (POST / PATCH / DELETE / PUT)
    return event.respondWith(handleApiMutation(event.request, url));
  }

  // --- Page navigations ---
  if (event.request.mode === "navigate") {
    return event.respondWith(handleNavigation(event.request));
  }

  // --- Static assets (JS, CSS, images, fonts) ---
  event.respondWith(handleStaticAsset(event.request));
});

// ----- Strategy: GET API — stale-while-revalidate -----
async function handleApiGet(request, url) {
  const rule = API_CACHE_RULES.find((r) => r.pattern.test(url.pathname));
  if (!rule) {
    // Not cacheable — pure network pass-through
    try {
      return await fetch(request);
    } catch {
      return new Response(JSON.stringify({ error: "You are offline" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const cache = await caches.open(API_CACHE);
  const cacheKey = request.url;
  const cached = await cache.match(cacheKey);

  // Check TTL on cached response
  if (cached) {
    const cachedAt = cached.headers.get("sw-cached-at");
    const age = cachedAt ? Date.now() - Number(cachedAt) : Infinity;

    if (age < rule.ttl) {
      // Still fresh — return cached and revalidate in background
      revalidateApiCache(request, cache, cacheKey);
      return cached;
    }
  }

  // Cache miss or stale beyond TTL — try network
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cacheApiResponse(cache, cacheKey, response.clone());
    }
    return response;
  } catch {
    // Offline fallback to cached (even if stale)
    if (cached) return cached;
    return new Response(JSON.stringify({ error: "You are offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function cacheApiResponse(cache, key, response) {
  // Clone body, add timestamp header
  const body = await response.arrayBuffer();
  const headers = new Headers(response.headers);
  headers.set("sw-cached-at", String(Date.now()));
  const stamped = new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
  await cache.put(key, stamped);
}

function revalidateApiCache(request, cache, cacheKey) {
  fetch(request)
    .then((response) => {
      if (response.ok) {
        cacheApiResponse(cache, cacheKey, response);
      }
    })
    .catch(() => {
      // Silently ignore — we already served a cached version
    });
}

// ----- Strategy: Mutations — network-first, queue on fail -----
async function handleApiMutation(request, url) {
  try {
    const response = await fetch(request.clone());
    return response;
  } catch {
    // Network failure — queue the mutation
    const body = await request.text();
    const headersObj = {};
    request.headers.forEach((value, key) => {
      // Skip headers the browser will set automatically on replay
      if (!["host", "connection", "content-length"].includes(key.toLowerCase())) {
        headersObj[key] = value;
      }
    });

    const entry = {
      url: url.pathname + url.search,
      method: request.method,
      headers: headersObj,
      body: body || null,
      createdAt: Date.now(),
      status: "pending",
      retryCount: 0,
      maxRetries: 3,
      context: url.pathname,
    };

    await enqueueMutation(entry);
    await notifyClients({ type: "SW_MUTATION_QUEUED", url: entry.url, method: entry.method });

    return new Response(
      JSON.stringify({
        offline: true,
        queued: true,
        message: "Saved offline. Will sync when you're back online.",
      }),
      {
        status: 202,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// ----- Strategy: Navigation — network-first, fallback offline.html -----
async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    // Cache successful navigations in static cache
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Serve the offline fallback page
    const offlinePage = await caches.match("/offline.html");
    if (offlinePage) return offlinePage;
    return new Response("Offline", { status: 503 });
  }
}

// ----- Strategy: Static assets — network-first, cache fallback -----
async function handleStaticAsset(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response("Offline", { status: 503 });
  }
}

// ----- Background Sync — process mutation queue -----
self.addEventListener("sync", (event) => {
  if (event.tag === "mutation-queue-sync") {
    event.waitUntil(processMutationQueue());
  }
});

async function processMutationQueue() {
  const mutations = await getAllMutations();
  if (mutations.length === 0) return;

  for (const entry of mutations) {
    if (entry.status === "failed") continue; // Skip permanently failed

    try {
      const response = await fetch(entry.url, {
        method: entry.method,
        headers: entry.headers,
        body: entry.body,
      });

      if (response.ok || (response.status >= 200 && response.status < 300)) {
        // Success — remove from queue
        await deleteMutation(entry.id);
        await notifyClients({
          type: "SW_MUTATION_SYNCED",
          url: entry.url,
          method: entry.method,
        });
      } else if (response.status >= 400 && response.status < 500) {
        // Client error — permanent failure, don't retry
        entry.status = "failed";
        await updateMutation(entry);
        await notifyClients({
          type: "SW_MUTATION_FAILED",
          url: entry.url,
          method: entry.method,
          status: response.status,
          permanent: true,
        });
      } else {
        // Server error — retry later
        entry.retryCount += 1;
        if (entry.retryCount >= entry.maxRetries) {
          entry.status = "failed";
          await updateMutation(entry);
          await notifyClients({
            type: "SW_MUTATION_FAILED",
            url: entry.url,
            method: entry.method,
            permanent: true,
          });
        } else {
          entry.status = "pending";
          await updateMutation(entry);
        }
      }
    } catch {
      // Still offline — stop processing, will retry on next sync
      break;
    }
  }
}

// ----- Message handlers -----
self.addEventListener("message", (event) => {
  const { type } = event.data || {};

  if (type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (type === "ONLINE_STATUS_CHANGED" && event.data.online) {
    processMutationQueue();
  }

  if (type === "GET_QUEUE_COUNT") {
    getQueueCount().then((count) => {
      event.source.postMessage({ type: "QUEUE_COUNT", count });
    });
  }
});
