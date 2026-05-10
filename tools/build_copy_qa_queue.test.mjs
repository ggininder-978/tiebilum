import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const JSON_PATH = join(ROOT, 'knowledge/wiki/analysis/ai_copy_qa_queue.json');

test('Copy QA Queue Generator Logic', async (t) => {
  await t.test('Should generate valid JSON with items', async () => {
    // Run the builder
    execSync('node tools/build_copy_qa_queue.mjs', { cwd: ROOT });
    
    const raw = await readFile(JSON_PATH, 'utf8');
    const data = JSON.parse(raw);
    
    assert.ok(data.generatedAt, 'Missing generatedAt');
    assert.ok(Array.isArray(data.items), 'items should be an array');
    assert.ok(data.items.length > 0, 'Should have at least some items');
    
    const first = data.items[0];
    assert.ok(first.id, 'Item missing id');
    assert.ok(first.page, 'Item missing page');
    assert.ok(first.aiDraft, 'Item missing aiDraft');
    assert.ok(Array.isArray(first.riskTags), 'riskTags should be an array');
  });

  await t.test('Risk Detection - medical-risk', async () => {
    // We expect "生理期" or "治療" to trigger medical-risk in the builder logic
    const raw = await readFile(JSON_PATH, 'utf8');
    const data = JSON.parse(raw);
    
    const gingerItem = data.items.find(i => i.aiDraft.includes('生理期') || i.id.includes('ginger'));
    if (gingerItem) {
      assert.ok(gingerItem.riskTags.includes('medical-risk'), 'Should detect medical risk for ginger usage');
    }
  });

  await t.test('Persistence - should keep human revisions', async () => {
    const originalRaw = await readFile(JSON_PATH, 'utf8');

    // 1. Manually update an item in JSON
    try {
      const data = JSON.parse(originalRaw);
      const target = data.items[0];
      target.humanRevision = 'TEST_REVISION';
      target.reviewStatus = 'revised';
      await writeFile(JSON_PATH, JSON.stringify(data, null, 2), 'utf8');

      // 2. Run builder again
      execSync('node tools/build_copy_qa_queue.mjs', { cwd: ROOT });

      // 3. Check if revision still exists
      const newRaw = await readFile(JSON_PATH, 'utf8');
      const newData = JSON.parse(newRaw);
      const newTarget = newData.items.find(i => i.id === target.id);

      assert.strictEqual(newTarget.humanRevision, 'TEST_REVISION', 'Human revision should be persisted');
      assert.strictEqual(newTarget.reviewStatus, 'revised', 'Review status should be persisted');
    } finally {
      await writeFile(JSON_PATH, originalRaw, 'utf8');
    }
  });
});
