import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatePath = join(__dirname, '..', 'og_image_template.html');
const outputPath = join(__dirname, '..', 'public', 'og_zenpost_studio.png');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1200, height: 630 });
await page.goto(`file://${templatePath}`);
await page.waitForTimeout(1200); // Fonts laden lassen
await page.screenshot({ path: outputPath, clip: { x: 0, y: 0, width: 1200, height: 630 } });
await browser.close();

console.log(`OG Image gespeichert: ${outputPath}`);
