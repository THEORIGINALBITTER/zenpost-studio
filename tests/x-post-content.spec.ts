import { expect, test } from '@playwright/test';
import { prepareXPostContent, validateXPosts } from '../src/services/xPostContent';
import { applySteuerFormatConfig } from '../src/config/formatConfigTrans';

test('retains every thread segment through formatting and publishing preparation', () => {
  const parts = ['Erkenntnis '.repeat(20).trim(), 'Hintergrund '.repeat(20).trim(), 'Mehr dazu im Artikel.'];
  const formatted = applySteuerFormatConfig(parts.join('\n\n'), 'twitter');
  const result = prepareXPostContent(formatted);
  expect([result.text, ...result.thread!]).toEqual(parts);
});

test('keeps paragraphs in a single short post', () => {
  const text = 'Eine These.\n\nEine Frage?';
  expect(prepareXPostContent(text)).toEqual({ text, thread: undefined });
});

test('uses X weighted length for long URLs and emoji', () => {
  const text = `${'a'.repeat(250)} https://example.com/${'path'.repeat(100)}`;
  expect(prepareXPostContent(text).text).toBe(text);
  expect(() => validateXPosts(['😀'.repeat(141)])).toThrow('280');
});

test('rejects an invalid later segment before any publishing and preserves its text', () => {
  const long = 'a'.repeat(281);
  expect(applySteuerFormatConfig(long, 'twitter')).toBe(long);
  expect(() => prepareXPostContent(`Gültiger Einstieg\n\n${long}`)).toThrow('X-Beitrag 2');
  expect(() => prepareXPostContent('  ')).toThrow();
});

test('recognizes numbered thread boundaries separated by single newlines', () => {
  const text = `1/ ${'a'.repeat(200)}\n2/ ${'b'.repeat(200)}`;
  const result = prepareXPostContent(text);
  expect(result.text).toBe(`1/ ${'a'.repeat(200)}`);
  expect(result.thread).toEqual([`2/ ${'b'.repeat(200)}`]);
});

test('keeps explicitly numbered short posts as separate thread parts', () => {
  expect(prepareXPostContent('1/ These\n2/ Kontext')).toEqual({ text: '1/ These', thread: ['2/ Kontext'] });
});
