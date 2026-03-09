// Config.ts
// Universal formatting config for Medium, LinkedIn and GitHub
// Assumption: Zenpost Studio accepts a config object with platform transformers.
// Adapt the export shape if your local Zenpost Studio runtime expects another API.

type PlatformId = "medium" | "linkedin" | "github";

type InlineMark =
  | "bold"
  | "italic"
  | "strike"
  | "code"
  | "link"
  | "highlight"
  | "underline";

type BlockType =
  | "paragraph"
  | "heading"
  | "quote"
  | "bulleted-list"
  | "numbered-list"
  | "list-item"
  | "code-block"
  | "divider"
  | "image"
  | "table"
  | "callout";

type Alignment = "left" | "center" | "right";

interface TextNode {
  type: "text";
  text: string;
  marks?: Partial<Record<InlineMark, boolean>>;
  href?: string;
}

interface BlockNode {
  type: BlockType;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  lang?: string;
  url?: string;
  alt?: string;
  align?: Alignment;
  children?: Array<TextNode | BlockNode>;
  rows?: string[][];
}

type EditorNode = TextNode | BlockNode;

interface TransformContext {
  platform: PlatformId;
}

interface PlatformConfig {
  id: PlatformId;
  label: string;
  capabilities: {
    headings: boolean;
    bold: boolean;
    italic: boolean;
    strike: boolean;
    inlineCode: boolean;
    links: boolean;
    quotes: boolean;
    bullets: boolean;
    numbered: boolean;
    codeBlocks: boolean;
    tables: boolean;
    images: boolean;
    divider: boolean;
    callouts: boolean;
    underline: boolean;
    highlight: boolean;
  };
  rules: {
    headingLevels: number[];
    preserveLineBreaks: boolean;
    collapseMultipleBlankLines: boolean;
    maxConsecutiveBlankLines: number;
    normalizeSmartQuotes: boolean;
    stripHtml: boolean;
    autoLinkBareUrls: boolean;
    trailingSpaces: "remove" | "preserve";
  };
  transform: (doc: EditorNode[]) => string;
}

interface ZenpostStudioConfig {
  editor: {
    defaultBlock: BlockType;
    supportedBlocks: BlockType[];
    supportedMarks: InlineMark[];
  };
  platforms: Record<PlatformId, PlatformConfig>;
}

function escapeMd(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/([*_`~[\]<>|])/g, "\\$1");
}

function escapePlain(text: string): string {
  return text.replace(/\u0000/g, "");
}

function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+\n/g, "\n");
}

function collapseBlankLines(text: string, max = 2): string {
  const regex = new RegExp(`\\n{${max + 1},}`, "g");
  return text.replace(regex, "\n".repeat(max));
}

function isTextNode(node: EditorNode): node is TextNode {
  return node.type === "text";
}

function getTextContent(nodes: Array<TextNode | BlockNode> = []): string {
  return nodes
    .map((node) => {
      if (isTextNode(node)) return node.text;
      return getTextContent(node.children ?? []);
    })
    .join("");
}

function renderInlineMarkdown(
  nodes: Array<TextNode | BlockNode> = [],
  opts?: {
    allowBold?: boolean;
    allowItalic?: boolean;
    allowStrike?: boolean;
    allowCode?: boolean;
    allowLinks?: boolean;
    allowUnderline?: boolean;
    allowHighlight?: boolean;
  }
): string {
  return nodes
    .map((node) => {
      if (!isTextNode(node)) {
        return renderInlineMarkdown(node.children ?? [], opts);
      }

      let text = escapeMd(normalizeText(node.text));
      const marks = node.marks ?? {};

      if (marks.link && node.href && opts?.allowLinks !== false) {
        text = `[${text}](${node.href})`;
      }

      if (marks.code && opts?.allowCode !== false) {
        text = `\`${text}\``;
      }

      if (marks.bold && opts?.allowBold !== false) {
        text = `**${text}**`;
      }

      if (marks.italic && opts?.allowItalic !== false) {
        text = `*${text}*`;
      }

      if (marks.strike && opts?.allowStrike !== false) {
        text = `~~${text}~~`;
      }

      // Markdown has no universal underline/highlight syntax.
      // We intentionally ignore underline/highlight unless a platform handles them specially.

      return text;
    })
    .join("");
}

