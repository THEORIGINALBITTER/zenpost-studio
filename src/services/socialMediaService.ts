/**
 * Social Media API Service
 * Handles API integrations for Twitter, Reddit, LinkedIn, and other platforms
 */
import { isTauri } from '@tauri-apps/api/core';

/**
 * Native HTTP fetch — uses Tauri's HTTP plugin in Tauri context (bypasses CORS),
 * falls back to standard fetch in browser/web mode.
 */
async function httpFetch(url: string, init?: RequestInit): Promise<Response> {
  if (isTauri()) {
    const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
    return tauriFetch(url, init) as unknown as Response;
  }
  return fetch(url, init);
}

// ============================================================================
// Types & Interfaces
// ============================================================================

export type SocialPlatform = 'twitter' | 'reddit' | 'linkedin' | 'devto' | 'medium' | 'github';

export interface SocialMediaConfig {
  twitter?: TwitterConfig;
  reddit?: RedditConfig;
  linkedin?: LinkedInConfig;
  devto?: DevToConfig;
  medium?: MediumConfig;
  github?: GitHubConfig;
}

export interface TwitterConfig {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
  bearerToken?: string;
}

export interface RedditConfig {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  userAgent: string;
}

export interface LinkedInConfig {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  personId?: string;   // optional: LinkedIn Person ID (from profile URL or /v2/me), skips profile API call
  refreshToken?: string;
}

export interface DevToConfig {
  apiKey: string;
}

export interface MediumConfig {
  integrationToken: string;
}

export interface GitHubConfig {
  accessToken: string;
  username: string;
  /** Docs repository name (e.g. "my-docs") */
  docsRepo?: string;
  /** Branch to push to (default: main) */
  docsBranch?: string;
  /** Target folder in repo (e.g. "docs/") */
  docsPath?: string;
}

export interface PostResult {
  success: boolean;
  platform: SocialPlatform;
  postId?: string;
  url?: string;
  error?: string;
}

export interface TwitterPostOptions {
  text: string;
  thread?: string[];
  mediaIds?: string[];
}

export interface RedditPostOptions {
  subreddit: string;
  title: string;
  text: string;
  flair?: string;
}

export interface LinkedInPostOptions {
  text: string;
  visibility?: 'PUBLIC' | 'CONNECTIONS' | 'LOGGED_IN';
  /** Binary file (from local file picker) */
  coverImageFile?: File;
  /** Public URL — fetched to binary and uploaded automatically */
  coverImageUrl?: string;
}

export interface DevToPostOptions {
  title: string;
  body_markdown: string;
  published: boolean;
  tags?: string[];
  series?: string;
  canonical_url?: string;
}

export interface MediumPostOptions {
  title: string;
  content: string;
  contentFormat: 'html' | 'markdown';
  tags?: string[];
  publishStatus: 'public' | 'draft' | 'unlisted';
}

export interface GitHubDiscussionOptions {
  owner: string;
  repo: string;
  title: string;
  body: string;
  categoryId: string;
}

// ============================================================================
// Config Storage
// ============================================================================

const STORAGE_KEY = 'zenpost_social_config';

export function loadSocialConfig(): SocialMediaConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load social media config:', error);
  }
  return {}; // Return empty config if nothing stored - makes it optional
}

export function hasSocialConfig(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;
    const config = JSON.parse(stored);
    return Object.keys(config).length > 0;
  } catch {
    return false;
  }
}

export function saveSocialConfig(config: SocialMediaConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Failed to save social media config:', error);
    throw new Error('Failed to save configuration');
  }
}

export function clearSocialConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ============================================================================
// Twitter API Integration
// ============================================================================

