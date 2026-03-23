/**
 * Platform Post Rules
 *
 * Defines per-platform rules for how PostMetadata fields are used when posting.
 * Add new platforms here — the posting logic reads from this config automatically.
 */

import type { SocialPlatform } from '../services/socialMediaService';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type CoverImageStrategy =
  | 'upload_binary' // fetch URL → binary → platform upload API (LinkedIn, Twitter)
  | 'url_field'     // pass URL directly in API body (dev.to cover_image)
  | 'in_markdown'   // images stay inside markdown content (Medium, GitHub)
  | 'none';         // platform does not support cover images

export type TitleStrategy =
  | 'api_field'     // sent as separate title field in the API body
  | 'prepend_text'  // prepended to the post text body
  | 'none';

export type SubtitleStrategy =
  | 'api_field'
  | 'append_text'
  | 'none';

export interface TagRule {
  use: boolean;
  /** Maximum number of tags accepted by the platform */
  max?: number;
  /** Transform each tag before sending (e.g. lowercase + hyphenate) */
  transform?: (tag: string) => string;
}

export interface PlatformPostRule {
  /** Hard character limit for the main text body (undefined = no limit) */
  maxChars?: number;

  coverImage: {
    use: boolean;
    strategy: CoverImageStrategy;
  };

  title: {
    use: boolean;
    as: TitleStrategy;
  };

  subtitle: {
    use: boolean;
    as: SubtitleStrategy;
  };

  tags: TagRule;

  /** Human-readable notes — shown in UI tooltips or dev docs */
  notes?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PostMetadata — the source data that rules are applied to
// ─────────────────────────────────────────────────────────────────────────────

export interface PostMetadata {
  title?: string;
  subtitle?: string;
  /** URL, blob:, data:image/* or file:// path */
  imageUrl?: string;
  date?: string;
  tags?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-platform rules
// ─────────────────────────────────────────────────────────────────────────────

export const PLATFORM_POST_RULES: Record<SocialPlatform, PlatformPostRule> = {

  linkedin: {
    maxChars: 3000,
    coverImage: {
      use: true,
      strategy: 'upload_binary', // fetch imageUrl → ArrayBuffer → LinkedIn initializeUpload API
    },
    title: {
      use: false, // LinkedIn posts have no separate title field
      as: 'none',
    },
    subtitle: {
      use: false,
      as: 'none',
    },
    tags: {
      use: false, // LinkedIn API does not accept hashtags via REST posts endpoint
    },
    notes: 'Cover image is uploaded via LinkedIn Community Management API (initializeUpload → PUT binary → URN in content.media).',
  },

  devto: {
    maxChars: undefined,
    coverImage: {
      use: true,
      strategy: 'url_field', // dev.to accepts a public URL in article.cover_image
    },
    title: {
      use: true,
      as: 'api_field',
    },
    subtitle: {
      use: false,
      as: 'none',
    },
    tags: {
      use: true,
      max: 4,
      // dev.to tags: lowercase, alphanumeric + hyphens only
      transform: (tag) => tag.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''),
    },
    notes: 'Posted as draft (published: false). Cover image must be a public HTTPS URL.',
  },

  medium: {
    maxChars: undefined,
    coverImage: {
      use: false,
      strategy: 'in_markdown', // Medium re-hosts images found in the markdown body
    },
    title: {
      use: true,
      as: 'api_field',
    },
    subtitle: {
      use: false,
      as: 'none',
    },
    tags: {
      use: true,
      max: 5,
    },
    notes: 'Posted as draft. Images in markdown are auto-hosted by Medium.',
  },

  twitter: {
    maxChars: 280,
    coverImage: {
      use: true,
      strategy: 'upload_binary', // Twitter media/upload API → media_id attached to tweet
    },
    title: {
      use: false,
      as: 'none',
    },
    subtitle: {
      use: false,
      as: 'none',
    },
    tags: {
      use: false, // hashtags are part of the text body, not a separate field
    },
    notes: 'Thread support: content split on double newlines. Images via POST /1.1/media/upload.json.',
  },

  reddit: {
    maxChars: undefined,
    coverImage: {
      use: false,
      strategy: 'none',
    },
    title: {
      use: true,
      as: 'api_field',
      // Reddit requires a title — falls back to first heading or document name
    },
    subtitle: {
      use: false,
      as: 'none',
    },
    tags: {
      use: false, // Reddit uses subreddit flairs, not tags
    },
    notes: 'Subreddit must be configured per post. Title max 300 chars.',
  },

  github: {
    maxChars: undefined,
    coverImage: {
      use: false,
      strategy: 'none', // images go into the repo as files
    },
    title: {
      use: true,
      as: 'api_field',
    },
    subtitle: {
      use: false,
      as: 'none',
    },
    tags: {
      use: true,
      // GitHub Gist: no tag API — stored in description; GitHub Discussions: label-based
    },
    notes: 'GitHub Gist: tags appended to description. GitHub Discussions: uses repo labels.',
  },

};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: apply rules to produce a platform-ready content object
// ─────────────────────────────────────────────────────────────────────────────

export interface PreparedPostContent {
  /** Main text body (possibly truncated to maxChars) */
  text: string;
  title?: string;
  subtitle?: string;
  /** Public URL — for 'url_field' strategy */
  coverImageUrl?: string;
  /** For 'upload_binary': caller must fetch this URL and upload the binary */
  coverImageSourceUrl?: string;
  tags?: string[];
}

/**
 * Applies platform rules to raw text + PostMetadata.
 * Returns a normalized object ready to pass to the platform's posting function.
 */
export function preparePostContent(
  platform: SocialPlatform,
  text: string,
  meta: PostMetadata = {},
): PreparedPostContent {
  const rule = PLATFORM_POST_RULES[platform];

  // ── Text ──────────────────────────────────────────────────────────────────
  const body = rule.maxChars ? text.substring(0, rule.maxChars) : text;

  // ── Title ─────────────────────────────────────────────────────────────────
  let title: string | undefined;
  if (rule.title.use && meta.title) {
    title = meta.title;
  }

  // ── Subtitle ──────────────────────────────────────────────────────────────
  let subtitle: string | undefined;
  if (rule.subtitle.use && meta.subtitle) {
    subtitle = meta.subtitle;
  }

  // ── Tags ──────────────────────────────────────────────────────────────────
  let tags: string[] | undefined;
  if (rule.tags.use && meta.tags?.length) {
    let t = [...meta.tags];
    if (rule.tags.transform) t = t.map(rule.tags.transform).filter(Boolean);
    if (rule.tags.max) t = t.slice(0, rule.tags.max);
    tags = t;
  }

  // ── Cover image ───────────────────────────────────────────────────────────
  let coverImageUrl: string | undefined;
  let coverImageSourceUrl: string | undefined;

  if (rule.coverImage.use && meta.imageUrl) {
    if (rule.coverImage.strategy === 'url_field') {
      coverImageUrl = meta.imageUrl;
    } else if (rule.coverImage.strategy === 'upload_binary') {
      coverImageSourceUrl = meta.imageUrl; // caller fetches + uploads
    }
    // 'in_markdown' and 'none': no action needed here
  }

  return { text: body, title, subtitle, coverImageUrl, coverImageSourceUrl, tags };
}