function toLinkedInUnicode(text: string, kind: "bold" | "italic"): string {
  const mapBold: Record<string, string> = {
    a: "𝗮", b: "𝗯", c: "𝗰", d: "𝗱", e: "𝗲", f: "𝗳", g: "𝗴", h: "𝗵", i: "𝗶", j: "𝗷",
    k: "𝗸", l: "𝗹", m: "𝗺", n: "𝗻", o: "𝗼", p: "𝗽", q: "𝗾", r: "𝗿", s: "𝘀", t: "𝘁",
    u: "𝘂", v: "𝘃", w: "𝘄", x: "𝘅", y: "𝘆", z: "𝘇",
    A: "𝗔", B: "𝗕", C: "𝗖", D: "𝗗", E: "𝗘", F: "𝗙", G: "𝗚", H: "𝗛", I: "𝗜", J: "𝗝",
    K: "𝗞", L: "𝗟", M: "𝗠", N: "𝗡", O: "𝗢", P: "𝗣", Q: "𝗤", R: "𝗥", S: "𝗦", T: "𝗧",
    U: "𝗨", V: "𝗩", W: "𝗪", X: "𝗫", Y: "𝗬", Z: "𝗭",
    0: "𝟬", 1: "𝟭", 2: "𝟮", 3: "𝟯", 4: "𝟰", 5: "𝟱", 6: "𝟲", 7: "𝟳", 8: "𝟴", 9: "𝟵",
  };

  const mapItalic: Record<string, string> = {
    a: "𝘢", b: "𝘣", c: "𝘤", d: "𝘥", e: "𝘦", f: "𝘧", g: "𝘨", h: "𝘩", i: "𝘪", j: "𝘫",
    k: "𝘬", l: "𝘭", m: "𝘮", n: "𝘯", o: "𝘰", p: "𝘱", q: "𝘲", r: "𝘳", s: "𝘴", t: "𝘵",
    u: "𝘶", v: "𝘷", w: "𝘸", x: "𝘹", y: "𝘺", z: "𝘻",
    A: "𝘈", B: "𝘉", C: "𝘊", D: "𝘋", E: "𝘌", F: "𝘍", G: "𝘎", H: "𝘏", I: "𝘐", J: "𝘑",
    K: "𝘒", L: "𝘓", M: "𝘔", N: "𝘕", O: "𝘖", P: "𝘗", Q: "𝘘", R: "𝘙", S: "𝘚", T: "𝘛",
    U: "𝘜", V: "𝘝", W: "𝘞", X: "𝘟", Y: "𝘠", Z: "𝘡",
  };

  const map = kind === "bold" ? mapBold : mapItalic;
  return [...text].map((ch) => map[ch] ?? ch).join("");
}

function renderInlineLinkedIn(nodes: Array<TextNode | BlockNode> = []): string {
  return nodes
    .map((node) => {
      if (!isTextNode(node)) {
        return renderInlineLinkedIn(node.children ?? []);
      }

      let text = escapePlain(normalizeText(node.text));
      const marks = node.marks ?? {};

      if (marks.bold) text = toLinkedInUnicode(text, "bold");
      else if (marks.italic) text = toLinkedInUnicode(text, "italic");

      if (marks.link && node.href) {
        text = `${text} (${node.href})`;
      }

      // LinkedIn has no reliable native inline code/strike/underline rendering in post text.
      // We degrade gracefully.
      if (marks.code) text = `“${text}”`;
      if (marks.strike) text = text;
      if (marks.underline) text = text;
      if (marks.highlight) text = text;

      return text;
    })
    .join("");
}

