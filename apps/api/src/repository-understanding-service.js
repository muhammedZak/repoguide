import { createClaudeRepositoryAnalyzer } from "./claude-repository-analyzer.js";
import { buildRepositoryAIContext } from "./repository-ai-context.js";

export function createRepositoryUnderstandingService({
  repositoryAnalyzer = createClaudeRepositoryAnalyzer(),
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
        await repositoryAnalyzer.analyzeRepository({
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
