'use client';

import { useState } from 'react';

interface JobFilterToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  techFilter: string;
  onTechChange: (value: string) => void;
  workArrangement: string;
  onArrangementChange: (value: string) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
  reviewStatusFilter: string;
  onReviewStatusChange: (value: string) => void;
  quickApplyFilter: string;
  onQuickApplyChange: (value: string) => void;
  isChangedOnly: boolean;
  onChangedOnlyToggle: (value: boolean) => void;
  isStaleOnly: boolean;
  onStaleOnlyToggle: (value: boolean) => void;
  onResetFilters: () => void;
}

export default function JobFilterToolbar({
  searchTerm,
  onSearchChange,
  techFilter,
  onTechChange,
  workArrangement,
  onArrangementChange,
  sortBy,
  onSortChange,
  reviewStatusFilter,
  onReviewStatusChange,
  quickApplyFilter,
  onQuickApplyChange,
  isChangedOnly,
  onChangedOnlyToggle,
  isStaleOnly,
  onStaleOnlyToggle,
  onResetFilters,
}: JobFilterToolbarProps) {
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  // Count active secondary filters
  const activeSecondaryCount = [
    techFilter ? 1 : 0,
    reviewStatusFilter ? 1 : 0,
    quickApplyFilter ? 1 : 0,
    isChangedOnly ? 1 : 0,
    isStaleOnly ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const hasAnyFilter = Boolean(
    searchTerm ||
    techFilter ||
    workArrangement ||
    reviewStatusFilter ||
    quickApplyFilter ||
    isChangedOnly ||
    isStaleOnly ||
    sortBy !== 'newest'
  );

  return (
    <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-[#293548] shadow-2xs space-y-2.5 p-3 text-xs transition-colors">
      {/* Primary Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {/* Omni Search */}
        <div className="relative flex-1 min-w-0">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search job title, company, or keyword..."
            className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-[#293548] hover:border-slate-400 dark:hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50 dark:bg-[#0B1220] text-slate-900 dark:text-[#F3F4F6] placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-colors"
          />
          <svg
            className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500 dark:text-[#94A3B8]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white text-xs font-bold"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Work Arrangement Quick Select */}
        <div className="w-full sm:w-36 shrink-0">
          <select
            value={workArrangement}
            onChange={(e) => onArrangementChange(e.target.value)}
            className="w-full py-1.5 px-2 text-xs rounded-lg border border-slate-300 dark:border-[#293548] hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50 dark:bg-[#0B1220] text-slate-800 dark:text-[#CBD5E1] outline-none transition-colors cursor-pointer"
          >
            <option value="">Arrangement (All)</option>
            <option value="remote">100% Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="on_site">On-Site</option>
          </select>
        </div>

        {/* Sort Order Quick Select */}
        <div className="w-full sm:w-44 shrink-0">
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="w-full py-1.5 px-2 text-xs rounded-lg border border-slate-300 dark:border-[#293548] hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50 dark:bg-[#0B1220] text-slate-800 dark:text-[#CBD5E1] outline-none transition-colors cursor-pointer"
          >
            <option value="highest_match">Sort: Highest Match</option>
            <option value="newest">Sort: Newly Observed</option>
            <option value="lowest_match">Sort: Lowest Match</option>
            <option value="salary_high">Sort: Highest Salary</option>
            <option value="recently_reviewed">Sort: Recently Reviewed</option>
            <option value="unreviewed_first">Sort: Unreviewed First</option>
            <option value="updated">Sort: Recently Updated</option>
          </select>
        </div>

        {/* More Filters Toggle */}
        <button
          type="button"
          onClick={() => setShowMoreFilters(!showMoreFilters)}
          className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors shrink-0 ${
            showMoreFilters || activeSecondaryCount > 0
              ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
              : 'border-slate-300 dark:border-[#293548] bg-slate-50 dark:bg-[#172033] text-slate-700 dark:text-[#CBD5E1] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span>Filters</span>
          {activeSecondaryCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
              {activeSecondaryCount}
            </span>
          )}
        </button>

        {/* Reset Trigger */}
        {hasAnyFilter && (
          <button
            type="button"
            onClick={onResetFilters}
            className="text-slate-500 hover:text-rose-600 dark:text-[#94A3B8] dark:hover:text-rose-400 transition-colors p-1.5 shrink-0 font-bold"
            title="Reset All Filters"
          >
            ✕
          </button>
        )}
      </div>

      {/* Collapsible Secondary Filter Drawer */}
      {showMoreFilters && (
        <div className="pt-3 border-t border-slate-200 dark:border-[#293548] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-150">
          {/* Tech keyword */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-[#CBD5E1] uppercase mb-1">
              Specific Technology
            </label>
            <input
              type="text"
              value={techFilter}
              onChange={(e) => onTechChange(e.target.value)}
              placeholder="e.g. PHP, React, MySQL..."
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-[#293548] hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50 dark:bg-[#0B1220] text-slate-900 dark:text-[#F3F4F6] placeholder-slate-400 dark:placeholder-slate-500 outline-none"
            />
          </div>

          {/* Triage Decision Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-[#CBD5E1] uppercase mb-1">
              Triage Decision
            </label>
            <select
              value={reviewStatusFilter}
              onChange={(e) => onReviewStatusChange(e.target.value)}
              className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-[#293548] hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50 dark:bg-[#0B1220] text-slate-800 dark:text-[#CBD5E1] outline-none cursor-pointer"
            >
              <option value="">All Review Decisions</option>
              <option value="new">Unreviewed / New</option>
              <option value="review_required">Needs Review</option>
              <option value="saved">Saved</option>
              <option value="interested">Interested</option>
              <option value="not_interested">Not Interested</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Application Portal Type */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-[#CBD5E1] uppercase mb-1">
              Application Type
            </label>
            <select
              value={quickApplyFilter}
              onChange={(e) => onQuickApplyChange(e.target.value)}
              className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-[#293548] hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50 dark:bg-[#0B1220] text-slate-800 dark:text-[#CBD5E1] outline-none cursor-pointer"
            >
              <option value="">All Application Types</option>
              <option value="available">Quick Apply Available</option>
              <option value="unavailable">External Portal</option>
              <option value="requires_review">Requires Review</option>
            </select>
          </div>

          {/* Checkboxes row */}
          <div className="flex flex-col justify-end gap-2 pt-1 text-xs">
            <label className="inline-flex items-center gap-2 cursor-pointer text-slate-700 dark:text-[#CBD5E1] font-medium">
              <input
                type="checkbox"
                checked={isChangedOnly}
                onChange={(e) => onChangedOnlyToggle(e.target.checked)}
                className="rounded border-slate-300 dark:border-[#293548] text-amber-600 focus:ring-amber-500"
              />
              <span>Changed since review</span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer text-slate-700 dark:text-[#CBD5E1] font-medium">
              <input
                type="checkbox"
                checked={isStaleOnly}
                onChange={(e) => onStaleOnlyToggle(e.target.checked)}
                className="rounded border-slate-300 dark:border-[#293548] text-blue-600 focus:ring-blue-500"
              />
              <span>Outdated match</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
