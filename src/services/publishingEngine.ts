/**
 * Publishing Engine
 * Polls scheduled posts, detects due posts and publishes them via social media APIs.
 */

import { useEffect, useRef, useState } from 'react';
import type { ScheduledPost, PublishingStatus, SocialPlatform } from '../types/scheduling';
import {
  loadSocialConfig,
  isPlatformConfigured,
  postToLinkedIn,
  postToDevTo,
  postToTwitter,
  postToMedium,
  type PostResult,
  type GitHubConfig,
} from './socialMediaService';

const POLL_INTERVAL_MS = 60_000;

// ─── Due-post detection ──────────────────────────────────────────────────────

export function getDuePosts(posts: ScheduledPost[]): ScheduledPost[] {
  const now = new Date();
  return posts.filter((p) => {
    if (p.status !== 'scheduled') return false;
    if (!p.scheduledDate) return false;

    const d = new Date(p.scheduledDate);
    if (p.scheduledTime) {
      const [h, m] = p.scheduledTime.split(':').map(Number);
      d.setHours(h, m, 0, 0);
    }
    return d <= now;
  });
}

// ─── Per-platform content builder + publish ──────────────────────────────────

async function publishGist(post: ScheduledPost, config: GitHubConfig): Promise<PostResult> {
  try {
    const response = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        Authorization: `token ${config.accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        description: post.title,
        public: true,
        files: {
          [`${post.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`]: {
            content: post.content || '(leer)',
          },
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err as { message?: string }).message ?? 'GitHub Gist fehlgeschlagen');
    }

    const data = await response.json() as { id: string; html_url: string };
    return { success: true, platform: 'github', postId: data.id, url: data.html_url };
  } catch (error) {
    return {
      success: false,
      platform: 'github',
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    };
  }
}

export async function publishScheduledPost(post: ScheduledPost): Promise<PostResult> {
  const config = loadSocialConfig();
  const platform: SocialPlatform = post.platform;
  // PostResult.platform is from socialMediaService — cast to string for unsupported platforms
  type SMPlatform = Parameters<typeof isPlatformConfigured>[0];

  if (!isPlatformConfigured(platform as SMPlatform, config)) {
    return {
      success: false,
      platform: platform as SMPlatform,
      error: `${platformLabel(platform)} ist nicht konfiguriert (Einstellungen → Social Media)`,
    };
  }

  switch (platform) {
    case 'linkedin':
      return postToLinkedIn({ text: post.content.slice(0, 3000) }, config.linkedin!);

    case 'devto':
      return postToDevTo(
        { title: post.title, body_markdown: post.content, published: true },
        config.devto!,
      );

    case 'twitter':
      return postToTwitter({ text: post.content.slice(0, 280) }, config.twitter!);

    case 'medium':
      return postToMedium(
        {
          title: post.title,
          content: post.content,
          contentFormat: 'markdown',
          publishStatus: 'public',
        },
        config.medium!,
      );

    case 'github':
      return publishGist(post, config.github!);

    case 'reddit':
      return {
        success: false,
        platform: 'reddit',
        error: 'Reddit benötigt ein Subreddit — bitte manuell veröffentlichen',
      };

    default:
      return {
        success: false,
        platform: platform as SMPlatform,
        error: `Platform '${platform}' wird nicht unterstützt`,
      };
  }
}

// ─── Helper ──────────────────────────────────────────────────────────────────

export function platformLabel(platform: string): string {
  const labels: Record<string, string> = {
    linkedin: 'LinkedIn',
    devto: 'Dev.to',
    twitter: 'Twitter/X',
    medium: 'Medium',
    github: 'GitHub',
    reddit: 'Reddit',
    hashnode: 'Hashnode',
  };
  return labels[platform] ?? platform;
}

// ─── React hook ──────────────────────────────────────────────────────────────

export interface PublishResult {
  postId: string;
  result: PostResult;
}

export function usePublishingEngine(
  posts: ScheduledPost[],
  onPostsChange: (posts: ScheduledPost[]) => void,
) {
  const [duePosts, setDuePosts] = useState<ScheduledPost[]>(() => getDuePosts(posts));
  const [publishing, setPublishing] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Map<string, PostResult>>(new Map());

  const postsRef = useRef(posts);
  const onChangeRef = useRef(onPostsChange);
  useEffect(() => { postsRef.current = posts; }, [posts]);
  useEffect(() => { onChangeRef.current = onPostsChange; }, [onPostsChange]);

  // Recalc when posts change
  useEffect(() => {
    setDuePosts(getDuePosts(posts));
  }, [posts]);

  // Periodic poll
  useEffect(() => {
    const id = setInterval(() => {
      setDuePosts(getDuePosts(postsRef.current));
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const publish = async (post: ScheduledPost) => {
    setPublishing((prev) => new Set(prev).add(post.id));
    try {
      const result = await publishScheduledPost(post);
      setResults((prev) => new Map(prev).set(post.id, result));

      if (result.success) {
        const updated = postsRef.current.map((p) =>
          p.id === post.id ? { ...p, status: 'published' as PublishingStatus } : p,
        );
        onChangeRef.current(updated);
      }
    } finally {
      setPublishing((prev) => {
        const next = new Set(prev);
        next.delete(post.id);
        return next;
      });
    }
  };

  const skip = (postId: string) => {
    // Mark as draft so it leaves the due list without being published
    const updated = postsRef.current.map((p) =>
      p.id === postId ? { ...p, status: 'draft' as PublishingStatus } : p,
    );
    onChangeRef.current(updated);
    setResults((prev) => {
      const next = new Map(prev);
      next.delete(postId);
      return next;
    });
  };

  return { duePosts, publishing, results, publish, skip };
}
