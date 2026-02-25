import { z } from "zod";

// ─── Sub-schemas ────────────────────────────────────────────────────────────

export const ExperienceLevelSchema = z.enum([
  "entry", // 0–2 years
  "mid", // 2–5 years
  "senior", // 5–10 years
  "lead", // 8+ years, team leadership
  "executive", // Director / VP / C-suite
  "unspecified",
]);

export const EducationLevelSchema = z.enum(["none_required", "high_school", "associates", "bachelors", "masters", "phd", "unspecified"]);

export const SkillSchema = z.object({
  name: z.string().describe("Canonical skill name, e.g. 'TypeScript', 'React', 'AWS'"),
  category: z.enum(["technical", "soft", "domain", "tool", "language", "certification"]).describe("Broad category this skill belongs to"),
  required: z.boolean().describe("True if explicitly required, false if listed as nice-to-have"),
  yearsRequired: z.number().nullable().describe("Minimum years of experience requested for this skill, null if not stated"),
});

// ─── Root output schema ──────────────────────────────────────────────────────

export const JobPostingSchema = z.object({
  // Metadata
  jobTitle: z.string().describe("Exact job title as stated in the posting"),
  company: z.string().nullable().describe("Company name, null if not found"),
  location: z.string().nullable().describe("Location or 'Remote' / 'Hybrid', null if not stated"),
  employmentType: z.enum(["full_time", "part_time", "contract", "internship", "unspecified"]).describe("Type of employment"),

  // Role summary
  roleSummary: z.string().describe("2–4 sentence neutral summary of what the role does and its purpose within the organisation"),

  // Experience
  experienceLevel: ExperienceLevelSchema.describe("Seniority level inferred from the posting"),
  experienceYearsMin: z.number().nullable().describe("Minimum years of total experience required, null if not stated"),
  experienceYearsMax: z.number().nullable().describe("Maximum years stated (e.g. '3–5 years'), null if not stated"),

  // Education
  educationLevel: EducationLevelSchema.describe("Minimum education level required or preferred"),
  educationFields: z.array(z.string()).describe("Relevant fields of study mentioned, e.g. ['Computer Science', 'Engineering']"),

  // Skills
  skills: z.array(SkillSchema).describe("All skills extracted from the posting"),

  // Derived convenience lists (subsets of skills for quick access)
  requiredSkills: z.array(z.string()).describe("Skill names where required === true"),
  niceToHaveSkills: z.array(z.string()).describe("Skill names where required === false"),

  // Keywords useful for ATS / resume tailoring
  keywords: z
    .array(z.string())
    .describe("Important words and phrases from the posting useful for ATS matching — technologies, methodologies, domain terms"),

  // Responsibilities
  responsibilities: z.array(z.string()).describe("Key responsibilities or duties listed in the posting"),

  // Compensation (optional)
  salaryMin: z.number().nullable().describe("Minimum salary in the posting (annual, local currency), null if not stated"),
  salaryMax: z.number().nullable().describe("Maximum salary, null if not stated"),
  currency: z.string().nullable().describe("ISO 4217 currency code, e.g. 'USD', null if not stated"),
});

// ─── TypeScript types ────────────────────────────────────────────────────────

export type JobPosting = z.infer<typeof JobPostingSchema>;
export type Skill = z.infer<typeof SkillSchema>;
export type ExperienceLevel = z.infer<typeof ExperienceLevelSchema>;
export type EducationLevel = z.infer<typeof EducationLevelSchema>;
