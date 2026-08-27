"use client";

import { useEffect, useState } from "react";

import { RepositoryAnalysisForm } from "./repository-analysis-form";
import { RoadmapResponse } from "./roadmap-response";
import { RoadmapResults } from "./roadmap-results";

const learningSteps = [
  "Share the public repository you need to understand.",
  "Set your interview deadline and daily study time.",
  "Choose explanations in Simple English or Malayalam.",
];

export function RoadmapExperience() {
  const [result, setResult] = useState<RoadmapResponse | null>(null);

  useEffect(() => {
    if (result) {
      document.getElementById("roadmap-title")?.focus();
    }
  }, [result]);

  if (result) {
    return <RoadmapResults onStartOver={() => setResult(null)} result={result} />;
  }

  return (
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

      <RepositoryAnalysisForm onRoadmapGenerated={setResult} />
    </section>
  );
}
