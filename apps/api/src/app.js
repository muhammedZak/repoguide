import express from "express";

import {
  GeminiAuthenticationError,
  GeminiConfigurationError,
  GeminiMalformedResponseError,
  GeminiRateLimitError,
  GeminiUpstreamError,
} from "./gemini-repository-analyzer.js";
import {
  createGeminiRoadmapGenerator,
  GeminiRoadmapAuthenticationError,
  GeminiRoadmapConfigurationError,
  GeminiRoadmapRateLimitError,
  GeminiRoadmapUpstreamError,
} from "./gemini-roadmap-generator.js";
import { createGeminiRepositoryUnderstandingService } from "./gemini-repository-understanding-service.js";
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
import { createRoadmapGenerationService } from "./roadmap-generation-service.js";
import { RoadmapMalformedResponseError } from "./roadmap-parser.js";
import {
  getTodayDateOnly,
  parseRoadmapGenerationRequest,
  RoadmapRequestValidationError,
} from "./roadmap-request.js";

export function createApp(options = {}) {
  const githubService = options.githubService ?? createGitHubService();
  const roadmapService =
    options.roadmapService ??
    createRoadmapGenerationService({
      githubService,
      repositoryUnderstandingService:
        options.repositoryUnderstandingService ??
        createGeminiRepositoryUnderstandingService(),
      roadmapGenerator:
        options.roadmapGenerator ?? createGeminiRoadmapGenerator(),
    });
  const todayProvider = options.todayProvider ?? getTodayDateOnly;
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

  app.post("/api/roadmaps/generate", async (request, response, next) => {
    try {
      const { owner, repo, planning } = parseRoadmapGenerationRequest(
        request.body,
        { today: todayProvider() },
      );
      const result = await roadmapService.generateRoadmap({
        owner,
        repo,
        planning,
      });

      response.status(200).json(result);
    } catch (error) {
      if (
        error instanceof RoadmapRequestValidationError ||
        error instanceof GitHubRepositoryUrlError
      ) {
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

      if (
        error instanceof GeminiConfigurationError ||
        error instanceof GeminiRoadmapConfigurationError
      ) {
        response.status(503).json({
          error: "Gemini is not configured for roadmap generation.",
        });
        return;
      }

      if (
        error instanceof GeminiAuthenticationError ||
        error instanceof GeminiRoadmapAuthenticationError
      ) {
        response.status(502).json({
          error: "Gemini authentication failed.",
        });
        return;
      }

      if (
        error instanceof GeminiRateLimitError ||
        error instanceof GeminiRoadmapRateLimitError
      ) {
        response.status(503).json({
          error: "Gemini is temporarily rate limited. Try again later.",
        });
        return;
      }

      if (error instanceof GeminiMalformedResponseError) {
        response.status(502).json({
          error: "Gemini returned an invalid repository analysis.",
        });
        return;
      }

      if (error instanceof RoadmapMalformedResponseError) {
        response.status(502).json({
          error: "Gemini returned an invalid roadmap.",
        });
        return;
      }

      if (
        error instanceof GeminiUpstreamError ||
        error instanceof GeminiRoadmapUpstreamError
      ) {
        response.status(502).json({
          error: "Gemini could not generate the roadmap. Try again later.",
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
