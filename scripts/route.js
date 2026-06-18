// route.js
// The documentation routing classifier. Consumes ingestAll() and decides how
// each document should be produced and maintained:
//
//   auto-generate     machine writes it from a system of record, no review gate
//   hybrid            machine drafts, human edits before publish
//   draft-then-review machine drafts, human must verify before it ships
//   human-authored    a person writes it; judgment and framing carry the page
//
// Those four routes roll up into three target buckets the content strategy is
// measured against:
//
//   automated  = auto-generate
//   curated    = hybrid + draft-then-review
//   original   = human-authored
//
// Target mix is 60 / 20 / 20. The report shows where we actually land and the
// gap from target, which is the whole point: it tells you whether you are
// over-leaning on automation or starving the original layer.
//
// Run:  node scripts/route.js            human summary + writes routing-report.json
//       node scripts/route.js --json     machine-readable report to stdout only
//       PKB_ASOF=2026-06-17 node scripts/route.js   pin "today" for staleness

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ingestAll } from '../mcp-server/src/ingest.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// "Today" for the staleness signal. Pin it with PKB_ASOF so reports are
// reproducible; otherwise it follows the wall clock.
const ASOF = process.env.PKB_ASOF ? new Date(process.env.PKB_ASOF) : new Date();
const STALE_DAYS = 180;

const TARGET = { automated: 60, curated: 20, original: 20 };

const ROUTE_TO_BUCKET = {
  'auto-generate': 'automated',
  hybrid: 'curated',
  'draft-then-review': 'curated',
  'human-authored': 'original',
};

// Intent markers. We read title + headings + path, not the full body, because
// that is where a page declares what it is.
const CONCEPT = [
  'overview', 'introduction', 'intro', 'getting started', 'concept', 'guide',
  'vision', 'principles', 'background', 'rationale', 'narrative',
  'how it works', 'what is', 'why ',
];
const REFERENCE = [
  'api', 'endpoint', 'parameter', 'field', 'schema', 'reference',
  'config', 'configuration', 'settings', 'request', 'response',
];

