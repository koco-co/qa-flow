/**
 * init-wizard.mjs
 * Core I/O script for the init wizard.
 *
 * Sub-commands:
 *   --command scan [--root-dir <path>]    Scan project directory for module structure signals
 *   --command parse-file --path <file>    Parse a CSV/XMind history file for module candidates
 *   --command write --config-json <json> [--claude-md <content>] [--root-dir <path>]
 *                                         Write .claude/config.json and optional CLAUDE.md
 *   --command load-existing [--root-dir <path>]
 *                                         Load existing .claude/config.json for re-init
 *   --command render-template --template-path <path> --replacements <json>
 *                                         Render CLAUDE.md template placeholders
 *
 * INIT-01: Automatic project structure inference
 * INIT-02: CSV/XMind history file parsing
 * INIT-03: Multi-version detection (versioned: true/false)
 * INIT-04: CLAUDE.md template generation
 * INIT-05: config.json generation and re-init support
 *
 * scan and parse are READ-ONLY (D-03). write/load/render support the init wizard write layer.
 *
 * Exports: scanProject, parseHistoryFile, inferModuleKeyFromFilename,
 * buildConfigObject, writeOutputs, loadExistingConfig, renderTemplate, mergeConfigGroups
 */
import { readdirSync, statSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, basename, resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfigFromPath } from '../../../shared/scripts/load-config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Infer a module key from a history filename by stripping:
 * - date prefix: /^\d{6,8}[-_]/
 * - version suffix: /[-_]?v?\d+[\d.]*$/i
 * - file extension (.csv, .xmind, etc.)
 * @param {string} filename - Bare filename (no directory)
 * @returns {string} Cleaned module key
 */
export function inferModuleKeyFromFilename(filename) {
  // Strip extension
  let name = filename.replace(/\.[^.]+$/, '');
  // Strip date prefix (6-8 digits followed by - or _)
  name = name.replace(/^\d{6,8}[-_]/, '');
  // Strip version suffix (optional separator, optional 'v', digits with dots)
  name = name.replace(/[-_]?v?\d+[\d.]*$/i, '');
  return name.trim();
}

/**
 * Recursively find files matching given extensions under a directory.
 * Returns paths relative to the given directory.
 * @param {string} dir - Absolute directory path to search
 * @param {string[]} extensions - Array of extensions (e.g. ['.csv', '.xmind'])
 * @param {string} [relativeBase=''] - Internal: relative path accumulator
 * @returns {{ path: string, type: string }[]}
 */
function findFilesRecursive(dir, extensions, relativeBase = '') {
  const results = [];
  if (!existsSync(dir)) return results;

  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const relativePath = relativeBase ? `${relativeBase}/${entry.name}` : entry.name;
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(...findFilesRecursive(fullPath, extensions, relativePath));
    } else if (entry.isFile()) {
      const ext = extname(entry.name).toLowerCase();
      if (extensions.includes(ext)) {
        results.push({ path: relativePath, type: ext });
      }
    }
  }
  return results;
}

/**
 * Extract unique directory names (non-file entries) from a directory.
 * @param {string} dir - Absolute path
 * @returns {string[]} Directory entry names
 */
