export const MAX_GEMINI_ATTEMPTS = 3;
export const GEMINI_RETRY_INITIAL_DELAY_MS = 500;
export const GEMINI_RETRY_MAX_DELAY_MS = 5_000;
export const GEMINI_REQUEST_TIMEOUT_MS = 45_000;

const TRANSIENT_NETWORK_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "EAI_AGAIN",
  "ENETDOWN",
  "ENETUNREACH",
  "ETIMEDOUT",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_SOCKET",
]);

export class GeminiRequestFailure extends Error {
  constructor(category, diagnostic) {
    super("Gemini request failed");
    this.name = "GeminiRequestFailure";
    this.category = category;
    attachGeminiDiagnostic(this, diagnostic);
  }
}

export function createGeminiDiagnostic(operation, category, attempt) {
  return Object.freeze({
    provider: "gemini",
    operation,
    category,
    attempt,
  });
}

export function attachGeminiDiagnostic(error, diagnostic) {
  Object.defineProperty(error, "diagnostic", {
    configurable: true,
    value: diagnostic,
  });

  return error;
}

export function recordGeminiDiagnostic(
  onDiagnostic,
  operation,
  category,
  attempt,
) {
  const diagnostic = createGeminiDiagnostic(operation, category, attempt);

  if (typeof onDiagnostic === "function") {
    onDiagnostic(diagnostic);
  }

  return diagnostic;
}

function getStatus(error) {
  const status = Number(error?.status ?? error?.response?.status);
  return Number.isInteger(status) ? status : undefined;
}

function isInvalidApiKey(error, status) {
  return (
    status === 400 &&
    typeof error?.message === "string" &&
    /api[\s_-]*key/i.test(error.message)
  );
}

function isTransientNetworkError(error) {
  if (
    TRANSIENT_NETWORK_CODES.has(error?.code) ||
    TRANSIENT_NETWORK_CODES.has(error?.cause?.code)
  ) {
    return true;
  }

  if (error?.name === "AbortError" || error?.name === "TimeoutError") {
    return true;
  }

  return (
    error instanceof TypeError &&
    typeof error.message === "string" &&
    /fetch failed|network|socket|timed?\s*out/i.test(error.message)
  );
}

export function classifyGeminiError(error) {
  const status = getStatus(error);

  if (status === 401 || status === 403 || isInvalidApiKey(error, status)) {
    return { category: "authentication", retryable: false };
  }

  if (status === 429) {
    return { category: "rate-limit", retryable: true };
  }

  if (status === 408) {
    return { category: "transient-transport", retryable: true };
  }

  if (status !== undefined && status >= 500 && status <= 599) {
    return { category: "provider-5xx", retryable: true };
  }

  if (status !== undefined && status >= 400 && status <= 499) {
    return { category: "invalid-request", retryable: false };
  }

  if (isTransientNetworkError(error)) {
    return { category: "transient-transport", retryable: true };
  }

  return { category: "provider-error", retryable: false };
}

function readRetryAfterHeader(error) {
  const headers = error?.headers ?? error?.response?.headers;

  if (typeof headers?.get === "function") {
    return headers.get("retry-after");
  }

  if (headers && typeof headers === "object") {
    const name = Object.keys(headers).find(
      (key) => key.toLowerCase() === "retry-after",
    );
    return name ? headers[name] : undefined;
  }

  return undefined;
}

export function getRetryAfterMilliseconds(error, now = Date.now()) {
  const value = readRetryAfterHeader(error);

  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const seconds = Number(value);
  const milliseconds = Number.isFinite(seconds)
    ? seconds * 1_000
    : Date.parse(String(value)) - now;

  if (!Number.isFinite(milliseconds) || milliseconds < 0) {
    return undefined;
  }

  return Math.min(milliseconds, GEMINI_RETRY_MAX_DELAY_MS);
}

function calculateBackoffMilliseconds(attempt, random) {
  const exponentialDelay = Math.min(
    GEMINI_RETRY_INITIAL_DELAY_MS * 2 ** (attempt - 1),
    GEMINI_RETRY_MAX_DELAY_MS,
  );
  const jitterMultiplier = 0.75 + random() * 0.5;

  return Math.min(
    Math.round(exponentialDelay * jitterMultiplier),
    GEMINI_RETRY_MAX_DELAY_MS,
  );
}

function defaultSleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function requestGeminiWithRetry({
  operation,
  request,
  maxAttempts = MAX_GEMINI_ATTEMPTS,
  sleep = defaultSleep,
  random = Math.random,
  now,
  onDiagnostic,
}) {
  const requestedAttempts = Number.isFinite(maxAttempts)
    ? Math.trunc(maxAttempts)
    : MAX_GEMINI_ATTEMPTS;
  const attemptLimit = Math.max(
    1,
    Math.min(MAX_GEMINI_ATTEMPTS, requestedAttempts),
  );

  for (let attempt = 1; attempt <= attemptLimit; attempt += 1) {
    try {
      return await request();
    } catch (error) {
      const { category, retryable } = classifyGeminiError(error);
      const diagnostic = recordGeminiDiagnostic(
        onDiagnostic,
        operation,
        category,
        attempt,
      );

      if (!retryable || attempt === attemptLimit) {
        throw new GeminiRequestFailure(category, diagnostic);
      }

      const backoffMilliseconds = calculateBackoffMilliseconds(attempt, random);
      const retryAfterMilliseconds = getRetryAfterMilliseconds(error, now?.());
      await sleep(
        retryAfterMilliseconds === undefined
          ? backoffMilliseconds
          : Math.max(backoffMilliseconds, retryAfterMilliseconds),
      );
    }
  }

  throw new GeminiRequestFailure(
    "provider-error",
    createGeminiDiagnostic(operation, "provider-error", attemptLimit),
  );
}
