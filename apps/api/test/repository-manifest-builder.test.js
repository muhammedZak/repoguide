import assert from "node:assert/strict";
import test from "node:test";

import { buildRepositoryManifest } from "../src/repository-manifest-builder.js";

const repository = {
  fullName: "example/project",
  language: "JavaScript",
};

function document(path, content, category = "source") {
  return {
    path,
    sha: `${path}-sha`,
    size: Buffer.byteLength(content),
    category,
    priority: "medium",
    score: 60,
    content,
  };
}

function packageDocument(path, value) {
  return document(path, JSON.stringify(value), "package-manifest");
}

function build(documents) {
  return buildRepositoryManifest({ repository, documents });
}

function findDependency(manifest, dependency) {
  return manifest.dependencies.find((item) => item.package === dependency);
}

function findTechnology(manifest, technology) {
  return manifest.technologies.find((item) => item.name === technology);
}

test("parses valid root and nested package manifests independently and compactly", () => {
  const result = build([
    packageDocument("apps/web/package.json", {
      name: "web",
      version: "1.0.0",
      private: true,
      scripts: { dev: "next dev", ignored: 42 },
      dependencies: { react: "^19.0.0" },
      description: "not needed in deterministic evidence",
    }),
    packageDocument("package.json", {
      name: "root",
      version: "2.0.0",
      scripts: { build: "npm run build --workspaces" },
      devDependencies: { typescript: "^5.0.0" },
    }),
  ]);

  assert.deepEqual(result.manifest.packageManifests, [
    {
      path: "apps/web/package.json",
      name: "web",
      version: "1.0.0",
      private: true,
      scripts: { dev: "next dev" },
      dependencies: { react: "^19.0.0" },
    },
    {
      path: "package.json",
      name: "root",
      version: "2.0.0",
      scripts: { build: "npm run build --workspaces" },
      devDependencies: { typescript: "^5.0.0" },
    },
  ]);
  assert.equal(result.summary.packageManifestCount, 2);
  assert.equal(result.summary.packageManifestsParsed, 2);
});

test("extracts every supported dependency section and preserves locations", () => {
  const result = build([
    packageDocument("package.json", {
      dependencies: { react: "^19.0.0", shared: "1.0.0" },
      devDependencies: { vite: "^7.0.0", shared: "2.0.0" },
      peerDependencies: { express: "^5.0.0" },
      optionalDependencies: { mongodb: "^6.0.0" },
    }),
    packageDocument("apps/api/package.json", {
      dependencies: { shared: "3.0.0" },
    }),
  ]);

  assert.deepEqual(
    result.manifest.dependencies.map(({ package: dependency }) => dependency),
    ["express", "mongodb", "react", "shared", "vite"],
  );
  assert.deepEqual(findDependency(result.manifest, "shared"), {
    package: "shared",
    locations: [
      {
        path: "apps/api/package.json",
        section: "dependencies",
        version: "3.0.0",
      },
      {
        path: "package.json",
        section: "dependencies",
        version: "1.0.0",
      },
      {
        path: "package.json",
        section: "devDependencies",
        version: "2.0.0",
      },
    ],
  });
  assert.equal(result.summary.dependencyCount, 5);
});

test("deduplicates repeated dependency evidence", () => {
  const duplicate = packageDocument("package.json", {
    dependencies: { react: "^19.0.0" },
  });
  const result = build([duplicate, { ...duplicate }]);

  assert.equal(result.manifest.dependencies.length, 1);
  assert.equal(result.manifest.dependencies[0].locations.length, 1);
});

test("reports mapped technologies only when dependency evidence exists", () => {
  const result = build([
    packageDocument("package.json", {
      dependencies: {
        express: "5",
        mongoose: "8",
        next: "16",
        react: "19",
        unrelated: "1",
      },
    }),
  ]);

  for (const [technology, dependency] of [
    ["React", "react"],
    ["Next.js", "next"],
    ["Express", "express"],
    ["Mongoose", "mongoose"],
  ]) {
    assert.deepEqual(findTechnology(result.manifest, technology), {
      name: technology,
      evidence: [{ path: "package.json", dependency }],
    });
  }

  assert.equal(findTechnology(result.manifest, "Vite"), undefined);
  assert.equal(findTechnology(result.manifest, "unrelated"), undefined);
  assert.equal(
    result.manifest.technologies.some(({ name }) => name.includes("MERN")),
    false,
  );
});

