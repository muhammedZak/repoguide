# RepoGuide Architecture

## Proposed Technologies

| Layer | Technology | Purpose |
| --- | --- | --- |
| Frontend | Next.js and Tailwind CSS | User interface and pages |
| Backend | Node.js and Express | API routes and application logic |
| AI engine | Anthropic Claude API | Roadmaps, explanations, and multilingual translation |
| GitHub integration | Octokit SDK | Read repository structure and files |
| Vector database | Supabase pgvector | Store and retrieve code embeddings for RAG |
| Authentication | Supabase Auth | User login and accounts |
| Application database | Supabase PostgreSQL | User data and progress |
| Speech to text | OpenAI Whisper API | Transcribe user answers during mock interviews |
| Text to speech | ElevenLabs API | Produce Malayalam audio teaching |
| Payments | Stripe and Razorpay | International and Indian payments |
| Deployment | Vercel | Deploy the product |

## Frontend Responsibilities

- Provide the GitHub repository URL, interview date, and daily study-time inputs.
- Present the generated day-by-day roadmap and per-topic time estimates.
- Display beginner-friendly module explanations.
- Support the simple-English mode.
- Show module quizzes, completion state, and roadmap progress.
- Handle sign-in and account-facing interactions through Supabase Auth.
- For later product phases, provide Malayalam audio playback, the voice mock interview experience, interview results, saved-plan history, team sharing, and paid-plan interfaces.

## Backend Responsibilities

- Expose API routes and implement the product's application logic.
- Coordinate repository ingestion through Octokit.
- Split fetched code into chunks and coordinate embedding storage in Supabase pgvector.
- Retrieve relevant code context and send it to the Claude API for roadmap and explanation generation.
- Apply the user's deadline and available study time when generating the learning plan.
- Save user repositories, generated plans, quiz state, and progress in Supabase PostgreSQL.
- Enforce the read, quiz, pass, and unlock progression described in the system flow.
- In later phases, coordinate translation, speech, interview evaluation, and payment-provider calls.

## AI Responsibilities

- **Claude API:** Generate repo-specific day-by-day roadmaps and beginner-friendly explanations, and translate English content into Malayalam.
- **Embedding generation:** Convert code chunks into vectors for RAG. The blueprint does not specify the embedding model or provider.
- **RAG:** Ground generated roadmaps and explanations in relevant repository content rather than relying only on general model knowledge.
- **Whisper API, after MVP:** Convert spoken mock-interview answers to text.
- **ElevenLabs API, after MVP:** Generate Malayalam audio for teaching modules.
- **Interview evaluation, after MVP:** Generate the interview score and feedback. The blueprint does not name the model responsible for this evaluation.

## GitHub Ingestion Flow

```text
Public GitHub repository URL
        |
        v
Octokit reads the folder structure and key files
        |
        v
Repository content is split into chunks
        |
        v
Chunks are converted into embeddings
        |
        v
Chunks and embeddings are stored in Supabase pgvector
```

The blueprint does not define private-repository access, key-file selection rules, chunk sizes, supported languages, repository-size limits, or refresh behavior. Those choices remain implementation decisions rather than product requirements.

## RAG Flow

1. The backend receives the repository context and the user's learning constraints.
2. It retrieves code chunks relevant to the roadmap or module being generated from Supabase pgvector.
3. It sends the retrieved repository context to Claude with the generation request.
4. Claude produces the day-by-day roadmap or module explanation grounded in that context.
5. The backend returns the result to the frontend and stores the user-facing plan as needed for progress tracking.

The blueprint specifies the RAG pattern but does not specify the embedding model, retrieval query design, ranking method, number of retrieved chunks, or prompt format.

## Database Responsibilities

Supabase has three responsibilities in the proposed system:

- **Authentication:** Supabase Auth manages user login and accounts.
- **Application data:** Supabase PostgreSQL stores user data, repository plans, and learning progress, including the state required to save repositories and resume work.
- **Vector retrieval:** Supabase pgvector stores repository code chunks and their embeddings so relevant code can be retrieved during roadmap and explanation generation.

The blueprint does not define a concrete database schema, retention policy, or data-isolation model.

