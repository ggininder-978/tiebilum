import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

describe('index dashboard UI', () => {
  it('loads generated dashboard data and exposes required collaboration controls', async () => {
    const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

    assert.match(html, /knowledge\/dashboard-data\.json/);
    assert.match(html, /id="searchInput"/);
    assert.match(html, /id="categoryFilter"/);
    assert.match(html, /id="statusFilter"/);
    assert.match(html, /id="progressGrid"/);
    assert.match(html, /id="libraryGrid"/);
    assert.match(html, /id="gapsList"/);
    assert.match(html, /id="promptsList"/);
    assert.match(html, /QDM 開店平台/);
    assert.match(html, /品牌資料維護/);
    assert.match(html, /copyPrompt/);
    assert.match(html, /whyItMatters/);
    assert.match(html, /nextAction/);
    assert.match(html, /updatedHint/);
    assert.doesNotMatch(html, /AI 維護/);
    assert.doesNotMatch(html, /網站架構/);
  });
});
