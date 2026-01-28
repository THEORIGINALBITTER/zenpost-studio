/**
 * Publishing Service - Manages posts, schedules, and persistence
 * @author Denis Bitter <contact@denisbitter.de>
 */

import { writeTextFile, readTextFile, mkdir, exists, readDir } from '@tauri-apps/plugin-fs';
import type { ScheduledPost, SocialPlatform } from '../types/scheduling';

export interface PlatformPost {
  platform: SocialPlatform;
  title: string;
  content: string;
  characterCount: number;
  wordCount: number;
}

export interface ScheduleData {
  date: string;
  time: string;
}

export interface PublishingProject {
  posts: ScheduledPost[];
  projectPath: string;
  lastUpdated: string;
}

type SerializedScheduledPost = Omit<ScheduledPost, 'scheduledDate' | 'createdAt'> & {
  scheduledDate?: string | Date;
  createdAt: string | Date;
};

const PUBLISHING_DIR = '.zenpost/publishing';
const POSTS_DIR = `${PUBLISHING_DIR}/posts`;
const ARCHIVE_DIR = `${PUBLISHING_DIR}/archive`;
const ARTICLES_DIR = `${PUBLISHING_DIR}/articles`;
const SCHEDULE_FILE = `${PUBLISHING_DIR}/schedule.json`;
const ARTICLES_INDEX_FILE = `${PUBLISHING_DIR}/articles.json`;

export type PlatformScheduleState = Partial<Record<SocialPlatform, ScheduleData>>;

export interface ZenArticle {
  id: string;
  title: string;
  subtitle?: string;
  publishDate?: string;
  coverImageUrl?: string;
  content: string;
  fileName: string;
  createdAt: string;
  updatedAt: string;
}

export type ArticleInput = {
  id?: string;
  title: string;
  subtitle?: string;
  publishDate?: string;
  coverImageUrl?: string;
  content: string;
};

/**
 * Ensure .zenpost/publishing directory structure exists
 */
async function ensurePublishingStructure(projectPath: string): Promise<void> {
  const dirs = [PUBLISHING_DIR, POSTS_DIR, ARCHIVE_DIR, ARTICLES_DIR];

  for (const dir of dirs) {
    const fullPath = `${projectPath}/${dir}`;
    const dirExists = await exists(fullPath);

    if (!dirExists) {
      await mkdir(fullPath, { recursive: true });
      console.log(`[PublishingService] Created directory: ${fullPath}`);
    }
  }
}

/**
 * Public helper to ensure publishing workspace is ready
 */
export async function initializePublishingProject(projectPath: string): Promise<void> {
  await ensurePublishingStructure(projectPath);
}

/**
 * Resolve absolute publishing paths for a project
 */
export function getPublishingPaths(projectPath: string): {
  root: string;
  posts: string;
  archive: string;
  scheduleFile: string;
} {
  return {
    root: `${projectPath}/${PUBLISHING_DIR}`,
    posts: `${projectPath}/${POSTS_DIR}`,
    archive: `${projectPath}/${ARCHIVE_DIR}`,
    scheduleFile: `${projectPath}/${SCHEDULE_FILE}`,
  };
}

/**
 * Generate unique ID for posts
 */
