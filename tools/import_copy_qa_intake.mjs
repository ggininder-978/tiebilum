import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const INTAKE_JSON_PATH = join(ROOT, 'knowledge/wiki/analysis/ai_copy_qa_intake_queue.json');
const INTAKE_MD_PATH = join(ROOT, 'knowledge/wiki/analysis/ai_copy_qa_intake_queue.md');
const AUDIT_PATH = join(ROOT, 'knowledge/wiki/analysis/ai_copy_qa_intake_audit.md');

function generateStableId(item) {
  const seed = `${item.submittedAt}-${item.submitterName}-${item.originalText}-${item.suggestedRevision}`;
  return createHash('md5').update(seed).digest('hex').slice(0, 8);
}

function splitCsvLine(line) {
  const cols = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      cols.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  cols.push(current);
  return cols;
}

function detectRiskTags(item) {
  const riskTags = [...(item.riskTags || [])];
  const checkText = `${item.suggestedRevision || ''} ${item.reason || ''}`;
  if (/(療效|治療|改善|感冒|生理期|暖宮)/.test(checkText)) riskTags.push('medical-risk');
  if (/(唯一|最高|頂級|完美|第一)/.test(checkText)) riskTags.push('marketing-fluff');
  if (!item.sourceEvidence) riskTags.push('needs-source');
  return [...new Set(riskTags.filter(Boolean))];
}

function renderIntakeMarkdown(items) {
  const mdHeader = [
    '# AI Copy QA Intake Queue',
    '',
    '| Intake ID | Submitter | Page/Slot | Status | Suggested Revision | Risk Tags |',
    '| :--- | :--- | :--- | :--- | :--- | :--- |'
  ].join('\n');
  const mdRows = items.map((item) =>
    `| ${item.intakeId} | ${item.submitterName} | ${item.page}/${item.slot} | **${item.intakeStatus}** | ${item.suggestedRevision} | ${item.riskTags.join(', ') || '-'} |`
  ).join('\n');
  return `${mdHeader}\n${mdRows}\n`;
}

function normalizeImportedRows(rawData, sourcePath) {
  if (sourcePath.endsWith('.json')) {
    const parsed = JSON.parse(rawData);
    return Array.isArray(parsed) ? parsed : parsed.items || [];
  }

  if (!sourcePath.endsWith('.csv')) {
    throw new Error('Unsupported intake format. Use CSV or JSON.');
  }

  const lines = rawData.split(/\r?\n/).filter((line) => line.trim());
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    const row = Object.fromEntries(headers.map((header, index) => [header, cols[index] || '']));
    return {
      submittedAt: row.Timestamp || row.submittedAt,
      submitterName: row.Name || row.submitterName,
      submitterTeam: row.Team || row.submitterTeam,
      page: row.Page || row.page,
      slot: row.Slot || row.slot,
      originalText: row.Original || row.originalText,
      suggestedRevision: row.Suggested || row.suggestedRevision,
      reason: row.Reason || row.reason,
      sourceEvidence: row.Evidence || row.sourceEvidence,
      riskTags: (row.Risk || row.riskTags || '').split(/[;,]/).map((tag) => tag.trim()).filter(Boolean),
      targetCopyId: row.TargetCopyId || row.targetCopyId,
    };
  });
}

async function readExistingQueue() {
  try {
    return JSON.parse(await readFile(INTAKE_JSON_PATH, 'utf8'));
  } catch {
    return { items: [] };
  }
}

async function importIntake(sourcePath) {
  const rawData = await readFile(sourcePath, 'utf8');
  const importedItems = normalizeImportedRows(rawData, sourcePath);
  const existingQueue = await readExistingQueue();
  const now = new Date().toISOString();
  const mergedItems = [...existingQueue.items];

  for (const item of importedItems) {
    const normalized = {
      ...item,
      submittedAt: item.submittedAt || now,
      submitterName: item.submitterName || 'Unknown',
      submitterTeam: item.submitterTeam || 'Other',
      targetCopyId: item.targetCopyId || 'unknown',
      page: item.page || 'Unknown',
      slot: item.slot || 'Unknown',
      originalText: item.originalText || '',
      suggestedRevision: item.suggestedRevision || '',
      reason: item.reason || '',
      sourceEvidence: item.sourceEvidence || '',
    };
    const intakeId = generateStableId(normalized);
    const existsIdx = mergedItems.findIndex((existing) => existing.intakeId === intakeId);
    const existing = existsIdx >= 0 ? mergedItems[existsIdx] : {};

    const newItem = {
      intakeId,
      ...normalized,
      riskTags: detectRiskTags(normalized),
      intakeStatus: existing.intakeStatus || 'new',
      ownerNote: existing.ownerNote || '',
      source: existing.source || 'imported-csv',
      updatedAt: now
    };

    if (existsIdx >= 0) {
      mergedItems[existsIdx] = newItem;
    } else {
      mergedItems.push(newItem);
    }
  }

  const finalData = { generatedAt: now, items: mergedItems };
  await writeFile(INTAKE_JSON_PATH, JSON.stringify(finalData, null, 2), 'utf8');
  await writeFile(INTAKE_MD_PATH, renderIntakeMarkdown(mergedItems), 'utf8');
  await appendFile(
    AUDIT_PATH,
    `\n## ${now} Import Action\n- Source: ${sourcePath}\n- New/Updated Items: ${importedItems.length}\n`,
    'utf8'
  );

  console.log(`Imported ${importedItems.length} items to ${INTAKE_JSON_PATH}`);
  return finalData;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const sourcePath = process.argv[2];
  if (!sourcePath) {
    console.log('Usage: node tools/import_copy_qa_intake.mjs <path-to-export>');
  } else {
    importIntake(sourcePath).catch((error) => {
      console.error('Import failed:', error);
      process.exitCode = 1;
    });
  }
}

export { detectRiskTags, generateStableId, importIntake, renderIntakeMarkdown, splitCsvLine };
