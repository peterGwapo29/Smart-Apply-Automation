'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getJobListing,
  updateJobListing,
  deleteJobListing,
  calculateJobMatch,
  getJobMatch,
  bookmarkJob,
  unbookmarkJob,
  updateJobReview,
  JobListingRecord,
  JobMatchRecord,
  ReviewWorkflowStatus,
} from '@/lib/api';

function JobDetailContent() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id as string;
  const jobId = parseInt(rawId, 10);

  const [job, setJob] = useState<JobListingRecord | null>(null);
  const [match, setMatch] = useState<JobMatchRecord | null>(null);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Workflow states (Phase 5)
  const [workflowStatus, setWorkflowStatus] = useState<ReviewWorkflowStatus>('new');
  const [workflowNotes, setWorkflowNotes] = useState('');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [savingWorkflow, setSavingWorkflow] = useState(false);
  const [workflowNotice, setWorkflowNotice] = useState<string | null>(null);

  // Form states for inline editing
  const [title, setTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [location, setLocation] = useState('');
  const [salaryRaw, setSalaryRaw] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [quickApplyStatus, setQuickApplyStatus] = useState<JobListingRecord['quick_apply_status']>('unknown');
  const [reviewStatus, setReviewStatus] = useState<JobListingRecord['review_status']>('pending_review');

  useEffect(() => {
    async function load() {
      if (isNaN(jobId)) return;
      try {
        setLoading(true);
        setError(null);
        const data = await getJobListing(jobId);
        setJob(data);
        setTitle(data.title);
        setCompanyName(data.company_name || '');
        setLocation(data.location || '');
        setSalaryRaw(data.salary_raw || '');
        setEmploymentType(data.employment_type || 'Full-time');
        setQuickApplyStatus(data.quick_apply_status);
        setReviewStatus(data.review_status);

        // Sync workflow state
        if (data.workflow) {
          setWorkflowStatus(data.workflow.review_status);
          setWorkflowNotes(data.workflow.notes || '');
          setIsBookmarked(Boolean(data.workflow.is_bookmarked));
        } else {
          setWorkflowStatus((data.effective_review_status as ReviewWorkflowStatus) || 'new');
          setIsBookmarked(Boolean(data.is_bookmarked));
        }

        // Fetch or load latest match
        if (data.latest_match) {
          setMatch(data.latest_match);
        } else {
          try {
            const matchData = await getJobMatch(jobId);
            setMatch(matchData);
          } catch {
            // Non-critical match check
          }
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load job listing');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [jobId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(jobId)) return;
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const updated = await updateJobListing(jobId, {
        title: title.trim(),
        company_name: companyName.trim() || null,
        location: location.trim() || null,
        salary_raw: salaryRaw.trim() || null,
        employment_type: employmentType || null,
        quick_apply_status: quickApplyStatus,
        review_status: reviewStatus,
      });

      setJob(updated);
      setSuccessMessage('Job listing details successfully saved.');
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update job listing');
    } finally {
      setSaving(false);
    }
  };

  const handleRecalculateMatch = async () => {
    if (isNaN(jobId)) return;
    try {
      setMatchingLoading(true);
      const res = await calculateJobMatch(jobId);
      setMatch(res);
      setSuccessMessage('Match score recalculated against current profile and preferences.');
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to recalculate match score');
    } finally {
      setMatchingLoading(false);
    }
  };

  const handleToggleBookmark = async () => {
    if (isNaN(jobId) || !job) return;
    try {
      if (isBookmarked) {
        await unbookmarkJob(jobId);
        setIsBookmarked(false);
        setWorkflowNotice('Job removed from bookmarks.');
      } else {
        await bookmarkJob(jobId);
        setIsBookmarked(true);
        setWorkflowNotice('Job bookmarked.');
      }
      setTimeout(() => setWorkflowNotice(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update bookmark');
    }
  };

  const handleSaveWorkflowReview = async (overrideStatus?: ReviewWorkflowStatus) => {
    if (isNaN(jobId) || !job) return;
    const targetStatus = overrideStatus || workflowStatus;
    try {
      setSavingWorkflow(true);
      const res = await updateJobReview(jobId, {
        review_status: targetStatus,
        notes: workflowNotes.trim() || undefined,
      });
      setWorkflowStatus(res.workflow.review_status);
      setJob({
        ...job,
        workflow: res.workflow,
        listing_changed_since_review: false,
      });
      setWorkflowNotice(`Review status updated to "${res.workflow.review_status.replace('_', ' ')}".`);
      setTimeout(() => setWorkflowNotice(null), 3500);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update review status');
    } finally {
      setSavingWorkflow(false);
    }
  };

  const handleDelete = async () => {
    if (isNaN(jobId)) return;
    if (!confirm('Are you sure you want to permanently delete this job listing?')) return;
    try {
      await deleteJobListing(jobId);
      router.push('/jobs');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete job listing');
    }
  };

  if (loading) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-16 text-center text-sm text-slate-500">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading job listing details...
      </main>
    );
  }

  if (error && !job) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-16 text-center">
        <div className="p-4 mb-4 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-sm max-w-md mx-auto">
          {error}
        </div>
        <Link href="/jobs" className="text-sm font-semibold text-blue-600 hover:underline">
          Return to Job Listings
        </Link>
      </main>
    );
  }

  if (!job) return null;

  const scoreNum = match ? Number(match.overall_score) : 0;

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/jobs"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Job Listings
        </Link>

        <div className="flex items-center gap-2">
          {job.canonical_url && (
            <a
              href={job.canonical_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <span>View Source</span>
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
          <button
            onClick={handleDelete}
            className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Notifications */}
      {workflowNotice && (
        <div className="p-4 rounded-xl bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-sm">
          {workflowNotice}
        </div>
      )}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-sm">
          {successMessage}
        </div>
      )}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-sm">
          {error}
        </div>
      )}

      {/* Sticky Workflow Action Header (Phase 5) */}
      <div className="sticky top-4 z-20 bg-white dark:bg-slate-900 rounded-xl border border-blue-200 dark:border-blue-900/60 p-4 shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Bookmark Button */}
            <button
              onClick={handleToggleBookmark}
              title={isBookmarked ? 'Remove bookmark' : 'Bookmark this job'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                isBookmarked
                  ? 'bg-yellow-50 border-yellow-300 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-yellow-50 hover:text-yellow-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
              }`}
            >
              <svg
                className={`w-4 h-4 ${isBookmarked ? 'fill-current text-yellow-500' : 'text-slate-400'}`}
                viewBox="0 0 24 24"
                fill={isBookmarked ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <span>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
            </button>

            {/* Review Decision Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500">Triage:</span>
              <button
                onClick={() => handleSaveWorkflowReview('interested')}
                disabled={savingWorkflow}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  workflowStatus === 'interested'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                }`}
              >
                Interested
              </button>
              <button
                onClick={() => handleSaveWorkflowReview('saved')}
                disabled={savingWorkflow}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  workflowStatus === 'saved'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300'
                }`}
              >
                Save for Later
              </button>
              <button
                onClick={() => handleSaveWorkflowReview('review_required')}
                disabled={savingWorkflow}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  workflowStatus === 'review_required'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300'
                }`}
              >
                Needs Review
              </button>
              <button
                onClick={() => handleSaveWorkflowReview('not_interested')}
                disabled={savingWorkflow}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  workflowStatus === 'not_interested'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300'
                }`}
              >
                Pass / Not Interested
              </button>
              <button
                onClick={() => handleSaveWorkflowReview('archived')}
                disabled={savingWorkflow}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  workflowStatus === 'archived'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                Archive
              </button>
            </div>
          </div>

          {/* Stamped metadata */}
          <div className="text-[11px] text-slate-400 flex items-center gap-3">
            {job.workflow?.reviewed_at && (
              <span>Reviewed: {new Date(job.workflow.reviewed_at).toLocaleDateString()}</span>
            )}
            {job.workflow?.last_reviewed_match_score && (
              <span>Snapshot: {job.workflow.last_reviewed_match_score}%</span>
            )}
          </div>
        </div>

        {/* Notes input */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          <input
            type="text"
            placeholder="Add personal triage notes, recruiter contact details, or evaluation caveats..."
            value={workflowNotes}
            onChange={(e) => setWorkflowNotes(e.target.value)}
            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={() => handleSaveWorkflowReview()}
            disabled={savingWorkflow}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {savingWorkflow ? 'Saving...' : 'Save Notes'}
          </button>
        </div>
      </div>

      {/* Changed Listing Alert (Phase 5) */}
      {job.listing_changed_since_review && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <span className="text-lg">⚠</span>
            <div>
              <div className="font-bold">Employer Edited Listing Content Since Last Review</div>
              <div className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                The content hash changed since you reviewed this listing. Key requirements or responsibilities may have been updated.
              </div>
            </div>
          </div>
          <button
            onClick={() => handleSaveWorkflowReview()}
            disabled={savingWorkflow}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
          >
            Acknowledge & Update Review Snapshot
          </button>
        </div>
      )}

      {/* Stale Match Notice (Phase 5) */}
      {job.is_match_stale && (
        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <span className="text-lg">🔄</span>
            <div>
              <div className="font-bold">Match Score Is Outdated</div>
              <div className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                This fit analysis was calculated prior to recent changes to the job description or candidate profile.
              </div>
            </div>
          </div>
          <button
            onClick={handleRecalculateMatch}
            disabled={matchingLoading}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
          >
            {matchingLoading ? 'Recalculating...' : '⚡ Recalculate Fit Score'}
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200 dark:border-blue-800 uppercase tracking-wider">
                {job.source_platform}
              </span>
              {job.source_job_id && (
                <span className="text-xs text-slate-500 font-mono">
                  ID: #{job.source_job_id}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {job.title}
            </h1>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-1">
              {job.company_name || 'Unspecified Company'} • {job.location || 'Remote / Unspecified'}
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-1.5 text-xs text-slate-500">
            <div>First detected: {new Date(job.first_detected_at).toLocaleString()}</div>
            <div>Last observed: {new Date(job.last_observed_at).toLocaleString()}</div>
            <div className="font-mono text-[10px] text-slate-400">Hash: {job.content_hash.substring(0, 16)}...</div>
          </div>
        </div>
      </div>

      {/* PHASE 4: Match Analysis & Explainability Section */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Match Engine Analysis
              </h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                Hybrid Engine v{match?.scoring_version || '1.0.0'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Deterministic scoring across 5 factors combined with eligibility evaluation and local semantic evidence.
            </p>
          </div>

          <button
            onClick={handleRecalculateMatch}
            disabled={matchingLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 self-start sm:self-auto"
          >
            {matchingLoading ? 'Calculating...' : '⚡ Recalculate Fit'}
          </button>
        </div>

        {match ? (
          <div className="space-y-6">
            {/* Top Score Banner & Eligibility */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Overall Score Circle Card */}
              <div className="bg-slate-50 dark:bg-slate-850 p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center gap-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl ${
                  scoreNum >= 75
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                    : scoreNum >= 50
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}>
                  {scoreNum}%
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Overall Fit Score
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    {scoreNum >= 75 ? 'Strong Match' : scoreNum >= 50 ? 'Moderate Fit' : 'Low Alignment'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Computed {new Date(match.calculated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              {/* Eligibility Status Card */}
              <div className="md:col-span-2 bg-slate-50 dark:bg-slate-850 p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Eligibility & Disqualification Check
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      match.eligibility_status === 'eligible'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-400'
                        : match.eligibility_status === 'disqualified'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-400'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-400'
                    }`}>
                      {match.eligibility_status === 'eligible' && '✓ Fully Eligible'}
                      {match.eligibility_status === 'disqualified' && '✕ Disqualified'}
                      {match.eligibility_status === 'requires_review' && '⚠ Requires Review'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                    {match.eligibility_evaluations && Object.entries(match.eligibility_evaluations).map(([key, item]) => (
                      <div key={key} className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <div className="text-[10px] text-slate-400 uppercase font-bold">
                          {key.replace('_', ' ')}
                        </div>
                        <div className={`font-semibold mt-0.5 ${
                          item.status === 'met' ? 'text-emerald-600 dark:text-emerald-400' : item.status === 'unmet' ? 'text-rose-600' : 'text-amber-600'
                        }`}>
                          {item.status.replace('_', ' ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {match.disqualification_reasons && match.disqualification_reasons.length > 0 && (
                  <div className="text-xs text-rose-600 dark:text-rose-400 mt-2">
                    <strong>Disqualification:</strong> {match.disqualification_reasons.join(', ')}
                  </div>
                )}
              </div>
            </div>

            {/* 5 Component Subscore Progress Bars */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Factor Weight Breakdown (100 Point Scale)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {[
                  { label: 'Technical Skills', score: Number(match.technical_score), max: 40, color: 'bg-blue-600' },
                  { label: 'Experience & Seniority', score: Number(match.experience_score), max: 25, color: 'bg-indigo-600' },
                  { label: 'Job Responsibilities', score: Number(match.responsibilities_score), max: 15, color: 'bg-purple-600' },
                  { label: 'Work Arrangement', score: Number(match.work_arrangement_score), max: 10, color: 'bg-emerald-600' },
                  { label: 'Salary Preferences', score: Number(match.salary_score), max: 10, color: 'bg-teal-600' },
                ].map((item) => (
                  <div key={item.label} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate">{item.label}</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {item.score} / {item.max}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div
                        className={`${item.color} h-2 rounded-full transition-all`}
                        style={{ width: `${Math.min((item.score / item.max) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Matched Skills Matrix */}
            {match.matched_skills && (
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Technical Skill Matches & Gaps
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40">
                    <span className="font-bold text-emerald-800 dark:text-emerald-300 block mb-2">
                      ✓ Verified Exact Matches ({match.matched_skills.exact.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {match.matched_skills.exact.map((sk) => (
                        <span key={sk} className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-medium">
                          {sk}
                        </span>
                      ))}
                      {match.matched_skills.exact.length === 0 && (
                        <span className="text-slate-400 italic">No exact skill matches.</span>
                      )}
                    </div>

                    {match.matched_skills.related.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-emerald-200/60 dark:border-emerald-900/60">
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400 block mb-1.5">
                          ≈ Related Technologies Partial Credit (0.5 credit)
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {match.matched_skills.related.map((sk) => (
                            <span key={sk} className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-medium text-[11px]">
                              {sk}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-4 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40">
                    <span className="font-bold text-rose-800 dark:text-rose-300 block mb-2">
                      ✕ Missing Required Skills ({match.matched_skills.missing_required.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {match.matched_skills.missing_required.map((sk) => (
                        <span key={sk} className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200 font-medium">
                          {sk}
                        </span>
                      ))}
                      {match.matched_skills.missing_required.length === 0 && (
                        <span className="text-emerald-600 font-medium">All required skills satisfied!</span>
                      )}
                    </div>

                    {match.matched_skills.missing_preferred.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-rose-200/60 dark:border-rose-900/60">
                        <span className="font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">
                          Missing Preferred / Bonus Qualifications
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {match.matched_skills.missing_preferred.map((sk) => (
                            <span key={sk} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px]">
                              {sk}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Responsibility Evidence References */}
            {match.matched_responsibilities && match.matched_responsibilities.length > 0 && (
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Demonstrated Responsibility Evidence
                </h3>
                <div className="space-y-2">
                  {match.matched_responsibilities.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <span className={item.credit > 0 ? 'text-emerald-600 font-bold' : 'text-slate-400 font-bold'}>
                          {item.credit > 0 ? '✓' : '○'}
                        </span>
                        <span className="text-slate-800 dark:text-slate-200 font-medium">{item.duty}</span>
                      </div>
                      <span className={`px-2 py-1 rounded text-[11px] font-medium shrink-0 ${
                        item.credit > 0 ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                      }`}>
                        {item.evidence}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6 text-xs text-slate-400">
            No match score calculated yet. Click &quot;Recalculate Fit&quot; to evaluate this job.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Editable Properties & Review */}
        <div className="lg:col-span-1 space-y-6">
          <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
              Job Attributes
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Job Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Salary (Raw representation)
              </label>
              <input
                type="text"
                value={salaryRaw}
                onChange={(e) => setSalaryRaw(e.target.value)}
                placeholder="e.g. PHP 80,000 - 100,000"
                className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Employment Type
              </label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Quick Apply Status
              </label>
              <select
                value={quickApplyStatus}
                onChange={(e) => setQuickApplyStatus(e.target.value as typeof quickApplyStatus)}
                className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              >
                <option value="available">Quick Apply Available</option>
                <option value="unavailable">External Application</option>
                <option value="requires_review">Requires Review</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Review Status
              </label>
              <select
                value={reviewStatus}
                onChange={(e) => setReviewStatus(e.target.value as typeof reviewStatus)}
                className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="pending_review">Pending Review</option>
                <option value="confirmed">Confirmed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full mt-2 py-2 px-4 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>

          {/* Audit History Log */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
              Observation History ({job.histories?.length || 0})
            </h3>
            <div className="space-y-3">
              {job.histories && job.histories.length > 0 ? (
                job.histories.map((h) => (
                  <div key={h.id} className="text-xs border-l-2 border-blue-500 pl-3 py-1">
                    <div className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                      {h.event_type.replace('_', ' ')}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {new Date(h.created_at).toLocaleString()}
                    </div>
                    {h.changed_fields && (
                      <pre className="mt-1 p-2 rounded bg-slate-50 dark:bg-slate-950 text-[10px] text-slate-600 dark:text-slate-400 overflow-x-auto">
                        {JSON.stringify(h.changed_fields, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400">No previous changes logged.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Parsed Sections & Description */}
        <div className="lg:col-span-2 space-y-6">
          {/* Responsibilities */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>Key Responsibilities</span>
              <span className="text-xs font-normal text-slate-400">
                {job.responsibilities?.length || 0} parsed items
              </span>
            </h3>
            {job.responsibilities && job.responsibilities.length > 0 ? (
              <ul className="space-y-2">
                {job.responsibilities.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <span className="text-blue-500 font-bold mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400 italic">No structured responsibilities detected.</p>
            )}
          </div>

          {/* Required Qualifications */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>Required Qualifications</span>
              <span className="text-xs font-normal text-slate-400">
                {job.required_qualifications?.length || 0} parsed items
              </span>
            </h3>
            {job.required_qualifications && job.required_qualifications.length > 0 ? (
              <ul className="space-y-2">
                {job.required_qualifications.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <span className="text-emerald-500 font-bold mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400 italic">No structured requirements detected.</p>
            )}
          </div>

          {/* Preferred Qualifications */}
          {job.preferred_qualifications && job.preferred_qualifications.length > 0 && (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
                Preferred Qualifications
              </h3>
              <ul className="space-y-2">
                {job.preferred_qualifications.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <span className="text-purple-500 font-bold mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Raw Full Description */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
              Raw Extracted Description
            </h3>
            <div className="text-xs font-mono text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-4 rounded-lg whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed border border-slate-200 dark:border-slate-800">
              {job.description || 'No raw description recorded.'}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function JobDetailPage() {
  return (
    <Suspense fallback={
      <div className="max-w-5xl mx-auto px-4 py-16 text-center text-sm text-slate-500">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading job listing details...
      </div>
    }>
      <JobDetailContent />
    </Suspense>
  );
}
