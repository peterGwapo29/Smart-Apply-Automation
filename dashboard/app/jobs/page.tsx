'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  getJobListings,
  getDashboardSummary,
  deleteJobListing,
  calculateJobMatch,
  calculateAllJobMatches,
  bookmarkJob,
  unbookmarkJob,
  updateJobReview,
  JobListingRecord,
  JobListingsResponse,
  DashboardSummary,
  ReviewWorkflowStatus,
} from '@/lib/api';

type TabKey = 'all' | 'strong_matches' | 'review_queue' | 'bookmarked' | 'interested' | 'archived';

function JobListingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialTab = (searchParams.get('tab') as TabKey) || 'all';
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  const [data, setData] = useState<JobListingsResponse | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [techFilter, setTechFilter] = useState('');
  const [workArrangement, setWorkArrangement] = useState('');
  const [quickApplyFilter, setQuickApplyFilter] = useState('');
  const [reviewStatusFilter, setReviewStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [isChangedOnly, setIsChangedOnly] = useState(false);
  const [isStaleOnly, setIsStaleOnly] = useState(false);

  // Operation states
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [matchingJobId, setMatchingJobId] = useState<number | null>(null);
  const [batchMatching, setBatchMatching] = useState(false);
  const [batchNotice, setBatchNotice] = useState<string | null>(null);
  const [bookmarkingId, setBookmarkingId] = useState<number | null>(null);
  const [updatingReviewId, setUpdatingReviewId] = useState<number | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      const sum = await getDashboardSummary();
      setSummary(sum);
    } catch (err: unknown) {
      console.error('Failed to load dashboard summary:', err);
    }
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getJobListings({
        tab: activeTab === 'all' ? undefined : activeTab,
        search: searchTerm || undefined,
        technology: techFilter || undefined,
        work_arrangement: workArrangement || undefined,
        quick_apply_status: quickApplyFilter || undefined,
        review_status: reviewStatusFilter || undefined,
        sort_by: sortBy as any,
        is_changed: isChangedOnly ? true : undefined,
        is_stale: isStaleOnly ? true : undefined,
      });
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load job listings');
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchTerm, techFilter, workArrangement, quickApplyFilter, reviewStatusFilter, sortBy, isChangedOnly, isStaleOnly]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    if (tab === 'all') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    router.replace(`/jobs${params.toString() ? '?' + params.toString() : ''}`);
  };

  const handleToggleBookmark = async (job: JobListingRecord) => {
    try {
      setBookmarkingId(job.id);
      const currentlyBookmarked = Boolean(job.is_bookmarked);
      if (currentlyBookmarked) {
        await unbookmarkJob(job.id);
      } else {
        await bookmarkJob(job.id);
      }
      await fetchJobs();
      await fetchSummary();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update bookmark');
    } finally {
      setBookmarkingId(null);
    }
  };

  const handleUpdateReviewStatus = async (jobId: number, status: ReviewWorkflowStatus) => {
    try {
      setUpdatingReviewId(jobId);
      await updateJobReview(jobId, { review_status: status });
      await fetchJobs();
      await fetchSummary();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update review status');
    } finally {
      setUpdatingReviewId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this job listing?')) return;
    try {
      setDeletingId(id);
      await deleteJobListing(id);
      await fetchJobs();
      await fetchSummary();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete job listing');
    } finally {
      setDeletingId(null);
    }
  };

  const handleRunMatch = async (jobId: number) => {
    try {
      setMatchingJobId(jobId);
      await calculateJobMatch(jobId);
      await fetchJobs();
      await fetchSummary();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to calculate match score');
    } finally {
      setMatchingJobId(null);
    }
  };

  const handleBatchMatch = async () => {
    try {
      setBatchMatching(true);
      setBatchNotice(null);
      const res = await calculateAllJobMatches();
      setBatchNotice(`Evaluated ${res.total_matched} listings. Average profile match: ${res.average_score}%`);
      await fetchJobs();
      await fetchSummary();
      setTimeout(() => setBatchNotice(null), 5000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Batch matching failed');
    } finally {
      setBatchMatching(false);
    }
  };

  const getQuickApplyBadge = (status: JobListingRecord['quick_apply_status']) => {
    switch (status) {
      case 'available':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Quick Apply
          </span>
        );
      case 'unavailable':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            External
          </span>
        );
      case 'requires_review':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Check Flow
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Unknown
          </span>
        );
    }
  };

  const getMatchScoreBadge = (scoreNum: number, threshold: number = 70) => {
    if (scoreNum >= threshold) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
          ★ {scoreNum}% Match
        </span>
      );
    }
    if (scoreNum >= 50) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
          {scoreNum}% Match
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
        {scoreNum}% Match
      </span>
    );
  };

  const getEligibilityBadge = (status: string) => {
    switch (status) {
      case 'eligible':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
            ✓ Eligible
          </span>
        );
      case 'disqualified':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 dark:text-rose-400">
            ✕ Disqualified
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
            ⚠ Review Needed
          </span>
        );
    }
  };

  const getReviewStatusPill = (status?: string) => {
    switch (status) {
      case 'interested':
        return 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300';
      case 'saved':
        return 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300';
      case 'review_required':
        return 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300';
      case 'not_interested':
        return 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300';
      case 'archived':
        return 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400';
      case 'new':
      default:
        return 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300';
    }
  };

  const formatSalary = (job: JobListingRecord) => {
    if (job.salary_raw) return job.salary_raw;
    if (job.salary_min && job.salary_max) {
      return `${job.salary_currency || 'PHP'} ${Number(job.salary_min).toLocaleString()} - ${Number(job.salary_max).toLocaleString()}`;
    }
    if (job.salary_min) {
      return `${job.salary_currency || 'PHP'} ${Number(job.salary_min).toLocaleString()}+`;
    }
    return 'Not disclosed';
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Job Discovery & Application Queue
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Track JobStreet listings, evaluate verified candidate fit, and triage opportunities through your review queue.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleBatchMatch}
            disabled={batchMatching}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
          >
            {batchMatching ? 'Evaluating All...' : '⚡ Match All Jobs'}
          </button>
          <Link
            href="/jobs/import"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Import Listing
          </Link>
        </div>
      </div>

      {batchNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-sm flex items-center justify-between">
          <span>{batchNotice}</span>
        </div>
      )}

      {/* KPI Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div
            onClick={() => handleTabChange('all')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              activeTab === 'all'
                ? 'bg-blue-50/70 border-blue-400 dark:bg-blue-950/40 dark:border-blue-700 shadow-sm'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Listings</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">{summary.total}</div>
          </div>

          <div
            onClick={() => handleTabChange('strong_matches')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              activeTab === 'strong_matches'
                ? 'bg-emerald-50/70 border-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-700 shadow-sm'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Strong Fit (≥{summary.min_match_threshold}%)
            </div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {summary.strong_matches}
            </div>
          </div>

          <div
            onClick={() => handleTabChange('review_queue')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              activeTab === 'review_queue'
                ? 'bg-amber-50/70 border-amber-400 dark:bg-amber-950/40 dark:border-amber-700 shadow-sm'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Review Queue
            </div>
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {summary.review_required}
            </div>
          </div>

          <div
            onClick={() => handleTabChange('bookmarked')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              activeTab === 'bookmarked'
                ? 'bg-yellow-50/70 border-yellow-400 dark:bg-yellow-950/40 dark:border-yellow-700 shadow-sm'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="text-[11px] font-semibold text-yellow-600 dark:text-yellow-400 uppercase tracking-wider">
              ⭐ Bookmarked
            </div>
            <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
              {summary.bookmarked}
            </div>
          </div>

          <div
            onClick={() => handleTabChange('interested')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              activeTab === 'interested'
                ? 'bg-purple-50/70 border-purple-400 dark:bg-purple-950/40 dark:border-purple-700 shadow-sm'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              Interested / Reviewed
            </div>
            <div className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">
              {summary.reviewed}
            </div>
          </div>

          <div className="p-3.5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              Disqualified
            </div>
            <div className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">
              {summary.disqualified}
            </div>
          </div>
        </div>
      )}

      {/* Quick View Tabs Navigation */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 text-sm font-medium">
        <button
          onClick={() => handleTabChange('all')}
          className={`px-3 py-2 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'all'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          All Listings {summary ? `(${summary.total})` : ''}
        </button>
        <button
          onClick={() => handleTabChange('strong_matches')}
          className={`px-3 py-2 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'strong_matches'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Strong Matches {summary ? `(${summary.strong_matches})` : ''}
        </button>
        <button
          onClick={() => handleTabChange('review_queue')}
          className={`px-3 py-2 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'review_queue'
              ? 'border-amber-600 text-amber-600 dark:text-amber-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Review Queue {summary ? `(${summary.review_required})` : ''}
        </button>
        <button
          onClick={() => handleTabChange('bookmarked')}
          className={`px-3 py-2 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'bookmarked'
              ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Bookmarked {summary ? `(${summary.bookmarked})` : ''}
        </button>
        <button
          onClick={() => handleTabChange('interested')}
          className={`px-3 py-2 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'interested'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Interested
        </button>
        <button
          onClick={() => handleTabChange('archived')}
          className={`px-3 py-2 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'archived'
              ? 'border-slate-600 text-slate-900 dark:text-white font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Archived
        </button>
      </div>

      {/* Composable Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Text search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search title, company, location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 pl-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <svg
              className="w-4 h-4 absolute left-3 top-2.5 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Technology filter */}
          <div>
            <input
              type="text"
              placeholder="Technology (e.g. PHP, React, MySQL)..."
              value={techFilter}
              onChange={(e) => setTechFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Work arrangement */}
          <div>
            <select
              value={workArrangement}
              onChange={(e) => setWorkArrangement(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">All Arrangements</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="on_site">On-Site</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="newest">Sort: Newly Observed</option>
              <option value="highest_match">Sort: Highest Match Score</option>
              <option value="lowest_match">Sort: Lowest Match Score</option>
              <option value="salary_high">Sort: Highest Salary</option>
              <option value="recently_reviewed">Sort: Recently Reviewed</option>
              <option value="unreviewed_first">Sort: Unreviewed First</option>
              <option value="updated">Sort: Recently Updated</option>
            </select>
          </div>
        </div>

        {/* Secondary Filters row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <select
              value={reviewStatusFilter}
              onChange={(e) => setReviewStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs"
            >
              <option value="">All Review Decisions</option>
              <option value="new">Unreviewed / New</option>
              <option value="review_required">Needs Review</option>
              <option value="saved">Saved</option>
              <option value="interested">Interested</option>
              <option value="not_interested">Not Interested</option>
              <option value="archived">Archived</option>
            </select>

            <select
              value={quickApplyFilter}
              onChange={(e) => setQuickApplyFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs"
            >
              <option value="">All Application Types</option>
              <option value="available">Quick Apply Available</option>
              <option value="unavailable">External Application</option>
              <option value="requires_review">Requires Review</option>
            </select>

            <label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={isChangedOnly}
                onChange={(e) => setIsChangedOnly(e.target.checked)}
                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              <span>Changed since review</span>
            </label>

            <label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={isStaleOnly}
                onChange={(e) => setIsStaleOnly(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Stale match</span>
            </label>
          </div>

          {(searchTerm || techFilter || workArrangement || quickApplyFilter || reviewStatusFilter || isChangedOnly || isStaleOnly) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setTechFilter('');
                setWorkArrangement('');
                setQuickApplyFilter('');
                setReviewStatusFilter('');
                setIsChangedOnly(false);
                setIsStaleOnly(false);
              }}
              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-lg bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-sm">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && !data && (
        <div className="flex items-center justify-center p-12 text-slate-500 text-sm">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-3" />
          Loading job opportunities...
        </div>
      )}

      {/* Job Listings List */}
      {data && data.data.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            No matching job listings found
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-6">
            Try adjusting your search criteria or import new JobStreet listings.
          </p>
          <Link
            href="/jobs/import"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            Import Listing
          </Link>
        </div>
      ) : (
        <div className="space-y-3.5">
          {data?.data.map((job) => {
            const isBookmarked = Boolean(job.is_bookmarked);
            const effectiveStatus = (job.effective_review_status || 'new') as ReviewWorkflowStatus;

            return (
              <div
                key={job.id}
                className={`bg-white dark:bg-slate-900 rounded-xl border p-4 sm:p-5 shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  job.listing_changed_since_review
                    ? 'border-amber-300 dark:border-amber-800 bg-amber-50/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800'
                }`}
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Bookmark Star Button */}
                    <button
                      onClick={() => handleToggleBookmark(job)}
                      disabled={bookmarkingId === job.id}
                      title={isBookmarked ? 'Remove bookmark' : 'Bookmark job'}
                      className={`p-1 rounded-md transition-colors ${
                        isBookmarked
                          ? 'text-yellow-500 hover:text-yellow-600'
                          : 'text-slate-300 hover:text-yellow-500 dark:text-slate-600'
                      }`}
                    >
                      <svg
                        className="w-5 h-5 fill-current"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={isBookmarked ? '0' : '1.5'}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </button>

                    <Link
                      href={`/jobs/${job.id}`}
                      className="text-base font-semibold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate max-w-md"
                    >
                      {job.title}
                    </Link>

                    {/* Match Score Badge */}
                    {job.latest_match ? (
                      <div className="flex items-center gap-1.5">
                        {getMatchScoreBadge(Number(job.latest_match.overall_score), summary?.min_match_threshold ?? 70)}
                        {getEligibilityBadge(job.latest_match.eligibility_status)}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleRunMatch(job.id)}
                        disabled={matchingJobId === job.id}
                        className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 hover:bg-blue-100 transition-colors"
                      >
                        {matchingJobId === job.id ? 'Scoring...' : '+ Score Fit'}
                      </button>
                    )}

                    {/* Quick Apply badge */}
                    {getQuickApplyBadge(job.quick_apply_status)}

                    {/* Listing Changed Alert Badge */}
                    {job.listing_changed_since_review && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                        ⚠ Changed Since Review
                      </span>
                    )}

                    {/* Stale Match Alert Badge */}
                    {job.is_match_stale && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        🔄 Match Outdated
                      </span>
                    )}
                  </div>

                  {/* Metadata Row */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                    {job.company_name && (
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {job.company_name}
                      </span>
                    )}
                    {job.location && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {job.location}
                      </span>
                    )}
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                      {formatSalary(job)}
                    </span>
                    {job.employment_type && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {job.employment_type}
                      </span>
                    )}
                    <span className="text-slate-400">
                      Observed: {new Date(job.last_observed_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Required qualifications chips */}
                  {job.required_qualifications && job.required_qualifications.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {job.required_qualifications.slice(0, 5).map((q, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                        >
                          {q}
                        </span>
                      ))}
                      {job.required_qualifications.length > 5 && (
                        <span className="text-[11px] text-slate-400">
                          +{job.required_qualifications.length - 5} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Actions & Status Selector */}
                <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                  {/* Inline Review Status Selector */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold hidden sm:inline">
                      Review:
                    </span>
                    <select
                      value={effectiveStatus}
                      disabled={updatingReviewId === job.id}
                      onChange={(e) => handleUpdateReviewStatus(job.id, e.target.value as ReviewWorkflowStatus)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500 ${getReviewStatusPill(
                        effectiveStatus
                      )}`}
                    >
                      <option value="new">New / Unreviewed</option>
                      <option value="review_required">Needs Review</option>
                      <option value="saved">Saved</option>
                      <option value="interested">Interested</option>
                      <option value="not_interested">Not Interested</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>

                  <Link
                    href={`/jobs/${job.id}`}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    View Fit
                  </Link>

                  {job.canonical_url && (
                    <a
                      href={job.canonical_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      title="Open Source Link"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}

                  <button
                    onClick={() => handleDelete(job.id)}
                    disabled={deletingId === job.id}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition-colors disabled:opacity-50"
                    title="Delete Job"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

export default function JobListingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-12 text-slate-500 text-sm">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-3" />
          Loading dashboard...
        </div>
      }
    >
      <JobListingsContent />
    </Suspense>
  );
}
