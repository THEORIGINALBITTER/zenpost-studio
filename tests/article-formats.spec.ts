import { expect, test } from '@playwright/test';
import { applySteuerFormatConfig, validateSteuerFormatContent } from '../src/config/formatConfigTrans';

const article = '# Fachartikel\n\n## Hintergrund\n\n' + 'Eine ausführliche Erklärung mit fachlichen Details. '.repeat(100);

test('LinkedIn article preserves long content and section headings', () => {
  const result = applySteuerFormatConfig(article, 'linkedin-article');
  expect(result).toContain('## Hintergrund');
  expect(result.length).toBeGreaterThan(3000);
  expect(result.match(/fachlichen Details/g)).toHaveLength(100);
  expect(validateSteuerFormatContent(result, 'linkedin-article').errors.filter(issue => issue.code === 'max-total-chars')).toEqual([]);
});

test('LinkedIn feed continues to enforce its own length limit', () => {
  const result = applySteuerFormatConfig(article, 'linkedin');
  expect(result).not.toContain('## Hintergrund');
  expect(validateSteuerFormatContent(result, 'linkedin').errors.some(issue => issue.code === 'max-total-chars')).toBe(true);
});

test('switching article formats preserves the complete body in both directions', () => {
  const medium = applySteuerFormatConfig(article, 'medium');
  const linkedin = applySteuerFormatConfig(medium, 'linkedin-article');
  const back = applySteuerFormatConfig(linkedin, 'medium');
  expect(back.match(/fachlichen Details/g)).toHaveLength(100);
  expect(back).toContain('## Hintergrund');
});
