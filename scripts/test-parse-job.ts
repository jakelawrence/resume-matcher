/**
 * test-parse-job.ts
 *
 * Run this script to test the /api/parse-job endpoint against a real job listing.
 *
 * Usage (with your dev server running on port 3000):
 *   npx tsx scripts/test-parse-job.ts
 *
 * To test a different listing, replace the JOB_POSTING string below.
 */

const PARSE_API_URL = "http://localhost:3000/api/analyze";

// ─── Paste any real job listing here ─────────────────────────────────────────

const JOB_POSTING = `
Senior Full Stack Engineer — Stripe (Remote, USA)

About the Role
Stripe is looking for a Senior Full Stack Engineer to join our Payments Infrastructure
team. You will design and build the systems that power payments for millions of
businesses worldwide. You will work closely with product managers, designers, and
other engineers to ship high-quality features at scale.

Responsibilities
- Design, build, and maintain scalable backend services in Ruby and Go
- Build responsive, accessible front-end experiences in React and TypeScript
- Collaborate with cross-functional teams to define technical requirements
- Own features end-to-end from architecture through to production deployment
- Mentor junior engineers and contribute to engineering best practices
- Participate in on-call rotations to ensure system reliability

Requirements
- 5+ years of professional software engineering experience
- Strong proficiency in TypeScript and React
- Experience with backend development in Ruby, Go, Java, or similar
- Solid understanding of distributed systems and API design (REST, GraphQL)
- Experience with relational databases (PostgreSQL preferred)
- Familiarity with cloud infrastructure (AWS or GCP)
- Strong communication skills and ability to work across teams
- Bachelor's degree in Computer Science or equivalent practical experience

Nice to Have
- Experience with payments systems or financial infrastructure
- Knowledge of PCI-DSS compliance requirements
- Contributions to open-source projects
- Experience with Kafka or other event streaming platforms
- Familiarity with Kubernetes and containerised deployments

Compensation
- Base salary: $180,000 – $240,000 USD
- Equity and comprehensive benefits included
`.trim();

// ─── Run the test ─────────────────────────────────────────────────────────────

async function parse_main() {
  console.log("🚀 Sending job posting to", PARSE_API_URL);
  console.log("─".repeat(60));

  const res = await fetch(PARSE_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobPostingText: JOB_POSTING }),
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    console.error("❌ Request failed:", json.error ?? res.statusText);
    process.exit(1);
  }

  const data = json.data;

  // ── Pretty-print a summary ─────────────────────────────────────────────────
  console.log(`✅ Parsed successfully\n`);
  console.log(`📋 Title:       ${data.jobTitle}`);
  console.log(`🏢 Company:     ${data.company ?? "n/a"}`);
  console.log(`📍 Location:    ${data.location ?? "n/a"}`);
  console.log(`💼 Type:        ${data.employmentType}`);
  console.log(`🎯 Level:       ${data.experienceLevel}`);
  console.log(`📅 Experience:  ${data.experienceYearsMin ?? "?"}–${data.experienceYearsMax ?? "?"} years`);
  console.log(`🎓 Education:   ${data.educationLevel}`);
  console.log(`💰 Salary:      ${data.currency ?? ""} ${data.salaryMin ?? "?"} – ${data.salaryMax ?? "?"}`);
  console.log();
  console.log(`📝 Summary:\n   ${data.roleSummary}`);
  console.log();
  console.log(`✅ Required Skills (${data.requiredSkills.length}):\n   ${data.requiredSkills.join(", ")}`);
  console.log();
  console.log(`⭐ Nice-to-Have (${data.niceToHaveSkills.length}):\n   ${data.niceToHaveSkills.join(", ")}`);
  console.log();
  console.log(`🔑 Keywords (${data.keywords.length}):\n   ${data.keywords.join(", ")}`);
  console.log();
  console.log(`📌 Responsibilities (${data.responsibilities.length}):`);
  data.responsibilities.forEach((r: string, i: number) => {
    console.log(`   ${i + 1}. ${r}`);
  });
  console.log();
  console.log("─".repeat(60));
  console.log("Full JSON output:\n");
  console.log(JSON.stringify(data, null, 2));
}

parse_main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
