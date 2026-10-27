'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { importJob, checkJobUrl, CheckJobUrlResponse } from '@/lib/api';

function JobImportForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<'paste' | 'structured'>('paste');

  // Fields
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [salaryRaw, setSalaryRaw] = useState('');
  const [employmentType, setEmploymentType] = useState('Full-time');
  const [quickApplyStatus, setQuickApplyStatus] = useState<'available' | 'unavailable' | 'unknown' | 'requires_review'>('unknown');
  const [responsibilitiesText, setResponsibilitiesText] = useState('');
  const [requirementsText, setRequirementsText] = useState('');

  // Status & duplicate inspection
  const [checkingUrl, setCheckingUrl] = useState(false);
  const [existingMatch, setExistingMatch] = useState<CheckJobUrlResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ isDuplicate: boolean; message: string; id: number } | null>(null);

  // Read URL query parameter if passed from Chrome extension
  useEffect(() => {
    const queryUrl = searchParams.get('url');
    if (queryUrl) {
      setUrl(queryUrl);
      verifyUrl(queryUrl);
    }
  }, [searchParams]);

  const verifyUrl = async (targetUrl: string) => {
    if (!targetUrl || !targetUrl.startsWith('http')) return;
    try {
      setCheckingUrl(true);
      const res = await checkJobUrl(targetUrl);
      setExistingMatch(res);
      if (res.exists && res.job) {
        setTitle(res.job.title);
        if (res.job.company_name) setCompanyName(res.job.company_name);
        if (res.job.location) setLocation(res.job.location);
      }
    } catch {
      // Ignored non-critical check error
    } finally {
      setCheckingUrl(false);
    }
  };

  const handleUrlBlur = () => {
    if (url) {
      verifyUrl(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Job title is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const responsibilities = responsibilitiesText
        ? responsibilitiesText.split('\n').map(s => s.trim()).filter(Boolean)
        : undefined;

      const requiredQualifications = requirementsText
        ? requirementsText.split('\n').map(s => s.trim()).filter(Boolean)
        : undefined;

      const res = await importJob({
        canonical_url: url || undefined,
        title: title.trim(),
        company_name: companyName.trim() || undefined,
        location: location.trim() || undefined,
        description: description.trim() || undefined,
        salary_raw: salaryRaw.trim() || undefined,
        employment_type: employmentType || undefined,
        quick_apply_status: quickApplyStatus !== 'unknown' ? quickApplyStatus : undefined,
        responsibilities,
        required_qualifications: requiredQualifications,
        retrieval_method: url ? 'extension_assisted' : 'manual_paste',
      });

      setSuccessInfo({
        isDuplicate: res.is_duplicate,
        message: res.message,
        id: res.job.id,
      });

      // Redirect after 1.5s
      setTimeout(() => {
        router.push(`/jobs/${res.job.id}`);
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to import job listing');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb / Back */}
      <div className="mb-6">
        <Link
          href="/jobs"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Job Listings
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Import Job Listing
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Add a JobStreet listing with automated section parsing, salary detection, and Quick Apply evidence analysis.
        </p>
      </div>

      {/* Duplicate Warning Banner */}
      {existingMatch?.exists && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-amber-800 dark:text-amber-300">
            <span className="font-semibold">Notice: Listing already recorded.</span> Re-importing will refresh its last observed timestamp and log any field differences into the audit history without creating duplicate rows.
          </div>
        </div>
      )}

      {/* Success notification */}
      {successInfo && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm flex items-center justify-between">
          <div>
            <span className="font-semibold">{successInfo.isDuplicate ? 'Listing Updated:' : 'Success:'}</span> {successInfo.message}
          </div>
          <span className="text-xs text-emerald-600 dark:text-emerald-400">Redirecting...</span>
        </div>
      )}

      {/* Error notification */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-sm">
          {error}
        </div>
      )}

      {/* Mode Switcher Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('paste')}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'paste'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          Quick Paste & Smart Extract
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('structured')}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'structured'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          Manual Structured Fields
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* URL Input */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              JobStreet URL (Optional)
            </label>
            <div className="relative">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={handleUrlBlur}
                placeholder="https://www.jobstreet.com.ph/job/79512345"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              {checkingUrl && (
                <div className="absolute right-3 top-3 text-xs text-slate-400 animate-spin">
                  ⏳
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Tracking queries (utm_*, ref, sol) are automatically stripped to maintain canonical records.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Job Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Senior Laravel Engineer"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Tech Solutions Inc."
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Taguig, Metro Manila"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Employment Type
              </label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Salary (Raw or Range)
              </label>
              <input
                type="text"
                value={salaryRaw}
                onChange={(e) => setSalaryRaw(e.target.value)}
                placeholder="e.g. PHP 80,000 - 120,000"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Tab Specific Content */}
        {activeTab === 'paste' ? (
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Paste Full Job Listing Text
                </label>
                <span className="text-xs text-blue-600 dark:text-blue-400">
                  Auto-splits Responsibilities & Requirements
                </span>
              </div>
              <textarea
                rows={12}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Paste the full job post description here (including responsibilities, requirements, and application instructions)..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none leading-relaxed"
              />
              <p className="text-xs text-slate-500 mt-1">
                The parser will automatically detect Quick Apply keyword evidence, salary figures, and structured bullet items.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Responsibilities (One item per line)
              </label>
              <textarea
                rows={5}
                value={responsibilitiesText}
                onChange={(e) => setResponsibilitiesText(e.target.value)}
                placeholder="- Develop REST APIs with Laravel&#10;- Optimize MySQL queries"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Required Qualifications (One item per line)
              </label>
              <textarea
                rows={5}
                value={requirementsText}
                onChange={(e) => setRequirementsText(e.target.value)}
                placeholder="- 3+ years PHP experience&#10;- Experience with Next.js & React"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Quick Apply Availability Status
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {[
                  { value: 'available', label: 'Quick Apply Ready', color: 'emerald' },
                  { value: 'unavailable', label: 'External Portal', color: 'rose' },
                  { value: 'requires_review', label: 'Requires Review', color: 'amber' },
                  { value: 'unknown', label: 'Unknown', color: 'slate' },
                ].map((item) => (
                  <label
                    key={item.value}
                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                      quickApplyStatus === item.value
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="quick_apply_status"
                      value={item.value}
                      checked={quickApplyStatus === item.value}
                      onChange={() => setQuickApplyStatus(item.value as typeof quickApplyStatus)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            href="/jobs"
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {submitting ? 'Ingesting...' : 'Save Job Listing'}
          </button>
        </div>
      </form>
    </main>
  );
}

export default function JobImportPage() {
  return (
    <Suspense fallback={
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-sm text-slate-500">
        Loading import interface...
      </div>
    }>
      <JobImportForm />
    </Suspense>
  );
}
