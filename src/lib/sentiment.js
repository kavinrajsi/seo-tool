const POSITIVE_WORDS = new Set([
  "good", "great", "excellent", "amazing", "awesome", "fantastic", "wonderful",
  "love", "loved", "best", "perfect", "happy", "pleased", "impressed",
  "recommend", "recommended", "outstanding", "superb", "brilliant", "beautiful",
  "fast", "quick", "easy", "smooth", "reliable", "quality", "helpful",
  "friendly", "nice", "satisfied", "delighted", "thank", "thanks", "enjoy",
  "enjoyed", "enjoyable", "comfortable", "convenient", "professional",
  "exceptional", "stellar", "terrific", "solid", "premium", "fresh",
]);

const NEGATIVE_WORDS = new Set([
  "bad", "terrible", "horrible", "awful", "worst", "poor", "disappointing",
  "disappointed", "hate", "hated", "broken", "defective", "cheap", "slow",
  "useless", "waste", "ugly", "rude", "annoying", "frustrating", "frustrated",
  "difficult", "complicated", "confusing", "damaged", "missing", "wrong",
  "overpriced", "scam", "fake", "refund", "return", "returned", "complaint",
  "never", "problem", "issue", "issues", "problems", "fail", "failed",
  "failure", "unhappy", "regret", "unacceptable", "mediocre", "inferior",
]);

const NEGATORS = new Set([
  "not", "no", "never", "neither", "nobody", "nothing", "nowhere",
  "hardly", "barely", "scarcely", "don't", "doesn't", "didn't",
  "wasn't", "weren't", "won't", "wouldn't", "couldn't", "shouldn't",
  "isn't", "aren't", "cannot", "can't",
]);

const INTENSIFIERS = new Set([
  "very", "really", "extremely", "incredibly", "absolutely", "totally",
  "highly", "super", "so", "truly", "remarkably", "exceptionally",
]);

export function analyzeSentiment(text) {
  if (!text || typeof text !== "string") {
    return { sentiment: "neutral", score: 0 };
  }

  const words = text.toLowerCase().replace(/[^a-z'\s-]/g, " ").split(/\s+/).filter(Boolean);
  let score = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let wordScore = 0;

    if (POSITIVE_WORDS.has(word)) {
      wordScore = 1;
    } else if (NEGATIVE_WORDS.has(word)) {
      wordScore = -1;
    } else {
      continue;
    }

    // Check for negator in previous 1-2 words
    const prev1 = i > 0 ? words[i - 1] : "";
    const prev2 = i > 1 ? words[i - 2] : "";
    if (NEGATORS.has(prev1) || NEGATORS.has(prev2)) {
      wordScore *= -1;
    }

    // Check for intensifier in previous word
    if (INTENSIFIERS.has(prev1)) {
      wordScore *= 1.5;
    }

    score += wordScore;
  }

  // Normalize to -1..1 range
  const maxPossible = Math.max(words.length * 0.5, 1);
  const normalized = Math.max(-1, Math.min(1, score / maxPossible));

  let sentiment;
  if (normalized > 0.05) {
    sentiment = "positive";
  } else if (normalized < -0.05) {
    sentiment = "negative";
  } else {
    sentiment = "neutral";
  }

  return {
    sentiment,
    score: Math.round(normalized * 1000) / 1000,
  };
}
