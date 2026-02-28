import fs from "fs";
import path from "path";
import type { JobPosting } from "@/types/jobPosting";
import type { ScorerOutput } from "@/types/resumeScore";
import { ensureResumesDir, RESUMES_DIR } from "@/lib/resumes/storage";

const RUN_STATE_VERSION = 1;
const LATEST_RUN_STATE_PATH = path.join(RESUMES_DIR, "latest-run-state.json");

export interface LatestRunState {
  version: number;
  updatedAt: string;
  jobPosting: JobPosting;
  scoringResults: ScorerOutput;
}

export function saveLatestRunState(input: { jobPosting: JobPosting; scoringResults: ScorerOutput }) {
  ensureResumesDir();
  const next: LatestRunState = {
    version: RUN_STATE_VERSION,
    updatedAt: new Date().toISOString(),
    jobPosting: input.jobPosting,
    scoringResults: input.scoringResults,
  };

  fs.writeFileSync(LATEST_RUN_STATE_PATH, JSON.stringify(next, null, 2), "utf8");
}

export function getLatestRunState(): LatestRunState | null {
  ensureResumesDir();
  if (!fs.existsSync(LATEST_RUN_STATE_PATH)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(LATEST_RUN_STATE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<LatestRunState>;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.updatedAt !== "string") return null;
    if (!parsed.jobPosting || !parsed.scoringResults) return null;

    return {
      version: RUN_STATE_VERSION,
      updatedAt: parsed.updatedAt,
      jobPosting: parsed.jobPosting as JobPosting,
      scoringResults: parsed.scoringResults as ScorerOutput,
    };
  } catch {
    return null;
  }
}
