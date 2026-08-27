const DEPENDENCY_SECTIONS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
];

const TECHNOLOGY_DEPENDENCY_RULES = [
  { name: "Express", dependencies: ["express"] },
  { name: "MongoDB Driver", dependencies: ["mongodb"] },
  { name: "Mongoose", dependencies: ["mongoose"] },
  { name: "Next.js", dependencies: ["next"] },
  { name: "Prisma", dependencies: ["prisma", "@prisma/client"] },
  { name: "React", dependencies: ["react"] },
  { name: "Supabase", prefixes: ["@supabase/"] },
  { name: "Tailwind CSS", dependencies: ["tailwindcss"] },
  { name: "TypeScript", dependencies: ["typescript"] },
  { name: "Vite", dependencies: ["vite"] },
];

const CONFIGURATION_FILENAMES = new Set([
  ".env.example",
  ".eslintrc",
  ".prettierrc",
  "docker-compose.yaml",
  "docker-compose.yml",
  "dockerfile",
  "jsconfig.json",
  "makefile",
  "next.config.js",
  "next.config.mjs",
  "next.config.ts",
  "tsconfig.json",
  "vite.config.js",
  "vite.config.ts",
  "webpack.config.js",
]);

function compareStrings(left, right) {
  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
}

function compareDocuments(left, right) {
  return (
    compareStrings(left.path, right.path) ||
    compareStrings(left.sha ?? "", right.sha ?? "") ||
    compareStrings(left.content ?? "", right.content ?? "")
  );
}

