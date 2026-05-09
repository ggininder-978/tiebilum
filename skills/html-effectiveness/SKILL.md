---
name: html-effectiveness
description: Enhances agent-human communication by using rich HTML artifacts instead of flat markdown. Follows the principle of "trading a document you'd skim for one you'd actually read."
---

# HTML Effectiveness Skill

This skill guides the Agent to produce high-density, interactive, and spatial information using HTML when Markdown is insufficient for complex communication.

## 1. Core Philosophy
- **Spatial > Flat**: If the info has a shape (diffs, module maps, timelines), use HTML to visualize that shape.
- **Interactive > Static**: Use tabs, accordions, and hover states to make large amounts of information navigable.
- **Actionable > Passive**: Create custom "throwaway" editors with export buttons to keep the human-in-the-loop for complex decisions.

## 2. Implementation Patterns

### A. Exploration & Planning
- **Side-by-Side Comparison**: For multiple code approaches or design directions.
- **Interactive Timelines**: For implementation plans and milestones.

### B. Code & Logic Understanding
- **Annotated PRs**: Use margin notes and severity tags for code reviews.
- **Module Maps**: Visualize package dependencies as interactive boxes and arrows.

### C. Research & Learning
- **Collapsible Explainers**: Break down complex features with TL;DR boxes and FAQ sections.
- **Concept Sandboxes**: Use interactive SVG or JS logic to teach complex concepts (e.g., hashing rings).

### D. Custom Editors
- **Triage Boards**: For drag-and-drop sorting of tasks or tickets.
- **Parameter Tuners**: For adjusting prompt templates or configuration files live.

## 3. Aesthetic Standards
- Use premium typography (e.g., Inter, Outfit, Noto Serif TC).
- Use harmonious color palettes (HSL).
- Ensure all artifacts are responsive and self-contained.

## 4. Usage Triggers
- When explaining complex file relationships.
- When presenting more than 3 options for a single decision.
- When creating status reports or incident post-mortems.
- When the user asks for a "preview" or "visual representation".
