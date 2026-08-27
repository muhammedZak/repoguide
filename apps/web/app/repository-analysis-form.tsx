"use client";

import { FormEvent, useRef, useState } from "react";

import {
  isRoadmapResponse,
  RoadmapLanguage,
  RoadmapResponse,
} from "./roadmap-response";

type FormValues = {
  repositoryUrl: string;
  interviewDate: string;
  studyTime: string;
  language: RoadmapLanguage;
};

type FormErrors = Partial<Record<keyof FormValues, string>>;

type RepositoryAnalysisFormProps = {
  onRoadmapGenerated: (result: RoadmapResponse) => void;
};

const initialValues: FormValues = {
  repositoryUrl: "",
  interviewDate: "",
  studyTime: "",
  language: "english",
};

const loadingSteps = [
  "Reading repository structure",
  "Identifying important learning areas",
  "Building your study plan",
];

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
  const dailyStudyMinutes = Number(values.studyTime);

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
  } else if (
    !Number.isInteger(dailyStudyMinutes) ||
    dailyStudyMinutes < 30 ||
    dailyStudyMinutes > 480
  ) {
    errors.studyTime = "Choose between 30 minutes and 8 hours per day.";
  }

  return errors;
}

function getResponseError(status: number) {
  if (status === 400) {
    return "Check your repository URL and study preferences, then try again.";
  }

  if (status === 404) {
    return "We couldn't access that repository. Make sure it is public and the URL is correct.";
  }

  if (status === 503) {
    return "Repository analysis is temporarily busy. Wait a moment and try again.";
  }

  if (status >= 500) {
    return "We couldn't create your roadmap right now. Please try again.";
  }

  return "We couldn't process that request. Check your details and try again.";
}

export function RepositoryAnalysisForm({
  onRoadmapGenerated,
}: RepositoryAnalysisFormProps) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionInProgress = useRef(false);

  function updateField<Field extends keyof FormValues>(
    field: Field,
    value: FormValues[Field],
  ) {
    setValues((currentValues) => ({ ...currentValues, [field]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
    setRequestError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submissionInProgress.current) {
      return;
    }

    const nextErrors = validate(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setRequestError(null);
      return;
    }

    submissionInProgress.current = true;
    setIsSubmitting(true);
    setRequestError(null);

    try {
      const response = await fetch("/api/roadmaps/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          repoUrl: values.repositoryUrl.trim(),
          interviewDate: values.interviewDate,
          dailyStudyMinutes: Number(values.studyTime),
          language: values.language,
        }),
      });
      const result: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        setRequestError(getResponseError(response.status));
        return;
      }

      if (!isRoadmapResponse(result)) {
        setRequestError(
          "The roadmap service returned an unexpected response. Please try again.",
        );
        return;
      }

      onRoadmapGenerated(result);
    } catch {
      setRequestError(
        "We couldn't reach the roadmap service. Check your connection and try again.",
      );
    } finally {
      submissionInProgress.current = false;
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
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="90">1.5 hours</option>
              <option value="120">2 hours</option>
              <option value="180">3 hours</option>
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
              ["english", "Simple English"],
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
                      updateField("language", value as RoadmapLanguage)
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
          {isSubmitting ? "Creating roadmap..." : "Analyze Repository"}
        </button>

        {isSubmitting ? (
          <div
            aria-live="polite"
            className="rounded-lg bg-surface-muted px-4 py-4"
            role="status"
          >
            <p className="font-medium text-text-primary">
              Analyzing your repository and creating your learning roadmap...
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-text-secondary">
              {loadingSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {requestError ? (
          <p
            aria-live="assertive"
            className="rounded-lg border border-danger/20 bg-danger-muted px-4 py-3 text-sm leading-6 text-danger"
            role="alert"
          >
            {requestError}
          </p>
        ) : null}
      </form>
    </div>
  );
}