function listSubdirectories(dir) {
  if (!existsSync(dir)) return [];
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name);
  } catch {
    return [];
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Config build/write helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Build a full config.json object from wizard-collected groups.
 * @param {object} params
 * @param {string} params.projectName
 * @param {string} [params.displayName]
 * @param {string} [params.casesRoot]
 * @param {object} [params.modules]
 * @param {object} [params.repos]
 * @param {string|null} [params.branchMapping]
 * @param {object} [params.stackTrace]
 * @param {boolean} [params.hasLanhuMcp]
 * @param {object} [params.lanhuMcpConfig]
 * @returns {object}
 */
export function buildConfigObject({
  projectName,
  displayName,
  casesRoot,
  modules,
  repos,
  branchMapping,
  stackTrace,
  hasLanhuMcp,
  lanhuMcpConfig,
}) {
  const defaultLanhuMcp = {
    runtimePath: 'tools/lanhu-mcp/',
    envFile: 'tools/lanhu-mcp/.env',
    setupScript: 'tools/lanhu-mcp/setup-env.sh',
    quickstartScript: 'tools/lanhu-mcp/quickstart.sh',
    entryScript: 'tools/lanhu-mcp/lanhu_mcp_server.py',
    serverHost: '127.0.0.1',
    serverPort: 8000,
    serverUrl: 'http://127.0.0.1:8000',
    mcpPath: '/mcp',
    logFile: '.claude/tmp/lanhu-mcp.log',
    cookieRefreshScript: '.claude/skills/using-qa-flow/scripts/refresh-lanhu-cookie.py',
  };

  return {
    project: {
      name: projectName,
      displayName: displayName || projectName,
    },
    casesRoot: casesRoot || 'cases/',
    modules: modules || {},
    repos: repos || {},
    stackTrace: stackTrace || {},
    branchMapping: branchMapping || null,
    trash: {
      dir: '.trash/',
      retentionDays: 30,
    },
    assets: {
      images: 'assets/images/',
    },
    reports: {
      bugs: 'reports/bugs/',
      conflicts: 'reports/conflicts/',
    },
    integrations: {
      lanhuMcp: hasLanhuMcp && lanhuMcpConfig
        ? { ...defaultLanhuMcp, ...lanhuMcpConfig }
        : defaultLanhuMcp,
    },
    shortcuts: {
      latestXmind: 'latest-output.xmind',
      latestEnhancedPrd: 'latest-prd-enhanced.md',
      latestBugReport: 'latest-bug-report.html',
      latestConflictReport: 'latest-conflict-report.html',
    },
  };
}

/**
 * Validate the generated config before writing it to disk.
 * @param {object} config
 */
function validateConfig(config) {
  const checks = [
    ['project', config.project],
    ['project.name', config.project?.name],
    ['modules', config.modules],
    ['casesRoot', config.casesRoot],
    ['repos', config.repos],
    ['stackTrace', config.stackTrace],
    ['trash', config.trash],
    ['assets', config.assets],
    ['reports', config.reports],
    ['integrations', config.integrations],
    ['shortcuts', config.shortcuts],
  ];

  for (const [fieldPath, value] of checks) {
    if (value === undefined || value === null || value === '') {
      throw new Error(`Generated config missing required field: "${fieldPath}". Check wizard inputs.`);
    }
  }

  if (!Object.prototype.hasOwnProperty.call(config, 'branchMapping')) {
    throw new Error('Generated config missing required field: "branchMapping". Check wizard inputs.');
  }
}

/**
 * Write config.json and optional CLAUDE.md output files.
 * @param {object} options
 * @param {string|object} options.configJson
 * @param {string|null} [options.claudeMdContent]
 * @param {string} [options.rootDir]
 * @returns {{ configPath: string, claudeMdPath: string | null }}
 */
export function writeOutputs({ configJson, claudeMdContent = null, rootDir = process.cwd() }) {
  if (configJson === undefined || configJson === null) {
    throw new Error('configJson is required for write operation.');
  }

  let config;
  if (typeof configJson === 'string') {
    try {
      config = JSON.parse(configJson);
    } catch (err) {
      throw new Error(`Invalid configJson: ${err.message}`);
    }
  } else {
    config = configJson;
  }

  validateConfig(config);

  const absRoot = resolve(rootDir);
  const claudeDir = join(absRoot, '.claude');
  const configPath = join(claudeDir, 'config.json');
  const claudeMdPath = join(absRoot, 'CLAUDE.md');

  mkdirSync(claudeDir, { recursive: true });
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

  if (claudeMdContent !== null && claudeMdContent !== undefined) {
    writeFileSync(claudeMdPath, claudeMdContent, 'utf8');
  }

  return {
    configPath,
    claudeMdPath: claudeMdContent !== null && claudeMdContent !== undefined ? claudeMdPath : null,
  };
}

/**
 * Load the existing config.json for re-init flows.
 * Returns null if the file does not exist or cannot be parsed.
 * @param {string} [rootDir]
 * @returns {object | null}
 */
export function loadExistingConfig(rootDir = process.cwd()) {
  const configPath = join(resolve(rootDir), '.claude', 'config.json');
  if (!existsSync(configPath)) {
    return null;
  }

  try {
    return loadConfigFromPath(configPath);
  } catch {
    try {
      return JSON.parse(readFileSync(configPath, 'utf8'));
    } catch {
      return null;
    }
  }
}

/**
 * Render a CLAUDE.md template by replacing all provided placeholders.
 * Throws if unreplaced placeholders remain.
 * @param {string} templatePath
 * @param {Record<string, string>} replacements
 * @returns {string}
 */
export function renderTemplate(templatePath, replacements) {
  let content = readFileSync(resolve(templatePath), 'utf8');

  for (const [placeholder, value] of Object.entries(replacements || {})) {
    content = content.replaceAll(placeholder, String(value));
  }

  const remaining = content.match(/\{\{[A-Z_]+\}\}/g);
  if (remaining) {
    throw new Error(`Unreplaced placeholders: ${remaining.join(', ')}`);
  }

  return content;
}

/**
 * Merge only the selected wizard groups into an existing config.
 * Selected groups fully replace their mapped top-level fields.
 * @param {object} existing
 * @param {object} updated
 * @param {string[]} selectedGroups
 * @returns {object}
 */
export function mergeConfigGroups(existing, updated, selectedGroups) {
  const GROUP_FIELDS = {
    basic: ['project', 'casesRoot'],
    modules: ['modules'],
    repos: ['repos', 'branchMapping', 'stackTrace'],
    integrations: ['integrations'],
    shortcuts: ['shortcuts', 'trash', 'assets', 'reports'],
  };

  const merged = { ...(existing || {}) };
  const nextConfig = updated || {};

  for (const group of selectedGroups || []) {
    for (const field of GROUP_FIELDS[group] || []) {
      if (Object.prototype.hasOwnProperty.call(nextConfig, field)) {
        merged[field] = nextConfig[field];
      } else {
        delete merged[field];
      }
    }
  }

  return merged;
}

// ────────────────────────────────────────────────────────────────────────────
// scanProject
// ────────────────────────────────────────────────────────────────────────────

/**
 * Scan a project directory and infer module structure + 5 signals.
 * This function is READ-ONLY — never calls writeFileSync or mkdirSync.
 *
 * @param {string} rootDir - Absolute path to project root
 * @returns {{ modules: object[], signals: object }}
 */
export function scanProject(rootDir) {
  const absRoot = resolve(rootDir);
  const casesDir = join(absRoot, 'cases');
  const hasCasesDir = existsSync(casesDir) && statSync(casesDir).isDirectory();

  // Track module keys to avoid duplicates; key → module object
  const moduleMap = new Map();

  // ── Signal 1: Scan cases/xmind/ for module keys ──────────────────────────
  const xmindDir = join(casesDir, 'xmind');
  const xmindSubdirs = listSubdirectories(xmindDir);

  for (const key of xmindSubdirs) {
    const moduleDir = join(xmindDir, key);
    const versionSubdirs = listSubdirectories(moduleDir).filter(d => /^v\d+/.test(d));
    const versioned = versionSubdirs.length > 0;

    moduleMap.set(key, {
      key,
      versioned,
      inferredFrom: 'cases/xmind',
      paths: {
        xmind: `cases/xmind/${key}/`,
      },
    });
  }

  // Also scan cases/archive/ for additional module keys
  const archiveDir = join(casesDir, 'archive');
  const archiveSubdirs = listSubdirectories(archiveDir);
  for (const key of archiveSubdirs) {
    if (!moduleMap.has(key)) {
      moduleMap.set(key, {
        key,
        versioned: false,
        inferredFrom: 'cases/archive',
        paths: {
          archive: `cases/archive/${key}/`,
        },
      });
    } else {
      // Enrich existing module with archive path
      const mod = moduleMap.get(key);
      mod.paths.archive = `cases/archive/${key}/`;
    }
  }

  // Also scan cases/requirements/ for additional module keys
  const reqDir = join(casesDir, 'requirements');
  const reqSubdirs = listSubdirectories(reqDir);
  for (const key of reqSubdirs) {
    if (!moduleMap.has(key)) {
      moduleMap.set(key, {
        key,
        versioned: false,
        inferredFrom: 'cases/requirements',
        paths: {
          requirements: `cases/requirements/${key}/`,
        },
      });
    } else {
      const mod = moduleMap.get(key);
      mod.paths.requirements = `cases/requirements/${key}/`;
    }
  }

  const modules = Array.from(moduleMap.values());

  // ── Signal 2: .repos/ directory ──────────────────────────────────────────
  const hasReposDir = existsSync(join(absRoot, '.repos')) &&
    statSync(join(absRoot, '.repos')).isDirectory();

  // ── Signal 3: assets/images/ contains image files ────────────────────────
  const imagesDir = join(absRoot, 'assets', 'images');
  let hasImages = false;
  if (existsSync(imagesDir)) {
    try {
      const imageFiles = readdirSync(imagesDir);
      hasImages = imageFiles.some(f => /\.(png|jpg|jpeg|gif|webp)$/i.test(f));
    } catch {
      hasImages = false;
    }
  }

  // ── Signal 4: history files under cases/history/ ─────────────────────────
  const historyDir = join(casesDir, 'history');
  const historyFiles = findFilesRecursive(historyDir, ['.csv', '.xmind']);

  // ── Signal 5: PRD version patterns from cases/requirements/ ──────────────
  const prdVersionPatterns = [];
  if (existsSync(reqDir)) {
    const versionRegex = /\bv(\d+\.\d+\.\d+)\b/i;
    const allReqFiles = findFilesRecursive(reqDir, ['.md', '.txt', '.pdf', '.doc', '.docx']);
    const seenVersions = new Set();

    // Also check directory names for version patterns
    function scanDirsForVersions(dir) {
      if (!existsSync(dir)) return;
      try {
        const entries = readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const match = entry.name.match(versionRegex);
            if (match && !seenVersions.has(`v${match[1]}`)) {
              seenVersions.add(`v${match[1]}`);
              prdVersionPatterns.push(`v${match[1]}`);
            }
            scanDirsForVersions(join(dir, entry.name));
          }
        }
      } catch { /* ignore */ }
    }
    scanDirsForVersions(reqDir);

    for (const file of allReqFiles) {
      const match = file.path.match(versionRegex);
      if (match && !seenVersions.has(`v${match[1]}`)) {
        seenVersions.add(`v${match[1]}`);
        prdVersionPatterns.push(`v${match[1]}`);
      }
    }
  }

  // ── Re-init check: existing config.json ──────────────────────────────────
  let existingConfig = null;
  const configPath = join(absRoot, '.claude', 'config.json');
  if (existsSync(configPath)) {
    try {
      existingConfig = JSON.parse(readFileSync(configPath, 'utf8'));
    } catch {
      existingConfig = null;
    }
  }

  return {
    modules,
    signals: {
      hasCasesDir,
      hasReposDir,
      hasImages,
      historyFiles,
      prdVersionPatterns,
      existingConfig,
    },
  };
}

