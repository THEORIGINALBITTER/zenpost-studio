import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatePath = join(__dirname, '..', 'og_image_template.html');
const outputPath = join(__dirname, '..', 'public', 'og_zenpost_studio.png');

// Lokaler HTTP-Server damit Google Fonts CDN laden kann
const server = createServer((_, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(readFileSync(templatePath));
});
await new Promise((r) => server.listen(7438, r));

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1200, height: 630 });
await page.goto('http://localhost:7438');
await page.waitForLoadState('networkidle');
await page.waitForTimeout(600);
await page.screenshot({ path: outputPath, clip: { x: 0, y: 0, width: 1200, height: 630 } });

await browser.close();
server.close();
console.log(`OG Image gespeichert: ${outputPath}`);
