import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { ensureResumesDir, extractPdfText, RESUMES_DIR, upsertParsedResume } from "@/lib/resumes/storage";
import { evaluateCandidates } from "@/lib/mastra/workflows/evaluateCandidatesWorkflow";
import { validateResumeText } from "@/lib/validation/inputGuards";
import { requireAnthropicApiKey } from "@/lib/api/preflight";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const apiKeyError = requireAnthropicApiKey();
    if (apiKeyError) return apiKeyError;

    console.log("[upload] Received upload request");
    ensureResumesDir();

    const formData = await req.formData();
    const file = formData.get("resume") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided. Send a PDF as 'resume'." }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ success: false, error: "Only PDF files are accepted." }, { status: 400 });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ success: false, error: "File exceeds the 5 MB size limit." }, { status: 400 });
    }

    // Sanitise the filename — strip any path components and non-safe chars
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^\.+/, "");

    // If a file with the same name already exists, prefix with a timestamp
    const filename = fs.existsSync(path.join(RESUMES_DIR, safeName)) ? `${Date.now()}_${safeName}` : safeName;
    console.log(`[upload] Processing file: ${filename} (${file.size} bytes)`);
    const dest = path.join(RESUMES_DIR, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(dest, buffer);
    const text = await extractPdfText(buffer);
    console.log(`[upload] Extracted text length: ${text.length} characters from ${filename}`);
    if (!text) {
      fs.unlinkSync(dest);
      return NextResponse.json({ success: false, error: "Could not extract text from this PDF. Please upload a text-based PDF." }, { status: 400 });
    }
    const resumeTextError = validateResumeText(text, "resume text from uploaded PDF");
    if (resumeTextError) {
      fs.unlinkSync(dest);
      return NextResponse.json({ success: false, error: resumeTextError }, { status: 400 });
    }

    const workflowResult = await evaluateCandidates({
      operation: "parseResumes",
      resumes: [{ id: filename, text }],
    });

    const structured = workflowResult.structuredResumes[0]?.structuredResume;
    if (!structured) {
      fs.unlinkSync(dest);
      throw new Error("Workflow did not return a structured resume.");
    }

    const stats = fs.statSync(dest);
    const storedResume = {
      id: filename,
      filename,
      sizeBytes: stats.size,
      uploadedAt: stats.mtime.toISOString(),
    };

    upsertParsedResume({
      ...storedResume,
      text,
      structured,
      parsedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      resume: storedResume,
      structuredResume: structured,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed.";
    console.error("[upload]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
