import assert from "node:assert/strict";
import test from "node:test";

import {
  GitHubRepositoryUrlError,
  parseGitHubRepositoryUrl,
} from "../src/github-repository-url.js";

test("parses a standard GitHub repository URL", () => {
  assert.deepEqual(
    parseGitHubRepositoryUrl("https://github.com/facebook/react"),
    {
      owner: "facebook",
      repo: "react",
    },
  );
});

test("parses a GitHub repository URL with a trailing slash", () => {
  assert.deepEqual(
    parseGitHubRepositoryUrl("https://github.com/facebook/react/"),
    {
      owner: "facebook",
      repo: "react",
    },
  );
});

test("preserves valid repository punctuation", () => {
  assert.deepEqual(
    parseGitHubRepositoryUrl("https://github.com/vercel/next.js"),
    {
      owner: "vercel",
      repo: "next.js",
    },
  );
});

test("rejects malformed, non-GitHub, and incomplete URLs", () => {
  const invalidUrls = [
    "hello",
    "https://gitlab.com/example/repo",
    "https://github.com/facebook",
    "https://github.com/facebook/react/issues",
  ];

  for (const repoUrl of invalidUrls) {
    assert.throws(
      () => parseGitHubRepositoryUrl(repoUrl),
      GitHubRepositoryUrlError,
    );
  }
});

