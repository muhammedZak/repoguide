import { RoadmapExperience } from "./roadmap-experience";

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

      <RoadmapExperience />
    </main>
  );
}
