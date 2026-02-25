import { Mastra } from "@mastra/core";
import { jobParserAgent } from "./agents/jobParserAgent";
import { resumeScorerAgent } from "./agents/resumeScorerAgent";

/**
 * Mastra instance
 *
 * This is the single entry point for all Mastra agents and workflows.
 * Import `mastra` wherever you need to call an agent or run a workflow.
 *
 * As new agents (resumeWriter) and workflows are built,
 * register them here.
 */
export const mastra = new Mastra({
  agents: {
    jobParserAgent,
    resumeScorerAgent,
    // resumeWriterAgent,  ← add in Step 3
  },
});
