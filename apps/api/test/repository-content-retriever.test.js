import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_CONTENT_FETCH_CONCURRENCY,
  DEFAULT_MAX_CONTENT_FILES,
  RepositoryContentRateLimitError,
  RepositoryContentUpstreamError,
  retrieveRepositoryContents,
} from "../src/repository-content-retriever.js";
import { DEFAULT_MAX_CANDIDATE_FILE_SIZE } from "../src/repository-file-filter.js";

function inspectionFile(path, size = 100) {
  return {
    path,
    sha: `${path}-sha`,
    size,
    category: "source",
    priority: "medium",
    score: 60,
  };
}

function blobData(content) {
  return {
    content: Buffer.from(content).toString("base64"),
    encoding: "base64",
  };
}

function retrieve(files, fetchBlob, options) {
  return retrieveRepositoryContents(
    {
      owner: "canonical-owner",
      repo: "canonical-repo",
      files,
      fetchBlob,
    },
    options,
  );
}

test("retrieves a selected file by blob SHA and decodes a private text document", async () => {
  const file = inspectionFile("src/server.js", 21);
  const requests = [];
  const encodedContent = blobData('console.log("ready");\n');

  const result = await retrieve([file], async (parameters) => {
    requests.push(parameters);
    return encodedContent;
  });

  assert.deepEqual(requests, [
    {
      owner: "canonical-owner",
      repo: "canonical-repo",
      sha: "src/server.js-sha",
    },
  ]);
  assert.deepEqual(result.documents, [
    {
      ...file,
      content: 'console.log("ready");\n',
    },
  ]);
  assert.equal("encoding" in result.documents[0], false);
  assert.equal(
    result.documents[0].content,
    Buffer.from(encodedContent.content, "base64").toString("utf8"),
  );
});

test("retrieves at most 40 files by default", async () => {
  const files = Array.from({ length: DEFAULT_MAX_CONTENT_FILES + 5 }, (_, index) =>
    inspectionFile(`src/file-${String(index).padStart(2, "0")}.js`, 1),
  );
  let requests = 0;

  const result = await retrieve(files, async () => {
    requests += 1;
    return blobData("x");
  });

  assert.equal(requests, DEFAULT_MAX_CONTENT_FILES);
  assert.equal(result.documents.length, DEFAULT_MAX_CONTENT_FILES);
  assert.equal(result.summary.requestedFiles, DEFAULT_MAX_CONTENT_FILES);
});

test("supports a custom content-file limit", async () => {
  const files = [
    inspectionFile("a.js", 1),
    inspectionFile("b.js", 1),
    inspectionFile("c.js", 1),
  ];

  const result = await retrieve(files, async () => blobData("x"), {
    maxContentFiles: 2,
  });

  assert.equal(result.documents.length, 2);
  assert.equal(result.summary.requestedFiles, 2);
});

test("uses known sizes to respect the planned total-content budget", async () => {
  const files = [
    inspectionFile("first.js", 6),
    inspectionFile("too-large.js", 5),
    inspectionFile("unknown.js", null),
    inspectionFile("later-known.js", 1),
  ];
  const requestedShas = [];

  const result = await retrieve(
    files,
    async ({ sha }) => {
      requestedShas.push(sha);
      return blobData("x");
    },
    { maxTotalContentBytes: 10 },
  );

  assert.deepEqual(requestedShas, ["first.js-sha", "unknown.js-sha"]);
  assert.equal(result.summary.requestedFiles, 2);
  assert.equal(result.summary.budgetExcludedFiles, 2);
});

test("checks actual decoded size against the shared per-file limit", async () => {
  const oversizedContent = Buffer.alloc(
    DEFAULT_MAX_CANDIDATE_FILE_SIZE + 1,
    "a",
  );
  const result = await retrieve(
    [inspectionFile("unknown-size.js", null)],
    async () => blobData(oversizedContent),
  );

  assert.deepEqual(result.documents, []);
  assert.equal(result.summary.skippedFiles, 1);
  assert.equal(result.summary.retrievedBytes, 0);
});

