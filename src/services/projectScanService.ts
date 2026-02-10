import { readDir, readTextFile, writeTextFile, mkdir, exists } from '@tauri-apps/plugin-fs';

export type ScanSummary = {
  scanVersion: string;
  createdAt: string;
  projectType: string[];
  signals: {
    packageJson: boolean;
    tauri: boolean;
    composerJson: boolean;
    docker: boolean;
    python: boolean;
    rust: boolean;
    go: boolean;
    prisma: boolean;
    migrations: boolean;
  };
  project: {
    name: string;
    description: string;
    version: string;
  };
  structure: {
    topFolders: string[];
    classified: Record<string, string[]>;
    hasTests: boolean;
    hasCI: boolean;
    hasDocs: boolean;
    hasDocker: boolean;
  };
  build: {
    scripts: string[];
    hasTestScript: boolean;
    entrypoints: string[];
    tauri?: {
      beforeDevCommand?: string;
      beforeBuildCommand?: string;
    };
  };
  dependencies: {
    prodCount: number;
    devCount: number;
    top: string[];
    lockfiles: string[];
  };
  fileTypes: string[];
};

export type DependencyReport = {
  prodCount: number;
  devCount: number;
  top: string[];
  lockfiles: string[];
  npm?: {
    dependencies: string[];
    devDependencies: string[];
  };
  composer?: {
    require: string[];
    requireDev: string[];
  };
};

export type ScanArtifacts = {
  summary: ScanSummary;
  dependencyReport: DependencyReport;
  projectTree: string;
  analysisDir: string;
  generatedDataRoomPath?: string;
};

export type ProjectContext = Record<string, unknown>;

const SCAN_VERSION = '1.0.0';
const DEFAULT_EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  '.next',
  '.turbo',
  '.idea',
  '.vscode',
  '.zenpost',
  'zenstudio',
]);

type Entry = {
  name?: string;
  isDirectory: boolean;
  isFile: boolean;
};

async function pathExists(path: string): Promise<boolean> {
  try {
    return await exists(path);
  } catch {
    return false;
  }
}

