/**
 * FTP / SFTP Upload Service
 * Uses curl (built-in on macOS/Linux/Windows 10+).
 * Supports plain FTP, FTPS (FTP over TLS) and SFTP (SSH).
 */
import { Command } from '@tauri-apps/plugin-shell';
import { invoke } from '@tauri-apps/api/core';

export type TransferProtocol = 'ftp' | 'ftps' | 'sftp';

export interface FtpConfig {
  host: string;
  user: string;
  password: string;
  remotePath: string; // e.g. /public_html/blog/posts/
  protocol?: TransferProtocol; // default: 'ftp'
}

/**
 * Uploads a local file via FTP, FTPS or SFTP.
 * Returns an error string on failure, null on success.
 */
export async function ftpUpload(
  localFilePath: string,
  remoteFileName: string,
  ftp: FtpConfig,
): Promise<string | null> {
  const protocol = ftp.protocol ?? 'ftp';
  const remotePath = ftp.remotePath.endsWith('/') ? ftp.remotePath : ftp.remotePath + '/';

  // SFTP → native Rust command (curl unterstützt kein SFTP auf macOS)
  if (protocol === 'sftp') {
    try {
      await invoke('sftp_upload', {
        req: {
          host: ftp.host,
          port: null,
          user: ftp.user,
          password: ftp.password,
          local_path: localFilePath,
          remote_path: `${remotePath}${remoteFileName}`,
        },
      });
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
  }

  // FTP / FTPS → curl
  const remoteUrl = `${protocol}://${ftp.host}${remotePath}${remoteFileName}`;
  const args: string[] = [
    '-T', localFilePath,
    remoteUrl,
    '--user', `${ftp.user}:${ftp.password}`,
    '--connect-timeout', '20',
    '--max-time', '60',
    '--silent',
    '--show-error',
  ];

  if (protocol === 'ftp') {
    args.push('--ftp-create-dirs', '--ftp-pasv');
  } else if (protocol === 'ftps') {
    args.push('--ftp-create-dirs', '--ftp-pasv', '--ssl-reqd', '--insecure');
  }

  const cmd = Command.create('curl', args);
  const output = await cmd.execute();
  if (output.code !== 0) {
    return output.stderr.trim() || `Upload fehlgeschlagen (Code ${output.code})`;
  }
  return null;
}