function generatePostId(): string {
  return `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateArticleId(): string {
  return `article_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Normalize serialized posts back into runtime objects
 */
function normalizeScheduledPost(post: SerializedScheduledPost): ScheduledPost {
  return {
    ...post,
    scheduledDate: post.scheduledDate ? new Date(post.scheduledDate) : undefined,
    createdAt: post.createdAt ? new Date(post.createdAt) : new Date(),
  };
}

/**
 * Load schedule from .zenpost/publishing/schedule.json
 */
export async function loadSchedule(projectPath: string): Promise<PublishingProject> {
  try {
    const scheduleFilePath = `${projectPath}/${SCHEDULE_FILE}`;
    const fileExists = await exists(scheduleFilePath);

    if (!fileExists) {
      console.log('[PublishingService] No schedule file found, returning empty project');
      return {
        posts: [],
        projectPath,
        lastUpdated: new Date().toISOString(),
      };
    }

    const content = await readTextFile(scheduleFilePath);
    const rawData = JSON.parse(content) as PublishingProject & {
      posts?: SerializedScheduledPost[];
    };
    const normalizedPosts = (rawData.posts || []).map(post =>
      normalizeScheduledPost(post as SerializedScheduledPost)
    );

    const project: PublishingProject = {
      posts: normalizedPosts,
      projectPath: rawData.projectPath || projectPath,
      lastUpdated: rawData.lastUpdated || new Date().toISOString(),
    };

    console.log(`[PublishingService] Loaded ${project.posts.length} posts from schedule`);
    return project;
  } catch (error) {
    console.error('[PublishingService] Error loading schedule:', error);
    return {
      posts: [],
      projectPath,
      lastUpdated: new Date().toISOString(),
    };
  }
}

/**
 * Save schedule to .zenpost/publishing/schedule.json
 */
export async function saveSchedule(projectPath: string, posts: ScheduledPost[]): Promise<void> {
  try {
    await ensurePublishingStructure(projectPath);

    const data: PublishingProject = {
      posts,
      projectPath,
      lastUpdated: new Date().toISOString(),
    };

    const scheduleFilePath = `${projectPath}/${SCHEDULE_FILE}`;
    await writeTextFile(scheduleFilePath, JSON.stringify(data, null, 2));

    console.log(`[PublishingService] Saved ${posts.length} posts to schedule`);
  } catch (error) {
    console.error('[PublishingService] Error saving schedule:', error);
    throw error;
  }
}

/**
 * Save a single post as markdown file
 */
async function savePostFile(
  projectPath: string,
  post: ScheduledPost,
  archived: boolean = false
): Promise<string> {
  const dir = archived ? ARCHIVE_DIR : POSTS_DIR;
  const fileName = `${post.platform}-${post.id}.md`;
  const filePath = `${projectPath}/${dir}/${fileName}`;

  // Create markdown content with frontmatter
  const frontmatter = `---
id: ${post.id}
platform: ${post.platform}
title: ${post.title}
scheduledDate: ${post.scheduledDate || ''}
scheduledTime: ${post.scheduledTime || ''}
status: ${post.status}
characterCount: ${post.characterCount}
wordCount: ${post.wordCount}
createdAt: ${post.createdAt}
---

`;

  const markdownContent = frontmatter + post.content;

  await writeTextFile(filePath, markdownContent);
  console.log(`[PublishingService] Saved post file: ${filePath}`);

  return filePath;
}

/**
 * Article helpers
 */
async function readArticlesIndex(projectPath: string): Promise<ZenArticle[]> {
  try {
    const filePath = `${projectPath}/${ARTICLES_INDEX_FILE}`;
    const hasIndex = await exists(filePath);
    if (!hasIndex) {
      return [];
    }
    const content = await readTextFile(filePath);
    return JSON.parse(content) as ZenArticle[];
  } catch (error) {
    console.error('[PublishingService] Failed to read articles index:', error);
    return [];
  }
}

async function saveArticlesIndex(projectPath: string, articles: ZenArticle[]): Promise<void> {
  const filePath = `${projectPath}/${ARTICLES_INDEX_FILE}`;
  await writeTextFile(filePath, JSON.stringify(articles, null, 2));
}

function articleFilePath(projectPath: string, fileName: string): string {
  return `${projectPath}/${ARTICLES_DIR}/${fileName}`;
}

function stripFrontmatter(markdown: string): string {
  if (markdown.startsWith('---')) {
    const endIndex = markdown.indexOf('---', 3);
    if (endIndex !== -1) {
      return markdown.substring(endIndex + 3).trimStart();
    }
  }
  return markdown;
}

/**
 * Recursively scan directory for .md files
 */
async function scanMarkdownFiles(dirPath: string, basePath: string): Promise<string[]> {
  const mdFiles: string[] = [];

  try {
    console.log(`[PublishingService] Scanning directory: ${dirPath}`);
    const entries = await readDir(dirPath);
    console.log(`[PublishingService] Found ${entries.length} entries in ${dirPath}`);

    for (const entry of entries) {
      const fullPath = `${dirPath}/${entry.name}`;

      // Skip .zenpost directory, node_modules, .git, etc.
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') {
        console.log(`[PublishingService] Skipping: ${entry.name}`);
        continue;
      }

      if (entry.isDirectory) {
        console.log(`[PublishingService] Entering subdirectory: ${entry.name}`);
        // Recursively scan subdirectories
        const subFiles = await scanMarkdownFiles(fullPath, basePath);
        mdFiles.push(...subFiles);
      } else if (entry.isFile && entry.name.endsWith('.md')) {
        console.log(`[PublishingService] Found .md file: ${entry.name}`);
        mdFiles.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`[PublishingService] Error scanning directory ${dirPath}:`, error);
    console.error(`[PublishingService] Error details:`, JSON.stringify(error, null, 2));
  }

  return mdFiles;
}

/**
 * Parse frontmatter from markdown file
 */
function parseFrontmatter(content: string): { frontmatter: Record<string, string>; body: string } {
  if (!content.startsWith('---')) {
    return { frontmatter: {}, body: content };
  }

  const endIndex = content.indexOf('---', 3);
  if (endIndex === -1) {
    return { frontmatter: {}, body: content };
  }

  const frontmatterText = content.substring(3, endIndex).trim();
  const body = content.substring(endIndex + 3).trim();

  const frontmatter: Record<string, string> = {};
  const lines = frontmatterText.split('\n');

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex !== -1) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      frontmatter[key] = value;
    }
  }

  return { frontmatter, body };
}

