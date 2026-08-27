import assert from "node:assert/strict";
import test from "node:test";

import { createRepositoryUnderstandingService } from "../src/repository-understanding-service.js";

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

test("builds bounded context and invokes only the injected analyzer", async () => {
  const calls = [];
  const expectedUnderstanding = {
    projectSummary: "Injected fake result",
  };
  const service = createRepositoryUnderstandingService({
    repositoryAnalyzer: {
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
    ],
  });

  assert.equal(calls.length, 1);
  assert.match(calls[0].context, /--- FILE: src\/main\.js ---/);
  assert.deepEqual(calls[0].documentPaths, ["src/main.js"]);
  assert.deepEqual(result.repositoryUnderstanding, expectedUnderstanding);
  assert.equal(result.contextSummary.documentsIncluded, 1);
  assert.equal("context" in result, false);
});
