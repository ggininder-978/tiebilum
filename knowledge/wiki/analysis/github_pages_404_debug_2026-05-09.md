# GitHub Pages 404 Debug - 2026-05-09

## Summary

The public URL `https://ingeiininder.github.io/tiebilum/` still returned 404 after the phantom submodule cleanup because the latest GitHub Pages build reached the Jekyll phase and failed before deployment.

## Evidence

- `origin/main` contains `index.html` and `brand_showcase.html`.
- `https://ingeiininder.github.io/tiebilum/` and `/index.html` returned HTTP 404 during verification.
- GitHub repository metadata reports `has_pages: true`.
- The latest Pages workflow run for commit `0bf0c0b` concluded `failure`; the `deploy` job was skipped.
- The build log shows GitHub Pages running Jekyll and rendering Markdown under `knowledge/sources/superpowers/...`.
- Tracked source files include Liquid-like Markdown text such as `{{name: string, description: string}}`, which Jekyll can interpret as Liquid syntax instead of plain documentation.

## Root Cause

The previous phantom submodule issue was fixed, but GitHub Pages continued to use Jekyll for a repository that should be served as static HTML. Jekyll attempted to process knowledge-base source Markdown as site content, causing the build to fail before any deployment artifact was published.

## Fix

Add a root `.nojekyll` file so GitHub Pages skips Jekyll processing and serves the repository contents as static files.

## Verification Plan

- Confirm `.nojekyll` is tracked in the next commit.
- Push to `main` to trigger a new Pages build.
- Recheck the Actions result and the public URL after GitHub Pages finishes deploying.
