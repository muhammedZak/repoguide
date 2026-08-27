import assert from "node:assert/strict";
import test from "node:test";

import { createRoadmapGenerationService } from "../src/roadmap-generation-service.js";

test("orchestrates private analysis and returns only the public roadmap projection", async () => {
  const calls = { github: [], understanding: [], roadmap: [] };
  const repositoryManifest = { private: "manifest" };
  const repositoryDocuments = [
    { path: "src/private.js", content: "private source" },
  ];
  const repositoryUnderstanding = {
    projectSummary: "Validated understanding",
    learningTopics: [],
  };
  const roadmap = {
    title: "Roadmap",
    totalEstimatedMinutes: 60,
    days: [],
    finalReview: { estimatedMinutes: 15, topics: [] },
  };
  const planning = {
    interviewDate: "2026-09-03",
    availableDays: 7,
    plannedDays: 7,
    dailyStudyMinutes: 60,
    totalAvailableMinutes: 420,
    planningWindowTruncated: false,
    language: "english",
  };
  const service = createRoadmapGenerationService({
    githubService: {
      async analyzeRepository(owner, repo) {
        calls.github.push({ owner, repo });
        return {
          repository: {
            fullName: `${owner}/${repo}`,
            description: "Public description",
            language: "JavaScript",
          },
          repositoryManifest,
          repositoryDocuments,
        };
      },
    },
    repositoryUnderstandingService: {
      async understandRepository(input) {
        calls.understanding.push(input);
        return { repositoryUnderstanding };
      },
    },
    roadmapGenerator: {
      async generateRoadmap(input) {
        calls.roadmap.push(input);
        return roadmap;
      },
    },
  });

  const result = await service.generateRoadmap({
    owner: "example",
    repo: "project",
    planning,
  });

  assert.deepEqual(calls.github, [{ owner: "example", repo: "project" }]);
  assert.deepEqual(calls.understanding, [
    { repositoryManifest, repositoryDocuments },
  ]);
  assert.deepEqual(calls.roadmap, [{ repositoryUnderstanding, planning }]);
  assert.deepEqual(result, {
    repository: {
      fullName: "example/project",
      description: "Public description",
      primaryLanguage: "JavaScript",
    },
    planning: {
      interviewDate: "2026-09-03",
      availableDays: 7,
      plannedDays: 7,
      dailyStudyMinutes: 60,
      totalAvailableMinutes: 420,
      planningWindowTruncated: false,
    },
    roadmap,
  });
  assert.equal("repositoryManifest" in result, false);
  assert.equal("repositoryDocuments" in result, false);
  assert.equal("repositoryUnderstanding" in result, false);
  assert.equal("context" in result, false);
});
