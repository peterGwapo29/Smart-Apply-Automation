import ApiStatusCard from '@/components/ApiStatusCard';

export default function Home() {
  return (
    <main className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="border-b border-slate-200 dark:border-[#293548] pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-[#F3F4F6] tracking-tight">
                JobStreet Quick Apply Automation
              </h1>
              <p className="text-slate-600 dark:text-[#94A3B8] mt-1 text-sm">
                Web Dashboard • Multi-Platform Automation Suite
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-900 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Phase 9 Active
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                System Ready
              </span>
            </div>
          </div>
        </header>

        {/* System Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#293548] rounded-xl p-5 shadow-sm">
            <div className="text-xs font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider mb-1">Application 1</div>
            <h3 className="font-bold text-slate-900 dark:text-[#F3F4F6] text-base">Chrome Extension</h3>
            <p className="text-xs text-slate-600 dark:text-[#94A3B8] mt-1">Manifest V3 • Vite + React + TypeScript</p>
          </div>
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#293548] rounded-xl p-5 shadow-sm">
            <div className="text-xs font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider mb-1">Application 2</div>
            <h3 className="font-bold text-slate-900 dark:text-[#F3F4F6] text-base">Web Dashboard</h3>
            <p className="text-xs text-slate-600 dark:text-[#94A3B8] mt-1">Next.js App Router • Tailwind CSS v4</p>
          </div>
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#293548] rounded-xl p-5 shadow-sm">
            <div className="text-xs font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider mb-1">Application 3</div>
            <h3 className="font-bold text-slate-900 dark:text-[#F3F4F6] text-base">Backend API</h3>
            <p className="text-xs text-slate-600 dark:text-[#94A3B8] mt-1">Laravel REST API • MySQL</p>
          </div>
        </div>

        {/* API Status Component */}
        <ApiStatusCard />

        {/* Integration Architecture Summary */}
        <section className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#293548] rounded-xl p-6 shadow-sm text-sm space-y-3">
          <h3 className="font-bold text-slate-900 dark:text-[#F3F4F6]">Integration Configuration</h3>
          <ul className="list-disc list-inside space-y-1.5 text-slate-700 dark:text-[#CBD5E1] text-xs">
            <li><strong>Extension:</strong> Communicates directly with backend on <code className="text-xs bg-slate-100 dark:bg-[#1E293B] border border-slate-200 dark:border-[#293548] px-1.5 py-0.5 rounded">http://127.0.0.1:8000/api</code></li>
            <li><strong>Dashboard:</strong> Accesses backend on <code className="text-xs bg-slate-100 dark:bg-[#1E293B] border border-slate-200 dark:border-[#293548] px-1.5 py-0.5 rounded">http://127.0.0.1:8000/api</code> via <code className="text-xs bg-slate-100 dark:bg-[#1E293B] border border-slate-200 dark:border-[#293548] px-1.5 py-0.5 rounded">NEXT_PUBLIC_API_BASE_URL</code></li>
            <li><strong>Database:</strong> Dedicated <code className="text-xs bg-slate-100 dark:bg-[#1E293B] border border-slate-200 dark:border-[#293548] px-1.5 py-0.5 rounded">jobstreet_quick_apply</code> schema on MySQL port 3306</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
