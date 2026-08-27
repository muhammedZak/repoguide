import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRepositoryAIContext,
  DEFAULT_MAX_AI_CONTEXT_BYTES,
  DEFAULT_MAX_AI_DOCUMENT_BYTES,
  DEFAULT_MAX_AI_DOCUMENTS,
} from "../src/repository-ai-context.js";

const repositoryManifest = {
  repository: {
    fullName: "example/project",
    primaryLanguage: "JavaScript",
  },
  packageManifests: [
    {
      path: "package.json",
      name: "example",
      scripts: { dangerous: "must not be copied into manifest evidence" },
      dependencies: { react: "19" },
    },
  ],
  dependencies: [
    {
      package: "react",
      locations: [
        { path: "package.json", section: "dependencies", version: "19" },
      ],
    },
  ],
  technologies: [
    {
      name: "React",
      evidence: [{ path: "package.json", dependency: "react" }],
    },
  ],
  configurationFiles: ["vite.config.js"],
  entryPointCandidates: [
    { path: "src/main.js", reason: "deterministic classification" },
  ],
  documentationFiles: ["README.md"],
  workspaceEvidence: { declared: false, declarations: [] },
};

function document(path, content) {
  return {
    path,
    sha: `${path}-sha`,
    size: Buffer.byteLength(content),
    category: "source",
    priority: "medium",
    score: 60,
    content,
  };
}

function build(documents, options) {
  return buildRepositoryAIContext(
    { repositoryManifest, documents },
    options,
  );
}

test("includes compact manifest evidence and preserves explicit document paths", () => {
  const result = build([
    document("src/main.js", "main"),
    document("README.md", "readme"),
  ]);

  assert.match(result.context, /REPOSITORY EVIDENCE MANIFEST/);
  assert.match(result.context, /"fullName": "example\/project"/);
  assert.match(result.context, /"package": "react"/);
  assert.match(result.context, /"name": "React"/);
  assert.match(result.context, /"configurationFiles"/);
  assert.match(result.context, /"entryPointCandidates"/);
  assert.match(result.context, /--- FILE: src\/main\.js ---/);
  assert.match(result.context, /--- FILE: README\.md ---/);
  assert.deepEqual(result.documentPaths, ["src/main.js", "README.md"]);
  assert.equal(
    result.context.includes("must not be copied into manifest evidence"),
    false,
  );
});

test("preserves the existing prioritized document order", () => {
  const result = build([
    document("z-first.js", "first"),
    document("a-second.js", "second"),
  ]);

  assert.ok(
    result.context.indexOf("--- FILE: z-first.js ---") <
      result.context.indexOf("--- FILE: a-second.js ---"),
  );
  assert.deepEqual(result.documentPaths, ["z-first.js", "a-second.js"]);
});

test("respects the default AI document limit", () => {
  const documents = Array.from(
    { length: DEFAULT_MAX_AI_DOCUMENTS + 3 },
    (_, index) => document(`src/file-${index}.js`, "x"),
  );
  const result = build(documents);

  assert.equal(result.documentPaths.length, DEFAULT_MAX_AI_DOCUMENTS);
  assert.equal(result.summary.documentLimitExcluded, 3);
  assert.equal(result.context.includes("src/file-20.js"), false);
});

test("truncates oversized documents by UTF-8 bytes and marks partial content", () => {
  const tail = "TAIL_MUST_NOT_SURVIVE";
  const content = `${"é".repeat(DEFAULT_MAX_AI_DOCUMENT_BYTES)}${tail}`;
  const result = build([document("src/large.js", content)]);

  assert.match(result.context, /\[CONTENT TRUNCATED\]/);
  assert.equal(result.context.includes(tail), false);
  assert.equal(result.summary.documentsTruncated, 1);
  assert.equal(result.documentPaths[0], "src/large.js");
});

test("respects the complete AI context byte limit", () => {
  const maxAIContextBytes = 1_500;
  const result = build(
    Array.from({ length: 5 }, (_, index) =>
      document(`src/large-${index}.js`, "x".repeat(800)),
    ),
    { maxAIContextBytes },
  );

  assert.ok(result.summary.contextBytes <= maxAIContextBytes);
  assert.equal(Buffer.byteLength(result.context), result.summary.contextBytes);
  assert.ok(
    result.summary.contextLimitExcluded > 0 ||
      result.summary.documentsTruncated > 0 ||
      result.summary.manifestTruncated,
  );
});

test("uses the centralized default total context limit", () => {
  const result = build([]);

  assert.ok(result.summary.contextBytes <= DEFAULT_MAX_AI_CONTEXT_BYTES);
});

test("does not mutate repository documents while truncating", () => {
  const documents = [document("src/large.js", "x".repeat(30_000))];
  const original = structuredClone(documents);

  build(documents, { maxAIDocumentBytes: 10 });

  assert.deepEqual(documents, original);
});

test("does not read or intentionally add server secrets to AI context", () => {
  const previousAnthropicKey = process.env.ANTHROPIC_API_KEY;
  const previousGitHubToken = process.env.GITHUB_TOKEN;
  const anthropicSecret = "anthropic-secret-value-for-context-test";
  const githubSecret = "github-secret-value-for-context-test";

  process.env.ANTHROPIC_API_KEY = anthropicSecret;
  process.env.GITHUB_TOKEN = githubSecret;

  try {
    const result = build([document("src/main.js", "safe")]);

    assert.equal(result.context.includes(anthropicSecret), false);
    assert.equal(result.context.includes(githubSecret), false);
  } finally {
    if (previousAnthropicKey === undefined) {
      delete process.env.ANTHROPIC_API_KEY;
    } else {
      process.env.ANTHROPIC_API_KEY = previousAnthropicKey;
    }

    if (previousGitHubToken === undefined) {
      delete process.env.GITHUB_TOKEN;
    } else {
      process.env.GITHUB_TOKEN = previousGitHubToken;
    }
  }
});
