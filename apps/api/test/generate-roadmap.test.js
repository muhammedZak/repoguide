import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { createApp } from "../src/app.js";
import { GeminiMalformedResponseError } from "../src/gemini-repository-analyzer.js";
import {
  GeminiRoadmapAuthenticationError,
  GeminiRoadmapConfigurationError,
  GeminiRoadmapRateLimitError,
  GeminiRoadmapUpstreamError,
} from "../src/gemini-roadmap-generator.js";
import { RoadmapMalformedResponseError } from "../src/roadmap-parser.js";

const repository = {
  owner: "example",
  name: "project",
  fullName: "example/project",
  description: "A test repository.",
  defaultBranch: "main",
  language: "JavaScript",
  stars: 10,
  forks: 2,
  openIssues: 1,
  visibility: "public",
  htmlUrl: "https://github.com/example/project",
};

const structure = {
  totalEntries: 3,
  fileCount: 2,
  directoryCount: 1,
  submoduleCount: 0,
  truncated: false,
  candidateFileCount: 2,
  ignoredFileCount: 0,
};

const repositoryManifest = { privateManifest: true };
const repositoryDocuments = [
  { path: "src/private.js", content: "private source content" },
];
const repositoryUnderstanding = {
  projectSummary: "A validated test repository.",
  learningTopics: [
    {
      id: "project-structure",
      title: "Project Structure",
      prerequisites: [],
    },
  ],
  recommendedLearningOrder: ["project-structure"],
};
const roadmap = {
  title: "Your RepoGuide Learning Roadmap",
  repositorySummary: "A validated test repository.",
  totalEstimatedMinutes: 60,
  days: [
    {
      day: 1,
      title: "Foundations",
      estimatedMinutes: 30,
      modules: [
        {
          id: "structure-module",
          title: "Project Structure",
          description: "Learn the main folders.",
          estimatedMinutes: 30,
          difficulty: "beginner",
          learningTopicId: "project-structure",
        },
      ],
    },
  ],
  finalReview: {
    estimatedMinutes: 30,
    topics: ["project-structure"],
  },
};

const calls = {
  github: [],
  understanding: [],
  roadmap: [],
};

const githubService = {
  async analyzeRepository(owner, repo) {
    calls.github.push({ owner, repo });

    return {
      repository: { ...repository, owner, name: repo, fullName: `${owner}/${repo}` },
      structure,
      repositoryManifest,
      repositoryDocuments,
    };
  },
};

const repositoryUnderstandingService = {
  async understandRepository(input) {
    calls.understanding.push(input);
    return { repositoryUnderstanding };
  },
};

const roadmapGenerator = {
  async generateRoadmap(input) {
    calls.roadmap.push(input);
    return roadmap;
  },
};

let baseUrl;
let server;

before(
  () =>
    new Promise((resolve) => {
      server = createApp({
        githubService,
        repositoryUnderstandingService,
        roadmapGenerator,
        todayProvider: () => "2026-08-27",
      }).listen(0, "127.0.0.1", () => {
        const address = server.address();
        assert.notEqual(address, null);
        assert.equal(typeof address, "object");
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    }),
);

after(
  () =>
    new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    }),
);

async function post(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  return { status: response.status, body: await response.json() };
}

function validRequest(overrides = {}) {
  return {
    repoUrl: "https://github.com/example/project",
    interviewDate: "2026-09-03",
    dailyStudyMinutes: 120,
    language: "english",
    ...overrides,
  };
}

