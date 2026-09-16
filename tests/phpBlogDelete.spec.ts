import { test, expect } from '@playwright/test';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { getPhpUploadScript, phpBlogDelete } from '../src/services/phpBlogService';

test('PHP deletion removes the actual filename and manifest entry and survives a rescan', () => {
  const dir = mkdtempSync(join(tmpdir(), 'zenpost-delete-'));
  try {
    mkdirSync(join(dir, 'posts'));
    writeFileSync(join(dir, 'posts/custom-name.md'), '# Delete me');
    writeFileSync(join(dir, 'posts/keep.md'), '# Keep me');
    writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ site: { title: 'Test' }, posts: [
      { slug: 'remove', localFileName: 'custom-name.md' }, { slug: 'keep' },
    ] }));
    const script = getPhpUploadScript('test-key');
    const path = join(dir, 'endpoint.php');
    writeFileSync(path, script);
    execFileSync('php', ['-l', path]);
    const request = (body: unknown, key = 'test-key', method = 'POST') => {
      writeFileSync(join(dir, 'body.json'), JSON.stringify(body));
      writeFileSync(path, script.replace("file_get_contents('php://input')", "file_get_contents(__DIR__ . '/body.json')"));
      return JSON.parse(execFileSync('php', ['-r', `$_SERVER['REQUEST_METHOD']='${method}'; $_SERVER['HTTP_X_API_KEY']='${key}'; require ${JSON.stringify(path)};`], { encoding: 'utf8' }));
    };
    expect(request({ action: 'delete-post', slug: 'remove' }, 'wrong').error).toBe('Unauthorized');
    expect(existsSync(join(dir, 'posts/custom-name.md'))).toBe(true);
    expect(request({ action: 'delete-post', slug: '../keep' }).error).toBe('Invalid slug');
    expect(request({ action: 'delete-post', slug: 'remove' })).toEqual({ success: true, deletedSlug: 'remove' });
    expect(existsSync(join(dir, 'posts/custom-name.md'))).toBe(false);
    expect(existsSync(join(dir, 'posts/keep.md'))).toBe(true);
    expect(JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'))).toEqual({ site: { title: 'Test' }, posts: [{ slug: 'keep' }] });
    expect(request({ action: 'delete-post', slug: 'remove' }).success).toBe(true);
    expect(request({}, 'test-key', 'GET').posts.map((p: { slug: string }) => p.slug)).toEqual(['keep']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('client rejects legacy endpoints that do not confirm deletion', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ success: true }));
    await expect(phpBlogDelete('remove', { apiUrl: 'https://example.test', apiKey: 'test' })).rejects.toThrow('aktualisieren');
    globalThis.fetch = async () => new Response(JSON.stringify({ success: true, deletedSlug: 'remove' }));
    await expect(phpBlogDelete('remove', { apiUrl: 'https://example.test', apiKey: 'test' })).resolves.toBeUndefined();
  } finally {
    globalThis.fetch = original;
  }
});

test('blog download matches the working script and substitutes the configured key safely', () => {
  const working = readFileSync(new URL('../../outputs/blog-delete/zenpost-upload.php', import.meta.url), 'utf8');
  const normalizeKey = (php: string) => php.replace(/define\('API_KEY',.*?\);/, "define('API_KEY', '__KEY__');");
  expect(normalizeKey(getPhpUploadScript('download-key', 'blog'))).toBe(normalizeKey(working));
  expect(getPhpUploadScript('download-key')).toContain("define('API_KEY', 'download-key');");
  const dir = mkdtempSync(join(tmpdir(), 'zenpost-download-key-'));
  try {
    const path = join(dir, 'endpoint.php');
    const key = "quote'backslash\\dollar$&";
    writeFileSync(path, getPhpUploadScript(key));
    execFileSync('php', ['-l', path]);
    const definition = readFileSync(path, 'utf8').match(/define\('API_KEY',.*?\);/)![0];
    expect(execFileSync('php', ['-r', definition + ' echo API_KEY;'], { encoding: 'utf8' })).toBe(key);
    writeFileSync(path, getPhpUploadScript('docs-key', 'docs'));
    execFileSync('php', ['-l', path]);
    expect(readFileSync(path, 'utf8')).toContain("define('DOCS_DIR'");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
