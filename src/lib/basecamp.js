/**
 * Fetch a single Basecamp API endpoint. Returns null on failure.
 */
export async function bcFetch(url, token) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "SEO Tool (tool.madarth.com)",
    },
  });
  if (!res.ok) return null;
  return res.json();
}

/**
 * Fetch all pages from a paginated Basecamp API endpoint.
 * Follows Link: <url>; rel="next" headers automatically.
 */
export async function bcFetchAll(url, token) {
  const allItems = [];
  let nextUrl = url;

  while (nextUrl) {
    const res = await fetch(nextUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "SEO Tool (tool.madarth.com)",
      },
    });

    if (!res.ok) break;

    const items = await res.json();
    allItems.push(...items);

    const linkHeader = res.headers.get("Link") || "";
    const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    nextUrl = nextMatch ? nextMatch[1] : null;
  }

  return allItems;
}
