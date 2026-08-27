import { Octokit } from "octokit";

import {
  RepositoryContentRateLimitError,
  RepositoryContentUpstreamError,
  retrieveRepositoryContents,
} from "./repository-content-retriever.js";
import { filterRepositoryFiles } from "./repository-file-filter.js";
import { prioritizeRepositoryFiles } from "./repository-file-prioritizer.js";
import { buildRepositoryManifest } from "./repository-manifest-builder.js";

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

function normalizeRepositoryTree(data) {
  if (!Array.isArray(data?.tree) || typeof data?.truncated !== "boolean") {
    throw new GitHubUpstreamError();
  }

  const entries = data.tree.map((entry) => {
    if (
      typeof entry?.path !== "string" ||
      !["blob", "tree", "commit"].includes(entry?.type) ||
      typeof entry?.mode !== "string" ||
      typeof entry?.sha !== "string" ||
      !(
        typeof entry?.size === "number" ||
        entry?.size === undefined ||
        entry?.size === null
      )
    ) {
      throw new GitHubUpstreamError();
    }

    return {
      path: entry.path,
      type: entry.type,
      mode: entry.mode,
      sha: entry.sha,
      size: typeof entry.size === "number" ? entry.size : null,
    };
  });

  return { entries, truncated: data.truncated };
}

function summarizeRepositoryTree(entries, truncated) {
  return {
    totalEntries: entries.length,
    fileCount: entries.filter((entry) => entry.type === "blob").length,
    directoryCount: entries.filter((entry) => entry.type === "tree").length,
    submoduleCount: entries.filter((entry) => entry.type === "commit").length,
    truncated,
  };
}

export function createGitHubService(options = {}) {
  const token = options.token ?? process.env.GITHUB_TOKEN;
  const octokit =
    options.octokit ??
    new Octokit({
      ...(token?.trim() ? { auth: token.trim() } : {}),
      userAgent: "RepoGuide/0.1.0",
    });

  async function getRepository(owner, repo) {
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
  }

  async function getRepositoryTree(owner, repo, defaultBranch) {
    let data;

    try {
      const response = await octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: defaultBranch,
        recursive: "true",
      });
      data = response.data;
    } catch (error) {
      throw mapGitHubError(error);
    }

    return normalizeRepositoryTree(data);
  }

  async function getRepositoryBlob(owner, repo, sha) {
    const response = await octokit.rest.git.getBlob({
      owner,
      repo,
      file_sha: sha,
    });

    return response.data;
  }

  return {
    getRepository,

    async analyzeRepository(owner, repo) {
      const repository = await getRepository(owner, repo);
      const { entries, truncated } = await getRepositoryTree(
        repository.owner,
        repository.name,
        repository.defaultBranch,
      );
      const filteredFiles = filterRepositoryFiles(entries);
      const prioritizedFiles = prioritizeRepositoryFiles(filteredFiles.files);
      let retrievedContent;

      try {
        retrievedContent = await retrieveRepositoryContents(
          {
            owner: repository.owner,
            repo: repository.name,
            files: prioritizedFiles.selectedFiles,
            fetchBlob: ({ owner, repo, sha }) =>
              getRepositoryBlob(owner, repo, sha),
          },
          options.contentRetrieval,
        );
      } catch (error) {
        if (error instanceof RepositoryContentRateLimitError) {
          throw new GitHubRateLimitError();
        }

        if (error instanceof RepositoryContentUpstreamError) {
          throw new GitHubUpstreamError();
        }

        throw error;
      }

      const repositoryManifest = buildRepositoryManifest({
        repository,
        documents: retrievedContent.documents,
      });

      return {
        repository,
        tree: entries,
        candidateFiles: filteredFiles.files,
        filterSummary: filteredFiles.summary,
        prioritizedFiles: prioritizedFiles.files,
        inspectionFiles: prioritizedFiles.selectedFiles,
        prioritizationSummary: prioritizedFiles.summary,
        repositoryDocuments: retrievedContent.documents,
        contentRetrievalSummary: retrievedContent.summary,
        repositoryManifest: repositoryManifest.manifest,
        repositoryManifestSummary: repositoryManifest.summary,
        repositoryManifestIssues: repositoryManifest.issues,
        structure: {
          ...summarizeRepositoryTree(entries, truncated),
          candidateFileCount: filteredFiles.summary.candidateFiles,
          ignoredFileCount: filteredFiles.summary.ignoredFiles,
        },
      };
    },
  };
}
