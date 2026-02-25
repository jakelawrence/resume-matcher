/**
 * test-score-resumes.ts
 *
 * Tests the /api/score-resumes endpoint with a pre-parsed job posting
 * and two realistic sample resumes — one strong match, one weak match.
 *
 * Usage (with dev server running):
 *   npx tsx scripts/test-score-resumes.ts
 */

const SCORE_API_URL = "http://localhost:3000/api/score";
const THRESHOLD = 70;

const SAMPLE_JOB_POSTING = {
  jobTitle: "Senior Full Stack Engineer",
  company: "Stripe",
  location: "Remote, USA",
  employmentType: "full_time",
  roleSummary:
    "Stripe is seeking a Senior Full Stack Engineer to join their Payments Infrastructure team. The role involves designing and building scalable backend services and front-end experiences that power payments for millions of businesses globally.",
  experienceLevel: "senior",
  experienceYearsMin: 5,
  experienceYearsMax: null,
  educationLevel: "bachelors",
  educationFields: ["Computer Science"],
  skills: [
    { name: "TypeScript", category: "technical", required: true, yearsRequired: null },
    { name: "React", category: "technical", required: true, yearsRequired: null },
    { name: "Ruby", category: "language", required: true, yearsRequired: null },
    { name: "Go", category: "language", required: true, yearsRequired: null },
    { name: "PostgreSQL", category: "tool", required: true, yearsRequired: null },
    { name: "Amazon Web Services", category: "tool", required: true, yearsRequired: null },
    { name: "REST API", category: "technical", required: true, yearsRequired: null },
    { name: "GraphQL", category: "technical", required: true, yearsRequired: null },
    { name: "Distributed Systems", category: "domain", required: true, yearsRequired: null },
    { name: "PCI-DSS", category: "certification", required: false, yearsRequired: null },
    { name: "Kafka", category: "tool", required: false, yearsRequired: null },
    { name: "Kubernetes", category: "tool", required: false, yearsRequired: null },
  ],
  requiredSkills: ["TypeScript", "React", "Ruby", "Go", "PostgreSQL", "Amazon Web Services", "REST API", "GraphQL", "Distributed Systems"],
  niceToHaveSkills: ["PCI-DSS", "Kafka", "Kubernetes"],
  keywords: [
    "full stack",
    "payments",
    "infrastructure",
    "backend",
    "frontend",
    "scalable",
    "distributed systems",
    "API design",
    "TypeScript",
    "React",
    "Ruby",
    "Go",
    "PostgreSQL",
    "AWS",
    "GCP",
    "Kubernetes",
    "Kafka",
    "on-call",
    "mentoring",
    "PCI-DSS",
    "open source",
  ],
  responsibilities: [
    "Design, build, and maintain scalable backend services in Ruby and Go.",
    "Build responsive, accessible front-end experiences in React and TypeScript.",
    "Collaborate with cross-functional teams to define technical requirements.",
    "Own features end-to-end from architecture through to production deployment.",
    "Mentor junior engineers and contribute to engineering best practices.",
    "Participate in on-call rotations to ensure system reliability.",
  ],
  salaryMin: 180000,
  salaryMax: 240000,
  currency: "USD",
};

