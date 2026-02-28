"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [jobText, setJobText] = useState("");
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const charCount = jobText.length;
  const isReady = jobText.trim().length >= 50;

  async function handleSubmit() {
    if (!isReady || isAnalysing) return;
    setIsAnalysing(true);
    setError(null);

    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobPostingText: jobText }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Failed to analyse job posting.");
      }

      // Store parsed result and navigate to resume upload step
      const serializedJob = JSON.stringify(json.data);
      sessionStorage.setItem("parsedJob", serializedJob);
      localStorage.setItem("parsedJob", serializedJob);
      router.push("/upload");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsAnalysing(false);
    }
  }

  return (
    <main className="page-root">
      {/* Background grid */}
      <div className="bg-grid" aria-hidden="true" />

      <div className="layout">
        {/* Header */}
        <header className="header">
          <div className="wordmark">
            <span className="wordmark-re">re</span>
            <span className="wordmark-fit">fit</span>
          </div>
          <p className="tagline">Resume intelligence, tailored to the job.</p>
        </header>

        {/* Step indicator */}
        <nav className="steps" aria-label="Progress">
          <div className="step step--active">
            <span className="step-num">01</span>
            <span className="step-label">Paste job posting</span>
          </div>
          <div className="step-connector" />
          <div className="step step--pending">
            <span className="step-num">02</span>
            <span className="step-label">Upload résumés</span>
          </div>
          <div className="step-connector" />
          <div className="step step--pending">
            <span className="step-num">03</span>
            <span className="step-label">Review results</span>
          </div>
        </nav>

        {/* Main card */}
        <section className="card">
          <div className="card-inner">
            <div className="card-header">
              <h1 className="card-title">Paste the job posting</h1>
              <p className="card-subtitle">
                Copy the full text of any job listing and paste it below. We'll extract every requirement, skill, and keyword automatically.
              </p>
            </div>

            <div className={`textarea-wrap ${jobText.length > 0 ? "textarea-wrap--filled" : ""}`}>
              <textarea
                className="textarea"
                placeholder="Paste job posting text here…"
                value={jobText}
                onChange={(e) => setJobText(e.target.value)}
                spellCheck={false}
                aria-label="Job posting text"
              />
              <div className="textarea-footer">
                <span className={`char-count ${!isReady && charCount > 0 ? "char-count--warn" : ""}`}>
                  {charCount > 0
                    ? isReady
                      ? `${charCount.toLocaleString()} characters`
                      : `${50 - charCount} more characters needed`
                    : "Minimum 50 characters"}
                </span>
              </div>
            </div>

            {error && (
              <div className="error-banner" role="alert">
                <span className="error-icon">!</span>
                {error}
              </div>
            )}

            <button
              className={`submit-btn ${isReady ? "submit-btn--ready" : ""} ${isAnalysing ? "submit-btn--loading" : ""}`}
              onClick={handleSubmit}
              disabled={!isReady || isAnalysing}
              aria-busy={isAnalysing}
            >
              {isAnalysing ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Analysing posting…
                </>
              ) : (
                <>
                  Analyse posting
                  <span className="btn-arrow" aria-hidden="true">
                    →
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Decorative accent */}
          <div className="card-accent" aria-hidden="true" />
        </section>

        {/* Feature pills */}
        <footer className="features">
          {["Skill extraction", "ATS keywords", "Experience scoring", "PDF generation"].map((f) => (
            <span key={f} className="feature-pill">
              {f}
            </span>
          ))}
        </footer>
      </div>

      <style>{`
        /* ── Tokens ─────────────────────────────────────────── */
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

        /* ── Reset ──────────────────────────────────────────── */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── Page ───────────────────────────────────────────── */
        .page-root {
          min-height: 100vh;
          background: var(--paper);
          font-family: var(--sans);
          color: var(--ink);
          position: relative;
          overflow-x: hidden;
        }

        /* ── Background grid ─────────────────────────────────── */
        .bg-grid {
          position: fixed;
          inset: 0;
          pointer-events: none;
          background-image:
            linear-gradient(var(--border) 1px, transparent 1px),
            linear-gradient(90deg, var(--border) 1px, transparent 1px);
          background-size: 48px 48px;
          opacity: 0.6;
          z-index: 0;
        }

        /* ── Layout ─────────────────────────────────────────── */
        .layout {
          position: relative;
          z-index: 1;
          max-width: 720px;
          margin: 0 auto;
          padding: 48px 24px 80px;
          display: flex;
          flex-direction: column;
          gap: 40px;
        }

        /* ── Wordmark ───────────────────────────────────────── */
        .header {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .wordmark {
          font-family: var(--serif);
          font-size: 42px;
          font-weight: 700;
          letter-spacing: -1px;
          line-height: 1;
        }
        .wordmark-re  { color: var(--ink); }
        .wordmark-fit { color: var(--accent); }

        .tagline {
          font-family: var(--mono);
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-3);
        }

        /* ── Steps ──────────────────────────────────────────── */
        .steps {
          display: flex;
          align-items: center;
          gap: 0;
        }
        .step {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .step-num {
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.1em;
          color: var(--ink-3);
        }
        .step-label {
          font-size: 12px;
          font-weight: 500;
          color: var(--ink-3);
          white-space: nowrap;
        }
        .step--active .step-num  { color: var(--accent); }
        .step--active .step-label { color: var(--ink); font-weight: 600; }

        .step-connector {
          flex: 1;
          height: 1px;
          background: var(--border);
          margin: 0 16px;
          margin-bottom: 2px;
          min-width: 32px;
        }

        /* ── Card ───────────────────────────────────────────── */
        .card {
          background: #fff;
          border: 1px solid var(--border);
          border-radius: var(--radius);
          position: relative;
          overflow: hidden;
          box-shadow:
            0 1px 3px rgba(0,0,0,0.06),
            0 8px 32px rgba(0,0,0,0.04);
        }
        .card-inner {
          padding: 40px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .card-accent {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--accent), var(--accent-2));
        }

        /* ── Card header ────────────────────────────────────── */
        .card-header { display: flex; flex-direction: column; gap: 8px; }
        .card-title {
          font-family: var(--serif);
          font-size: 26px;
          font-weight: 700;
          color: var(--ink);
          letter-spacing: -0.3px;
        }
        .card-subtitle {
          font-size: 14px;
          line-height: 1.6;
          color: var(--ink-2);
          max-width: 520px;
        }

        /* ── Textarea ───────────────────────────────────────── */
        .textarea-wrap {
          border: 1px solid var(--border);
          border-radius: var(--radius);
          overflow: hidden;
          transition: border-color 0.15s, box-shadow 0.15s;
          background: var(--paper);
        }
        .textarea-wrap:focus-within {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-dim);
          background: #fff;
        }
        .textarea-wrap--filled {
          background: #fff;
        }

        .textarea {
          width: 100%;
          min-height: 280px;
          padding: 20px;
          font-family: var(--mono);
          font-size: 13px;
          line-height: 1.7;
          color: var(--ink);
          background: transparent;
          border: none;
          resize: vertical;
          outline: none;
        }
        .textarea::placeholder { color: var(--ink-3); }

        .textarea-footer {
          padding: 8px 20px;
          border-top: 1px solid var(--border);
          display: flex;
          justify-content: flex-end;
        }
        .char-count {
          font-family: var(--mono);
          font-size: 11px;
          color: var(--ink-3);
          transition: color 0.15s;
        }
        .char-count--warn { color: #b45309; }

        /* ── Error ──────────────────────────────────────────── */
        .error-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: var(--radius);
          font-size: 13px;
          color: #b91c1c;
        }
        .error-icon {
          width: 18px; height: 18px;
          border-radius: 50%;
          background: #ef4444;
          color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700;
          flex-shrink: 0;
        }

        /* ── Button ─────────────────────────────────────────── */
        .submit-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          padding: 16px 24px;
          border-radius: var(--radius);
          border: 1px solid var(--border);
          background: var(--paper-2);
          color: var(--ink-3);
          font-family: var(--sans);
          font-size: 15px;
          font-weight: 600;
          cursor: not-allowed;
          transition: all 0.2s;
          letter-spacing: 0.01em;
        }
        .submit-btn--ready {
          background: var(--ink);
          color: var(--paper);
          border-color: var(--ink);
          cursor: pointer;
        }
        .submit-btn--ready:hover {
          background: var(--accent);
          border-color: var(--accent);
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(200,75,47,0.25);
        }
        .submit-btn--ready:active { transform: translateY(0); }
        .submit-btn--loading {
          background: var(--ink-2);
          border-color: var(--ink-2);
          cursor: wait;
        }

        .btn-arrow {
          font-size: 18px;
          transition: transform 0.2s;
        }
        .submit-btn--ready:hover .btn-arrow { transform: translateX(4px); }

        /* ── Spinner ────────────────────────────────────────── */
        .spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Feature pills ──────────────────────────────────── */
        .features {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .feature-pill {
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-3);
          padding: 5px 10px;
          border: 1px solid var(--border);
          border-radius: 2px;
          background: rgba(255,255,255,0.6);
        }

        /* ── Responsive ─────────────────────────────────────── */
        @media (max-width: 600px) {
          .layout { padding: 32px 16px 64px; gap: 28px; }
          .card-inner { padding: 28px 20px; }
          .wordmark { font-size: 34px; }
          .step-label { display: none; }
          .step-connector { min-width: 20px; }
        }
      `}</style>
    </main>
  );
}
