import { NextResponse } from "next/server";

export const maxDuration = 60;

// ---------------------------------------------------------------------------
// Realistic source domains for mock backlink data
// ---------------------------------------------------------------------------
const SOURCE_DOMAINS = [
  { domain: "techcrunch.com", type: "news", authorityRange: [88, 95] },
  { domain: "medium.com", type: "blog", authorityRange: [80, 92] },
  { domain: "dev.to", type: "blog", authorityRange: [70, 85] },
  { domain: "reddit.com", type: "forum", authorityRange: [90, 97] },
  { domain: "stackexchange.com", type: "forum", authorityRange: [75, 88] },
  { domain: "github.com", type: "repository", authorityRange: [92, 98] },
  { domain: "producthunt.com", type: "directory", authorityRange: [78, 88] },
  { domain: "hackernews.com", type: "forum", authorityRange: [82, 90] },
  { domain: "smashingmagazine.com", type: "blog", authorityRange: [80, 90] },
  { domain: "css-tricks.com", type: "blog", authorityRange: [75, 85] },
  { domain: "sitepoint.com", type: "blog", authorityRange: [68, 78] },
  { domain: "wordpress.org", type: "directory", authorityRange: [92, 97] },
  { domain: "webflow.com", type: "blog", authorityRange: [70, 82] },
  { domain: "hubspot.com", type: "blog", authorityRange: [85, 94] },
  { domain: "moz.com", type: "blog", authorityRange: [82, 91] },
  { domain: "ahrefs.com", type: "blog", authorityRange: [80, 90] },
  { domain: "neilpatel.com", type: "blog", authorityRange: [78, 88] },
  { domain: "searchenginejournal.com", type: "news", authorityRange: [80, 90] },
  { domain: "forbes.com", type: "news", authorityRange: [92, 97] },
  { domain: "entrepreneur.com", type: "news", authorityRange: [85, 93] },
  { domain: "inc.com", type: "news", authorityRange: [88, 94] },
  { domain: "wired.com", type: "news", authorityRange: [90, 96] },
  { domain: "theverge.com", type: "news", authorityRange: [88, 95] },
  { domain: "digitalocean.com", type: "blog", authorityRange: [78, 88] },
  { domain: "freecodecamp.org", type: "blog", authorityRange: [82, 91] },
  { domain: "ycombinator.com", type: "directory", authorityRange: [85, 93] },
  { domain: "crunchbase.com", type: "directory", authorityRange: [82, 90] },
  { domain: "trustpilot.com", type: "directory", authorityRange: [88, 95] },
  { domain: "g2.com", type: "directory", authorityRange: [80, 90] },
  { domain: "capterra.com", type: "directory", authorityRange: [78, 88] },
  { domain: "quora.com", type: "forum", authorityRange: [85, 93] },
  { domain: "tumblr.com", type: "blog", authorityRange: [70, 82] },
  { domain: "blogspot.com", type: "blog", authorityRange: [55, 68] },
  { domain: "weebly.com", type: "blog", authorityRange: [45, 60] },
  { domain: "livejournal.com", type: "blog", authorityRange: [35, 50] },
  { domain: "spamforum.xyz", type: "forum", authorityRange: [5, 15] },
  { domain: "cheaplinks.biz", type: "directory", authorityRange: [3, 12] },
  { domain: "linkfarm-seo.net", type: "directory", authorityRange: [2, 10] },
  { domain: "freebacklinks.ru", type: "directory", authorityRange: [4, 14] },
  { domain: "buylinks247.com", type: "directory", authorityRange: [6, 16] },
];

const ANCHOR_TEMPLATES = [
  "{domain}",
  "{domain} - official site",
  "visit {domain}",
  "click here",
  "read more",
  "learn more",
  "best {keyword} tool",
  "{keyword} software",
  "{keyword} platform",
  "top {keyword} solution",
  "{domain} review",
  "check out {domain}",
  "recommended {keyword} tool",
  "https://{domain}",
  "{keyword} guide",
  "{keyword} tips",
  "official website",
  "source",
  "here",
  "this article",
];

const KEYWORDS = [
  "SEO", "marketing", "analytics", "digital marketing", "web",
  "content", "search engine", "optimization", "website", "online",
];

const PATH_TEMPLATES = [
  "/blog/{slug}",
  "/articles/{slug}",
  "/resources/{slug}",
  "/reviews/{slug}",
  "/news/{slug}",
  "/posts/{slug}",
  "/guide/{slug}",
  "/tools/{slug}",
  "/best-{slug}",
  "/top-10-{slug}",
];

const SLUG_WORDS = [
  "best-tools-2026", "comprehensive-review", "ultimate-guide",
  "how-to-improve", "top-picks", "comparison", "alternatives",
  "tips-and-tricks", "getting-started", "deep-dive",
  "case-study", "analysis", "benchmark", "industry-report",
  "expert-roundup", "weekly-digest", "tools-we-love",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysBack) {
  const d = new Date();
  d.setDate(d.getDate() - rand(0, daysBack));
  return d.toISOString().slice(0, 10);
}

