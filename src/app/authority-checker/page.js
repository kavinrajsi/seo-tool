'use client';

import { useState } from 'react';
import Navbar from '@/app/components/Navbar';
import styles from './authority.module.css';

export default function AuthorityChecker() {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!domain.trim()) return;

    setLoading(true);
    setError('');
    setResults(null);

    try {
      const res = await fetch('/api/authority-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domain.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to check authority');
        return;
      }

      setResults(data);
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className={styles.container}>
        <div className={styles.hero}>
          <h1>Website Authority Checker</h1>
          <p>
            Enter a domain to check its authority score and reveal its SEO strength.
            Get instant insights into your website's trustworthiness and search engine performance.
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="Enter domain (e.g., example.com)"
              className={styles.input}
              disabled={loading}
            />
            <button
              type="submit"
              className={styles.button}
              disabled={loading || !domain.trim()}
            >
              {loading ? 'Checking...' : 'Check Authority'}
            </button>
          </div>
        </form>

        {loading && (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Analyzing {domain}...</p>
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
            {/* Authority Score Gauge */}
            <div className={styles.scoreSection}>
              <div className={styles.mainScore}>
                <div className={styles.scoreGauge}>
                  <svg viewBox="0 0 200 120" className={styles.gaugeSvg}>
                    <path
                      d="M 20 100 A 80 80 0 0 1 180 100"
                      fill="none"
                      stroke="#222"
                      strokeWidth="20"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 20 100 A 80 80 0 0 1 180 100"
                      fill="none"
                      stroke={getScoreColor(results.authorityScore)}
                      strokeWidth="20"
                      strokeLinecap="round"
                      strokeDasharray={`${(results.authorityScore / 100) * 251.2} 251.2`}
                    />
                  </svg>
                  <div className={styles.scoreValue}>
                    <span className={styles.scoreNumber}>{results.authorityScore}</span>
                    <span className={styles.scoreLabel}>Authority Score</span>
                  </div>
                </div>
                <div className={styles.scoreRating}>
                  <span className={styles.ratingLabel}>Rating:</span>
                  <span className={`${styles.ratingValue} ${styles[getRatingClass(results.authorityScore)]}`}>
                    {getRatingText(results.authorityScore)}
                  </span>
                </div>
              </div>

              <div className={styles.domainInfo}>
                <h2>{results.domain}</h2>
                <p className={styles.analyzedTime}>
                  Analyzed: {new Date(results.analyzedAt).toLocaleString()}
                </p>
              </div>
            </div>

            {/* How We Calculate */}
            <div className={styles.section}>
              <h3>How Do We Calculate Website Authority?</h3>
              <p className={styles.sectionDesc}>
                We calculate website authority using our SEO health score metric, which estimates how trustworthy
                and influential a website is based on multiple technical and content factors.
              </p>
            </div>

            {/* Factors Breakdown */}
            <div className={styles.factorsGrid}>
              {/* Technical SEO */}
              <div className={styles.factorCard}>
                <div className={styles.factorIcon}>⚡</div>
                <h4>Technical SEO</h4>
                <div className={styles.factorScore}>
                  {results.factors.technicalScore}/100
                </div>
                <ul className={styles.factorList}>
                  <li className={results.factors.technical.https ? styles.pass : styles.fail}>
                    {results.factors.technical.https ? '✓' : '✗'} HTTPS Enabled
                  </li>
                  <li className={results.factors.technical.mobileResponsive ? styles.pass : styles.fail}>
                    {results.factors.technical.mobileResponsive ? '✓' : '✗'} Mobile Responsive
                  </li>
                  <li className={results.factors.technical.fastLoading ? styles.pass : styles.fail}>
                    {results.factors.technical.fastLoading ? '✓' : '✗'} Fast Loading ({results.factors.technical.loadTime}ms)
                  </li>
                  <li className={results.factors.technical.validStructure ? styles.pass : styles.fail}>
                    {results.factors.technical.validStructure ? '✓' : '✗'} Valid HTML Structure
                  </li>
                </ul>
              </div>

              {/* Content Quality */}
              <div className={styles.factorCard}>
                <div className={styles.factorIcon}>📝</div>
                <h4>Content Quality</h4>
                <div className={styles.factorScore}>
                  {results.factors.contentScore}/100
                </div>
                <ul className={styles.factorList}>
                  <li className={results.factors.content.hasTitle ? styles.pass : styles.fail}>
                    {results.factors.content.hasTitle ? '✓' : '✗'} Optimized Title Tag
                  </li>
                  <li className={results.factors.content.hasDescription ? styles.pass : styles.fail}>
                    {results.factors.content.hasDescription ? '✓' : '✗'} Meta Description
                  </li>
                  <li className={results.factors.content.hasHeadings ? styles.pass : styles.fail}>
                    {results.factors.content.hasHeadings ? '✓' : '✗'} Proper Heading Structure
                  </li>
                  <li className={results.factors.content.contentLength ? styles.pass : styles.fail}>
                    {results.factors.content.contentLength ? '✓' : '✗'} Sufficient Content ({results.factors.content.wordCount} words)
                  </li>
                </ul>
              </div>

              {/* SEO Signals */}
              <div className={styles.factorCard}>
                <div className={styles.factorIcon}>🔍</div>
                <h4>SEO Signals</h4>
                <div className={styles.factorScore}>
                  {results.factors.seoScore}/100
                </div>
                <ul className={styles.factorList}>
                  <li className={results.factors.seo.hasSchema ? styles.pass : styles.fail}>
                    {results.factors.seo.hasSchema ? '✓' : '✗'} Schema Markup
                  </li>
                  <li className={results.factors.seo.hasSitemap ? styles.pass : styles.fail}>
                    {results.factors.seo.hasSitemap ? '✓' : '✗'} XML Sitemap
                  </li>
                  <li className={results.factors.seo.hasRobots ? styles.pass : styles.fail}>
                    {results.factors.seo.hasRobots ? '✓' : '✗'} Robots.txt
                  </li>
                  <li className={results.factors.seo.hasOpenGraph ? styles.pass : styles.fail}>
                    {results.factors.seo.hasOpenGraph ? '✓' : '✗'} Social Meta Tags
                  </li>
                </ul>
              </div>

              {/* Performance */}
              <div className={styles.factorCard}>
                <div className={styles.factorIcon}>🚀</div>
                <h4>Performance</h4>
                <div className={styles.factorScore}>
                  {results.factors.performanceScore}/100
                </div>
                <ul className={styles.factorList}>
                  <li>Page Speed: {results.factors.performance.pageSpeedScore || 'N/A'}</li>
                  <li>Accessibility: {results.factors.performance.accessibilityScore || 'N/A'}</li>
                  <li>Best Practices: {results.factors.performance.bestPracticesScore || 'N/A'}</li>
                  <li>SEO Score: {results.factors.performance.seoScore || 'N/A'}</li>
                </ul>
              </div>
            </div>

            {/* Recommendations */}
            {results.recommendations && results.recommendations.length > 0 && (
              <div className={styles.section}>
                <h3>Recommendations to Improve Authority</h3>
                <div className={styles.recommendations}>
                  {results.recommendations.map((rec, idx) => (
                    <div key={idx} className={styles.recommendation}>
                      <div className={styles.recIcon}>💡</div>
                      <p>{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            <div className={styles.cta}>
              <h3>Want a Detailed SEO Analysis?</h3>
              <p>Get a comprehensive 33-point SEO audit including all on-page factors, content analysis, and more.</p>
              <a href="/" className={styles.ctaBtn}>Run Full SEO Analysis</a>
            </div>
          </div>
        )}

        {/* Info Section */}
        {!results && !loading && (
          <div className={styles.info}>
            <h2>How Do We Calculate Website Authority?</h2>
            <p>
              We calculate website authority using our SEO health score metric, which estimates how trustworthy
              and influential a website is based on three main factors.
            </p>

            <div className={styles.infoCards}>
              <div className={styles.infoCard}>
                <div className={styles.infoIcon}>⚡</div>
                <h4>Technical SEO Signals</h4>
                <p>
                  We analyze technical factors like HTTPS, mobile responsiveness, page speed, and HTML validity.
                  The better your technical SEO, the higher your authority score.
                </p>
              </div>

              <div className={styles.infoCard}>
                <div className={styles.infoIcon}>📊</div>
                <h4>Performance Metrics</h4>
                <p>
                  We check Google PageSpeed scores for performance, accessibility, SEO, and best practices.
                  Higher scores indicate better user experience and search engine friendliness.
                </p>
              </div>

              <div className={styles.infoCard}>
                <div className={styles.infoIcon}>✅</div>
                <h4>Content & SEO Quality</h4>
                <p>
                  We evaluate content structure, meta tags, schema markup, and SEO best practices.
                  Well-optimized content significantly boosts your authority score.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function getScoreColor(score) {
  if (score >= 80) return '#8fff00';
  if (score >= 60) return '#ffaa00';
  if (score >= 40) return '#ff8800';
  return '#ff4444';
}

function getRatingClass(score) {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
}

function getRatingText(score) {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Needs Improvement';
}
