import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const JSON_PATH = join(ROOT, 'knowledge/wiki/analysis/ai_copy_qa_queue.json');
const DASHBOARD_DATA_PATH = join(ROOT, 'knowledge/dashboard-data.json');

async function buildCopyQaQueue() {
  try {
    const dashboardRaw = await readFile(DASHBOARD_DATA_PATH, 'utf8');
    const dashboard = JSON.parse(dashboardRaw);
    
    let existingQueue = { items: [] };
    try {
      const existingRaw = await readFile(JSON_PATH, 'utf8');
      existingQueue = JSON.parse(existingRaw);
    } catch (e) {
      // Not found, starting fresh
    }

    const items = [];
    const now = new Date().toISOString();

    // 1. Homepage Copy
    const hp = dashboard.qdmReadiness.homepage;
    const hpSlots = [
      { id: 'hp-headline-001', slot: '主標', text: hp.headline, page: '首頁' },
      { id: 'hp-subheadline-001', slot: '副標', text: hp.subheadline, page: '首頁' },
      { id: 'hp-intro-001', slot: '簡介', text: hp.intro, page: '首頁' },
      { id: 'hp-cta-001', slot: 'CTA', text: hp.cta, page: '首頁' }
    ];

    // 2. Product Copy
    dashboard.qdmReadiness.products.forEach((p, idx) => {
      const pId = `prod-${idx + 1}`;
      hpSlots.push(
        { id: `${pId}-name`, slot: '品名', text: p.name, page: '商品頁' },
        { id: `${pId}-flavor`, slot: '風味', text: p.flavor, page: '商品頁' },
        { id: `${pId}-usage`, slot: '用途', text: p.usage, page: '商品頁' }
      );
    });

    hpSlots.forEach(slot => {
      const existing = existingQueue.items.find(i => i.id === slot.id);
      
      const riskTags = [];
      const text = slot.text || '';
      if (text.match(/生理期|感冒|治療|療效|改善|舒緩/)) riskTags.push('medical-risk');
      if (text.match(/唯一|完美|最|頂級/)) riskTags.push('marketing-fluff');
      if (text.match(/化學|添加/)) riskTags.push('tone-mismatch');

      items.push({
        id: slot.id,
        page: slot.page,
        slot: slot.slot,
        aiDraft: slot.text,
        source: ['knowledge/dashboard-data.json'],
        riskTags: existing ? existing.riskTags : riskTags,
        reviewStatus: existing ? existing.reviewStatus : (riskTags.length > 0 ? 'pending' : 'approved'),
        humanRevision: existing ? existing.humanRevision : '',
        reviewNote: existing ? existing.reviewNote : '',
        updatedAt: existing ? existing.updatedAt : now
      });
    });

    const output = { generatedAt: now, items };
    await mkdir(dirname(JSON_PATH), { recursive: true });
    await writeFile(JSON_PATH, JSON.stringify(output, null, 2), 'utf8');
    console.log(`Generated ${JSON_PATH} with ${items.length} items.`);
  } catch (err) {
    console.error('Failed to build Copy QA Queue:', err);
    process.exit(1);
  }
}

buildCopyQaQueue();
