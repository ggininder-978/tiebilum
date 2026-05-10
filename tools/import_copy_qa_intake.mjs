import { readFile, writeFile, mkdir, appendFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const INTAKE_JSON_PATH = join(ROOT, 'knowledge/wiki/analysis/ai_copy_qa_intake_queue.json');
const INTAKE_MD_PATH = join(ROOT, 'knowledge/wiki/analysis/ai_copy_qa_intake_queue.md');
const AUDIT_PATH = join(ROOT, 'knowledge/wiki/analysis/ai_copy_qa_intake_audit.md');

function generateStableId(item) {
  const seed = `${item.submittedAt}-${item.submitterName}-${item.originalText}-${item.suggestedRevision}`;
  return createHash('md5').update(seed).digest('hex').slice(0, 8);
}

async function importIntake(sourcePath) {
  try {
    const rawData = await readFile(sourcePath, 'utf8');
    let importedItems = [];

    if (sourcePath.endsWith('.json')) {
      importedItems = JSON.parse(rawData);
    } else if (sourcePath.endsWith('.csv')) {
      // Basic CSV Parser (assuming Google Form structure)
      const lines = rawData.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',');
      importedItems = lines.slice(1).map(line => {
        const cols = line.split(',');
        return {
          submittedAt: cols[0],
          submitterName: cols[1],
          submitterTeam: cols[2],
          page: cols[3],
          slot: cols[4],
          originalText: cols[5],
          suggestedRevision: cols[6],
          reason: cols[7],
          sourceEvidence: cols[8],
          riskTags: (cols[9] || '').split(';').filter(Boolean)
        };
      });
    }

    let existingQueue = { items: [] };
    try {
      const existingRaw = await readFile(INTAKE_JSON_PATH, 'utf8');
      existingQueue = JSON.parse(existingRaw);
    } catch (e) {}

    const now = new Date().toISOString();
    const mergedItems = [...existingQueue.items];

    for (const item of importedItems) {
      const intakeId = generateStableId(item);
      const existsIdx = mergedItems.findIndex(i => i.intakeId === intakeId);

      // Auto risk detection
      const riskTags = [...(item.riskTags || [])];
      const checkText = `${item.suggestedRevision} ${item.reason}`;
      if (checkText.match(/生理期|感冒|治療|療效|改善|舒緩/)) riskTags.push('medical-risk');
      if (checkText.match(/唯一|最高|完美|最|頂級/)) riskTags.push('marketing-fluff');
      if (!item.sourceEvidence) riskTags.push('needs-source');

      const newItem = {
        intakeId,
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
        riskTags: [...new Set(riskTags)],
        intakeStatus: existsIdx >= 0 ? mergedItems[existsIdx].intakeStatus : 'new',
        ownerNote: existsIdx >= 0 ? mergedItems[existsIdx].ownerNote : '',
        source: 'imported',
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
    
    // Render Markdown Table
    const mdHeader = [
      '# AI Copy QA Intake Queue',
      '',
      '| Intake ID | Submitter | Page/Slot | Status | Suggested Revision | Risk Tags |',
      '| :--- | :--- | :--- | :--- | :--- | :--- |'
    ].join('\n');
    const mdRows = mergedItems.map(i => 
      `| ${i.intakeId} | ${i.submitterName} | ${i.page}/${i.slot} | **${i.intakeStatus}** | ${i.suggestedRevision} | ${i.riskTags.join(', ')} |`
    ).join('\n');
    await writeFile(INTAKE_MD_PATH, `${mdHeader}\n${mdRows}\n`, 'utf8');

    // Audit
    await appendFile(AUDIT_PATH, `\n## ${now} Import Action\n- Source: ${sourcePath}\n- New/Updated Items: ${importedItems.length}\n`, 'utf8');

    console.log(`Imported ${importedItems.length} items to ${INTAKE_JSON_PATH}`);
  } catch (err) {
    console.error('Import failed:', err);
    process.exit(1);
  }
}

const args = process.argv.slice(2);
if (args[0]) importIntake(args[0]);
else console.log('Usage: node tools/import_copy_qa_intake.mjs <path-to-export>');
