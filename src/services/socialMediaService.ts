/**
 * Social Media API Service
 * Handles API integrations for Twitter, Reddit, LinkedIn, and other platforms
 */

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
    const response = await fetch('https://api.twitter.com/2/tweets', {
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
        const threadResponse = await fetch('https://api.twitter.com/2/tweets', {
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

  const response = await fetch('https://www.reddit.com/api/v1/access_token', {
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

    const response = await fetch('https://oauth.reddit.com/api/submit', {
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

export async function postToLinkedIn(
  content: LinkedInPostOptions,
  config: LinkedInConfig
): Promise<PostResult> {
  try {
    // First, get the user's profile URN
    const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
      },
    });

    if (!profileResponse.ok) {
      throw new Error('Failed to get LinkedIn profile');
    }

    const profile = await profileResponse.json();
    const personUrn = `urn:li:person:${profile.sub}`;

    // Create post
    const postData = {
      author: personUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: content.text,
          },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': content.visibility || 'PUBLIC',
      },
    };

    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(postData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to post to LinkedIn');
    }

    const data = await response.json();
    const postId = data.id;

    return {
      success: true,
      platform: 'linkedin',
      postId: postId,
      url: `https://www.linkedin.com/feed/update/${postId}`,
    };
  } catch (error) {
    return {
      success: false,
      platform: 'linkedin',
      error: error instanceof Error ? error.message : 'Unknown error',
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
    const response = await fetch('https://dev.to/api/articles', {
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
  const response = await fetch('https://api.medium.com/v1/me', {
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

    const response = await fetch(`https://api.medium.com/v1/users/${userId}/posts`, {
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
    const repoResponse = await fetch(
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
    const response = await fetch('https://api.github.com/graphql', {
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
