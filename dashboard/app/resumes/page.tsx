'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getResumes, uploadResume, ResumeRecord } from '@/lib/api';

export default function ResumesPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchResumeList = async () => {
    try {
      setLoading(true);
      const list = await getResumes();
      setResumes(list);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    getResumes()
      .then((list) => {
        if (isMounted) {
          setResumes(list);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validations
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Please select a valid PDF document (.pdf).');
      setSelectedFile(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage(`File is too large (${(file.size / (1024 * 1024)).toFixed(2)} MB). Maximum allowed size is 5 MB.`);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await uploadResume(selectedFile);
      setSuccessMessage('Resume uploaded and parsed successfully! Redirecting to review...');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      await fetchResumeList();

      // Navigate to review interface
      setTimeout(() => {
        router.push(`/resumes/${response.resume.id}/review`);
      }, 1000);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to upload and parse resume.');
    } finally {
      setUploading(false);
    }
  };

  const activeResume = resumes.find((r) => r.is_active);

  return (
    <main className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-10">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Resume Ingestion & Versions</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Upload PDF resumes to extract skills, work history, projects, and education into your candidate profile.
        </p>
      </div>

      {/* Active Resume Banner */}
      {activeResume ? (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xl">
                PDF
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                    Active Resume
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {(activeResume.file_size / 1024).toFixed(1)} KB
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {activeResume.original_filename}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Activated on {new Date(activeResume.updated_at).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={`/resumes/${activeResume.id}/review`}
                className="inline-flex items-center px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors shadow-sm"
              >
                Re-review Extracted Data
              </Link>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
              >
                Replace Active Resume
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-200 dark:bg-amber-900/50 flex items-center justify-center text-amber-800 dark:text-amber-200 font-bold">
              !
            </div>
            <div>
              <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">No Active Resume Found</h3>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                Upload your resume below. Once reviewed and confirmed, it will become your active profile base.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upload Box */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">Upload New Resume</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
          Only standard text-based PDF documents are supported (maximum 5 MB). Uploading a new resume will preserve all historical versions.
        </p>

        {errorMessage && (
          <div className="mb-4 p-4 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-xs text-rose-700 dark:text-rose-300">
            <strong>Upload Error:</strong> {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-xs text-emerald-700 dark:text-emerald-300">
            {successMessage}
          </div>
        )}

        <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center hover:border-blue-500 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            className="hidden"
            id="resume-file-input"
          />

          <svg
            className="mx-auto h-12 w-12 text-slate-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v24a4 4 0 004 4h24a4 4 0 004-4V20L28 8z"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M28 8v12h12"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <div className="mt-4 flex text-sm justify-center text-slate-600 dark:text-slate-400">
            <label
              htmlFor="resume-file-input"
              className="relative cursor-pointer rounded-md font-semibold text-blue-600 dark:text-blue-400 hover:underline focus-within:outline-none"
            >
              <span>Click to select PDF resume</span>
            </label>
            <p className="pl-1">or drag and drop</p>
          </div>
          <p className="text-xs text-slate-500 mt-1">PDF up to 5 MB</p>

          {selectedFile && (
            <div className="mt-5 p-3 max-w-md mx-auto bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-between text-left text-xs">
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate max-w-xs">
                  {selectedFile.name}
                </span>
                <span className="text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="text-rose-600 hover:text-rose-700 font-semibold text-xs ml-2"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="inline-flex items-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors focus:outline-none"
          >
            {uploading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Uploading & Parsing PDF...
              </>
            ) : (
              'Upload and Parse Resume'
            )}
          </button>
        </div>
      </section>

      {/* Historical Versions Table */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Resume Version History</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              All previous uploads are preserved to retain provenance for future application tracking.
            </p>
          </div>
          <button
            onClick={fetchResumeList}
            className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500">Loading resume history...</div>
        ) : resumes.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">No resumes uploaded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-left">
                  <th className="py-3 px-4 font-semibold">Filename</th>
                  <th className="py-3 px-4 font-semibold">Size</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Active</th>
                  <th className="py-3 px-4 font-semibold">Upload Date</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {resumes.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                      {item.original_filename}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      {(item.file_size / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium text-[11px] ${
                          item.processing_status === 'confirmed'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : item.processing_status === 'parsed'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300'
                            : item.processing_status === 'failed'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                            : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {item.processing_status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {item.is_active ? (
                        <span className="inline-flex items-center text-emerald-600 font-semibold text-xs">
                          ● Active
                        </span>
                      ) : (
                        <span className="text-slate-400">Historical</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(item.created_at).toLocaleDateString()}{' '}
                      {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {item.processing_status !== 'failed' && (
                        <Link
                          href={`/resumes/${item.id}/review`}
                          className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                        >
                          Review & Confirm
                        </Link>
                      )}
                      {item.error_message && (
                        <span className="text-rose-600 block text-[10px] truncate max-w-xs">
                          {item.error_message}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
