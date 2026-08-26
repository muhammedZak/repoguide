import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_MAX_INSPECTION_FILES,
  prioritizeRepositoryFiles,
} from "../src/repository-file-prioritizer.js";

function candidate(path, size = 100) {
  return {
    path,
    sha: `${path}-sha`,
    size,
  };
}

test("gives package manifests high priority at any monorepo depth", () => {
  const result = prioritizeRepositoryFiles([
    candidate("examples/demo/legacy/package.json"),
    candidate("apps/web/package.json"),
    candidate("package.json"),
    candidate("packages/ui/package.json"),
  ]);

  assert.deepEqual(
    result.files.map((file) => file.path),
    [
      "package.json",
      "apps/web/package.json",
      "packages/ui/package.json",
      "examples/demo/legacy/package.json",
    ],
  );
  assert.ok(
    result.files.every(
      (file) =>
        file.category === "package-manifest" && file.priority === "high",
    ),
  );
});

test("gives README files high documentation priority", () => {
  const [file] = prioritizeRepositoryFiles([candidate("README.md")]).files;

  assert.equal(file.category, "documentation");
  assert.equal(file.priority, "high");
  assert.equal(file.score, 90);
});

test("gives Docker and configuration files useful high priority", () => {
  const paths = [
    "Dockerfile",
    "docker-compose.yml",
    "tsconfig.json",
    "next.config.mjs",
    "eslint.config.js",
    ".prettierrc.json",
    ".env.example",
  ];
  const result = prioritizeRepositoryFiles(paths.map((path) => candidate(path)));

  assert.ok(
    result.files.every(
      (file) => file.category === "configuration" && file.priority === "high",
    ),
  );
});

test("ranks likely entry-point filenames strongly without making inferences", () => {
  const [file] = prioritizeRepositoryFiles([candidate("src/index.ts")]).files;

  assert.equal(file.category, "entry-point");
  assert.equal(file.priority, "high");
  assert.equal(file.score, 88);
});

test("keeps normal source files and boosts common source directories", () => {
  const result = prioritizeRepositoryFiles([
    candidate("feature.ts"),
    candidate("src/feature.ts"),
  ]);

  assert.deepEqual(
    result.files.map((file) => file.path),
    ["src/feature.ts", "feature.ts"],
  );
  assert.ok(result.files.every((file) => file.category === "source"));
  assert.ok(result.files[0].score > result.files[1].score);
});

test("keeps tests but ranks them below equivalent implementation files", () => {
  const result = prioritizeRepositoryFiles([
    candidate("src/widget.test.ts"),
    candidate("src/widget.ts"),
  ]);

  assert.deepEqual(
    result.files.map((file) => file.path),
    ["src/widget.ts", "src/widget.test.ts"],
  );
  assert.equal(result.files[1].category, "test");
  assert.equal(result.files[1].priority, "low");
});

test("uses alphabetical paths to break equal-score ties", () => {
  const result = prioritizeRepositoryFiles([
    candidate("beta.ts"),
    candidate("alpha.ts"),
  ]);

  assert.deepEqual(
    result.files.map((file) => file.path),
    ["alpha.ts", "beta.ts"],
  );
});

test("returns deterministic ordering independent of input order", () => {
  const files = [
    candidate("src/index.ts"),
    candidate("README.md"),
    candidate("tests/index.test.ts"),
    candidate("package.json"),
  ];
  const forward = prioritizeRepositoryFiles(files);
  const reversed = prioritizeRepositoryFiles([...files].reverse());

  assert.deepEqual(forward, reversed);
});

test("selects at most 80 files by default", () => {
  const files = Array.from({ length: DEFAULT_MAX_INSPECTION_FILES + 5 }, (_, index) =>
    candidate(`misc/file-${String(index).padStart(3, "0")}.txt`),
  );
  const result = prioritizeRepositoryFiles(files);

  assert.equal(result.files.length, 85);
  assert.equal(result.selectedFiles.length, DEFAULT_MAX_INSPECTION_FILES);
  assert.equal(result.summary.totalCandidateFiles, 85);
  assert.equal(result.summary.selectedFiles, DEFAULT_MAX_INSPECTION_FILES);
});

test("supports a custom maximum inspection-file count", () => {
  const result = prioritizeRepositoryFiles(
    [candidate("a.ts"), candidate("b.ts"), candidate("c.ts")],
    { maxInspectionFiles: 2 },
  );

  assert.equal(result.files.length, 3);
  assert.equal(result.selectedFiles.length, 2);
});

test("preserves candidate metadata and does not mutate the input", () => {
  const input = [candidate("src/service.ts", null)];
  const original = structuredClone(input);
  const [file] = prioritizeRepositoryFiles(input).files;

  assert.deepEqual(input, original);
  assert.deepEqual(
    { path: file.path, sha: file.sha, size: file.size },
    input[0],
  );
});

test("summarizes priority counts deterministically", () => {
  const result = prioritizeRepositoryFiles([
    candidate("package.json"),
    candidate("src/service.ts"),
    candidate("tests/service.test.ts"),
  ]);

  assert.deepEqual(result.summary, {
    totalCandidateFiles: 3,
    selectedFiles: 3,
    highPriorityFiles: 1,
    mediumPriorityFiles: 1,
    lowPriorityFiles: 1,
  });
});
