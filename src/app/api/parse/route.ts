import { NextRequest, NextResponse } from "next/server";
import { parseJobPosting } from "@/lib/mastra/agents/jobParserAgent";
import { validateJobPostingText } from "@/lib/validation/inputGuards";

/**
 * POST /api/parse
 *
 * Accepts raw job posting text and returns a structured JobPosting object.
 *
 * Request body:
 *   { "jobPostingText": "Senior Software Engineer at Acme Corp..." }
 *
 * Response:
 *   { "success": true, "data": { ...JobPosting } }
 *   { "success": false, "error": "..." }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobPostingText } = body;

    if (!jobPostingText || typeof jobPostingText !== "string") {
      return NextResponse.json({ success: false, error: "jobPostingText is required and must be a string." }, { status: 400 });
    }

    const jobTextError = validateJobPostingText(jobPostingText);
    if (jobTextError) {
      return NextResponse.json({ success: false, error: jobTextError }, { status: 400 });
    }

    const jobPosting = await parseJobPosting(jobPostingText);

    return NextResponse.json({ success: true, data: jobPosting }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    console.error("[parse] Error:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
