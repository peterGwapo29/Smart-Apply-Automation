'use client';

import { useEffect, useState } from 'react';
import {
  getApplicationWorkspace,
  generateApplicationMaterials,
  updateApplicationMaterials,
  selectResume,
  recommendResume,
  draftScreeningQuestions,
  updateScreeningQuestion,
  evaluateApplicationReadiness,
  ApplicationWorkspaceResponse,
  JobApplicationMaterialRecord,
  JobApplicationAnswerRecord,
  JobApplicationReadinessRecord,
} from '@/lib/api';

interface WorkspaceProps {
  applicationId: number;
  onReadinessChange?: () => void;
}

export default function ApplicationPreparationWorkspace({
  applicationId,
  onReadinessChange,
}: WorkspaceProps) {
  const [data, setData] = useState<ApplicationWorkspaceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'materials' | 'questions' | 'resume' | 'readiness'>('materials');

  // Materials form state
  const [coverLetter, setCoverLetter] = useState('');
  const [introduction, setIntroduction] = useState('');

  // Questions input state
  const [newQuestion, setNewQuestion] = useState('');
  const [editingAnswers, setEditingAnswers] = useState<Record<number, string>>({});

  const loadWorkspace = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getApplicationWorkspace(applicationId);
      setData(res);
      setCoverLetter(res.material?.cover_letter || '');
      setIntroduction(res.material?.introduction || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preparation workspace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (applicationId) {
      loadWorkspace();
    }
  }, [applicationId]);

  const handleGenerateMaterials = async () => {
    try {
      setBusy(true);
      setError(null);
      const res = await generateApplicationMaterials(applicationId);
      setCoverLetter(res.material.cover_letter || '');
      setIntroduction(res.material.introduction || '');
      setNotice('Materials successfully generated using verified candidate evidence.');
      await loadWorkspace();
      onReadinessChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate materials');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveMaterials = async () => {
    try {
      setBusy(true);
      setError(null);
      await updateApplicationMaterials(applicationId, {
        cover_letter: coverLetter,
        introduction: introduction,
      });
      setNotice('Application materials saved successfully.');
      await loadWorkspace();
      onReadinessChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save materials');
    } finally {
      setBusy(false);
    }
  };

  const handleSelectResume = async (resumeId: number) => {
    try {
      setBusy(true);
      setError(null);
      await selectResume(applicationId, resumeId, 'Candidate manual selection');
      setNotice('Resume version updated.');
      await loadWorkspace();
      onReadinessChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update resume');
    } finally {
      setBusy(false);
    }
  };

  const handleAddQuestion = async (customQ?: string) => {
    const q = customQ || newQuestion.trim();
    if (!q) return;
    try {
      setBusy(true);
      setError(null);
      await draftScreeningQuestions(applicationId, [q]);
      if (!customQ) setNewQuestion('');
      setNotice('Screening question drafted against verified candidate profile.');
      await loadWorkspace();
      onReadinessChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to draft question answer');
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateAnswer = async (questionId: number) => {
    const draft = editingAnswers[questionId];
    if (draft === undefined) return;
    try {
      setBusy(true);
      setError(null);
      await updateScreeningQuestion(applicationId, questionId, {
        draft_answer: draft,
        requires_review: false,
      });
      setNotice('Answer confirmed and saved.');
      await loadWorkspace();
      onReadinessChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save answer');
    } finally {
      setBusy(false);
    }
  };

  const handleReevaluateReadiness = async () => {
    try {
      setBusy(true);
      setError(null);
      await evaluateApplicationReadiness(applicationId);
      setNotice('Readiness criteria re-evaluated.');
      await loadWorkspace();
      onReadinessChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to evaluate readiness');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm animate-pulse">
        Loading AI Application Preparation Workspace...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 rounded-lg bg-rose-50 text-rose-700 text-xs">
        {error || 'Unable to load workspace data.'}
      </div>
    );
  }

  const isReady = Boolean(data.readiness?.is_ready);
  const blockingIssues = data.readiness?.blocking_issues || [];
  const warnings = data.readiness?.warnings || [];

  return (
    <div className="space-y-6">
      {/* Evidence Provenance Header Banner */}
      <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-6 text-xs">
          <div>
            <span className="text-slate-400 block font-medium">Verified Employment:</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {data.evidence_summary.verified_professional_years} Years
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 ml-1 font-mono">
              (strict employment duration)
            </span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Verified Skills:</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {data.evidence_summary.skills_count} verified
            </span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Practical Projects:</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {data.evidence_summary.projects_count} portfolio items
            </span>
            <span className="text-[10px] text-slate-400 ml-1">(isolated from tenure)</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Notice Period:</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {data.evidence_summary.notice_period_weeks} weeks
            </span>
          </div>
        </div>

        {/* Readiness Pill */}
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase flex items-center gap-1.5 ${
              isReady
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isReady ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {isReady ? 'Ready for Application' : 'Review Required'}
          </span>
          <button
            onClick={handleReevaluateReadiness}
            disabled={busy}
            title="Re-check all readiness criteria"
            className="px-2.5 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
          >
            ↻ Check Readiness
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs rounded-lg border border-emerald-200 dark:border-emerald-800 flex justify-between items-center">
          <span>✓ {notice}</span>
          <button onClick={() => setNotice(null)} className="text-emerald-600 hover:underline">
            dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-xs rounded-lg border border-rose-200 dark:border-rose-800">
          ⚠ {error}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('materials')}
          className={`px-4 py-2.5 border-b-2 transition-colors ${
            activeTab === 'materials'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          Tailored Cover Letter & Intro
          {data.material?.is_candidate_edited && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              Edited
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('questions')}
          className={`px-4 py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'questions'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          Screening Questions Assistant
          {data.answers?.some((a) => a.requires_review) && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('resume')}
          className={`px-4 py-2.5 border-b-2 transition-colors ${
            activeTab === 'resume'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          Résumé Version Selection
        </button>

        <button
          onClick={() => setActiveTab('readiness')}
          className={`px-4 py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'readiness'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          Readiness Checklist
          {blockingIssues.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
              {blockingIssues.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Materials */}
      {activeTab === 'materials' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Application Materials (Draft v{data.material?.version || 1})
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Tailored for {data.job.title} at {data.job.company_name}. Fully grounded in verified experience.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleGenerateMaterials}
                disabled={busy}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {data.material?.cover_letter ? '↻ Regenerate Materials' : '✨ Generate Tailored Materials'}
              </button>
              <button
                onClick={handleSaveMaterials}
                disabled={busy}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                💾 Save Edits
              </button>
            </div>
          </div>

          {/* Cover Letter */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Tailored Cover Letter
              </label>
              <span className="text-slate-400 font-mono">
                {coverLetter.trim() ? coverLetter.trim().split(/\s+/).length : 0} words
              </span>
            </div>
            <textarea
              rows={11}
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="Click 'Generate Tailored Materials' or type your custom cover letter here..."
              className="w-full text-xs font-mono p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
            />
          </div>

          {/* Application Introduction */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Concise Application Introduction (for short form fields)
              </label>
              <span className="text-slate-400 font-mono">
                {introduction.length} characters / {introduction.trim() ? introduction.trim().split(/\s+/).length : 0} words
              </span>
            </div>
            <textarea
              rows={3}
              value={introduction}
              onChange={(e) => setIntroduction(e.target.value)}
              placeholder="Concise 2-3 sentence executive intro for platform quick-apply forms..."
              className="w-full text-xs p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>
      )}

      {/* Tab 2: Screening Questions Assistant */}
      {activeTab === 'questions' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Screening Questions Assistant
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Questions are grounded strictly in candidate records. Unknowns and legal commitments require manual review.
              </p>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700 text-xs space-y-2">
            <div className="font-semibold text-slate-600 dark:text-slate-300">
              Quick Add Common Platform Screening Questions:
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                'How many years of professional experience do you have?',
                'What is your target monthly salary requirement?',
                'What is your required notice period to start?',
                'Are you legally authorized to work in the Philippines?',
              ].map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAddQuestion(preset)}
                  disabled={busy}
                  className="px-2.5 py-1 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-500 transition-colors text-[11px]"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Add custom question */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Enter custom screening question to analyze..."
              className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <button
              onClick={() => handleAddQuestion()}
              disabled={busy || !newQuestion.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
            >
              Analyze & Draft
            </button>
          </div>

          {/* List of Questions */}
          <div className="space-y-3">
            {data.answers && data.answers.length > 0 ? (
              data.answers.map((ans) => {
                const currentDraft = editingAnswers[ans.id] !== undefined ? editingAnswers[ans.id] : ans.draft_answer || '';
                return (
                  <div
                    key={ans.id}
                    className={`p-4 rounded-xl border text-xs space-y-3 transition-colors ${
                      ans.requires_review
                        ? 'border-amber-300 dark:border-amber-700/60 bg-amber-50/40 dark:bg-amber-950/20'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="font-semibold text-slate-900 dark:text-white max-w-xl">
                        {ans.question}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {ans.category.replace('_', ' ')}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            ans.confidence === 'high'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : ans.confidence === 'medium'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          {ans.confidence.toUpperCase()} CONFIDENCE
                        </span>
                        {ans.requires_review && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200">
                            ⚠ REVIEW REQUIRED
                          </span>
                        )}
                      </div>
                    </div>

                    {ans.review_reason && (
                      <div className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-100/50 dark:bg-amber-900/30 p-2 rounded">
                        Note: {ans.review_reason}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-slate-500">
                        Draft Answer (Editable):
                      </label>
                      <input
                        type="text"
                        value={currentDraft}
                        onChange={(e) => setEditingAnswers({ ...editingAnswers, [ans.id]: e.target.value })}
                        className="w-full text-xs p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="flex justify-between items-center pt-1">
                      <span className="text-[10px] text-slate-400">
                        {ans.is_candidate_edited ? '✓ Verified by candidate' : 'AI Draft grounded in evidence'}
                      </span>
                      <button
                        onClick={() => handleUpdateAnswer(ans.id)}
                        disabled={busy}
                        className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-[11px] font-semibold transition-colors"
                      >
                        ✓ Confirm Answer
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs border border-dashed rounded-xl">
                No screening questions analyzed yet. Add questions above to evaluate evidence grounding.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Resume Version Selection */}
      {activeTab === 'resume' && (
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Selected Résumé Version
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose which processed résumé version to associate with this job application.
            </p>
          </div>

          {/* Current Selection */}
          <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-indigo-900 dark:text-indigo-200">
                Active Selection:
              </span>
              <span className="font-mono text-indigo-700 dark:text-indigo-300">
                {data.material?.selected_resume?.original_filename || 'No resume selected'}
              </span>
            </div>
            {data.material?.resume_selection_rationale && (
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Rationale: {data.material.resume_selection_rationale}
              </p>
            )}
          </div>

          {/* Switcher Table */}
          <div className="space-y-3">
            <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Available Candidate Résumé Versions ({data.available_resumes?.length || 0}):
            </h5>
            <div className="space-y-2">
              {data.available_resumes?.map((res) => {
                const isCurrent = data.material?.selected_resume_id === res.id;
                return (
                  <div
                    key={res.id}
                    className={`p-3 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                      isCurrent
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 font-semibold'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base">{isCurrent ? '★' : '📄'}</span>
                      <div>
                        <div className="text-slate-900 dark:text-white">{res.original_filename}</div>
                        <div className="text-[10px] text-slate-400">
                          Uploaded {new Date(res.created_at).toLocaleDateString()}
                          {res.is_active && ' • Profile Default'}
                        </div>
                      </div>
                    </div>
                    <div>
                      {isCurrent ? (
                        <span className="px-2.5 py-1 rounded bg-indigo-600 text-white text-[11px] font-bold">
                          Selected
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSelectResume(res.id)}
                          disabled={busy}
                          className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] transition-colors"
                        >
                          Select for Application
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Readiness Checklist */}
      {activeTab === 'readiness' && (
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Application Readiness Evaluation
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Deterministic verification engine ensuring zero errors before platform submission.
            </p>
          </div>

          {/* Status Alert */}
          <div
            className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
              isReady
                ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                : 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 border-amber-300 dark:border-amber-700'
            }`}
          >
            <span className="text-lg">{isReady ? '✓' : '⚠'}</span>
            <div>
              <div className="font-bold text-sm">
                {isReady ? 'Application is Fully Prepared and Ready' : 'Review Required Before Readiness'}
              </div>
              <div className="mt-1 leading-relaxed">
                {isReady
                  ? 'All verification checks passed. Résumé version selected, tailored cover letter generated, and all screening questions confirmed.'
                  : `${blockingIssues.length} blocking issue(s) preventing application readiness. Please resolve the items below.`}
              </div>
            </div>
          </div>

          {/* Blocking issues list */}
          {blockingIssues.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                Blocking Issues ({blockingIssues.length}):
              </h5>
              <div className="space-y-2">
                {blockingIssues.map((issue, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20 text-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-rose-500 font-bold">✕</span>
                      <span className="text-slate-800 dark:text-slate-200">{issue.message}</span>
                    </div>
                    <span className="text-[10px] font-mono text-rose-500 bg-rose-100 dark:bg-rose-900/40 px-2 py-0.5 rounded">
                      {issue.code}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings list */}
          {warnings.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Non-Blocking Warnings ({warnings.length}):
              </h5>
              <div className="space-y-2">
                {warnings.map((warn, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-amber-500">ℹ</span>
                      <span className="text-slate-700 dark:text-slate-300">{warn.message}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                      {warn.code}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
