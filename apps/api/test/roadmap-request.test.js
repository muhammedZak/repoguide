import assert from "node:assert/strict";
import test from "node:test";

import { GitHubRepositoryUrlError } from "../src/github-repository-url.js";
import {
  buildRoadmapPlanning,
  parseRoadmapGenerationRequest,
  RoadmapRequestValidationError,
} from "../src/roadmap-request.js";

const today = "2026-08-27";

function validRequest(overrides = {}) {
  return {
    repoUrl: "https://github.com/example/project",
    interviewDate: "2026-09-03",
    dailyStudyMinutes: 120,
    language: "english",
    ...overrides,
  };
}

test("accepts and normalizes a valid roadmap request", () => {
  const result = parseRoadmapGenerationRequest(validRequest(), { today });

  assert.equal(result.owner, "example");
  assert.equal(result.repo, "project");
  assert.deepEqual(result.planning, {
    interviewDate: "2026-09-03",
    availableDays: 7,
    plannedDays: 7,
    dailyStudyMinutes: 120,
    totalAvailableMinutes: 840,
    planningWindowTruncated: false,
    language: "english",
  });
});

test("rejects an invalid GitHub repository URL", () => {
  assert.throws(
    () =>
      parseRoadmapGenerationRequest(
        validRequest({ repoUrl: "https://gitlab.com/example/project" }),
        { today },
      ),
    GitHubRepositoryUrlError,
  );
});

test("rejects a past interview date", () => {
  assert.throws(
    () =>
      parseRoadmapGenerationRequest(
        validRequest({ interviewDate: "2026-08-26" }),
        { today },
      ),
    RoadmapRequestValidationError,
  );
});

test("rejects malformed and impossible date-only values", () => {
  for (const interviewDate of ["09/03/2026", "2026-02-30", "2026-9-3"]){
    assert.throws(
      () =>
        parseRoadmapGenerationRequest(validRequest({ interviewDate }), {
          today,
        }),
      RoadmapRequestValidationError,
    );
  }
});

test("rejects study time outside the supported bounds", () => {
  for (const dailyStudyMinutes of [29, 481]) {
    assert.throws(
      () =>
        parseRoadmapGenerationRequest(
          validRequest({ dailyStudyMinutes }),
          { today },
        ),
      RoadmapRequestValidationError,
    );
  }
});

test("rejects a non-integer study time and unsupported language", () => {
  assert.throws(
    () =>
      parseRoadmapGenerationRequest(
        validRequest({ dailyStudyMinutes: 60.5 }),
        { today },
      ),
    RoadmapRequestValidationError,
  );
  assert.throws(
    () =>
      parseRoadmapGenerationRequest(validRequest({ language: "spanish" }), {
        today,
      }),
    RoadmapRequestValidationError,
  );
});

test("caps the MVP planning window at 30 days and reports truncation", () => {
  const planning = buildRoadmapPlanning(
    {
      interviewDate: "2026-10-26",
      dailyStudyMinutes: 60,
      language: "english",
    },
    { today },
  );

  assert.equal(planning.availableDays, 60);
  assert.equal(planning.plannedDays, 30);
  assert.equal(planning.totalAvailableMinutes, 1800);
  assert.equal(planning.planningWindowTruncated, true);
});

test("uses date-only ordinals without daylight-saving or timezone shifts", () => {
  const planning = buildRoadmapPlanning(
    {
      interviewDate: "2026-03-10",
      dailyStudyMinutes: 90,
      language: "english",
    },
    { today: "2026-03-08" },
  );
  const sameDayPlanning = buildRoadmapPlanning(
    {
      interviewDate: "2026-03-08",
      dailyStudyMinutes: 90,
      language: "english",
    },
    { today: "2026-03-08" },
  );

  assert.equal(planning.availableDays, 2);
  assert.equal(planning.totalAvailableMinutes, 180);
  assert.equal(sameDayPlanning.availableDays, 1);
});
