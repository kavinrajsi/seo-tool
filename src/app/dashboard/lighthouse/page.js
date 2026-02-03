'use client';

import { useState } from 'react';
import styles from './lighthouse.module.css';
import ScoreGauge from '@/app/components/ScoreGauge';

export default function LighthousePage() {
  const [url, setUrl] = useState('');
  const [formFactor, setFormFactor] = useState('mobile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const res = await fetch('/api/lighthouse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), formFactor }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to run Lighthouse audit');
        return;
      }

      setResults(data);
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Lighthouse Performance Audit</h1>
        <p>Run a comprehensive Lighthouse audit to measure performance, accessibility, SEO, and best practices.</p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter URL to audit (e.g., https://example.com)"
            className={styles.input}
            disabled={loading}
          />

          <div className={styles.deviceToggle}>
            <button
              type="button"
              className={formFactor === 'mobile' ? styles.active : ''}
              onClick={() => setFormFactor('mobile')}
              disabled={loading}
            >
              📱 Mobile
            </button>
            <button
              type="button"
              className={formFactor === 'desktop' ? styles.active : ''}
              onClick={() => setFormFactor('desktop')}
              disabled={loading}
            >
              💻 Desktop
            </button>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading || !url.trim()}>
            {loading ? 'Running Audit...' : 'Run Lighthouse Audit'}
          </button>
        </div>
      </form>

      {loading && (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Running Lighthouse audit on {formFactor} device...</p>
          <p className={styles.loadingNote}>This may take 30-60 seconds</p>
        </div>
      )}

      {error && (
        <div className={styles.error}>
          <h3>Error</h3>
          <p>{error}</p>
        </div>
      )}

      {results && (
        <div className={styles.results}>
          <div className={styles.resultHeader}>
            <h2>Audit Results</h2>
            <div className={styles.metadata}>
              <span>URL: {results.url}</span>
              <span>Device: {results.formFactor === 'mobile' ? '📱 Mobile' : '💻 Desktop'}</span>
              <span>Analyzed: {new Date(results.analyzedAt).toLocaleString()}</span>
            </div>
          </div>

          {/* Category Scores */}
          <div className={styles.scores}>
            <div className={styles.scoreCard}>
              <ScoreGauge score={results.performanceScore} label="Performance" size={120} />
            </div>
            <div className={styles.scoreCard}>
              <ScoreGauge score={results.accessibilityScore} label="Accessibility" size={120} />
            </div>
            <div className={styles.scoreCard}>
              <ScoreGauge score={results.seoScore} label="SEO" size={120} />
            </div>
            <div className={styles.scoreCard}>
              <ScoreGauge score={results.bestPracticesScore} label="Best Practices" size={120} />
            </div>
          </div>

          {/* Core Web Vitals */}
          {results.metrics && Object.keys(results.metrics).length > 0 && (
            <div className={styles.section}>
              <h3>Core Web Vitals</h3>
              <div className={styles.metrics}>
                {Object.entries(results.metrics).map(([key, metric]) => (
                  <div key={key} className={styles.metricCard}>
                    <div className={styles.metricLabel}>{metric.label}</div>
                    <div className={styles.metricValue}>{metric.display || 'N/A'}</div>
                    <div className={styles.metricScore}>
                      <div
                        className={styles.scoreBar}
                        style={{
                          width: `${(metric.score || 0) * 100}%`,
                          backgroundColor: getScoreColor(metric.score),
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Opportunities */}
          {results.opportunities && results.opportunities.length > 0 && (
            <div className={styles.section}>
              <h3>Opportunities for Improvement</h3>
              <div className={styles.opportunities}>
                {results.opportunities.map((opp, idx) => (
                  <div key={idx} className={styles.opportunity}>
                    <div className={styles.oppHeader}>
                      <h4>{opp.title}</h4>
                      {opp.displayValue && (
                        <span className={styles.oppValue}>{opp.displayValue}</span>
                      )}
                    </div>
                    {opp.description && (
                      <p className={styles.oppDescription}>{opp.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getScoreColor(score) {
  if (score === null || score === undefined) return '#666';
  if (score >= 0.9) return '#8fff00';
  if (score >= 0.5) return '#ffaa00';
  return '#ff4444';
}
