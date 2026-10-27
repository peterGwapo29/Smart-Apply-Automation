'use client';

import { useEffect, useState } from 'react';
import {
  getDiscoverySources,
  getDiscoveryRuns,
  triggerDiscoveryRun,
  DiscoverySourceRecord,
  JobDiscoveryRunRecord,
} from '@/lib/api';

interface JobDiscoveryHubProps {
  onDiscoveryComplete?: () => void;
}

export default function JobDiscoveryHub({ onDiscoveryComplete }: JobDiscoveryHubProps) {
  const [sources, setSources] = useState<DiscoverySourceRecord[]>([]);
  const [runs, setRuns] = useState<JobDiscoveryRunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form criteria
  const [selectedSource, setSelectedSource] = useState<string>('authorized_feed');
  const [keywords, setKeywords] = useState<string>('Laravel');
  const [location, setLocation] = useState<string>('Philippines');
  const [workArrangement, setWorkArrangement] = useState<string>('all');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [srcList, runData] = await Promise.all([
        getDiscoverySources(),
        getDiscoveryRuns(),
      ]);
      setSources(srcList);
      setRuns(runData.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load discovery data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunDiscovery = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setRunning(true);
      setError(null);
      setFeedback(null);

      const res = await triggerDiscoveryRun({
        source_platform: selectedSource,
        keywords: keywords.trim() || undefined,
        location: location.trim() || undefined,
        work_arrangement: workArrangement !== 'all' ? workArrangement : undefined,
      });

      setFeedback(res.message);
      await loadData();
      onDiscoveryComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Discovery run execution failed');
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm animate-pulse">
        Loading Automated Job Discovery Sources & Runs...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Automated Job Discovery Engine
            </h3>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              Phase 8 • Multi-Platform
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Discover and normalize opportunities across authorized sources, automatically deduplicating and calculating hybrid match scores.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={running}
          className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors"
        >
          ↻ Refresh Runs
        </button>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl border border-emerald-200 dark:border-emerald-800 flex justify-between items-center">
          <span>✓ {feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-emerald-600 hover:underline">
            dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-xs rounded-xl border border-rose-200 dark:border-rose-800">
          ⚠ {error}
        </div>
      )}

      {/* Sources Grid */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Source Platform Adapters ({sources.length}):
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {sources.map((src) => {
            const isReady = src.auth_status.status === 'ready';
            const isSelected = selectedSource === src.identifier;
            return (
              <div
                key={src.identifier}
                onClick={() => setSelectedSource(src.identifier)}
                className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 ring-1 ring-emerald-500'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-bold text-slate-900 dark:text-white truncate">
                    {src.display_name}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 ${
                      isReady
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                    }`}
                  >
                    {isReady ? 'Active' : 'Setup Required'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {src.auth_status.message}
                </p>
                <div className="mt-2 text-[10px] text-slate-400 flex flex-wrap gap-1">
                  {src.supported_capabilities.map((cap) => (
                    <span key={cap} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Discovery Trigger Form */}
      <form
        onSubmit={handleRunDiscovery}
        className="p-5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Execute On-Demand Discovery
          </h4>
          <span className="text-[11px] text-slate-400">
            Selected Source: <strong className="text-slate-700 dark:text-slate-300">{selectedSource}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Role / Skill Keywords
            </label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g. Laravel, React, PHP..."
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Target Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Philippines, Remote..."
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Work Arrangement
            </label>
            <select
              value={workArrangement}
              onChange={(e) => setWorkArrangement(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">All Arrangements</option>
              <option value="remote">100% Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="on_site">On-Site</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={running}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
          >
            {running ? 'Running Discovery...' : '⚡ Trigger Discovery Run'}
          </button>
        </div>
      </form>

      {/* Discovery Runs History Table */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Discovery Run History ({runs.length}):
        </h4>
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/60 text-slate-600 dark:text-slate-400 font-semibold">
                <th className="py-2.5 px-3">Run ID</th>
                <th className="py-2.5 px-3">Source</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Found</th>
                <th className="py-2.5 px-3">New Ingested</th>
                <th className="py-2.5 px-3">Updated</th>
                <th className="py-2.5 px-3">Deduplicated</th>
                <th className="py-2.5 px-3">Started</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {runs.length > 0 ? (
                runs.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/40">
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-700 dark:text-slate-300">
                      #{r.id}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                      {r.source_platform}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          r.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : r.status === 'completed_with_errors'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : r.status === 'running'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}
                      >
                        {r.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                      {r.listings_found}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-emerald-600 dark:text-emerald-400">
                      +{r.new_listings}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-blue-600 dark:text-blue-400">
                      {r.updated_listings}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {r.duplicates_ignored}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-400">
                    No discovery runs executed yet. Trigger your first run above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
