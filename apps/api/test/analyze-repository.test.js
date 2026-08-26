import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { createApp } from "../src/app.js";

let baseUrl;
let server;

before(
  () =>
    new Promise((resolve) => {
      server = createApp().listen(0, "127.0.0.1", () => {
        const address = server.address();
        assert.notEqual(address, null);
        assert.equal(typeof address, "object");
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    }),
);

after(
  () =>
    new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    }),
);

async function analyze(body) {
  const response = await fetch(`${baseUrl}/api/repos/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  return {
    body: await response.json(),
    status: response.status,
  };
}

test("POST /api/repos/analyze returns the parsed owner and repository", async () => {
  const result = await analyze({
    repoUrl: "https://github.com/facebook/react",
  });

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { owner: "facebook", repo: "react" });
});

test("POST /api/repos/analyze accepts a trailing slash", async () => {
  const result = await analyze({
    repoUrl: "https://github.com/facebook/react/",
  });

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { owner: "facebook", repo: "react" });
});

test("POST /api/repos/analyze rejects invalid repository URLs", async () => {
  const invalidUrls = [
    "https://gitlab.com/example/repo",
    "https://github.com/facebook",
    "hello",
  ];

  for (const repoUrl of invalidUrls) {
    const result = await analyze({ repoUrl });

    assert.equal(result.status, 400);
    assert.equal(typeof result.body.error, "string");
    assert.ok(result.body.error.length > 0);
  }
});

test("POST /api/repos/analyze rejects a missing repoUrl", async () => {
  const result = await analyze({});

  assert.equal(result.status, 400);
  assert.deepEqual(result.body, { error: "repoUrl is required." });
});

test("POST /api/repos/analyze returns JSON for malformed request bodies", async () => {
  const response = await fetch(`${baseUrl}/api/repos/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{not-valid-json",
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "Request body must contain valid JSON.",
  });
});
