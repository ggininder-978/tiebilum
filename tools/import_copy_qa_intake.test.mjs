import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SAMPLE_CSV = join(ROOT, 'tools/fixtures/copy_qa_intake_sample.csv');
const INTAKE_JSON = join(ROOT, 'knowledge/wiki/analysis/ai_copy_qa_intake_queue.json');

test('Copy QA Intake Import Logic', async (t) => {
  await t.test('Should import CSV and generate stable IDs with risk detection', async () => {
    // Create fixtures dir if needed
    await mkdir(dirname(SAMPLE_CSV), { recursive: true });
    
    // Create sample CSV
    const csvContent = [
      'Timestamp,Name,Team,Page,Slot,Original,Suggested,Reason,Evidence,Risk',
      '2026-05-10T10:00:00Z,TestUser,CIS,首頁,主標,Old Text,New Text,Better tone,Brand Spec,tone-mismatch',
      '2026-05-10T10:05:00Z,RiskUser,QDM,商品頁,用途,AI Text,治感冒首選,Medical claim,,medical-risk'
    ].join('\n');
    await writeFile(SAMPLE_CSV, csvContent, 'utf8');

    // Run import
    execSync(`node tools/import_copy_qa_intake.mjs tools/fixtures/copy_qa_intake_sample.csv`, { cwd: ROOT });

    const raw = await readFile(INTAKE_JSON, 'utf8');
    const data = JSON.parse(raw);
    
    assert.ok(data.items.length >= 2);
    
    const medicalItem = data.items.find(i => i.submitterName === 'RiskUser');
    assert.ok(medicalItem.riskTags.includes('medical-risk'), 'Should detect medical risk');
    assert.ok(medicalItem.riskTags.includes('needs-source'), 'Should detect missing source');
    assert.ok(medicalItem.intakeId, 'Should have a stable ID');
  });
});