test("uses actual decoded bytes to enforce the total-content budget", async () => {
  const files = [
    inspectionFile("first.js", null),
    inspectionFile("second.js", null),
  ];
  const result = await retrieve(files, async () => blobData("123456"), {
    maxTotalContentBytes: 10,
  });

  assert.deepEqual(
    result.documents.map((document) => document.path),
    ["first.js"],
  );
  assert.equal(result.summary.retrievedBytes, 6);
  assert.equal(result.summary.skippedFiles, 1);
});

test("retrieves a null-size candidate when its decoded content is safe", async () => {
  const result = await retrieve(
    [inspectionFile("unknown.js", null)],
    async () => blobData("safe text"),
  );

  assert.equal(result.documents.length, 1);
  assert.equal(result.documents[0].size, null);
});

test("skips decoded content containing a NUL byte", async () => {
  const binaryLikeContent = Buffer.from([0x61, 0x00, 0x62]);
  const result = await retrieve(
    [inspectionFile("binary-like.txt", 3)],
    async () => blobData(binaryLikeContent),
  );

  assert.deepEqual(result.documents, []);
  assert.equal(result.summary.skippedFiles, 1);
});

test("skips an individual missing blob and continues", async () => {
  const files = [inspectionFile("missing.js"), inspectionFile("present.js")];
  const result = await retrieve(files, async ({ sha }) => {
    if (sha === "missing.js-sha") {
      throw { status: 404 };
    }

    return blobData("present");
  });

  assert.deepEqual(
    result.documents.map((document) => document.path),
    ["present.js"],
  );
  assert.equal(result.summary.skippedFiles, 1);
  assert.equal(result.summary.failedFiles, 0);
});

test("records an individual unexpected failure and continues", async () => {
  const files = [inspectionFile("failed.js"), inspectionFile("present.js")];
  const result = await retrieve(files, async ({ sha }) => {
    if (sha === "failed.js-sha") {
      throw new Error("upstream details");
    }

    return blobData("present");
  });

  assert.equal(result.documents.length, 1);
  assert.equal(result.summary.failedFiles, 1);
});

test("fails safely when every requested blob has an unexpected failure", async () => {
  await assert.rejects(
    retrieve([inspectionFile("failed.js")], async () => {
      throw new Error("upstream details");
    }),
    RepositoryContentUpstreamError,
  );
});

test("treats a blob rate limit as a hard failure", async () => {
  await assert.rejects(
    retrieve([inspectionFile("rate-limited.js")], async () => {
      throw { status: 403, token: "must-not-leak" };
    }),
    RepositoryContentRateLimitError,
  );
});

test("never exceeds the configured fetch concurrency", async () => {
  const files = Array.from({ length: 10 }, (_, index) =>
    inspectionFile(`src/file-${index}.js`, 1),
  );
  let activeRequests = 0;
  let maximumActiveRequests = 0;

  await retrieve(
    files,
    async () => {
      activeRequests += 1;
      maximumActiveRequests = Math.max(
        maximumActiveRequests,
        activeRequests,
      );
      await new Promise((resolve) => setTimeout(resolve, 5));
      activeRequests -= 1;
      return blobData("x");
    },
    { concurrency: 3 },
  );

  assert.equal(maximumActiveRequests, 3);
  assert.ok(maximumActiveRequests <= DEFAULT_CONTENT_FETCH_CONCURRENCY);
});

test("preserves prioritized document order despite request completion order", async () => {
  const files = [
    inspectionFile("first.js", 1),
    inspectionFile("second.js", 1),
    inspectionFile("third.js", 1),
  ];
  const delays = {
    "first.js-sha": 15,
    "second.js-sha": 5,
    "third.js-sha": 0,
  };

  const result = await retrieve(files, async ({ sha }) => {
    await new Promise((resolve) => setTimeout(resolve, delays[sha]));
    return blobData(sha);
  });

  assert.deepEqual(
    result.documents.map((document) => document.path),
    ["first.js", "second.js", "third.js"],
  );
});
