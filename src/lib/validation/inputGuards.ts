const CHARS_PER_TOKEN_ESTIMATE = 4;

export const INPUT_LIMITS = {
  jobText: {
    minChars: 50,
    maxChars: 30_000,
    maxEstimatedTokens: 7_500,
  },
  resumeText: {
    minChars: 100,
    maxChars: 40_000,
    maxEstimatedTokens: 10_000,
  },
} as const;

export function estimateTokens(text: string) {
  return Math.ceil(text.length / CHARS_PER_TOKEN_ESTIMATE);
}

function validateTextLengthAndTokens(text: string, opts: { minChars: number; maxChars: number; maxEstimatedTokens: number; label: string }) {
  const trimmed = text.trim();
  const charCount = trimmed.length;

  if (charCount < opts.minChars) {
    return `${opts.label} is too short (${charCount} chars). Minimum is ${opts.minChars} characters.`;
  }

  if (charCount > opts.maxChars) {
    return `${opts.label} is too long (${charCount} chars). Maximum is ${opts.maxChars} characters.`;
  }

  const estimatedTokens = estimateTokens(trimmed);
  if (estimatedTokens > opts.maxEstimatedTokens) {
    return `${opts.label} is too long (~${estimatedTokens} estimated tokens). Maximum is ${opts.maxEstimatedTokens} estimated tokens.`;
  }

  return null;
}

export function validateJobPostingText(jobPostingText: string) {
  return validateTextLengthAndTokens(jobPostingText, {
    label: "jobPostingText",
    ...INPUT_LIMITS.jobText,
  });
}

export function validateResumeText(resumeText: string, label = "resume text") {
  return validateTextLengthAndTokens(resumeText, {
    label,
    ...INPUT_LIMITS.resumeText,
  });
}
