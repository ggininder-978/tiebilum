import http from 'node:http';
import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PORT = 8787;

const JSON_PATH = join(ROOT, 'knowledge/wiki/analysis/ai_copy_qa_queue.json');
const MD_PATH = join(ROOT, 'knowledge/wiki/analysis/ai_copy_qa_queue.md');
const AUDIT_PATH = join(ROOT, 'knowledge/wiki/analysis/ai_copy_qa_workbench_audit.md');

async function renderMarkdown(data) {
  const header = [
    '# AI Copy QA Queue',
    '',
    `> Last Updated: ${new Date(data.generatedAt).toLocaleString('zh-TW')}`,
    '> Current Policy: Only "approved" or "revised" items can enter the public dashboard.',
    '',
    '| ID | Page | Slot | Status | Risk Tags | AI Draft | Human Revision | Note | Source |',
    '| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |'
  ].join('\n');

  const rows = data.items.map(i => {
    const status = `**${i.reviewStatus}**`;
    const risks = i.riskTags.join(', ') || '-';
    const draft = i.aiDraft.replace(/\n/g, '<br>');
    const revision = i.humanRevision ? i.humanRevision.replace(/\n/g, '<br>') : '-';
    const note = i.reviewNote || '-';
    const source = i.source.join(', ');
    return `| ${i.id} | ${i.page} | ${i.slot} | ${status} | ${risks} | ${draft} | ${revision} | ${note} | ${source} |`;
  }).join('\n');

  const summary = [
    '',
    '## 審核進度摘要',
    `- **Total**: ${data.items.length}`,
    `- **Approved**: ${data.items.filter(i => i.reviewStatus === 'approved').length}`,
    `- **Revised**: ${data.items.filter(i => i.reviewStatus === 'revised').length}`,
    `- **Pending**: ${data.items.filter(i => i.reviewStatus === 'pending').length}`,
    `- **Rejected**: ${data.items.filter(i => i.reviewStatus === 'rejected').length}`,
    `- **Needs Source**: ${data.items.filter(i => i.reviewStatus === 'needs-source').length}`
  ].join('\n');

  return `${header}\n${rows}\n${summary}\n`;
}

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/api/copy-qa' && req.method === 'GET') {
    try {
      const data = await readFile(JSON_PATH, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    } catch (e) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Queue file not found' }));
    }
    return;
  }

  if (req.url === '/api/copy-qa' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        if (!payload.items) throw new Error('Invalid payload');

        payload.generatedAt = new Date().toISOString();
        const jsonContent = JSON.stringify(payload, null, 2);
        await writeFile(JSON_PATH, jsonContent, 'utf8');
        
        const mdContent = await renderMarkdown(payload);
        await writeFile(MD_PATH, mdContent, 'utf8');

        const auditEntry = [
          '',
          `## ${new Date().toISOString()} Copy QA Save`,
          `- Action: save`,
          `- Items: ${payload.items.length}`,
          `- Status: ${payload.items.map(i => i.reviewStatus).join(', ')}`,
          ''
        ].join('\n');
        await appendFile(AUDIT_PATH, auditEntry, 'utf8');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Serve static files from ROOT
  const publicPaths = ['/index.html', '/outputs/copy_qa_online_intake.html', '/outputs/copy_qa_workbench.html'];
  const requestedPath = req.url === '/' ? '/index.html' : req.url;

  if (publicPaths.includes(requestedPath) || requestedPath.startsWith('/outputs/')) {
    try {
      const filePath = join(ROOT, requestedPath);
      const content = await readFile(filePath, 'utf8');
      const ext = requestedPath.split('.').pop();
      const contentType = ext === 'html' ? 'text/html' : (ext === 'json' ? 'application/json' : 'text/plain');
      
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch (e) {
      res.writeHead(404);
      res.end('File not found');
    }
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`Copy QA Server running at http://localhost:${PORT}`);
});
