# RepoGuide Engineering Instructions

## Product
RepoGuide helps developers understand GitHub repositories through
personalized learning roadmaps.

Read before making architectural changes:
- docs/PRODUCT.md
- docs/ARCHITECTURE.md
- docs/MVP.md

## Development rules
- Keep implementations simple and readable.
- Do not add libraries unless needed.
- Do not implement features outside the current task.
- Do not refactor unrelated files.
- Follow existing project patterns.
- Prefer small components and straightforward functions.
- Never expose API keys to the frontend.

## Workflow
Before implementation:
1. Inspect relevant files.
2. Explain implementation plan.
3. Identify files that will change.

After implementation:
1. Run lint.
2. Run tests.
3. Run build where appropriate.
4. Report changed files.
5. Report any unresolved issues.

## Git
One feature per commit.
Do not combine unrelated changes.