async function readJsonFile<T>(path: string): Promise<T | null> {
  try {
    const content = await readTextFile(path);
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

function normalizeTopDependencies(list: string[] | undefined, limit = 10): string[] {
  if (!list) return [];
  return list.slice(0, limit);
}

function toSortedUnique(list: string[]): string[] {
  return Array.from(new Set(list)).sort((a, b) => a.localeCompare(b));
}

async function collectTopLevelEntries(projectPath: string): Promise<Entry[]> {
  try {
    return await readDir(projectPath);
  } catch {
    return [];
  }
}

async function buildTree(
  projectPath: string,
  maxDepth = 3,
  excludedDirs = DEFAULT_EXCLUDED_DIRS
): Promise<string> {
  const lines: string[] = [];

  const walk = async (dirPath: string, depth: number) => {
    if (depth > maxDepth) return;
    let entries: Entry[] = [];
    try {
      entries = await readDir(dirPath);
    } catch {
      return;
    }

    const filtered = entries
      .filter((entry) => entry.name && !entry.name.startsWith('.'))
      .filter((entry) => !(entry.isDirectory && entry.name && excludedDirs.has(entry.name)))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    for (const entry of filtered) {
      const name = entry.name || '';
      const prefix = `${'  '.repeat(depth)}- `;
      if (entry.isDirectory) {
        lines.push(`${prefix}${name}/`);
        if (depth < maxDepth) {
          await walk(`${dirPath}/${name}`, depth + 1);
        }
      } else if (entry.isFile) {
        lines.push(`${prefix}${name}`);
      }
    }
  };

  lines.push(`${projectPath.split('/').pop() || 'project'}/`);
  await walk(projectPath, 1);

  return `${lines.join('\n')}\n`;
}

async function collectFileTypes(
  projectPath: string,
  excludedDirs = DEFAULT_EXCLUDED_DIRS,
  maxFiles = 2000
): Promise<string[]> {
  const extensions = new Set<string>();
  let scannedFiles = 0;

  const walk = async (dirPath: string) => {
    if (scannedFiles >= maxFiles) return;
    let entries: Entry[] = [];
    try {
      entries = await readDir(dirPath);
    } catch {
      return;
    }

    for (const entry of entries) {
      const name = entry.name || '';
      if (!name || name.startsWith('.')) continue;
      if (entry.isDirectory) {
        if (excludedDirs.has(name)) continue;
        await walk(`${dirPath}/${name}`);
      } else if (entry.isFile) {
        scannedFiles += 1;
        const ext = name.includes('.') ? name.split('.').pop() : null;
        if (ext) extensions.add(ext);
        if (scannedFiles >= maxFiles) return;
      }
    }
  };

  await walk(projectPath);
  return toSortedUnique(Array.from(extensions));
}

async function classifyFolders(projectPath: string): Promise<Record<string, string[]>> {
  const classified: Record<string, string[]> = {
    app: [],
    ui: [],
    logic: [],
    backend: [],
    docs: [],
    tests: [],
    scripts: [],
    assets: [],
  };

  const addIfExists = async (label: keyof typeof classified, relativePath: string) => {
    if (await pathExists(`${projectPath}/${relativePath}`)) {
      classified[label].push(relativePath);
    }
  };

  await addIfExists('app', 'src');
  await addIfExists('ui', 'src/components');
  await addIfExists('logic', 'src/services');
  await addIfExists('backend', 'server');
  await addIfExists('backend', 'api');
  await addIfExists('backend', 'backend');
  await addIfExists('docs', 'docs');
  await addIfExists('tests', 'tests');
  await addIfExists('tests', '__tests__');
  await addIfExists('scripts', 'scripts');
  await addIfExists('assets', 'public');
  await addIfExists('assets', 'assets');

  return classified;
}

function detectSignals(topEntries: Entry[]) {
  const topNames = new Set(topEntries.map((entry) => entry.name || ''));
  const packageJson = topNames.has('package.json');
  const composerJson = topNames.has('composer.json');
  const tauri = topNames.has('src-tauri') || topNames.has('tauri.conf.json');
  const docker = topNames.has('Dockerfile') || topNames.has('docker-compose.yml') || topNames.has('docker-compose.yaml');
  const python = topNames.has('pyproject.toml') || topNames.has('requirements.txt');
  const rust = topNames.has('Cargo.toml');
  const go = topNames.has('go.mod');
  const prisma = topNames.has('prisma') || topNames.has('schema.prisma') || topNames.has('prisma/schema.prisma');
  const migrations = topNames.has('migrations');

  return {
    packageJson,
    composerJson,
    tauri,
    docker,
    python,
    rust,
    go,
    prisma,
    migrations,
  };
}

type Signals = ReturnType<typeof detectSignals>;

function detectProjectTypes(signals: Signals, packageJsonData: any | null) {
  const types: string[] = [];

  if (signals.packageJson) types.push('node');
  if (signals.tauri) types.push('tauri');
  if (signals.composerJson) types.push('php-api');
  if (signals.python) types.push('python');
  if (signals.rust) types.push('rust');
  if (signals.go) types.push('go');

  const deps = {
    ...(packageJsonData?.dependencies || {}),
    ...(packageJsonData?.devDependencies || {}),
  };

  if (deps.react) types.push('react');
  if (deps.vite) types.push('vite');
  if (deps.next) types.push('next');

  return toSortedUnique(types);
}

function extractProjectInfo(projectPath: string, packageJsonData: any | null, cargoData: string | null) {
  let name = projectPath.split('/').pop() || 'Unknown Project';
  let description = 'No description available';
  let version = '0.1.0';

  if (packageJsonData) {
    name = packageJsonData.name || name;
    description = packageJsonData.description || description;
    version = packageJsonData.version || version;
  }

  if (cargoData) {
    const nameMatch = cargoData.match(/name\s*=\s*"([^"]+)"/);
    const versionMatch = cargoData.match(/version\s*=\s*"([^"]+)"/);
    if (nameMatch) name = nameMatch[1];
    if (versionMatch) version = versionMatch[1];
  }

  return { name, description, version };
}

