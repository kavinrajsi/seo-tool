"use client";

import { useState, useMemo, useCallback } from "react";
import styles from "./SitemapTree.module.css";

function buildTree(urls) {
  const root = { segment: "", children: {}, urls: [], count: 0 };

  for (const entry of urls) {
    try {
      const parsed = new URL(entry.loc);
      const domain = parsed.origin;
      const pathSegments = parsed.pathname.split("/").filter(Boolean);

      // Ensure domain node exists
      if (!root.children[domain]) {
        root.children[domain] = { segment: domain, children: {}, urls: [], count: 0 };
      }

      let node = root.children[domain];
      node.count++;

      if (pathSegments.length === 0) {
        // Root URL
        node.urls.push(entry);
      } else {
        for (let i = 0; i < pathSegments.length; i++) {
          const seg = pathSegments[i];
          if (!node.children[seg]) {
            node.children[seg] = { segment: seg, children: {}, urls: [], count: 0 };
          }
          node = node.children[seg];
          node.count++;

          if (i === pathSegments.length - 1) {
            node.urls.push(entry);
          }
        }
      }
    } catch {
      // Skip invalid URLs
    }
  }

  return root;
}

function TreeNode({ node, depth = 0 }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = Object.keys(node.children).length > 0;
  const childKeys = Object.keys(node.children).sort();

  const toggle = useCallback(() => {
    setExpanded((p) => !p);
  }, []);

  return (
    <div className={styles.treeNode}>
      <div
        className={`${styles.nodeRow} ${hasChildren ? styles.hasChildren : ""}`}
        style={{ paddingLeft: depth * 20 }}
        onClick={hasChildren ? toggle : undefined}
      >
        {hasChildren && (
          <span className={`${styles.chevron} ${expanded ? styles.chevronExpanded : ""}`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </span>
        )}
        {!hasChildren && <span className={styles.leafDot} />}
        <span className={depth === 0 ? styles.domainLabel : styles.segmentLabel}>
          {node.segment}
        </span>
        <span className={styles.countBadge}>{node.count}</span>
      </div>

      {/* Leaf URL metadata */}
      {node.urls.length > 0 && expanded && (
        <div className={styles.urlMeta} style={{ paddingLeft: (depth + 1) * 20 }}>
          {node.urls.map((u) => (
            <div key={u.loc} className={styles.urlMetaItem}>
              <a href={u.loc} target="_blank" rel="noopener noreferrer" className={styles.urlLink}>
                {u.loc}
              </a>
              <div className={styles.metaTags}>
                {u.lastmod && <span className={styles.metaTag}>Modified: {u.lastmod}</span>}
                {u.changefreq && <span className={styles.metaTag}>Freq: {u.changefreq}</span>}
                {u.priority && <span className={styles.metaTag}>Priority: {u.priority}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Children */}
      {expanded && hasChildren && (
        <div className={styles.childrenContainer}>
          {childKeys.map((key) => (
            <TreeNode key={key} node={node.children[key]} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SitemapTree({ urls }) {
  const tree = useMemo(() => buildTree(urls), [urls]);
  const domainKeys = Object.keys(tree.children).sort();

  if (domainKeys.length === 0) {
    return <div className={styles.empty}>No URLs to display.</div>;
  }

  return (
    <div className={styles.treeContainer}>
      {domainKeys.map((key) => (
        <TreeNode key={key} node={tree.children[key]} depth={0} />
      ))}
    </div>
  );
}
