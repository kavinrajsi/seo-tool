/**
 * Calculate overall and per-category scores from a checks array.
 * Returns { score, category_scores }.
 */
export function calculateScores(checks) {
  const maxScore = checks.reduce((sum, c) => sum + c.weight, 0);
  const earnedScore = checks.reduce(
    (sum, c) => sum + (c.pass ? c.weight : 0),
    0
  );
  const score = maxScore > 0 ? Math.round((earnedScore / maxScore) * 100) : 0;

  // Per-category scores
  const categoryMap = {};
  for (const c of checks) {
    const cat = c.category;
    if (!categoryMap[cat]) categoryMap[cat] = { earned: 0, max: 0 };
    categoryMap[cat].max += c.weight;
    if (c.pass) categoryMap[cat].earned += c.weight;
  }
  const category_scores = {};
  for (const [cat, { earned, max }] of Object.entries(categoryMap)) {
    category_scores[cat] = {
      earned,
      max,
      pct: max > 0 ? Math.round((earned / max) * 100) : 100,
    };
  }

  return { score, category_scores };
}
