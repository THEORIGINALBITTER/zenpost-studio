/**
 * Git Service — runs git commands via Tauri shell in a local repo directory.
 */
import { Command } from '@tauri-apps/plugin-shell';

export interface GitResult {
  success: boolean;
  stdout: string;
  stderr: string;
}

async function runGit(cwd: string, args: string[]): Promise<GitResult> {
  const cmd = Command.create('git', args, { cwd });
  const output = await cmd.execute();
  return {
    success: output.code === 0,
    stdout: output.stdout,
    stderr: output.stderr,
  };
}

/**
 * Stages all changes, commits, and pushes to the remote.
 * Returns an error string on failure, null on success.
 */
export async function gitCommitAndPush(repoPath: string, commitMessage: string): Promise<string | null> {
  const add = await runGit(repoPath, ['add', '-A']);
  if (!add.success) return `git add fehlgeschlagen: ${add.stderr.trim()}`;

  // Nothing to commit is fine — skip commit + push
  const status = await runGit(repoPath, ['status', '--porcelain']);
  if (status.stdout.trim() === '') return null;

  const commit = await runGit(repoPath, ['commit', '-m', commitMessage]);
  if (!commit.success) return `git commit fehlgeschlagen: ${commit.stderr.trim()}`;

  const push = await runGit(repoPath, ['push']);
  if (!push.success) return `git push fehlgeschlagen: ${push.stderr.trim()}`;

  return null;
}
