// observe.js
// The observability report. Reads two things the PKB produces while it runs,
// the query log and the document metadata, and turns them into three signals a
// content owner can act on:
//
//   queries     what people actually ask, and how often
//   gaps        questions that came back empty (hard gaps) or weakly answered
//               (weak coverage). This is demand for content that does not exist
//               yet, or exists but does not rank.
//   staleness   published pages that have fallen behind their source, sources
//               that have gone cold, and orphan pages nothing points to.
//
// Run:  node scripts/observe.js          human summary + writes observability-report.json
//       node scripts/observe.js --json   machine-readable report to stdout only
//       PKB_ASOF=2026-06-17 PKB_QUERY_LOG=path node scripts/observe.js

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ingestAll } from '../mcp-server/src/ingest.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ASOF = process.env.PKB_ASOF ? new Date(process.env.PKB_ASOF) : new Date();
const QUERY_LOG = process.env.PKB_QUERY_LOG || path.join(__dirname, 'query-log.jsonl');

const STALE_DAYS = 180; // a documentation source older than this needs a look
const WEAK_SCORE = 2.5; // best BM25 score below this means the answer is thin

// Tokens too generic to imply two documents are about the same thing.
const GENERIC = new Set([
  'the', 'and', 'for', 'notes', 'internal', 'draft', 'overview', 'reference',
  'configuring', 'config', 'guide', 'venueos', 'product', 'knowledge', 'base',
  'docs', 'published',
]);

function tokens(s) {
  return new Set(
    (s || '')
      .toLowerCase()
      .match(/[a-z0-9]+/g)
      ?.filter((t) => t.length >= 3 && !GENERIC.has(t)) || []
  );
}

function daysBetween(a, b) {
  return Math.round((a - new Date(b)) / 86_400_000);
}

// ---- query + gap signals --------------------------------------------------

