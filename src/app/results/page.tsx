"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface ResumeScore {
  id: string;
  skillsMatchScore: number;
  skillsMatchWeight: number;
  skillsMatchReasoning: string;
  experienceRelevanceScore: number;
  experienceRelevanceWeight: number;
  experienceRelevanceReasoning: string;
  educationMatchScore: number;
  educationMatchWeight: number;
  educationMatchReasoning: string;
  keywordDensityScore: number;
  keywordDensityWeight: number;
  keywordDensityReasoning: string;
  compositeScore: number;
  summary: string;
  matchedSkills: string[];
  missingSkills: string[];
  matchedKeywords: string[];
  meetsThreshold: boolean;
}

interface ScoringResults {
  scores: ResumeScore[];
  bestMatch: ResumeScore;
  bestMatchMeetsThreshold: boolean;
  threshold: number;
}

interface JobPosting {
  jobTitle: string;
  company: string | null;
  location: string | null;
  experienceLevel: string;
}

interface LatestRunStateResponse {
  success: boolean;
  data?: {
    updatedAt: string;
    jobPosting: JobPosting;
    scoringResults: ScoringResults;
  };
}

function parseStoredJson<T>(raw: string | null) {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score >= 80 ? "#16a34a" : score >= 60 ? "#c84b2f" : score >= 40 ? "#b45309" : "#9f1239";

  return (
    <svg width={size} height={size} className="score-ring" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(14,14,14,0.08)" strokeWidth="5" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${progress} ${circumference}`}
        strokeDashoffset={circumference / 4}
        style={{ transition: "stroke-dasharray 1s cubic-bezier(0.34,1.56,0.64,1)" }}
      />
      <text
        x={size / 2}
        y={size / 2 + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={size * 0.22}
        fontWeight="700"
        fill={color}
        fontFamily="'DM Mono', monospace"
      >
        {score}
      </text>
    </svg>
  );
}

function DimensionBar({ label, score, reasoning, delay }: { label: string; score: number; reasoning: string; delay: number }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(score), 100 + delay);
    return () => clearTimeout(t);
  }, [score, delay]);

  const color = score >= 80 ? "#16a34a" : score >= 60 ? "#c84b2f" : score >= 40 ? "#b45309" : "#9f1239";

  return (
    <div className="dim-row">
      <div className="dim-header">
        <span className="dim-label">{label}</span>
        <span className="dim-score" style={{ color }}>
          {score}
        </span>
      </div>
      <div className="dim-track">
        <div
          className="dim-fill"
          style={{
            width: `${width}%`,
            background: color,
            transition: `width 0.8s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms`,
          }}
        />
      </div>
      <p className="dim-reasoning">{reasoning}</p>
    </div>
  );
}

