'use client';

import { DashboardSummary } from '@/lib/api';

export type TabKey = 'all' | 'strong_matches' | 'review_queue' | 'bookmarked' | 'interested' | 'archived';

interface JobMetricsBarProps {
  summary: DashboardSummary | null;
  activeTab: TabKey;
  onTabSelect: (tab: TabKey) => void;
}

export default function JobMetricsBar({
  summary,
  activeTab,
  onTabSelect,
}: JobMetricsBarProps) {
  if (!summary) return null;

  const metrics = [
    {
      tab: 'all' as TabKey,
      label: 'All Active Jobs',
      count: summary.total,
      badgeColor: 'bg-slate-100 text-slate-800 dark:bg-[#1E293B] dark:text-[#F3F4F6] border border-slate-300 dark:border-[#293548]',
      activeColor: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 font-bold',
    },
    {
      tab: 'strong_matches' as TabKey,
      label: `Strong Fit (≥${summary.min_match_threshold}%)`,
      count: summary.strong_matches,
      badgeColor: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800',
      activeColor: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 font-bold',
    },
    {
      tab: 'review_queue' as TabKey,
      label: 'Review Queue',
      count: summary.review_required,
      badgeColor: 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800',
      activeColor: 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700 font-bold',
    },
    {
      tab: 'bookmarked' as TabKey,
      label: 'Bookmarked',
      count: summary.bookmarked,
      badgeColor: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-950/70 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-800',
      activeColor: 'bg-yellow-50 dark:bg-yellow-950/60 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700 font-bold',
    },
  ];

  return (
    <div className="bg-white dark:bg-[#111827] px-3 py-2 rounded-xl border border-slate-200 dark:border-[#293548] shadow-2xs overflow-x-auto flex items-center justify-between gap-3 text-xs transition-colors">
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {metrics.map((m) => {
          const isSelected = activeTab === m.tab;
          return (
            <button
              key={m.tab}
              onClick={() => onTabSelect(m.tab)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap cursor-pointer text-xs ${
                isSelected
                  ? m.activeColor
                  : 'border-transparent text-slate-700 dark:text-[#CBD5E1] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#172033]'
              }`}
            >
              <span>{m.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full font-bold text-[10px] ${m.badgeColor}`}
              >
                {m.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="hidden lg:flex items-center gap-3 text-[11px] text-slate-500 dark:text-[#94A3B8] border-l border-slate-200 dark:border-[#293548] pl-4 shrink-0">
        <span>Scoring: <strong className="text-slate-700 dark:text-[#CBD5E1]">Phase 4 Engine</strong></span>
        <span>•</span>
        <span>Prioritization: <strong className="text-slate-700 dark:text-[#CBD5E1]">Phase 9 AI</strong></span>
      </div>
    </div>
  );
}
