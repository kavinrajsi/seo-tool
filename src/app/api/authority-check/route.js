export async function POST(request) {
  try {
    const { domain } = await request.json();

    if (!domain) {
      return Response.json({ error: "Domain is required" }, { status: 400 });
    }

    // Normalize domain
    let normalizedDomain = domain.trim().toLowerCase();
    normalizedDomain = normalizedDomain.replace(/^(https?:\/\/)?(www\.)?/, '');
    normalizedDomain = normalizedDomain.replace(/\/.*$/, '');

    const url = `https://${normalizedDomain}`;

    // Analyze the website using our existing analyze endpoint
    const analyzeRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (!analyzeRes.ok) {
      return Response.json(
        { error: 'Failed to analyze domain. Please ensure it is accessible.' },
        { status: 422 }
      );
    }

    const analysisData = await analyzeRes.json();

    // Calculate authority score based on multiple factors
    const authorityScore = calculateAuthorityScore(analysisData);

    return Response.json({
      domain: normalizedDomain,
      url,
      authorityScore: authorityScore.score,
      factors: authorityScore.factors,
      recommendations: authorityScore.recommendations,
      analyzedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Authority check error:', error);
    return Response.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

function calculateAuthorityScore(data) {
  const results = data.results;
  const factors = {
    technical: {},
    content: {},
    seo: {},
    performance: {},
  };
  const recommendations = [];

  // Technical SEO Factors (25 points)
  let technicalScore = 0;

  // HTTPS (8 points)
  factors.technical.https = results.sslHttps?.isHttps || false;
  if (factors.technical.https) {
    technicalScore += 8;
  } else {
    recommendations.push('Enable HTTPS for better security and SEO');
  }

  // Mobile Responsive (8 points)
  factors.technical.mobileResponsive = results.mobileResponsiveness?.hasViewport || false;
  if (factors.technical.mobileResponsive) {
    technicalScore += 8;
  } else {
    recommendations.push('Add viewport meta tag for mobile responsiveness');
  }

  // Fast Loading (6 points)
  factors.technical.loadTime = data.loadTimeMs || 0;
  factors.technical.fastLoading = data.loadTimeMs < 2000;
  if (factors.technical.fastLoading) {
    technicalScore += 6;
  } else {
    recommendations.push(`Improve server response time (currently ${data.loadTimeMs}ms)`);
  }

  // Valid Structure (3 points)
  factors.technical.validStructure = results.doctype?.score === 'pass';
  if (factors.technical.validStructure) {
    technicalScore += 3;
  } else {
    recommendations.push('Add proper HTML5 DOCTYPE declaration');
  }

  factors.technicalScore = technicalScore;

  // Content Quality Factors (25 points)
  let contentScore = 0;

  // Title Tag (8 points)
  factors.content.hasTitle = results.title?.title?.length > 0;
  const titleOptimal = results.title?.length >= 30 && results.title?.length <= 60;
  if (factors.content.hasTitle && titleOptimal) {
    contentScore += 8;
  } else if (factors.content.hasTitle) {
    contentScore += 4;
    recommendations.push('Optimize title tag length (50-60 characters)');
  } else {
    recommendations.push('Add a title tag to your page');
  }

  // Meta Description (6 points)
  factors.content.hasDescription = results.metaDescription?.description?.length > 0;
  const descOptimal = results.metaDescription?.length >= 120 && results.metaDescription?.length <= 160;
  if (factors.content.hasDescription && descOptimal) {
    contentScore += 6;
  } else if (factors.content.hasDescription) {
    contentScore += 3;
    recommendations.push('Optimize meta description (120-160 characters)');
  } else {
    recommendations.push('Add a meta description');
  }

  // Heading Structure (5 points)
  factors.content.hasHeadings = results.h1?.count === 1 && results.headingHierarchy?.headings?.length > 0;
  if (factors.content.hasHeadings) {
    contentScore += 5;
  } else {
    recommendations.push('Ensure proper heading hierarchy with one H1 tag');
  }

  // Content Length (6 points)
  factors.content.wordCount = results.contentAnalysis?.wordCount || 0;
  factors.content.contentLength = factors.content.wordCount >= 300;
  if (factors.content.wordCount >= 600) {
    contentScore += 6;
  } else if (factors.content.wordCount >= 300) {
    contentScore += 3;
    recommendations.push('Add more quality content (aim for 600+ words)');
  } else {
    recommendations.push('Add substantial content (minimum 300 words)');
  }

  factors.contentScore = contentScore;

  // SEO Signals (25 points)
  let seoScore = 0;

  // Schema Markup (8 points)
  factors.seo.hasSchema = results.schemaMarkup?.count > 0;
  if (factors.seo.hasSchema) {
    seoScore += 8;
  } else {
    recommendations.push('Add JSON-LD structured data (schema markup)');
  }

  // Sitemap (6 points)
  factors.seo.hasSitemap = results.sitemapDetection?.sitemapExists || false;
  if (factors.seo.hasSitemap) {
    seoScore += 6;
  } else {
    recommendations.push('Create and submit an XML sitemap');
  }

  // Open Graph (6 points)
  factors.seo.hasOpenGraph = Object.keys(results.openGraph?.tags || {}).length >= 3;
  if (factors.seo.hasOpenGraph) {
    seoScore += 6;
  } else {
    recommendations.push('Add Open Graph meta tags for social sharing');
  }

  factors.seoScore = seoScore;

  // Performance Metrics (25 points)
  let performanceScore = 0;
  const pageSpeed = results.googlePageSpeed;

  factors.performance.pageSpeedScore = pageSpeed?.performanceScore || 0;
  factors.performance.accessibilityScore = pageSpeed?.accessibilityScore || 0;
  factors.performance.bestPracticesScore = pageSpeed?.bestPracticesScore || 0;
  factors.performance.seoScore = pageSpeed?.seoScore || 0;

  if (factors.performance.pageSpeedScore >= 90) {
    performanceScore += 8;
  } else if (factors.performance.pageSpeedScore >= 50) {
    performanceScore += 4;
    recommendations.push('Improve PageSpeed Performance score');
  } else {
    recommendations.push('Significantly improve page performance');
  }

  if (factors.performance.accessibilityScore >= 90) {
    performanceScore += 6;
  } else if (factors.performance.accessibilityScore >= 70) {
    performanceScore += 3;
    recommendations.push('Improve accessibility score');
  } else {
    recommendations.push('Address accessibility issues');
  }

  if (factors.performance.bestPracticesScore >= 90) {
    performanceScore += 6;
  } else if (factors.performance.bestPracticesScore >= 70) {
    performanceScore += 3;
    recommendations.push('Follow web development best practices');
  }

  if (factors.performance.seoScore >= 90) {
    performanceScore += 5;
  } else if (factors.performance.seoScore >= 70) {
    performanceScore += 2;
    recommendations.push('Improve PageSpeed SEO score');
  }

  factors.performanceScore = performanceScore;

  // Calculate total authority score
  const totalScore = Math.min(100, technicalScore + contentScore + seoScore + performanceScore);

  return {
    score: Math.round(totalScore),
    factors,
    recommendations: recommendations.slice(0, 8), // Top 8 recommendations
  };
}
