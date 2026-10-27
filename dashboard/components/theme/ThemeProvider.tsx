'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read persisted preference
    const stored = (localStorage.getItem('smart_apply_theme') as ThemePreference) || 'system';
    setThemeState(stored);

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const computeResolved = (pref: ThemePreference): ResolvedTheme => {
      if (pref === 'dark') return 'dark';
      if (pref === 'light') return 'light';
      return mql.matches ? 'dark' : 'light';
    };

    const initialResolved = computeResolved(stored);
    setResolvedTheme(initialResolved);

    // Apply class to html root
    if (initialResolved === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    setMounted(true);

    const handleMediaChange = (e: MediaQueryListEvent) => {
      const currentStored = (localStorage.getItem('smart_apply_theme') as ThemePreference) || 'system';
      if (currentStored === 'system') {
        const next = e.matches ? 'dark' : 'light';
        setResolvedTheme(next);
        if (next === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };

    mql.addEventListener('change', handleMediaChange);
    return () => mql.removeEventListener('change', handleMediaChange);
  }, []);

  const setTheme = (newTheme: ThemePreference) => {
    setThemeState(newTheme);
    localStorage.setItem('smart_apply_theme', newTheme);

    let nextResolved: ResolvedTheme = 'light';
    if (newTheme === 'dark') {
      nextResolved = 'dark';
    } else if (newTheme === 'light') {
      nextResolved = 'light';
    } else {
      nextResolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    setResolvedTheme(nextResolved);
    if (nextResolved === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