function getFilename(path) {
  return path.split("/").at(-1).toLowerCase();
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function compactStringRecord(value) {
  if (!isPlainObject(value)) {
    return undefined;
  }

  const entries = Object.entries(value)
    .filter(([, entryValue]) => typeof entryValue === "string")
    .sort(([left], [right]) => compareStrings(left, right));

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function normalizeWorkspaces(value) {
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return [...new Set(value)].sort(compareStrings);
  }

  if (
    isPlainObject(value) &&
    Array.isArray(value.packages) &&
    value.packages.every((item) => typeof item === "string")
  ) {
    return [...new Set(value.packages)].sort(compareStrings);
  }

  return undefined;
}

function parsePackageManifest(document) {
  let value;

  try {
    value = JSON.parse(document.content);
  } catch {
    return { issue: { path: document.path, type: "invalid-json" } };
  }

  if (!isPlainObject(value)) {
    return { issue: { path: document.path, type: "invalid-root" } };
  }

  const packageManifest = { path: document.path };

  for (const field of ["name", "version"]) {
    if (typeof value[field] === "string") {
      packageManifest[field] = value[field];
    }
  }

  if (typeof value.private === "boolean") {
    packageManifest.private = value.private;
  }

  const scripts = compactStringRecord(value.scripts);

  if (scripts) {
    packageManifest.scripts = scripts;
  }

  for (const section of DEPENDENCY_SECTIONS) {
    const dependencies = compactStringRecord(value[section]);

    if (dependencies) {
      packageManifest[section] = dependencies;
    }
  }

  const workspaces = normalizeWorkspaces(value.workspaces);

  if (workspaces) {
    packageManifest.workspaces = workspaces;
  }

  return { packageManifest };
}

function collectDependencies(packageManifests) {
  const dependencyLocations = new Map();

  for (const packageManifest of packageManifests) {
    for (const section of DEPENDENCY_SECTIONS) {
      for (const [dependency, version] of Object.entries(
        packageManifest[section] ?? {},
      )) {
        if (!dependencyLocations.has(dependency)) {
          dependencyLocations.set(dependency, new Map());
        }

        const location = { path: packageManifest.path, section, version };
        const locationKey = `${location.path}\0${location.section}\0${location.version}`;

        dependencyLocations.get(dependency).set(locationKey, location);
      }
    }
  }

  return [...dependencyLocations.entries()]
    .sort(([left], [right]) => compareStrings(left, right))
    .map(([dependency, locations]) => ({
      package: dependency,
      locations: [...locations.values()].sort(
        (left, right) =>
          compareStrings(left.path, right.path) ||
          compareStrings(left.section, right.section) ||
          compareStrings(left.version, right.version),
      ),
    }));
}

function matchesTechnologyRule(dependency, rule) {
  return (
    rule.dependencies?.includes(dependency) ||
    rule.prefixes?.some((prefix) => dependency.startsWith(prefix))
  );
}

function collectTechnologies(dependencies) {
  return TECHNOLOGY_DEPENDENCY_RULES.map((rule) => {
    const evidence = dependencies
      .filter(({ package: dependency }) =>
        matchesTechnologyRule(dependency, rule),
      )
      .flatMap(({ package: dependency, locations }) =>
        locations.map(({ path }) => ({ path, dependency })),
      );
    const uniqueEvidence = new Map(
      evidence.map((item) => [`${item.path}\0${item.dependency}`, item]),
    );

    return {
      name: rule.name,
      evidence: [...uniqueEvidence.values()].sort(
        (left, right) =>
          compareStrings(left.path, right.path) ||
          compareStrings(left.dependency, right.dependency),
      ),
    };
  })
    .filter(({ evidence }) => evidence.length > 0)
    .sort((left, right) => compareStrings(left.name, right.name));
}

function isConfigurationFile(path) {
  const filename = getFilename(path);

  return (
    CONFIGURATION_FILENAMES.has(filename) ||
    filename.startsWith("eslint.config.") ||
    filename.startsWith("prettier.config.") ||
    filename.startsWith(".eslintrc.") ||
    filename.startsWith(".prettierrc.")
  );
}

function isDocumentationFile(document) {
  const filename = getFilename(document.path);

  return (
    document.category === "documentation" ||
    filename.endsWith(".md") ||
    filename.endsWith(".mdx")
  );
}

function uniqueSortedPaths(documents, predicate) {
  return [...new Set(documents.filter(predicate).map(({ path }) => path))].sort(
    compareStrings,
  );
}

function collectWorkspaceEvidence(packageManifests) {
  const declarations = packageManifests
    .filter(({ workspaces }) => workspaces !== undefined)
    .map(({ path, workspaces }) => ({ path, patterns: workspaces }));

  return {
    declared: declarations.length > 0,
    declarations,
  };
}

export function buildRepositoryManifest({ repository, documents }) {
  const sortedDocuments = [...documents].sort(compareDocuments);
  const packageManifests = [];
  const issues = [];

  for (const document of sortedDocuments) {
    if (getFilename(document.path) !== "package.json") {
      continue;
    }

    const result = parsePackageManifest(document);

    if (result.issue) {
      issues.push(result.issue);
    } else {
      packageManifests.push(result.packageManifest);
    }
  }

  const dependencies = collectDependencies(packageManifests);
  const technologies = collectTechnologies(dependencies);
  const configurationFiles = uniqueSortedPaths(
    sortedDocuments,
    ({ path }) => isConfigurationFile(path),
  );
  const entryPointCandidates = uniqueSortedPaths(
    sortedDocuments,
    ({ category }) => category === "entry-point",
  ).map((path) => ({
    path,
    reason: "deterministic filename/path classification",
  }));
  const documentationFiles = uniqueSortedPaths(
    sortedDocuments,
    isDocumentationFile,
  );
  const manifest = {
    repository: {
      fullName: repository.fullName,
      primaryLanguage: repository.language,
    },
    packageManifests,
    dependencies,
    technologies,
    configurationFiles,
    entryPointCandidates,
    documentationFiles,
    workspaceEvidence: collectWorkspaceEvidence(packageManifests),
  };

  return {
    manifest,
    summary: {
      documentsAnalyzed: documents.length,
      packageManifestCount: packageManifests.length + issues.length,
      packageManifestsParsed: packageManifests.length,
      packageManifestParseFailures: issues.length,
      dependencyCount: dependencies.length,
      technologyEvidenceCount: technologies.length,
      configurationFileCount: configurationFiles.length,
      entryPointCandidateCount: entryPointCandidates.length,
      documentationFileCount: documentationFiles.length,
    },
    issues,
  };
}
