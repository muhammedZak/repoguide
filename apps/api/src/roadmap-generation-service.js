export function createRoadmapGenerationService({
  githubService,
  repositoryUnderstandingService,
  roadmapGenerator,
}) {
  return {
    async generateRoadmap({ owner, repo, planning }) {
      const analysis = await githubService.analyzeRepository(owner, repo);
      const understandingResult =
        await repositoryUnderstandingService.understandRepository({
          repositoryManifest: analysis.repositoryManifest,
          repositoryDocuments: analysis.repositoryDocuments,
        });
      const roadmap = await roadmapGenerator.generateRoadmap({
        repositoryUnderstanding: understandingResult.repositoryUnderstanding,
        planning,
      });

      return {
        repository: {
          fullName: analysis.repository.fullName,
          description: analysis.repository.description,
          primaryLanguage: analysis.repository.language,
        },
        planning: {
          interviewDate: planning.interviewDate,
          availableDays: planning.availableDays,
          plannedDays: planning.plannedDays,
          dailyStudyMinutes: planning.dailyStudyMinutes,
          totalAvailableMinutes: planning.totalAvailableMinutes,
          planningWindowTruncated: planning.planningWindowTruncated,
        },
        roadmap,
      };
    },
  };
}