// ────────────────────────────────────────────────────────────────────────────
// parseHistoryFile
// ────────────────────────────────────────────────────────────────────────────

/**
 * Parse a CSV or XMind history file and extract module key candidates.
 * This function is READ-ONLY — never calls writeFileSync or mkdirSync.
 *
 * @param {string} filePath - Absolute path to the history file
 * @returns {Promise<{ candidates: string[], source: string }>}
 */
export async function parseHistoryFile(filePath) {
  const ext = extname(filePath).toLowerCase();
  const filenameCandidate = inferModuleKeyFromFilename(basename(filePath));

  if (ext === '.csv') {
    return parseCSVFile(filePath, filenameCandidate);
  } else if (ext === '.xmind') {
    return parseXMindFile(filePath, filenameCandidate);
  } else {
    throw new Error(`Unsupported history file format: "${ext}". Supported formats: .csv, .xmind`);
  }
}

/**
 * Parse CSV file: extract first header field + filename-derived candidate.
 * @param {string} filePath
 * @param {string} filenameCandidate
 * @returns {{ candidates: string[], source: string }}
 */
function parseCSVFile(filePath, filenameCandidate) {
  let raw = readFileSync(filePath, 'utf8');
  // Strip BOM
  raw = raw.replace(/^\uFEFF/, '');

  let headerCandidate = null;
  // Extract first line's first comma-separated field
  const firstLine = raw.split(/\r?\n/)[0] || '';
  if (firstLine) {
    // Handle quoted fields
    const match = firstLine.match(/^"([^"]*)"/) || firstLine.match(/^([^,]*)/);
    if (match && match[1]) {
      headerCandidate = match[1].trim();
    }
  }

  const candidates = [headerCandidate, filenameCandidate].filter(Boolean);
  // Deduplicate
  const unique = [...new Set(candidates)];
  return { candidates: unique, source: 'csv' };
}

