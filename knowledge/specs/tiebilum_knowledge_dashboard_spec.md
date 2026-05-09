# Tiebilum Knowledge Dashboard Spec

> Last updated: 2026-05-10

## Purpose

Build a public-facing collaboration dashboard for Tiebilum's brand, website, CIS, and marketing partners.

The dashboard is not the brand website. It is a shared brand reference room and AI-maintained workbench that lets collaborators understand the current brand state, inspect available material, find source-backed knowledge, and generate follow-up prompts for the agent.

## Primary Audiences

1. Website partner: needs brand context, site architecture inputs, copy direction, product information, and missing-asset status.
2. CIS / visual partner: needs brand story, tone, positioning, visual cues, product context, and current design-progress status.
3. Marketing team: needs product facts, selling points, campaign context, sales-analysis summaries, and current knowledge gaps.
4. AI agent / maintainer: needs a visible state of wiki freshness, audit status, and next actions.

## Success Criteria

- A collaborator can understand Tiebilum's current brand state within 30 seconds.
- A collaborator can find brand, product, positioning, and analysis material without browsing repository folders.
- The page clearly separates confirmed knowledge from missing or needs-review items.
- The dashboard gives copyable "ask agent" prompts for common follow-up tasks.
- The dashboard is deployable through GitHub Pages as static files with `.nojekyll`.
- The dashboard does not require secrets, authentication, or a backend.

## Non-Goals

- Do not replace the future official Tiebilum website.
- Do not expose private source files or credentials.
- Do not allow GitHub Pages JavaScript to write directly back to the repository.
- Do not present rough analysis as final public marketing claims.
- Do not use exaggerated strategy language such as "command center" or generic hype terms.

## Data Sources

The dashboard data must be generated from maintained local knowledge files:

- `knowledge/index.md`
- `knowledge/log.md`
- `knowledge/wiki/entities/*.md`
- `knowledge/wiki/concepts/*.md`
- `knowledge/wiki/analysis/*.md`
- selected `knowledge/wiki/analysis/*.csv` summaries when the file is small enough and useful for dashboard cards

Raw files under `knowledge/sources/` remain source material and are not directly exposed in the dashboard unless a future spec approves a safe excerpt list.

## Required Files

- `knowledge/specs/tiebilum_knowledge_dashboard_spec.md`: this spec.
- `tools/build_knowledge_dashboard_data.mjs`: data export script.
- `knowledge/dashboard-data.json`: generated dashboard data consumed by the HTML page.
- `index.html`: static dashboard UI for GitHub Pages.
- `knowledge/wiki/analysis/tiebilum_knowledge_dashboard_audit.md`: audit trail for build and verification notes.

## Data Contract

`knowledge/dashboard-data.json` must contain:

```json
{
  "generatedAt": "ISO-8601 timestamp",
  "brand": {
    "name": "鐵比倫 Tiebilum",
    "stage": "string",
    "oneLine": "string",
    "positioning": "string",
    "voice": ["string"]
  },
  "progress": [
    {
      "area": "官網建置 | CIS 視覺 | 行銷資料 | AI 維護",
      "status": "ready | in-progress | needs-review | missing",
      "summary": "string",
      "items": ["string"]
    }
  ],
  "library": [
    {
      "id": "stable-id",
      "title": "string",
      "category": "品牌脈絡 | 視覺/CIS | 官網素材 | 行銷資料 | 財務分析 | AI 維護",
      "status": "confirmed | draft | needs-review | missing",
      "summary": "string",
      "path": "repository-relative path",
      "tags": ["string"],
      "updatedHint": "string"
    }
  ],
  "gaps": [
    {
      "title": "string",
      "area": "string",
      "whyItMatters": "string",
      "nextAction": "string"
    }
  ],
  "agentPrompts": [
    {
      "title": "string",
      "intent": "string",
      "prompt": "string"
    }
  ],
  "audit": {
    "latestLogEntries": ["string"],
    "warnings": ["string"]
  }
}
```

## UI Requirements

### 1. Brand State Header

Show:

- Brand name.
- One-line current state.
- Audience note: for website, CIS, and marketing collaborators.
- Last generated time.
- Three concise status chips: brand, website/CIS, knowledge base.

### 2. Progress Map

Show four progress lanes:

- 官網建置
- CIS 視覺
- 行銷資料
- AI 維護

Each lane shows current status, short summary, and next items. It should be scannable and operational, not decorative.

### 3. Knowledge Library

Provide:

- Search input.
- Category filter.
- Status filter.
- Cards for wiki-backed knowledge items.
- Each card shows title, category, status, summary, tags, and source path.

The UI can link to repository-relative paths, but static GitHub Pages cannot open local filesystem paths.

### 4. Data Gaps

Show missing or needs-review items clearly. Examples:

- Missing product cost.
- Missing visual assets.
- Brand voice needing review.
- Website copy needing approval.

### 5. Ask Agent Panel

Provide copyable prompts for common tasks:

- Generate homepage copy directions from current brand voice.
- List assets still needed for website build.
- Summarize product pages for marketing use.
- Turn current data gaps into an action list.
- Prepare questions for CIS partner review.

Buttons copy prompt text to clipboard and show a visible copied state.

## Brand Voice and Visual Direction

- Tone: grounded, practical, transparent, craft-oriented.
- Avoid inflated words like "戰略指揮中心", "高品質" without evidence, or generic tech-marketing phrasing.
- Visual style: quiet editorial workspace, not a landing-page hero.
- Use restrained color, compact information hierarchy, and clear section labels.
- Do not make nested cards.
- Use stable responsive dimensions so filters, cards, and status chips do not jump.

## Accessibility and Responsiveness

- Must work on desktop and mobile.
- Text must not overlap at 375px mobile width.
- Controls must have visible labels.
- Keyboard users must be able to tab through search, filters, and prompt buttons.
- Color cannot be the only status signal.

## Build Rules

- The data generator must be deterministic for the same file contents except `generatedAt`.
- The generator should tolerate missing wiki files and emit audit warnings instead of crashing when possible.
- Generated dashboard data must not include full private source documents.
- The page must work on GitHub Pages with no build service beyond committing the generated JSON and HTML.

## Verification

Required checks before claiming completion:

1. Run the data generator and confirm `knowledge/dashboard-data.json` is created.
2. Run a local static server or equivalent file-serving check.
3. Verify the page loads `dashboard-data.json`.
4. Verify search and filters change visible library cards.
5. Verify prompt copy buttons work or visibly fall back to selecting text.
6. Check desktop and mobile layout screenshots or browser-rendered dimensions.
7. Confirm `curl` or local request can load `index.html` and `knowledge/dashboard-data.json`.

## Audit Requirements

Every dashboard build/update must append an entry to `knowledge/wiki/analysis/tiebilum_knowledge_dashboard_audit.md` including:

- Timestamp.
- Files read.
- Files generated.
- Warnings or missing data.
- Verification commands and results.

