import express from "express";

import {
  GitHubRepositoryUrlError,
  parseGitHubRepositoryUrl,
} from "./github-repository-url.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "10kb" }));

  app.get("/health", (_request, response) => {
    response.status(200).json({
      status: "ok",
      service: "repoguide-api",
    });
  });

  app.post("/api/repos/analyze", (request, response, next) => {
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
      response.status(200).json(parseGitHubRepositoryUrl(repoUrl.trim()));
    } catch (error) {
      if (error instanceof GitHubRepositoryUrlError) {
        response.status(400).json({ error: error.message });
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