function extractBuildSignals(packageJsonData: any | null, tauriConfigData: any | null) {
  const scripts = packageJsonData?.scripts ? Object.keys(packageJsonData.scripts) : [];
  const hasTestScript = scripts.includes('test');
  const entrypoints: string[] = [];

  if (tauriConfigData?.build?.beforeDevCommand) {
    entrypoints.push('tauri:beforeDevCommand');
  }
  if (tauriConfigData?.build?.beforeBuildCommand) {
    entrypoints.push('tauri:beforeBuildCommand');
  }

  return {
    scripts,
    hasTestScript,
    entrypoints,
    tauri: tauriConfigData?.build
      ? {
          beforeDevCommand: tauriConfigData.build.beforeDevCommand,
          beforeBuildCommand: tauriConfigData.build.beforeBuildCommand,
        }
      : undefined,
  };
}

function extractDependencies(packageJsonData: any | null) {
  const dependencies = Object.keys(packageJsonData?.dependencies || {});
  const devDependencies = Object.keys(packageJsonData?.devDependencies || {});

  return {
    prodCount: dependencies.length,
    devCount: devDependencies.length,
    top: normalizeTopDependencies(dependencies),
    npm: {
      dependencies,
      devDependencies,
    },
  };
}

async function detectQualitySignals(projectPath: string, packageJsonData: any | null, composerJsonData: any | null) {
  const hasTestsFolder =
    (await pathExists(`${projectPath}/tests`)) || (await pathExists(`${projectPath}/__tests__`));

  const testDeps = [
    'jest',
    'vitest',
    '@vitest/ui',
    '@vitest/coverage-v8',
    'mocha',
    'phpunit/phpunit',
  ];
  const hasTestDeps = testDeps.some(
    (dep) =>
      packageJsonData?.devDependencies?.[dep] ||
      packageJsonData?.dependencies?.[dep] ||
      composerJsonData?.['require-dev']?.[dep]
  );

  const lintDeps = ['eslint', '@eslint/js'];
  const hasLintDeps = lintDeps.some(
    (dep) => packageJsonData?.devDependencies?.[dep] || packageJsonData?.dependencies?.[dep]
  );
  const hasLintConfig =
    (await pathExists(`${projectPath}/.eslintrc`)) ||
    (await pathExists(`${projectPath}/.eslintrc.js`)) ||
    (await pathExists(`${projectPath}/.eslintrc.cjs`)) ||
    (await pathExists(`${projectPath}/.eslintrc.json`)) ||
    (await pathExists(`${projectPath}/eslint.config.js`)) ||
    (await pathExists(`${projectPath}/eslint.config.cjs`));

  const hasCI = await pathExists(`${projectPath}/.github/workflows`);
  const hasDocs = (await pathExists(`${projectPath}/README.md`)) || (await pathExists(`${projectPath}/docs`));
  const hasDocker =
    (await pathExists(`${projectPath}/Dockerfile`)) ||
    (await pathExists(`${projectPath}/docker-compose.yml`)) ||
    (await pathExists(`${projectPath}/docker-compose.yaml`));

  return {
    hasTests: hasTestsFolder || hasTestDeps,
    hasLint: hasLintDeps || hasLintConfig,
    hasCI,
    hasDocs,
    hasDocker,
  };
}

async function resolveEntrypoints(projectPath: string): Promise<string[]> {
  const entrypoints: string[] = [];
  if (await pathExists(`${projectPath}/server/index.php`)) entrypoints.push('server/index.php');
  if (await pathExists(`${projectPath}/public/index.php`)) entrypoints.push('public/index.php');
  if (await pathExists(`${projectPath}/src/main.tsx`)) entrypoints.push('src/main.tsx');
  if (await pathExists(`${projectPath}/src/main.ts`)) entrypoints.push('src/main.ts');
  return entrypoints;
}

