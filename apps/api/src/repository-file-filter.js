export const DEFAULT_MAX_CANDIDATE_FILE_SIZE = 500 * 1024;

const IGNORED_DIRECTORIES = new Set([
  "node_modules",
  ".next",
  "dist",
  "build",
  "coverage",
  "vendor",
  "out",
  "target",
  ".cache",
  ".git",
  ".github",
]);

const IGNORED_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".svg",
  ".mp3",
  ".wav",
  ".mp4",
  ".mov",
  ".webm",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".zip",
  ".tar",
  ".gz",
  ".rar",
  ".7z",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".class",
  ".jar",
  ".pyc",
  ".sqlite",
  ".db",
];

const IGNORED_FILENAMES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
]);

function hasIgnoredDirectory(path) {
  const directorySegments = path.toLowerCase().split("/").slice(0, -1);

  return directorySegments.some((segment) =>
    IGNORED_DIRECTORIES.has(segment),
  );
}

function hasIgnoredExtension(path) {
  const normalizedPath = path.toLowerCase();

  return IGNORED_EXTENSIONS.some((extension) =>
    normalizedPath.endsWith(extension),
  );
}

function isGeneratedFile(path) {
  const normalizedPath = path.toLowerCase();
  const filename = normalizedPath.split("/").at(-1);

  return (
    IGNORED_FILENAMES.has(filename) ||
    normalizedPath.endsWith(".min.js") ||
    normalizedPath.endsWith(".min.css") ||
    normalizedPath.endsWith(".map")
  );
}

export function filterRepositoryFiles(
  tree,
  { maxFileSize = DEFAULT_MAX_CANDIDATE_FILE_SIZE } = {},
) {
  const files = [];
  const summary = {
    totalFiles: 0,
    candidateFiles: 0,
    ignoredFiles: 0,
    ignoredByDirectory: 0,
    ignoredByExtension: 0,
    ignoredGenerated: 0,
    ignoredOversized: 0,
  };

  for (const entry of tree) {
    if (entry.type !== "blob") {
      continue;
    }

    summary.totalFiles += 1;

    if (hasIgnoredDirectory(entry.path)) {
      summary.ignoredByDirectory += 1;
      continue;
    }

    if (hasIgnoredExtension(entry.path)) {
      summary.ignoredByExtension += 1;
      continue;
    }

    if (isGeneratedFile(entry.path)) {
      summary.ignoredGenerated += 1;
      continue;
    }

    if (entry.size !== null && entry.size > maxFileSize) {
      summary.ignoredOversized += 1;
      continue;
    }

    files.push({
      path: entry.path,
      sha: entry.sha,
      size: entry.size,
    });
  }

  summary.candidateFiles = files.length;
  summary.ignoredFiles = summary.totalFiles - summary.candidateFiles;

  return { files, summary };
}
