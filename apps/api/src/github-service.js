import { Octokit } from "octokit";

export class GitHubRepositoryNotFoundError extends Error {
  constructor() {
    super("GitHub repository not found");
    this.name = "GitHubRepositoryNotFoundError";
  }
}

export class GitHubRateLimitError extends Error {
  constructor() {
    super("GitHub rate limit exceeded");
    this.name = "GitHubRateLimitError";
  }
}

export class GitHubUpstreamError extends Error {
  constructor() {
    super("GitHub request failed");
    this.name = "GitHubUpstreamError";
  }
}

function normalizeRepository(data) {
  const requiredStrings = [
    data?.owner?.login,
    data?.name,
    data?.full_name,
    data?.default_branch,
    data?.html_url,
  ];
  const requiredNumbers = [
    data?.stargazers_count,
    data?.forks_count,
    data?.open_issues_count,
  ];

  if (
    requiredStrings.some((value) => typeof value !== "string") ||
    requiredNumbers.some((value) => typeof value !== "number")
  ) {
    throw new GitHubUpstreamError();
  }

  return {
    owner: data.owner.login,
    name: data.name,
    fullName: data.full_name,
    description: typeof data.description === "string" ? data.description : null,
    defaultBranch: data.default_branch,
    language: typeof data.language === "string" ? data.language : null,
    stars: data.stargazers_count,
    forks: data.forks_count,
    openIssues: data.open_issues_count,
    visibility:
      typeof data.visibility === "string"
        ? data.visibility
        : data.private
          ? "private"
          : "public",
    htmlUrl: data.html_url,
  };
}

function mapGitHubError(error) {
  if (error?.status === 404) {
    return new GitHubRepositoryNotFoundError();
  }

  if (error?.status === 403 || error?.status === 429) {
    return new GitHubRateLimitError();
  }

  return new GitHubUpstreamError();
}

export function createGitHubService(options = {}) {
  const token = options.token ?? process.env.GITHUB_TOKEN;
  const octokit =
    options.octokit ??
    new Octokit({
      ...(token?.trim() ? { auth: token.trim() } : {}),
      userAgent: "RepoGuide/0.1.0",
    });

  return {
    async getRepository(owner, repo) {
      let data;

      try {
        const response = await octokit.rest.repos.get({ owner, repo });
        data = response.data;
      } catch (error) {
        throw mapGitHubError(error);
      }

      if (data.private || data.visibility === "private") {
        throw new GitHubRepositoryNotFoundError();
      }

      return normalizeRepository(data);
    },
  };
}

