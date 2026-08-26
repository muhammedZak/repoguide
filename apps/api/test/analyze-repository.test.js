import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { createApp } from "../src/app.js";
import {
  GitHubRateLimitError,
  GitHubRepositoryNotFoundError,
  GitHubUpstreamError,
} from "../src/github-service.js";

const repository = {
  owner: "facebook",
  name: "react",
  fullName: "facebook/react",
  description: "The library for web and native user interfaces.",
  defaultBranch: "main",
  language: "JavaScript",
  stars: 240000,
  forks: 50000,
  openIssues: 1000,
  visibility: "public",
  htmlUrl: "https://github.com/facebook/react",
};

const structure = {
  totalEntries: 3,
  fileCount: 2,
  directoryCount: 1,
  submoduleCount: 0,
  truncated: false,
};

const githubService = {
  async analyzeRepository(owner, repo) {
    if (repo === "missing") {
      throw new GitHubRepositoryNotFoundError();
    }

    if (repo === "rate-limited") {
      throw new GitHubRateLimitError();
    }

    if (repo === "upstream-error") {
      throw new GitHubUpstreamError();
    }

    const normalizedRepository = {
      ...repository,
      owner,
      name: repo,
      fullName: `${owner}/${repo}`,
    };

    return {
      repository: normalizedRepository,
      structure,
      tree: [{ path: "internal-only.js" }],
    };
  },
};

let baseUrl;
let server;

before(
  () =>
    new Promise((resolve) => {
      server = createApp({ githubService }).listen(0, "127.0.0.1", () => {
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

async function analyze(body) {
  const response = await fetch(`${baseUrl}/api/repos/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  return {
    body: await response.json(),
    status: response.status,
  };
}

test("POST /api/repos/analyze returns repository metadata and its structure summary", async () => {
  const result = await analyze({
    repoUrl: "https://github.com/facebook/react",
  });

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { repository, structure });
  assert.equal("tree" in result.body, false);
});

test("POST /api/repos/analyze accepts a trailing slash", async () => {
  const result = await analyze({
    repoUrl: "https://github.com/facebook/react/",
  });

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { repository, structure });
});

test("POST /api/repos/analyze rejects invalid repository URLs before lookup", async () => {
  const invalidUrls = [
    "https://gitlab.com/example/repo",
    "https://github.com/facebook",
    "hello",
  ];

  for (const repoUrl of invalidUrls) {
    const result = await analyze({ repoUrl });

    assert.equal(result.status, 400);
    assert.equal(typeof result.body.error, "string");
    assert.ok(result.body.error.length > 0);
  }
});

test("POST /api/repos/analyze rejects a missing repoUrl", async () => {
  const result = await analyze({});

  assert.equal(result.status, 400);
  assert.deepEqual(result.body, { error: "repoUrl is required." });
});

test("POST /api/repos/analyze returns 404 for an unavailable repository", async () => {
  const result = await analyze({
    repoUrl: "https://github.com/example/missing",
  });

  assert.equal(result.status, 404);
  assert.deepEqual(result.body, {
    error: "Repository not found or is not publicly accessible.",
  });
});

test("POST /api/repos/analyze returns a safe rate-limit error", async () => {
  const result = await analyze({
    repoUrl: "https://github.com/example/rate-limited",
  });

  assert.equal(result.status, 503);
  assert.deepEqual(result.body, {
    error: "GitHub is temporarily rate limited. Try again later.",
  });
});

test("POST /api/repos/analyze returns a safe upstream error", async () => {
  const result = await analyze({
    repoUrl: "https://github.com/example/upstream-error",
  });

  assert.equal(result.status, 502);
  assert.deepEqual(result.body, {
    error: "GitHub could not be reached. Try again later.",
  });
});

test("POST /api/repos/analyze returns JSON for malformed request bodies", async () => {
  const response = await fetch(`${baseUrl}/api/repos/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{not-valid-json",
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "Request body must contain valid JSON.",
  });
});