/**
 * Parse XMind file: extract root topic title + filename-derived candidate.
 * Uses dynamic import for JSZip (only loaded when needed).
 * Handles content.json (primary) and content.xml (fallback) per Pitfall 4.
 * @param {string} filePath
 * @param {string} filenameCandidate
 * @returns {Promise<{ candidates: string[], source: string }>}
 */
async function parseXMindFile(filePath, filenameCandidate) {
  const { default: JSZip } = await import('jszip');
  const buf = readFileSync(filePath);
  const zip = await JSZip.loadAsync(buf);

  let rootTitle = null;

  // Try content.json first
  const contentJsonFile = zip.file('content.json');
  if (contentJsonFile) {
    try {
      const jsonText = await contentJsonFile.async('string');
      const sheets = JSON.parse(jsonText);
      // Extract root topic title from first sheet
      if (Array.isArray(sheets) && sheets.length > 0) {
        rootTitle = sheets[0]?.rootTopic?.title || null;
      }
    } catch {
      rootTitle = null;
    }
  }

  // Fallback to content.xml
  if (!rootTitle) {
    const contentXmlFile = zip.file('content.xml');
    if (contentXmlFile) {
      try {
        const xmlText = await contentXmlFile.async('string');
        // Extract first <title> from topic node
        const titleMatch = xmlText.match(/<title>([^<]+)<\/title>/);
        if (titleMatch) {
          rootTitle = titleMatch[1].trim();
        }
      } catch {
        rootTitle = null;
      }
    }
  }

  const candidates = [rootTitle, filenameCandidate].filter(Boolean);
  const unique = [...new Set(candidates)];
  return { candidates: unique, source: 'xmind' };
}

