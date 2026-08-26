import express from "express";

import {
  createGitHubService,
  GitHubRateLimitError,
  GitHubRepositoryNotFoundError,
  GitHubUpstreamError,
} from "./github-service.js";
import {
  GitHubRepositoryUrlError,
  parseGitHubRepositoryUrl,
} from "./github-repository-url.js";

export function createApp({ githubService = createGitHubService() } = {}) {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "10kb" }));

  app.get("/health", (_request, response) => {
    response.status(200).json({
      status: "ok",
      service: "repoguide-api",
    });
  });

  app.post("/api/repos/analyze", async (request, response, next) => {
    const repoUrl = request.body?.repoUrl;

    if (
      repoUrl === undefined ||
      repoUrl === null ||
      (typeof repoUrl === "string" && !repoUrl.trim())
    ) {
      response.status(400).json({ error: "repoUrl is required." });
      return;
    }

    if (typeof repoUrl !== "string") {
      response.status(400).json({ error: "repoUrl must be a string." });
      return;
    }

    try {
      const { owner, repo } = parseGitHubRepositoryUrl(repoUrl.trim());
      const { repository, structure } =
        await githubService.analyzeRepository(owner, repo);

      response.status(200).json({ repository, structure });
    } catch (error) {
      if (error instanceof GitHubRepositoryUrlError) {
        response.status(400).json({ error: error.message });
        return;
      }

      if (error instanceof GitHubRepositoryNotFoundError) {
        response.status(404).json({
          error: "Repository not found or is not publicly accessible.",
        });
        return;
      }

      if (error instanceof GitHubRateLimitError) {
        response.status(503).json({
          error: "GitHub is temporarily rate limited. Try again later.",
        });
        return;
      }

      if (error instanceof GitHubUpstreamError) {
        response.status(502).json({
          error: "GitHub could not be reached. Try again later.",
        });
        return;
      }

      next(error);
    }
  });

  app.use((error, _request, response, next) => {
    if (error?.type === "entity.parse.failed") {
      response
        .status(400)
        .json({ error: "Request body must contain valid JSON." });
      return;
    }

    next(error);
  });

  return app;
}
