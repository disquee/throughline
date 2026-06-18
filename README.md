# VenueOS Product Knowledge Base (PKB)

A working reference architecture for a Product Knowledge Base: an automated context layer that captures product knowledge from Jira, Confluence, and meeting notes, publishes the curated slice as docs-as-code, and makes the whole thing retrievable by Claude with citations.

This repository is a portfolio demo. The product (VenueOS, a fictional event and venue management platform) and all content are invented, but the architecture mirrors a real product-operations setup.

## The system

```
  Jira export ─┐
  Confluence  ─┼─►  content-store/   ──►  MCP server  ──►  Claude (retrieval + citations)
  Granola      ┘     (raw signal)          (BM25 today,
                                            swappable for
  curated docs ────►  docusaurus/    ◄──────  RAG/embeddings)
                      (published layer)
```

Four layers, mapped to the operating model behind the role this demo is built for:

| Layer | Lives in | Role responsibility it demonstrates |
|-------|----------|-------------------------------------|
| Signal capture | `content-store/` | Instrument capture from Jira, Confluence, meeting notes |
| Published KB | `docusaurus/` | Docs-as-code: versioning, review, a curated read surface |
| Retrieval | `mcp-server/` | Maintain the Claude / MCP integration surface |
| Routing + observability | `scripts/` (next) | Decide auto vs. curated vs. authored; detect gaps and staleness |

The content store is built so the three raw sources and the published docs all describe one feature (Smart Hold, an overbooking-protection feature in release 2026.2). A question like "how does Smart Hold handle turnover time" pulls the originating bug from Jira, the spec from Confluence, the customer pain from a discovery transcript, and the published release note, each with its own citation.

## Repository layout

```
pkb/
  content-store/
    jira/issues-export.csv              12 issues across two epics
    confluence/*.md                     4 pages (one deliberately stale)
    granola/*.md                        2 meeting transcripts
  docusaurus/                           the published KB site (Docusaurus 3)
    docs/                               curated pages: intro, feature, release, API
  mcp-server/                           MCP server exposing the store to Claude
    src/ingest.js                       normalize every source into documents + chunks
    src/search.js                       BM25 retriever (swappable for embeddings)
    src/index.js                        MCP tools: search_pkb, get_document, list_sources
  scripts/                              routing + observability (next milestone)
```

## Run the published site

```bash
cd docusaurus
npm install
npm start            # dev server at http://localhost:3000
npm run build        # production build into docusaurus/build
```

## Run the MCP server

```bash
cd mcp-server
npm install
npm run selftest -- "how does smart hold handle turnover time"   # quick check, no client
npm start            # runs as an MCP stdio server
```

The self-test prints ranked results with citations so you can verify retrieval without wiring up a client. See `mcp-server/CONNECT.md` to attach the server to Claude Desktop or Claude Code.

## Tools the server exposes

- `search_pkb(query, top_k?, source?)` — ranked snippets across all sources, with citations.
- `get_document(document_id)` — full text and metadata for one document.
- `list_sources()` — inventory of the store (counts per source, document list).

## Design notes

The retriever is BM25 on purpose: it runs offline with no keys, which keeps the demo reproducible. The retrieval layer is isolated in `search.js` behind `buildIndex` and `search`, so swapping in embeddings or an external RAG backend does not touch the server's tool surface. That swap is the natural next step and the thing to talk through in an interview.

The content store includes one stale page on purpose (`confluence/booking-rules-config.md`, last updated months before the feature shipped and still describing the old model). It is the seed for the staleness-detection pass in the next milestone.

## Next milestones

1. Routing classifier in `scripts/` that tags each incoming source as auto-generate, hybrid, draft-then-review, or human-authored, against a 60/20/20 target.
2. Observability report: a query log, gap detection (queries that return nothing), and staleness flags (published date against source change date).
