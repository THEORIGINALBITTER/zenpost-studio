import twitterText from 'twitter-text';

/** Keep authored thread boundaries; never truncate or split URLs/sentences. */
export function prepareXPostContent(content: string): { text: string; thread?: string[] } {
  const normalized = content.replace(/\r\n?/g, '\n').trim();
  const numbered = normalized.split(/\n+(?=\d+\/\s)/).filter(Boolean);
  const posts = numbered.length > 1 ? numbered : twitterText.parseTweet(normalized).valid
    ? [normalized]
    : normalized.split(/\n\s*\n/).map(part => part.trim()).filter(Boolean);
  validateXPosts(posts);
  return { text: posts[0], thread: posts.length > 1 ? posts.slice(1) : undefined };
}

export function validateXPosts(posts: string[]): void {
  if (!posts.length) throw new Error('Bitte schreibe zuerst einen X-Beitrag.');
  posts.forEach((post, index) => {
    const parsed = twitterText.parseTweet(post);
    if (!parsed.valid) {
      throw new Error(`X-Beitrag ${index + 1} ist leer, ungültig oder zu lang (${parsed.weightedLength}/280). Bitte im Editor kürzen oder mit einer Leerzeile in einen Thread aufteilen.`);
    }
  });
}