const RESUMES = [
  {
    id: "alex-chen-resume.pdf",
    text: `
Alex Chen
alex.chen@email.com | github.com/alexchen | San Francisco, CA

SUMMARY
Senior software engineer with 7 years of experience building full-stack web applications 
at scale. Specialised in TypeScript, React, and distributed backend systems. Passionate 
about payments and financial infrastructure.

EXPERIENCE

Senior Software Engineer — Braintree (PayPal), San Francisco, CA (2020–Present)
- Built and maintained core payment processing APIs handling $2B+ in annual transaction volume
- Led migration of monolithic Ruby on Rails backend to distributed Go microservices
- Designed GraphQL and REST APIs consumed by 500+ merchant integrations
- Worked closely with compliance team to maintain PCI-DSS Level 1 certification
- Mentored a team of 4 junior engineers; ran weekly technical design reviews
- On-call rotation for critical payments infrastructure (99.99% uptime SLA)

Software Engineer — Plaid, San Francisco, CA (2018–2020)
- Developed React and TypeScript front-end dashboards for financial data visualisation
- Built event-driven data pipelines using Kafka and AWS Lambda
- Deployed containerised services on Kubernetes (EKS) in AWS
- Optimised PostgreSQL queries, reducing p99 latency by 40%

Junior Software Engineer — Twilio, San Francisco, CA (2017–2018)
- Built internal tooling in Ruby on Rails
- Contributed to open-source SDKs (Node.js, Python)

EDUCATION
B.S. Computer Science — UC Berkeley, 2017

SKILLS
TypeScript, JavaScript, React, Ruby, Ruby on Rails, Go, Python,
PostgreSQL, MySQL, Redis, Kafka, Kubernetes, Docker, AWS (EC2, Lambda, RDS, S3),
GraphQL, REST, gRPC, Distributed Systems, PCI-DSS, Microservices
    `.trim(),
  },
  {
    id: "sarah-jones-resume.pdf",
    text: `
Sarah Jones
sarah.jones@email.com | linkedin.com/in/sarahjones | Austin, TX

SUMMARY
Frontend developer with 3 years of experience building marketing websites and 
e-commerce storefronts using React and WordPress. Looking to transition into 
a more technical engineering role.

EXPERIENCE

Frontend Developer — Digital Agency Co., Austin, TX (2021–Present)
- Built and maintained marketing websites for 20+ clients using React and Next.js
- Integrated Shopify and WooCommerce APIs for e-commerce functionality
- Collaborated with designers to implement pixel-perfect UI from Figma mockups
- Managed deployment pipelines on Vercel and Netlify

Junior Web Developer — Freelance (2020–2021)
- Designed and built WordPress websites for small businesses
- Basic HTML, CSS, and jQuery for client customisations

EDUCATION
B.A. Graphic Design — Texas State University, 2020

SKILLS
React, JavaScript, HTML, CSS, Tailwind CSS, Next.js, WordPress, Figma,
Shopify, Vercel, Netlify, Git
    `.trim(),
  },
];

async function score_main() {
  console.log(`🚀 Scoring ${RESUMES.length} resumes against: ${SAMPLE_JOB_POSTING.jobTitle} @ ${SAMPLE_JOB_POSTING.company}`);
  console.log(`📊 Threshold: ${THRESHOLD}%`);
  console.log("─".repeat(60));
  console.log("Calling API at", SCORE_API_URL);

  const res = await fetch(SCORE_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jobPosting: SAMPLE_JOB_POSTING,
      resumes: RESUMES,
      threshold: THRESHOLD,
    }),
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    console.error("❌ Request failed:", json.error ?? res.statusText);
    if (json.details) console.error("Validation errors:", JSON.stringify(json.details, null, 2));
    process.exit(1);
  }

  const data = json.data;

  console.log(`\n📋 SCORES (sorted best → worst)\n`);

  for (const score of data.scores) {
    const badge = score.meetsThreshold ? "✅ MEETS THRESHOLD" : "❌ BELOW THRESHOLD";
    console.log(`┌─ ${score.id}  ${badge}`);
    console.log(`│  Composite Score : ${score.compositeScore}/100`);
    console.log(`│  Skills Match    : ${score.skillsMatchScore}/100 (×${score.skillsMatchWeight})  — ${score.skillsMatchReasoning}`);
    console.log(
      `│  Exp. Relevance  : ${score.experienceRelevanceScore}/100 (×${score.experienceRelevanceWeight})  — ${score.experienceRelevanceReasoning}`,
    );
    console.log(`│  Education       : ${score.educationMatchScore}/100 (×${score.educationMatchWeight})  — ${score.educationMatchReasoning}`);
    console.log(`│  Keyword Density : ${score.keywordDensityScore}/100 (×${score.keywordDensityWeight})  — ${score.keywordDensityReasoning}`);
    console.log(`│  Summary         : ${score.summary}`);
    console.log(`│  Matched Skills  : ${score.matchedSkills.join(", ") || "none"}`);
    console.log(`│  Missing Skills  : ${score.missingSkills.join(", ") || "none"}`);
    console.log(`│  Matched Keywords: ${score.matchedKeywords.join(", ") || "none"}`);
    console.log(`└${"─".repeat(58)}`);
    console.log();
  }

  const best = data.bestMatch;
  const thresholdResult = data.bestMatchMeetsThreshold
    ? `✅ Best match MEETS the ${data.threshold}% threshold — no new resume needed.`
    : `⚠️  Best match does NOT meet the ${data.threshold}% threshold — a new resume should be generated.`;

  console.log("─".repeat(60));
  console.log(`🏆 BEST MATCH: ${best.id} (${best.compositeScore}/100)`);
  console.log(thresholdResult);
  console.log("─".repeat(60));
  console.log("\nFull JSON output:\n");
  console.log(JSON.stringify(data, null, 2));
}

score_main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
