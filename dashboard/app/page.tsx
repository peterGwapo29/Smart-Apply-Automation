import ApiStatusCard from '@/components/ApiStatusCard';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="border-b border-slate-200 dark:border-slate-800 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                JobStreet Quick Apply Automation
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm">
                Web Dashboard • Development Environment Setup (Phase 1)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                Phase 1 Active
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                Foundation Ready
              </span>
            </div>
          </div>
        </header>

        {/* System Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Application 1</div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Chrome Extension</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Manifest V3 • Vite + React + TypeScript</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Application 2</div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Web Dashboard</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Next.js App Router • Tailwind CSS</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Application 3</div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Backend API</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Laravel 11 • MySQL / MariaDB</p>
          </div>
        </div>

        {/* API Status Component */}
        <ApiStatusCard />

        {/* Integration Architecture Summary */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm text-sm space-y-3">
          <h3 className="font-semibold text-slate-900 dark:text-white">Integration Configuration</h3>
          <ul className="list-disc list-inside space-y-1.5 text-slate-600 dark:text-slate-300">
            <li><strong>Extension:</strong> Communicates directly with backend on <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">http://127.0.0.1:8000/api</code></li>
            <li><strong>Dashboard:</strong> Accesses backend on <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">http://127.0.0.1:8000/api</code> via <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">NEXT_PUBLIC_API_BASE_URL</code></li>
            <li><strong>Database:</strong> Dedicated <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">jobstreet_quick_apply</code> schema on MySQL port 3306</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
