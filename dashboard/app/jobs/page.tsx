'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  getJobListings,
  getDashboardSummary,
  deleteJobListing,
  calculateAllJobMatches,
  bookmarkJob,
  unbookmarkJob,
  updateJobReview,
  createApplication,
  JobListingRecord,
  JobListingsResponse,
  DashboardSummary,
  ReviewWorkflowStatus,
} from '@/lib/api';

import JobDiscoveryBar from '@/components/jobs/JobDiscoveryBar';
import DiscoverySettingsDrawer from '@/components/jobs/DiscoverySettingsDrawer';
import JobMetricsBar, { TabKey } from '@/components/jobs/JobMetricsBar';
import JobFilterToolbar from '@/components/jobs/JobFilterToolbar';
import JobList from '@/components/jobs/JobList';
import JobQualificationModal from '@/components/JobQualificationModal';

function JobListingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialTab = (searchParams.get('tab') as TabKey) || 'all';
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  const [data, setData] = useState<JobListingsResponse | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [techFilter, setTechFilter] = useState('');
  const [workArrangement, setWorkArrangement] = useState('');
  const [quickApplyFilter, setQuickApplyFilter] = useState('');
  const [reviewStatusFilter, setReviewStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [isChangedOnly, setIsChangedOnly] = useState(false);
  const [isStaleOnly, setIsStaleOnly] = useState(false);

  // Operation states
  const [batchMatching, setBatchMatching] = useState(false);
  const [batchNotice, setBatchNotice] = useState<string | null>(null);
  const [bookmarkingId, setBookmarkingId] = useState<number | null>(null);
  const [startingAppJobId, setStartingAppJobId] = useState<number | null>(null);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [selectedQualJobId, setSelectedQualJobId] = useState<number | null>(null);
  const [showQualModal, setShowQualModal] = useState(false);

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
  }, [
    activeTab,
    searchTerm,
    techFilter,
    workArrangement,
    quickApplyFilter,
    reviewStatusFilter,
    sortBy,
    isChangedOnly,
    isStaleOnly,
  ]);

  useEffect(() => {
    fetchJobs();
    fetchSummary();
  }, [fetchJobs, fetchSummary]);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'all') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    router.replace(`/jobs?${params.toString()}`);
  };

  const handleToggleBookmark = async (job: JobListingRecord) => {
    try {
      setBookmarkingId(job.id);
      const isCurrentlyBookmarked = Boolean(job.is_bookmarked ?? job.workflow?.is_bookmarked);
      if (isCurrentlyBookmarked) {
        await unbookmarkJob(job.id);
      } else {
        await bookmarkJob(job.id);
      }
      await fetchJobs();
      await fetchSummary();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to toggle bookmark');
    } finally {
      setBookmarkingId(null);
    }
  };

  const handleUpdateReviewStatus = async (jobId: number, status: ReviewWorkflowStatus) => {
    try {
      await updateJobReview(jobId, { review_status: status });
      await fetchJobs();
      await fetchSummary();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update review status');
    }
  };

  const handleStartApplication = async (jobId: number) => {
    try {
      setStartingAppJobId(jobId);
      const app = await createApplication(jobId);
      router.push(`/jobs/${jobId}/apply?app_id=${app.application.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to initialize application workspace');
    } finally {
      setStartingAppJobId(null);
    }
  };

  const handleDelete = async (jobId: number) => {
    if (!confirm('Are you sure you want to delete this job listing?')) return;
    try {
      await deleteJobListing(jobId);
      await fetchJobs();
      await fetchSummary();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete job');
    }
  };

  const handleBatchMatch = async () => {
    try {
      setBatchMatching(true);
      setBatchNotice(null);
      const res = await calculateAllJobMatches();
      setBatchNotice(`Evaluated ${res.total_matched} listings. Average fit: ${Math.round(Number(res.average_score))}%`);
      await fetchJobs();
      await fetchSummary();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Batch matching calculation failed');
    } finally {
      setBatchMatching(false);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setTechFilter('');
    setWorkArrangement('');
    setQuickApplyFilter('');
    setReviewStatusFilter('');
    setSortBy('newest');
    setIsChangedOnly(false);
    setIsStaleOnly(false);
  };

  const bookmarkedIds = new Set(
    (data?.data || []).filter((j) => Boolean(j.is_bookmarked ?? j.workflow?.is_bookmarked)).map((j) => j.id)
  );

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'all', label: 'All Jobs', count: summary?.total },
    { key: 'strong_matches', label: 'Strong Fit', count: summary?.strong_matches },
    { key: 'review_queue', label: 'Review Queue', count: summary?.review_required },
    { key: 'bookmarked', label: 'Bookmarked', count: summary?.bookmarked },
    { key: 'interested', label: 'Interested' },
    { key: 'archived', label: 'Archived' },
  ];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Page Heading & Top Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-[#F3F4F6]">
            Job Discovery
          </h1>
          <p className="text-xs text-slate-600 dark:text-[#94A3B8] mt-0.5">
            Evaluate candidate fit, prioritize high-value opportunities, and automate application preparation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleBatchMatch}
            disabled={batchMatching}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-[#293548] bg-white dark:bg-[#111827] hover:bg-slate-100 dark:hover:bg-[#172033] text-slate-800 dark:text-[#CBD5E1] text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            {batchMatching ? 'Evaluating All...' : '⚡ Match All Jobs'}
          </button>
          <Link
            href="/jobs/import"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors"
          >
            <span>+</span>
            <span>Import Listing</span>
          </Link>
        </div>
      </div>

      {/* Batch Notice Alert */}
      {batchNotice && (
        <div className="px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs flex items-center justify-between animate-in fade-in">
          <span className="font-medium">✓ {batchNotice}</span>
          <button onClick={() => setBatchNotice(null)} className="text-[11px] underline font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Compact Inline Discovery Bar */}
      <JobDiscoveryBar
        onDiscoveryComplete={() => {
          fetchJobs();
          fetchSummary();
        }}
        onOpenSettings={() => setShowSettingsDrawer(true)}
      />

      {/* Single-Row Summary Metrics Bar */}
      <JobMetricsBar
        summary={summary}
        activeTab={activeTab}
        onTabSelect={handleTabChange}
      />

      {/* Minimalist Tabs Navigation */}
      <div className="border-b border-slate-200 dark:border-[#293548] flex items-center gap-1 sm:gap-3 overflow-x-auto text-xs font-semibold">
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`pb-2.5 pt-1 px-1 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                  : 'border-transparent text-slate-600 dark:text-[#CBD5E1] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isSelected
                      ? 'bg-blue-100 text-blue-900 dark:bg-blue-950/70 dark:text-blue-300'
                      : 'bg-slate-100 text-slate-700 dark:bg-[#1E293B] dark:text-[#CBD5E1] border border-slate-200 dark:border-[#293548]'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Consolidated Search & Filters Toolbar */}
      <JobFilterToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        techFilter={techFilter}
        onTechChange={setTechFilter}
        workArrangement={workArrangement}
        onArrangementChange={setWorkArrangement}
        sortBy={sortBy}
        onSortChange={setSortBy}
        reviewStatusFilter={reviewStatusFilter}
        onReviewStatusChange={setReviewStatusFilter}
        quickApplyFilter={quickApplyFilter}
        onQuickApplyChange={setQuickApplyFilter}
        isChangedOnly={isChangedOnly}
        onChangedOnlyToggle={setIsChangedOnly}
        isStaleOnly={isStaleOnly}
        onStaleOnlyToggle={setIsStaleOnly}
        onResetFilters={handleResetFilters}
      />

      {/* Main Job List */}
      <JobList
        data={data}
        loading={loading}
        error={error}
        bookmarkedIds={bookmarkedIds}
        onToggleBookmark={handleToggleBookmark}
        bookmarkingId={bookmarkingId}
        onOpenQualification={(jobId) => {
          setSelectedQualJobId(jobId);
          setShowQualModal(true);
        }}
        onUpdateReviewStatus={handleUpdateReviewStatus}
        onStartApplication={handleStartApplication}
        onDeleteJob={handleDelete}
        startingAppJobId={startingAppJobId}
        onResetFilters={handleResetFilters}
      />

      {/* Slide-out Discovery Settings & History Drawer */}
      <DiscoverySettingsDrawer
        isOpen={showSettingsDrawer}
        onClose={() => setShowSettingsDrawer(false)}
      />

      {/* Job Qualification & Prioritization Modal (Phase 9) */}
      <JobQualificationModal
        jobId={selectedQualJobId}
        isOpen={showQualModal}
        onClose={() => {
          setShowQualModal(false);
          setSelectedQualJobId(null);
        }}
        onRecalculated={() => {
          fetchJobs();
          fetchSummary();
        }}
      />
    </main>
  );
}

export default function JobListingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-12 text-slate-500 text-xs">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
          Loading Job Discovery Dashboard...
        </div>
      }
    >
      <JobListingsContent />
    </Suspense>
  );
}