function renderBlockMarkdown(block: EditorNode, ctx: TransformContext): string {
  if (isTextNode(block)) {
    return renderInlineMarkdown([block]);
  }

  switch (block.type) {
    case "paragraph":
      return renderInlineMarkdown(block.children ?? []);

    case "heading": {
      const level = Math.min(Math.max(block.level ?? 2, 1), 6);
      return `${"#".repeat(level)} ${renderInlineMarkdown(block.children ?? [])}`;
    }

    case "quote":
      return getTextContent(block.children ?? [])
        .split("\n")
        .map((line) => `> ${escapeMd(line)}`)
        .join("\n");

    case "bulleted-list":
      return (block.children ?? [])
        .map((item) => {
          const content = isTextNode(item)
            ? renderInlineMarkdown([item])
            : renderInlineMarkdown(item.children ?? []);
          return `- ${content}`;
        })
        .join("\n");

    case "numbered-list":
      return (block.children ?? [])
        .map((item, index) => {
          const content = isTextNode(item)
            ? renderInlineMarkdown([item])
            : renderInlineMarkdown(item.children ?? []);
          return `${index + 1}. ${content}`;
        })
        .join("\n");

    case "list-item":
      return `- ${renderInlineMarkdown(block.children ?? [])}`;

    case "code-block": {
      const lang = block.lang ?? "";
      const code = getTextContent(block.children ?? []);
      return `\`\`\`${lang}\n${code}\n\`\`\``;
    }

    case "divider":
      return `---`;

    case "image": {
      const alt = block.alt ?? "";
      const url = block.url ?? "";
      return url ? `![${escapeMd(alt)}](${url})` : "";
    }

    case "table": {
      const rows = block.rows ?? [];
      if (!rows.length) return "";
      const [header, ...body] = rows;
      const headerLine = `| ${header.join(" | ")} |`;
      const sepLine = `| ${header.map(() => "---").join(" | ")} |`;
      const bodyLines = body.map((row) => `| ${row.join(" | ")} |`).join("\n");
      return [headerLine, sepLine, bodyLines].filter(Boolean).join("\n");
    }

    case "callout":
      if (ctx.platform === "github") {
        return `> ${renderInlineMarkdown(block.children ?? [])}`;
      }
      return renderInlineMarkdown(block.children ?? []);

    default:
      return "";
  }
}

function renderBlockLinkedIn(block: EditorNode): string {
  if (isTextNode(block)) return renderInlineLinkedIn([block]);

  switch (block.type) {
    case "paragraph":
      return renderInlineLinkedIn(block.children ?? []);

    case "heading": {
      const text = renderInlineLinkedIn(block.children ?? []);
      return toLinkedInUnicode(text.toUpperCase(), "bold");
    }

    case "quote":
      return getTextContent(block.children ?? [])
        .split("\n")
        .map((line) => `❝ ${line}`)
        .join("\n");

    case "bulleted-list":
      return (block.children ?? [])
        .map((item) => {
          const content = isTextNode(item)
            ? renderInlineLinkedIn([item])
            : renderInlineLinkedIn(item.children ?? []);
          return `• ${content}`;
        })
        .join("\n");

    case "numbered-list":
      return (block.children ?? [])
        .map((item, index) => {
          const content = isTextNode(item)
            ? renderInlineLinkedIn([item])
            : renderInlineLinkedIn(item.children ?? []);
          return `${index + 1}. ${content}`;
        })
        .join("\n");

    case "list-item":
      return `• ${renderInlineLinkedIn(block.children ?? [])}`;

    case "code-block": {
      const code = getTextContent(block.children ?? []);
      return code
        .split("\n")
        .map((line) => `   ${line}`)
        .join("\n");
    }

    case "divider":
      return "──────────";

    case "image":
      return block.url ? `🖼️ ${block.alt ?? "Image"}: ${block.url}` : "";

    case "table": {
      const rows = block.rows ?? [];
      if (!rows.length) return "";
      return rows
        .map((row, rowIndex) =>
          rowIndex === 0
            ? row.join(" | ")
            : row.join(" | ")
        )
        .join("\n");
    }

    case "callout":
      return `💡 ${renderInlineLinkedIn(block.children ?? [])}`;

    default:
      return "";
  }
}

function transformMarkdown(doc: EditorNode[], platform: PlatformId): string {
  const out = doc
    .map((block) => renderBlockMarkdown(block, { platform }))
    .filter(Boolean)
    .join("\n\n");

  return collapseBlankLines(normalizeText(out), 2).trim();
}

function transformLinkedIn(doc: EditorNode[]): string {
  const out = doc
    .map((block) => renderBlockLinkedIn(block))
    .filter(Boolean)
    .join("\n\n");

  return collapseBlankLines(normalizeText(out), 2).trim();
}

