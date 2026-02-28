"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface StoredResume {
  id: string;
  filename: string;
  sizeBytes: number;
  uploadedAt: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [resumes, setResumes] = useState<StoredResume[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingList, setLoadingList] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  const [scoringError, setScoringError] = useState<string | null>(null);

  // ── Load stored resumes ──────────────────────────────────────────────────
  const fetchResumes = useCallback(async () => {
    try {
      const res = await fetch("/api/resumes");
      const json = await res.json();
      if (json.success) {
        setResumes(json.resumes);
        // Default: all selected
        setSelected(new Set(json.resumes.map((r: StoredResume) => r.id)));
      }
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  // ── Selection helpers ────────────────────────────────────────────────────
  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(resumes.map((r) => r.id)));
  }

  function selectNone() {
    setSelected(new Set());
  }

  // ── Upload logic ─────────────────────────────────────────────────────────
  async function uploadFile(file: File) {
    if (!file.name.endsWith(".pdf")) {
      setUploadError("Only PDF files are accepted.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File must be under 5 MB.");
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const form = new FormData();
      form.append("resume", file);

      const res = await fetch("/api/resumes/upload", {
        method: "POST",
        body: form,
      });
      const json = await res.json();

      if (!json.success) throw new Error(json.error);

      // Add to list and auto-select
      const newResume: StoredResume = json.resume;
      setResumes((prev) => [newResume, ...prev]);
      setSelected((prev) => new Set([...prev, newResume.id]));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  // ── Score resumes ─────────────────────────────────────────────────────────
  async function handleScore() {
    setScoringError(null);

    const parsedJob = sessionStorage.getItem("parsedJob") ?? localStorage.getItem("parsedJob");
    if (!parsedJob) {
      setScoringError("Job posting data not found. Please go back to step 1.");
      return;
    }

    const targetIds = selected.size > 0 ? [...selected] : resumes.map((r) => r.id);
    if (targetIds.length === 0) {
      setScoringError("Please upload at least one résumé before scoring.");
      return;
    }

    setIsScoring(true);

    try {
      // Fetch text for each selected resume via the score endpoint
      // (text extraction happens server-side — here we just pass IDs)
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobPosting: JSON.parse(parsedJob),
          resumeIds: targetIds,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Scoring failed.");

      sessionStorage.setItem("parsedJob", parsedJob);
      localStorage.setItem("parsedJob", parsedJob);

      const serializedResults = JSON.stringify(json.data);
      sessionStorage.setItem("scoringResults", serializedResults);
      localStorage.setItem("scoringResults", serializedResults);
      router.push("/results");
    } catch (err) {
      setScoringError(err instanceof Error ? err.message : "Scoring failed.");
      setIsScoring(false);
    }
  }

  const activeCount = selected.size === 0 ? resumes.length : selected.size;
  const allSelected = resumes.length > 0 && selected.size === resumes.length;

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
          <div className="step step--active">
            <span className="step-num">02</span>
            <span className="step-label">Upload résumés</span>
          </div>
          <div className="step-connector" />
          <div className="step step--pending">
            <span className="step-num">03</span>
            <span className="step-label">Review results</span>
          </div>
        </nav>

        {/* Drop zone */}
        <section
          className={`dropzone ${isDragging ? "dropzone--active" : ""} ${uploading ? "dropzone--uploading" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload résumé PDF"
          onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" className="hidden-input" onChange={handleFileInput} />

          <div className="dropzone-icon" aria-hidden="true">
            {uploading ? (
              <span className="spinner spinner--dark" />
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14,2 14,8 20,8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <polyline points="9,15 12,12 15,15" />
              </svg>
            )}
          </div>

          <div className="dropzone-text">
            <span className="dropzone-primary">{uploading ? "Uploading…" : isDragging ? "Drop to upload" : "Upload a résumé"}</span>
            <span className="dropzone-secondary">Drag & drop or click to browse · PDF only · Max 5 MB</span>
          </div>
        </section>

        {uploadError && (
          <div className="error-banner" role="alert">
            <span className="error-icon">!</span>
            {uploadError}
          </div>
        )}

        {/* Résumé list */}
        <section className="card">
          <div className="card-accent" aria-hidden="true" />
          <div className="card-inner">
            <div className="list-header">
              <div className="list-title-group">
                <h2 className="list-title">Your résumés</h2>
                {!loadingList && resumes.length > 0 && <span className="resume-badge">{resumes.length}</span>}
              </div>

              {resumes.length > 1 && (
                <div className="select-controls">
                  <button className={`ctrl-btn ${allSelected ? "ctrl-btn--active" : ""}`} onClick={selectAll}>
                    All
                  </button>
                  <button className={`ctrl-btn ${selected.size === 0 ? "ctrl-btn--active" : ""}`} onClick={selectNone}>
                    None
                  </button>
                </div>
              )}
            </div>

            {loadingList ? (
              <div className="empty-state">
                <span className="spinner spinner--dark" />
                <span>Loading résumés…</span>
              </div>
            ) : resumes.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon" aria-hidden="true">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14,2 14,8 20,8" />
                  </svg>
                </div>
                <p className="empty-text">No résumés uploaded yet</p>
                <p className="empty-sub">Upload your first PDF above to get started</p>
              </div>
            ) : (
              <ul className="resume-list" role="list">
                {resumes.map((resume, i) => {
                  const isChecked = selected.has(resume.id);
                  return (
                    <li
                      key={resume.id}
                      className={`resume-item ${isChecked ? "resume-item--selected" : ""}`}
                      style={{ animationDelay: `${i * 40}ms` }}
                      onClick={() => toggleSelect(resume.id)}
                      role="checkbox"
                      aria-checked={isChecked}
                      tabIndex={0}
                      onKeyDown={(e) => e.key === " " && toggleSelect(resume.id)}
                    >
                      <div className={`checkbox ${isChecked ? "checkbox--checked" : ""}`} aria-hidden="true">
                        {isChecked && (
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                            <polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>

                      <div className="pdf-icon" aria-hidden="true">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                          <polyline points="14,2 14,8 20,8" />
                        </svg>
                      </div>

                      <div className="resume-info">
                        <span className="resume-name">{resume.filename}</span>
                        <span className="resume-meta">
                          {formatBytes(resume.sizeBytes)} · Uploaded {formatDate(resume.uploadedAt)}
                        </span>
                      </div>

                      <div className={`selection-pill ${isChecked ? "selection-pill--on" : "selection-pill--off"}`}>
                        {isChecked ? "Scoring" : "Skipped"}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Scoring footer */}
        {resumes.length > 0 && (
          <div className="score-footer">
            {scoringError && (
              <div className="error-banner" role="alert">
                <span className="error-icon">!</span>
                {scoringError}
              </div>
            )}

            <div className="score-row">
              <p className="score-summary">
                {activeCount === resumes.length
                  ? `Scoring all ${resumes.length} résumé${resumes.length !== 1 ? "s" : ""}`
                  : `Scoring ${activeCount} of ${resumes.length} résumé${resumes.length !== 1 ? "s" : ""}`}
              </p>

              <button className={`submit-btn ${!isScoring ? "submit-btn--ready" : "submit-btn--loading"}`} onClick={handleScore} disabled={isScoring}>
                {isScoring ? (
                  <>
                    <span className="spinner" />
                    Scoring…
                  </>
                ) : (
                  <>
                    Score résumés
                    <span className="btn-arrow" aria-hidden="true">
                      →
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
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
          --green:      #166534;
          --green-bg:   #dcfce7;
          --border:     rgba(14,14,14,0.12);
          --radius:     4px;
          --mono:       "DM Mono", "Fira Mono", monospace;
          --serif:      "Playfair Display", Georgia, serif;
          --sans:       "DM Sans", "Helvetica Neue", sans-serif;
        }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .page-root {
          min-height: 100vh;
          background: var(--paper);
          font-family: var(--sans);
          color: var(--ink);
          position: relative;
          overflow-x: hidden;
        }

        .bg-grid {
          position: fixed; inset: 0;
          pointer-events: none;
          background-image:
            linear-gradient(var(--border) 1px, transparent 1px),
            linear-gradient(90deg, var(--border) 1px, transparent 1px);
          background-size: 48px 48px;
          opacity: 0.6;
          z-index: 0;
        }

        .hidden-input { display: none; }

        .layout {
          position: relative; z-index: 1;
          max-width: 720px;
          margin: 0 auto;
          padding: 48px 24px 80px;
          display: flex; flex-direction: column; gap: 28px;
        }

        /* ── Header / wordmark ──────────────────────────────── */
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

        /* ── Steps ──────────────────────────────────────────── */
        .steps { display: flex; align-items: center; }
        .step { display: flex; flex-direction: column; gap: 3px; }
        .step-num {
          font-family: var(--mono); font-size: 10px;
          letter-spacing: 0.1em; color: var(--ink-3);
        }
        .step-label { font-size: 12px; font-weight: 500; color: var(--ink-3); white-space: nowrap; }
        .step--active .step-num  { color: var(--accent); }
        .step--active .step-label { color: var(--ink); font-weight: 600; }
        .step--done .step-num  { color: var(--green); }
        .step--done .step-label { color: var(--ink-2); }
        .step-connector {
          flex: 1; height: 1px; background: var(--border);
          margin: 0 16px; margin-bottom: 2px; min-width: 32px;
        }

        /* ── Drop zone ──────────────────────────────────────── */
        .dropzone {
          border: 2px dashed var(--border);
          border-radius: var(--radius);
          background: rgba(255,255,255,0.5);
          padding: 36px 24px;
          display: flex; align-items: center; gap: 20px;
          cursor: pointer;
          transition: all 0.2s;
          user-select: none;
        }
        .dropzone:hover, .dropzone:focus {
          border-color: var(--accent);
          background: rgba(255,255,255,0.85);
          outline: none;
        }
        .dropzone--active {
          border-color: var(--accent);
          background: var(--accent-dim);
          transform: scale(1.01);
        }
        .dropzone--uploading { cursor: wait; opacity: 0.7; }

        .dropzone-icon {
          width: 52px; height: 52px; border-radius: 50%;
          background: var(--paper-2);
          border: 1px solid var(--border);
          display: flex; align-items: center; justify-content: center;
          color: var(--ink-2); flex-shrink: 0;
          transition: background 0.2s, color 0.2s;
        }
        .dropzone:hover .dropzone-icon, .dropzone--active .dropzone-icon {
          background: var(--accent-dim);
          color: var(--accent);
          border-color: var(--accent);
        }

        .dropzone-text { display: flex; flex-direction: column; gap: 4px; }
        .dropzone-primary {
          font-size: 15px; font-weight: 600; color: var(--ink);
        }
        .dropzone-secondary {
          font-family: var(--mono); font-size: 11px;
          letter-spacing: 0.04em; color: var(--ink-3);
        }

        /* ── Card ───────────────────────────────────────────── */
        .card {
          background: #fff;
          border: 1px solid var(--border);
          border-radius: var(--radius);
          position: relative; overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.04);
        }
        .card-accent {
          position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, var(--accent), var(--accent-2));
        }
        .card-inner { padding: 32px; display: flex; flex-direction: column; gap: 20px; }

        /* ── List header ────────────────────────────────────── */
        .list-header {
          display: flex; align-items: center;
          justify-content: space-between;
        }
        .list-title-group { display: flex; align-items: center; gap: 10px; }
        .list-title {
          font-family: var(--serif); font-size: 20px;
          font-weight: 700; color: var(--ink);
        }
        .resume-badge {
          font-family: var(--mono); font-size: 11px;
          background: var(--paper-2); border: 1px solid var(--border);
          color: var(--ink-3); padding: 2px 8px; border-radius: 99px;
        }
        .select-controls { display: flex; gap: 6px; }
        .ctrl-btn {
          font-family: var(--mono); font-size: 11px;
          letter-spacing: 0.06em; text-transform: uppercase;
          padding: 4px 10px; border-radius: 2px;
          border: 1px solid var(--border);
          background: transparent; color: var(--ink-3);
          cursor: pointer; transition: all 0.15s;
        }
        .ctrl-btn:hover { border-color: var(--ink-2); color: var(--ink); }
        .ctrl-btn--active {
          background: var(--ink); color: var(--paper);
          border-color: var(--ink);
        }

        /* ── Empty state ────────────────────────────────────── */
        .empty-state {
          display: flex; flex-direction: column;
          align-items: center; gap: 12px;
          padding: 40px 20px;
          color: var(--ink-3);
        }
        .empty-icon { opacity: 0.4; }
        .empty-text { font-size: 15px; font-weight: 500; color: var(--ink-2); }
        .empty-sub  { font-family: var(--mono); font-size: 11px; }

        /* ── Resume list ────────────────────────────────────── */
        .resume-list { list-style: none; display: flex; flex-direction: column; gap: 8px; }

        .resume-item {
          display: flex; align-items: center; gap: 14px;
          padding: 14px 16px;
          border: 1px solid var(--border);
          border-radius: var(--radius);
          cursor: pointer;
          transition: all 0.15s;
          background: var(--paper);
          animation: slideIn 0.3s ease both;
        }
        .resume-item:hover { border-color: var(--ink-2); background: #fff; }
        .resume-item--selected {
          border-color: var(--accent);
          background: rgba(200,75,47,0.04);
        }
        .resume-item:focus { outline: 2px solid var(--accent); outline-offset: 2px; }

        @keyframes slideIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Checkbox ───────────────────────────────────────── */
        .checkbox {
          width: 18px; height: 18px; border-radius: 3px;
          border: 1.5px solid var(--border);
          background: #fff;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: all 0.15s;
        }
        .checkbox--checked {
          background: var(--accent);
          border-color: var(--accent);
        }

        /* ── PDF icon ───────────────────────────────────────── */
        .pdf-icon {
          width: 34px; height: 34px;
          background: var(--paper-2);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          display: flex; align-items: center; justify-content: center;
          color: var(--ink-3); flex-shrink: 0;
        }
        .resume-item--selected .pdf-icon {
          background: var(--accent-dim);
          border-color: rgba(200,75,47,0.25);
          color: var(--accent);
        }

        /* ── Resume info ────────────────────────────────────── */
        .resume-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
        .resume-name {
          font-size: 13px; font-weight: 600; color: var(--ink);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .resume-meta {
          font-family: var(--mono); font-size: 10px;
          letter-spacing: 0.04em; color: var(--ink-3);
        }

        /* ── Selection pill ─────────────────────────────────── */
        .selection-pill {
          font-family: var(--mono); font-size: 10px;
          letter-spacing: 0.08em; text-transform: uppercase;
          padding: 3px 8px; border-radius: 2px;
          flex-shrink: 0;
        }
        .selection-pill--on {
          background: var(--accent-dim);
          color: var(--accent);
          border: 1px solid rgba(200,75,47,0.2);
        }
        .selection-pill--off {
          background: var(--paper-2);
          color: var(--ink-3);
          border: 1px solid var(--border);
        }

        /* ── Score footer ───────────────────────────────────── */
        .score-footer {
          display: flex; flex-direction: column; gap: 12px;
        }
        .score-row {
          display: flex; align-items: center;
          justify-content: space-between; gap: 16px;
        }
        .score-summary {
          font-family: var(--mono); font-size: 12px;
          letter-spacing: 0.04em; color: var(--ink-3);
        }

        /* ── Button ─────────────────────────────────────────── */
        .submit-btn {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 28px; border-radius: var(--radius);
          border: 1px solid var(--border);
          background: var(--paper-2); color: var(--ink-3);
          font-family: var(--sans); font-size: 15px; font-weight: 600;
          cursor: not-allowed; transition: all 0.2s; white-space: nowrap;
        }
        .submit-btn--ready {
          background: var(--ink); color: var(--paper);
          border-color: var(--ink); cursor: pointer;
        }
        .submit-btn--ready:hover {
          background: var(--accent); border-color: var(--accent);
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(200,75,47,0.25);
        }
        .submit-btn--ready:active { transform: translateY(0); }
        .submit-btn--loading { background: var(--ink-2); border-color: var(--ink-2); cursor: wait; }

        .btn-arrow { font-size: 18px; transition: transform 0.2s; }
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
        .spinner--dark {
          border-color: var(--border);
          border-top-color: var(--ink-2);
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Error ──────────────────────────────────────────── */
        .error-banner {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 16px;
          background: #fef2f2; border: 1px solid #fecaca;
          border-radius: var(--radius);
          font-size: 13px; color: #b91c1c;
        }
        .error-icon {
          width: 18px; height: 18px; border-radius: 50%;
          background: #ef4444; color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700; flex-shrink: 0;
        }

        /* ── Responsive ─────────────────────────────────────── */
        @media (max-width: 600px) {
          .layout { padding: 32px 16px 64px; gap: 20px; }
          .card-inner { padding: 24px 16px; }
          .wordmark { font-size: 34px; }
          .step-label { display: none; }
          .step-connector { min-width: 20px; }
          .score-row { flex-direction: column; align-items: stretch; }
          .submit-btn { justify-content: center; }
        }
      `}</style>
    </main>
  );
}
