import express from "express";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");

  app.get("/health", (_request, response) => {
    response.status(200).json({
      status: "ok",
      service: "repoguide-api",
    });
  });

  return app;
}