const Config: ZenpostStudioConfig = {
  editor: {
    defaultBlock: "paragraph",
    supportedBlocks: [
      "paragraph",
      "heading",
      "quote",
      "bulleted-list",
      "numbered-list",
      "list-item",
      "code-block",
      "divider",
      "image",
      "table",
      "callout",
    ],
    supportedMarks: [
      "bold",
      "italic",
      "strike",
      "code",
      "link",
      "highlight",
      "underline",
    ],
  },

  platforms: {
    medium: {
      id: "medium",
      label: "Medium",
      capabilities: {
        headings: true,
        bold: true,
        italic: true,
        strike: false,
        inlineCode: true,
        links: true,
        quotes: true,
        bullets: true,
        numbered: true,
        codeBlocks: true,
        tables: false,
        images: true,
        divider: true,
        callouts: false,
        underline: false,
        highlight: false,
      },
      rules: {
        headingLevels: [1, 2, 3],
        preserveLineBreaks: true,
        collapseMultipleBlankLines: true,
        maxConsecutiveBlankLines: 2,
        normalizeSmartQuotes: false,
        stripHtml: true,
        autoLinkBareUrls: true,
        trailingSpaces: "remove",
      },
      transform(doc) {
        // Medium-like output using clean Markdown/plain structure.
        // Tables degrade into paragraph blocks because Medium table support is unreliable.
        const normalized = doc.map((node) => {
          if (!isTextNode(node) && node.type === "table") {
            return {
              type: "paragraph" as const,
              children: [
                {
                  type: "text" as const,
                  text: (node.rows ?? [])
                    .map((row) => row.join(" | "))
                    .join("\n"),
                },
              ],
            };
          }
          return node;
        });

        return transformMarkdown(normalized, "medium");
      },
    },

    linkedin: {
      id: "linkedin",
      label: "LinkedIn",
      capabilities: {
        headings: false,
        bold: false,
        italic: false,
        strike: false,
        inlineCode: false,
        links: true,
        quotes: true,
        bullets: true,
        numbered: true,
        codeBlocks: false,
        tables: false,
        images: true,
        divider: true,
        callouts: true,
        underline: false,
        highlight: false,
      },
      rules: {
        headingLevels: [],
        preserveLineBreaks: true,
        collapseMultipleBlankLines: true,
        maxConsecutiveBlankLines: 2,
        normalizeSmartQuotes: false,
        stripHtml: true,
        autoLinkBareUrls: true,
        trailingSpaces: "remove",
      },
      transform(doc) {
        return transformLinkedIn(doc);
      },
    },

    github: {
      id: "github",
      label: "GitHub",
      capabilities: {
        headings: true,
        bold: true,
        italic: true,
        strike: true,
        inlineCode: true,
        links: true,
        quotes: true,
        bullets: true,
        numbered: true,
        codeBlocks: true,
        tables: true,
        images: true,
        divider: true,
        callouts: true,
        underline: false,
        highlight: false,
      },
      rules: {
        headingLevels: [1, 2, 3, 4, 5, 6],
        preserveLineBreaks: true,
        collapseMultipleBlankLines: true,
        maxConsecutiveBlankLines: 2,
        normalizeSmartQuotes: false,
        stripHtml: true,
        autoLinkBareUrls: true,
        trailingSpaces: "remove",
      },
      transform(doc) {
        return transformMarkdown(doc, "github");
      },
    },
  },
};

export default Config;

export type TransformPlatformId =
  | "linkedin"
  | "devto"
  | "twitter"
  | "medium"
  | "reddit"
  | "github-discussion"
  | "github-blog"
  | "youtube"
  | "blog-post";

type OutputMode = "plain" | "markdown" | "thread";

export interface PlatformSteuerRule {
  id: TransformPlatformId;
  label: string;
  outputMode: OutputMode;
  stripFrontmatter: boolean;
  keepMarkdownHeadings: boolean;
  splitLongParagraphs: boolean;
  maxHashtags?: number;
  maxSegmentChars?: number;
  maxTotalChars?: number;
  maxSegments?: number;
  ensureTitleHeading: boolean;
}

export interface SteuerFormatConfig {
  global: {
    collapseBlankLinesTo: number;
    trimTrailingWhitespace: boolean;
  };
  platforms: Record<TransformPlatformId, PlatformSteuerRule>;
}

export interface PlatformQAIssue {
  level: "warning" | "error";
  code: string;
  message: string;
}