async function detectLockfiles(projectPath: string): Promise<string[]> {
  const lockfiles: string[] = [];
  const candidates = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb', 'composer.lock'];
  for (const file of candidates) {
    if (await pathExists(`${projectPath}/${file}`)) lockfiles.push(file);
  }
  return lockfiles;
}

export async function loadProjectContext(projectPath: string): Promise<{
  contextPath: string;
  exists: boolean;
  data: ProjectContext | null;
}> {
  const contextPath = `${projectPath}/zenstudio/context/project.context.json`;
  const existsFlag = await pathExists(contextPath);
  const data = existsFlag ? await readJsonFile<ProjectContext>(contextPath) : null;
  return { contextPath, exists: existsFlag, data };
}

export function generateProjectAnalysisMarkdown(summary: ScanSummary): string {
  const lines: string[] = [];
  const notDetected = 'Not detected in repository scan. Add context in project.context.json if applicable.';

  lines.push('<!-- Generated by ZenStudio Doc Studio. Do not edit manually. -->');
  lines.push('');
  lines.push('# Project Analysis');
  lines.push('');
  lines.push('## Detected Stack');
  lines.push(summary.projectType.length ? `- ${summary.projectType.join(', ')}` : `- ${notDetected}`);
  lines.push('');
  lines.push('## Project Structure Overview');
  lines.push(summary.structure.topFolders.length ? `- Top folders: ${summary.structure.topFolders.join(', ')}` : `- ${notDetected}`);
  Object.entries(summary.structure.classified).forEach(([key, value]) => {
    const label = key[0].toUpperCase() + key.slice(1);
    if (value.length) {
      lines.push(`- ${label}: ${value.join(', ')}`);
    } else {
      lines.push(`- ${label}: ${notDetected}`);
    }
  });
  lines.push('');
  lines.push('## Build & Tooling');
  lines.push(summary.build.scripts.length ? `- Scripts: ${summary.build.scripts.join(', ')}` : `- Scripts: ${notDetected}`);
  lines.push(summary.build.entrypoints.length ? `- Entrypoints: ${summary.build.entrypoints.join(', ')}` : `- Entrypoints: ${notDetected}`);
  if (summary.build.tauri?.beforeDevCommand || summary.build.tauri?.beforeBuildCommand) {
    lines.push(`- Tauri beforeDevCommand: ${summary.build.tauri.beforeDevCommand || notDetected}`);
    lines.push(`- Tauri beforeBuildCommand: ${summary.build.tauri.beforeBuildCommand || notDetected}`);
  }
  lines.push('');
  lines.push('## Dependencies Overview');
  lines.push(`- Prod dependencies: ${summary.dependencies.prodCount}`);
  lines.push(`- Dev dependencies: ${summary.dependencies.devCount}`);
  lines.push(summary.dependencies.top.length ? `- Top: ${summary.dependencies.top.join(', ')}` : `- Top: ${notDetected}`);
  lines.push(summary.dependencies.lockfiles.length ? `- Lockfiles: ${summary.dependencies.lockfiles.join(', ')}` : `- Lockfiles: ${notDetected}`);
  lines.push('');
  lines.push('## Quality Signals');
  lines.push(`- Tests: ${summary.structure.hasTests ? 'Detected' : notDetected}`);
  lines.push(`- CI: ${summary.structure.hasCI ? 'Detected' : notDetected}`);
  lines.push(`- Docs: ${summary.structure.hasDocs ? 'Detected' : notDetected}`);
  lines.push(`- Docker: ${summary.structure.hasDocker ? 'Detected' : notDetected}`);
  lines.push('');
  lines.push('## Notes / Not detected');
  lines.push(`- ${notDetected}`);
  lines.push('');

  return `${lines.join('\n')}\n`;
}