export async function postToTwitter(
  content: TwitterPostOptions,
  config: TwitterConfig
): Promise<PostResult> {
  try {
    // Twitter API v2 - Create Tweet
    const response = await httpFetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.bearerToken}`,
      },
      body: JSON.stringify({
        text: content.text,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to post to Twitter');
    }

    const data = await response.json();

    // If it's a thread, post additional tweets
    if (content.thread && content.thread.length > 0) {
      let previousTweetId = data.data.id;

      for (const threadText of content.thread) {
        const threadResponse = await httpFetch('https://api.twitter.com/2/tweets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.bearerToken}`,
          },
          body: JSON.stringify({
            text: threadText,
            reply: {
              in_reply_to_tweet_id: previousTweetId,
            },
          }),
        });

        if (threadResponse.ok) {
          const threadData = await threadResponse.json();
          previousTweetId = threadData.data.id;
        }
      }
    }

    return {
      success: true,
      platform: 'twitter',
      postId: data.data.id,
      url: `https://twitter.com/i/web/status/${data.data.id}`,
    };
  } catch (error) {
    return {
      success: false,
      platform: 'twitter',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Reddit API Integration
// ============================================================================

async function getRedditAccessToken(config: RedditConfig): Promise<string> {
  const auth = btoa(`${config.clientId}:${config.clientSecret}`);

  const response = await httpFetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': config.userAgent,
    },
    body: new URLSearchParams({
      grant_type: 'password',
      username: config.username,
      password: config.password,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to get Reddit access token');
  }

  const data = await response.json();
  return data.access_token;
}

export async function postToReddit(
  content: RedditPostOptions,
  config: RedditConfig
): Promise<PostResult> {
  try {
    const accessToken = await getRedditAccessToken(config);

    const response = await httpFetch('https://oauth.reddit.com/api/submit', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': config.userAgent,
      },
      body: new URLSearchParams({
        sr: content.subreddit,
        kind: 'self',
        title: content.title,
        text: content.text,
        api_type: 'json',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to post to Reddit');
    }

    const data = await response.json();

    if (data.json.errors && data.json.errors.length > 0) {
      throw new Error(data.json.errors[0][1]);
    }

    const postUrl = data.json.data.url;

    return {
      success: true,
      platform: 'reddit',
      url: postUrl,
    };
  } catch (error) {
    return {
      success: false,
      platform: 'reddit',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// LinkedIn API Integration
// ============================================================================

/** Resolves the LinkedIn person URN for the authenticated user.
 *  Strategy:
 *  1. Use config.personId if already stored (no API call needed)
 *  2. Try /v2/userinfo  (requires openid scope)
 *  3. Try /v2/me        (requires r_liteprofile scope)
 *  4. Throw a clear error explaining which scope is missing
 */
// Posts API (/rest/posts) requires urn:li:person:{numericId}
// The numeric ID comes from /v2/me (r_liteprofile scope) or config.personId
async function getLinkedInPersonUrn(accessToken: string, personId?: string): Promise<string> {
  // 1. Manual override (must be numeric for ugcPosts)
  if (personId && personId.trim()) {
    const id = personId.trim();
    return /^\d+$/.test(id) ? `urn:li:member:${id}` : `urn:li:person:${id}`;
  }

  // 2. /v2/me → numeric id (r_liteprofile scope)
  const meRes = await httpFetch('https://api.linkedin.com/v2/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (meRes.ok) {
    const data = await meRes.json();
    if (data.id) return `urn:li:member:${data.id}`;
  }

  // 3. /v2/userinfo → OIDC sub (openid scope) — use urn:li:person: format
  const uiRes = await httpFetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (uiRes.ok) {
    const data = await uiRes.json();
    if (data.sub) return `urn:li:person:${data.sub}`;
  }

  throw new Error(
    'LinkedIn Member-ID nicht gefunden. Bitte im LinkedIn-Wizard "Auto-Detect" erneut ausführen.'
  );
}

/**
 * Upload an image to LinkedIn and return the image URN.
 * Uses Community Management API (initializeUpload → binary PUT).
 */
export async function uploadLinkedInImage(
  imageFile: File,
  personUrn: string,
  accessToken: string,
): Promise<string> {
  const initRes = await httpFetch(
    'https://api.linkedin.com/rest/images?action=initializeUpload',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'LinkedIn-Version': '202603',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({ initializeUploadRequest: { owner: personUrn } }),
    },
  );
  if (!initRes.ok) {
    const t = await initRes.text();
    throw new Error(`LinkedIn Bild-Init fehlgeschlagen: ${t}`);
  }
  const initData = await initRes.json();
  const uploadUrl: string = initData.value?.uploadUrl;
  const imageUrn: string = initData.value?.image;
  if (!uploadUrl || !imageUrn) throw new Error('Kein Upload-URL von LinkedIn erhalten');

  const arrayBuffer = await imageFile.arrayBuffer();
  const uploadRes = await httpFetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': imageFile.type || 'image/jpeg' },
    body: arrayBuffer as unknown as BodyInit,
  });
  // LinkedIn returns 201 on success, some S3 endpoints return 200
  if (!uploadRes.ok && uploadRes.status !== 201) {
    throw new Error(`LinkedIn Bild-Upload fehlgeschlagen: HTTP ${uploadRes.status}`);
  }
  return imageUrn;
}

export async function postToLinkedIn(
  content: LinkedInPostOptions,
  config: LinkedInConfig
): Promise<PostResult> {
  try {
    const personId = config.personId?.trim() || '';

    // ── Strategy 1: Community Management API (/rest/posts) ──────────────────
    // Required for apps created after 2024. Author must be urn:li:person:{OIDC sub}.
    // OIDC sub is alphanumeric (e.g. QCAQCRxWqV) — set by wizard auto-detect.
    if (personId && !/^\d+$/.test(personId)) {
      const personUrn = `urn:li:person:${personId}`;

      // Upload cover image if provided (fail gracefully — post without image on error)
      let imageUrn: string | null = null;
      const imageSource = content.coverImageFile ?? content.coverImageUrl;
      if (imageSource) {
        try {
          let fileToUpload: File;
          if (imageSource instanceof File) {
            fileToUpload = imageSource;
          } else {
            // coverImageUrl: fetch binary → wrap in File
            const res = await fetch(imageSource);
            const blob = await res.blob();
            const ext = blob.type.split('/')[1] || 'jpg';
            fileToUpload = new File([blob], `cover.${ext}`, { type: blob.type });
          }
          imageUrn = await uploadLinkedInImage(fileToUpload, personUrn, config.accessToken);
        } catch (imgErr) {
          console.warn('LinkedIn image upload failed, posting without image:', imgErr);
        }
      }

      const restPostData: Record<string, unknown> = {
        author: personUrn,
        commentary: content.text,
        visibility: content.visibility || 'PUBLIC',
        distribution: {
          feedDistribution: 'MAIN_FEED',
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        lifecycleState: 'PUBLISHED',
        isReshareDisabledByAuthor: false,
      };
      if (imageUrn) {
        restPostData.content = { media: { id: imageUrn } };
      }

      const restResponse = await httpFetch('https://api.linkedin.com/rest/posts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
          'LinkedIn-Version': '202603',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify(restPostData),
      });

      if (restResponse.ok) {
        // 201 Created — post ID comes from the x-restli-id header, body is empty
        const postUrn =
          restResponse.headers.get('x-restli-id') ||
          restResponse.headers.get('location') ||
          '';
        return {
          success: true,
          platform: 'linkedin',
          postId: postUrn,
          url: postUrn
            ? `https://www.linkedin.com/feed/update/${encodeURIComponent(postUrn)}`
            : 'https://www.linkedin.com/feed/',
        };
      }

      // 403 = Community Management API not yet approved → fall through to ugcPosts
      if (restResponse.status !== 403) {
        const errorText = await restResponse.text();
        let apiMsg = '';
        try { apiMsg = JSON.parse(errorText).message || ''; } catch {}
        throw new Error(apiMsg || `HTTP ${restResponse.status}`);
      }
    }

    // ── Strategy 2: ugcPosts (deprecated for apps created after 2024) ────────
    // Author must be urn:li:member:{numericId} from /v2/me (r_liteprofile scope).
    const personUrn = await getLinkedInPersonUrn(config.accessToken, config.personId);
    const postData = {
      author: personUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: content.text },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': content.visibility || 'PUBLIC',
      },
    };

    const response = await httpFetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(postData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let apiMsg = '';
      try { apiMsg = JSON.parse(errorText).message || ''; } catch {}
      // ugcPosts is deprecated for apps created after ~2024; new apps need Community Management API
      if (apiMsg.toLowerCase().includes('data processing') || (response.status === 422 && !apiMsg.toLowerCase().includes('duplicate'))) {
        throw new Error(
          'LinkedIn Community Management API nicht freigeschaltet.\n' +
          'Lösung: LinkedIn Developer Portal → Settings → App verifizieren → ' +
          'Products → "Community Management API" → Request access.\n' +
          'Nach Freischaltung (1–3 Tage) funktioniert das Posting automatisch.'
        );
      }
      throw new Error(apiMsg || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const postId = data.id || '';

    return {
      success: true,
      platform: 'linkedin',
      postId,
      url: postId ? `https://www.linkedin.com/feed/update/${postId}` : 'https://www.linkedin.com/feed/',
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    // LinkedIn returns a duplicate error when the exact same content was already posted.
    // The error contains the existing post's URN — treat this as success.
    const duplicateMatch = msg.match(/duplicate of (urn:li:[a-zA-Z]+:\d+)/i);
    if (duplicateMatch) {
      const urn = duplicateMatch[1];
      return {
        success: true,
        platform: 'linkedin',
        postId: urn,
        url: `https://www.linkedin.com/feed/update/${encodeURIComponent(urn)}`,
      };
    }
    return {
      success: false,
      platform: 'linkedin',
      error: msg,
    };
  }
}

// ============================================================================
// dev.to API Integration
// ============================================================================

export async function postToDevTo(
  content: DevToPostOptions,
  config: DevToConfig
): Promise<PostResult> {
  try {
    const response = await httpFetch('https://dev.to/api/articles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': config.apiKey,
      },
      body: JSON.stringify({
        article: content,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to post to dev.to');
    }

    const data = await response.json();

    return {
      success: true,
      platform: 'devto',
      postId: data.id.toString(),
      url: data.url,
    };
  } catch (error) {
    return {
      success: false,
      platform: 'devto',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Medium API Integration
// ============================================================================

async function getMediumUserId(token: string): Promise<string> {
  const response = await httpFetch('https://api.medium.com/v1/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get Medium user ID');
  }

  const data = await response.json();
  return data.data.id;
}

export async function postToMedium(
  content: MediumPostOptions,
  config: MediumConfig
): Promise<PostResult> {
  try {
    const userId = await getMediumUserId(config.integrationToken);

    const response = await httpFetch(`https://api.medium.com/v1/users/${userId}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.integrationToken}`,
      },
      body: JSON.stringify(content),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errors?.[0]?.message || 'Failed to post to Medium');
    }

    const data = await response.json();

    return {
      success: true,
      platform: 'medium',
      postId: data.data.id,
      url: data.data.url,
    };
  } catch (error) {
    return {
      success: false,
      platform: 'medium',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// GitHub Discussions API Integration
// ============================================================================

export async function postToGitHubDiscussions(
  content: GitHubDiscussionOptions,
  config: GitHubConfig
): Promise<PostResult> {
  try {
    // GraphQL mutation to create discussion
    const query = `
      mutation($repositoryId: ID!, $categoryId: ID!, $title: String!, $body: String!) {
        createDiscussion(input: {
          repositoryId: $repositoryId,
          categoryId: $categoryId,
          title: $title,
          body: $body
        }) {
          discussion {
            id
            url
          }
        }
      }
    `;

    // First, get repository ID
    const repoResponse = await httpFetch(
      `https://api.github.com/repos/${content.owner}/${content.repo}`,
      {
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!repoResponse.ok) {
      throw new Error('Failed to get GitHub repository');
    }

    const repoData = await repoResponse.json();
    const repositoryId = repoData.node_id;

    // Create discussion
    const response = await httpFetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {
          repositoryId,
          categoryId: content.categoryId,
          title: content.title,
          body: content.body,
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to post to GitHub Discussions');
    }

    const data = await response.json();

    if (data.errors) {
      throw new Error(data.errors[0].message);
    }

    const discussion = data.data.createDiscussion.discussion;

    return {
      success: true,
      platform: 'github',
      postId: discussion.id,
      url: discussion.url,
    };
  } catch (error) {
    return {
      success: false,
      platform: 'github',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Unified Post Function
// ============================================================================

export async function postToSocialMedia(
  platform: SocialPlatform,
  content: any,
  config: SocialMediaConfig
): Promise<PostResult> {
  switch (platform) {
    case 'twitter':
      if (!config.twitter) {
        return {
          success: false,
          platform,
          error: 'Twitter configuration not found',
        };
      }
      return postToTwitter(content, config.twitter);

    case 'reddit':
      if (!config.reddit) {
        return {
          success: false,
          platform,
          error: 'Reddit configuration not found',
        };
      }
      return postToReddit(content, config.reddit);

    case 'linkedin':
      if (!config.linkedin) {
        return {
          success: false,
          platform,
          error: 'LinkedIn configuration not found',
        };
      }
      return postToLinkedIn(content, config.linkedin);

    case 'devto':
      if (!config.devto) {
        return {
          success: false,
          platform,
          error: 'dev.to configuration not found',
        };
      }
      return postToDevTo(content, config.devto);

    case 'medium':
      if (!config.medium) {
        return {
          success: false,
          platform,
          error: 'Medium configuration not found',
        };
      }
      return postToMedium(content, config.medium);

    case 'github':
      if (!config.github) {
        return {
          success: false,
          platform,
          error: 'GitHub configuration not found',
        };
      }
      return postToGitHubDiscussions(content, config.github);

    default:
      return {
        success: false,
        platform,
        error: 'Platform not supported',
      };
  }
}

// ============================================================================
// Validation Functions
// ============================================================================

export function validateTwitterConfig(config?: TwitterConfig): boolean {
  if (!config) return false;
  return !!(
    config.apiKey &&
    config.apiSecret &&
    config.accessToken &&
    config.accessTokenSecret
  );
}

export function validateRedditConfig(config?: RedditConfig): boolean {
  if (!config) return false;
  return !!(
    config.clientId &&
    config.clientSecret &&
    config.username &&
    config.password &&
    config.userAgent
  );
}

export function validateLinkedInConfig(config?: LinkedInConfig): boolean {
  if (!config) return false;
  return !!(config.clientId && config.clientSecret && config.accessToken);
}

export function validateDevToConfig(config?: DevToConfig): boolean {
  if (!config) return false;
  return !!config.apiKey;
}

export function validateMediumConfig(config?: MediumConfig): boolean {
  if (!config) return false;
  return !!config.integrationToken;
}

export function validateGitHubConfig(config?: GitHubConfig): boolean {
  if (!config) return false;
  return !!(config.accessToken && config.username);
}

export function isPlatformConfigured(
  platform: SocialPlatform,
  config: SocialMediaConfig
): boolean {
  switch (platform) {
    case 'twitter':
      return validateTwitterConfig(config.twitter);
    case 'reddit':
      return validateRedditConfig(config.reddit);
    case 'linkedin':
      return validateLinkedInConfig(config.linkedin);
    case 'devto':
      return validateDevToConfig(config.devto);
    case 'medium':
      return validateMediumConfig(config.medium);
    case 'github':
      return validateGitHubConfig(config.github);
    default:
      return false;
  }
}
