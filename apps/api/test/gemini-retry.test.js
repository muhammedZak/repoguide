import assert from "node:assert/strict";
import test from "node:test";

import {
  GEMINI_RETRY_MAX_DELAY_MS,
  GeminiRequestFailure,
  requestGeminiWithRetry,
} from "../src/gemini-retry.js";

function retryOptions(overrides = {}) {
  return {
    operation: "repository-understanding",
    sleep: async () => {},
    random: () => 0.5,
    ...overrides,
  };
}

test("a successful first Gemini request makes one attempt without sleeping", async () => {
  let attempts = 0;
  const sleeps = [];

  const result = await requestGeminiWithRetry(
    retryOptions({
      request: async () => {
        attempts += 1;
        return "success";
      },
      sleep: async (milliseconds) => sleeps.push(milliseconds),
    }),
  );

  assert.equal(result, "success");
  assert.equal(attempts, 1);
  assert.deepEqual(sleeps, []);
});

test("rate limits retry with injected exponential backoff", async () => {
  let attempts = 0;
  const sleeps = [];

  const result = await requestGeminiWithRetry(
    retryOptions({
      request: async () => {
        attempts += 1;
        if (attempts < 3) throw { status: 429 };
        return "recovered";
      },
      sleep: async (milliseconds) => sleeps.push(milliseconds),
    }),
  );

  assert.equal(result, "recovered");
  assert.equal(attempts, 3);
  assert.deepEqual(sleeps, [500, 1_000]);
});

test("provider 5xx and identifiable transport failures retry", async () => {
  for (const failure of [
    { status: 503 },
    Object.assign(new Error("connection reset"), { code: "ECONNRESET" }),
    new TypeError("fetch failed"),
  ]) {
    let attempts = 0;
    const result = await requestGeminiWithRetry(
      retryOptions({
        request: async () => {
          attempts += 1;
          if (attempts === 1) throw failure;
          return "recovered";
        },
      }),
    );

    assert.equal(result, "recovered");
    assert.equal(attempts, 2);
  }
});

test("authentication and invalid-request failures do not retry", async () => {
  for (const failure of [
    { status: 401 },
    { status: 403 },
    { status: 400, message: "API key not valid" },
    { status: 422 },
  ]) {
    let attempts = 0;

    await assert.rejects(
      requestGeminiWithRetry(
        retryOptions({
          request: async () => {
            attempts += 1;
            throw failure;
          },
        }),
      ),
      GeminiRequestFailure,
    );
    assert.equal(attempts, 1);
  }
});

test("three attempts are the hard maximum and exhaustion remains categorized", async () => {
  let attempts = 0;
  const sleeps = [];
  const diagnostics = [];

  await assert.rejects(
    requestGeminiWithRetry(
      retryOptions({
        maxAttempts: 99,
        request: async () => {
          attempts += 1;
          throw { status: 500 };
        },
        sleep: async (milliseconds) => sleeps.push(milliseconds),
        onDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
      }),
    ),
    (error) => {
      assert.equal(error.category, "provider-5xx");
      assert.deepEqual(error.diagnostic, {
        provider: "gemini",
        operation: "repository-understanding",
        category: "provider-5xx",
        attempt: 3,
      });
      return true;
    },
  );

  assert.equal(attempts, 3);
  assert.deepEqual(sleeps, [500, 1_000]);
  assert.deepEqual(
    diagnostics.map(({ attempt }) => attempt),
    [1, 2, 3],
  );
});

test("Retry-After is respected without exposing headers and is capped", async () => {
  let attempts = 0;
  const sleeps = [];

  await requestGeminiWithRetry(
    retryOptions({
      request: async () => {
        attempts += 1;
        if (attempts === 1) {
          throw {
            status: 429,
            headers: {
              "Retry-After": "30",
              authorization: "secret-provider-header",
            },
          };
        }
        return "success";
      },
      sleep: async (milliseconds) => sleeps.push(milliseconds),
    }),
  );

  assert.deepEqual(sleeps, [GEMINI_RETRY_MAX_DELAY_MS]);
});

test("diagnostics contain only safe operation, category, and attempt metadata", async () => {
  const diagnostics = [];
  const secret = "gemini-secret-value";
  const source = "private repository source";
  const prompt = "full hidden prompt";

  await assert.rejects(
    requestGeminiWithRetry(
      retryOptions({
        operation: "roadmap-generation",
        request: async () => {
          throw {
            status: 429,
            message: `${secret} ${source} ${prompt}`,
            headers: { authorization: secret },
          };
        },
        maxAttempts: 1,
        onDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
      }),
    ),
    GeminiRequestFailure,
  );

  assert.deepEqual(diagnostics, [
    {
      provider: "gemini",
      operation: "roadmap-generation",
      category: "rate-limit",
      attempt: 1,
    },
  ]);
  const serialized = JSON.stringify(diagnostics);
  assert.equal(serialized.includes(secret), false);
  assert.equal(serialized.includes(source), false);
  assert.equal(serialized.includes(prompt), false);
});