function ResumeCard({ score, rank, isExpanded, onToggle }: { score: ResumeScore; rank: number; isExpanded: boolean; onToggle: () => void }) {
  const isBest = rank === 1;
  const scoreColor =
    score.compositeScore >= 80 ? "#16a34a" : score.compositeScore >= 60 ? "#c84b2f" : score.compositeScore >= 40 ? "#b45309" : "#9f1239";

  return (
    <article
      className={`resume-card ${isBest ? "resume-card--best" : ""} ${isExpanded ? "resume-card--open" : ""}`}
      style={{ animationDelay: `${(rank - 1) * 100}ms` }}
    >
      {isBest && (
        <div className="best-ribbon" aria-label="Best match">
          <span>★ BEST MATCH</span>
        </div>
      )}

      {/* Card header — always visible */}
      <button className="card-header" onClick={onToggle} aria-expanded={isExpanded}>
        <div className="card-rank">
          <span className="rank-num">#{rank}</span>
        </div>

        <ScoreRing score={score.compositeScore} size={72} />

        <div className="card-meta">
          <h2 className="card-filename">{score.id}</h2>
          <p className="card-summary-short">{score.summary}</p>
          <div className="card-tags">
            <span
              className="threshold-tag"
              style={{
                background: score.meetsThreshold ? "rgba(22,163,74,0.1)" : "rgba(159,18,57,0.08)",
                color: score.meetsThreshold ? "#16a34a" : "#9f1239",
                borderColor: score.meetsThreshold ? "rgba(22,163,74,0.25)" : "rgba(159,18,57,0.2)",
              }}
            >
              {score.meetsThreshold ? "✓ Meets threshold" : "✗ Below threshold"}
            </span>
            <span className="skills-tag">
              {score.matchedSkills.length} / {score.matchedSkills.length + score.missingSkills.length} skills
            </span>
          </div>
        </div>

        <div className="chevron" aria-hidden="true" style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0)" }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {/* Expanded detail panel */}
      <div className={`card-detail ${isExpanded ? "card-detail--open" : ""}`}>
        <div className="detail-inner">
          {/* Score breakdown */}
          <section className="detail-section">
            <h3 className="detail-heading">Score Breakdown</h3>
            <div className="dimensions">
              <DimensionBar label="Skills Match" score={score.skillsMatchScore} reasoning={score.skillsMatchReasoning} delay={0} />
              <DimensionBar
                label="Experience Relevance"
                score={score.experienceRelevanceScore}
                reasoning={score.experienceRelevanceReasoning}
                delay={80}
              />
              <DimensionBar label="Education Match" score={score.educationMatchScore} reasoning={score.educationMatchReasoning} delay={160} />
              <DimensionBar label="Keyword Density" score={score.keywordDensityScore} reasoning={score.keywordDensityReasoning} delay={240} />
            </div>
          </section>

          <div className="detail-cols">
            {/* Matched skills */}
            <section className="detail-section">
              <h3 className="detail-heading detail-heading--green">
                Matched Skills
                <span className="heading-count">{score.matchedSkills.length}</span>
              </h3>
              {score.matchedSkills.length > 0 ? (
                <div className="skill-chips">
                  {score.matchedSkills.map((s) => (
                    <span key={s} className="chip chip--matched">
                      {s}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="empty-chips">None found</p>
              )}
            </section>

            {/* Missing skills */}
            <section className="detail-section">
              <h3 className="detail-heading detail-heading--red">
                Missing Skills
                <span className="heading-count">{score.missingSkills.length}</span>
              </h3>
              {score.missingSkills.length > 0 ? (
                <div className="skill-chips">
                  {score.missingSkills.map((s) => (
                    <span key={s} className="chip chip--missing">
                      {s}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="empty-chips">None — full coverage!</p>
              )}
            </section>
          </div>

          {/* Matched keywords */}
          {score.matchedKeywords.length > 0 && (
            <section className="detail-section">
              <h3 className="detail-heading">
                ATS Keywords Found
                <span className="heading-count">{score.matchedKeywords.length}</span>
              </h3>
              <div className="skill-chips">
                {score.matchedKeywords.map((k) => (
                  <span key={k} className="chip chip--keyword">
                    {k}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </article>
  );
}

export default function ResultsPage() {
  const router = useRouter();
  const [results, setResults] = useState<ScoringResults | null>(null);
  const [jobPosting, setJobPosting] = useState<JobPosting | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadResults = async () => {
      const sessionResults = parseStoredJson<ScoringResults>(sessionStorage.getItem("scoringResults"));
      const sessionJob = parseStoredJson<JobPosting>(sessionStorage.getItem("parsedJob"));

      const localResults = parseStoredJson<ScoringResults>(localStorage.getItem("scoringResults"));
      const localJob = parseStoredJson<JobPosting>(localStorage.getItem("parsedJob"));

      const fromBrowserResults = sessionResults ?? localResults;
      const fromBrowserJob = sessionJob ?? localJob;

      if (fromBrowserResults) {
        if (cancelled) return;
        setResults(fromBrowserResults);
        setExpandedId(fromBrowserResults.bestMatch.id);
        if (fromBrowserJob) setJobPosting(fromBrowserJob);

        sessionStorage.setItem("scoringResults", JSON.stringify(fromBrowserResults));
        localStorage.setItem("scoringResults", JSON.stringify(fromBrowserResults));
        if (fromBrowserJob) {
          sessionStorage.setItem("parsedJob", JSON.stringify(fromBrowserJob));
          localStorage.setItem("parsedJob", JSON.stringify(fromBrowserJob));
        }
        return;
      }

      try {
        const res = await fetch("/api/run-state/latest", { cache: "no-store" });
        if (!res.ok) throw new Error("No latest run state.");

        const json = (await res.json()) as LatestRunStateResponse;
        if (!json.success || !json.data) throw new Error("No latest run state.");
        if (cancelled) return;

        setResults(json.data.scoringResults);
        setExpandedId(json.data.scoringResults.bestMatch.id);
        setJobPosting(json.data.jobPosting);

        sessionStorage.setItem("scoringResults", JSON.stringify(json.data.scoringResults));
        localStorage.setItem("scoringResults", JSON.stringify(json.data.scoringResults));
        sessionStorage.setItem("parsedJob", JSON.stringify(json.data.jobPosting));
        localStorage.setItem("parsedJob", JSON.stringify(json.data.jobPosting));
      } catch {
        if (!cancelled) router.push("/");
      }
    };

    loadResults();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!results) {
    return (
      <main className="page-root">
        <div className="bg-grid" aria-hidden="true" />
        <div className="loading-center">
          <span className="spinner" />
        </div>
      </main>
    );
  }

  return (
    <main className="page-root">
      <div className="bg-grid" aria-hidden="true" />

      <div className="layout">
        {/* Header */}
        <header className="header">
          <div className="wordmark" onClick={() => router.push("/")} role="button" tabIndex={0}>
            <span className="wordmark-re">re</span>
            <span className="wordmark-fit">fit</span>
          </div>
          <p className="tagline">Resume intelligence, tailored to the job.</p>
        </header>

        {/* Step indicator */}
        <nav className="steps" aria-label="Progress">
          <div className="step step--done">
            <span className="step-num">01</span>
            <span className="step-label">Paste job posting</span>
          </div>
          <div className="step-connector" />
          <div className="step step--done">
            <span className="step-num">02</span>
            <span className="step-label">Upload résumés</span>
          </div>
          <div className="step-connector" />
          <div className="step step--active">
            <span className="step-num">03</span>
            <span className="step-label">Review results</span>
          </div>
        </nav>

        {/* Job context banner */}
        {jobPosting && (
          <div className="job-banner">
            <div className="job-banner-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
              </svg>
            </div>
            <div className="job-banner-text">
              <span className="job-title">{jobPosting.jobTitle}</span>
              {jobPosting.company && <span className="job-co"> — {jobPosting.company}</span>}
              {jobPosting.location && <span className="job-loc"> · {jobPosting.location}</span>}
            </div>
            <button className="start-over-btn" onClick={() => router.push("/")}>
              Start over
            </button>
          </div>
        )}

        {/* Verdict banner */}
        <div
          className="verdict"
          style={{
            background: results.bestMatchMeetsThreshold ? "rgba(22,163,74,0.08)" : "rgba(200,75,47,0.08)",
            borderColor: results.bestMatchMeetsThreshold ? "rgba(22,163,74,0.2)" : "rgba(200,75,47,0.25)",
          }}
        >
          <div
            className="verdict-dot"
            style={{
              background: results.bestMatchMeetsThreshold ? "#16a34a" : "#c84b2f",
              boxShadow: `0 0 0 4px ${results.bestMatchMeetsThreshold ? "rgba(22,163,74,0.2)" : "rgba(200,75,47,0.2)"}`,
            }}
          />
          <div className="verdict-text">
            {results.bestMatchMeetsThreshold ? (
              <>
                <strong>{results.bestMatch.id}</strong> is your best match at <strong>{results.bestMatch.compositeScore}/100</strong> — above your{" "}
                {results.threshold}% threshold.
              </>
            ) : (
              <>
                No résumé met your {results.threshold}% threshold. Best score was <strong>{results.bestMatch.compositeScore}/100</strong> (
                {results.bestMatch.id}). Consider generating a tailored résumé.
              </>
            )}
          </div>
        </div>

        {/* Summary strip */}
        <div className="summary-strip">
          <div className="strip-stat">
            <span className="stat-val">{results.scores.length}</span>
            <span className="stat-label">résumés scored</span>
          </div>
          <div className="strip-divider" />
          <div className="strip-stat">
            <span className="stat-val">{results.bestMatch.compositeScore}</span>
            <span className="stat-label">top score</span>
          </div>
          <div className="strip-divider" />
          <div className="strip-stat">
            <span className="stat-val">{results.threshold}%</span>
            <span className="stat-label">threshold</span>
          </div>
          <div className="strip-divider" />
          <div className="strip-stat">
            <span className="stat-val">{results.scores.filter((s) => s.meetsThreshold).length}</span>
            <span className="stat-label">pass threshold</span>
          </div>
        </div>

        {/* Resume cards */}
        <section className="cards-section" aria-label="Résumé scores">
          {results.scores.map((score, i) => (
            <ResumeCard
              key={score.id}
              score={score}
              rank={i + 1}
              isExpanded={expandedId === score.id}
              onToggle={() => setExpandedId(expandedId === score.id ? null : score.id)}
            />
          ))}
        </section>

        {/* Footer actions */}
        <div className="footer-actions">
          <button className="action-btn action-btn--secondary" onClick={() => router.push("/upload")}>
            ← Back to résumés
          </button>
          <button className="action-btn action-btn--primary" onClick={() => router.push("/")}>
            New job posting →
          </button>
        </div>
      </div>

      <style>{`
        /* ── Tokens ───────────────────────────────────────── */
        :root {
          --ink:        #0e0e0e;
          --ink-2:      #3a3a3a;
          --ink-3:      #7a7a7a;
          --paper:      #f5f2eb;
          --paper-2:    #ede9e0;
          --paper-3:    #e2ddd3;
          --accent:     #c84b2f;
          --accent-2:   #e8612e;
          --accent-dim: rgba(200, 75, 47, 0.12);
          --border:     rgba(14,14,14,0.12);
          --radius:     4px;
          --mono:       "DM Mono", "Fira Mono", monospace;
          --serif:      "Playfair Display", Georgia, serif;
          --sans:       "DM Sans", "Helvetica Neue", sans-serif;
        }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── Page ─────────────────────────────────────────── */
        .page-root {
          min-height: 100vh;
          background: var(--paper);
          font-family: var(--sans);
          color: var(--ink);
          position: relative;
          overflow-x: hidden;
        }
        .bg-grid {
          position: fixed; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(var(--border) 1px, transparent 1px),
            linear-gradient(90deg, var(--border) 1px, transparent 1px);
          background-size: 48px 48px;
          opacity: 0.6; z-index: 0;
        }
        .loading-center {
          position: fixed; inset: 0;
          display: flex; align-items: center; justify-content: center;
        }

        /* ── Layout ───────────────────────────────────────── */
        .layout {
          position: relative; z-index: 1;
          max-width: 760px;
          margin: 0 auto;
          padding: 48px 24px 80px;
          display: flex; flex-direction: column; gap: 24px;
        }

        /* ── Header ───────────────────────────────────────── */
        .header { display: flex; flex-direction: column; gap: 6px; }
        .wordmark {
          font-family: var(--serif); font-size: 42px; font-weight: 700;
          letter-spacing: -1px; line-height: 1; cursor: pointer;
          display: inline-flex;
        }
        .wordmark-re  { color: var(--ink); }
        .wordmark-fit { color: var(--accent); }
        .tagline {
          font-family: var(--mono); font-size: 11px;
          letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-3);
        }

        /* ── Steps ────────────────────────────────────────── */
        .steps { display: flex; align-items: center; }
        .step { display: flex; flex-direction: column; gap: 3px; }
        .step-num { font-family: var(--mono); font-size: 10px; letter-spacing: 0.1em; color: var(--ink-3); }
        .step-label { font-size: 12px; font-weight: 500; color: var(--ink-3); white-space: nowrap; }
        .step--active .step-num  { color: var(--accent); }
        .step--active .step-label { color: var(--ink); font-weight: 600; }
        .step--done .step-num  { color: #16a34a; }
        .step--done .step-label { color: var(--ink-2); }
        .step-connector { flex: 1; height: 1px; background: var(--border); margin: 0 16px; margin-bottom: 2px; min-width: 32px; }

        /* ── Job banner ───────────────────────────────────── */
        .job-banner {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 16px;
          background: #fff;
          border: 1px solid var(--border);
          border-radius: var(--radius);
          font-size: 13px;
        }
        .job-banner-icon {
          color: var(--ink-3); flex-shrink: 0;
          display: flex; align-items: center;
        }
        .job-banner-text { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .job-title { font-weight: 600; color: var(--ink); }
        .job-co    { color: var(--ink-2); }
        .job-loc   { font-family: var(--mono); font-size: 11px; color: var(--ink-3); }
        .start-over-btn {
          font-family: var(--mono); font-size: 10px; letter-spacing: 0.08em;
          text-transform: uppercase; padding: 4px 10px;
          border: 1px solid var(--border); border-radius: 2px;
          background: transparent; color: var(--ink-3);
          cursor: pointer; white-space: nowrap;
          transition: all 0.15s; flex-shrink: 0;
        }
        .start-over-btn:hover { border-color: var(--accent); color: var(--accent); }

        /* ── Verdict ──────────────────────────────────────── */
        .verdict {
          display: flex; align-items: center; gap: 14px;
          padding: 16px 20px;
          border: 1px solid;
          border-radius: var(--radius);
          font-size: 14px; line-height: 1.5; color: var(--ink-2);
        }
        .verdict-dot {
          width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
        }
        .verdict-text strong { color: var(--ink); }

        /* ── Summary strip ────────────────────────────────── */
        .summary-strip {
          display: flex; align-items: center;
          background: #fff;
          border: 1px solid var(--border);
          border-radius: var(--radius);
          overflow: hidden;
        }
        .strip-stat {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; gap: 3px;
          padding: 16px 12px;
        }
        .stat-val {
          font-family: var(--mono); font-size: 22px; font-weight: 700;
          color: var(--ink); line-height: 1;
        }
        .stat-label {
          font-family: var(--mono); font-size: 10px;
          letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-3);
        }
        .strip-divider { width: 1px; height: 40px; background: var(--border); flex-shrink: 0; }

        /* ── Resume cards ─────────────────────────────────── */
        .cards-section { display: flex; flex-direction: column; gap: 12px; }

        .resume-card {
          background: #fff;
          border: 1px solid var(--border);
          border-radius: var(--radius);
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          animation: slideIn 0.4s ease both;
          position: relative;
        }
        .resume-card--best {
          border-color: rgba(200,75,47,0.3);
          box-shadow: 0 2px 12px rgba(200,75,47,0.08);
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Best ribbon ──────────────────────────────────── */
        .best-ribbon {
          position: absolute; top: 0; right: 0;
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
          color: white;
          font-family: var(--mono); font-size: 9px; font-weight: 700;
          letter-spacing: 0.1em;
          padding: 4px 12px 4px 16px;
          clip-path: polygon(8px 0, 100% 0, 100% 100%, 0 100%);
        }

        /* ── Card header (toggle button) ──────────────────── */
        .card-header {
          width: 100%; display: flex; align-items: center; gap: 18px;
          padding: 20px 24px;
          background: transparent; border: none;
          cursor: pointer; text-align: left;
          transition: background 0.15s;
        }
        .card-header:hover { background: rgba(0,0,0,0.015); }
        .resume-card--best .card-header { padding-right: 100px; }

        .card-rank {
          display: flex; flex-direction: column; align-items: center;
          flex-shrink: 0;
        }
        .rank-num {
          font-family: var(--mono); font-size: 11px;
          color: var(--ink-3); letter-spacing: 0.06em;
        }

        .card-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
        .card-filename {
          font-size: 15px; font-weight: 600; color: var(--ink);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .card-summary-short {
          font-size: 13px; color: var(--ink-2); line-height: 1.5;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .card-tags { display: flex; flex-wrap: wrap; gap: 6px; }
        .threshold-tag, .skills-tag {
          font-family: var(--mono); font-size: 10px;
          letter-spacing: 0.06em; text-transform: uppercase;
          padding: 3px 8px; border-radius: 2px; border: 1px solid;
        }
        .skills-tag {
          background: var(--paper-2); color: var(--ink-3);
          border-color: var(--border);
        }

        .chevron {
          color: var(--ink-3); flex-shrink: 0;
          transition: transform 0.25s ease;
        }

        /* ── Card detail ──────────────────────────────────── */
        .card-detail {
          max-height: 0; overflow: hidden;
          transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .card-detail--open { max-height: 1200px; }

        .detail-inner {
          padding: 0 24px 28px;
          border-top: 1px solid var(--border);
          display: flex; flex-direction: column; gap: 24px;
        }
        .detail-inner > * { padding-top: 24px; }
        .detail-inner > * + * { border-top: 1px solid var(--border); }

        /* ── Detail sections ──────────────────────────────── */
        .detail-section { display: flex; flex-direction: column; gap: 12px; }
        .detail-heading {
          font-family: var(--mono); font-size: 10px;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--ink-3); display: flex; align-items: center; gap: 8px;
        }
        .detail-heading--green { color: #16a34a; }
        .detail-heading--red   { color: #9f1239; }
        .heading-count {
          background: var(--paper-2); border: 1px solid var(--border);
          border-radius: 99px; padding: 1px 7px;
          font-size: 10px; color: var(--ink-3);
        }

        .detail-cols {
          display: grid; grid-template-columns: 1fr 1fr; gap: 24px;
        }

        /* ── Dimension bars ───────────────────────────────── */
        .dimensions { display: flex; flex-direction: column; gap: 14px; }
        .dim-row { display: flex; flex-direction: column; gap: 5px; }
        .dim-header { display: flex; justify-content: space-between; align-items: baseline; }
        .dim-label {
          font-size: 12px; font-weight: 600; color: var(--ink-2);
        }
        .dim-score {
          font-family: var(--mono); font-size: 13px; font-weight: 700;
        }
        .dim-track {
          height: 5px; background: var(--paper-2);
          border-radius: 99px; overflow: hidden;
        }
        .dim-fill { height: 100%; border-radius: 99px; }
        .dim-reasoning {
          font-size: 12px; color: var(--ink-3); line-height: 1.5;
        }

        /* ── Skill chips ──────────────────────────────────── */
        .skill-chips { display: flex; flex-wrap: wrap; gap: 6px; }
        .chip {
          font-family: var(--mono); font-size: 11px;
          padding: 4px 9px; border-radius: 2px; border: 1px solid;
        }
        .chip--matched {
          background: rgba(22,163,74,0.08);
          color: #166534; border-color: rgba(22,163,74,0.2);
        }
        .chip--missing {
          background: rgba(159,18,57,0.06);
          color: #9f1239; border-color: rgba(159,18,57,0.18);
        }
        .chip--keyword {
          background: var(--paper-2);
          color: var(--ink-2); border-color: var(--border);
        }
        .empty-chips {
          font-family: var(--mono); font-size: 11px; color: var(--ink-3);
          font-style: italic;
        }

        /* ── Footer actions ───────────────────────────────── */
        .footer-actions {
          display: flex; justify-content: space-between; gap: 12px;
          padding-top: 8px;
        }
        .action-btn {
          padding: 13px 24px; border-radius: var(--radius);
          font-family: var(--sans); font-size: 14px; font-weight: 600;
          cursor: pointer; transition: all 0.2s;
        }
        .action-btn--secondary {
          background: #fff; color: var(--ink-2);
          border: 1px solid var(--border);
        }
        .action-btn--secondary:hover {
          border-color: var(--ink-2); color: var(--ink);
        }
        .action-btn--primary {
          background: var(--ink); color: var(--paper);
          border: 1px solid var(--ink);
        }
        .action-btn--primary:hover {
          background: var(--accent); border-color: var(--accent);
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(200,75,47,0.25);
        }

        /* ── Spinner ──────────────────────────────────────── */
        .spinner {
          display: inline-block;
          width: 28px; height: 28px;
          border: 3px solid var(--border);
          border-top-color: var(--ink-2);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Score ring animation on mount ───────────────── */
        .score-ring { display: block; flex-shrink: 0; }

        /* ── Responsive ───────────────────────────────────── */
        @media (max-width: 600px) {
          .layout { padding: 32px 16px 64px; gap: 16px; }
          .wordmark { font-size: 34px; }
          .step-label { display: none; }
          .step-connector { min-width: 20px; }
          .card-header { padding: 16px; gap: 12px; }
          .detail-cols { grid-template-columns: 1fr; }
          .summary-strip { overflow-x: auto; }
          .footer-actions { flex-direction: column; }
          .action-btn { text-align: center; }
          .resume-card--best .card-header { padding-right: 16px; }
          .best-ribbon { display: none; }
        }
      `}</style>
    </main>
  );
}