function qualityFromAuthority(authority) {
  if (authority < 20) return "toxic";
  if (authority < 40) return "warning";
  return "good";
}

function generateBacklinks(domain, count) {
  const backlinks = [];

  for (let i = 0; i < count; i++) {
    const source = pick(SOURCE_DOMAINS);
    const authority = rand(source.authorityRange[0], source.authorityRange[1]);
    const quality = qualityFromAuthority(authority);
    const isFollow = quality === "toxic" ? Math.random() > 0.7 : Math.random() > 0.25;
    const pathTemplate = pick(PATH_TEMPLATES);
    const slug = pick(SLUG_WORDS);
    const path = pathTemplate.replace("{slug}", slug);

    const keyword = pick(KEYWORDS);
    let anchorTemplate = pick(ANCHOR_TEMPLATES);
    const anchorText = anchorTemplate
      .replace("{domain}", domain)
      .replace("{keyword}", keyword);

    const firstSeen = randomDate(365);
    const firstDate = new Date(firstSeen);
    const daysSinceFirst = Math.floor((Date.now() - firstDate.getTime()) / 86400000);
    const lastSeenDaysAgo = rand(0, Math.min(daysSinceFirst, 30));
    const lastSeenDate = new Date();
    lastSeenDate.setDate(lastSeenDate.getDate() - lastSeenDaysAgo);

    backlinks.push({
      sourceUrl: `https://${source.domain}${path}`,
      sourceDomain: source.domain,
      anchorText,
      authority,
      type: isFollow ? "follow" : "nofollow",
      quality,
      firstSeen,
      lastSeen: lastSeenDate.toISOString().slice(0, 10),
    });
  }

  return backlinks;
}

function buildSummary(backlinks) {
  const uniqueDomains = new Set(backlinks.map((b) => b.sourceDomain));
  const followCount = backlinks.filter((b) => b.type === "follow").length;
  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const newLast30 = backlinks.filter(
    (b) => new Date(b.firstSeen) >= thirtyDaysAgo
  ).length;
  const lostLast30 = rand(0, Math.max(1, Math.floor(newLast30 * 0.3)));

  return {
    totalBacklinks: backlinks.length,
    referringDomains: uniqueDomains.size,
    domainAuthority: rand(25, 85),
    newLast30Days: newLast30,
    lostLast30Days: lostLast30,
    followRatio: backlinks.length
      ? Math.round((followCount / backlinks.length) * 100)
      : 0,
  };
}

function buildReferringDomains(backlinks) {
  const domainMap = {};
  for (const b of backlinks) {
    if (!domainMap[b.sourceDomain]) {
      domainMap[b.sourceDomain] = {
        domain: b.sourceDomain,
        authority: b.authority,
        backlinks: 0,
        type: b.type,
      };
    }
    domainMap[b.sourceDomain].backlinks += 1;
    // Keep the highest authority seen
    if (b.authority > domainMap[b.sourceDomain].authority) {
      domainMap[b.sourceDomain].authority = b.authority;
    }
  }

  return Object.values(domainMap)
    .sort((a, b) => b.authority - a.authority)
    .slice(0, 15);
}

function buildAnchorTexts(backlinks) {
  const anchorMap = {};
  for (const b of backlinks) {
    const text = b.anchorText.toLowerCase();
    anchorMap[text] = (anchorMap[text] || 0) + 1;
  }

  const total = backlinks.length || 1;
  return Object.entries(anchorMap)
    .map(([text, count]) => ({
      text,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function buildTrend(backlinks) {
  const trend = [];
  const now = new Date();

  // Build a running total that starts from a reasonable baseline
  let runningTotal = rand(150, 500);

  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);

    const newLinks = rand(0, 8);
    const lostLinks = rand(0, 3);
    runningTotal = runningTotal + newLinks - lostLinks;

    trend.push({
      date: dateStr,
      newLinks,
      lostLinks,
      total: Math.max(0, runningTotal),
    });
  }

  return trend;
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------
export async function POST(request) {
  try {
    const body = await request.json();
    let { domain } = body;

    if (!domain || typeof domain !== "string") {
      return NextResponse.json(
        { error: "Please provide a domain to check." },
        { status: 400 }
      );
    }

    // Normalise: strip protocol and trailing slash
    domain = domain
      .trim()
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, "")
      .toLowerCase();

    if (!domain) {
      return NextResponse.json(
        { error: "Invalid domain." },
        { status: 400 }
      );
    }

    // Generate mock data
    const backlinkCount = rand(20, 30);
    const backlinks = generateBacklinks(domain, backlinkCount);
    const summary = buildSummary(backlinks);
    const referringDomains = buildReferringDomains(backlinks);
    const anchorTexts = buildAnchorTexts(backlinks);
    const trend = buildTrend(backlinks);
    const toxicLinks = backlinks.filter((b) => b.quality === "toxic");

    const data = {
      domain,
      summary,
      backlinks,
      referringDomains,
      anchorTexts,
      trend,
      toxicLinks,
    };

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to process backlink check." },
      { status: 500 }
    );
  }
}
