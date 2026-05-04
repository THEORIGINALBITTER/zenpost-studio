export type LineDiffRow = {
  left: string;
  right: string;
  status: 'same' | 'added' | 'removed' | 'modified';
};

export const buildLineDiffRows = (leftContent: string, rightContent: string): LineDiffRow[] => {
  const leftLines = leftContent.split('\n');
  const rightLines = rightContent.split('\n');
  const n = leftLines.length;
  const m = rightLines.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i][j] = leftLines[i] === rightLines[j]
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const rows: LineDiffRow[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (leftLines[i] === rightLines[j]) {
      rows.push({ left: leftLines[i], right: rightLines[j], status: 'same' });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      rows.push({ left: leftLines[i], right: '', status: 'removed' });
      i += 1;
    } else {
      rows.push({ left: '', right: rightLines[j], status: 'added' });
      j += 1;
    }
  }

  while (i < n) {
    rows.push({ left: leftLines[i], right: '', status: 'removed' });
    i += 1;
  }
  while (j < m) {
    rows.push({ left: '', right: rightLines[j], status: 'added' });
    j += 1;
  }

  // Pair consecutive removed/added lines side-by-side (GitHub style).
  const mergedRows: LineDiffRow[] = [];
  let idx = 0;
  while (idx < rows.length) {
    const current = rows[idx];
    if (current.status === 'same') {
      mergedRows.push(current);
      idx += 1;
      continue;
    }

    const removed: string[] = [];
    const added: string[] = [];
    let k = idx;
    while (k < rows.length && (rows[k].status === 'removed' || rows[k].status === 'added')) {
      if (rows[k].status === 'removed') removed.push(rows[k].left);
      else added.push(rows[k].right);
      k += 1;
    }

    const pairCount = Math.max(removed.length, added.length);
    for (let p = 0; p < pairCount; p += 1) {
      const l = removed[p] ?? '';
      const r = added[p] ?? '';
      if (l && r) {
        mergedRows.push({ left: l, right: r, status: 'modified' });
      } else if (l) {
        mergedRows.push({ left: l, right: '', status: 'removed' });
      } else {
        mergedRows.push({ left: '', right: r, status: 'added' });
      }
    }
    idx = k;
  }

  return mergedRows;
};
