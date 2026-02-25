import { NextRequest, NextResponse } from "next/server";
import { scoreResumes } from "@/lib/mastra/agents/resumeScorerAgent";
import { ScorerInputSchema } from "@/types/resumeScore";

/**
 * POST /api/score
 *
 * Scores one or more resumes against a structured job posting.
 *
 * Request body:
 * {
 *   "jobPosting": { ...JobPosting },   ← output from /api/parse-job
 *   "resumes": [
 *     { "id": "resume-1.pdf", "text": "John Smith\nSoftware Engineer..." },
 *     { "id": "resume-2.pdf", "text": "Jane Doe\nFull Stack Developer..." }
 *   ],
 *   "threshold": 70   ← optional, defaults to 70
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "scores": [ ...ResumeScore[] sorted by compositeScore desc ],
 *     "bestMatch": { ...ResumeScore },
 *     "bestMatchMeetsThreshold": true,
 *     "threshold": 70
 *   }
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[score] Received request with body:", JSON.stringify(body, null, 2));

    // Validate the request body against the input schema
    const parsed = ScorerInputSchema.safeParse(body);

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

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    console.error("[score-resumes] Error:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
