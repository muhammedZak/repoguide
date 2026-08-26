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

const treeData = {
  tree: [
    {
      path: "src",
      type: "tree",
      mode: "040000",
      sha: "directory-sha",
    },
    {
      path: "src/index.js",
      type: "blob",
      mode: "100644",
      sha: "file-sha",
      size: 1234,
    },
    {
      path: "vendor/example",
      type: "commit",
      mode: "160000",
      sha: "submodule-sha",
    },
  ],
  truncated: false,
};

function createOctokitStub(
  getRepository,
  getTree = async () => ({ data: treeData }),
) {
  return {
    rest: {
      git: {
        getTree,
      },
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

test("GitHub service requests the recursive default-branch tree using canonical repository names", async () => {
  let treeParameters;
  const canonicalData = {
    ...githubData,
    owner: { login: "reactjs" },
    name: "react",
    full_name: "reactjs/react",
    default_branch: "stable",
  };
  const octokit = createOctokitStub(
    async () => ({ data: canonicalData }),
    async (parameters) => {
      treeParameters = parameters;
      return { data: treeData };
    },
  );
  const service = createGitHubService({ octokit });

  await service.analyzeRepository("facebook", "react");

  assert.deepEqual(treeParameters, {
    owner: "reactjs",
    repo: "react",
    tree_sha: "stable",
    recursive: "true",
  });
});

test("GitHub service normalizes tree entries and summarizes repository structure", async () => {
  const service = createGitHubService({
    octokit: createOctokitStub(async () => ({ data: githubData })),
  });

  const analysis = await service.analyzeRepository("facebook", "react");

  assert.deepEqual(analysis.tree, [
    {
      path: "src",
      type: "tree",
      mode: "040000",
      sha: "directory-sha",
      size: null,
    },
    {
      path: "src/index.js",
      type: "blob",
      mode: "100644",
      sha: "file-sha",
      size: 1234,
    },
    {
      path: "vendor/example",
      type: "commit",
      mode: "160000",
      sha: "submodule-sha",
      size: null,
    },
  ]);
  assert.deepEqual(analysis.structure, {
    totalEntries: 3,
    fileCount: 1,
    directoryCount: 1,
    submoduleCount: 1,
    truncated: false,
    candidateFileCount: 1,
    ignoredFileCount: 0,
  });
  assert.deepEqual(analysis.candidateFiles, [
    {
      path: "src/index.js",
      sha: "file-sha",
      size: 1234,
    },
  ]);
  assert.deepEqual(analysis.filterSummary, {
    totalFiles: 1,
    candidateFiles: 1,
    ignoredFiles: 0,
    ignoredByDirectory: 0,
    ignoredByExtension: 0,
    ignoredGenerated: 0,
    ignoredOversized: 0,
  });
});

test("GitHub service exposes recursive tree truncation in the structure summary", async () => {
  const service = createGitHubService({
    octokit: createOctokitStub(
      async () => ({ data: githubData }),
      async () => ({ data: { ...treeData, truncated: true } }),
    ),
  });

  const analysis = await service.analyzeRepository("facebook", "react");

  assert.equal(analysis.structure.truncated, true);
  assert.equal(analysis.structure.candidateFileCount, 1);
  assert.equal(analysis.structure.ignoredFileCount, 0);
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

test("GitHub service safely maps tree lookup failures", async () => {
  const rateLimitedService = createGitHubService({
    octokit: createOctokitStub(
      async () => ({ data: githubData }),
      async () => {
        throw { status: 403, token: "must-not-leak" };
      },
    ),
  });
  const failedService = createGitHubService({
    octokit: createOctokitStub(
      async () => ({ data: githubData }),
      async () => {
        throw new Error("internal GitHub tree details");
      },
    ),
  });

  await assert.rejects(
    rateLimitedService.analyzeRepository("facebook", "react"),
    GitHubRateLimitError,
  );
  await assert.rejects(
    failedService.analyzeRepository("facebook", "react"),
    GitHubUpstreamError,
  );
});
