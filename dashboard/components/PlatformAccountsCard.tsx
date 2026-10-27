'use client';

import { useState, useEffect } from 'react';
import {
  PlatformAccountRecord,
  getPlatformAccounts,
  updatePlatformAccount,
} from '@/lib/api';

interface PlatformAccountsCardProps {
  onClose?: () => void;
}

export default function PlatformAccountsCard({ onClose }: PlatformAccountsCardProps) {
  const [accounts, setAccounts] = useState<PlatformAccountRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingPlatform, setUpdatingPlatform] = useState<string | null>(null);
  const [editingEmail, setEditingEmail] = useState<{ [platform: string]: string }>({});
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  async function loadAccounts() {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await getPlatformAccounts();
      const list = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.accounts)
        ? res.accounts
        : [];

      setAccounts(list);
      const emails: { [key: string]: string } = {};
      list.forEach((acc) => {
        if (acc && acc.platform) {
          emails[acc.platform] = acc.verified_username_or_email || '';
        }
      });
      setEditingEmail(emails);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load platform account settings.');
      setAccounts([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleToggleStatus(account: PlatformAccountRecord) {
    if (!account || !account.platform) return;

    const nextStatus = account.is_verified ? 'setup_required' : 'access_verified';
    setUpdatingPlatform(account.platform);
    setMessage(null);
    setErrorMessage(null);

    try {
      const res = await updatePlatformAccount(account.platform, {
        access_status: nextStatus,
        verified_username_or_email: editingEmail[account.platform] || null,
      });

      const updated = res?.data || res?.account;
      if (updated) {
        setAccounts((prev) =>
          (Array.isArray(prev) ? prev : []).map((acc) =>
            acc.platform === account.platform ? { ...acc, ...updated } : acc
          )
        );
      }
      setMessage(`${account.display_name} access marked as ${nextStatus === 'access_verified' ? 'Verified' : 'Setup Required'}.`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update platform account status.');
    } finally {
      setUpdatingPlatform(null);
    }
  }

  const getCapabilityLabel = (capability?: string | null) => {
    switch (capability) {
      case 'browser_assisted':
        return 'Browser Assisted';
      case 'authorized_integration':
        return 'Direct Feed Integration';
      case 'manual_only':
      default:
        return 'Manual Assisted';
    }
  };

  const getStatusBadge = (account: PlatformAccountRecord) => {
    if (account.access_status === 'access_verified') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Verified Active
        </span>
      );
    }
    if (account.access_status === 'integration_connected') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-900 border border-blue-300 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800">
          Connected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800">
        Setup Required
      </span>
    );
  };

  const safeAccounts = Array.isArray(accounts) ? accounts : [];

  return (
    <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-[#293548] p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1E293B] pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Platform Account Access
            </h3>
            <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800">
              Phase 10
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
            Manage application execution readiness and verified accounts across supported platforms.
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1E293B] transition-colors cursor-pointer"
            title="Close Platform Accounts"
          >
            ✕
          </button>
        )}
      </div>

      {/* Security Assurance Banner */}
      <div className="p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-2.5 text-xs text-emerald-900 dark:text-emerald-200">
        <span className="text-base leading-none">🛡️</span>
        <div className="space-y-0.5 leading-relaxed">
          <span className="font-semibold">Zero Credential Collection Policy: </span>
          Smart Apply Automation never asks for, records, or stores your platform passwords, cookies, or browser tokens. Platform access is managed directly on official platform sites.
        </div>
      </div>

      {message && (
        <div className="p-2.5 rounded-lg text-xs bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800">
          {message}
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-lg text-xs bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-800 flex items-center justify-between gap-3">
          <span>{errorMessage}</span>
          <button
            onClick={loadAccounts}
            className="px-2.5 py-1 rounded bg-rose-200 dark:bg-rose-900 hover:bg-rose-300 dark:hover:bg-rose-800 text-rose-950 dark:text-rose-100 font-semibold cursor-pointer shrink-0 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500 animate-pulse">
          Loading platform account states...
        </div>
      ) : safeAccounts.length === 0 ? (
        <div className="py-8 text-center space-y-2 border border-dashed border-slate-200 dark:border-[#293548] rounded-lg">
          <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
            No platform accounts configured or accessible at this time.
          </p>
          <button
            onClick={loadAccounts}
            className="text-xs px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors cursor-pointer"
          >
            Refresh Accounts
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
          {safeAccounts.map((acc) => {
            const isFeed = acc.platform === 'authorized_feed';
            return (
              <div
                key={acc.platform}
                className="rounded-lg border border-slate-200 dark:border-[#293548] p-3.5 bg-slate-50/50 dark:bg-[#1E293B]/40 flex flex-col justify-between gap-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {acc.display_name}
                    </span>
                    {getStatusBadge(acc)}
                  </div>

                  <div className="text-xs text-slate-500 dark:text-[#94A3B8] flex items-center gap-1.5">
                    <span>Execution mode:</span>
                    <span className="font-medium text-slate-700 dark:text-[#CBD5E1]">
                      {getCapabilityLabel(acc.supported_capability)}
                    </span>
                  </div>

                  {!isFeed && (
                    <div className="space-y-1 pt-1">
                      <label className="text-[11px] font-medium text-slate-600 dark:text-[#CBD5E1]">
                        Account Email / Username (optional reference)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. yourname@domain.com"
                        value={editingEmail[acc.platform] || ''}
                        onChange={(e) =>
                          setEditingEmail({
                            ...editingEmail,
                            [acc.platform]: e.target.value,
                          })
                        }
                        className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-[#293548] bg-white dark:bg-[#111827] text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  {/* Official Links */}
                  {(acc.login_url || acc.registration_url) && (
                    <div className="flex items-center gap-3 pt-1 text-[11px]">
                      {acc.login_url && (
                        <a
                          href={acc.login_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline flex items-center gap-0.5"
                        >
                          Official Sign In ↗
                        </a>
                      )}
                      {acc.registration_url && (
                        <a
                          href={acc.registration_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:underline flex items-center gap-0.5"
                        >
                          Register Account ↗
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {!isFeed && (
                  <div className="pt-2 border-t border-slate-200 dark:border-[#293548]/70 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      {acc.last_verified_at
                        ? `Verified ${new Date(acc.last_verified_at).toLocaleDateString()}`
                        : 'Unverified'}
                    </span>
                    <button
                      onClick={() => handleToggleStatus(acc)}
                      disabled={updatingPlatform === acc.platform}
                      className={`text-xs px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                        acc.is_verified
                          ? 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {updatingPlatform === acc.platform
                        ? 'Updating...'
                        : acc.is_verified
                        ? 'Mark Unverified'
                        : 'Confirm Verified Access'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
