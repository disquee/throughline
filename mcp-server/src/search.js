// search.js
// A small, dependency-free BM25 retriever over the PKB chunks. No API keys,
// runs offline. The retrieval layer is intentionally swappable: replace
// buildIndex/search with an embedding + vector store (or an MCP RAG backend)
// without changing the server's tool surface.

const STOP = new Set(
  ('a an the and or of to in on for is are was were be been it its this that with as at by from ' +
    'we you they i he she them our your their not no do does did so if then than into out up down ' +
    'can could will would should may might must have has had get got').split(' ')
);

function tokenize(text) {
  return (text.toLowerCase().match(/[a-z0-9]+/g) || []).filter(
    (t) => t.length >= 2 && !STOP.has(t)
  );
}

const K1 = 1.5;
const B = 0.75;

// Build an index over every chunk of every document.
export function buildIndex(docs) {
  const chunks = [];
  for (const doc of docs) {
    for (const ch of doc.chunks) {
      const tokens = tokenize(ch.text);
      const tf = new Map();
      for (const tok of tokens) tf.set(tok, (tf.get(tok) || 0) + 1);
      chunks.push({
        chunkId: ch.id,
        heading: ch.heading,
        text: ch.text,
        doc,
        tf,
        len: tokens.length,
      });
    }
  }

  const df = new Map();
  for (const c of chunks) for (const tok of c.tf.keys()) df.set(tok, (df.get(tok) || 0) + 1);

  const N = chunks.length || 1;
  const avgdl = chunks.reduce((s, c) => s + c.len, 0) / N;

  const idf = new Map();
  for (const [tok, d] of df) idf.set(tok, Math.log(1 + (N - d + 0.5) / (d + 0.5)));

  return { chunks, idf, avgdl, N };
}

function snippet(text, queryTokens, max = 280) {
  const lower = text.toLowerCase();
  let pos = -1;
  for (const t of queryTokens) {
    const i = lower.indexOf(t);
    if (i !== -1 && (pos === -1 || i < pos)) pos = i;
  }
  if (pos === -1) return text.slice(0, max).trim();
  const start = Math.max(0, pos - 60);
  const out = text.slice(start, start + max).trim().replace(/\s+/g, ' ');
  return (start > 0 ? '…' : '') + out + (start + max < text.length ? '…' : '');
}

// Returns ranked results with citation metadata.
export function search(index, query, { topK = 5, source = null } = {}) {
  const qTokens = tokenize(query);
  const scored = [];
  for (const c of index.chunks) {
    if (source && c.doc.source !== source) continue;
    let score = 0;
    for (const tok of qTokens) {
      const f = c.tf.get(tok);
      if (!f) continue;
      const idf = index.idf.get(tok) || 0;
      const denom = f + K1 * (1 - B + (B * c.len) / index.avgdl);
      score += idf * ((f * (K1 + 1)) / denom);
    }
    if (score > 0) scored.push({ c, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map(({ c, score }) => ({
    score: Number(score.toFixed(4)),
    documentId: c.doc.id,
    title: c.doc.title,
    source: c.doc.source,
    heading: c.heading,
    lastUpdated: c.doc.lastUpdated,
    owner: c.doc.owner,
    citation: { source: c.doc.source, title: c.doc.title, path: c.doc.path, url: c.doc.url },
    snippet: snippet(c.text, qTokens),
  }));
}
