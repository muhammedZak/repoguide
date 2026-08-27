export const MIN_MODULE_MINUTES = 15;
export const MAX_MODULE_MINUTES = 120;

const DIFFICULTIES = new Set(["beginner", "intermediate", "advanced"]);

export class RoadmapMalformedResponseError extends Error {
  constructor() {
    super("Gemini returned a malformed roadmap");
    this.name = "RoadmapMalformedResponseError";
  }
}

function fail() {
  throw new RoadmapMalformedResponseError();
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireString(value) {
  if (typeof value !== "string" || !value.trim()) {
    fail();
  }

  return value;
}

function requireInteger(value) {
  if (!Number.isInteger(value)) {
    fail();
  }

  return value;
}

function requireStringArray(value) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    fail();
  }

  return value.map(requireString);
}

function parseModule(value, validTopicIds, moduleIds) {
  if (!isPlainObject(value)) {
    fail();
  }

  const id = requireString(value.id);
  const estimatedMinutes = requireInteger(value.estimatedMinutes);
  const difficulty = requireString(value.difficulty);
  const learningTopicId = requireString(value.learningTopicId);

  if (moduleIds.has(id)) {
    fail();
  }

  if (
    estimatedMinutes < MIN_MODULE_MINUTES ||
    estimatedMinutes > MAX_MODULE_MINUTES
  ) {
    fail();
  }

  if (!DIFFICULTIES.has(difficulty) || !validTopicIds.has(learningTopicId)) {
    fail();
  }

  moduleIds.add(id);

  return {
    id,
    title: requireString(value.title),
    description: requireString(value.description),
    estimatedMinutes,
    difficulty,
    learningTopicId,
  };
}

function validateTopicOrder(modules, learningTopics, recommendedLearningOrder) {
  const firstPositions = new Map();

  for (const [index, module] of modules.entries()) {
    if (!firstPositions.has(module.learningTopicId)) {
      firstPositions.set(module.learningTopicId, index);
    }
  }

  const recommendedPositions = new Map(
    recommendedLearningOrder.map((id, index) => [id, index]),
  );
  let lastRecommendedPosition = -1;

  for (const topicId of firstPositions.keys()) {
    const recommendedPosition = recommendedPositions.get(topicId);

    if (recommendedPosition === undefined) {
      continue;
    }

    if (recommendedPosition < lastRecommendedPosition) {
      fail();
    }

    lastRecommendedPosition = recommendedPosition;
  }

  for (const topic of learningTopics) {
    const topicPosition = firstPositions.get(topic.id);

    if (topicPosition === undefined) {
      continue;
    }

    for (const prerequisite of topic.prerequisites) {
      const prerequisitePosition = firstPositions.get(prerequisite);

      if (
        prerequisitePosition !== undefined &&
        prerequisitePosition >= topicPosition
      ) {
        fail();
      }
    }
  }
}

export function parseGeneratedRoadmap(
  modelText,
  { repositoryUnderstanding, planning },
) {
  let value;

  try {
    value = JSON.parse(modelText);
  } catch {
    fail();
  }

  if (!isPlainObject(value) || !Array.isArray(value.days)) {
    fail();
  }

  requireInteger(value.totalEstimatedMinutes);

  if (value.days.length < 1 || value.days.length > planning.plannedDays) {
    fail();
  }

  const validTopicIds = new Set(
    repositoryUnderstanding.learningTopics.map(({ id }) => id),
  );
  const moduleIds = new Set();
  const orderedModules = [];
  const days = value.days.map((dayValue, index) => {
    if (!isPlainObject(dayValue) || !Array.isArray(dayValue.modules)) {
      fail();
    }

    const day = requireInteger(dayValue.day);
    requireInteger(dayValue.estimatedMinutes);

    if (day !== index + 1 || day > planning.plannedDays) {
      fail();
    }

    if (dayValue.modules.length < 1) {
      fail();
    }

    const modules = dayValue.modules.map((module) =>
      parseModule(module, validTopicIds, moduleIds),
    );
    const estimatedMinutes = modules.reduce(
      (total, module) => total + module.estimatedMinutes,
      0,
    );

    if (estimatedMinutes > planning.dailyStudyMinutes) {
      fail();
    }

    orderedModules.push(...modules);

    return {
      day,
      title: requireString(dayValue.title),
      estimatedMinutes,
      modules,
    };
  });

  validateTopicOrder(
    orderedModules,
    repositoryUnderstanding.learningTopics,
    repositoryUnderstanding.recommendedLearningOrder,
  );

  if (!isPlainObject(value.finalReview)) {
    fail();
  }

  const finalReviewMinutes = requireInteger(value.finalReview.estimatedMinutes);
  const finalReviewTopics = requireStringArray(value.finalReview.topics);
  const scheduledTopicIds = new Set(
    orderedModules.map(({ learningTopicId }) => learningTopicId),
  );

  if (
    finalReviewMinutes < MIN_MODULE_MINUTES ||
    finalReviewMinutes > MAX_MODULE_MINUTES ||
    finalReviewTopics.length < 1 ||
    new Set(finalReviewTopics).size !== finalReviewTopics.length ||
    finalReviewTopics.some(
      (topicId) =>
        !validTopicIds.has(topicId) || !scheduledTopicIds.has(topicId),
    )
  ) {
    fail();
  }

  const moduleMinutes = days.reduce(
    (total, day) => total + day.estimatedMinutes,
    0,
  );
  const totalEstimatedMinutes = moduleMinutes + finalReviewMinutes;

  if (totalEstimatedMinutes > planning.totalAvailableMinutes) {
    fail();
  }

  return {
    title: requireString(value.title),
    repositorySummary: requireString(value.repositorySummary),
    totalEstimatedMinutes,
    days,
    finalReview: {
      estimatedMinutes: finalReviewMinutes,
      topics: finalReviewTopics,
    },
  };
}