function readLog() {
  if (!fs.existsSync(QUERY_LOG)) return [];
  return fs
    .readFileSync(QUERY_LOG, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

// Roll repeated queries up into one row with a count and the worst-case result.
function aggregate(entries) {
  const byQuery = new Map();
  for (const e of entries) {
    const key = e.query.trim().toLowerCase();
    const row = byQuery.get(key) || { query: e.query, count: 0, resultCount: e.resultCount, topScore: e.topScore };
    row.count += 1;
    row.resultCount = Math.min(row.resultCount, e.resultCount);
    row.topScore = Math.min(row.topScore, e.topScore);
    byQuery.set(key, row);
  }
  return [...byQuery.values()];
}

function querySignals(entries) {
  const rows = aggregate(entries);
  const total = entries.length;
  const dates = entries.map((e) => e.ts).sort();
  const withFilter = entries.filter((e) => e.source).length;

  const hardGaps = rows
    .filter((r) => r.resultCount === 0)
    .sort((a, b) => b.count - a.count);
  const weakCoverage = rows
    .filter((r) => r.resultCount > 0 && r.topScore < WEAK_SCORE)
    .sort((a, b) => b.count - a.count);

  const zeroAsked = hardGaps.reduce((s, r) => s + r.count, 0);

  return {
    totalQueries: total,
    uniqueQueries: rows.length,
    span: total ? { from: dates[0].slice(0, 10), to: dates[dates.length - 1].slice(0, 10) } : null,
    sourceFilterRate: total ? Number(((withFilter / total) * 100).toFixed(1)) : 0,
    zeroResultRate: total ? Number(((zeroAsked / total) * 100).toFixed(1)) : 0,
    topQueries: [...rows].sort((a, b) => b.count - a.count).slice(0, 8),
    hardGaps,
    weakCoverage,
  };
}

// ---- staleness signal -----------------------------------------------------

// Link each published page to the source documents it is about, by topical
// token overlap. No explicit foreign key exists in the frontmatter, so shared
// subject words stand in for lineage.
function buildLineage(docs) {
  const published = docs.filter((d) => d.source === 'published');
  const sources = docs.filter((d) => d.source === 'confluence');
  const links = new Map(); // published id -> [source docs]
  const linkedSources = new Set();

  for (const p of published) {
    const pTokens = tokens(`${p.id.replace('published:', '')} ${p.title}`);
    const matched = sources.filter((s) => {
      const sTokens = tokens(`${s.id.replace('confluence:', '')} ${s.title}`);
      return [...sTokens].some((t) => pTokens.has(t));
    });
    links.set(p.id, matched);
    matched.forEach((s) => linkedSources.add(s.id));
  }
  return { published, sources, links, linkedSources };
}

function stalenessSignals(docs) {
  const { published, sources, links, linkedSources } = buildLineage(docs);

  // 1. Drift: a published page whose source moved after the page was reviewed.
  const drift = [];
  for (const p of published) {
    for (const s of links.get(p.id) || []) {
      if (p.lastUpdated && s.lastUpdated && s.lastUpdated > p.lastUpdated) {
        drift.push({
          page: p.id,
          source: s.id,
          reviewed: p.lastUpdated,
          sourceUpdated: s.lastUpdated,
          behindDays: daysBetween(new Date(s.lastUpdated), p.lastUpdated),
        });
      }
    }
  }

  // 2. Cold sources: documentation last touched longer ago than STALE_DAYS.
  const coldSources = docs
    .filter((d) => d.source === 'confluence' || d.source === 'published')
    .filter((d) => d.lastUpdated && daysBetween(ASOF, d.lastUpdated) > STALE_DAYS)
    .map((d) => ({ id: d.id, lastUpdated: d.lastUpdated, ageDays: daysBetween(ASOF, d.lastUpdated), owner: d.owner || null }))
    .sort((a, b) => b.ageDays - a.ageDays);

  // 3. Orphans: a published-status source no published page draws from.
  const orphans = sources
    .filter((s) => !linkedSources.has(s.id))
    .map((s) => ({ id: s.id, lastUpdated: s.lastUpdated, ageDays: s.lastUpdated ? daysBetween(ASOF, s.lastUpdated) : null, owner: s.owner || null }));

  const lineage = {};
  for (const [pid, ss] of links) lineage[pid] = ss.map((s) => s.id);

  return { drift, coldSources, orphans, lineage };
}

export function observe() {
  const docs = ingestAll();
  return {
    generatedAt: ASOF.toISOString().slice(0, 10),
    queries: querySignals(readLog()),
    staleness: stalenessSignals(docs),
  };
}

// ---- reporting ------------------------------------------------------------

function printSummary(r) {
  const q = r.queries;
  console.log(`\nVenueOS PKB — observability report   ${r.generatedAt}\n`);

  console.log('queries');
  if (!q.totalQueries) {
    console.log('  no query log yet. Run some searches against the MCP server first.\n');
  } else {
    console.log(`  ${q.totalQueries} searches (${q.uniqueQueries} unique) from ${q.span.from} to ${q.span.to}`);
    console.log(`  ${q.zeroResultRate}% returned nothing · ${q.sourceFilterRate}% used a source filter`);
    console.log('  most asked:');
    for (const t of q.topQueries) console.log(`    ${String(t.count).padStart(2)}x  ${t.query}`);
  }

  console.log('\ngaps');
  if (q.hardGaps.length) {
    console.log('  hard (zero results, content does not exist):');
    for (const g of q.hardGaps) console.log(`    ${String(g.count).padStart(2)}x  ${g.query}`);
  } else {
    console.log('  no hard gaps');
  }
  if (q.weakCoverage.length) {
    console.log(`  weak (answered, but best score < ${WEAK_SCORE}, content is thin):`);
    for (const g of q.weakCoverage) console.log(`    ${String(g.count).padStart(2)}x  ${g.query}  (score ${g.topScore})`);
  }

  const s = r.staleness;
  console.log('\nstaleness');
  if (s.drift.length) {
    console.log('  drift (source changed after the page was reviewed):');
    for (const d of s.drift) console.log(`    ${d.page} is ${d.behindDays}d behind ${d.source} (reviewed ${d.reviewed}, source ${d.sourceUpdated})`);
  } else {
    console.log('  no drift: every published page was reviewed at or after its sources');
  }
  if (s.coldSources.length) {
    console.log(`  cold (not updated in over ${STALE_DAYS} days):`);
    for (const c of s.coldSources) console.log(`    ${c.id}  last updated ${c.lastUpdated} (${c.ageDays}d ago${c.owner ? ', owner ' + c.owner : ''})`);
  }
  if (s.orphans.length) {
    console.log('  orphans (published source no live page draws from):');
    for (const o of s.orphans) console.log(`    ${o.id}${o.lastUpdated ? '  last updated ' + o.lastUpdated : ''}`);
  }
  console.log('');
}

function main() {
  const report = observe();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  printSummary(report);
  const outPath = path.join(__dirname, 'observability-report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');
  console.log(`wrote ${path.relative(path.resolve(__dirname, '..'), outPath)}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