export async function scanProject(projectPath: string, includeDataRoom = false): Promise<ScanArtifacts> {
  const topEntries = await collectTopLevelEntries(projectPath);
  const signals = detectSignals(topEntries);

  const packageJsonData = signals.packageJson ? await readJsonFile<any>(`${projectPath}/package.json`) : null;
  const composerJsonData = signals.composerJson ? await readJsonFile<any>(`${projectPath}/composer.json`) : null;
  const tauriConfigData =
    (await readJsonFile<any>(`${projectPath}/tauri.conf.json`)) ||
    (await readJsonFile<any>(`${projectPath}/src-tauri/tauri.conf.json`));

  const cargoData = signals.rust ? await readTextFile(`${projectPath}/Cargo.toml`) : null;
  const projectInfo = extractProjectInfo(projectPath, packageJsonData, cargoData);
  const projectType = detectProjectTypes(signals, packageJsonData);

  const topFolders = topEntries
    .filter((entry) => entry.isDirectory && entry.name && !entry.name.startsWith('.') && !DEFAULT_EXCLUDED_DIRS.has(entry.name))
    .map((entry) => entry.name as string)
    .sort((a, b) => a.localeCompare(b));

  const classified = await classifyFolders(projectPath);
  const quality = await detectQualitySignals(projectPath, packageJsonData, composerJsonData);
  const buildSignals = extractBuildSignals(packageJsonData, tauriConfigData);
  const entrypoints = await resolveEntrypoints(projectPath);
  const dependencies = extractDependencies(packageJsonData);
  const lockfiles = await detectLockfiles(projectPath);
  const fileTypes = await collectFileTypes(projectPath);
  const projectTree = await buildTree(projectPath);

  const summary: ScanSummary = {
    scanVersion: SCAN_VERSION,
    createdAt: new Date().toISOString(),
    projectType,
    signals,
    project: projectInfo,
    structure: {
      topFolders,
      classified,
      hasTests: quality.hasTests,
      hasCI: quality.hasCI,
      hasDocs: quality.hasDocs,
      hasDocker: quality.hasDocker,
    },
    build: {
      ...buildSignals,
      entrypoints,
    },
    dependencies: {
      prodCount: dependencies.prodCount,
      devCount: dependencies.devCount,
      top: normalizeTopDependencies(dependencies.top),
      lockfiles,
    },
    fileTypes,
  };

  const dependencyReport: DependencyReport = {
    prodCount: dependencies.prodCount,
    devCount: dependencies.devCount,
    top: normalizeTopDependencies(dependencies.top),
    lockfiles,
    npm: dependencies.npm,
    composer: composerJsonData
      ? {
          require: Object.keys(composerJsonData.require || {}),
          requireDev: Object.keys(composerJsonData['require-dev'] || {}),
        }
      : undefined,
  };

  const analysisDir = `${projectPath}/zenstudio/analysis`;
  const generatedDir = `${projectPath}/zenstudio/generated/DATA_ROOM`;
  await mkdir(analysisDir, { recursive: true });
  await writeTextFile(`${analysisDir}/scan_summary.json`, JSON.stringify(summary, null, 2));
  await writeTextFile(`${analysisDir}/project_tree.txt`, projectTree);
  await writeTextFile(`${analysisDir}/dependency_report.json`, JSON.stringify(dependencyReport, null, 2));

  let generatedDataRoomPath: string | undefined;
  if (includeDataRoom) {
    await mkdir(generatedDir, { recursive: true });
    generatedDataRoomPath = `${generatedDir}/10_project_analysis.md`;
    const markdown = generateProjectAnalysisMarkdown(summary);
    await writeTextFile(generatedDataRoomPath, markdown);
  }

  return {
    summary,
    dependencyReport,
    projectTree,
    analysisDir,
    generatedDataRoomPath,
  };
}
