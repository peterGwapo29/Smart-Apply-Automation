'use client';

import { useState, useRef, useEffect } from 'react';
import { useTheme, ThemePreference } from './ThemeProvider';

export default function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [menuOpen]);

  const options: { value: ThemePreference; label: string; icon: string }[] = [
    { value: 'light', label: 'Light', icon: 'sun' },
    { value: 'dark', label: 'Dark', icon: 'moon' },
    { value: 'system', label: 'System', icon: 'system' },
  ];

  const renderIcon = (iconName: string, className = 'w-4 h-4') => {
    if (iconName === 'sun') {
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      );
    }
    if (iconName === 'moon') {
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      );
    }
    // system
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    );
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border border-slate-200 dark:border-[#293548] bg-white dark:bg-[#111827] text-slate-700 dark:text-[#CBD5E1] hover:text-slate-900 dark:hover:text-[#F3F4F6] hover:bg-slate-100 dark:hover:bg-[#172033] transition-colors flex items-center gap-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        aria-label={`Current theme: ${theme}. Click to switch theme.`}
        title={`Theme: ${theme.toUpperCase()} (${resolvedTheme} active)`}
      >
        <span className="text-amber-500 dark:text-blue-400">
          {renderIcon(resolvedTheme === 'dark' ? 'moon' : 'sun', 'w-3.5 h-3.5')}
        </span>
        <span className="hidden sm:inline capitalize">{theme}</span>
        <svg className="w-3 h-3 opacity-60 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {menuOpen && (
        <div className="absolute right-0 mt-1.5 w-36 rounded-xl border border-slate-200 dark:border-[#293548] bg-white dark:bg-[#172033] shadow-lg py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
          {options.map((opt) => {
            const isSelected = theme === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => {
                  setTheme(opt.value);
                  setMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium transition-colors ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold'
                    : 'text-slate-700 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#1E293B] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-400'}>
                    {renderIcon(opt.icon, 'w-3.5 h-3.5')}
                  </span>
                  <span>{opt.label}</span>
                </div>
                {isSelected && (
                  <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
