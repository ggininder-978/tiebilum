import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const INTAKE_JSON_PATH = join(ROOT, 'knowledge/wiki/analysis/ai_copy_qa_intake_queue.json');
const QA_JSON_PATH = join(ROOT, 'knowledge/wiki/analysis/ai_copy_qa_queue.json');
const AUDIT_PATH = join(ROOT, 'knowledge/wiki/analysis/ai_copy_qa_intake_audit.md');

async function mergeIntake() {
  try {
    const intakeRaw = await readFile(INTAKE_JSON_PATH, 'utf8');
    const intakeData = JSON.parse(intakeRaw);
    
    const qaRaw = await readFile(QA_JSON_PATH, 'utf8');
    const qaData = JSON.parse(qaRaw);
    
    const acceptedItems = intakeData.items.filter(i => i.intakeStatus === 'accepted');
    if (acceptedItems.length === 0) {
      console.log('No accepted items to merge.');
      return;
    }

    const now = new Date().toISOString();
    let mergedCount = 0;

    for (const intake of acceptedItems) {
      // Try to find target in main queue
      let qaIdx = qaData.items.findIndex(q => q.id === intake.targetCopyId);
      
      // Fallback matching
      if (qaIdx === -1) {
        qaIdx = qaData.items.findIndex(q => 
          q.page === intake.page && 
          q.slot === intake.slot && 
          q.aiDraft === intake.originalText
        );
      }

      if (qaIdx !== -1) {
        qaData.items[qaIdx].humanRevision = intake.suggestedRevision;
        qaData.items[qaIdx].reviewStatus = 'revised';
        qaData.items[qaIdx].reviewNote = `Merged from Intake ${intake.intakeId}: ${intake.reason}. ${intake.ownerNote}`;
        qaData.items[qaIdx].updatedAt = now;
        
        intake.intakeStatus = 'merged';
        intake.updatedAt = now;
        mergedCount++;
      } else {
        console.warn(`Warning: Could not find target for Intake ${intake.intakeId} (${intake.page}/${intake.slot}).`);
      }
    }

    // Save Updated Main Queue
    await writeFile(QA_JSON_PATH, JSON.stringify(qaData, null, 2), 'utf8');
    
    // Save Updated Intake Queue
    await writeFile(INTAKE_JSON_PATH, JSON.stringify(intakeData, null, 2), 'utf8');
    
    // Audit
    await appendFile(AUDIT_PATH, `\n## ${now} Merge Action\n- Merged Items: ${mergedCount}\n`, 'utf8');

    console.log(`Successfully merged ${mergedCount} items into main Copy QA queue.`);
  } catch (err) {
    console.error('Merge failed:', err);
    process.exit(1);
  }
}

mergeIntake();
