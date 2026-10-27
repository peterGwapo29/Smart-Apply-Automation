import type { Metadata } from 'next';
import './globals.css';
import AppHeader from '@/components/layout/AppHeader';
import { ThemeProvider } from '@/components/theme/ThemeProvider';

export const metadata: Metadata = {
  title: 'Smart Apply • Automation Suite',
  description: 'AI-assisted job discovery, prioritization, candidate matching, and application workflow automation.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function() {
              try {
                var stored = localStorage.getItem('smart_apply_theme');
                var isDark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches) || (stored === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                if (isDark) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            })()`,
          }}
        />
      </head>
      <body className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-[#0F172A] dark:text-[#F3F4F6] antialiased font-sans flex flex-col selection:bg-blue-100 dark:selection:bg-blue-900/40">
        <ThemeProvider>
          {/* Navigation Bar */}
          <AppHeader />

          {/* Main Content */}
          <div className="flex-1">
            {children}
          </div>

          {/* Footer */}
          <footer className="border-t border-slate-200/80 dark:border-[#293548] py-6 text-center text-xs text-slate-500 dark:text-[#94A3B8]">
            Smart Apply Automation Suite • Minimalist AI Job Dashboard
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
