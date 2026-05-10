---
name: markdown-to-html-synthesis
description: A workflow for synthesizing structured Markdown data (Wiki) into high-density, interactive HTML artifacts. Bridge the gap between "storage" and "action".
---

# Markdown-to-HTML Synthesis Skill

This skill defines the technical and philosophical bridge between static documentation and interactive project databases.

## 1. The Core Transformation Principle
- **Markdown is the Source of Truth**: All raw data, history, and records must stay in Markdown for versioning and durability.
- **HTML is the Interface of Action**: HTML should be used to provide spatial clarity, interactive filtering, and "at-a-glance" decision making.
- **The JSON Bridge**: Use an intermediate JSON layer (e.g., `dashboard-data.json`) to decouple content from presentation.

## 2. Synthesis Workflow
### Step A: Extraction (知識提取)
- Parse Markdown headers and frontmatter.
- Distill long-form text into key-value pairs or "Summary Cards".
- Identify "Action Hooks" (e.g., URLs, Task IDs).

### Step B: Spatial Mapping (空間佈局)
- **Cards & Grids**: Group related Markdown sections into visual cards.
- **Tabs & Accordions**: Hide low-priority details to reduce cognitive load.
- **Timelines**: Convert sequential Markdown lists into visual project paths.

### Step C: The "Build" Step (同步機制)
- Use lightweight scripts (e.g., `.mjs` or `python`) to automatically regenerate the HTML whenever the Wiki changes.
- Ensure all links in HTML point back to the source Markdown files.

## 3. Design Constraints (Tiebilum Edition)
- **Voice Alignment**: The HTML UI must feel "Artisan" and "Honest". Use serif fonts for long copy and clean sans-serif for data.
- **No Fluff**: Avoid generic marketing adjectives (e.g., "Quality", "Strategic"). Let the data speak.
- **Self-Contained**: Artifacts should ideally be single HTML files or simple static sites for easy sharing.

## 4. Usage Triggers
- When the Wiki becomes too large to skim (e.g., > 10 pages).
- When sharing progress with external stakeholders (CIS team).
- When performing complex data analysis (Sales diagnosis).
