import assert from "node:assert/strict";
import test from "node:test";

import { createGeminiRepositoryUnderstandingService } from "../src/gemini-repository-understanding-service.js";

const repositoryManifest = {
  repository: { fullName: "example/project", primaryLanguage: "JavaScript" },
  packageManifests: [],
  dependencies: [],
  technologies: [],
  configurationFiles: [],
  entryPointCandidates: [],
  documentationFiles: [],
  workspaceEvidence: { declared: false, declarations: [] },
};

test("reuses the bounded context builder and invokes only the injected Gemini analyzer", async () => {
  const calls = [];
  const expectedUnderstanding = {
    projectSummary: "Injected Gemini result",
  };
  const service = createGeminiRepositoryUnderstandingService({
    geminiAnalyzer: {
      async analyzeRepository(input) {
        calls.push(input);
        return expectedUnderstanding;
      },
    },
  });

  const result = await service.understandRepository({
    repositoryManifest,
    repositoryDocuments: [
      {
        path: "src/main.js",
        content: "main",
        category: "entry-point",
      },
      {
        path: "README.md",
        content: "readme",
        category: "documentation",
      },
    ],
  });

  assert.equal(calls.length, 1);
  assert.match(calls[0].context, /REPOSITORY EVIDENCE MANIFEST/);
  assert.match(calls[0].context, /--- FILE: src\/main\.js ---/);
  assert.match(calls[0].context, /--- END FILE: src\/main\.js ---/);
  assert.match(calls[0].context, /--- FILE: README\.md ---/);
  assert.deepEqual(calls[0].documentPaths, ["src/main.js", "README.md"]);
  assert.deepEqual(result.repositoryUnderstanding, expectedUnderstanding);
  assert.equal(result.contextSummary.documentsIncluded, 2);
  assert.equal("context" in result, false);
});
