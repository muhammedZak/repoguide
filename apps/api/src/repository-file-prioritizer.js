export const DEFAULT_MAX_INSPECTION_FILES = 80;

const SCORE_RULES = {
  category: {
    "package-manifest": 100,
    configuration: 90,
    "entry-point": 80,
    source: 60,
    documentation: 40,
    test: 30,
    other: 20,
  },
  readmeBonus: 50,
  sourceDirectoryBonus: 10,
  depthPenaltyPerLevel: 2,
  maximumDepthPenalty: 20,
  highPriorityMinimum: 75,
  mediumPriorityMinimum: 45,
};

const CONFIGURATION_FILENAMES = new Set([
  "dockerfile",
  "docker-compose.yml",
  "docker-compose.yaml",
  "makefile",
  "tsconfig.json",
  "jsconfig.json",
  "next.config.js",
  "next.config.mjs",
  "next.config.ts",
  "vite.config.js",
  "vite.config.ts",
  "webpack.config.js",
  ".eslintrc",
  ".prettierrc",
  ".env.example",
]);

const ENTRY_POINT_FILENAMES = new Set([
  "index.js",
  "index.ts",
  "index.jsx",
  "index.tsx",
  "main.js",
  "main.ts",
  "main.jsx",
  "main.tsx",
  "server.js",
  "server.ts",
  "app.js",
  "app.ts",
]);

const SOURCE_DIRECTORIES = new Set([
  "src",
  "app",
  "server",
  "api",
  "routes",
  "controllers",
  "models",
  "services",
  "components",
  "lib",
  "utils",
  "middleware",
]);

const TEST_DIRECTORIES = new Set(["test", "tests", "__tests__"]);

const SOURCE_EXTENSIONS = [
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".py",
  ".java",
  ".go",
  ".rs",
  ".php",
  ".rb",
  ".cs",
  ".sql",
  ".graphql",
  ".gql",
  ".css",
  ".scss",
  ".html",
];

const TEST_SUFFIXES = [
  ".test.js",
  ".test.ts",
  ".test.jsx",
  ".test.tsx",
  ".spec.js",
  ".spec.ts",
  ".spec.jsx",
  ".spec.tsx",
];

function getPathDetails(path) {
  const segments = path.toLowerCase().split("/");

  return {
    depth: segments.length - 1,
    directories: segments.slice(0, -1),
    filename: segments.at(-1),
    normalizedPath: segments.join("/"),
  };
}

function isConfigurationFile(filename) {
  return (
    CONFIGURATION_FILENAMES.has(filename) ||
    filename.startsWith("eslint.config.") ||
    filename.startsWith("prettier.config.") ||
    filename.startsWith(".eslintrc.") ||
    filename.startsWith(".prettierrc.")
  );
}

function isTestFile(pathDetails) {
  return (
    pathDetails.directories.some((directory) =>
      TEST_DIRECTORIES.has(directory),
    ) ||
    TEST_SUFFIXES.some((suffix) => pathDetails.normalizedPath.endsWith(suffix))
  );
}

function isDocumentationFile(filename) {
  return filename.endsWith(".md") || filename.endsWith(".mdx");
}

function isReadme(filename) {
  return filename === "readme.md" || filename === "readme.mdx";
}

function isSourceFile(pathDetails) {
  return (
    pathDetails.directories.some((directory) =>
      SOURCE_DIRECTORIES.has(directory),
    ) ||
    SOURCE_EXTENSIONS.some((extension) =>
      pathDetails.normalizedPath.endsWith(extension),
    )
  );
}

function classifyFile(pathDetails) {
  if (isTestFile(pathDetails)) {
    return "test";
  }

  if (pathDetails.filename === "package.json") {
    return "package-manifest";
  }

  if (isConfigurationFile(pathDetails.filename)) {
    return "configuration";
  }

  if (ENTRY_POINT_FILENAMES.has(pathDetails.filename)) {
    return "entry-point";
  }

  if (isDocumentationFile(pathDetails.filename)) {
    return "documentation";
  }

  if (isSourceFile(pathDetails)) {
    return "source";
  }

  return "other";
}

function scoreFile(category, pathDetails) {
  let score = SCORE_RULES.category[category];

  if (isReadme(pathDetails.filename)) {
    score += SCORE_RULES.readmeBonus;
  }

  if (
    ["entry-point", "source"].includes(category) &&
    pathDetails.directories.some((directory) =>
      SOURCE_DIRECTORIES.has(directory),
    )
  ) {
    score += SCORE_RULES.sourceDirectoryBonus;
  }

  score -= Math.min(
    pathDetails.depth * SCORE_RULES.depthPenaltyPerLevel,
    SCORE_RULES.maximumDepthPenalty,
  );

  return score;
}

function getPriority(score) {
  if (score >= SCORE_RULES.highPriorityMinimum) {
    return "high";
  }

  if (score >= SCORE_RULES.mediumPriorityMinimum) {
    return "medium";
  }

  return "low";
}

function comparePrioritizedFiles(left, right) {
  if (left.score !== right.score) {
    return right.score - left.score;
  }

  if (left.path !== right.path) {
    return left.path < right.path ? -1 : 1;
  }

  if (left.sha !== right.sha) {
    return left.sha < right.sha ? -1 : 1;
  }

  return 0;
}

export function prioritizeRepositoryFiles(
  candidateFiles,
  { maxInspectionFiles = DEFAULT_MAX_INSPECTION_FILES } = {},
) {
  if (!Number.isInteger(maxInspectionFiles) || maxInspectionFiles < 0) {
    throw new TypeError("maxInspectionFiles must be a non-negative integer");
  }

  const files = candidateFiles
    .map((file) => {
      const pathDetails = getPathDetails(file.path);
      const category = classifyFile(pathDetails);
      const score = scoreFile(category, pathDetails);

      return {
        ...file,
        category,
        priority: getPriority(score),
        score,
      };
    })
    .sort(comparePrioritizedFiles);
  const selectedFiles = files.slice(0, maxInspectionFiles);

  return {
    files,
    selectedFiles,
    summary: {
      totalCandidateFiles: files.length,
      selectedFiles: selectedFiles.length,
      highPriorityFiles: files.filter((file) => file.priority === "high")
        .length,
      mediumPriorityFiles: files.filter((file) => file.priority === "medium")
        .length,
      lowPriorityFiles: files.filter((file) => file.priority === "low").length,
    },
  };
}