// ────────────────────────────────────────────────────────────────────────────
// CLI Router
// ────────────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--command' && argv[i + 1]) {
      args.command = argv[++i];
    } else if (argv[i] === '--root-dir' && argv[i + 1]) {
      args.rootDir = argv[++i];
    } else if (argv[i] === '--path' && argv[i + 1]) {
      args.path = argv[++i];
    } else if (argv[i] === '--config-json' && argv[i + 1]) {
      args.configJson = argv[++i];
    } else if (argv[i] === '--claude-md' && argv[i + 1]) {
      args.claudeMd = argv[++i];
    } else if (argv[i] === '--template-path' && argv[i + 1]) {
      args.templatePath = argv[++i];
    } else if (argv[i] === '--replacements' && argv[i + 1]) {
      args.replacements = argv[++i];
    }
  }
  return args;
}

function printUsage() {
  console.error(`Usage:
  node init-wizard.mjs --command scan [--root-dir <path>]
  node init-wizard.mjs --command parse-file --path <file-path>
  node init-wizard.mjs --command write --config-json <json> [--claude-md <content>] [--root-dir <path>]
  node init-wizard.mjs --command load-existing [--root-dir <path>]
  node init-wizard.mjs --command render-template --template-path <path> --replacements <json>

Sub-commands:
  scan         Scan project directory for module structure and signals
  parse-file   Parse a CSV/XMind history file for module key candidates
  write        Write .claude/config.json and optional CLAUDE.md
  load-existing Load the current .claude/config.json for re-init
  render-template Render CLAUDE.md template placeholders
`);
}

// Only run CLI when executed directly (not imported)
const isMain = process.argv[1] &&
  resolve(process.argv[1]) === resolve(__filename);

if (isMain) {
  const args = parseArgs(process.argv);

  if (!args.command) {
    printUsage();
    process.exit(1);
  }

  switch (args.command) {
    case 'scan': {
      const rootDir = args.rootDir || process.cwd();
      const result = scanProject(rootDir);
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    case 'parse-file': {
      if (!args.path) {
        console.error('Error: --path is required for parse-file command');
        process.exit(1);
      }
      const absPath = resolve(args.path);
      if (!existsSync(absPath)) {
        console.error(`Error: file not found: ${absPath}`);
        process.exit(1);
      }
      parseHistoryFile(absPath).then(result => {
        console.log(JSON.stringify(result, null, 2));
      }).catch(err => {
        console.error(`Error parsing file: ${err.message}`);
        process.exit(1);
      });
      break;
    }
    case 'write': {
      if (!args.configJson) {
        console.error('Error: --config-json is required for write command');
        process.exit(1);
      }

      try {
        const result = writeOutputs({
          configJson: args.configJson,
          claudeMdContent: args.claudeMd,
          rootDir: args.rootDir,
        });
        console.log(JSON.stringify(result, null, 2));
      } catch (err) {
        console.error(`Error writing outputs: ${err.message}`);
        process.exit(1);
      }
      break;
    }
    case 'load-existing': {
      const result = loadExistingConfig(args.rootDir || process.cwd());
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    case 'render-template': {
      if (!args.templatePath) {
        console.error('Error: --template-path is required for render-template command');
        process.exit(1);
      }
      if (!args.replacements) {
        console.error('Error: --replacements is required for render-template command');
        process.exit(1);
      }

      try {
        const replacements = JSON.parse(args.replacements);
        const rendered = renderTemplate(args.templatePath, replacements);
        process.stdout.write(rendered);
      } catch (err) {
        console.error(`Error rendering template: ${err.message}`);
        process.exit(1);
      }
      break;
    }
    default: {
      console.error(`Unknown command: "${args.command}"`);
      printUsage();
      process.exit(1);
    }
  }
}
