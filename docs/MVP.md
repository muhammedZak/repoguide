# RepoGuide MVP

## MVP Goal

The MVP proves that RepoGuide can take a public GitHub repository and a learner's deadline, turn the codebase into a structured learning roadmap, and help the learner make measurable progress through explanations and quizzes.

## In the MVP

### Repository input and analysis

- A clean, mobile-friendly home page built with Next.js and Tailwind CSS.
- An input for a public GitHub repository URL and an **Analyze Repo** action.
- Repository structure and key-file ingestion through Octokit.
- Code chunking, embeddings, and Supabase pgvector storage for the RAG flow described in the blueprint.
- Claude-powered repository analysis.

### Personalized learning roadmap

- Interview-date input.
- Daily available study-time input, as required by the blueprint's stated product journey.
- A structured, day-by-day roadmap generated for the repository and deadline.
- A time estimate for each topic.
- Beginner-friendly explanations through simple-English mode.

### Learning and progress

- Supabase authentication and login.
- Saved user repositories and progress.
- A progress tracker that lets users mark topics complete.
- A three-question quiz after each topic.
- The read, quiz, pass, and unlock-next-step flow described in the blueprint.

### MVP release work

- Deployment to Vercel.
- Free access for the first ten users.
- Feedback and testimonials from those users.
- Fixes for the three most common complaints before charging users.

## After the MVP

The following capabilities should wait until the core repository-to-roadmap experience has been validated:

- Malayalam audio teaching through ElevenLabs.
- Voice mock interviews using Whisper for speech-to-text.
- AI-generated interview scores and feedback.
- A dedicated repository-history experience for revisiting past plans. The MVP still saves the repository and progress needed for the active learning experience.
- Team sharing and a team progress dashboard.
- Stripe and Razorpay payment integration.
- Enforcement of the Free, Pro, Premium, and Team plan limits.

## Scope Boundary

The MVP is complete when a user can submit a public repository, receive a deadline-aware roadmap with time estimates and simple-English explanations, work through quizzes, save progress, and return to continue learning. Malayalam audio, voice interviewing, scoring, team features, and monetization are not required to validate that core loop.
