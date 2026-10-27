'use client';

import { useState } from 'react';
import { triggerDiscoveryRun } from '@/lib/api';

interface JobDiscoveryBarProps {
  onDiscoveryComplete?: () => void;
  onOpenSettings?: () => void;
}

export default function JobDiscoveryBar({
  onDiscoveryComplete,
  onOpenSettings,
}: JobDiscoveryBarProps) {
  const [keywords, setKeywords] = useState('');
  const [location, setLocation] = useState('Philippines');
  const [arrangement, setArrangement] = useState('all');
  const [source, setSource] = useState('authorized_feed');
  const [running, setRunning] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setRunning(true);
      setFeedback(null);
      const res = await triggerDiscoveryRun({
        source_platform: source,
        keywords: keywords.trim() || undefined,
        location: location.trim() || undefined,
        work_arrangement: arrangement !== 'all' ? arrangement : undefined,
      });
      if (res.run?.error_message) {
        setFeedback(`⚠️ ${res.run.error_message}`);
      } else {
        setFeedback(res.message);
      }
      onDiscoveryComplete?.();
      setTimeout(() => setFeedback(null), 6000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Discovery run execution failed.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-2">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-[#111827] p-2.5 rounded-xl border border-slate-200 dark:border-[#293548] shadow-2xs flex flex-col md:flex-row items-stretch md:items-center gap-2 transition-colors"
      >
        {/* Keywords */}
        <div className="relative flex-1 min-w-0">
          <input
            type="text"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="Role / Skill keywords (e.g. Laravel, React)"
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-[#293548] hover:border-slate-400 dark:hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50 dark:bg-[#0B1220] text-slate-900 dark:text-[#F3F4F6] placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-colors"
          />
          <svg
            className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500 dark:text-[#94A3B8]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Location */}
        <div className="relative md:w-44 shrink-0">
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location / Remote"
            className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-[#293548] hover:border-slate-400 dark:hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50 dark:bg-[#0B1220] text-slate-900 dark:text-[#F3F4F6] placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-colors"
          />
          <svg
            className="w-3.5 h-3.5 absolute left-2 top-2.5 text-slate-500 dark:text-[#94A3B8]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>

        {/* Source Adapter Select */}
        <div className="md:w-36 shrink-0">
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full py-1.5 px-2 text-xs rounded-lg border border-slate-300 dark:border-[#293548] hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50 dark:bg-[#0B1220] text-slate-800 dark:text-[#CBD5E1] outline-none transition-colors cursor-pointer"
          >
            <option value="authorized_feed">Authorized Feed (Demo)</option>
            <option value="jobstreet">JobStreet (Requires Key)</option>
            <option value="linkedin">LinkedIn (Requires Key)</option>
            <option value="onlinejobs_ph">OnlineJobs.ph (Requires Key)</option>
          </select>
        </div>

        {/* Buttons cluster */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="submit"
            disabled={running}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
          >
            {running ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Discovering...</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Discover</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="p-1.5 rounded-lg border border-slate-300 dark:border-[#293548] hover:bg-slate-100 dark:hover:bg-[#172033] text-slate-700 dark:text-[#CBD5E1] hover:text-slate-900 dark:hover:text-white transition-colors"
            title="Discovery Sources & Run History"
            aria-label="Open discovery sources and history"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </form>

      {/* Discovery Feedback Banner */}
      {feedback && (
        <div className="px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs flex items-center justify-between animate-in fade-in">
          <span className="flex items-center gap-1.5 font-medium">
            <span>✓</span>
            <span>{feedback}</span>
          </span>
          <button
            onClick={() => setFeedback(null)}
            className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