export interface PlatformQAResult {
  platform: TransformPlatformId;
  ok: boolean;
  errors: PlatformQAIssue[];
  warnings: PlatformQAIssue[];
}

export interface PlatformAutoFixResult {
  content: string;
  changed: boolean;
  appliedFixes: string[];
}

const normalizeLineEndings = (input: string): string => input.replace(/\r\n/g, "\n");

const trimLineEndings = (input: string): string =>
  input
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n");

const stripYamlFrontmatter = (input: string): string => {
  const text = input.trimStart();
  if (!text.startsWith("---")) return input;
  const parts = text.split("\n");
  let endIndex = -1;
  for (let i = 1; i < parts.length; i += 1) {
    if (parts[i].trim() === "---") {
      endIndex = i;
      break;
    }
  }
  if (endIndex === -1) return input;
  return parts.slice(endIndex + 1).join("\n").trimStart();
};

const collapseBlank = (input: string, max: number): string => {
  const pattern = new RegExp(`\\n{${max + 1},}`, "g");
  return input.replace(pattern, "\n".repeat(max));
};

const removeMarkdownHeadings = (input: string): string =>
  input.replace(/^\s{0,3}#{1,6}\s+/gm, "");

const ensureMarkdownTitle = (input: string, fallbackTitle: string): string => {
  const lines = input.split("\n");
  const firstContentIndex = lines.findIndex((line) => line.trim().length > 0);
  if (firstContentIndex === -1) {
    return `# ${fallbackTitle}`;
  }
  const firstContent = lines[firstContentIndex].trim();
  if (/^\s{0,3}#{1,6}\s+/.test(firstContent)) {
    return input;
  }
  const safeTitle = firstContent.replace(/^[-*]\s+/, "").trim() || fallbackTitle;
  lines[firstContentIndex] = `# ${safeTitle}`;
  return lines.join("\n");
};

const splitLongLinkedInParagraphs = (input: string): string => {
  const lines = input.split("\n");
  const out: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length <= 220 || /^[-*•]\s+/.test(trimmed) || /^\d+\./.test(trimmed)) {
      out.push(line);
      continue;
    }
    const sentences = trimmed.split(/(?<=[.!?])\s+/g).filter(Boolean);
    if (sentences.length <= 1) {
      out.push(line);
      continue;
    }
    out.push(...sentences);
  }

  return out.join("\n");
};

const limitHashtags = (input: string, maxHashtags: number): string => {
  let seen = 0;
  return input.replace(/(^|\s)(#[A-Za-z0-9_]+)/g, (_match, prefix, tag) => {
    if (seen < maxHashtags) {
      seen += 1;
      return `${prefix}${tag}`;
    }
    return prefix;
  });
};

const stripTwitterThreadPrefix = (input: string): string => {
  // Remove valid prefixes like "1/59 " or "1/ ".
  let next = input.replace(/^\s*\d+\s*\/\s*(?:\d+\s*)?/, "").trimStart();

  // Cleanup legacy buggy remnants like "59 59 59 ... Text"
  // that were produced by an older auto-fix numbering parser.
  const repeatedMatch = next.match(/^(\d{1,4})(?:\s+\1){2,}\s+/);
  if (repeatedMatch) {
    next = next.slice(repeatedMatch[0].length).trimStart();
  }

  return next;
};

const normalizeTwitterBodyText = (input: string): string =>
  stripTwitterThreadPrefix(input).replace(/^\s*(?:\d+\s*\/\s*\d+\s+)+/, "").trim();

const formatTwitterThreadPlain = (segments: string[], maxCharsPerTweet: number): string => {
  const cleanSegments = segments.map((segment) => normalizeTwitterBodyText(segment)).filter(Boolean);

  return cleanSegments
    .map((tweet) => {
      const body = tweet.length > maxCharsPerTweet
        ? `${tweet.slice(0, Math.max(0, maxCharsPerTweet - 1)).trimEnd()}...`
        : tweet;
      return normalizeTwitterBodyText(body);
    })
    .join("\n\n");
};

const asTwitterThread = (input: string, maxCharsPerTweet: number): string => {
  const chunks = input
    .split(/\n{2,}/)
    .map((chunk) => stripTwitterThreadPrefix(chunk).trim())
    .filter(Boolean);

  const tweets = chunks.length > 0 ? chunks : [input.trim()].filter(Boolean);
  return formatTwitterThreadPlain(tweets, maxCharsPerTweet);
};

