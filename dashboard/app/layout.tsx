import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'JobStreet Quick Apply Automation',
  description: 'Manage resume ingestion, candidate profiles, and job application preferences.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased font-sans flex flex-col">
        {/* Navigation Bar */}
        <nav className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center gap-6">
                <Link href="/" className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                    J
                  </div>
                  <span className="font-bold text-lg text-slate-900 dark:text-white hidden sm:inline">
                    JobStreet Quick Apply
                  </span>
                </Link>

                <div className="flex items-center space-x-1 sm:space-x-3 text-sm font-medium">
                  <Link
                    href="/"
                    className="px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    System Status
                  </Link>
                  <Link
                    href="/resumes"
                    className="px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    Resumes & Upload
                  </Link>
                  <Link
                    href="/profile"
                    className="px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    Candidate Profile
                  </Link>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Phase 2 Active
                </span>
              </div>
            </div>
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1">
          {children}
        </div>

        {/* Footer */}
        <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
          JobStreet Quick Apply Automation Platform • Pair Programming Suite
        </footer>
      </body>
    </html>
  );
}
