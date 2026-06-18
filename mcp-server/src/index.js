#!/usr/bin/env node
// index.js — VenueOS Product Knowledge Base MCP server.
//
// Exposes the whole content store (Jira, Confluence, Granola transcripts) plus
// the published Docusaurus docs to an MCP client (Claude Desktop, Claude Code)
// as three tools:
//   search_pkb    — retrieve relevant chunks across all sources, with citations
//   get_document  — fetch a full document by id
//   list_sources  — inventory the store (counts + document list)
//
// Run as an MCP stdio server (default), or for a quick check:
//   node src/index.js --selftest "how does smart hold handle turnover time"

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { ingestAll, PKB_ROOT } from './ingest.js';
import { buildIndex, search } from './search.js';

// Build the index once at startup. Re-run the process to pick up content changes.
const docs = ingestAll();
const index = buildIndex(docs);
const byId = new Map(docs.map((d) => [d.id, d]));

function sourceInventory() {
  const counts = {};
  for (const d of docs) counts[d.source] = (counts[d.source] || 0) + 1;
  return counts;
}

// ---- selftest mode (no MCP transport) -------------------------------------
if (process.argv.includes('--selftest')) {
  const q = process.argv[process.argv.indexOf('--selftest') + 1] || 'smart hold';
  console.error(`PKB_ROOT = ${PKB_ROOT}`);
  console.error(`Indexed ${docs.length} documents, ${index.chunks.length} chunks`);
  console.error(`Sources: ${JSON.stringify(sourceInventory())}\n`);
  console.error(`Query: "${q}"\n`);
  for (const r of search(index, q, { topK: 5 })) {
    console.error(`[${r.score}] (${r.source}) ${r.title}  ·  §${r.heading}`);
    console.error(`        ${r.snippet}`);
    console.error(`        cite: ${r.citation.path}${r.citation.url ? ' · ' + r.citation.url : ''}\n`);
  }
  process.exit(0);
}

// ---- MCP server -----------------------------------------------------------
const server = new McpServer({ name: 'venueos-pkb', version: '0.1.0' });

server.registerTool(
  'search_pkb',
  {
    title: 'Search the Product Knowledge Base',
    description:
      'Retrieve the most relevant context from the VenueOS PKB across Jira issues, ' +
      'Confluence pages, meeting transcripts, and published docs. Returns ranked ' +
      'snippets with citations. Optionally filter by source.',
    inputSchema: {
      query: z.string().describe('Natural-language question or keywords.'),
      top_k: z.number().int().min(1).max(20).optional().describe('How many results (default 5).'),
      source: z
        .enum(['jira', 'confluence', 'granola', 'published'])
        .optional()
        .describe('Restrict results to one source system.'),
    },
  },
  async ({ query, top_k, source }) => {
    const results = search(index, query, { topK: top_k ?? 5, source: source ?? null });
    if (results.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No matches for "${query}". This is a retrieval gap worth logging.`,
          },
        ],
      };
    }
    const text = results
      .map(
        (r, i) =>
          `${i + 1}. [${r.source}] ${r.title} — §${r.heading} (score ${r.score})\n` +
          `   ${r.snippet}\n` +
          `   cite: ${r.citation.path}${r.citation.url ? ' · ' + r.citation.url : ''}` +
          `${r.lastUpdated ? ' · updated ' + r.lastUpdated : ''}\n` +
          `   document_id: ${r.documentId}`
      )
      .join('\n\n');
    return { content: [{ type: 'text', text }] };
  }
);

server.registerTool(
  'get_document',
  {
    title: 'Get a full PKB document',
    description:
      'Fetch the complete text and metadata of one document by its id ' +
      '(for example "jira:VOS-1840" or "published:features/smart-hold").',
    inputSchema: {
      document_id: z.string().describe('The document id returned by search_pkb.'),
    },
  },
  async ({ document_id }) => {
    const doc = byId.get(document_id);
    if (!doc) {
      const ids = [...byId.keys()].slice(0, 10).join(', ');
      return {
        content: [
          { type: 'text', text: `No document "${document_id}". Example ids: ${ids} …` },
        ],
      };
    }
    const header =
      `# ${doc.title}\n` +
      `source: ${doc.source} · path: ${doc.path}` +
      `${doc.url ? ' · url: ' + doc.url : ''}` +
      `${doc.owner ? ' · owner: ' + doc.owner : ''}` +
      `${doc.lastUpdated ? ' · updated: ' + doc.lastUpdated : ''}\n\n`;
    return { content: [{ type: 'text', text: header + doc.text }] };
  }
);

server.registerTool(
  'list_sources',
  {
    title: 'List PKB sources and documents',
    description: 'Inventory the knowledge base: document counts per source and the document list.',
    inputSchema: {},
  },
  async () => {
    const counts = sourceInventory();
    const list = docs
      .map((d) => `- ${d.id} (${d.source})${d.lastUpdated ? ' · updated ' + d.lastUpdated : ''}`)
      .join('\n');
    return {
      content: [
        {
          type: 'text',
          text: `Documents: ${docs.length}\nBy source: ${JSON.stringify(counts)}\n\n${list}`,
        },
      ],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('venueos-pkb MCP server running on stdio');
