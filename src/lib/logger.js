/**
 * Structured JSON logger for Vercel log drain compatibility.
 * @param {string} context — where the error occurred (e.g. "api/analyze")
 * @param {Error|unknown} error — the caught error
 * @param {Record<string, unknown>} [meta] — optional metadata
 */
export function logError(context, error, meta) {
  const entry = {
    level: "error",
    context,
    message: error instanceof Error ? error.message : String(error),
    ...(error instanceof Error && error.stack ? { stack: error.stack } : {}),
    ...(meta ? { meta } : {}),
    timestamp: new Date().toISOString(),
  };
  console.error(JSON.stringify(entry));
}
