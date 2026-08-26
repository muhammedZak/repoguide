import { DEFAULT_MAX_CANDIDATE_FILE_SIZE } from "./repository-file-filter.js";

export const DEFAULT_MAX_CONTENT_FILES = 40;
export const DEFAULT_MAX_TOTAL_CONTENT_BYTES = 5 * 1024 * 1024;
export const DEFAULT_CONTENT_FETCH_CONCURRENCY = 5;

export class RepositoryContentRateLimitError extends Error {
  constructor() {
    super("Repository content retrieval rate limited");
    this.name = "RepositoryContentRateLimitError";
  }
}

export class RepositoryContentUpstreamError extends Error {
  constructor() {
    super("Repository content retrieval failed");
    this.name = "RepositoryContentUpstreamError";
  }
}

class InvalidBlobResponseError extends Error {}

function validateNonNegativeInteger(value, name) {
  if (!Number.isInteger(value) || value < 0) {
    throw new TypeError(`${name} must be a non-negative integer`);
  }
}

function planContentFiles(files, maxContentFiles, maxTotalContentBytes) {
  const consideredFiles = files.slice(0, maxContentFiles);
  const plannedFiles = [];
  let plannedKnownBytes = 0;
  let knownSizeBudgetExhausted = false;
  let budgetExcludedFiles = 0;

  for (const file of consideredFiles) {
    if (file.size !== null) {
      if (
        knownSizeBudgetExhausted ||
        plannedKnownBytes + file.size > maxTotalContentBytes
      ) {
        knownSizeBudgetExhausted = true;
        budgetExcludedFiles += 1;
        continue;
      }

      plannedKnownBytes += file.size;
    }

    plannedFiles.push(file);
  }

  return { budgetExcludedFiles, plannedFiles };
}

function decodeBase64Blob(data) {
  if (data?.encoding !== "base64" || typeof data?.content !== "string") {
    throw new InvalidBlobResponseError();
  }

  const base64Content = data.content.replace(/\s/g, "");

  if (
    base64Content.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(base64Content)
  ) {
    throw new InvalidBlobResponseError();
  }

  const buffer = Buffer.from(base64Content, "base64");
  const normalizedInput = base64Content.replace(/=+$/, "");
  const normalizedDecoded = buffer.toString("base64").replace(/=+$/, "");

  if (normalizedInput !== normalizedDecoded) {
    throw new InvalidBlobResponseError();
  }

  return buffer;
}

function isRateLimitError(error) {
  return error?.status === 403 || error?.status === 429;
}

export async function retrieveRepositoryContents(
  { owner, repo, files, fetchBlob },
  {
    maxContentFiles = DEFAULT_MAX_CONTENT_FILES,
    maxTotalContentBytes = DEFAULT_MAX_TOTAL_CONTENT_BYTES,
    concurrency = DEFAULT_CONTENT_FETCH_CONCURRENCY,
  } = {},
) {
  validateNonNegativeInteger(maxContentFiles, "maxContentFiles");
  validateNonNegativeInteger(maxTotalContentBytes, "maxTotalContentBytes");

  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new TypeError("concurrency must be a positive integer");
  }

  const { budgetExcludedFiles, plannedFiles } = planContentFiles(
    files,
    maxContentFiles,
    maxTotalContentBytes,
  );
  const outcomes = new Array(plannedFiles.length);
  let nextIndex = 0;
  let rateLimitError = null;

  async function worker() {
    while (!rateLimitError) {
      const index = nextIndex;
      nextIndex += 1;

      if (index >= plannedFiles.length) {
        return;
      }

      const file = plannedFiles[index];

      try {
        const data = await fetchBlob({ owner, repo, sha: file.sha });
        const buffer = decodeBase64Blob(data);

        if (
          buffer.length > DEFAULT_MAX_CANDIDATE_FILE_SIZE ||
          buffer.includes(0)
        ) {
          outcomes[index] = { status: "skipped" };
          continue;
        }

        outcomes[index] = { buffer, file, status: "decoded" };
      } catch (error) {
        if (isRateLimitError(error)) {
          rateLimitError = new RepositoryContentRateLimitError();
          continue;
        }

        outcomes[index] = {
          status: error?.status === 404 ? "skipped" : "failed",
        };
      }
    }
  }

  const workerCount = Math.min(concurrency, plannedFiles.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  if (rateLimitError) {
    throw rateLimitError;
  }

  const documents = [];
  let retrievedBytes = 0;
  let skippedFiles = 0;
  let failedFiles = 0;

  for (const outcome of outcomes) {
    if (outcome.status === "skipped") {
      skippedFiles += 1;
      continue;
    }

    if (outcome.status === "failed") {
      failedFiles += 1;
      continue;
    }

    if (retrievedBytes + outcome.buffer.length > maxTotalContentBytes) {
      skippedFiles += 1;
      continue;
    }

    retrievedBytes += outcome.buffer.length;
    documents.push({
      ...outcome.file,
      content: outcome.buffer.toString("utf8"),
    });
  }

  if (
    plannedFiles.length > 0 &&
    documents.length === 0 &&
    failedFiles === plannedFiles.length
  ) {
    throw new RepositoryContentUpstreamError();
  }

  return {
    documents,
    summary: {
      requestedFiles: plannedFiles.length,
      retrievedFiles: documents.length,
      skippedFiles,
      failedFiles,
      budgetExcludedFiles,
      retrievedBytes,
    },
  };
}