const sanitizeLinkedInPlain = (input: string): string => {
  let next = input;

  // Convert fenced code blocks to plain text content.
  next = next.replace(/```[^\n]*\n([\s\S]*?)```/g, (_m, code: string) => code.trim());

  // Convert markdown images/links to plain text.
  next = next.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt: string, url: string) =>
    `${(alt || "Bild").trim()}: ${url.trim()}`
  );
  next = next.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label: string, url: string) =>
    `${label.trim()} (${url.trim()})`
  );

  // LinkedIn has no native markdown quote block in posts -> flatten to plain text quote.
  next = next.replace(/^\s*>\s?/gm, "");

  // Remove inline markdown markers while preserving text.
  next = next
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/_([^_\n]+)_/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1");

  return next;
};

export const steuerFormatConfig: SteuerFormatConfig = {
  global: {
    collapseBlankLinesTo: 2,
    trimTrailingWhitespace: true,
  },
  platforms: {
    linkedin: {
      id: "linkedin",
      label: "LinkedIn",
      outputMode: "plain",
      stripFrontmatter: true,
      keepMarkdownHeadings: false,
      splitLongParagraphs: true,
      maxHashtags: 5,
      maxTotalChars: 3000,
      ensureTitleHeading: false,
    },
    devto: {
      id: "devto",
      label: "dev.to",
      outputMode: "markdown",
      stripFrontmatter: false,
      keepMarkdownHeadings: true,
      splitLongParagraphs: false,
      maxHashtags: 6,
      ensureTitleHeading: true,
    },
    twitter: {
      id: "twitter",
      label: "Twitter/X",
      outputMode: "thread",
      stripFrontmatter: true,
      keepMarkdownHeadings: false,
      splitLongParagraphs: false,
      maxHashtags: 3,
      maxSegmentChars: 280,
      maxSegments: 20,
      ensureTitleHeading: false,
    },
    medium: {
      id: "medium",
      label: "Medium",
      outputMode: "markdown",
      stripFrontmatter: true,
      keepMarkdownHeadings: true,
      splitLongParagraphs: false,
      maxHashtags: 5,
      ensureTitleHeading: true,
    },
    reddit: {
      id: "reddit",
      label: "Reddit",
      outputMode: "plain",
      stripFrontmatter: true,
      keepMarkdownHeadings: false,
      splitLongParagraphs: false,
      maxHashtags: 3,
      ensureTitleHeading: false,
    },
    "github-discussion": {
      id: "github-discussion",
      label: "GitHub Discussion",
      outputMode: "markdown",
      stripFrontmatter: true,
      keepMarkdownHeadings: true,
      splitLongParagraphs: false,
      maxHashtags: 8,
      ensureTitleHeading: true,
    },
    "github-blog": {
      id: "github-blog",
      label: "GitHub Blog",
      outputMode: "markdown",
      stripFrontmatter: false,
      keepMarkdownHeadings: true,
      splitLongParagraphs: false,
      maxHashtags: 8,
      ensureTitleHeading: true,
    },
    youtube: {
      id: "youtube",
      label: "YouTube",
      outputMode: "plain",
      stripFrontmatter: true,
      keepMarkdownHeadings: false,
      splitLongParagraphs: false,
      maxHashtags: 15,
      maxTotalChars: 5000,
      ensureTitleHeading: false,
    },
    "blog-post": {
      id: "blog-post",
      label: "Blog Post",
      outputMode: "markdown",
      stripFrontmatter: false,
      keepMarkdownHeadings: true,
      splitLongParagraphs: false,
      maxHashtags: 8,
      ensureTitleHeading: true,
    },
  },
};

