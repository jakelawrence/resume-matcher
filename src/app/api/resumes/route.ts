import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getParsedResumes } from "@/lib/resumes/storage";

const RESUMES_DIR = path.join(process.cwd(), "resumes");

export async function GET() {
  try {
    // Create the directory if it doesn't exist yet
    if (!fs.existsSync(RESUMES_DIR)) {
      fs.mkdirSync(RESUMES_DIR, { recursive: true });
    }

    const files = fs.readdirSync(RESUMES_DIR).filter((f) => f.endsWith(".pdf"));
    const parsedResumes = getParsedResumes();
    const parsedById = new Map(parsedResumes.map((resume) => [resume.id, resume]));

    const resumes = files.map((filename) => {
      const filePath = path.join(RESUMES_DIR, filename);
      const stats = fs.statSync(filePath);
      const parsed = parsedById.get(filename);
      return {
        id: filename,
        filename,
        sizeBytes: stats.size,
        uploadedAt: stats.mtime.toISOString(),
        isEditable: parsed?.isEditable ?? false,
        hasLatex: Boolean(parsed?.latexPath),
      };
    });

    // Sort newest first
    resumes.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    return NextResponse.json({ success: true, resumes });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list resumes.";
    console.error("[list-resumes]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
