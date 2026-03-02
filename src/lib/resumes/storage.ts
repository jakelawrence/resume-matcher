import fs from "fs";
import path from "path";
import { extractText } from "unpdf";
import type { StructuredResume } from "@/types/structuredResume";

export interface StoredResume {
  id: string;
  filename: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface ParsedResume extends StoredResume {
  text: string;
  parsedAt: string;
  structured: StructuredResume | null;
  isEditable: boolean;
  latexPath: string | null;
  latexUpdatedAt: string | null;
}

interface ParsedResumeStore {
  version: number;
  updatedAt: string;
  resumes: ParsedResume[];
}

const STORE_VERSION = 2;

export const RESUMES_DIR = path.join(process.cwd(), "resumes");
export const PARSED_RESUMES_PATH = path.join(RESUMES_DIR, "parsed-resumes.json");
export const LATEX_DIR = path.join(RESUMES_DIR, "latex");

export function ensureResumesDir() {
  if (!fs.existsSync(RESUMES_DIR)) {
    fs.mkdirSync(RESUMES_DIR, { recursive: true });
  }
}

export function ensureLatexDir() {
  ensureResumesDir();
  if (!fs.existsSync(LATEX_DIR)) {
    fs.mkdirSync(LATEX_DIR, { recursive: true });
  }
}

export async function extractPdfText(buffer: Buffer) {
  console.log(`[extractPdfText] Starting text extraction from PDF buffer of size ${buffer.length} bytes`);
  const parsed = await extractText(new Uint8Array(buffer), { mergePages: true });
  console.log("[extractPdfText] Text extraction completed.");
  return parsed.text.replace(/\r/g, "").trim();
}

function getEmptyStore(): ParsedResumeStore {
  return {
    version: STORE_VERSION,
    updatedAt: new Date().toISOString(),
    resumes: [],
  };
}

function readParsedResumeStore(): ParsedResumeStore {
  ensureResumesDir();
  if (!fs.existsSync(PARSED_RESUMES_PATH)) {
    return getEmptyStore();
  }

  try {
    const raw = fs.readFileSync(PARSED_RESUMES_PATH, "utf8");
    const parsed = JSON.parse(raw) as ParsedResumeStore;
    if (!Array.isArray(parsed.resumes)) {
      return getEmptyStore();
    }

    const resumes: ParsedResume[] = parsed.resumes
      .filter((item): item is ParsedResume => typeof item?.id === "string" && typeof item?.filename === "string" && typeof item?.text === "string")
      .map((item) => ({
        ...item,
        parsedAt: typeof item.parsedAt === "string" ? item.parsedAt : new Date().toISOString(),
        structured: item.structured ?? null,
        isEditable: typeof item.isEditable === "boolean" ? item.isEditable : false,
        latexPath: typeof item.latexPath === "string" ? item.latexPath : null,
        latexUpdatedAt: typeof item.latexUpdatedAt === "string" ? item.latexUpdatedAt : null,
      }));

    return {
      version: STORE_VERSION,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
      resumes,
    };
  } catch {
    return getEmptyStore();
  }
}

function writeParsedResumeStore(store: ParsedResumeStore) {
  ensureResumesDir();
  fs.writeFileSync(PARSED_RESUMES_PATH, JSON.stringify(store, null, 2), "utf8");
}

export function upsertParsedResume(resume: ParsedResume) {
  const store = readParsedResumeStore();
  const next = store.resumes.filter((item) => item.id !== resume.id);
  next.unshift(resume);

  writeParsedResumeStore({
    version: STORE_VERSION,
    updatedAt: new Date().toISOString(),
    resumes: next,
  });
}

export function getParsedResumeById(id: string) {
  const store = readParsedResumeStore();
  return store.resumes.find((item) => item.id === id) ?? null;
}

export function getParsedResumes() {
  const store = readParsedResumeStore();
  return store.resumes;
}

export function getLatexPathForResumeId(resumeId: string) {
  const baseName = path.basename(resumeId, path.extname(resumeId));
  const safeBaseName = baseName.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^\.+/, "");
  return path.join(LATEX_DIR, `${safeBaseName}.tex`);
}

export function writeResumeLatex(resumeId: string, latex: string) {
  ensureLatexDir();
  const latexPath = getLatexPathForResumeId(resumeId);
  fs.writeFileSync(latexPath, latex, "utf8");
  return latexPath;
}
