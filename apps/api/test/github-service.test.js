import assert from "node:assert/strict";
import test from "node:test";

import {
  createGitHubService,
  GitHubRateLimitError,
  GitHubRepositoryNotFoundError,
  GitHubUpstreamError,
} from "../src/github-service.js";

const githubData = {
  owner: { login: "facebook" },
  name: "react",
  full_name: "facebook/react",
  description: "The library for web and native user interfaces.",
  default_branch: "main",
  language: "JavaScript",
  stargazers_count: 240000,
  forks_count: 50000,
  open_issues_count: 1000,
  visibility: "public",
  private: false,
  html_url: "https://github.com/facebook/react",
};

function createOctokitStub(getRepository) {
  return {
    rest: {
      repos: {
        get: getRepository,
      },
    },
  };
}

test("GitHub service requests repository metadata with owner and repo", async () => {
  let requestParameters;
  const octokit = createOctokitStub(async (parameters) => {
    requestParameters = parameters;
    return { data: githubData };
  });
  const service = createGitHubService({ octokit });

  await service.getRepository("facebook", "react");

  assert.deepEqual(requestParameters, { owner: "facebook", repo: "react" });
});

test("GitHub service normalizes repository metadata", async () => {
  const octokit = createOctokitStub(async () => ({ data: githubData }));
  const service = createGitHubService({ octokit });

  assert.deepEqual(await service.getRepository("facebook", "react"), {
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
  });
});

test("GitHub service preserves nullable description and language", async () => {
  const octokit = createOctokitStub(async () => ({
    data: { ...githubData, description: null, language: null },
  }));
  const service = createGitHubService({ octokit });
  const repository = await service.getRepository("facebook", "react");

  assert.equal(repository.description, null);
  assert.equal(repository.language, null);
});

test("GitHub service maps missing or private repositories to not found", async () => {
  const missingService = createGitHubService({
    octokit: createOctokitStub(async () => {
      throw { status: 404 };
    }),
  });
  const privateService = createGitHubService({
    octokit: createOctokitStub(async () => ({
      data: { ...githubData, private: true, visibility: "private" },
    })),
  });

  await assert.rejects(
    missingService.getRepository("example", "missing"),
    GitHubRepositoryNotFoundError,
  );
  await assert.rejects(
    privateService.getRepository("example", "private"),
    GitHubRepositoryNotFoundError,
  );
});

test("GitHub service maps rate-limit failures", async () => {
  for (const status of [403, 429]) {
    const service = createGitHubService({
      octokit: createOctokitStub(async () => {
        throw { status, token: "must-not-leak" };
      }),
    });

    await assert.rejects(
      service.getRepository("facebook", "react"),
      GitHubRateLimitError,
    );
  }
});

test("GitHub service maps unexpected failures to a safe upstream error", async () => {
  const service = createGitHubService({
    octokit: createOctokitStub(async () => {
      throw new Error("internal GitHub details");
    }),
  });

  await assert.rejects(
    service.getRepository("facebook", "react"),
    GitHubUpstreamError,
  );
});
