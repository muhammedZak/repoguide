import {
  formatInterviewDate,
  formatMinutes,
  RoadmapResponse,
} from "./roadmap-response";

type RoadmapResultsProps = {
  result: RoadmapResponse;
  onStartOver: () => void;
};

function formatDifficulty(difficulty: string) {
  return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
}

export function RoadmapResults({ result, onStartOver }: RoadmapResultsProps) {
  const { repository, planning, roadmap } = result;
  const topicTitles = new Map(
    roadmap.days.flatMap((day) =>
      day.modules.map((module) => [module.learningTopicId, module.title]),
    ),
  );

  return (
    <section
      aria-labelledby="roadmap-title"
      className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14 lg:px-10 lg:py-16"
    >
      <div className="flex flex-col gap-5 border-b border-border pb-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-primary">
            {repository.fullName}
          </p>
          <h1
            className="mt-3 text-3xl font-semibold tracking-tight text-text-primary outline-none sm:text-4xl"
            id="roadmap-title"
            tabIndex={-1}
          >
            {roadmap.title}
          </h1>
          <p className="mt-4 text-base leading-7 text-text-secondary sm:text-lg">
            {roadmap.repositorySummary}
          </p>
        </div>
        <button
          className="min-h-12 shrink-0 rounded-lg border border-border-strong bg-surface px-5 py-3 text-sm font-semibold text-text-primary transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
          onClick={onStartOver}
          type="button"
        >
          Analyze another repository
        </button>
      </div>

      <div className="grid gap-8 py-8 lg:grid-cols-[1.25fr_1fr] lg:gap-12">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">
            Repository and schedule
          </h2>
          {repository.description ? (
            <p className="mt-3 leading-7 text-text-secondary">
              {repository.description}
            </p>
          ) : null}
          <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {repository.primaryLanguage ? (
              <div>
                <dt className="text-sm text-text-muted">Primary language</dt>
                <dd className="mt-1 font-medium text-text-primary">
                  {repository.primaryLanguage}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-sm text-text-muted">Interview date</dt>
              <dd className="mt-1 font-medium text-text-primary">
                {formatInterviewDate(planning.interviewDate)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-text-muted">Available days</dt>
              <dd className="mt-1 font-medium text-text-primary">
                {planning.availableDays}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-text-muted">Planned days</dt>
              <dd className="mt-1 font-medium text-text-primary">
                {planning.plannedDays}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl bg-surface-muted p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-text-primary">
            Plan at a glance
          </h2>
          <dl className="mt-5 space-y-4">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-sm text-text-secondary">Learning plan</dt>
              <dd className="text-right font-semibold text-text-primary">
                {roadmap.days.length} {roadmap.days.length === 1 ? "day" : "days"}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-sm text-text-secondary">Total study time</dt>
              <dd className="text-right font-semibold text-text-primary">
                {formatMinutes(roadmap.totalEstimatedMinutes)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-sm text-text-secondary">Daily availability</dt>
              <dd className="text-right font-semibold text-text-primary">
                {formatMinutes(planning.dailyStudyMinutes)}/day
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {planning.planningWindowTruncated ? (
        <p
          className="mb-8 rounded-lg border border-primary/20 bg-primary-muted px-4 py-3 text-sm leading-6 text-text-secondary"
          role="status"
        >
          Your interview is farther away, so this roadmap focuses on the first {" "}
          {planning.plannedDays} study days.
        </p>
      ) : null}

      <div className="border-t border-border pt-9">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-primary">Your study plan</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
            Day-by-day roadmap
          </h2>
          <p className="mt-3 leading-7 text-text-secondary">
            Work through each day in order and use the final review to revisit
            the main ideas.
          </p>
        </div>

        <ol className="mt-8 space-y-6">
          {roadmap.days.map((day) => (
            <li key={day.day}>
              <article className="overflow-hidden rounded-xl border border-border bg-surface">
                <header className="flex flex-col gap-2 border-b border-border bg-surface-muted px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
                  <div>
                    <p className="text-sm font-semibold text-primary">
                      Day {day.day}
                    </p>
                    <h3 className="mt-1 text-xl font-semibold text-text-primary">
                      {day.title}
                    </h3>
                  </div>
                  <p className="shrink-0 text-sm font-medium text-text-secondary">
                    {formatMinutes(day.estimatedMinutes)}
                  </p>
                </header>

                <ul className="divide-y divide-border px-5 sm:px-6">
                  {day.modules.map((module) => (
                    <li className="py-5" key={module.id}>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <h4 className="font-semibold text-text-primary">
                          {module.title}
                        </h4>
                        <span className="rounded-full bg-primary-muted px-2.5 py-1 text-xs font-semibold text-primary">
                          {formatDifficulty(module.difficulty)}
                        </span>
                        <span className="text-sm text-text-muted">
                          {formatMinutes(module.estimatedMinutes)}
                        </span>
                      </div>
                      <p className="mt-3 max-w-3xl leading-7 text-text-secondary">
                        {module.description}
                      </p>
                    </li>
                  ))}
                </ul>
              </article>
            </li>
          ))}
        </ol>
      </div>

      <section
        aria-labelledby="final-review-title"
        className="mt-8 rounded-xl border border-border bg-surface p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2
            className="text-xl font-semibold text-text-primary"
            id="final-review-title"
          >
            Final review
          </h2>
          <p className="text-sm font-medium text-text-secondary">
            {formatMinutes(roadmap.finalReview.estimatedMinutes)}
          </p>
        </div>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-text-secondary">
          {roadmap.finalReview.topics.map((topicId) => (
            <li key={topicId}>{topicTitles.get(topicId)}</li>
          ))}
        </ul>
      </section>
    </section>
  );
}
