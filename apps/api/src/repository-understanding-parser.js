const IMPORTANCE_VALUES = new Set(["high", "medium", "low"]);
const DIFFICULTY_VALUES = new Set([
  "beginner",
  "intermediate",
  "advanced",
]);

export class RepositoryUnderstandingMalformedResponseError extends Error {
  constructor() {
    super("Claude returned malformed repository understanding");
    this.name = "RepositoryUnderstandingMalformedResponseError";
  }
}

function fail() {
  throw new RepositoryUnderstandingMalformedResponseError();
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

function requireStringArray(value) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    fail();
  }

  return value;
}

function requireEnum(value, allowedValues) {
  if (!allowedValues.has(value)) {
    fail();
  }

  return value;
}

function uniqueAllowedPaths(paths, allowedEvidencePaths) {
  return [
    ...new Set(paths.filter((path) => allowedEvidencePaths.has(path))),
  ];
}

function parseMajorArea(value, allowedEvidencePaths) {
  if (!isPlainObject(value)) {
    fail();
  }

  return {
    id: requireString(value.id),
    name: requireString(value.name),
    purpose: requireString(value.purpose),
    importance: requireEnum(value.importance, IMPORTANCE_VALUES),
    evidencePaths: uniqueAllowedPaths(
      requireStringArray(value.evidencePaths),
      allowedEvidencePaths,
    ),
  };
}

function parseLearningTopic(value, allowedEvidencePaths) {
  if (!isPlainObject(value)) {
    fail();
  }

  return {
    id: requireString(value.id),
    title: requireString(value.title),
    description: requireString(value.description),
    importance: requireEnum(value.importance, IMPORTANCE_VALUES),
    difficulty: requireEnum(value.difficulty, DIFFICULTY_VALUES),
    evidencePaths: uniqueAllowedPaths(
      requireStringArray(value.evidencePaths),
      allowedEvidencePaths,
    ),
    prerequisites: [...new Set(requireStringArray(value.prerequisites))],
  };
}

function parseInterviewFocus(value, allowedEvidencePaths) {
  if (!isPlainObject(value)) {
    fail();
  }

  return {
    topic: requireString(value.topic),
    reason: requireString(value.reason),
    evidencePaths: uniqueAllowedPaths(
      requireStringArray(value.evidencePaths),
      allowedEvidencePaths,
    ),
  };
}

function requireUniqueIds(entries) {
  const ids = entries.map(({ id }) => id);

  if (new Set(ids).size !== ids.length) {
    fail();
  }
}

export function parseRepositoryUnderstanding(
  modelText,
  { evidencePaths } = { evidencePaths: [] },
) {
  let value;

  try {
    value = JSON.parse(modelText);
  } catch {
    fail();
  }

  if (!isPlainObject(value)) {
    fail();
  }

  for (const field of [
    "majorAreas",
    "learningTopics",
    "recommendedLearningOrder",
    "interviewFocus",
    "uncertainties",
  ]) {
    if (!Array.isArray(value[field])) {
      fail();
    }
  }

  const allowedEvidencePaths = new Set(evidencePaths);
  const majorAreas = value.majorAreas
    .map((item) => parseMajorArea(item, allowedEvidencePaths))
    .filter(({ evidencePaths: paths }) => paths.length > 0);
  const learningTopics = value.learningTopics
    .map((item) => parseLearningTopic(item, allowedEvidencePaths))
    .filter(({ evidencePaths: paths }) => paths.length > 0);

  requireUniqueIds(majorAreas);
  requireUniqueIds(learningTopics);

  const learningTopicIds = new Set(learningTopics.map(({ id }) => id));

  for (const topic of learningTopics) {
    topic.prerequisites = topic.prerequisites.filter(
      (id) => id !== topic.id && learningTopicIds.has(id),
    );
  }

  const recommendedLearningOrder = [
    ...new Set(requireStringArray(value.recommendedLearningOrder)),
  ].filter((id) => learningTopicIds.has(id));
  const interviewFocus = value.interviewFocus
    .map((item) => parseInterviewFocus(item, allowedEvidencePaths))
    .filter(({ evidencePaths: paths }) => paths.length > 0);

  return {
    projectSummary: requireString(value.projectSummary),
    majorAreas,
    learningTopics,
    recommendedLearningOrder,
    interviewFocus,
    uncertainties: requireStringArray(value.uncertainties).map(requireString),
  };
}
