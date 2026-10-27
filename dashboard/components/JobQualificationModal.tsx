'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getJobQualification,
  recalculateJobQualification,
  JobQualificationDetail,
} from '@/lib/api';

interface JobQualificationModalProps {
  jobId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onRecalculated?: () => void;
}

export default function JobQualificationModal({
  jobId,
  isOpen,
  onClose,
  onRecalculated,
}: JobQualificationModalProps) {
  const [data, setData] = useState<JobQualificationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !jobId) {
      setData(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    getJobQualification(jobId)
      .then((res) => {
        if (isMounted) setData(res);
      })
      .catch((err) => {
        if (isMounted) setError(err instanceof Error ? err.message : 'Failed to load qualification details.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, jobId]);

  const handleRecalculate = async () => {
    if (!jobId) return;
    try {
      setRecalculating(true);
      const updated = await recalculateJobQualification(jobId);
      setData(updated);
      if (onRecalculated) onRecalculated();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to recalculate qualification.');
    } finally {
      setRecalculating(false);
    }
  };

  if (!isOpen || !jobId) return null;

  const getTierBadge = (tier?: string) => {
    switch (tier) {
      case 'top_priority':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-950 border border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800">⭐ Top Priority</span>;
      case 'high_priority':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-950 border border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800">🔥 High Priority</span>;
      case 'medium_priority':
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-950 border border-blue-300 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800">Medium Priority</span>;
      case 'low_priority':
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-300 dark:bg-[#1E293B] dark:text-[#CBD5E1] dark:border-[#293548]">Low Priority</span>;
      case 'requires_review':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-950 border border-orange-300 dark:bg-orange-950/70 dark:text-orange-300 dark:border-orange-800">⚠️ Needs Review</span>;
      case 'not_recommended':
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-950 border border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800">⛔ Not Recommended</span>;
      default:
        return null;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'qualified':
        return <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-600 text-white">Qualified</span>;
      case 'requires_review':
        return <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-amber-500 text-white">Requires Review</span>;
      case 'disqualified':
        return <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-rose-600 text-white">Disqualified</span>;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#293548] text-slate-900 dark:text-[#F3F4F6] rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative my-8 max-h-[90vh] flex flex-col transition-colors">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 dark:border-[#293548] pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase font-mono tracking-wider text-blue-600 dark:text-blue-400 font-bold">
                Phase 9 • AI Job Qualification & Prioritization
              </span>
              {data?.is_stale && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800">
                  Listing Updated (Stale Evaluation)
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-[#F3F4F6]">
              {data?.job_title || 'Evaluating Job Fit...'}
            </h2>
            <p className="text-xs text-slate-600 dark:text-[#94A3B8] mt-0.5">
              {data?.company_name} • Source: <span className="font-semibold capitalize text-slate-800 dark:text-[#CBD5E1]">{data?.source || 'JobStreet'}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-[#94A3B8] dark:hover:text-[#F3F4F6] hover:bg-slate-100 dark:hover:bg-[#172033] transition-colors"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 text-sm pr-1">
          {loading && (
            <div className="flex items-center justify-center py-12 text-slate-600 dark:text-[#94A3B8] text-sm">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-3" />
              Evaluating candidate qualifications and prioritization...
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 text-rose-900 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-sm">
              {error}
            </div>
          )}

          {data && (
            <>
              {/* Score Summary Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-[#172033] border border-slate-200 dark:border-[#293548]">
                <div className="text-center sm:border-r border-slate-200 dark:border-[#293548] pr-2">
                  <div className="text-xs text-slate-600 dark:text-[#94A3B8] mb-0.5 font-medium">Priority Score</div>
                  <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                    {Math.round(data.priority_score)}
                    <span className="text-xs font-normal text-slate-500 dark:text-[#94A3B8]">/100</span>
                  </div>
                  <div className="mt-1">{getTierBadge(data.priority_tier)}</div>
                </div>

                <div className="text-center sm:border-r border-slate-200 dark:border-[#293548] pr-2">
                  <div className="text-xs text-slate-600 dark:text-[#94A3B8] mb-0.5 font-medium">Match Score (Phase 4)</div>
                  <div className="text-2xl font-black text-slate-900 dark:text-[#F3F4F6]">
                    {Math.round(data.match_score)}
                    <span className="text-xs font-normal text-slate-500 dark:text-[#94A3B8]">/100</span>
                  </div>
                  <div className="mt-1">{getStatusBadge(data.qualification_status)}</div>
                </div>

                <div className="text-center">
                  <div className="text-xs text-slate-600 dark:text-[#94A3B8] mb-0.5 font-medium">Confidence</div>
                  <div className="text-lg font-bold capitalize text-slate-800 dark:text-[#CBD5E1] mt-1">
                    {data.evaluation_confidence} Confidence
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-[#94A3B8] mt-1 font-medium">
                    Offline Deterministic Logic
                  </div>
                </div>
              </div>

              {/* Priority Factors Breakdown */}
              {data.breakdown?.score_factors && (
                <div className="space-y-2 p-3.5 rounded-xl border border-slate-200 dark:border-[#293548] bg-white dark:bg-[#172033]">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-[#CBD5E1]">
                    Prioritization Score Factors
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                    <div className="p-2 rounded bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-[#293548]">
                      <div className="text-slate-500 dark:text-[#94A3B8] text-[10px] font-medium">Match Fit (40%)</div>
                      <div className="font-bold text-slate-900 dark:text-[#F3F4F6] mt-0.5">
                        {Math.round(data.breakdown.score_factors.match_score)}%
                      </div>
                    </div>
                    <div className="p-2 rounded bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-[#293548]">
                      <div className="text-slate-500 dark:text-[#94A3B8] text-[10px] font-medium">Mandatory (25%)</div>
                      <div className="font-bold text-slate-900 dark:text-[#F3F4F6] mt-0.5">
                        {Math.round(data.breakdown.score_factors.mandatory_coverage)}%
                      </div>
                    </div>
                    <div className="p-2 rounded bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-[#293548]">
                      <div className="text-slate-500 dark:text-[#94A3B8] text-[10px] font-medium">Preferences (15%)</div>
                      <div className="font-bold text-slate-900 dark:text-[#F3F4F6] mt-0.5">
                        {Math.round(data.breakdown.score_factors.preference_alignment)}%
                      </div>
                    </div>
                    <div className="p-2 rounded bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-[#293548]">
                      <div className="text-slate-500 dark:text-[#94A3B8] text-[10px] font-medium">Freshness (10%)</div>
                      <div className="font-bold text-slate-900 dark:text-[#F3F4F6] mt-0.5">
                        {Math.round(data.breakdown.score_factors.listing_freshness)}%
                      </div>
                    </div>
                    <div className="p-2 rounded bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-[#293548] col-span-2 sm:col-span-1">
                      <div className="text-slate-500 dark:text-[#94A3B8] text-[10px] font-medium">Readiness (10%)</div>
                      <div className="font-bold text-slate-900 dark:text-[#F3F4F6] mt-0.5">
                        {Math.round(data.breakdown.score_factors.preparation_readiness)}%
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Explainability Callout */}
              {data.breakdown?.explanation && (
                <div className="p-4 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider">
                    <span>💡 Recommendation Rationale</span>
                  </div>
                  <p className="text-sm leading-relaxed text-blue-950 dark:text-blue-100">
                    {data.breakdown.explanation}
                  </p>
                </div>
              )}

              {/* Blocking Issues Warning Banner */}
              {data.breakdown?.blocking_issues && data.breakdown.blocking_issues.length > 0 && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-900 text-rose-900 dark:text-rose-200 space-y-1">
                  <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    ⛔ Mandatory Disqualification Blockers
                  </div>
                  <ul className="list-disc list-inside text-xs space-y-1 pl-1">
                    {data.breakdown.blocking_issues.map((b, idx) => (
                      <li key={idx}>{b}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Review Warnings */}
              {data.breakdown?.warnings && data.breakdown.warnings.length > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-900 text-amber-950 dark:text-amber-200 space-y-1">
                  <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    ⚠️ Items Requiring Candidate Confirmation
                  </div>
                  <ul className="list-disc list-inside text-xs space-y-1 pl-1">
                    {data.breakdown.warnings.map((w, idx) => (
                      <li key={idx}>{w.reason}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Matched Evidence */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-[#CBD5E1]">
                  Verified Candidate Evidence Citations
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {data.breakdown?.matched_requirements?.map((req, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg border border-slate-200 dark:border-[#293548] bg-slate-50 dark:bg-[#172033] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                        <span className="text-slate-800 dark:text-[#CBD5E1]">{req.evidence_label}</span>
                      </div>
                      {req.evidence_id && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-[#1E293B] text-slate-700 dark:text-[#CBD5E1] border border-slate-300 dark:border-[#293548]">
                          {req.evidence_id}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Missing Requirements */}
              {data.breakdown?.missing_requirements && data.breakdown.missing_requirements.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-[#94A3B8]">
                    Missing / Preferred Requirements
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {data.breakdown.missing_requirements.map((miss, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 rounded-md text-xs bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-[#CBD5E1] border border-slate-300 dark:border-[#293548]"
                        title={miss.note}
                      >
                        {miss.name} ({miss.severity})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-[#293548] pt-4 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={handleRecalculate}
            disabled={recalculating || loading}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-[#1E293B] dark:hover:bg-[#293548] text-slate-800 dark:text-[#CBD5E1] transition-colors disabled:opacity-50 border border-slate-300 dark:border-[#293548] cursor-pointer"
          >
            {recalculating ? 'Recalculating...' : '🔄 Recalculate Evaluation'}
          </button>

          <div className="flex items-center gap-2">
            <Link
              href={`/jobs/${jobId}#application`}
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              Open Application Agent →
            </Link>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 dark:border-[#293548] text-slate-700 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#1E293B] transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
