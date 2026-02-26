# Refit Resume Matcher

AI-powered resume matching app built with Next.js + Mastra.

It:

- Parses a raw job posting into structured JSON.
- Uploads and parses PDF resumes.
- Structures resume text with a Mastra agent.
- Scores resumes against the job posting.

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Mastra (`@mastra/core`)
- Anthropic via AI SDK (`@ai-sdk/anthropic`)
- `unpdf` for PDF text extraction

## Screenshots

### Home (Job Posting Input)

![Home page](docs/screenshots/01-home.png)

### Upload (Resume Upload + Selection)

![Upload page](docs/screenshots/02-upload.png)

### Results (Scoring Output UI)

![Results page](docs/screenshots/03-results.png)

### JSON Output (API Response)

![JSON output](docs/screenshots/04-json-output.png)

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local`:

```bash
ANTHROPIC_API_KEY=your_key_here
```

3. Run the app:

```bash
npm run dev
```

4. Open:

`http://localhost:3000`

## App Flow

1. Paste job posting on `/`:
   - Calls `POST /api/parse`
   - Uses `jobParserAgent`
2. Upload resumes on `/upload`:
   - Calls `POST /api/resumes/upload`
   - Extracts text from PDF (`unpdf`)
   - Structures resume text via `resumeStructurerAgent`
   - Persists parsed data to `resumes/parsed-resumes.json`
3. Score resumes:
   - Calls `POST /api/score`
   - Uses `resumeScorerAgent`
   - Returns sorted match scores and best match

## API Endpoints

- `POST /api/parse`  
  Input: `{ jobPostingText: string }`  
  Output: structured job posting JSON.

- `GET /api/resumes`  
  Lists uploaded PDF files in `resumes/`.

- `POST /api/resumes/upload`  
  Multipart upload with field `resume` (PDF).  
  Returns uploaded file metadata + structured resume output.

- `POST /api/score`  
  Accepts either:
  - `{ jobPosting, resumeIds[], threshold? }`
  - `{ jobPosting, resumes: [{ id, text }], threshold? }`

## Scripts

- Start dev server:

```bash
npm run dev
```

- Build:

```bash
npm run build
```

- Lint:

```bash
npm run lint
```

- Manual scoring test (dev server must be running):

```bash
npx tsx scripts/test-score-resumes.ts
```

## Project Structure

```text
src/
  app/
    api/
      parse/route.ts
      resumes/route.ts
      resumes/upload/route.ts
      score/route.ts
  lib/
    mastra/
      agents/
        jobParserAgent.ts
        resumeStructurerAgent.ts
        resumeScorerAgent.ts
    resumes/storage.ts
  types/
    jobPosting.ts
    structuredResume.ts
    resumeScore.ts
```

## Notes

- Uploaded PDFs and parsed outputs are stored locally in `resumes/`.
- Do not commit sensitive resume data in public repos.
