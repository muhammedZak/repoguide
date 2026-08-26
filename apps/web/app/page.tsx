export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8 sm:px-10 lg:px-12">
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <a className="text-xl font-semibold tracking-tight" href="#top">
            Repo<span className="text-cyan-400">Guide</span>
          </a>
          <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
            Built for focused learning
          </span>
        </header>

        <section
          className="grid flex-1 items-center gap-14 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:py-24"
          id="top"
        >
          <div>
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.22em] text-cyan-400">
              Learn the codebase, not just the syntax
            </p>
            <h1 className="max-w-3xl text-5xl font-semibold tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">
              Turn any repository into a clear learning roadmap.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
              RepoGuide helps developers understand unfamiliar GitHub projects
              with a focused, day-by-day plan built around their deadline.
            </p>

            <div className="mt-10 max-w-2xl rounded-2xl border border-white/10 bg-white/[0.06] p-3 shadow-2xl shadow-cyan-950/30 backdrop-blur">
              <label className="sr-only" htmlFor="repository-url">
                Public GitHub repository URL
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-900 px-4 py-3.5 text-base text-white outline-none placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                  id="repository-url"
                  name="repository-url"
                  placeholder="https://github.com/owner/repository"
                  type="url"
                />
                <button
                  className="rounded-xl bg-cyan-400 px-6 py-3.5 font-semibold text-slate-950 transition hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-950"
                  type="button"
                >
                  Analyze Repo
                </button>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-500">
              Public repositories only. Analysis will be added in a later step.
            </p>
          </div>

          <aside className="relative">
            <div className="absolute -inset-10 -z-0 rounded-full bg-cyan-500/10 blur-3xl" />
            <div className="relative rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-black/30 sm:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Your learning plan</p>
                  <h2 className="mt-1 text-xl font-semibold text-white">
                    Repository roadmap
                  </h2>
                </div>
                <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                  Personalized
                </span>
              </div>

              <ol className="mt-8 space-y-4">
                {[
                  ["01", "Understand the project structure", "45 min"],
                  ["02", "Trace the main application flow", "1 hr"],
                  ["03", "Study the core modules", "2 hr"],
                ].map(([number, title, duration]) => (
                  <li
                    className="flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.04] p-4"
                    key={number}
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-cyan-400/10 text-sm font-semibold text-cyan-300">
                      {number}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-100">{title}</p>
                      <p className="mt-1 text-sm text-slate-500">{duration}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