test("supports the centralized exact and prefix technology mappings", () => {
  const dependencies = {
    "@prisma/client": "1",
    "@supabase/client": "1",
    express: "1",
    mongodb: "1",
    mongoose: "1",
    next: "1",
    react: "1",
    tailwindcss: "1",
    typescript: "1",
    vite: "1",
  };
  const result = build([packageDocument("package.json", { dependencies })]);

  assert.deepEqual(
    result.manifest.technologies.map(({ name }) => name),
    [
      "Express",
      "MongoDB Driver",
      "Mongoose",
      "Next.js",
      "Prisma",
      "React",
      "Supabase",
      "Tailwind CSS",
      "TypeScript",
      "Vite",
    ],
  );
});

test("reports no technologies without dependency evidence", () => {
  const result = build([
    document("src/react.js", "// React is only filename text"),
    document("next.config.mjs", "throw new Error('not executed')", "configuration"),
  ]);

  assert.deepEqual(result.manifest.technologies, []);
});

test("collects configuration, deterministic entry-point, and documentation evidence", () => {
  const result = build([
    document("docs/GUIDE.mdx", "guide", "documentation"),
    document("src/server.js", "server", "entry-point"),
    document("apps/web/next.config.mjs", "config", "configuration"),
    document("README.md", "readme", "documentation"),
    document("apps/web/tsconfig.json", "{}", "configuration"),
    document("src/index.js", "not classified as entry point", "source"),
  ]);

  assert.deepEqual(result.manifest.configurationFiles, [
    "apps/web/next.config.mjs",
    "apps/web/tsconfig.json",
  ]);
  assert.deepEqual(result.manifest.entryPointCandidates, [
    {
      path: "src/server.js",
      reason: "deterministic filename/path classification",
    },
  ]);
  assert.deepEqual(result.manifest.documentationFiles, [
    "README.md",
    "docs/GUIDE.mdx",
  ]);
});

test("records declared workspace patterns with their package evidence", () => {
  const result = build([
    packageDocument("package.json", {
      workspaces: ["packages/*", "apps/*", "apps/*"],
    }),
    packageDocument("tools/package.json", {
      workspaces: { packages: ["plugins/*"] },
    }),
  ]);

  assert.deepEqual(result.manifest.workspaceEvidence, {
    declared: true,
    declarations: [
      { path: "package.json", patterns: ["apps/*", "packages/*"] },
      { path: "tools/package.json", patterns: ["plugins/*"] },
    ],
  });
});

test("does not fabricate workspace evidence from multiple package manifests", () => {
  const result = build([
    packageDocument("package.json", { name: "root" }),
    packageDocument("apps/web/package.json", { name: "web" }),
  ]);

  assert.deepEqual(result.manifest.workspaceEvidence, {
    declared: false,
    declarations: [],
  });
});

test("continues after malformed package manifests and records safe internal issues", () => {
  const result = build([
    document("broken/package.json", "{not valid", "package-manifest"),
    packageDocument("valid/package.json", {
      dependencies: { react: "19" },
    }),
  ]);

  assert.equal(result.manifest.packageManifests.length, 1);
  assert.equal(result.summary.packageManifestsParsed, 1);
  assert.equal(result.summary.packageManifestParseFailures, 1);
  assert.deepEqual(result.issues, [
    { path: "broken/package.json", type: "invalid-json" },
  ]);
  assert.equal("stack" in result.issues[0], false);
});

test("produces deterministic ordering without mutating inputs", () => {
  const documents = [
    document("z/README.md", "z", "documentation"),
    packageDocument("package.json", {
      dependencies: { zeta: "1", alpha: "1" },
    }),
    document("a/README.md", "a", "documentation"),
  ];
  const original = structuredClone(documents);

  const forward = build(documents);
  const reversed = build([...documents].reverse());

  assert.deepEqual(forward, reversed);
  assert.deepEqual(documents, original);
});

test("preserves repository identity and GitHub primary language evidence", () => {
  const result = build([]);

  assert.deepEqual(result.manifest.repository, {
    fullName: "example/project",
    primaryLanguage: "JavaScript",
  });
  assert.equal(result.summary.documentsAnalyzed, 0);
});

test("treats repository contents and package scripts only as inert data", () => {
  delete globalThis.__repoguideExecuted;
  const executableText = "globalThis.__repoguideExecuted = true";
  const result = build([
    packageDocument("package.json", {
      scripts: { postinstall: executableText },
    }),
    document("next.config.js", executableText, "configuration"),
  ]);

  assert.equal(globalThis.__repoguideExecuted, undefined);
  assert.equal(
    result.manifest.packageManifests[0].scripts.postinstall,
    executableText,
  );
});
