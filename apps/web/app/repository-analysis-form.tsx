"use client";

import { FormEvent, useState } from "react";

type FormValues = {
  repositoryUrl: string;
  interviewDate: string;
  studyTime: string;
  language: "simple-english" | "malayalam";
};

type FormErrors = Partial<Record<keyof FormValues, string>>;

type RepositoryMetadata = {
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  defaultBranch: string;
  language: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  visibility: string;
  htmlUrl: string;
};

type RepositoryStructure = {
  totalEntries: number;
  fileCount: number;
  directoryCount: number;
  submoduleCount: number;
  truncated: boolean;
};

type AnalysisFeedback =
  | {
      message: string;
      type: "error";
    }
  | {
      repository: RepositoryMetadata;
      structure: RepositoryStructure;
      type: "success";
    };

type AnalyzeResponse = {
  error?: unknown;
  repository?: unknown;
  structure?: unknown;
};

const initialValues: FormValues = {
  repositoryUrl: "",
  interviewDate: "",
  studyTime: "",
  language: "simple-english",
};

const inputBaseClasses =
  "mt-2 min-h-12 w-full rounded-lg border bg-surface px-4 py-3 text-base text-text-primary outline-none transition placeholder:text-text-muted hover:border-border-strong focus:ring-4";

function getToday() {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60_000;

  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function isGitHubRepositoryUrl(value: string) {
  try {
    const url = new URL(value);
    const pathSegments = url.pathname.split("/").filter(Boolean);

    return (
      ["http:", "https:"].includes(url.protocol) &&
      url.hostname.toLowerCase() === "github.com" &&
      pathSegments.length === 2
    );
  } catch {
    return false;
  }
}

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.repositoryUrl.trim()) {
    errors.repositoryUrl = "Enter a GitHub repository URL.";
  } else if (!isGitHubRepositoryUrl(values.repositoryUrl.trim())) {
    errors.repositoryUrl =
      "Use a URL like https://github.com/owner/repository.";
  }

  if (!values.interviewDate) {
    errors.interviewDate = "Choose your interview date.";
  } else if (values.interviewDate < getToday()) {
    errors.interviewDate = "Choose today or a future date.";
  }

  if (!values.studyTime) {
    errors.studyTime = "Choose your available study time.";
  }

  return errors;
}

function isRepositoryMetadata(value: unknown): value is RepositoryMetadata {
  if (!value || typeof value !== "object") {
    return false;
  }

  const repository = value as Partial<RepositoryMetadata>;

  return (
    typeof repository.owner === "string" &&
    typeof repository.name === "string" &&
    typeof repository.fullName === "string" &&
    (typeof repository.description === "string" ||
      repository.description === null) &&
    typeof repository.defaultBranch === "string" &&
    (typeof repository.language === "string" || repository.language === null) &&
    typeof repository.stars === "number" &&
    typeof repository.forks === "number" &&
    typeof repository.openIssues === "number" &&
    typeof repository.visibility === "string" &&
    typeof repository.htmlUrl === "string"
  );
}

function isRepositoryStructure(value: unknown): value is RepositoryStructure {
  if (!value || typeof value !== "object") {
    return false;
  }

  const structure = value as Partial<RepositoryStructure>;

  return (
    typeof structure.totalEntries === "number" &&
    typeof structure.fileCount === "number" &&
    typeof structure.directoryCount === "number" &&
    typeof structure.submoduleCount === "number" &&
    typeof structure.truncated === "boolean"
  );
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    notation: "compact",
  }).format(value);
}

