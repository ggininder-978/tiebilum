# LLM Wiki + HTML Artifacts

## Core Method

LLM Wiki stores durable synthesis in markdown, while HTML Artifacts provide an interactive view and control layer for humans. The artifact should not become the source of truth. It should read from the wiki, help a person explore or decide, then emit a query, work order, or patch proposal that an agent can apply back to the wiki.

The loop is:

1. Raw sources stay immutable in `knowledge/sources/`.
2. The agent compiles source material into maintained wiki pages.
3. A build step exports selected wiki metadata and summaries into JSON.
4. A self-contained HTML artifact renders filters, charts, comparisons, and drill-down views.
5. User actions create structured requests for the agent.
6. Agent updates wiki pages and audit logs, then the artifact refreshes from the next export.

## Implementation Details

For GitHub Pages or other static hosting:

- Generate `artifact-data.json` from wiki markdown.
- Build a single `index.html` or dashboard HTML that fetches the JSON.
- Keep all UI logic client-side: search, tags, filters, sorting, charting, and selected-context bundles.
- For "ask agent" actions, generate a copyable prompt or write a local queue file in a local environment. Static Pages cannot safely write back to the repo without a backend or token.

For Claude Artifacts or a local agent workspace:

- The HTML artifact can call Claude-powered artifact APIs or MCP-enabled tools when available.
- Buttons should send structured payloads: selected page IDs, source citations, user question, desired output type, and write constraints.
- The agent should return either a direct answer, a proposed wiki patch, or a task spec for later execution.

## Tiebilum Fit

Tiebilum already has the three required layers:

- Raw sources: `knowledge/sources/`
- Wiki: `knowledge/wiki/`
- Schema and rules: `AGENTS.md` and `knowledge/specs/`

The next useful step is an "operations cockpit" artifact that reads the wiki and shows:

- Product and channel pages
- Financial analysis summaries
- Source freshness and audit status
- Open data gaps
- Buttons for generating follow-up questions, ingest tasks, or dashboard updates

## Risks

- Do not let generated HTML become the canonical data store.
- Do not expose private source content or write tokens in public GitHub Pages.
- Every agent-triggered update should leave an audit entry.
- Wiki summaries are lossy, so high-stakes claims still need source references.

## Sources

- Karpathy LLM Wiki gist: https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
- Claude Artifacts help: https://support.claude.com/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them
- LLM Wiki structure reference: https://llmwikis.org/llm-wiki-structure/
- llmwiki implementation reference: https://github.com/lucasastorian/llmwiki
