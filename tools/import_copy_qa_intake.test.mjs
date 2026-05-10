import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SAMPLE_CSV = join(ROOT, 'tools/fixtures/copy_qa_intake_sample.csv');
const INTAKE_JSON = join(ROOT, 'knowledge/wiki/analysis/ai_copy_qa_intake_queue.json');
const INTAKE_MD = join(ROOT, 'knowledge/wiki/analysis/ai_copy_qa_intake_queue.md');
const INTAKE_AUDIT = join(ROOT, 'knowledge/wiki/analysis/ai_copy_qa_intake_audit.md');

async function readOptional(path, fallback) {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return fallback;
  }
}

test('Copy QA Intake Import Logic', async (t) => {
  await t.test('Should import CSV and generate stable IDs with risk detection', async () => {
    const originalJson = await readOptional(INTAKE_JSON, '{"generatedAt":"","items":[]}');
    const originalMd = await readOptional(INTAKE_MD, '');
    const originalAudit = await readOptional(INTAKE_AUDIT, '');

    const csvContent = [
      'Timestamp,Name,Team,Page,Slot,Original,Suggested,Reason,Evidence,Risk',
      '2026-05-10T10:00:00Z,TestUser,CIS,首頁,主標,Old Text,New Text,Better tone,Brand Spec,tone-mismatch',
      '2026-05-10T10:05:00Z,RiskUser,QDM,商品頁,用途,AI Text,治感冒首選,Medical claim,,medical-risk'
    ].join('\n');

    try {
      await mkdir(dirname(SAMPLE_CSV), { recursive: true });
      await writeFile(SAMPLE_CSV, csvContent, 'utf8');

      execSync('node tools/import_copy_qa_intake.mjs tools/fixtures/copy_qa_intake_sample.csv', { cwd: ROOT });

      const data = JSON.parse(await readFile(INTAKE_JSON, 'utf8'));
      assert.ok(data.items.length >= 2);

      const medicalItem = data.items.find((item) => item.submitterName === 'RiskUser');
      assert.ok(medicalItem.riskTags.includes('medical-risk'), 'Should detect medical risk');
      assert.ok(medicalItem.riskTags.includes('needs-source'), 'Should detect missing source');
      assert.ok(medicalItem.intakeId, 'Should have a stable ID');
    } finally {
      await writeFile(INTAKE_JSON, originalJson, 'utf8');
      await writeFile(INTAKE_MD, originalMd, 'utf8');
      await writeFile(INTAKE_AUDIT, originalAudit, 'utf8');
    }
  });
});