// Fraction of non-empty body lines that look mechanical (lists, tables, code,
// headings, key: value). High ratio means the page regenerates cleanly.
function structuredLineRatio(body) {
  const lines = (body || '').split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return 0;
  const structured = lines.filter((l) =>
    /^([-*|]|\d+\.|```|#{1,6}\s|\w[\w /-]*:\s)/.test(l)
  ).length;
  return structured / lines.length;
}

// Staleness only applies to documentation layers. Raw signal (jira, granola)
// is never "stale" in this sense; it is a point-in-time record.
function isStale(doc) {
  if (doc.source !== 'confluence' && doc.source !== 'published') return false;
  if (!doc.lastUpdated) return false;
  const age = (ASOF - new Date(doc.lastUpdated)) / 86_400_000;
  return age > STALE_DAYS;
}

function ageDays(doc) {
  return Math.round((ASOF - new Date(doc.lastUpdated)) / 86_400_000);
}

function computeSignals(doc) {
  const hay = [
    doc.title || '',
    (doc.chunks || []).map((c) => c.heading).join(' '),
    doc.path || '',
  ]
    .join('\n')
    .toLowerCase();

  const pathl = (doc.path || '').toLowerCase();
  return {
    conceptual: CONCEPT.some((w) => hay.includes(w)),
    reference: REFERENCE.some((w) => hay.includes(w)),
    releaseNotes:
      /release[-\s]?notes/.test(hay) || /releases?\b/.test(pathl) || /changelog/.test(hay),
    structuredRatio: Number(structuredLineRatio(doc.text).toFixed(2)),
    stale: isStale(doc),
  };
}

// The decision tree. First rule that fires wins, so order encodes priority.
// Every branch returns a route and a reason a human can argue with.
function classify(doc, s) {
  if (doc.source === 'granola') {
    return {
      route: 'draft-then-review',
      reason: 'raw meeting transcript, so a model can draft a summary but a person verifies the claims before it publishes',
    };
  }
  if (doc.source === 'jira') {
    return {
      route: 'auto-generate',
      reason: 'structured issue record from the system of record, maps mechanically to status and release docs',
    };
  }
  if (s.conceptual) {
    return {
      route: 'human-authored',
      reason: 'conceptual or narrative page, the framing and judgment are the value and cannot be sourced mechanically',
    };
  }
  if (s.stale) {
    return {
      route: 'draft-then-review',
      reason: `source last updated ${doc.lastUpdated} (${ageDays(doc)}d ago), regenerate a draft and have ${doc.owner || 'an owner'} review`,
    };
  }
  if (s.releaseNotes) {
    return {
      route: 'auto-generate',
      reason: 'release notes derive directly from resolved issues and the fix version',
    };
  }
  if (s.reference && s.structuredRatio >= 0.35) {
    return {
      route: 'auto-generate',
      reason: `structured reference content (${Math.round(s.structuredRatio * 100)}% structured lines), regenerates from the definitions`,
    };
  }
  if (s.reference || s.structuredRatio >= 0.35) {
    return {
      route: 'hybrid',
      reason: 'structured source that still needs light editorial framing before publish',
    };
  }
  return {
    route: 'draft-then-review',
    reason: 'mixed signal, safest to generate a draft and route it to a reviewer',
  };
}

export function routeAll(docs = ingestAll()) {
  const documents = docs.map((doc) => {
    const signals = computeSignals(doc);
    const { route, reason } = classify(doc, signals);
    return { id: doc.id, source: doc.source, title: doc.title, route, bucket: ROUTE_TO_BUCKET[route], reason, signals };
  });

  const total = documents.length || 1;
  const buckets = {};
  for (const name of ['automated', 'curated', 'original']) {
    const docsIn = documents.filter((d) => d.bucket === name);
    const share = Number(((docsIn.length / total) * 100).toFixed(1));
    buckets[name] = {
      count: docsIn.length,
      share,
      target: TARGET[name],
      delta: Number((share - TARGET[name]).toFixed(1)),
      docs: docsIn.map((d) => d.id),
    };
  }

  return {
    generatedAt: ASOF.toISOString().slice(0, 10),
    total: documents.length,
    target: TARGET,
    buckets,
    documents,
  };
}

// ---- reporting ----------------------------------------------------------

function bar(share, width = 24) {
  const filled = Math.round((share / 100) * width);
  return '█'.repeat(filled) + '·'.repeat(Math.max(0, width - filled));
}

function printSummary(report) {
  const pad = (s, n) => String(s).padEnd(n);
  console.log(`\nVenueOS PKB — routing report   ${report.generatedAt}   ${report.total} documents\n`);

  console.log(`${pad('bucket', 11)}${pad('count', 7)}${pad('share', 8)}${pad('target', 8)}delta`);
  for (const [name, b] of Object.entries(report.buckets)) {
    const delta = b.delta > 0 ? `+${b.delta}` : `${b.delta}`;
    console.log(
      `${pad(name, 11)}${pad(b.count, 7)}${pad(b.share + '%', 8)}${pad(b.target + '%', 8)}${delta}pp  ${bar(b.share)}`
    );
  }

  console.log('\nper document:');
  const order = ['auto-generate', 'hybrid', 'draft-then-review', 'human-authored'];
  for (const route of order) {
    const rows = report.documents.filter((d) => d.route === route);
    if (!rows.length) continue;
    console.log(`\n  ${route}  (${rows.length})`);
    for (const d of rows) {
      console.log(`    ${d.id}`);
      console.log(`        ${d.reason}`);
    }
  }

  const off = Object.values(report.buckets).reduce((s, b) => s + Math.abs(b.delta), 0);
  console.log(`\ntotal drift from target: ${off.toFixed(1)}pp across three buckets\n`);
}

function main() {
  const report = routeAll();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  printSummary(report);
  const outPath = path.join(__dirname, 'routing-report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');
  console.log(`wrote ${path.relative(path.resolve(__dirname, '..'), outPath)}\n`);
}

// Run as a script, stay importable as a module.
if (import.meta.url === `file://${process.argv[1]}`) main();
