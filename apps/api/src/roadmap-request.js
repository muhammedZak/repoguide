import { parseGitHubRepositoryUrl } from "./github-repository-url.js";

export const DEFAULT_MAX_ROADMAP_DAYS = 30;
export const MIN_DAILY_STUDY_MINUTES = 30;
export const MAX_DAILY_STUDY_MINUTES = 480;

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const SUPPORTED_LANGUAGES = new Set(["english", "malayalam"]);

export class RoadmapRequestValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "RoadmapRequestValidationError";
  }
}

function fail(message) {
  throw new RoadmapRequestValidationError(message);
}

function parseDateOnly(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthLengths = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  if (year < 1000 || month < 1 || month > 12) {
    return null;
  }

  if (day < 1 || day > monthLengths[month - 1]) {
    return null;
  }

  return {
    value,
    ordinal: Math.floor(Date.UTC(year, month - 1, day) / MILLISECONDS_PER_DAY),
  };
}

export function getTodayDateOnly(now = new Date()) {
  const year = String(now.getFullYear()).padStart(4, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function buildRoadmapPlanning(
  { interviewDate, dailyStudyMinutes, language },
  { today = getTodayDateOnly() } = {},
) {
  const parsedToday = parseDateOnly(today);
  const parsedInterviewDate = parseDateOnly(interviewDate);

  if (!parsedToday) {
    throw new TypeError("today must be a valid date in YYYY-MM-DD format");
  }

  if (!parsedInterviewDate) {
    fail("interviewDate must be a valid date in YYYY-MM-DD format.");
  }

  const calendarDifference =
    parsedInterviewDate.ordinal - parsedToday.ordinal;

  if (calendarDifference < 0) {
    fail("interviewDate must be today or later.");
  }

  const availableDays = Math.max(1, calendarDifference);
  const plannedDays = Math.min(availableDays, DEFAULT_MAX_ROADMAP_DAYS);

  return {
    interviewDate: parsedInterviewDate.value,
    availableDays,
    plannedDays,
    dailyStudyMinutes,
    totalAvailableMinutes: plannedDays * dailyStudyMinutes,
    planningWindowTruncated: availableDays > plannedDays,
    language,
  };
}

export function parseRoadmapGenerationRequest(
  body,
  { today = getTodayDateOnly() } = {},
) {
  const repoUrl = body?.repoUrl;
  const interviewDate = body?.interviewDate;
  const dailyStudyMinutes = body?.dailyStudyMinutes;
  const language = body?.language;

  if (
    repoUrl === undefined ||
    repoUrl === null ||
    (typeof repoUrl === "string" && !repoUrl.trim())
  ) {
    fail("repoUrl is required.");
  }

  if (typeof repoUrl !== "string") {
    fail("repoUrl must be a string.");
  }

  if (interviewDate === undefined || interviewDate === null || !interviewDate) {
    fail("interviewDate is required.");
  }

  if (typeof interviewDate !== "string") {
    fail("interviewDate must be a valid date in YYYY-MM-DD format.");
  }

  if (dailyStudyMinutes === undefined || dailyStudyMinutes === null) {
    fail("dailyStudyMinutes is required.");
  }

  if (!Number.isInteger(dailyStudyMinutes)) {
    fail("dailyStudyMinutes must be an integer.");
  }

  if (dailyStudyMinutes < MIN_DAILY_STUDY_MINUTES) {
    fail(`dailyStudyMinutes must be at least ${MIN_DAILY_STUDY_MINUTES}.`);
  }

  if (dailyStudyMinutes > MAX_DAILY_STUDY_MINUTES) {
    fail(`dailyStudyMinutes must be at most ${MAX_DAILY_STUDY_MINUTES}.`);
  }

  if (!SUPPORTED_LANGUAGES.has(language)) {
    fail("language must be either english or malayalam.");
  }

  const { owner, repo } = parseGitHubRepositoryUrl(repoUrl.trim());
  const planning = buildRoadmapPlanning(
    { interviewDate, dailyStudyMinutes, language },
    { today },
  );

  return { owner, repo, planning };
}
