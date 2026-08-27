export type RoadmapLanguage = "english" | "malayalam";

export type RoadmapModule = {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  learningTopicId: string;
};

export type RoadmapDay = {
  day: number;
  title: string;
  estimatedMinutes: number;
  modules: RoadmapModule[];
};

export type RoadmapResponse = {
  repository: {
    fullName: string;
    description: string | null;
    primaryLanguage: string | null;
  };
  planning: {
    interviewDate: string;
    availableDays: number;
    plannedDays: number;
    dailyStudyMinutes: number;
    totalAvailableMinutes: number;
    planningWindowTruncated: boolean;
  };
  roadmap: {
    title: string;
    repositorySummary: string;
    totalEstimatedMinutes: number;
    days: RoadmapDay[];
    finalReview: {
      estimatedMinutes: number;
      topics: string[];
    };
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && Boolean(value.trim());
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

function isRoadmapModule(value: unknown): value is RoadmapModule {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.title) &&
    isNonEmptyString(value.description) &&
    isPositiveInteger(value.estimatedMinutes) &&
    ["beginner", "intermediate", "advanced"].includes(
      String(value.difficulty),
    ) &&
    isNonEmptyString(value.learningTopicId)
  );
}

function isRoadmapDay(value: unknown): value is RoadmapDay {
  if (!isRecord(value) || !Array.isArray(value.modules)) {
    return false;
  }

  return (
    isPositiveInteger(value.day) &&
    isNonEmptyString(value.title) &&
    isPositiveInteger(value.estimatedMinutes) &&
    value.modules.length > 0 &&
    value.modules.every(isRoadmapModule)
  );
}

export function isRoadmapResponse(value: unknown): value is RoadmapResponse {
  if (!isRecord(value)) {
    return false;
  }

  const repository = value.repository;
  const planning = value.planning;
  const roadmap = value.roadmap;

  if (
    !isRecord(repository) ||
    !isRecord(planning) ||
    !isRecord(roadmap) ||
    !Array.isArray(roadmap.days) ||
    !isRecord(roadmap.finalReview)
  ) {
    return false;
  }

  return (
    isNonEmptyString(repository.fullName) &&
    (repository.description === null ||
      typeof repository.description === "string") &&
    (repository.primaryLanguage === null ||
      typeof repository.primaryLanguage === "string") &&
    /^\d{4}-\d{2}-\d{2}$/.test(String(planning.interviewDate)) &&
    isPositiveInteger(planning.availableDays) &&
    isPositiveInteger(planning.plannedDays) &&
    isPositiveInteger(planning.dailyStudyMinutes) &&
    isPositiveInteger(planning.totalAvailableMinutes) &&
    typeof planning.planningWindowTruncated === "boolean" &&
    isNonEmptyString(roadmap.title) &&
    isNonEmptyString(roadmap.repositorySummary) &&
    isNonNegativeInteger(roadmap.totalEstimatedMinutes) &&
    roadmap.days.length > 0 &&
    roadmap.days.every(isRoadmapDay) &&
    isPositiveInteger(roadmap.finalReview.estimatedMinutes) &&
    Array.isArray(roadmap.finalReview.topics) &&
    roadmap.finalReview.topics.length > 0 &&
    roadmap.finalReview.topics.every(isNonEmptyString)
  );
}

export function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes} min`;
  }

  if (remainingMinutes === 0) {
    return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  }

  return `${hours} hr ${remainingMinutes} min`;
}

export function formatInterviewDate(dateOnly: string) {
  const [year, month, day] = dateOnly.split("-").map(Number);

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
