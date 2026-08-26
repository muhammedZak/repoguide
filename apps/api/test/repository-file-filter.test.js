import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_MAX_CANDIDATE_FILE_SIZE,
  filterRepositoryFiles,
} from "../src/repository-file-filter.js";

function blob(path, size = 100) {
  return {
    path,
    type: "blob",
    mode: "100644",
    sha: `${path}-sha`,
    size,
  };
}

test("keeps normal source files as candidates", () => {
  const result = filterRepositoryFiles([blob("src/components/Button.tsx")]);

  assert.deepEqual(result.files, [
    {
      path: "src/components/Button.tsx",
      sha: "src/components/Button.tsx-sha",
      size: 100,
    },
  ]);
});

test("ignores files inside dependency and generated directories at any depth", () => {
  const paths = [
    "frontend/node_modules/package/index.js",
    "packages/app/.next/server.js",
    "packages/app/dist/bundle.js",
    "services/api/build/index.js",
    "packages/app/coverage/report.json",
    "backend/vendor/library.php",
    "frontend/out/index.html",
    "service/target/release/app",
    "frontend/.cache/data.json",
    "nested/.git/config",
    "nested/.github/workflows/ci.yml",
  ];
  const result = filterRepositoryFiles(paths.map((path) => blob(path)));

  assert.deepEqual(result.files, []);
  assert.equal(result.summary.ignoredByDirectory, paths.length);
});

test("keeps package.json and README.md", () => {
  const result = filterRepositoryFiles([
    blob("package.json"),
    blob("docs/README.md"),
  ]);

  assert.deepEqual(
    result.files.map((file) => file.path),
    ["package.json", "docs/README.md"],
  );
});

test("ignores common lockfiles", () => {
  const paths = [
    "package-lock.json",
    "frontend/yarn.lock",
    "pnpm-lock.yaml",
    "tools/bun.lockb",
  ];
  const result = filterRepositoryFiles(paths.map((path) => blob(path)));

  assert.deepEqual(result.files, []);
  assert.equal(result.summary.ignoredGenerated, paths.length);
});

test("ignores image files", () => {
  const result = filterRepositoryFiles([blob("public/logo.png")]);

  assert.equal(result.summary.ignoredByExtension, 1);
});

test("ignores archive files", () => {
  const result = filterRepositoryFiles([blob("fixtures/archive.zip")]);

  assert.equal(result.summary.ignoredByExtension, 1);
});

test("ignores compiled and binary files", () => {
  const paths = ["bin/app.exe", "lib/example.class", "data/cache.sqlite"];
  const result = filterRepositoryFiles(paths.map((path) => blob(path)));

  assert.deepEqual(result.files, []);
  assert.equal(result.summary.ignoredByExtension, paths.length);
});

test("ignores minified files and source maps", () => {
  const paths = ["public/app.min.js", "public/styles.min.css", "src/app.js.map"];
  const result = filterRepositoryFiles(paths.map((path) => blob(path)));

  assert.deepEqual(result.files, []);
  assert.equal(result.summary.ignoredGenerated, paths.length);
});

test("ignores source files over the default maximum size", () => {
  const result = filterRepositoryFiles([
    blob("src/large.ts", DEFAULT_MAX_CANDIDATE_FILE_SIZE + 1),
  ]);

  assert.deepEqual(result.files, []);
  assert.equal(result.summary.ignoredOversized, 1);
});

test("does not reject a source file solely because its size is unknown", () => {
  const result = filterRepositoryFiles([blob("src/unknown.ts", null)]);

  assert.deepEqual(result.files, [
    {
      path: "src/unknown.ts",
      sha: "src/unknown.ts-sha",
      size: null,
    },
  ]);
});

test("keeps useful extensionless developer files", () => {
  const result = filterRepositoryFiles([blob("Dockerfile"), blob("Makefile")]);

  assert.deepEqual(
    result.files.map((file) => file.path),
    ["Dockerfile", "Makefile"],
  );
});

test("never makes directories or submodules candidates", () => {
  const result = filterRepositoryFiles([
    {
      path: "src",
      type: "tree",
      mode: "040000",
      sha: "directory-sha",
      size: null,
    },
    {
      path: "vendor/example",
      type: "commit",
      mode: "160000",
      sha: "submodule-sha",
      size: null,
    },
  ]);

  assert.deepEqual(result.files, []);
  assert.equal(result.summary.totalFiles, 0);
});

test("counts every ignored file exactly once", () => {
  const result = filterRepositoryFiles([
    blob("src/app.ts"),
    blob("node_modules/package/logo.png"),
    blob("public/logo.png"),
    blob("package-lock.json"),
    blob("src/large.ts", DEFAULT_MAX_CANDIDATE_FILE_SIZE + 1),
  ]);

  assert.deepEqual(result.summary, {
    totalFiles: 5,
    candidateFiles: 1,
    ignoredFiles: 4,
    ignoredByDirectory: 1,
    ignoredByExtension: 1,
    ignoredGenerated: 1,
    ignoredOversized: 1,
  });
});