async function postWithRoadmapError(error) {
  const errorServer = createApp({
    roadmapService: {
      async generateRoadmap() {
        throw error;
      },
    },
    todayProvider: () => "2026-08-27",
  }).listen(0, "127.0.0.1");

  await new Promise((resolve, reject) => {
    errorServer.once("listening", resolve);
    errorServer.once("error", reject);
  });

  try {
    const address = errorServer.address();
    assert.notEqual(address, null);
    assert.equal(typeof address, "object");
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/roadmaps/generate`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validRequest()),
      },
    );

    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise((resolve, reject) => {
      errorServer.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }

        resolve();
      });
    });
  }
}

test("POST /api/roadmaps/generate accepts a valid personalized request", async () => {
  const result = await post("/api/roadmaps/generate", validRequest());

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    repository: {
      fullName: "example/project",
      description: "A test repository.",
      primaryLanguage: "JavaScript",
    },
    planning: {
      interviewDate: "2026-09-03",
      availableDays: 7,
      plannedDays: 7,
      dailyStudyMinutes: 120,
      totalAvailableMinutes: 840,
      planningWindowTruncated: false,
    },
    roadmap,
  });
  assert.deepEqual(calls.github.at(-1), {
    owner: "example",
    repo: "project",
  });
  assert.deepEqual(calls.understanding.at(-1), {
    repositoryManifest,
    repositoryDocuments,
  });
  assert.deepEqual(calls.roadmap.at(-1), {
    repositoryUnderstanding,
    planning: {
      interviewDate: "2026-09-03",
      availableDays: 7,
      plannedDays: 7,
      dailyStudyMinutes: 120,
      totalAvailableMinutes: 840,
      planningWindowTruncated: false,
      language: "english",
    },
  });
});

test("POST /api/roadmaps/generate rejects invalid request fields before analysis", async () => {
  const invalidRequests = [
    validRequest({ repoUrl: "https://gitlab.com/example/project" }),
    validRequest({ interviewDate: "2026-08-26" }),
    validRequest({ interviewDate: "2026-02-30" }),
    validRequest({ dailyStudyMinutes: 29 }),
    validRequest({ dailyStudyMinutes: 481 }),
    validRequest({ language: "klingon" }),
  ];
  const previousGitHubCalls = calls.github.length;

  for (const body of invalidRequests) {
    const result = await post("/api/roadmaps/generate", body);

    assert.equal(result.status, 400);
    assert.equal(typeof result.body.error, "string");
  }

  assert.equal(calls.github.length, previousGitHubCalls);
});

test("POST /api/roadmaps/generate exposes a capped 30-day planning window", async () => {
  const result = await post(
    "/api/roadmaps/generate",
    validRequest({ interviewDate: "2026-10-26", dailyStudyMinutes: 60 }),
  );

  assert.equal(result.status, 200);
  assert.deepEqual(result.body.planning, {
    interviewDate: "2026-10-26",
    availableDays: 60,
    plannedDays: 30,
    dailyStudyMinutes: 60,
    totalAvailableMinutes: 1800,
    planningWindowTruncated: true,
  });
});

test("POST /api/roadmaps/generate passes Malayalam without changing identifiers", async () => {
  const result = await post(
    "/api/roadmaps/generate",
    validRequest({ language: "malayalam" }),
  );

  assert.equal(result.status, 200);
  assert.equal(calls.roadmap.at(-1).planning.language, "malayalam");
  assert.equal(
    result.body.roadmap.days[0].modules[0].learningTopicId,
    "project-structure",
  );
});

test("roadmap response keeps repository and provider internals private", async () => {
  const result = await post("/api/roadmaps/generate", validRequest());

  assert.equal(result.status, 200);
  assert.equal("repositoryDocuments" in result.body, false);
  assert.equal("repositoryManifest" in result.body, false);
  assert.equal("repositoryUnderstanding" in result.body, false);
  assert.equal("aiContext" in result.body, false);
  assert.equal("prompt" in result.body, false);
  assert.equal("providerResponse" in result.body, false);
  assert.equal(JSON.stringify(result.body).includes("private source content"), false);
});

test("POST /api/roadmaps/generate maps provider failures to safe public errors", async () => {
  const cases = [
    {
      error: new GeminiRoadmapConfigurationError(),
      status: 503,
      message: "Gemini is not configured for roadmap generation.",
    },
    {
      error: new GeminiRoadmapAuthenticationError(),
      status: 502,
      message: "Gemini authentication failed.",
    },
    {
      error: new GeminiRoadmapRateLimitError(),
      status: 503,
      message: "Gemini is temporarily rate limited. Try again later.",
    },
    {
      error: new GeminiMalformedResponseError(),
      status: 502,
      message: "Gemini returned an invalid repository analysis.",
    },
    {
      error: new RoadmapMalformedResponseError(),
      status: 502,
      message: "Gemini returned an invalid roadmap.",
    },
    {
      error: new GeminiRoadmapUpstreamError(),
      status: 502,
      message: "Gemini could not generate the roadmap. Try again later.",
    },
  ];

  for (const testCase of cases) {
    const result = await postWithRoadmapError(testCase.error);

    assert.equal(result.status, testCase.status);
    assert.deepEqual(result.body, { error: testCase.message });
  }
});

test("POST /api/repos/analyze remains the lightweight existing response", async () => {
  const result = await post("/api/repos/analyze", {
    repoUrl: "https://github.com/example/project",
  });

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { repository, structure });
});
