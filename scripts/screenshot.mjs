// Screenshot a static project at desktop and phone size.
// Usage: node scripts/screenshot.mjs <slug> [path ...]
// Output: /tmp/shots/<slug>/<desktop|phone>-<page>.png
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const slug = process.argv[2];
if (!slug) { console.error('Usage: node scripts/screenshot.mjs <slug> [path ...]'); process.exit(1); }
const paths = process.argv.slice(3).length ? process.argv.slice(3) : ['/'];
const projectDir = resolve('projects', slug);
const require = createRequire(resolve(projectDir, 'package.json'));
const { chromium, devices } = require('@playwright/test');

const port = 4300 + Math.floor(Math.random() * 500);
const server = spawn('node', [resolve('scripts/serve.mjs'), resolve(projectDir, 'public'), String(port)], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 600));

const out = `/tmp/shots/${slug}`;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
try {
  for (const [label, opts] of [['desktop', { viewport: { width: 1366, height: 900 } }], ['phone', devices['Pixel 7']]]) {
    const context = await browser.newContext(opts);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => m.type() === 'error' && errors.push(m.text()));
    for (const p of paths) {
      await page.goto(`http://localhost:${port}${p}`, { waitUntil: 'networkidle' });
      const name = p === '/' ? 'home' : p.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
      const file = `${out}/${label}-${name}.png`;
      await page.screenshot({ path: file, fullPage: true });
      console.log(file);
    }
    if (errors.length) console.log(`${label} console errors:\n  ${errors.join('\n  ')}`);
    await context.close();
  }
} finally {
  await browser.close();
  server.kill();
}
