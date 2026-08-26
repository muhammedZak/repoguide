import { RepositoryAnalysisForm } from "./repository-analysis-form";

const learningSteps = [
  "Share the public repository you need to understand.",
  "Set your interview deadline and daily study time.",
  "Choose explanations in Simple English or Malayalam.",
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-text-primary" id="main">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <a
            className="text-xl font-semibold tracking-tight text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4"
            href="#main"
          >
            Repo<span className="text-primary">Guide</span>
          </a>
          <p className="hidden text-sm text-text-muted sm:block">
            Repository learning, simplified.
          </p>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-12 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-10 lg:py-20">
        <div className="max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            A clearer way into any codebase
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-text-primary sm:text-5xl lg:text-6xl">
            Turn a repository into a focused learning plan.
          </h1>
          <p className="mt-6 text-lg leading-8 text-text-secondary">
            RepoGuide organizes an unfamiliar GitHub project into a practical,
            day-by-day roadmap built around your deadline and available time.
          </p>

          <ol className="mt-8 space-y-4" aria-label="How RepoGuide works">
            {learningSteps.map((step, index) => (
              <li className="flex gap-4" key={step}>
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-muted text-sm font-semibold text-primary">
                  {index + 1}
                </span>
                <p className="pt-1 text-base leading-6 text-text-secondary">
                  {step}
                </p>
              </li>
            ))}
          </ol>
        </div>

        <RepositoryAnalysisForm />
      </section>
    </main>
  );
}

