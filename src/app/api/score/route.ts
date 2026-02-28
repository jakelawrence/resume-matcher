import { NextRequest, NextResponse } from "next/server";
import { scoreResumes } from "@/lib/mastra/agents/resumeScorerAgent";
import { ScorerInputSchema, type ResumeScore, type ScorerOutput } from "@/types/resumeScore";
import fs from "fs";
import path from "path";
import { extractPdfText, getParsedResumeById, RESUMES_DIR } from "@/lib/resumes/storage";
import { validateResumeText } from "@/lib/validation/inputGuards";
import { requireAnthropicApiKey } from "@/lib/api/preflight";
import { saveLatestRunState } from "@/lib/runState/storage";

export const runtime = "nodejs";

const SCORE_WEIGHTS = {
  skills: 0.4,
  experience: 0.3,
  education: 0.15,
  keywords: 0.15,
} as const;

function clampScore(value: number) {
  return Math.min(100, Math.max(0, value));
}

function roundTo1(value: number) {
  return Math.round(value * 10) / 10;
}

function recomputeCompositeScore(score: ResumeScore) {
  const skills = clampScore(score.skillsMatchScore);
  const experience = clampScore(score.experienceRelevanceScore);
  const education = clampScore(score.educationMatchScore);
  const keywords = clampScore(score.keywordDensityScore);

  return roundTo1(
    skills * SCORE_WEIGHTS.skills +
      experience * SCORE_WEIGHTS.experience +
      education * SCORE_WEIGHTS.education +
      keywords * SCORE_WEIGHTS.keywords,
  );
}

function normalizeScoringResult(result: ScorerOutput, threshold: number): ScorerOutput {
  const normalizedScores = result.scores
    .map((score) => {
      const compositeScore = recomputeCompositeScore(score);
      return {
        ...score,
        compositeScore,
        meetsThreshold: compositeScore >= threshold,
      };
    })
    .sort((a, b) => {
      const byScore = b.compositeScore - a.compositeScore;
      if (byScore !== 0) return byScore;
      return a.id.localeCompare(b.id);
    });

  if (normalizedScores.length === 0) {
    throw new Error("Scoring agent returned no score items.");
  }

  const bestMatch = normalizedScores[0];

  return {
    ...result,
    scores: normalizedScores,
    bestMatch,
    bestMatchMeetsThreshold: bestMatch.meetsThreshold,
    threshold,
  };
}

/**
 * POST /api/score-resumes
 *
 * Accepts EITHER:
 *   A) resumeIds[] — filenames of PDFs stored in /resumes on disk (used by the UI)
 *   B) resumes[]   — pre-extracted { id, text } objects (used by the test script)
 *
 * Request body (UI flow):
 * {
 *   "jobPosting": { ...JobPosting },
 *   "resumeIds": ["alex-chen.pdf", "sarah-jones.pdf"],
 *   "threshold": 70
 * }
 *
 * Request body (test script / direct API flow):
 * {
 *   "jobPosting": { ...JobPosting },
 *   "resumes": [{ "id": "alex-chen.pdf", "text": "..." }],
 *   "threshold": 70
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const apiKeyError = requireAnthropicApiKey();
    if (apiKeyError) return apiKeyError;

    const body = await req.json();
    const { jobPosting, resumeIds, resumes: rawResumes, threshold = 70 } = body;

    if (!jobPosting) {
      return NextResponse.json({ success: false, error: "jobPosting is required." }, { status: 400 });
    }

    let resumes: { id: string; text: string }[] = [];

    if (resumeIds && Array.isArray(resumeIds)) {
      // ── UI flow: read PDFs from disk and extract text ──────────────────────
      if (resumeIds.length === 0) {
        return NextResponse.json({ success: false, error: "resumeIds must contain at least one entry." }, { status: 400 });
      }

      resumes = await Promise.all(
        resumeIds.map(async (id: string) => {
          const safeName = path.basename(id); // prevent path traversal
          const filePath = path.join(RESUMES_DIR, safeName);
          const parsedResume = getParsedResumeById(safeName);

          if (parsedResume?.text) {
            return { id: safeName, text: parsedResume.text };
          }

          if (!fs.existsSync(filePath)) {
            throw new Error(`Resume not found on server: ${safeName}`);
          }

          const buffer = fs.readFileSync(filePath);
          const text = await extractPdfText(buffer);
          return { id: safeName, text };
        }),
      );
    } else if (rawResumes && Array.isArray(rawResumes)) {
      // ── Test script flow: resumes with pre-extracted text passed directly ──
      resumes = rawResumes;
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Provide either resumeIds[] (filenames) or resumes[] ({ id, text }).",
        },
        { status: 400 },
      );
    }

    for (const resume of resumes) {
      const resumeTextError = validateResumeText(resume.text, `resume "${resume.id}"`);
      if (resumeTextError) {
        return NextResponse.json({ success: false, error: resumeTextError }, { status: 400 });
      }
    }

    // Validate the full input against the scorer schema
    const parsed = ScorerInputSchema.safeParse({ jobPosting, resumes, threshold });

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body.",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const result = await scoreResumes(parsed.data);
    const normalizedResult = normalizeScoringResult(result, parsed.data.threshold);
    saveLatestRunState({
      jobPosting: parsed.data.jobPosting,
      scoringResults: normalizedResult,
    });

    return NextResponse.json({ success: true, data: normalizedResult }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    console.error("[score-resumes] Error:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
