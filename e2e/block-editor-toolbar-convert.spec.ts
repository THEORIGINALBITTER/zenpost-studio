import { expect, test } from '@playwright/test';

test('regression: converting selected text to H3 keeps the selected block text', async ({ page }) => {
  await page.goto('/?e2eHarness=block-editor');
  await expect(page.getByTestId('block-editor-harness')).toBeVisible();

  const firstParagraph = page.locator('.ce-block').first().locator('.ce-paragraph').first();
  await expect(firstParagraph).toContainText('Erste Zeile im ersten Absatz.');
  await firstParagraph.click();

  await page.evaluate(() => {
    const firstParagraphEl = document.querySelector<HTMLElement>('.ce-block .ce-paragraph');
    if (!firstParagraphEl || !firstParagraphEl.firstChild) {
      throw new Error('First paragraph not found for selection');
    }
    const selection = window.getSelection();
    const range = document.createRange();
    range.setStart(firstParagraphEl.firstChild, 0);
    range.setEnd(firstParagraphEl.firstChild, firstParagraphEl.textContent?.length ?? 0);
    selection?.removeAllRanges();
    selection?.addRange(range);
  });

  await page.getByTestId('zen-block-menu-dot').click();
  await page.getByTestId('zen-convert-h3').click();

  const firstBlockHeader = page.locator('.ce-block').first().locator('.ce-header, .cdx-header');
  await expect(firstBlockHeader).toContainText('Erste Zeile im ersten Absatz.');
  await expect(page.locator('.ce-block').nth(1)).toContainText('Zweite Zeile bleibt unverändert.');
});
