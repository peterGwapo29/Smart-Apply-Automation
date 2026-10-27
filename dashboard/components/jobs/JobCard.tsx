'use client';

import Link from 'next/link';
import { JobListingRecord, ReviewWorkflowStatus, ApplicationStatus } from '@/lib/api';
import JobActionsMenu from './JobActionsMenu';

interface JobCardProps {
  job: JobListingRecord;
  isBookmarked: boolean;
  onToggleBookmark: (job: JobListingRecord) => void;
  isBookmarking?: boolean;
  onOpenQualification: (jobId: number) => void;
  onUpdateReviewStatus: (jobId: number, status: ReviewWorkflowStatus) => Promise<void>;
  onStartApplication: (jobId: number) => Promise<void>;
  onDeleteJob: (jobId: number) => Promise<void>;
  isStartingApp?: boolean;
}

export default function JobCard({
  job,
  isBookmarked,
  onToggleBookmark,
  isBookmarking,
  onOpenQualification,
  onUpdateReviewStatus,
  onStartApplication,
  onDeleteJob,
  isStartingApp,
}: JobCardProps) {
  const match = job.latest_match;
  const matchScore = match ? Math.round(Number(match.overall_score)) : null;
  const priorityScore = match?.priority_score !== undefined && match?.priority_score !== null ? Math.round(Number(match.priority_score)) : null;

  // Formatted Salary
  const formatSalary = () => {
    if (job.salary_raw) return job.salary_raw;
    if (job.salary_min && job.salary_max) {
      return `${job.salary_currency || 'PHP'} ${Number(job.salary_min).toLocaleString()} - ${Number(job.salary_max).toLocaleString()}`;
    }
    if (job.salary_min) {
      return `${job.salary_currency || 'PHP'} ${Number(job.salary_min).toLocaleString()}+`;
    }
    return null;
  };

  const salaryText = formatSalary();

  // Priority Tier Badge
  const renderPriorityBadge = () => {
    if (!match?.priority_tier) return null;
    switch (match.priority_tier) {
      case 'top_priority':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-950 border border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800">
            ⭐ Top Priority {priorityScore !== null ? `(${priorityScore})` : ''}
          </span>
        );
      case 'high_priority':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-100 text-emerald-950 border border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800">
            🔥 High Priority {priorityScore !== null ? `(${priorityScore})` : ''}
          </span>
        );
      case 'medium_priority':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-300 dark:bg-[#1E293B] dark:text-[#CBD5E1] dark:border-[#293548]">
            Medium Priority
          </span>
        );
      case 'requires_review':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-orange-100 text-orange-950 border border-orange-300 dark:bg-orange-950/70 dark:text-orange-300 dark:border-orange-800">
            ⚠️ Review Needed
          </span>
        );
      case 'not_recommended':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-100 text-rose-950 border border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800">
            ⛔ Not Recommended
          </span>
        );
      default:
        return null;
    }
  };

  // Listing Availability / Expiration Badge (Phase 10)
  const renderListingStatusBadge = () => {
    if (!job.listing_status || job.listing_status === 'active') return null;
    const statusLabels: Record<string, string> = {
      expired: 'Expired',
      closed: 'Closed',
      withdrawn: 'Withdrawn',
      unavailable: 'Unavailable',
      unknown: 'Status Unknown',
    };
    const label = statusLabels[job.listing_status] || job.listing_status;
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-950 border border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800">
        ⛔ {label}
      </span>
    );
  };

  // Application Lifecycle Badge
  const renderAppBadge = (status?: ApplicationStatus) => {
    if (!status) return null;
    let label = `App: ${status.replace('_', ' ')}`;
    let badgeStyle = 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-[#1E293B] dark:text-[#CBD5E1] dark:border-[#293548]';
    if (status === 'ready') {
      label = '✓ App Ready';
      badgeStyle = 'bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800';
    } else if (status === 'preparing') {
      badgeStyle = 'bg-blue-100 text-blue-950 border-blue-300 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800 animate-pulse';
    } else if (status === 'needs_review') {
      badgeStyle = 'bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800';
    } else if (status === 'submitted') {
      label = '🎉 Submitted';
      badgeStyle = 'bg-cyan-100 text-cyan-950 border-cyan-300 dark:bg-cyan-950/70 dark:text-cyan-300 dark:border-cyan-800';
    }
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${badgeStyle}`}>
        {label}
      </span>
    );
  };

  const skills = (job.skills as string[]) || [];
  const visibleSkills = skills.slice(0, 3);
  const remainingSkillsCount = skills.length - visibleSkills.length;

  return (
    <div
      className={`bg-white dark:bg-[#111827] rounded-xl border p-4 transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:shadow-xs ${
        job.listing_changed_since_review
          ? 'border-amber-300 dark:border-amber-700 bg-amber-50/15 dark:bg-amber-950/15'
          : 'border-slate-200 dark:border-[#293548] hover:border-slate-300 dark:hover:border-slate-600'
      }`}
    >
      {/* Left Main Content */}
      <div className="space-y-1.5 flex-1 min-w-0">
        {/* Title & Star Line */}
        <div className="flex items-start sm:items-center gap-2">
          <button
            onClick={() => onToggleBookmark(job)}
            disabled={isBookmarking}
            className={`p-0.5 transition-colors shrink-0 text-base leading-none cursor-pointer ${
              isBookmarked ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500 dark:text-slate-500'
            }`}
            title={isBookmarked ? 'Remove bookmark' : 'Bookmark job'}
            aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark job'}
          >
            {isBookmarked ? '⭐' : '☆'}
          </button>

          <Link
            href={`/jobs/${job.id}`}
            className="font-bold text-sm text-slate-900 dark:text-[#F3F4F6] hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate max-w-xl"
          >
            {job.title}
          </Link>

          {/* Source pill */}
          <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold text-slate-600 dark:text-[#94A3B8] uppercase tracking-wider bg-slate-100 dark:bg-[#1E293B] border border-slate-200 dark:border-[#293548] shrink-0">
            {job.source_platform || 'JobStreet'}
          </span>
        </div>

        {/* Company & Metadata Line */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-[#CBD5E1]">
          {job.company_name && (
            <span className="font-semibold text-slate-800 dark:text-[#F3F4F6]">
              {job.company_name}
            </span>
          )}

          {job.location && (
            <span className="flex items-center gap-1 text-slate-600 dark:text-[#CBD5E1]">
              <span>📍</span>
              <span>{job.location}</span>
            </span>
          )}

          {job.work_arrangement && (
            <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-[#CBD5E1] border border-slate-200 dark:border-[#293548] capitalize">
              {job.work_arrangement.replace('_', ' ')}
            </span>
          )}

          {salaryText && (
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
              {salaryText}
            </span>
          )}

          <span className="text-[11px] text-slate-500 dark:text-[#94A3B8]">
            Observed: {new Date(job.last_observed_at).toLocaleDateString()}
          </span>
        </div>

        {/* Semantic Badges & Skills Line */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {/* Match Score Badge */}
          {matchScore !== null ? (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                matchScore >= 75
                  ? 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700'
                  : 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-[#1E293B] dark:text-[#CBD5E1] dark:border-[#293548]'
              }`}
            >
              ★ {matchScore}% Fit
            </span>
          ) : (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 border border-slate-200 dark:bg-[#1E293B] dark:text-[#94A3B8] dark:border-[#293548]">
              Fit Uncalculated
            </span>
          )}

          {/* Listing Active/Expired Badge (Phase 10) */}
          {renderListingStatusBadge()}

          {/* Priority Tier Badge (Phase 9) */}
          {renderPriorityBadge()}

          {/* Application State Badge (Phase 6) */}
          {renderAppBadge(job.application?.status)}

          {/* Stale / Changed Flags */}
          {job.listing_changed_since_review && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-700">
              ⚠ Changed
            </span>
          )}

          {/* Key Skill Chips */}
          {visibleSkills.map((sk) => (
            <span
              key={sk}
              className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-[#CBD5E1] border border-slate-200 dark:border-[#293548] font-medium"
            >
              {sk}
            </span>
          ))}

          {remainingSkillsCount > 0 && (
            <span className="text-[10px] text-slate-500 dark:text-[#94A3B8] font-medium">
              +{remainingSkillsCount} more
            </span>
          )}
        </div>
      </div>

      {/* Right Action Cluster */}
      <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-[#293548] justify-end">
        {/* Primary Action Button: AI Priority Modal */}
        <button
          onClick={() => onOpenQualification(job.id)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 dark:bg-[#1E293B] dark:hover:bg-[#293548] text-slate-800 dark:text-[#F3F4F6] text-xs font-semibold border border-slate-300 dark:border-[#293548] transition-colors cursor-pointer"
        >
          <span>AI Priority</span>
        </button>

        {/* View Details Link */}
        <Link
          href={`/jobs/${job.id}`}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-[#293548] text-xs font-medium text-slate-700 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#1E293B] hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          View Fit →
        </Link>

        {/* Secondary Actions Kebab Menu */}
        <JobActionsMenu
          job={job}
          onUpdateReviewStatus={onUpdateReviewStatus}
          onStartApplication={onStartApplication}
          onDeleteJob={onDeleteJob}
          isStartingApp={isStartingApp}
        />
      </div>
    </div>
  );
}
