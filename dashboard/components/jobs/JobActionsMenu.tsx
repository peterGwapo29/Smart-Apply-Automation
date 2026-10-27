'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { JobListingRecord, ReviewWorkflowStatus } from '@/lib/api';

interface JobActionsMenuProps {
  job: JobListingRecord;
  onUpdateReviewStatus: (jobId: number, status: ReviewWorkflowStatus) => Promise<void>;
  onStartApplication: (jobId: number) => Promise<void>;
  onDeleteJob: (jobId: number) => Promise<void>;
  isStartingApp?: boolean;
}

export default function JobActionsMenu({
  job,
  onUpdateReviewStatus,
  onStartApplication,
  onDeleteJob,
  isStartingApp,
}: JobActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const effectiveStatus = (job.effective_review_status || 'new') as ReviewWorkflowStatus;

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 rounded-lg border border-slate-300 dark:border-[#293548] bg-white dark:bg-[#111827] hover:bg-slate-100 dark:hover:bg-[#172033] text-slate-700 dark:text-[#CBD5E1] hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        title="More Actions"
        aria-label="More actions"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-52 rounded-xl bg-white dark:bg-[#172033] border border-slate-200 dark:border-[#293548] shadow-xl z-30 py-1.5 text-xs animate-in fade-in zoom-in-95 duration-100">
          {/* Triage Decision Section */}
          <div className="px-3 py-1 font-bold text-[10px] text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider">
            Triage Decision
          </div>
          <div className="grid grid-cols-2 gap-1 px-2 pb-1.5">
            <button
              onClick={() => {
                onUpdateReviewStatus(job.id, 'interested');
                setIsOpen(false);
              }}
              className={`px-2 py-1 rounded text-left font-medium transition-colors ${
                effectiveStatus === 'interested'
                  ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300 font-bold'
                  : 'hover:bg-slate-100 dark:hover:bg-[#1E293B] text-slate-800 dark:text-[#CBD5E1]'
              }`}
            >
              Interested
            </button>
            <button
              onClick={() => {
                onUpdateReviewStatus(job.id, 'saved');
                setIsOpen(false);
              }}
              className={`px-2 py-1 rounded text-left font-medium transition-colors ${
                effectiveStatus === 'saved'
                  ? 'bg-blue-100 text-blue-900 dark:bg-blue-950/70 dark:text-blue-300 font-bold'
                  : 'hover:bg-slate-100 dark:hover:bg-[#1E293B] text-slate-800 dark:text-[#CBD5E1]'
              }`}
            >
              Saved
            </button>
            <button
              onClick={() => {
                onUpdateReviewStatus(job.id, 'review_required');
                setIsOpen(false);
              }}
              className={`px-2 py-1 rounded text-left font-medium transition-colors ${
                effectiveStatus === 'review_required'
                  ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 font-bold'
                  : 'hover:bg-slate-100 dark:hover:bg-[#1E293B] text-slate-800 dark:text-[#CBD5E1]'
              }`}
            >
              Review
            </button>
            <button
              onClick={() => {
                onUpdateReviewStatus(job.id, 'archived');
                setIsOpen(false);
              }}
              className={`px-2 py-1 rounded text-left font-medium transition-colors ${
                effectiveStatus === 'archived'
                  ? 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-white font-bold'
                  : 'hover:bg-slate-100 dark:hover:bg-[#1E293B] text-slate-800 dark:text-[#CBD5E1]'
              }`}
            >
              Archived
            </button>
          </div>

          <div className="my-1 border-t border-slate-200 dark:border-[#293548]" />

          {/* Application Agent */}
          {job.application ? (
            <Link
              href={`/jobs/${job.id}#application`}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-[#1E293B] text-blue-600 dark:text-blue-400 font-semibold"
            >
              <span>⚡</span>
              <span>Open Application Workspace</span>
            </Link>
          ) : (
            <button
              onClick={() => {
                onStartApplication(job.id);
                setIsOpen(false);
              }}
              disabled={isStartingApp}
              className="w-full text-left flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-[#1E293B] text-slate-800 dark:text-[#CBD5E1] font-medium"
            >
              <span>+</span>
              <span>{isStartingApp ? 'Initializing...' : 'Initialize Application'}</span>
            </button>
          )}

          {/* View Fit */}
          <Link
            href={`/jobs/${job.id}`}
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-[#1E293B] text-slate-800 dark:text-[#CBD5E1] font-medium"
          >
            <span>📊</span>
            <span>View Full Fit Analysis</span>
          </Link>

          {/* Original Source Link */}
          {job.canonical_url && (
            <a
              href={job.canonical_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-[#1E293B] text-slate-800 dark:text-[#CBD5E1] font-medium"
            >
              <span>↗</span>
              <span>Open Original Listing</span>
            </a>
          )}

          <div className="my-1 border-t border-slate-200 dark:border-[#293548]" />

          {/* Delete Action */}
          <button
            onClick={() => {
              setIsOpen(false);
              onDeleteJob(job.id);
            }}
            className="w-full text-left flex items-center gap-2 px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-medium"
          >
            <span>🗑</span>
            <span>Delete Listing</span>
          </button>
        </div>
      )}
    </div>
  );
}
