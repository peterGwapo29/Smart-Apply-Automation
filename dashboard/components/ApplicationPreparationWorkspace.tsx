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
      await selectResume(applicationId, resumeId);
      setNotice('Resume version attached to application.');
      await loadWorkspace();
      onReadinessChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select resume version');
    } finally {
      setBusy(false);
    }
  };

  const handleRecommendResume = async () => {
    try {
      setBusy(true);
      setError(null);
      const rec = await recommendResume(applicationId);
      setNotice(
        rec.recommended_resume
          ? `AI Recommendation: ${rec.recommended_resume.original_filename}. Reason: ${rec.rationale}`
          : 'No specific resume recommendation generated.'
      );
      await loadWorkspace();
      onReadinessChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate resume recommendation');
    } finally {
      setBusy(false);
    }
  };

  const handleAddQuestion = async (customQ?: string) => {
    const q = customQ || newQuestion;
    if (!q.trim()) return;

    try {
      setBusy(true);
      setError(null);
      await draftScreeningQuestions(applicationId, [q]);
      if (!customQ) setNewQuestion('');
      setNotice('Question analyzed and drafted using candidate evidence.');
      await loadWorkspace();
      onReadinessChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to draft screening answer');
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateAnswer = async (answerId: number) => {
    const customText = editingAnswers[answerId];
    if (customText === undefined) return;

    try {
      setBusy(true);
      setError(null);
      await updateScreeningQuestion(applicationId, answerId, { draft_answer: customText });
      setNotice('Screening answer updated and verified.');
      await loadWorkspace();
      onReadinessChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update screening answer');
    } finally {
      setBusy(false);
    }
  };

  const handleReevaluateReadiness = async () => {
    try {
      setBusy(true);
      setError(null);
      const res = await evaluateApplicationReadiness(applicationId);
      setNotice(
        res.readiness?.is_ready
          ? '✓ Application is 100% Ready for Submission!'
          : 'Readiness evaluated: Please review outstanding issues.'
      );
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
      <div className="p-8 text-center text-slate-600 dark:text-[#94A3B8] text-sm animate-pulse">
        Loading AI Application Preparation Workspace...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 rounded-lg bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-xs">
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
      <div className="bg-slate-50 dark:bg-[#172033] p-4 rounded-xl border border-slate-200 dark:border-[#293548] flex flex-wrap items-center justify-between gap-4 transition-colors">
        <div className="flex flex-wrap items-center gap-6 text-xs">
          <div>
            <span className="text-slate-600 dark:text-[#94A3B8] block font-medium">Verified Employment:</span>
            <span className="font-bold text-slate-900 dark:text-[#F3F4F6]">
              {data.evidence_summary.verified_professional_years} Years
            </span>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 ml-1 font-mono font-medium">
              (strict employment duration)
            </span>
          </div>
          <div>
            <span className="text-slate-600 dark:text-[#94A3B8] block font-medium">Verified Skills:</span>
            <span className="font-bold text-slate-900 dark:text-[#F3F4F6]">
              {data.evidence_summary.skills_count} verified
            </span>
          </div>
          <div>
            <span className="text-slate-600 dark:text-[#94A3B8] block font-medium">Practical Projects:</span>
            <span className="font-bold text-slate-900 dark:text-[#F3F4F6]">
              {data.evidence_summary.projects_count} portfolio items
            </span>
            <span className="text-[10px] text-slate-500 dark:text-[#94A3B8] ml-1">(isolated from tenure)</span>
          </div>
          <div>
            <span className="text-slate-600 dark:text-[#94A3B8] block font-medium">Notice Period:</span>
            <span className="font-bold text-slate-900 dark:text-[#F3F4F6]">
              {data.evidence_summary.notice_period_weeks} weeks
            </span>
          </div>
        </div>

        {/* Readiness Pill */}
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase flex items-center gap-1.5 ${
              isReady
                ? 'bg-emerald-100 text-emerald-950 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                : 'bg-amber-100 text-amber-950 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isReady ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {isReady ? 'Ready for Application' : 'Review Required'}
          </span>
          <button
            onClick={handleReevaluateReadiness}
            disabled={busy}
            title="Re-check all readiness criteria"
            className="px-2.5 py-1 text-xs border border-slate-300 dark:border-[#293548] rounded-lg hover:bg-slate-100 dark:hover:bg-[#1E293B] text-slate-700 dark:text-[#CBD5E1] transition-colors cursor-pointer"
          >
            ↻ Check Readiness
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 text-xs rounded-lg border border-emerald-300 dark:border-emerald-800 flex justify-between items-center">
          <span className="font-medium">✓ {notice}</span>
          <button onClick={() => setNotice(null)} className="text-emerald-700 dark:text-emerald-400 hover:underline font-bold">
            dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/50 text-rose-900 dark:text-rose-300 text-xs rounded-lg border border-rose-300 dark:border-rose-800">
          ⚠ {error}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-[#293548] text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('materials')}
          className={`px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'materials'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
              : 'border-transparent text-slate-600 dark:text-[#CBD5E1] hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Tailored Cover Letter & Intro
          {data.material?.is_candidate_edited && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-[#CBD5E1] border border-slate-200 dark:border-[#293548]">
              Edited
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('questions')}
          className={`px-4 py-2.5 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'questions'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
              : 'border-transparent text-slate-600 dark:text-[#CBD5E1] hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Screening Questions Assistant
          {data.answers?.some((a) => a.requires_review) && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('resume')}
          className={`px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'resume'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
              : 'border-transparent text-slate-600 dark:text-[#CBD5E1] hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Selected Résumé
        </button>

        <button
          onClick={() => setActiveTab('readiness')}
          className={`px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'readiness'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
              : 'border-transparent text-slate-600 dark:text-[#CBD5E1] hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Readiness Checks ({blockingIssues.length} blockers)
        </button>
      </div>

      {/* Tab 1: Materials */}
      {activeTab === 'materials' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-[#F3F4F6]">
                Application Cover Letter & Introduction
              </h4>
              <p className="text-xs text-slate-600 dark:text-[#94A3B8] mt-0.5">
                Tailored dynamically from strictly verified candidate employment, skills, and projects.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleGenerateMaterials}
                disabled={busy}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
              >
                {busy ? 'Generating...' : '✨ Generate Tailored Materials'}
              </button>
              <button
                onClick={handleSaveMaterials}
                disabled={busy}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 dark:border-[#293548] text-slate-800 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#1E293B] transition-colors"
              >
                Save Edits
              </button>
            </div>
          </div>

          {/* Cover Letter */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <label className="font-bold text-slate-800 dark:text-[#CBD5E1]">
                Tailored Cover Letter
              </label>
              <span className="text-slate-500 dark:text-[#94A3B8] font-mono">
                {coverLetter.trim() ? coverLetter.trim().split(/\s+/).length : 0} words
              </span>
            </div>
            <textarea
              rows={11}
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="Click 'Generate Tailored Materials' or type your custom cover letter here..."
              className="w-full text-xs font-mono p-3 rounded-lg border border-slate-300 dark:border-[#293548] bg-slate-50 dark:bg-[#0B1220] text-slate-900 dark:text-[#F3F4F6] placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none leading-relaxed"
            />
          </div>

          {/* Application Introduction */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <label className="font-bold text-slate-800 dark:text-[#CBD5E1]">
                Concise Application Introduction (for short form fields)
              </label>
              <span className="text-slate-500 dark:text-[#94A3B8] font-mono">
                {introduction.length} characters / {introduction.trim() ? introduction.trim().split(/\s+/).length : 0} words
              </span>
            </div>
            <textarea
              rows={3}
              value={introduction}
              onChange={(e) => setIntroduction(e.target.value)}
              placeholder="Concise 2-3 sentence executive intro for platform quick-apply forms..."
              className="w-full text-xs p-3 rounded-lg border border-slate-300 dark:border-[#293548] bg-slate-50 dark:bg-[#0B1220] text-slate-900 dark:text-[#F3F4F6] placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
      )}

      {/* Tab 2: Screening Questions Assistant */}
      {activeTab === 'questions' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-[#F3F4F6]">
                Screening Questions Assistant
              </h4>
              <p className="text-xs text-slate-600 dark:text-[#94A3B8] mt-0.5">
                Questions are grounded strictly in candidate records. Unknowns and legal commitments require manual review.
              </p>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="p-3 bg-slate-50 dark:bg-[#172033] rounded-lg border border-slate-200 dark:border-[#293548] text-xs space-y-2">
            <div className="font-bold text-slate-800 dark:text-[#CBD5E1]">
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
                  className="px-2.5 py-1 rounded bg-white dark:bg-[#1E293B] border border-slate-300 dark:border-[#293548] text-slate-800 dark:text-[#CBD5E1] hover:border-blue-500 transition-colors text-[11px] font-medium cursor-pointer"
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
              className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-[#293548] bg-slate-50 dark:bg-[#0B1220] text-slate-900 dark:text-[#F3F4F6] placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button
              onClick={() => handleAddQuestion()}
              disabled={busy || !newQuestion.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
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
                        ? 'border-amber-300 dark:border-amber-700 bg-amber-50/20 dark:bg-amber-950/20'
                        : 'border-slate-200 dark:border-[#293548] bg-white dark:bg-[#172033]'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="font-semibold text-slate-900 dark:text-[#F3F4F6] max-w-xl">
                        {ans.question}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-[#CBD5E1] border border-slate-200 dark:border-[#293548]">
                          {ans.category.replace('_', ' ')}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            ans.confidence === 'high'
                              ? 'bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800'
                              : ans.confidence === 'medium'
                              ? 'bg-blue-100 text-blue-950 border-blue-300 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800'
                              : 'bg-rose-100 text-rose-950 border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800'
                          }`}
                        >
                          {ans.confidence.toUpperCase()} CONFIDENCE
                        </span>
                        {ans.requires_review && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-950 border border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800">
                            ⚠ REVIEW REQUIRED
                          </span>
                        )}
                      </div>
                    </div>

                    {ans.review_reason && (
                      <div className="text-[11px] text-amber-950 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-900 p-2.5 rounded-lg">
                        Note: {ans.review_reason}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-[#CBD5E1]">
                        Draft Answer (Editable):
                      </label>
                      <input
                        type="text"
                        value={currentDraft}
                        onChange={(e) => setEditingAnswers({ ...editingAnswers, [ans.id]: e.target.value })}
                        className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-[#293548] bg-slate-50 dark:bg-[#0B1220] text-slate-900 dark:text-[#F3F4F6] outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex justify-between items-center pt-1">
                      <span className="text-[10px] text-slate-500 dark:text-[#94A3B8]">
                        {ans.is_candidate_edited ? '✓ Verified by candidate' : 'AI Draft grounded in evidence'}
                      </span>
                      <button
                        onClick={() => handleUpdateAnswer(ans.id)}
                        disabled={busy}
                        className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-900 dark:bg-[#1E293B] dark:hover:bg-[#293548] text-white text-[11px] font-semibold transition-colors border border-slate-700 dark:border-[#293548] cursor-pointer"
                      >
                        ✓ Confirm Answer
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-slate-500 dark:text-[#94A3B8] text-xs border border-dashed border-slate-300 dark:border-[#293548] rounded-xl bg-slate-50 dark:bg-[#172033]">
                No screening questions analyzed yet. Add questions above to evaluate evidence grounding.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Resume Version Selection */}
      {activeTab === 'resume' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-[#F3F4F6]">
                Selected Résumé Version
              </h4>
              <p className="text-xs text-slate-600 dark:text-[#94A3B8] mt-0.5">
                Choose which processed résumé version to associate with this job application.
              </p>
            </div>
            <button
              onClick={handleRecommendResume}
              disabled={busy}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              ✨ Recommend Best Version
            </button>
          </div>

          {/* Current Selection */}
          <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/30 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-blue-950 dark:text-blue-200">
                Active Selection:
              </span>
              <span className="font-mono text-blue-800 dark:text-blue-300 font-semibold">
                {data.material?.selected_resume?.original_filename || 'No resume selected'}
              </span>
            </div>
            {data.material?.resume_selection_rationale && (
              <p className="text-xs text-slate-700 dark:text-[#CBD5E1] leading-relaxed">
                Rationale: {data.material.resume_selection_rationale}
              </p>
            )}
          </div>

          {/* Switcher Table */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold text-slate-800 dark:text-[#CBD5E1]">
              Available Candidate Résumé Versions ({data.available_resumes?.length || 0}):
            </h5>
            <div className="space-y-2">
              {data.available_resumes?.map((res) => {
                const isCurrent = data.material?.selected_resume_id === res.id;
                return (
                  <div
                    key={res.id}
                    className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-colors ${
                      isCurrent
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 font-semibold'
                        : 'border-slate-200 dark:border-[#293548] bg-white dark:bg-[#172033]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base">{isCurrent ? '★' : '📄'}</span>
                      <div>
                        <div className="text-slate-900 dark:text-[#F3F4F6] font-medium">{res.original_filename}</div>
                        <div className="text-[10px] text-slate-500 dark:text-[#94A3B8]">
                          Uploaded {new Date(res.created_at).toLocaleDateString()}
                          {res.is_active && ' • Profile Default'}
                        </div>
                      </div>
                    </div>
                    <div>
                      {isCurrent ? (
                        <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-bold">
                          Selected
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSelectResume(res.id)}
                          disabled={busy}
                          className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-[#293548] hover:bg-slate-100 dark:hover:bg-[#1E293B] text-slate-700 dark:text-[#CBD5E1] text-[11px] font-medium transition-colors cursor-pointer"
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
            <h4 className="text-sm font-bold text-slate-900 dark:text-[#F3F4F6]">
              Application Readiness Evaluation
            </h4>
            <p className="text-xs text-slate-600 dark:text-[#94A3B8] mt-0.5">
              Deterministic verification engine ensuring zero errors before platform submission.
            </p>
          </div>

          {/* Status Alert */}
          <div
            className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
              isReady
                ? 'bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                : 'bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-200 border-amber-300 dark:border-amber-700'
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
              <h5 className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                Blocking Issues ({blockingIssues.length}):
              </h5>
              <div className="space-y-2">
                {blockingIssues.map((issue, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-rose-300 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/30 text-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-rose-600 font-bold">✕</span>
                      <span className="text-slate-900 dark:text-[#F3F4F6] font-medium">{issue.message}</span>
                    </div>
                    <span className="text-[10px] font-mono text-rose-700 bg-rose-100 dark:bg-rose-900/60 px-2 py-0.5 rounded border border-rose-300 dark:border-rose-800">
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
              <h5 className="text-xs font-bold text-slate-600 dark:text-[#94A3B8] uppercase tracking-wider">
                Non-Blocking Warnings ({warnings.length}):
              </h5>
              <div className="space-y-2">
                {warnings.map((warn, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-slate-200 dark:border-[#293548] bg-slate-50 dark:bg-[#172033] text-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-amber-500">ℹ</span>
                      <span className="text-slate-800 dark:text-[#CBD5E1]">{warn.message}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-600 dark:text-[#CBD5E1] bg-slate-100 dark:bg-[#1E293B] px-2 py-0.5 rounded border border-slate-200 dark:border-[#293548]">
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
