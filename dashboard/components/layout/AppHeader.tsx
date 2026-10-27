'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { fetchHealthStatus, HealthCheckResponse } from '@/lib/api';
import ThemeToggle from '@/components/theme/ThemeToggle';

function AppHeaderContent() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);

  useEffect(() => {
    fetchHealthStatus()
      .then(setHealth)
      .catch(() => setHealth({ status: 'error', service: 'API Offline' }));
  }, []);

  const navLinks = [
    { href: '/jobs', label: 'Job Discovery' },
    { href: '/profile', label: 'Candidate Profile' },
    { href: '/resumes', label: 'Resumes' },
    { href: '/', label: 'System Status' },
  ];

  const isConnected = health?.status === 'ok';

  return (
    <header className="border-b border-slate-200 dark:border-[#293548] bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-15">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-8">
            <Link href="/jobs" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-base shadow-xs group-hover:bg-blue-700 transition-colors">
                S
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-[#F3F4F6] leading-tight">
                  Smart Apply
                </span>
                <span className="text-[10px] text-slate-500 dark:text-[#94A3B8] font-medium tracking-wide uppercase">
                  Automation Suite
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1 text-xs font-semibold">
              {navLinks.map((link) => {
                const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-slate-100 dark:bg-[#172033] text-blue-600 dark:text-blue-400 font-bold border border-slate-200/60 dark:border-[#293548]'
                        : 'text-slate-600 dark:text-[#CBD5E1] hover:text-slate-900 dark:hover:text-[#F3F4F6] hover:bg-slate-100 dark:hover:bg-[#172033]'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Action / Status Area */}
          <div className="flex items-center gap-2.5">
            {/* Live API Health Dot */}
            <div
              className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                isConnected
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/60'
              }`}
              title={health ? `API: ${health.service} (${health.status})` : 'Checking connectivity...'}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span className="capitalize">{isConnected ? 'System Ready' : 'API Offline'}</span>
            </div>

            {/* Theme Toggle Button */}
            <ThemeToggle />

            {/* Quick Action Button */}
            <Link
              href="/jobs/import"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              Import Job
            </Link>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#172033] transition-colors"
              aria-label="Toggle navigation menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-slate-200 dark:border-[#293548] space-y-1 text-sm font-medium">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-lg ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold'
                      : 'text-slate-700 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#172033]'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="pt-2 flex items-center justify-between px-3 text-xs text-slate-500 dark:text-[#94A3B8]">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                {isConnected ? 'API Connected' : 'Offline'}
              </span>
              <Link
                href="/jobs/import"
                onClick={() => setMobileMenuOpen(false)}
                className="text-blue-600 dark:text-blue-400 font-semibold"
              >
                + Import Job
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export default function AppHeader() {
  return (
    <Suspense
      fallback={
        <header className="border-b border-slate-200 dark:border-[#293548] bg-white/95 dark:bg-[#111827]/95 h-15 flex items-center px-4 max-w-7xl mx-auto" />
      }
    >
      <AppHeaderContent />
    </Suspense>
  );
}
