import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildDashboardData } from './build_knowledge_dashboard_data.mjs';

describe('buildDashboardData', () => {
  it('builds the required dashboard data contract with QDM and brand maintenance wording', async () => {
    const data = await buildDashboardData({ generatedAt: '2026-05-10T00:00:00.000Z' });

    assert.equal(data.generatedAt, '2026-05-10T00:00:00.000Z');
    assert.equal(data.brand.name, '鐵比倫 Tiebilum');
    assert.match(data.brand.stage, /QDM/);
    assert.match(data.brand.oneLine, /品牌資料室/);
    assert.ok(Array.isArray(data.brand.voice));
    assert.ok(data.brand.voice.length >= 3);

    assert.deepEqual(
      data.progress.map((item) => item.area),
      ['官網素材與文案', 'CIS 視覺', '行銷資料', '品牌資料維護'],
    );

    assert.ok(data.library.length >= 8);
    assert.ok(data.library.some((item) => item.category === '品牌脈絡'));
    assert.ok(data.library.some((item) => item.category === '官網素材與文案'));
    assert.ok(data.library.some((item) => item.category === '品牌資料維護'));
    assert.ok(data.library.every((item) => item.id && item.title && item.summary && item.path && item.whyItMatters && item.nextAction && item.updatedHint !== undefined));

    assert.ok(data.gaps.some((gap) => /素材|文案/.test(gap.title + gap.nextAction)));
    assert.ok(data.agentPrompts.some((prompt) => /QDM/.test(prompt.prompt)));
    assert.ok(data.agentPrompts.every((prompt) => prompt.title && prompt.intent && prompt.prompt));
    assert.ok(Array.isArray(data.audit.latestLogEntries));

    const serialized = JSON.stringify(data);
    assert.doesNotMatch(serialized, /AI 維護/);
    assert.doesNotMatch(serialized, /網站架構/);
  });
});
