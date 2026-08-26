export class GitHubRepositoryUrlError extends Error {
  constructor(message) {
    super(message);
    this.name = "GitHubRepositoryUrlError";
  }
}

export function parseGitHubRepositoryUrl(repoUrl) {
  let url;

  try {
    url = new URL(repoUrl);
  } catch {
    throw new GitHubRepositoryUrlError("repoUrl must be a valid URL.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new GitHubRepositoryUrlError(
      "repoUrl must use the http or https protocol.",
    );
  }

  if (url.hostname.toLowerCase() !== "github.com") {
    throw new GitHubRepositoryUrlError(
      "repoUrl must be a github.com repository URL.",
    );
  }

  if (url.username || url.password || url.port) {
    throw new GitHubRepositoryUrlError("repoUrl must be a valid GitHub URL.");
  }

  const pathMatch = url.pathname.match(/^\/([^/]+)\/([^/]+)\/?$/);

  if (!pathMatch) {
    throw new GitHubRepositoryUrlError(
      "repoUrl must include both a repository owner and name.",
    );
  }

  let owner;
  let repo;

  try {
    owner = decodeURIComponent(pathMatch[1]);
    repo = decodeURIComponent(pathMatch[2]);
  } catch {
    throw new GitHubRepositoryUrlError("repoUrl contains an invalid path.");
  }

  const validOwner = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(owner);
  const validRepo = /^[A-Za-z0-9._-]{1,100}$/.test(repo);

  if (!validOwner || !validRepo) {
    throw new GitHubRepositoryUrlError(
      "repoUrl contains an invalid repository owner or name.",
    );
  }

  return { owner, repo };
}