export function applySteuerFormatConfig(content: string, platform: TransformPlatformId): string {
  const rule = steuerFormatConfig.platforms[platform];
  let output = normalizeLineEndings(content || "");

  if (rule.stripFrontmatter) {
    output = stripYamlFrontmatter(output);
  }

  if (!rule.keepMarkdownHeadings) {
    output = removeMarkdownHeadings(output);
  }

  if (platform === "linkedin") {
    output = sanitizeLinkedInPlain(output);
  }

  if (rule.ensureTitleHeading) {
    output = ensureMarkdownTitle(output, rule.label);
  }

  if (rule.splitLongParagraphs) {
    output = splitLongLinkedInParagraphs(output);
  }

  if (rule.maxHashtags && rule.maxHashtags > 0) {
    output = limitHashtags(output, rule.maxHashtags);
  }

  if (rule.outputMode === "thread") {
    output = asTwitterThread(output, rule.maxSegmentChars ?? 280);
  }

  if (steuerFormatConfig.global.trimTrailingWhitespace) {
    output = trimLineEndings(output);
  }

  output = collapseBlank(output, steuerFormatConfig.global.collapseBlankLinesTo);

  return output.trim();
}

function countHashtags(input: string): number {
  const matches = input.match(/(^|\s)#[A-Za-z0-9_]+/g);
  return matches?.length ?? 0;
}

function splitThreadSegments(input: string): string[] {
  return input
    .split(/\n{2,}/)
    .map((segment) => stripTwitterThreadPrefix(segment).trim())
    .filter(Boolean);
}

function trimToCharLimit(input: string, limit: number): string {
  if (input.length <= limit) return input;
  const clipped = input.slice(0, limit);
  const lastWhitespace = clipped.lastIndexOf(" ");
  if (lastWhitespace >= Math.floor(limit * 0.7)) {
    return `${clipped.slice(0, lastWhitespace).trimEnd()}...`;
  }
  return `${clipped.trimEnd()}...`;
}

function normalizeTwitterSegments(content: string): string[] {
  const base = content
    .split(/\n{2,}/)
    .map((part) => stripTwitterThreadPrefix(part).trim())
    .filter(Boolean);
  if (base.length > 0) return base;
  return content
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildThreadWithinLimit(segments: string[], maxCharsPerTweet: number): string[] {
  const out: string[] = [];
  const maxTotalGuess = Math.max(segments.length, 1);
  const numberingReserve = `${maxTotalGuess}/${maxTotalGuess} `.length;
  const textLimit = Math.max(40, maxCharsPerTweet - numberingReserve);

  const splitBySentence = (text: string): string[] => text.split(/(?<=[.!?])\s+/g).filter(Boolean);

  const splitLongText = (text: string): string[] => {
    if (text.length <= textLimit) return [text];
    const sentences = splitBySentence(text);
    if (sentences.length <= 1) {
      const chunks: string[] = [];
      let rest = text;
      while (rest.length > textLimit) {
        chunks.push(rest.slice(0, textLimit).trimEnd());
        rest = rest.slice(textLimit).trimStart();
      }
      if (rest) chunks.push(rest);
      return chunks;
    }
    const chunks: string[] = [];
    let current = "";
    for (const sentence of sentences) {
      const candidate = current ? `${current} ${sentence}` : sentence;
      if (candidate.length <= textLimit) {
        current = candidate;
      } else {
        if (current) chunks.push(current);
        current = sentence.length <= textLimit ? sentence : trimToCharLimit(sentence, textLimit);
      }
    }
    if (current) chunks.push(current);
    return chunks;
  };

  segments.forEach((segment) => {
    splitLongText(segment).forEach((chunk) => out.push(chunk));
  });

  return out.filter(Boolean);
}

export function validateSteuerFormatContent(
  content: string,
  platform: TransformPlatformId
): PlatformQAResult {
  const rule = steuerFormatConfig.platforms[platform];
  const text = (content ?? "").trim();
  // Strip base64 image data before char counting — embedded images would
  // inflate the count by hundreds of thousands of characters.
  const textForCount = text.replace(/!\[([^\]]*)\]\(data:[^;]+;base64,[A-Za-z0-9+/=\n]+\)/g, '![$1]()');
  const issues: PlatformQAIssue[] = [];

  if (!text) {
    issues.push({
      level: "error",
      code: "empty-content",
      message: "Inhalt ist leer.",
    });
  }

  if (rule.maxTotalChars && textForCount.length > rule.maxTotalChars) {
    issues.push({
      level: platform === "linkedin" ? "error" : "warning",
      code: "max-total-chars",
      message: `${rule.label}: ${textForCount.length} Zeichen (Limit ${rule.maxTotalChars}).`,
    });
  }

  if (platform === "twitter") {
    const segments = splitThreadSegments(text);
    if (rule.maxSegments && segments.length > rule.maxSegments) {
      issues.push({
        level: "warning",
        code: "max-thread-segments",
        message: `Twitter/X: ${segments.length} Tweets (empfohlen max. ${rule.maxSegments}).`,
      });
    }
    const maxSegmentChars = rule.maxSegmentChars ?? 280;
    segments.forEach((segment, index) => {
      if (segment.length > maxSegmentChars) {
        issues.push({
          level: "error",
          code: "tweet-too-long",
          message: `Twitter/X Tweet ${index + 1}: ${segment.length} Zeichen (Limit ${maxSegmentChars}).`,
        });
      }
    });
  }

  const maxHashtags = rule.maxHashtags ?? 0;
  if (maxHashtags > 0) {
    const hashtagCount = countHashtags(text);
    if (hashtagCount > maxHashtags) {
      issues.push({
        level: platform === "youtube" ? "error" : "warning",
        code: "max-hashtags",
        message: `${rule.label}: ${hashtagCount} Hashtags (Limit ${maxHashtags}).`,
      });
    }
  }

  if (platform === "medium" || platform === "devto" || platform === "github-blog" || platform === "blog-post") {
    const firstLine = text.split("\n").find((line) => line.trim().length > 0) ?? "";
    if (!/^\s{0,3}#\s+/.test(firstLine)) {
      issues.push({
        level: "warning",
        code: "missing-title-heading",
        message: `${rule.label}: Titel als '# Heading' fehlt am Anfang.`,
      });
    }
  }

  // Alt-text check: images without descriptive alt text
  const imageMatches = [...text.matchAll(/!\[([^\]]*)\]\([^)]*\)/g)];
  const missingAlt = imageMatches.filter(m => !m[1].trim()).length;
  if (missingAlt > 0) {
    issues.push({
      level: "warning",
      code: "missing-alt-text",
      message: `${missingAlt} Bild${missingAlt > 1 ? 'er' : ''} ohne Alt-Text — wichtig für Barrierefreiheit & SEO.`,
    });
  }

  // Multiple H1 check (blog platforms only)
  if (platform === "medium" || platform === "devto" || platform === "github-blog" || platform === "blog-post") {
    const h1Count = (text.match(/^# .+/gm) ?? []).length;
    if (h1Count > 1) {
      issues.push({
        level: "warning",
        code: "multiple-h1",
        message: `${rule.label}: ${h1Count}× H1-Überschrift — nur eine empfohlen.`,
      });
    }
  }

  return {
    platform,
    ok: !issues.some((issue) => issue.level === "error"),
    errors: issues.filter((issue) => issue.level === "error"),
    warnings: issues.filter((issue) => issue.level === "warning"),
  };
}

export function autoFixSteuerFormatContent(
  content: string,
  platform: TransformPlatformId
): PlatformAutoFixResult {
  const rule = steuerFormatConfig.platforms[platform];
  let next = content ?? "";
  const appliedFixes: string[] = [];

  if (rule.maxHashtags && rule.maxHashtags > 0) {
    const before = countHashtags(next);
    next = limitHashtags(next, rule.maxHashtags);
    const after = countHashtags(next);
    if (after < before) {
      appliedFixes.push(`Hashtags auf ${after}/${rule.maxHashtags} reduziert.`);
    }
  }

  if (rule.maxTotalChars && next.length > rule.maxTotalChars) {
    next = trimToCharLimit(next, rule.maxTotalChars);
    appliedFixes.push(`Text auf ${rule.maxTotalChars} Zeichen gekürzt.`);
  }

  if (platform === "twitter") {
    const normalized = normalizeTwitterSegments(next);
    const rebuilt = buildThreadWithinLimit(normalized, rule.maxSegmentChars ?? 280);
    if (rebuilt.length > 0) {
      next = formatTwitterThreadPlain(rebuilt, rule.maxSegmentChars ?? 280);
      appliedFixes.push(`Thread in ${rebuilt.length} Tweets mit max. ${rule.maxSegmentChars ?? 280} Zeichen aufgeteilt.`);
    }
  }

  const formatted = applySteuerFormatConfig(next, platform);
  return {
    content: formatted,
    changed: formatted !== content,
    appliedFixes,
  };
}
