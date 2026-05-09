# Tiebilum Knowledge Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static QDM/CIS/marketing collaboration dashboard backed by generated wiki data.

**Architecture:** A Node script reads curated wiki/spec files and writes `knowledge/dashboard-data.json`. `index.html` fetches that JSON and renders a searchable, filterable brand reference room with progress lanes, gaps, and copyable maintenance prompts.

**Tech Stack:** Node.js built-ins, `node:test`, static HTML/CSS/vanilla JavaScript, GitHub Pages with `.nojekyll`.

---

### Task 1: Data Generator Contract

**Files:**
- Create: `tools/build_knowledge_dashboard_data.mjs`
- Create: `tools/build_knowledge_dashboard_data.test.mjs`
- Generate: `knowledge/dashboard-data.json`

- [ ] Write failing `node:test` coverage for the required JSON contract, QDM wording, progress lanes, library entries, gaps, prompts, and audit warnings.
- [ ] Run `node --test tools/build_knowledge_dashboard_data.test.mjs` and confirm it fails because the module does not exist.
- [ ] Implement `buildDashboardData`, `writeDashboardData`, and CLI execution in `tools/build_knowledge_dashboard_data.mjs`.
- [ ] Run the test again and confirm it passes.
- [ ] Run `node tools/build_knowledge_dashboard_data.mjs` and confirm `knowledge/dashboard-data.json` is created.

### Task 2: Dashboard UI

**Files:**
- Modify: `index.html`
- Create: `tools/dashboard_ui_smoke.test.mjs`

- [ ] Write failing smoke tests that assert `index.html` fetches `knowledge/dashboard-data.json`, includes search/category/status controls, includes progress/gap/prompt targets, and contains no old "AI 維護" or "網站架構" wording.
- [ ] Run `node --test tools/dashboard_ui_smoke.test.mjs` and confirm it fails against the current roadmap page.
- [ ] Replace `index.html` with the static dashboard UI using accessible controls, responsive layout, restrained brand styling, and copyable prompt buttons.
- [ ] Run the smoke test again and confirm it passes.

### Task 3: Verification and Audit

**Files:**
- Modify: `knowledge/wiki/analysis/tiebilum_knowledge_dashboard_audit.md`

- [ ] Run generator tests.
- [ ] Run UI smoke tests.
- [ ] Start a local static server with `python -m http.server 8765`.
- [ ] Confirm `index.html` and `knowledge/dashboard-data.json` load over HTTP.
- [ ] Use a lightweight browser or DOM check to verify search/filter behavior.
- [ ] Append audit notes with files read, files generated, warnings, and verification commands.
