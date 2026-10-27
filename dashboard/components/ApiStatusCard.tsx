'use client';

import { useState } from 'react';
import { fetchHealthStatus, HealthCheckResponse } from '@/lib/api';

export default function ApiStatusCard() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [data, setData] = useState<HealthCheckResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  const checkConnection = async () => {
    setStatus('loading');
    setErrorMessage(null);
    try {
      const result = await fetchHealthStatus(true);
      setData(result);
      setStatus('success');
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err: unknown) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Unable to connect to backend API server.');
      setLastChecked(new Date().toLocaleTimeString());
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Backend API Status</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time connection monitor to Laravel REST API
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-3 h-3 rounded-full ${
              status === 'idle'
                ? 'bg-slate-400'
                : status === 'loading'
                ? 'bg-amber-400 animate-pulse'
                : status === 'success'
                ? 'bg-emerald-500'
                : 'bg-rose-500'
            }`}
          />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            {status}
          </span>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-100 dark:border-slate-800">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-xs">Target Endpoint</span>
              <span className="font-mono text-slate-800 dark:text-slate-200 font-medium">/api/health</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-xs">Last Verified</span>
              <span className="text-slate-800 dark:text-slate-200 font-medium">{lastChecked || 'Not verified yet'}</span>
            </div>
          </div>
        </div>

        {status === 'success' && data && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-lg text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-emerald-700 dark:text-emerald-300 font-medium">Service Name:</span>
              <span className="font-mono text-emerald-800 dark:text-emerald-200">{data.service}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-700 dark:text-emerald-300 font-medium">Status Code:</span>
              <span className="font-mono text-emerald-800 dark:text-emerald-200">{data.status}</span>
            </div>
            {data.database && (
              <div className="flex justify-between">
                <span className="text-emerald-700 dark:text-emerald-300 font-medium">Database State:</span>
                <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-300">{data.database}</span>
              </div>
            )}
          </div>
        )}

        {status === 'error' && errorMessage && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 rounded-lg text-sm">
            <p className="text-rose-700 dark:text-rose-300 font-semibold mb-1">Connection Failed</p>
            <p className="text-rose-600 dark:text-rose-400 text-xs font-mono">{errorMessage}</p>
          </div>
        )}
      </div>

      <button
        onClick={checkConnection}
        disabled={status === 'loading'}
        className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        {status === 'loading' ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Checking Connection...
          </>
        ) : (
          'Check Backend Connection'
        )}
      </button>
    </div>
  );
}
