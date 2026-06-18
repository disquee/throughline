// ingest.js
// Walks the PKB content store and the published Docusaurus docs, and turns
// every source into a normalized Document with metadata and retrievable chunks.
//
// Sources:
//   jira       -> content-store/jira/*.csv      (one document per issue)
//   confluence -> content-store/confluence/*.md  (chunked by heading)
//   granola    -> content-store/granola/*.md     (chunked by heading)
//   published  -> docusaurus/docs/**/*.md        (the curated published layer)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { parse as parseCsv } from 'csv-parse/sync';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Repo root defaults to the parent of mcp-server/. Override with PKB_ROOT.
export const PKB_ROOT = process.env.PKB_ROOT
  ? path.resolve(process.env.PKB_ROOT)
  : path.resolve(__dirname, '..', '..');

const CONTENT = path.join(PKB_ROOT, 'content-store');
const DOCS = path.join(PKB_ROOT, 'docusaurus', 'docs');

// YAML auto-parses unquoted ISO dates into Date objects. Normalize everything
// to a YYYY-MM-DD string so output is clean and the staleness layer sees one type.
function toDateStr(v) {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

function walk(dir, ext) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, ext));
    else if (entry.name.endsWith(ext)) out.push(full);
  }
  return out;
}

// Split markdown body into sections keyed by their nearest heading.
function chunkMarkdown(body, baseId) {
  const lines = body.split('\n');
  const chunks = [];
  let heading = 'Overview';
  let buf = [];
  let n = 0;
  const flush = () => {
    const text = buf.join('\n').trim();
    if (text) chunks.push({ id: `${baseId}#${n++}`, heading, text });
    buf = [];
  };
  for (const line of lines) {
    const m = /^(#{1,3})\s+(.*)$/.exec(line);
    if (m) {
      flush();
      heading = m[2].trim();
    } else {
      buf.push(line);
    }
  }
  flush();
  return chunks.length ? chunks : [{ id: `${baseId}#0`, heading, text: body.trim() }];
}

function ingestMarkdownDir(dir, source) {
  return walk(dir, '.md').map((file) => {
    const raw = fs.readFileSync(file, 'utf8');
    const { data, content } = matter(raw);
    const slug = path.basename(file, '.md');
    const id = `${source}:${slug}`;
    const title = data.title || slug;
    return {
      id,
      source,
      title,
      path: path.relative(PKB_ROOT, file),
      url: data.source_url || null,
      lastUpdated: toDateStr(data.last_updated || data.date || data.last_review),
      owner: data.owner || null,
      status: data.status || null,
      text: content.trim(),
      chunks: chunkMarkdown(content, id),
    };
  });
}

function ingestPublishedDocs() {
  return walk(DOCS, '.md').map((file) => {
    const raw = fs.readFileSync(file, 'utf8');
    const { data, content } = matter(raw);
    const rel = path.relative(DOCS, file).replace(/\.md$/, '');
    const id = `published:${rel.replace(/\\/g, '/')}`;
    const route =
      data.slug === '/' ? '/' : '/' + rel.replace(/\\/g, '/').replace(/\/index$/, '');
    return {
      id,
      source: 'published',
      title: data.title || rel,
      path: path.relative(PKB_ROOT, file),
      url: route,
      lastUpdated: toDateStr(data.last_review || data.last_updated),
      owner: data.owner || null,
      status: 'published',
      text: content.trim(),
      chunks: chunkMarkdown(content, id),
    };
  });
}

function ingestJira() {
  const docs = [];
  for (const file of walk(path.join(CONTENT, 'jira'), '.csv')) {
    const rows = parseCsv(fs.readFileSync(file, 'utf8'), {
      columns: true,
      skip_empty_lines: true,
    });
    for (const r of rows) {
      const key = r['Issue key'];
      const id = `jira:${key}`;
      const text = [
        `${r['Issue Type']}: ${r['Summary']}`,
        `Status: ${r['Status']} | Priority: ${r['Priority']} | Fix Version: ${r['Fix Version']}`,
        `Components: ${r['Components']} | Labels: ${r['Labels']}`,
        r['Epic Link'] ? `Epic: ${r['Epic Link']}` : '',
        '',
        r['Description'],
      ]
        .filter(Boolean)
        .join('\n');
      docs.push({
        id,
        source: 'jira',
        title: `${key} — ${r['Summary']}`,
        path: path.relative(PKB_ROOT, file),
        url: `https://jira.internal/browse/${key}`,
        lastUpdated: toDateStr(r['Updated']),
        owner: r['Assignee'] || null,
        status: r['Status'] || null,
        fixVersion: r['Fix Version'] || null,
        text,
        chunks: [{ id: `${id}#0`, heading: r['Summary'], text }],
      });
    }
  }
  return docs;
}

export function ingestAll() {
  const docs = [
    ...ingestJira(),
    ...ingestMarkdownDir(path.join(CONTENT, 'confluence'), 'confluence'),
    ...ingestMarkdownDir(path.join(CONTENT, 'granola'), 'granola'),
    ...ingestPublishedDocs(),
  ];
  return docs;
}
