import assert from "node:assert/strict";
import test from "node:test";

import {
  parseRepositoryUnderstanding,
  RepositoryUnderstandingMalformedResponseError,
} from "../src/repository-understanding-parser.js";

function validUnderstanding() {
  return {
    projectSummary: "The repository appears to contain a web application.",
    majorAreas: [
      {
        id: "frontend",
        name: "Frontend",
        purpose: "Renders the user interface.",
        importance: "high",
        evidencePaths: ["src/main.js"],
      },
    ],
    learningTopics: [
      {
        id: "project-structure",
        title: "Project Structure",
        description: "Understand the main files.",
        importance: "high",
        difficulty: "beginner",
        evidencePaths: ["README.md"],
        prerequisites: [],
      },
      {
        id: "frontend-flow",
        title: "Frontend Flow",
        description: "Trace the frontend entry point.",
        importance: "high",
        difficulty: "intermediate",
        evidencePaths: ["src/main.js"],
        prerequisites: ["project-structure"],
      },
    ],
    recommendedLearningOrder: ["project-structure", "frontend-flow"],
    interviewFocus: [
      {
        topic: "Frontend startup",
        reason: "It connects the main application pieces.",
        evidencePaths: ["src/main.js"],
      },
    ],
    uncertainties: ["Only selected files were supplied."],
  };
}

const evidencePaths = ["README.md", "src/main.js"];

test("parses and retains every field from a valid structured response", () => {
  const value = validUnderstanding();
  const result = parseRepositoryUnderstanding(JSON.stringify(value), {
    evidencePaths,
  });

  assert.deepEqual(result, value);
  assert.equal(result.projectSummary, value.projectSummary);
  assert.deepEqual(result.majorAreas, value.majorAreas);
  assert.deepEqual(result.learningTopics, value.learningTopics);
  assert.deepEqual(
    result.recommendedLearningOrder,
    value.recommendedLearningOrder,
  );
  assert.deepEqual(result.interviewFocus, value.interviewFocus);
  assert.deepEqual(result.uncertainties, value.uncertainties);
});

test("handles malformed JSON with a safe typed error", () => {
  assert.throws(
    () => parseRepositoryUnderstanding("{not-json", { evidencePaths }),
    RepositoryUnderstandingMalformedResponseError,
  );
});

test("handles missing required top-level fields safely", () => {
  const value = validUnderstanding();
  delete value.learningTopics;

  assert.throws(
    () =>
      parseRepositoryUnderstanding(JSON.stringify(value), { evidencePaths }),
    RepositoryUnderstandingMalformedResponseError,
  );
});

test("removes fabricated paths and drops entries with no surviving evidence", () => {
  const value = validUnderstanding();
  value.majorAreas[0].evidencePaths.push("invented/area.js");
  value.majorAreas.push({
    id: "invented",
    name: "Invented",
    purpose: "Unsupported",
    importance: "low",
    evidencePaths: ["invented/only.js"],
  });
  value.learningTopics.push({
    id: "invented-topic",
    title: "Invented Topic",
    description: "Unsupported",
    importance: "low",
    difficulty: "advanced",
    evidencePaths: ["invented/topic.js"],
    prerequisites: [],
  });
  value.interviewFocus.push({
    topic: "Invented focus",
    reason: "Unsupported",
    evidencePaths: ["invented/focus.js"],
  });
  value.recommendedLearningOrder.push("invented-topic", "unknown-topic");
  value.learningTopics[1].prerequisites.push("unknown-topic");

  const result = parseRepositoryUnderstanding(JSON.stringify(value), {
    evidencePaths,
  });

  assert.deepEqual(result.majorAreas[0].evidencePaths, ["src/main.js"]);
  assert.equal(result.majorAreas.some(({ id }) => id === "invented"), false);
  assert.equal(
    result.learningTopics.some(({ id }) => id === "invented-topic"),
    false,
  );
  assert.equal(
    result.interviewFocus.some(({ topic }) => topic === "Invented focus"),
    false,
  );
  assert.deepEqual(result.recommendedLearningOrder, [
    "project-structure",
    "frontend-flow",
  ]);
  assert.deepEqual(result.learningTopics[1].prerequisites, [
    "project-structure",
  ]);
});

test("retains valid paths while removing unknown paths", () => {
  const value = validUnderstanding();
  value.learningTopics[0].evidencePaths = ["unknown.md", "README.md"];

  const result = parseRepositoryUnderstanding(JSON.stringify(value), {
    evidencePaths,
  });

  assert.deepEqual(result.learningTopics[0].evidencePaths, ["README.md"]);
});

test("rejects malformed important nested fields", () => {
  const value = validUnderstanding();
  value.majorAreas[0].importance = "critical";

  assert.throws(
    () =>
      parseRepositoryUnderstanding(JSON.stringify(value), { evidencePaths }),
    RepositoryUnderstandingMalformedResponseError,
  );
});
