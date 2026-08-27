import { createGeminiRepositoryAnalyzer } from "./gemini-repository-analyzer.js";
import { buildRepositoryAIContext } from "./repository-ai-context.js";

export function createGeminiRepositoryUnderstandingService({
  geminiAnalyzer = createGeminiRepositoryAnalyzer(),
  contextOptions,
} = {}) {
  return {
    async understandRepository({
      repositoryManifest,
      repositoryDocuments,
    }) {
      const aiContext = buildRepositoryAIContext(
        {
          repositoryManifest,
          documents: repositoryDocuments,
        },
        contextOptions,
      );
      const repositoryUnderstanding =
        await geminiAnalyzer.analyzeRepository({
          context: aiContext.context,
          documentPaths: aiContext.documentPaths,
        });

      return {
        repositoryUnderstanding,
        contextSummary: aiContext.summary,
      };
    },
  };
}
