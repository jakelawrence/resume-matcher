import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { parseJobPosting } from "@/lib/mastra/agents/jobParserAgent";
import { parseResumeToStructured } from "@/lib/mastra/agents/resumeStructurerAgent";
import { scoreResumes } from "@/lib/mastra/agents/resumeScorerAgent";
import { JobPostingSchema } from "@/types/jobPosting";
import { ScorerOutputSchema, ResumeInputSchema } from "@/types/resumeScore";
import { StructuredResumeSchema } from "@/types/structuredResume";

const SCORE_WEIGHTS = {
  skills: 0.4,
  experience: 0.3,
  education: 0.15,
  keywords: 0.15,
} as const;

const WorkflowOperationSchema = z.enum(["parseJob", "parseResumes", "score", "evaluate"]);

function clampScore(value: number) {
  return Math.min(100, Math.max(0, value));
}

function roundTo1(value: number) {
  return Math.round(value * 10) / 10;
}

function recomputeCompositeScore(score: z.infer<typeof ScorerOutputSchema>["scores"][number]) {
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

function normalizeScoringResult(result: z.infer<typeof ScorerOutputSchema>, threshold: number): z.infer<typeof ScorerOutputSchema> {
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

const EvaluateCandidatesWorkflowInputSchema = z.object({
  operation: WorkflowOperationSchema.default("evaluate"),
  jobPostingText: z.string().min(1).optional(),
  jobPosting: JobPostingSchema.optional(),
  resumes: z.array(ResumeInputSchema).default([]),
  threshold: z.number().min(0).max(100).default(70),
});

const ParsedResumesSchema = z.array(
  z.object({
    id: z.string(),
    structuredResume: StructuredResumeSchema,
  }),
);

const StepContextSchema = z.object({
  operation: WorkflowOperationSchema,
  jobPosting: JobPostingSchema.nullable(),
  resumes: z.array(ResumeInputSchema),
  threshold: z.number(),
});

const ScoredContextSchema = z.object({
  operation: WorkflowOperationSchema,
  jobPosting: JobPostingSchema.nullable(),
  structuredResumes: ParsedResumesSchema,
  threshold: z.number(),
  scoringResult: ScorerOutputSchema.nullable(),
});

const EvaluateCandidatesWorkflowOutputSchema = z.object({
  jobPosting: JobPostingSchema.nullable(),
  structuredResumes: ParsedResumesSchema,
  scoringResult: ScorerOutputSchema.nullable(),
});

const parseJobStep = createStep({
  id: "parse-job-step",
  inputSchema: EvaluateCandidatesWorkflowInputSchema,
  outputSchema: StepContextSchema,
  execute: async ({ inputData }) => {
    const operation = inputData.operation;
    const requiresJob = operation === "score" || operation === "evaluate";

    let jobPosting = inputData.jobPosting ?? null;

    if (!jobPosting && inputData.jobPostingText) {
      jobPosting = await parseJobPosting(inputData.jobPostingText);
    }

    if (requiresJob && !jobPosting) {
      throw new Error("A job posting is required for score/evaluate operations.");
    }

    if ((operation === "score" || operation === "evaluate" || operation === "parseResumes") && inputData.resumes.length === 0) {
      throw new Error("At least one resume is required for parseResumes/score/evaluate operations.");
    }

    return {
      operation,
      jobPosting,
      resumes: inputData.resumes,
      threshold: inputData.threshold,
    };
  },
});

const parseResumesStep = createStep({
  id: "parse-resumes-step",
  inputSchema: StepContextSchema,
  outputSchema: z.object({
    operation: WorkflowOperationSchema,
    jobPosting: JobPostingSchema.nullable(),
    resumes: z.array(ResumeInputSchema),
    threshold: z.number(),
    structuredResumes: ParsedResumesSchema,
  }),
  execute: async ({ inputData }) => {
    const shouldParseResumes = inputData.operation === "parseResumes" || inputData.operation === "evaluate";

    const structuredResumes = shouldParseResumes
      ? await Promise.all(
          inputData.resumes.map(async (resume) => ({
            id: resume.id,
            structuredResume: await parseResumeToStructured(resume.text),
          })),
        )
      : [];

    return {
      operation: inputData.operation,
      jobPosting: inputData.jobPosting,
      resumes: inputData.resumes,
      threshold: inputData.threshold,
      structuredResumes,
    };
  },
});

const scoreResumesStep = createStep({
  id: "score-resumes-step",
  inputSchema: z.object({
    operation: WorkflowOperationSchema,
    jobPosting: JobPostingSchema.nullable(),
    resumes: z.array(ResumeInputSchema),
    threshold: z.number(),
    structuredResumes: ParsedResumesSchema,
  }),
  outputSchema: ScoredContextSchema,
  execute: async ({ inputData }) => {
    const shouldScore = inputData.operation === "score" || inputData.operation === "evaluate";

    if (!shouldScore) {
      return {
        operation: inputData.operation,
        jobPosting: inputData.jobPosting,
        structuredResumes: inputData.structuredResumes,
        threshold: inputData.threshold,
        scoringResult: null,
      };
    }

    if (!inputData.jobPosting) {
      throw new Error("A parsed job posting is required before scoring.");
    }

    const scoringResult = await scoreResumes({
      jobPosting: inputData.jobPosting,
      resumes: inputData.resumes,
      threshold: inputData.threshold,
    });

    return {
      operation: inputData.operation,
      jobPosting: inputData.jobPosting,
      structuredResumes: inputData.structuredResumes,
      threshold: inputData.threshold,
      scoringResult,
    };
  },
});

const normalizeScoringStep = createStep({
  id: "deterministic-normalize-step",
  inputSchema: ScoredContextSchema,
  outputSchema: EvaluateCandidatesWorkflowOutputSchema,
  execute: async ({ inputData }) => {
    const scoringResult = inputData.scoringResult ? normalizeScoringResult(inputData.scoringResult, inputData.threshold) : null;

    return {
      jobPosting: inputData.jobPosting,
      structuredResumes: inputData.structuredResumes,
      scoringResult,
    };
  },
});

export const EvaluateCandidatesWorkflow = createWorkflow({
  id: "evaluate-candidates-workflow",
  inputSchema: EvaluateCandidatesWorkflowInputSchema,
  outputSchema: EvaluateCandidatesWorkflowOutputSchema,
})
  .then(parseJobStep)
  .then(parseResumesStep)
  .then(scoreResumesStep)
  .then(normalizeScoringStep)
  .commit();

export type EvaluateCandidatesWorkflowInput = z.input<typeof EvaluateCandidatesWorkflowInputSchema>;
export type EvaluateCandidatesWorkflowOutput = z.infer<typeof EvaluateCandidatesWorkflowOutputSchema>;

export async function evaluateCandidates(input: EvaluateCandidatesWorkflowInput): Promise<EvaluateCandidatesWorkflowOutput> {
  const parsedInput = EvaluateCandidatesWorkflowInputSchema.parse(input);
  const run = await EvaluateCandidatesWorkflow.createRun();
  const result = await run.start({ inputData: parsedInput });

  if (result.status !== "success") {
    throw new Error(`EvaluateCandidatesWorkflow failed with status: ${result.status}`);
  }

  return result.result;
}
