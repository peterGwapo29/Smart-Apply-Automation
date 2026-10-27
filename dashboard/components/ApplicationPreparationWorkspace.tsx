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
  getApplicationExecutionWorkspace,
  authorizeApplicationExecution,
  verifyApplicationSubmission,
  recordAmbiguousSubmission,
  revalidateJobListing,
  AssistanceWorkspaceResponse,
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

  const [activeTab, setActiveTab] = useState<'materials' | 'questions' | 'resume' | 'readiness' | 'execution'>('materials');

  // Materials form state
  const [coverLetter, setCoverLetter] = useState('');
  const [introduction, setIntroduction] = useState('');

  // Questions input state
  const [newQuestion, setNewQuestion] = useState('');
  const [editingAnswers, setEditingAnswers] = useState<Record<number, string>>({});

  // Phase 10: Execution & Assistance State
  const [executionData, setExecutionData] = useState<AssistanceWorkspaceResponse | null>(null);
  const [loadingExecution, setLoadingExecution] = useState(false);
  const [revalidating, setRevalidating] = useState(false);
  const [authorizing, setAuthorizing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [userConfirmedAuth, setUserConfirmedAuth] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const loadExecutionWorkspace = async () => {
    try {
      setLoadingExecution(true);
      const res = await getApplicationExecutionWorkspace(applicationId);
      setExecutionData(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load execution workspace');
    } finally {
      setLoadingExecution(false);
    }
  };

  const handleRevalidateListing = async () => {
    if (!executionData?.job?.id) return;
    try {
      setRevalidating(true);
      setError(null);
      const res = await revalidateJobListing(executionData.job.id, true);
      setNotice(`Job availability revalidated: status is ${res.data.listing_status} (actionable: ${res.data.is_actionable ? 'Yes' : 'No'}).`);
      await loadExecutionWorkspace();
      await loadWorkspace();
      onReadinessChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revalidate job listing');
    } finally {
      setRevalidating(false);
    }
  };

  const handleAuthorizeExecution = async () => {
    try {
      setAuthorizing(true);
      setError(null);
      const res = await authorizeApplicationExecution(applicationId);
      setNotice('Candidate authorization recorded successfully. Execution is now authorized.');
      await loadExecutionWorkspace();
      await loadWorkspace();
      onReadinessChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to authorize execution');
    } finally {
      setAuthorizing(false);
    }
  };

  const handleVerifySubmission = async (
    level: 'platform_confirmed' | 'user_confirmed' | 'failed' | 'ambiguous',
    note?: string
  ) => {
    try {
      setVerifying(true);
      setError(null);
      const res = await verifyApplicationSubmission(applicationId, {
        verification_level: level,
        evidence_type: level === 'platform_confirmed' ? 'platform_success_page' : 'candidate_manual_confirmation',
        evidence_note: note || (level === 'platform_confirmed' ? 'Application confirmation page verified' : 'Candidate manually confirmed submission'),
      });
      setNotice(res.message);
      await loadExecutionWorkspace();
      await loadWorkspace();
      onReadinessChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify submission');
    } finally {
      setVerifying(false);
    }
  };

  const handleRecordAmbiguous = async () => {
    try {
      setVerifying(true);
      setError(null);
      const res = await recordAmbiguousSubmission(applicationId, 'Candidate reported ambiguous submission outcome. Auto-retry halted.');
      setNotice(res.message);
      await loadExecutionWorkspace();
      await loadWorkspace();
      onReadinessChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record ambiguous submission');
    } finally {
      setVerifying(false);
    }
  };

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

        <button
          onClick={() => {
            setActiveTab('execution');
            loadExecutionWorkspace();
          }}
          className={`px-4 py-2.5 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'execution'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
              : 'border-transparent text-slate-600 dark:text-[#CBD5E1] hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span>🚀 Execution & Assistance</span>
          {executionData?.can_execute && (
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          )}
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

      {/* Tab 5: Execution & Assistance (Phase 10) */}
      {activeTab === 'execution' && (
        <div className="space-y-6">
          {loadingExecution ? (
            <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500 animate-pulse">
              Loading execution workspace and revalidating checklist...
            </div>
          ) : !executionData ? (
            <div className="py-12 text-center text-xs text-rose-500">
              Could not load execution workspace. Please try refreshing the page.
            </div>
          ) : (
            <>
              {/* 1. Job Availability Status & Revalidation Header */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-[#293548] bg-slate-50/70 dark:bg-[#172033]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {executionData.job.title}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-[#94A3B8]">
                      at {executionData.job.company_name || 'Unknown Company'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500 dark:text-[#94A3B8]">Status:</span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                        executionData.job.is_actionable
                          ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-900 dark:bg-rose-950/70 dark:text-rose-300'
                      }`}
                    >
                      {executionData.job.is_actionable ? '● Active & Actionable' : `⛔ Inactive (${executionData.job.listing_status})`}
                    </span>
                    {executionData.job.last_verified_at && (
                      <span className="text-slate-400 dark:text-slate-500 text-[11px]">
                        Last verified: {new Date(executionData.job.last_verified_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleRevalidateListing}
                    disabled={revalidating}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-[#1E293B] border border-slate-300 dark:border-[#293548] hover:bg-slate-100 dark:hover:bg-[#293548] text-slate-700 dark:text-[#CBD5E1] transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <span>{revalidating ? '🔄 Checking...' : '🔄 Revalidate Availability'}</span>
                  </button>

                  <a
                    href={executionData.job.canonical_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-1"
                  >
                    Open Platform Job ↗
                  </a>
                </div>
              </div>

              {!executionData.job.is_actionable && (
                <div className="p-3.5 rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/40 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2.5">
                  <span className="text-base leading-none">⛔</span>
                  <div>
                    <div className="font-bold">Application Execution Blocked</div>
                    <div className="mt-0.5 leading-relaxed">
                      This job listing is no longer active (status: {executionData.job.listing_status}). Applications cannot be executed against closed, expired, or withdrawn job postings.
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Execution Readiness Checklist */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-[#CBD5E1] uppercase tracking-wider">
                    Execution Readiness Checklist
                  </h4>
                  <span className="text-xs text-slate-500 dark:text-[#94A3B8]">
                    {executionData.checklist.filter((i) => i.completed).length} / {executionData.checklist.length} satisfied
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {executionData.checklist.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                        item.completed
                          ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-200'
                          : 'border-amber-200 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/20 text-amber-950 dark:text-amber-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">
                          {item.completed ? '✓' : '○'}
                        </span>
                        <div className="space-y-0.5">
                          <div className="font-medium">{item.title}</div>
                          {item.detail && (
                            <div className="text-[11px] opacity-75">{item.detail}</div>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-white/60 dark:bg-black/30 shrink-0">
                        {item.completed ? 'Ready' : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. 1-Click Copy Assistance Kit */}
              <div className="space-y-3 border-t border-slate-200 dark:border-[#293548] pt-5">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-[#CBD5E1] uppercase tracking-wider">
                    1-Click Application Assistance Kit
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                    Copy verified application answers and tailored text directly to your clipboard for browser form filling.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  <button
                    onClick={() =>
                      copyToClipboard(executionData.materials.cover_letter || '', 'cover_letter')
                    }
                    disabled={!executionData.materials.cover_letter}
                    className="p-3 rounded-lg border border-slate-200 dark:border-[#293548] bg-white dark:bg-[#111827] hover:bg-slate-50 dark:hover:bg-[#1E293B] text-left transition-colors flex items-center justify-between cursor-pointer disabled:opacity-40"
                  >
                    <div>
                      <div className="font-semibold text-xs text-slate-900 dark:text-white">
                        Cover Letter
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-[#94A3B8]">
                        {executionData.materials.cover_letter ? 'Tailored & ready' : 'Not generated'}
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                      {copiedKey === 'cover_letter' ? 'Copied! ✓' : 'Copy'}
                    </span>
                  </button>

                  <button
                    onClick={() =>
                      copyToClipboard(executionData.materials.introduction || '', 'introduction')
                    }
                    disabled={!executionData.materials.introduction}
                    className="p-3 rounded-lg border border-slate-200 dark:border-[#293548] bg-white dark:bg-[#111827] hover:bg-slate-50 dark:hover:bg-[#1E293B] text-left transition-colors flex items-center justify-between cursor-pointer disabled:opacity-40"
                  >
                    <div>
                      <div className="font-semibold text-xs text-slate-900 dark:text-white">
                        Introduction / Summary
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-[#94A3B8]">
                        Short pitch for forms
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                      {copiedKey === 'introduction' ? 'Copied! ✓' : 'Copy'}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      const allAnswers = executionData.screening_answers
                        .map((a, i) => `Q${i + 1}: ${a.question}\nA: ${a.draft_answer || 'N/A'}`)
                        .join('\n\n');
                      copyToClipboard(allAnswers, 'all_answers');
                    }}
                    disabled={executionData.screening_answers.length === 0}
                    className="p-3 rounded-lg border border-slate-200 dark:border-[#293548] bg-white dark:bg-[#111827] hover:bg-slate-50 dark:hover:bg-[#1E293B] text-left transition-colors flex items-center justify-between cursor-pointer disabled:opacity-40"
                  >
                    <div>
                      <div className="font-semibold text-xs text-slate-900 dark:text-white">
                        Screening Answers
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-[#94A3B8]">
                        {executionData.screening_answers.length} verified answer(s)
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                      {copiedKey === 'all_answers' ? 'Copied! ✓' : 'Copy All'}
                    </span>
                  </button>
                </div>

                {/* Individual Screening Answer copy pills */}
                {executionData.screening_answers.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="text-[11px] font-semibold text-slate-600 dark:text-[#CBD5E1]">
                      Individual Question Answers:
                    </div>
                    <div className="space-y-1.5">
                      {executionData.screening_answers.map((ans, idx) => (
                        <div
                          key={ans.id}
                          className="p-2.5 rounded-lg border border-slate-200 dark:border-[#293548] bg-slate-50/50 dark:bg-[#172033]/40 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="truncate flex-1">
                            <span className="font-medium text-slate-900 dark:text-[#F3F4F6]">
                              Q{idx + 1}: {ans.question}
                            </span>
                            <div className="text-slate-500 dark:text-[#94A3B8] truncate mt-0.5">
                              {ans.draft_answer || '(No answer drafted)'}
                            </div>
                          </div>
                          <button
                            onClick={() => copyToClipboard(ans.draft_answer || '', `ans_${ans.id}`)}
                            disabled={!ans.draft_answer}
                            className="px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold shrink-0 cursor-pointer disabled:opacity-30"
                          >
                            {copiedKey === `ans_${ans.id}` ? 'Copied! ✓' : 'Copy'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Candidate Explicit Authorization Guard */}
              <div className="space-y-3 border-t border-slate-200 dark:border-[#293548] pt-5">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-[#CBD5E1] uppercase tracking-wider">
                    Candidate Execution Authorization
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                    Consequential application submissions require deliberate candidate consent.
                  </p>
                </div>

                {executionData.submission.authorized_at ? (
                  <div className="p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base leading-none">✓</span>
                      <div>
                        <span className="font-bold">Application Execution Authorized</span>
                        <div className="text-[11px] opacity-80 mt-0.5">
                          Authorized on {new Date(executionData.submission.authorized_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100">
                      Authorized
                    </span>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 space-y-3">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={userConfirmedAuth}
                        onChange={(e) => setUserConfirmedAuth(e.target.checked)}
                        className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs text-slate-800 dark:text-[#CBD5E1] leading-relaxed">
                        I have thoroughly reviewed the selected résumé, tailored cover letter, and screening question answers. I confirm that all details are accurate, and I explicitly authorize executing the application for <strong>{executionData.job.title}</strong> at <strong>{executionData.job.company_name}</strong>.
                      </span>
                    </label>

                    <div className="flex items-center justify-end">
                      <button
                        onClick={handleAuthorizeExecution}
                        disabled={authorizing || !userConfirmedAuth || !executionData.job.is_actionable}
                        className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
                      >
                        <span>{authorizing ? 'Recording Authorization...' : 'Grant Application Authorization'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 5. Consequential Submission Outcome Verification */}
              <div className="space-y-3 border-t border-slate-200 dark:border-[#293548] pt-5">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-[#CBD5E1] uppercase tracking-wider">
                    Submission Outcome & Verification
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                    Record submission evidence. Ambiguous submissions are held safely in confirmation required state without automatic retries.
                  </p>
                </div>

                {executionData.submission.submitted_at ? (
                  <div className="p-4 rounded-xl border border-cyan-300 dark:border-cyan-800 bg-cyan-50/60 dark:bg-cyan-950/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base leading-none">🎉</span>
                        <span className="font-bold text-sm text-cyan-950 dark:text-cyan-200">
                          Application Submitted
                        </span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-200 dark:bg-cyan-900 text-cyan-900 dark:text-cyan-100">
                        {executionData.submission.level || 'Submitted'}
                      </span>
                    </div>
                    <div className="text-xs text-cyan-900/80 dark:text-cyan-200/80 space-y-0.5">
                      <div>Submitted at: {new Date(executionData.submission.submitted_at).toLocaleString()}</div>
                      {executionData.submission.evidence_note && (
                        <div>Evidence: {executionData.submission.evidence_note}</div>
                      )}
                    </div>
                  </div>
                ) : executionData.status === 'confirmation_required' ? (
                  <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/40 space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="text-base leading-none">⚠️</span>
                      <div className="space-y-1">
                        <div className="font-bold text-xs text-amber-950 dark:text-amber-200">
                          Submission Outcome Ambiguous (Auto-Retry Paused)
                        </div>
                        <div className="text-xs text-amber-900 dark:text-amber-300 leading-relaxed">
                          A previous submission attempt encountered an uncertain outcome or browser timeout. To prevent duplicate job applications, automated retries are permanently paused until you confirm the actual state.
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        onClick={() => handleVerifySubmission('user_confirmed', 'Candidate manually confirmed application was successfully submitted')}
                        disabled={verifying}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                      >
                        Confirm It Was Submitted ✓
                      </button>
                      <button
                        onClick={() => handleVerifySubmission('failed', 'Submission failed or was canceled on platform')}
                        disabled={verifying}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                      >
                        Mark as Failed ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      onClick={() => handleVerifySubmission('platform_confirmed')}
                      disabled={verifying || !executionData.submission.authorized_at || !executionData.job.is_actionable}
                      className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
                    >
                      <span>✓ Platform Success Page Detected</span>
                    </button>

                    <button
                      onClick={() => handleVerifySubmission('user_confirmed')}
                      disabled={verifying || !executionData.submission.authorized_at || !executionData.job.is_actionable}
                      className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
                    >
                      <span>✓ Confirm Manual Submission</span>
                    </button>

                    <button
                      onClick={handleRecordAmbiguous}
                      disabled={verifying}
                      className="px-3.5 py-2 rounded-lg text-xs font-semibold border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      <span>⚠️ Report Ambiguous / Timeout</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
