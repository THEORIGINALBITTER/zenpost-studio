export function splitFileName(fileName: string): { base: string; ext: string } {
  const dotIdx = fileName.lastIndexOf('.');
  if (dotIdx <= 0) return { base: fileName, ext: '' };
  return {
    base: fileName.slice(0, dotIdx),
    ext: fileName.slice(dotIdx),
  };
}

export function ensureUniqueFileName(
  desiredFileName: string,
  existingNames: Iterable<string>,
): string {
  const { base, ext } = splitFileName(desiredFileName.trim() || 'untitled');
  const safeBase = base.trim() || 'untitled';
  const existing = new Set(Array.from(existingNames, (name) => name.toLowerCase()));

  const firstCandidate = `${safeBase}${ext}`;
  if (!existing.has(firstCandidate.toLowerCase())) return firstCandidate;

  let index = 2;
  while (index < 10000) {
    const candidate = `${safeBase}-${index}${ext}`;
    if (!existing.has(candidate.toLowerCase())) return candidate;
    index += 1;
  }
  return `${safeBase}-${Date.now()}${ext}`;
}
