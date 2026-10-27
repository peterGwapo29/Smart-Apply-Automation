'use client';

import { useEffect, useState } from 'react';
import {
  getDiscoverySources,
  getDiscoveryRuns,
  cancelDiscoveryRun,
  DiscoverySourceRecord,
  JobDiscoveryRunRecord,
} from '@/lib/api';

interface DiscoverySettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DiscoverySettingsDrawer({ isOpen, onClose }: DiscoverySettingsDrawerProps) {
  const [sources, setSources] = useState<DiscoverySourceRecord[]>([]);
  const [runs, setRuns] = useState<JobDiscoveryRunRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      setError(err instanceof Error ? err.message : 'Failed to load discovery configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const handleCancelRun = async (id: number) => {
    try {
      setCancellingId(id);
      await cancelDiscoveryRun(id);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to cancel discovery run.');
    } finally {
      setCancellingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm transition-opacity animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white dark:bg-[#111827] text-slate-900 dark:text-[#F3F4F6] h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-[#293548] animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-[#293548] flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-[#F3F4F6]">
              Discovery Engine & Source Settings
            </h3>
            <p className="text-xs text-slate-600 dark:text-[#94A3B8] mt-0.5">
              Source adapters, compliance status, and historical background discovery runs.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-[#94A3B8] dark:hover:text-[#F3F4F6] hover:bg-slate-100 dark:hover:bg-[#172033] transition-colors"
            aria-label="Close discovery settings drawer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-slate-600 dark:text-[#94A3B8]">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading source adapters and run history...
            </div>
          ) : (
            <>
              {/* Source Adapters Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase tracking-wider text-slate-800 dark:text-[#CBD5E1] text-[11px]">
                    Multi-Platform Source Adapters ({sources.length})
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-[#94A3B8] font-medium">Strict Anti-Bot & Terms Compliant</span>
                </div>

                <div className="space-y-2.5">
                  {sources.map((src) => {
                    const isReady = src.auth_status.status === 'ready';
                    return (
                      <div
                        key={src.identifier}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-[#293548] bg-slate-50 dark:bg-[#172033] space-y-2 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-slate-900 dark:text-[#F3F4F6]">
                            {src.display_name}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                              isReady
                                ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                : 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            {isReady ? 'Active / Configured' : 'Setup Required'}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-[#CBD5E1] text-xs leading-relaxed">
                          {src.auth_status.message}
                        </p>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {src.supported_capabilities.map((cap) => (
                            <span
                              key={cap}
                              className="px-2 py-0.5 rounded bg-white dark:bg-[#1E293B] text-[10px] text-slate-700 dark:text-[#CBD5E1] border border-slate-200 dark:border-[#293548] font-mono font-medium"
                            >
                              {cap}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Discovery Run History */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase tracking-wider text-slate-800 dark:text-[#CBD5E1] text-[11px]">
                    Discovery Run History ({runs.length})
                  </span>
                  <button
                    onClick={loadData}
                    className="text-blue-600 dark:text-blue-400 hover:underline text-[11px] font-semibold"
                  >
                    Refresh
                  </button>
                </div>

                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {runs.length === 0 ? (
                    <div className="py-6 text-center text-slate-500 dark:text-[#94A3B8] bg-slate-50 dark:bg-[#172033] rounded-xl border border-dashed border-slate-200 dark:border-[#293548]">
                      No discovery runs logged yet.
                    </div>
                  ) : (
                    runs.map((run) => (
                      <div
                        key={run.id}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-[#293548] bg-white dark:bg-[#172033] space-y-2.5 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-[#F3F4F6]">
                              Run #{run.id}
                            </span>
                            <span className="text-slate-400 dark:text-slate-600">•</span>
                            <span className="capitalize font-semibold text-slate-700 dark:text-[#CBD5E1]">
                              {run.source_platform}
                            </span>
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                              run.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                : run.status === 'running'
                                ? 'bg-blue-100 text-blue-900 dark:bg-blue-950/70 dark:text-blue-300 border-blue-300 dark:border-blue-800 animate-pulse'
                                : 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            {run.status.replace(/_/g, ' ')}
                          </span>
                        </div>

                        <div className="grid grid-cols-4 gap-2 text-center text-[11px] bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-[#293548] p-2.5 rounded-lg">
                          <div>
                            <div className="text-slate-500 dark:text-[#94A3B8] text-[10px] font-medium">Found</div>
                            <div className="font-bold text-slate-900 dark:text-[#F3F4F6] text-xs">{run.listings_found}</div>
                          </div>
                          <div>
                            <div className="text-slate-500 dark:text-[#94A3B8] text-[10px] font-medium">New</div>
                            <div className="font-bold text-emerald-700 dark:text-emerald-400 text-xs">+{run.new_listings}</div>
                          </div>
                          <div>
                            <div className="text-slate-500 dark:text-[#94A3B8] text-[10px] font-medium">Updated</div>
                            <div className="font-bold text-blue-700 dark:text-blue-400 text-xs">{run.updated_listings}</div>
                          </div>
                          <div>
                            <div className="text-slate-500 dark:text-[#94A3B8] text-[10px] font-medium">Deduplicated</div>
                            <div className="font-medium text-slate-600 dark:text-[#CBD5E1] text-xs">{run.duplicates_ignored}</div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-[#94A3B8] pt-1">
                          <span>Started: {new Date(run.created_at).toLocaleString()}</span>
                          {run.status === 'running' && (
                            <button
                              onClick={() => handleCancelRun(run.id)}
                              disabled={cancellingId === run.id}
                              className="text-rose-600 dark:text-rose-400 hover:underline font-semibold"
                            >
                              {cancellingId === run.id ? 'Cancelling...' : 'Cancel Run'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-[#293548] flex justify-end bg-slate-50/50 dark:bg-[#111827]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 dark:border-[#293548] text-slate-700 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#172033] hover:text-slate-900 dark:hover:text-white font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
