import { createServer } from 'node:http';
import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 8765;
const DEBUG_PORT = 9223;

function contentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (filePath.endsWith('.png')) return 'image/png';
  return 'text/plain; charset=utf-8';
}

function startServer() {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://127.0.0.1:${PORT}`);
      const relativePath = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
      const fullPath = path.resolve(ROOT, relativePath);
      if (!fullPath.startsWith(ROOT)) {
        response.writeHead(403);
        response.end('Forbidden');
        return;
      }
      const body = await readFile(fullPath);
      response.writeHead(200, { 'Content-Type': contentType(fullPath) });
      response.end(body);
    } catch (error) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(error.message);
    }
  });
  return new Promise((resolve) => {
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

async function waitForJson() {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`);
      const pages = await response.json();
      const page = pages.find((entry) => entry.type === 'page' && entry.webSocketDebuggerUrl);
      if (page) return page.webSocketDebuggerUrl;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  throw new Error('Could not connect to Edge DevTools endpoint');
}

function connect(wsUrl) {
  const socket = new WebSocket(wsUrl);
  let nextId = 1;
  const pending = new Map();

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    const handlers = pending.get(message.id);
    if (!handlers) return;
    pending.delete(message.id);
    if (message.error) {
      handlers.reject(new Error(message.error.message));
    } else {
      handlers.resolve(message.result);
    }
  });

  return new Promise((resolve, reject) => {
    socket.addEventListener('open', () => {
      resolve({
        send(method, params = {}) {
          const id = nextId++;
          socket.send(JSON.stringify({ id, method, params }));
          return new Promise((resolveMessage, rejectMessage) => {
            pending.set(id, { resolve: resolveMessage, reject: rejectMessage });
          });
        },
        close() {
          socket.close();
        },
      });
    });
    socket.addEventListener('error', () => reject(new Error('WebSocket connection failed')));
  });
}

async function evaluate(client, expression) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text);
  }
  return result.result.value;
}

async function capture(client, outputPath) {
  const result = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  await writeFile(outputPath, Buffer.from(result.data, 'base64'));
  const info = await stat(outputPath);
  if (info.size < 10000) {
    throw new Error(`${outputPath} screenshot is unexpectedly small`);
  }
}

async function main() {
  const server = await startServer();
  const edge = spawn(EDGE, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=C:\\tmp\\tiebilum-dashboard-profile-${Date.now()}`,
    `http://127.0.0.1:${PORT}/`,
  ], { stdio: 'ignore' });

  try {
    const wsUrl = await waitForJson();
    const client = await connect(wsUrl);
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const initialCards = await evaluate(client, "document.querySelectorAll('#libraryGrid .item-card').length");
    if (initialCards < 8) throw new Error(`Expected at least 8 library cards, got ${initialCards}`);

    const qdmCards = await evaluate(client, `
      (() => {
        const input = document.querySelector('#searchInput');
        input.value = 'QDM';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return document.querySelectorAll('#libraryGrid .item-card').length;
      })()
    `);
    if (qdmCards < 1 || qdmCards >= initialCards) {
      throw new Error(`Search did not narrow cards as expected: ${qdmCards}/${initialCards}`);
    }

    const maintenanceCards = await evaluate(client, `
      (() => {
        document.querySelector('#searchInput').value = '';
        document.querySelector('#searchInput').dispatchEvent(new Event('input', { bubbles: true }));
        const select = document.querySelector('#categoryFilter');
        select.value = '品牌資料維護';
        select.dispatchEvent(new Event('change', { bubbles: true }));
        return Array.from(document.querySelectorAll('#libraryGrid .item-card h3')).map((node) => node.textContent);
      })()
    `);
    if (!maintenanceCards.length) {
      throw new Error('Category filter returned no brand maintenance cards');
    }

    await capture(client, 'C:\\tmp\\tiebilum-dashboard-desktop.png');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 900,
      deviceScaleFactor: 1,
      mobile: true,
    });
    const overflow = await evaluate(client, 'document.documentElement.scrollWidth > window.innerWidth');
    if (overflow) {
      throw new Error('Mobile viewport has horizontal overflow');
    }
    await capture(client, 'C:\\tmp\\tiebilum-dashboard-mobile.png');
    client.close();

    console.log(`Loaded dashboard over http://127.0.0.1:${PORT}/`);
    console.log(`Initial cards: ${initialCards}`);
    console.log(`QDM search cards: ${qdmCards}`);
    console.log(`Brand maintenance cards: ${maintenanceCards.length}`);
    console.log('Screenshots: C:\\tmp\\tiebilum-dashboard-desktop.png, C:\\tmp\\tiebilum-dashboard-mobile.png');
  } finally {
    edge.kill();
    server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