export function RepositoryAnalysisForm() {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [feedback, setFeedback] = useState<AnalysisFeedback | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<Field extends keyof FormValues>(
    field: Field,
    value: FormValues[Field],
  ) {
    setValues((currentValues) => ({ ...currentValues, [field]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
    setFeedback(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validate(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setFeedback(null);
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/repos/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repoUrl: values.repositoryUrl.trim() }),
      });
      const result = (await response
        .json()
        .catch(() => ({}))) as AnalyzeResponse;

      if (!response.ok) {
        throw new Error(
          typeof result.error === "string"
            ? result.error
            : "The repository URL could not be analyzed.",
        );
      }

      if (
        !isRepositoryMetadata(result.repository) ||
        !isRepositoryStructure(result.structure)
      ) {
        throw new Error("The analysis service returned an unexpected response.");
      }

      setFeedback({
        repository: result.repository,
        structure: result.structure,
        type: "success",
      });
    } catch (error) {
      setFeedback({
        message:
          error instanceof Error
            ? error.message
            : "The analysis service could not be reached. Try again.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function fieldClasses(hasError: boolean) {
    return `${inputBaseClasses} ${
      hasError
        ? "border-danger focus:border-danger focus:ring-danger/15"
        : "border-border focus:border-primary focus:ring-primary/15"
    }`;
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-8">
      <div>
        <p className="text-sm font-medium text-primary">Create your roadmap</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
          Tell us what you need to learn
        </h2>
        <p className="mt-3 text-sm leading-6 text-text-secondary">
          Add your repository and study preferences. No account is required at
          this stage.
        </p>
      </div>

      <form className="mt-8 space-y-6" noValidate onSubmit={handleSubmit}>
        <div>
          <label
            className="text-sm font-medium text-text-primary"
            htmlFor="repository-url"
          >
            GitHub repository URL
          </label>
          <input
            aria-describedby={
              errors.repositoryUrl
                ? "repository-help repository-error"
                : "repository-help"
            }
            aria-invalid={Boolean(errors.repositoryUrl)}
            autoComplete="url"
            className={fieldClasses(Boolean(errors.repositoryUrl))}
            id="repository-url"
            name="repository-url"
            onChange={(event) =>
              updateField("repositoryUrl", event.target.value)
            }
            placeholder="https://github.com/owner/repository"
            type="url"
            value={values.repositoryUrl}
          />
          <p className="mt-2 text-sm text-text-muted" id="repository-help">
            Enter the link to a public GitHub repository.
          </p>
          {errors.repositoryUrl ? (
            <p className="mt-2 text-sm text-danger" id="repository-error">
              {errors.repositoryUrl}
            </p>
          ) : null}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              className="text-sm font-medium text-text-primary"
              htmlFor="interview-date"
            >
              Interview date
            </label>
            <input
              aria-describedby={
                errors.interviewDate ? "interview-date-error" : undefined
              }
              aria-invalid={Boolean(errors.interviewDate)}
              className={fieldClasses(Boolean(errors.interviewDate))}
              id="interview-date"
              min={getToday()}
              name="interview-date"
              onChange={(event) =>
                updateField("interviewDate", event.target.value)
              }
              type="date"
              value={values.interviewDate}
            />
            {errors.interviewDate ? (
              <p className="mt-2 text-sm text-danger" id="interview-date-error">
                {errors.interviewDate}
              </p>
            ) : null}
          </div>

          <div>
            <label
              className="text-sm font-medium text-text-primary"
              htmlFor="study-time"
            >
              Study time per day
            </label>
            <select
              aria-describedby={
                errors.studyTime ? "study-time-error" : undefined
              }
              aria-invalid={Boolean(errors.studyTime)}
              className={fieldClasses(Boolean(errors.studyTime))}
              id="study-time"
              name="study-time"
              onChange={(event) => updateField("studyTime", event.target.value)}
              value={values.studyTime}
            >
              <option value="">Select time</option>
              <option value="30-minutes">30 minutes</option>
              <option value="1-hour">1 hour</option>
              <option value="90-minutes">1.5 hours</option>
              <option value="2-hours">2 hours</option>
              <option value="3-hours">3+ hours</option>
            </select>
            {errors.studyTime ? (
              <p className="mt-2 text-sm text-danger" id="study-time-error">
                {errors.studyTime}
              </p>
            ) : null}
          </div>
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-text-primary">
            Explanation language
          </legend>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {[
              ["simple-english", "Simple English"],
              ["malayalam", "Malayalam"],
            ].map(([value, label]) => {
              const isSelected = values.language === value;

              return (
                <label
                  className={`flex min-h-12 cursor-pointer items-center justify-center rounded-lg border px-3 py-3 text-center text-sm font-medium transition focus-within:ring-4 focus-within:ring-primary/15 ${
                    isSelected
                      ? "border-primary bg-primary-muted text-primary"
                      : "border-border bg-surface text-text-secondary hover:border-border-strong"
                  }`}
                  key={value}
                >
                  <input
                    checked={isSelected}
                    className="sr-only"
                    name="language"
                    onChange={() =>
                      updateField(
                        "language",
                        value as FormValues["language"],
                      )
                    }
                    type="radio"
                    value={value}
                  />
                  {label}
                </label>
              );
            })}
          </div>
        </fieldset>

        <button
          aria-busy={isSubmitting}
          className="min-h-12 w-full rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Analyzing..." : "Analyze Repository"}
        </button>

        {feedback?.type === "success" ? (
          <div
            className="rounded-lg border border-success/20 bg-success-muted px-4 py-4 text-sm text-text-secondary"
            role="status"
          >
            <p className="font-semibold text-success">
              {feedback.repository.fullName}
            </p>
            {feedback.repository.description ? (
              <p className="mt-2 leading-6">
                {feedback.repository.description}
              </p>
            ) : null}
            <dl className="mt-4 grid grid-cols-2 gap-4">
              {feedback.repository.language ? (
                <div>
                  <dt className="text-text-muted">Language</dt>
                  <dd className="mt-1 font-medium text-text-primary">
                    {feedback.repository.language}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="text-text-muted">Default branch</dt>
                <dd className="mt-1 font-medium text-text-primary">
                  {feedback.repository.defaultBranch}
                </dd>
              </div>
              <div>
                <dt className="text-text-muted">Stars</dt>
                <dd className="mt-1 font-medium text-text-primary">
                  {formatCompactNumber(feedback.repository.stars)}
                </dd>
              </div>
            </dl>
            <div className="mt-5 border-t border-success/20 pt-4">
              <p className="font-medium text-text-primary">
                Repository structure
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-text-muted">Files</dt>
                  <dd className="mt-1 font-medium text-text-primary">
                    {feedback.structure.fileCount.toLocaleString("en-US")}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-muted">Directories</dt>
                  <dd className="mt-1 font-medium text-text-primary">
                    {feedback.structure.directoryCount.toLocaleString("en-US")}
                  </dd>
                </div>
              </dl>
              {feedback.structure.truncated ? (
                <p className="mt-3 leading-6 text-text-secondary">
                  GitHub returned a partial repository tree, so these counts may
                  be incomplete.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {feedback?.type === "error" ? (
          <p
            className="rounded-lg border border-danger/20 bg-danger-muted px-4 py-3 text-sm leading-6 text-danger"
            role="alert"
          >
            {feedback.message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
