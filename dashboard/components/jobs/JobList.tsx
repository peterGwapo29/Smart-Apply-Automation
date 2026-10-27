'use client';

import Link from 'next/link';
import { JobListingRecord, ReviewWorkflowStatus, JobListingsResponse } from '@/lib/api';
import JobCard from './JobCard';

interface JobListProps {
  data: JobListingsResponse | null;
  loading: boolean;
  error: string | null;
  bookmarkedIds: Set<number>;
  onToggleBookmark: (job: JobListingRecord) => void;
  bookmarkingId: number | null;
  onOpenQualification: (jobId: number) => void;
  onUpdateReviewStatus: (jobId: number, status: ReviewWorkflowStatus) => Promise<void>;
  onStartApplication: (jobId: number) => Promise<void>;
  onDeleteJob: (jobId: number) => Promise<void>;
  startingAppJobId: number | null;
  onResetFilters?: () => void;
}

export default function JobList({
  data,
  loading,
  error,
  bookmarkedIds,
  onToggleBookmark,
  bookmarkingId,
  onOpenQualification,
  onUpdateReviewStatus,
  onStartApplication,
  onDeleteJob,
  startingAppJobId,
  onResetFilters,
}: JobListProps) {
  if (error) {
    return (
      <div className="p-4 rounded-xl bg-rose-50 text-rose-900 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-xs flex items-center justify-between">
        <span>⚠ {error}</span>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-[#293548] p-5 shadow-2xs animate-pulse space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded bg-slate-200 dark:bg-[#1E293B]" />
              <div className="h-4 bg-slate-200 dark:bg-[#1E293B] rounded w-1/3" />
            </div>
            <div className="h-3 bg-slate-100 dark:bg-[#172033] rounded w-1/2" />
            <div className="flex items-center gap-2">
              <div className="h-5 bg-slate-100 dark:bg-[#1E293B] rounded w-20" />
              <div className="h-5 bg-slate-100 dark:bg-[#1E293B] rounded w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const jobs = data?.data || [];

  if (jobs.length === 0) {
    return (
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#293548] p-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-[#1E293B] text-slate-500 dark:text-[#94A3B8] flex items-center justify-center mx-auto text-xl border border-slate-200 dark:border-[#293548]">
          🔍
        </div>
        <div className="max-w-sm mx-auto space-y-1">
          <h3 className="font-bold text-sm text-slate-900 dark:text-[#F3F4F6]">
            No matching job listings found
          </h3>
          <p className="text-xs text-slate-600 dark:text-[#94A3B8] leading-relaxed">
            Try adjusting your search keywords, clear active filters, or import new job opportunities.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          {onResetFilters && (
            <button
              onClick={onResetFilters}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-[#293548] hover:bg-slate-100 dark:hover:bg-[#172033] text-xs font-semibold text-slate-700 dark:text-[#CBD5E1] transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          )}
          <Link
            href="/jobs/import"
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            + Import Listing
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {jobs.map((job) => (
        <JobCard
          key={job.id}
          job={job}
          isBookmarked={bookmarkedIds.has(job.id)}
          onToggleBookmark={onToggleBookmark}
          isBookmarking={bookmarkingId === job.id}
          onOpenQualification={onOpenQualification}
          onUpdateReviewStatus={onUpdateReviewStatus}
          onStartApplication={onStartApplication}
          onDeleteJob={onDeleteJob}
          isStartingApp={startingAppJobId === job.id}
        />
      ))}
    </div>
  );
}
