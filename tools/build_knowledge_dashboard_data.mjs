import { appendFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path, { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const KNOWLEDGE_FILES = [
  'knowledge/index.md',
  'knowledge/log.md',
  'knowledge/wiki/entities/brand_tiebilum.md',
  'knowledge/wiki/entities/brand_history.md',
  'knowledge/wiki/entities/product_sales_2025.md',
  'knowledge/wiki/concepts/market_positioning.md',
  'knowledge/wiki/concepts/llm_wiki_html_artifacts.md',
  'knowledge/wiki/analysis/2025_financial_sales_analysis.md',
  'knowledge/wiki/analysis/tiebilum_knowledge_dashboard_audit.md',
  'knowledge/specs/tiebilum_knowledge_dashboard_spec.md',
];

const LIBRARY_SEEDS = [
  {
    id: 'brand-current-state',
    title: '品牌現狀與核心脈絡',
    category: '品牌脈絡',
    status: 'draft',
    path: 'knowledge/wiki/entities/brand_tiebilum.md',
    tags: ['品牌', '現狀', '合作夥伴'],
    summary: '鐵比倫目前需要把品牌故事、產品事實與 QDM 頁面素材整理成合作夥伴可快速使用的資料室。',
    whyItMatters: '這是所有對外溝通的源頭，定調品牌的「職人」與「誠實」屬性。',
    nextAction: '持續根據銷售數據與市場回饋，精煉核心價值的論述。'
  },
  {
    id: 'brand-history',
    title: '品牌故事與地方脈絡',
    category: '品牌脈絡',
    status: 'confirmed',
    path: 'knowledge/wiki/entities/brand_history.md',
    tags: ['埔里', '故事', '職人感'],
    summary: '保存品牌來源、地方脈絡與可延伸為官網關於頁、品牌介紹、CIS 語言的敘事素材。',
    whyItMatters: '支撐「風土 (Terroir)」主張，讓品牌不再是無根的電商商品。',
    nextAction: '產出 1916 Badila 紅甘蔗的歷史考據，補齊原物料的歷史厚度。'
  },
  {
    id: 'market-positioning',
    title: '市場定位與溝通方向',
    category: '行銷資料',
    status: 'draft',
    path: 'knowledge/wiki/concepts/market_positioning.md',
    tags: ['定位', '受眾', '行銷'],
    summary: '整理鐵比倫應如何被理解、如何避免浮誇語氣，以及行銷團隊可使用的定位句型。',
    whyItMatters: '防止合作夥伴將品牌過度包裝或偏離「誠實鄰里」的基調。',
    nextAction: '根據產品利潤結構，微調主打受眾的溝通優先級。'
  },
  {
    id: 'qdm-copy-assets',
    title: 'QDM 頁面素材與文案需求',
    category: '官網素材與文案',
    status: 'needs-review',
    path: 'knowledge/specs/tiebilum_knowledge_dashboard_spec.md',
    tags: ['QDM', '文案', '素材缺口'],
    summary: 'QDM 開店平台頁面需要品牌脈絡、商品介紹、首頁文案方向、視覺素材與缺漏狀態。',
    whyItMatters: '直接影響銷售轉換率與新客的第一印象。',
    nextAction: '整理首頁與商品頁的實際素材缺口清單交給設計團隊。'
  },
  {
    id: 'cis-visual-inputs',
    title: 'CIS 視覺輸入',
    category: '視覺/CIS',
    status: 'needs-review',
    path: 'knowledge/specs/tiebilum_knowledge_dashboard_spec.md',
    tags: ['CIS', '視覺', '品牌語氣'],
    summary: 'CIS 夥伴需要品牌故事、語氣、定位、視覺線索與商品脈絡，目前仍需整理可交付素材。',
    whyItMatters: '決定了品牌未來在所有通路的視覺一致性與質感。',
    nextAction: '將品牌語氣轉化為設計團隊可回答的視覺提問清單。'
  },
  {
    id: 'product-sales-2025',
    title: '2025 商品銷售摘要',
    category: '財務分析',
    status: 'confirmed',
    path: 'knowledge/wiki/entities/product_sales_2025.md',
    tags: ['商品', '銷售', '2025'],
    summary: '提供商品營收、貢獻淨利與行銷優先順序的分析入口，適合作為商品頁與活動主題參考。',
    whyItMatters: '指出哪些產品是「帶路雞」，哪些是「高毛利護城河」。',
    nextAction: '將此摘要擴充為高密度的銷售診斷模組 (Sales Diagnosis)。'
  },
  {
    id: 'financial-analysis-2025',
    title: '2025 財務與通路分析',
    category: '財務分析',
    status: 'needs-review',
    path: 'knowledge/wiki/analysis/2025_financial_sales_analysis.md',
    tags: ['財務', '通路', '待確認'],
    summary: '彙整銷售、成本與通路資訊；部分成本缺漏仍需確認，不應直接當作正式對外財務說法。',
    whyItMatters: '避免盲目投放行銷資源在負毛利的通路上。',
    nextAction: '釐清缺漏的成本項目，並將結論提煉給行銷團隊。'
  },
  {
    id: 'dashboard-maintenance',
    title: '品牌資料維護規格',
    category: '品牌資料維護',
    status: 'confirmed',
    path: 'knowledge/specs/tiebilum_knowledge_dashboard_spec.md',
    tags: ['規格', 'audit', '資料維護'],
    summary: '定義資料來源、儀表板資料合約、驗證方式與 audit 規則，確保資料室可持續維護。',
    whyItMatters: '保證儀表板不會隨時間腐化，確保資料可信度。',
    nextAction: '嚴格遵守 Spec-First，任何架構改動前先更新規格。'
  },
  {
    id: 'llm-wiki-artifacts',
    title: 'LLM Wiki 與 HTML Artifacts 方法',
    category: '品牌資料維護',
    status: 'draft',
    path: 'knowledge/wiki/concepts/llm_wiki_html_artifacts.md',
    tags: ['知識庫', 'HTML', '工作流'],
    summary: '說明以 Markdown wiki 作為長期記憶、HTML 儀表板作為互動視圖與資料維護入口的方法。',
    whyItMatters: '這是整個 Tiebilum OS 協作效率的底層邏輯。',
    nextAction: '讓所有新加入的 Agent 模型都能先閱讀此文件以了解脈絡。'
  },
];

function absolutePath(rootDir, relativePath) {
  return path.join(rootDir, relativePath);
}

async function readOptionalFile(rootDir, relativePath, warnings) {
  try {
    const filePath = absolutePath(rootDir, relativePath);
    const content = await readFile(filePath, 'utf8');
    const info = await stat(filePath);
    if (!content.trim()) {
      warnings.push(`${relativePath} is empty`);
    }
    return {
      relativePath,
      content,
      mtime: info.mtime.toISOString(),
      size: info.size,
      exists: true,
    };
  } catch (error) {
    warnings.push(`${relativePath} could not be read: ${error.code ?? error.message}`);
    return {
      relativePath,
      content: '',
      mtime: '',
      size: 0,
      exists: false,
    };
  }
}

function latestLogEntries(logContent) {
  return logContent
    .split(/\r?\n/)
    .filter((line) => line.startsWith('## '))
    .slice(0, 5)
    .map((line) => line.replace(/^##\s*/, '').trim());
}

function updatedHint(fileInfo) {
  if (!fileInfo?.exists || !fileInfo.mtime) {
    return '尚未建立或無法讀取';
  }
  return fileInfo.mtime.slice(0, 10);
}

function buildLibrary(fileMap) {
  return LIBRARY_SEEDS.map((seed) => {
    const fileInfo = fileMap.get(seed.path);
    const status = fileInfo?.exists ? seed.status : 'missing';
    return {
      ...seed,
      status,
      updatedHint: updatedHint(fileInfo),
    };
  });
}

function parseMarkdownTable(content, titleMatch) {
  const lines = content.split('\n');
  const titleIndex = lines.findIndex(l => l.includes(titleMatch));
  if (titleIndex === -1) return [];

  const tableStartIndex = lines.findIndex((l, i) => i > titleIndex && l.includes('|') && !l.includes(':---'));
  if (tableStartIndex === -1) return [];

  const dataRows = [];
  for (let i = tableStartIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.includes('|')) break;
    if (line.includes(':---')) continue;
    
    const cells = line.split('|').filter(c => c.trim() !== '').map(c => c.trim());
    dataRows.push(cells);
  }
  return dataRows;
}

export async function getSalesDiagnosis(rootDir) {
  const analysisPath = join(rootDir, 'knowledge/wiki/analysis/2025_financial_sales_analysis.md');
  const defaultData = {
    summary: { revenue: 0, contributionProfit: 0, contributionRate: '0%', operatingCosts: 0, netIncome: 0, source: 'knowledge/wiki/analysis/2025_financial_sales_analysis.md' },
    productSignals: [],
    channelSignals: [],
    notes: []
  };

  try {
    const content = await readFile(analysisPath, 'utf8');
    
    const revenue = parseFloat(content.match(/營業額：NT\$([\d,]+)/)?.[1].replace(/,/g, '') || 0);
    const profit = parseFloat(content.match(/貢獻淨利：NT\$([\d,]+)/)?.[1].replace(/,/g, '') || 0);
    const rate = content.match(/貢獻淨利率：([\d.]+%)/)?.[1] || '0%';
    const costs = parseFloat(content.match(/已確認年度營業費用：NT\$([\d,]+)/)?.[1].replace(/,/g, '') || 0);
    const net = parseFloat(content.match(/管理可用淨利.*?NT\$([\d,-]+)/)?.[1].replace(/,/g, '') || 0);

    const productRows = parseMarkdownTable(content, '商品銷售排名：營收 Top 5');
    const productSignals = productRows.slice(0, 5).map(row => ({
      rank: parseInt(row[0]) || 0,
      name: row[1] || '',
      revenue: parseInt(row[2].replace(/,/g, '')) || 0,
      profit: parseInt(row[4].replace(/,/g, '')) || 0,
      margin: row[5] || '',
      diagnosis: row[6] || '',
      action: row[6].includes('主力') ? 'promote' : (row[6].includes('待補') ? 'review' : 'keep'),
      source: 'knowledge/wiki/analysis/2025_product_sales_ranking.csv'
    }));

    const channelRows = parseMarkdownTable(content, '通路概況');
    const channelSignals = channelRows.map(row => ({
      name: row[0] || '',
      revenue: parseInt(row[1].replace(/,/g, '')) || 0,
      profit: parseInt(row[2].replace(/,/g, '')) || 0,
      margin: row[3] || '',
      diagnosis: row[4] || '',
      source: 'knowledge/wiki/analysis/2025_channel_financials.csv'
    }));

    const notesMatch = content.match(/## 注意事項\n\n([\s\S]*?)(?:\n##|$)/);
    const notes = (notesMatch?.[1] || '').split('\n')
      .filter(line => line.startsWith('- '))
      .map(line => {
        const text = line.replace('- ', '').trim();
        return {
          type: text.includes('確認') || text.includes('缺') ? 'risk' : (text.includes('移除') ? 'observation' : 'action'),
          text,
          source: 'knowledge/wiki/analysis/2025_financial_sales_analysis.md'
        };
      });

    return {
      summary: { revenue, contributionProfit: profit, contributionRate: rate, operatingCosts: costs, netIncome: net, source: 'knowledge/wiki/analysis/2025_financial_sales_analysis.md' },
      productSignals,
      channelSignals,
      notes
    };
  } catch (err) {
    return { ...defaultData, warnings: [`Failed to parse sales analysis: ${err.message}`] };
  }
}

async function getEvidenceHeritage(rootDir) {
  const historyPath = join(rootDir, 'knowledge/wiki/entities/brand_history.md');
  const defaultData = {
    historyFacts: [],
    terroirPoints: [],
    usableCopy: [],
    forbiddenClaims: []
  };

  try {
    const content = await readFile(historyPath, 'utf8');
    
    // Extract History Facts from Section 1 & 2
    const historyFacts = [];
    if (content.includes('1916')) {
      historyFacts.push({
        year: '1916',
        event: '從澳洲引進 Badila (大島) 品種紅甘蔗，開啟埔里紅甘蔗產業。',
        source: 'knowledge/wiki/entities/brand_history.md'
      });
    }
    if (content.includes('創辦人')) {
      historyFacts.push({
        year: '1990s',
        event: '創辦人開始於埔里農會販售紅甘蔗，建立「鄰里守護者」誠實形象。',
        source: 'knowledge/wiki/entities/brand_history.md'
      });
    }

    // Extract Terroir Points
    const terroirPoints = [];
    if (content.includes('避風')) {
      terroirPoints.push({
        point: '埔里盆地避風地形',
        benefit: '山岳環繞地形保護了珍貴的紅甘蔗免於強風倒伏，糖度累積更穩定。',
        source: 'knowledge/wiki/entities/brand_history.md'
      });
    }
    if (content.includes('鮮食')) {
      terroirPoints.push({
        point: 'Badila 鮮食品種特點',
        benefit: '皮薄、肉質脆軟、纖維極細，使得熬製出的黑糖風味更細膩、不苦澀。',
        source: 'knowledge/wiki/entities/brand_history.md'
      });
    }

    // Usable Copy (Seeds for now, can be extracted from market_positioning.md later)
    const usableCopy = [
      {
        text: '鐵比倫選用1916年澳洲引進之Badila品種，皮薄纖維細，賦予黑糖更細膩的清甜。',
        context: '官網商品介紹',
        source: 'knowledge/wiki/entities/brand_history.md'
      },
      {
        text: '埔里盆地的環山避風，是職人守護紅甘蔗的天然屏障，也是誠實甜味的源頭。',
        context: '品牌故事',
        source: 'knowledge/wiki/entities/brand_history.md'
      }
    ];

    const forbiddenClaims = [
      {
        claim: '埔里唯一的黑糖廠',
        reason: '尚待地方誌確認，避免過度宣稱。',
        action: 'Avoid',
        source: 'knowledge/wiki/concepts/market_positioning.md'
      },
      {
        claim: '全台最高品質',
        reason: '缺乏第三方客觀評比數據，且不符合「樸實」語氣。',
        action: 'Avoid',
        source: 'knowledge/wiki/concepts/market_positioning.md'
      }
    ];

    return { historyFacts, terroirPoints, usableCopy, forbiddenClaims };
  } catch (err) {
    return { ...defaultData, warnings: [`Failed to parse evidence heritage: ${err.message}`] };
  }
}

async function getQdmReadiness(rootDir) {
  const assetPath = join(rootDir, 'knowledge/wiki/analysis/qdm_asset_progress.md');
  const qaPath = join(rootDir, 'knowledge/wiki/analysis/ai_copy_qa_queue.md');
  const defaultData = {
    homepage: { headline: '', subheadline: '', intro: '', cta: '' },
    products: [],
    assetGaps: [],
    guardrails: []
  };

  try {
    const assetContent = await readFile(assetPath, 'utf8');
    const qaContent = await readFile(qaPath, 'utf8');

    // Parse Asset Matrix (Simple Table Parser)
    const assetGaps = [];
    const assetLines = assetContent.split('\n').filter(l => l.includes('|') && !l.includes(':---'));
    assetLines.slice(2).forEach(line => {
      const cols = line.split('|').map(c => c.trim()).filter(Boolean);
      if (cols.length >= 8) {
        assetGaps.push({
          page: cols[0],
          item: cols[1],
          type: cols[2],
          status: cols[3].toLowerCase().includes('ready') ? 'ready' : (cols[3].toLowerCase().includes('missing') ? 'missing' : 'needs-review'),
          owner: cols[4],
          purpose: cols[5],
          standard: cols[6],
          nextStep: cols[7]
        });
      }
    });

    // Parse Copy QA (Extract Approved/Revised Only)
    const qaItems = [];
    const qaLines = qaContent.split('\n').filter(l => l.includes('|') && !l.includes(':---'));
    qaLines.slice(2).forEach(line => {
      const cols = line.split('|').map(c => c.trim()).filter(Boolean);
      if (cols.length >= 9) {
        qaItems.push({
          id: cols[0],
          page: cols[1],
          slot: cols[2],
          status: cols[3].toLowerCase(),
          riskTags: cols[4],
          aiDraft: cols[5],
          humanRevision: cols[6],
          note: cols[7],
          source: cols[8]
        });
      }
    });

    const getApproved = (id, fallback) => {
      const item = qaItems.find(i => i.id === id);
      if (item && (item.status.includes('approved') || item.status.includes('revised'))) {
        return item.humanRevision && item.humanRevision !== '-' ? item.humanRevision : item.aiDraft;
      }
      return `[審核中] ${fallback}`;
    };

    const homepage = {
      headline: getApproved('hp-headline-001', '鐵比倫：職人製糖與誠實鄰里'),
      subheadline: '源自 1916 年澳洲 Badila 品種，於埔里環山避風之地，守護一份純粹的清甜。',
      intro: getApproved('hp-intro-001', '從一根紅甘蔗到一塊純黑糖，堅持傳統手工，無人工添加物。'),
      cta: '探索誠實之味'
    };

    const products = [
      {
        name: '鐵比倫 原味黑糖 (Badila 品種)',
        specs: '夾鏈袋裝 / 罐裝',
        flavor: '細膩清甜，無一般黑糖的苦澀焦味。',
        usage: '直接食用、沖泡飲用、入菜點綴。',
        notes: '傳統手工製作，色澤與顆粒大小略有不同屬正常現象。'
      }
    ];

    const guardrails = [
      { claim: '醫療效能宣稱', risk: '法律風險', action: 'Strictly Forbidden' },
      { claim: '全台唯一 / 埔里唯一', risk: '未經查證', action: 'Avoid' }
    ];

    return { homepage, products, assetGaps, guardrails };
  } catch (err) {
    return { ...defaultData, warnings: [`Failed to parse QDM dynamic readiness: ${err.message}`] };
  }
}

function buildProgress() {
  return [
    {
      area: '官網素材與文案',
      status: 'needs-review',
      summary: '以 QDM 開店平台頁面為主，優先補齊首頁、商品頁、品牌介紹與視覺素材。',
      items: ['確認首頁主文案方向', '整理商品頁短文案', '盤點照片與應用素材缺口'],
    },
    {
      area: 'CIS 視覺',
      status: 'in-progress',
      summary: '已整理品牌脈絡與語氣方向，仍需提供視覺線索、使用情境與素材優先級。',
      items: ['整理品牌語氣關鍵字', '提供商品與地方脈絡參考', '列出 CIS 夥伴待問問題'],
    },
    {
      area: '行銷資料',
      status: 'in-progress',
      summary: '已有商品與銷售分析入口，可支援活動主題與商品排序，但部分成本資料仍待確認。',
      items: ['標記可對外使用的商品賣點', '區分內部分析與公開說法', '整理高優先商品清單'],
    },
    {
      area: '品牌資料維護',
      status: 'ready',
      summary: '規格、資料來源與 audit 規則已建立，後續更新需持續回寫 wiki 與 audit。',
      items: ['每次更新重建 dashboard-data.json', '補充 audit 紀錄', '維持來源與摘要分離'],
    },
  ];
}

function buildGaps() {
  return [
    {
      title: 'QDM 頁面素材與文案尚待盤點',
      area: '官網素材與文案',
      whyItMatters: '合作夥伴需要知道哪些照片、商品介紹與首頁文案可以直接使用。',
      nextAction: '整理首頁、品牌介紹、商品頁與活動區塊的素材缺口清單。',
    },
    {
      title: 'CIS 視覺輸入仍需具體化',
      area: 'CIS 視覺',
      whyItMatters: '視覺夥伴需要足夠的品牌語氣、使用情境與禁忌，才能避免做出過度包裝的方向。',
      nextAction: '把品牌語氣、色彩感受、應用場景與不適合方向整理成審閱問題。',
    },
    {
      title: '部分財務與成本資料需標記為待確認',
      area: '行銷資料',
      whyItMatters: '內部分析可以支援排序，但未確認成本不應變成公開行銷宣稱。',
      nextAction: '將可公開的商品事實與內部待確認數字分開呈現。',
    },
  ];
}

function buildPrompts() {
  return [
    {
      title: '產出 QDM 首頁文案方向',
      intent: '把品牌脈絡轉成可審閱的首頁文案草案。',
      prompt: '請根據鐵比倫目前品牌脈絡、品牌語氣與 QDM 開店平台限制，產出 3 組首頁主標、副標與短介紹。語氣要樸實、透明、有職人感，避免浮誇科技行銷語。',
    },
    {
      title: '盤點 QDM 頁面缺漏素材',
      intent: '讓官網夥伴知道下一批要補什麼。',
      prompt: '請根據目前知識庫，列出 QDM 開店平台頁面仍缺的照片、商品資訊、品牌文字與審核問題，並用「必須 / 建議 / 可延後」分級。',
    },
    {
      title: '整理 CIS 夥伴審閱問題',
      intent: '把品牌脈絡轉成視覺設計可回答的問題。',
      prompt: '請根據鐵比倫品牌故事、定位與語氣，整理給 CIS 視覺夥伴的審閱問題，包含色彩、字體、Logo 使用情境、包裝延伸與不適合方向。',
    },
    {
      title: '萃取商品頁可用賣點',
      intent: '把商品與銷售資料轉為行銷可用素材。',
      prompt: '請根據商品資料與 2025 銷售分析，整理適合放在 QDM 商品頁的賣點、注意事項與需要業主確認的說法，並避免使用未確認的財務數字。',
    },
    {
      title: '更新品牌資料維護清單',
      intent: '把目前缺口轉成下一步維護任務。',
      prompt: '請檢查鐵比倫 knowledge wiki，列出品牌資料維護的下一步任務，包含要更新的 wiki 頁、需要回溯的 source、應新增的 audit 紀錄。',
    },
  ];
}

function taipeiDate(value) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

export async function buildDashboardData(options = {}) {
  const rootDir = options.rootDir ?? ROOT;
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const warnings = [];
  const fileInfos = await Promise.all(
    KNOWLEDGE_FILES.map((relativePath) => readOptionalFile(rootDir, relativePath, warnings)),
  );
  const fileMap = new Map(fileInfos.map((fileInfo) => [fileInfo.relativePath, fileInfo]));
  const log = fileMap.get('knowledge/log.md')?.content ?? '';

  const salesDiagnosis = await getSalesDiagnosis(rootDir);
  const evidenceHeritage = await getEvidenceHeritage(rootDir);
  const qdmReadiness = await getQdmReadiness(rootDir);

  return {
    generatedAt,
    brand: {
      name: '鐵比倫 Tiebilum',
      stage: 'QDM 開店平台、CIS 視覺與行銷素材整理中',
      oneLine: '品牌資料室協助合作夥伴快速掌握鐵比倫現況、素材缺口與可用文案脈絡。',
      positioning: '以埔里地方脈絡、職人製糖與誠實鄰里感為核心，將品牌資料整理成可審閱、可維護、可交付的工作資料。',
      voice: ['樸實', '透明', '職人感', '不浮誇', '可追溯'],
    },
    progress: buildProgress(),
    library: buildLibrary(fileMap),
    isSalesDiagnosisEncrypted: true,
    evidenceHeritage,
    qdmReadiness,
    gaps: buildGaps(),
    agentPrompts: buildPrompts(),
    audit: {
      latestLogEntries: latestLogEntries(log),
      warnings: [
        ...warnings, 
        ...(salesDiagnosis.warnings || []),
        ...(evidenceHeritage.warnings || []),
        ...(qdmReadiness.warnings || [])
      ],
    },
  };
}

export async function writeDashboardData(options = {}) {
  const rootDir = options.rootDir ?? ROOT;
  const outputPath = options.outputPath ?? 'knowledge/dashboard-data.json';
  const auditPath = options.auditPath ?? 'knowledge/wiki/analysis/tiebilum_knowledge_dashboard_audit.md';
  const data = await buildDashboardData(options);
  const fullOutputPath = absolutePath(rootDir, outputPath);
  await mkdir(path.dirname(fullOutputPath), { recursive: true });
  await writeFile(fullOutputPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');

  const auditEntry = [
    '',
    `## ${taipeiDate(data.generatedAt)} Dashboard Data Build`,
    '',
    `- Generated: \`${outputPath}\``,
    `- Files read: ${KNOWLEDGE_FILES.length}`,
    `- Library cards: ${data.library.length}`,
    `- Warnings: ${data.audit.warnings.length ? data.audit.warnings.join('; ') : 'none'}`,
    '',
  ].join('\n');
  await appendFile(absolutePath(rootDir, auditPath), auditEntry, 'utf8');
  return data;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  writeDashboardData()
    .then((data) => {
      console.log(`Generated knowledge/dashboard-data.json with ${data.library.length} library cards.`);
      if (data.audit.warnings.length) {
        console.warn(`Warnings: ${data.audit.warnings.join('; ')}`);
      }
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