/**
 * Scan project directory and rebuild articles.json from all .md files
 * This is called on first project open or when user clicks "Refresh"
 */
async function scanAndRebuildArticlesIndex(projectPath: string): Promise<ZenArticle[]> {
  try {
    console.log('[PublishingService] Scanning project for .md files...');
    const mdFiles = await scanMarkdownFiles(projectPath, projectPath);
    console.log(`[PublishingService] Found ${mdFiles.length} .md files`);

    const articles: ZenArticle[] = [];

    for (const filePath of mdFiles) {
      try {
        const content = await readTextFile(filePath);
        const { frontmatter } = parseFrontmatter(content);

        // Extract filename relative to project
        const relativePath = filePath.replace(projectPath + '/', '');

        // Only include files with title in frontmatter OR use filename as title
        const title = frontmatter.title || relativePath.replace('.md', '').split('/').pop() || 'Untitled';

        const article: ZenArticle = {
          id: frontmatter.id || `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title,
          subtitle: frontmatter.subtitle,
          publishDate: frontmatter.publishDate,
          coverImageUrl: frontmatter.coverImageUrl,
          content: '', // Don't load full content in list view
          fileName: relativePath,
          createdAt: frontmatter.createdAt || new Date().toISOString(),
          updatedAt: frontmatter.updatedAt || new Date().toISOString(),
        };

        articles.push(article);
      } catch (error) {
        console.error(`[PublishingService] Error reading file ${filePath}:`, error);
      }
    }

    // Sort by updatedAt (most recent first)
    articles.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    // Save to articles.json for future fast loading
    await saveArticlesIndex(projectPath, articles);

    console.log(`[PublishingService] Scanned and saved ${articles.length} articles to index`);
    return articles;
  } catch (error) {
    console.error('[PublishingService] Error scanning articles:', error);
    return [];
  }
}

/**
 * Load list of articles from articles.json (fast) or scan project (first time)
 * - If articles.json exists: read from it (fast loading)
 * - If articles.json doesn't exist: scan entire project and create it
 */
export async function loadArticles(projectPath: string, forceRescan = false): Promise<ZenArticle[]> {
  console.log('[PublishingService] ===== loadArticles called =====');
  console.log('[PublishingService] projectPath:', projectPath);
  console.log('[PublishingService] forceRescan:', forceRescan);

  try {
    await ensurePublishingStructure(projectPath);
    console.log('[PublishingService] Publishing structure ensured');

    const indexPath = `${projectPath}/${ARTICLES_INDEX_FILE}`;
    console.log('[PublishingService] Checking index path:', indexPath);

    const indexExists = await exists(indexPath);
    console.log('[PublishingService] Index exists:', indexExists);

    // If user forces rescan (refresh button) or index doesn't exist yet
    if (forceRescan || !indexExists) {
      console.log('[PublishingService] Building articles index from project scan...');
      const result = await scanAndRebuildArticlesIndex(projectPath);
      console.log('[PublishingService] Scan completed, returning', result.length, 'articles');
      return result;
    }

    // Fast path: Read from existing articles.json
    console.log('[PublishingService] Loading articles from index file...');
    const articles = await readArticlesIndex(projectPath);
    console.log(`[PublishingService] Loaded ${articles.length} articles from index`);
    return articles;
  } catch (error) {
    console.error('[PublishingService] ===== ERROR in loadArticles =====');
    console.error('[PublishingService] Error loading articles:', error);
    console.error('[PublishingService] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return [];
  }
}

/**
 * Load single article with content
 */
export async function loadArticle(projectPath: string, articleId: string): Promise<ZenArticle | null> {
  await ensurePublishingStructure(projectPath);
  const articles = await readArticlesIndex(projectPath);
  const article = articles.find(a => a.id === articleId);
  if (!article) {
    return null;
  }
  try {
    const fileContent = await readTextFile(articleFilePath(projectPath, article.fileName));
    return {
      ...article,
      content: stripFrontmatter(fileContent),
    };
  } catch (error) {
    console.error('[PublishingService] Failed to load article content:', error);
    return null;
  }
}

/**
 * Save article (create/update)
 */
export async function saveArticle(projectPath: string, articleInput: ArticleInput): Promise<ZenArticle> {
  await ensurePublishingStructure(projectPath);
  const articles = await readArticlesIndex(projectPath);
  const now = new Date().toISOString();
  let existingIndex = -1;
  if (articleInput.id) {
    existingIndex = articles.findIndex(a => a.id === articleInput.id);
  }

  const articleId = articleInput.id || generateArticleId();
  const fileName = existingIndex !== -1 ? articles[existingIndex].fileName : `${articleId}.md`;

  const article: ZenArticle = {
    id: articleId,
    title: articleInput.title,
    subtitle: articleInput.subtitle,
    publishDate: articleInput.publishDate,
    coverImageUrl: articleInput.coverImageUrl,
    content: articleInput.content,
    fileName,
    createdAt: existingIndex !== -1 ? articles[existingIndex].createdAt : now,
    updatedAt: now,
  };

  const frontmatter = `---
id: ${article.id}
title: ${article.title}
subtitle: ${article.subtitle || ''}
publishDate: ${article.publishDate || ''}
coverImageUrl: ${article.coverImageUrl || ''}
createdAt: ${article.createdAt}
updatedAt: ${article.updatedAt}
---

`;

  await writeTextFile(articleFilePath(projectPath, fileName), frontmatter + article.content);

  if (existingIndex !== -1) {
    articles[existingIndex] = { ...article, content: '' };
  } else {
    articles.push({ ...article, content: '' });
  }

  await saveArticlesIndex(projectPath, articles.map(a => ({ ...a, content: '' })));

  return article;
}

/**
 * Delete article
 */
export async function deleteArticle(projectPath: string, articleId: string): Promise<void> {
  await ensurePublishingStructure(projectPath);
  const articles = await readArticlesIndex(projectPath);
  const updated = articles.filter(a => a.id !== articleId);
  await saveArticlesIndex(projectPath, updated);
}

/**
 * Auto-save posts and schedule (called when user sets schedule in DocStudio)
 */
export async function autoSavePostsAndSchedule(
  projectPath: string,
  platformPosts: PlatformPost[],
  schedules: PlatformScheduleState
): Promise<{ scheduledPosts: ScheduledPost[]; savedFilePaths: string[] }> {
  try {
    await ensurePublishingStructure(projectPath);

    const scheduledPosts: ScheduledPost[] = [];
    const savedFilePaths: string[] = [];

    // Convert platform posts to scheduled posts and save files
    for (const platformPost of platformPosts) {
      const schedule = schedules[platformPost.platform] || { date: '', time: '' };
      const postId = generatePostId();

      const scheduledPost: ScheduledPost = {
        id: postId,
        platform: platformPost.platform,
        title: platformPost.title,
        content: platformPost.content,
        scheduledDate: schedule.date ? new Date(schedule.date) : undefined,
        scheduledTime: schedule.time || undefined,
        status: schedule.date && schedule.time ? 'scheduled' : 'draft',
        characterCount: platformPost.characterCount,
        wordCount: platformPost.wordCount,
        createdAt: new Date(),
      };

      // Save post as markdown file
      const filePath = await savePostFile(projectPath, scheduledPost);
      savedFilePaths.push(filePath);

      scheduledPosts.push(scheduledPost);
    }

    // Save schedule metadata
    await saveSchedule(projectPath, scheduledPosts);

    console.log(`[PublishingService] Auto-saved ${scheduledPosts.length} posts with schedule`);

    return { scheduledPosts, savedFilePaths };
  } catch (error) {
    console.error('[PublishingService] Error in autoSavePostsAndSchedule:', error);
    throw error;
  }
}

/**
 * Save scheduled posts and write each post file
 */
export async function saveScheduledPostsWithFiles(
  projectPath: string,
  posts: ScheduledPost[],
): Promise<void> {
  try {
    await ensurePublishingStructure(projectPath);
    for (const post of posts) {
      await savePostFile(projectPath, post);
    }
    await saveSchedule(projectPath, posts);
  } catch (error) {
    console.error('[PublishingService] Error saving scheduled posts:', error);
    throw error;
  }
}

/**
 * Update a single post's content
 */
export async function updatePost(
  projectPath: string,
  postId: string,
  updates: Partial<ScheduledPost>
): Promise<void> {
  try {
    // Load current schedule
    const project = await loadSchedule(projectPath);

    // Find and update the post
    const postIndex = project.posts.findIndex(p => p.id === postId);
    if (postIndex === -1) {
      throw new Error(`Post with id ${postId} not found`);
    }

    const updatedPost = {
      ...project.posts[postIndex],
      ...updates,
    };

    project.posts[postIndex] = updatedPost;

    // Save updated post file
    await savePostFile(projectPath, updatedPost);

    // Save updated schedule
    await saveSchedule(projectPath, project.posts);

    console.log(`[PublishingService] Updated post: ${postId}`);
  } catch (error) {
    console.error('[PublishingService] Error updating post:', error);
    throw error;
  }
}

/**
 * Delete a post
 */
export async function deletePost(projectPath: string, postId: string): Promise<void> {
  try {
    // Load current schedule
    const project = await loadSchedule(projectPath);

    // Filter out the deleted post
    const updatedPosts = project.posts.filter(p => p.id !== postId);

    // Save updated schedule
    await saveSchedule(projectPath, updatedPosts);

    // Note: We don't delete the file, just remove from schedule
    // Files remain for potential recovery

    console.log(`[PublishingService] Deleted post from schedule: ${postId}`);
  } catch (error) {
    console.error('[PublishingService] Error deleting post:', error);
    throw error;
  }
}

/**
 * Archive a post (mark as published)
 */
export async function archivePost(projectPath: string, postId: string): Promise<void> {
  try {
    // Load current schedule
    const project = await loadSchedule(projectPath);

    // Find the post
    const post = project.posts.find(p => p.id === postId);
    if (!post) {
      throw new Error(`Post with id ${postId} not found`);
    }

    // Update status to published
    const archivedPost = {
      ...post,
      status: 'published' as const,
    };

    // Save to archive directory
    await savePostFile(projectPath, archivedPost, true);

    // Remove from active posts
    const updatedPosts = project.posts.filter(p => p.id !== postId);
    await saveSchedule(projectPath, updatedPosts);

    console.log(`[PublishingService] Archived post: ${postId}`);
  } catch (error) {
    console.error('[PublishingService] Error archiving post:', error);
    throw error;
  }
}

/**
 * Get statistics about posts
 */
export async function getPublishingStats(projectPath: string): Promise<{
  total: number;
  scheduled: number;
  drafts: number;
  published: number;
}> {
  try {
    const project = await loadSchedule(projectPath);

    return {
      total: project.posts.length,
      scheduled: project.posts.filter(p => p.status === 'scheduled').length,
      drafts: project.posts.filter(p => p.status === 'draft').length,
      published: 0, // Published posts are in archive, not in schedule
    };
  } catch (error) {
    console.error('[PublishingService] Error getting stats:', error);
    return { total: 0, scheduled: 0, drafts: 0, published: 0 };
  }
}
