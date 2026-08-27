import assert from "node:assert/strict";
import test from "node:test";

import {
  parseGeneratedRoadmap,
  RoadmapMalformedResponseError,
} from "../src/roadmap-parser.js";

const repositoryUnderstanding = {
  learningTopics: [
    {
      id: "project-structure",
      title: "Project Structure",
      prerequisites: [],
    },
    {
      id: "backend-flow",
      title: "Backend Flow",
      prerequisites: ["project-structure"],
    },
    {
      id: "testing",
      title: "Testing",
      prerequisites: ["backend-flow"],
    },
  ],
  recommendedLearningOrder: [
    "project-structure",
    "backend-flow",
    "testing",
  ],
};

const planning = {
  plannedDays: 2,
  dailyStudyMinutes: 120,
  totalAvailableMinutes: 240,
};

function validRoadmap() {
  return {
    title: "Learning Roadmap",
    repositorySummary: "A small backend project.",
    totalEstimatedMinutes: 999,
    days: [
      {
        day: 1,
        title: "Foundations",
        estimatedMinutes: 999,
        modules: [
          {
            id: "structure-module",
            title: "Project Structure",
            description: "Learn the main folders.",
            estimatedMinutes: 45,
            difficulty: "beginner",
            learningTopicId: "project-structure",
          },
        ],
      },
      {
        day: 2,
        title: "Application Flow",
        estimatedMinutes: 999,
        modules: [
          {
            id: "backend-module",
            title: "Backend Flow",
            description: "Trace a request through the backend.",
            estimatedMinutes: 60,
            difficulty: "intermediate",
            learningTopicId: "backend-flow",
          },
        ],
      },
    ],
    finalReview: {
      estimatedMinutes: 30,
      topics: ["project-structure", "backend-flow"],
    },
  };
}

function parse(value, overrides = {}) {
  return parseGeneratedRoadmap(JSON.stringify(value), {
    repositoryUnderstanding,
    planning: { ...planning, ...overrides },
  });
}

test("accepts a valid roadmap and recalculates day and total estimates", () => {
  const result = parse(validRoadmap());

  assert.deepEqual(
    result.days.map(({ estimatedMinutes }) => estimatedMinutes),
    [45, 60],
  );
  assert.equal(result.totalEstimatedMinutes, 135);
  assert.deepEqual(
    result.days.flatMap(({ modules }) =>
      modules.map(({ learningTopicId }) => learningTopicId),
    ),
    ["project-structure", "backend-flow"],
  );
});

test("rejects unknown learning topic IDs", () => {
  const value = validRoadmap();
  value.days[0].modules[0].learningTopicId = "invented-topic";

  assert.throws(() => parse(value), RoadmapMalformedResponseError);
});

test("rejects duplicate, out-of-order, and nonconsecutive days", () => {
  for (const days of [
    [1, 1],
    [2, 1],
    [1, 3],
  ]) {
    const value = validRoadmap();
    value.days[0].day = days[0];
    value.days[1].day = days[1];

    assert.throws(() => parse(value), RoadmapMalformedResponseError);
  }
});

test("rejects module durations outside 15 to 120 minutes", () => {
  for (const estimatedMinutes of [14, 121, 30.5]) {
    const value = validRoadmap();
    value.days[0].modules[0].estimatedMinutes = estimatedMinutes;

    assert.throws(() => parse(value), RoadmapMalformedResponseError);
  }
});

test("rejects a day that exceeds daily capacity", () => {
  const value = validRoadmap();
  value.days[1].modules.push({
    ...value.days[1].modules[0],
    id: "second-backend-module",
    estimatedMinutes: 75,
  });

  assert.throws(() => parse(value), RoadmapMalformedResponseError);
});

test("rejects a roadmap that exceeds total planned capacity", () => {
  assert.throws(
    () => parse(validRoadmap(), { totalAvailableMinutes: 120 }),
    RoadmapMalformedResponseError,
  );
});

test("rejects topic order that contradicts recommended order or prerequisites", () => {
  const value = validRoadmap();
  const firstTopic = value.days[0].modules[0];
  const secondTopic = value.days[1].modules[0];

  value.days[0].modules[0] = secondTopic;
  value.days[1].modules[0] = firstTopic;

  assert.throws(() => parse(value), RoadmapMalformedResponseError);
});

test("rejects duplicate module IDs and invented final review topics", () => {
  const duplicateModule = validRoadmap();
  duplicateModule.days[1].modules[0].id = "structure-module";
  const inventedReview = validRoadmap();
  inventedReview.finalReview.topics.push("invented-topic");

  assert.throws(
    () => parse(duplicateModule),
    RoadmapMalformedResponseError,
  );
  assert.throws(
    () => parse(inventedReview),
    RoadmapMalformedResponseError,
  );
});

test("rejects final review topics that were not scheduled", () => {
  const value = validRoadmap();
  value.finalReview.topics.push("testing");

  assert.throws(() => parse(value), RoadmapMalformedResponseError);
});
