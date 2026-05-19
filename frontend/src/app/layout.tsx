import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Internal Audit Skill Library',
  description: 'Skill library and chat for Internal Audit teams',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-line bg-white sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <span
                className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-brand text-white font-semibold text-sm"
                aria-hidden="true"
              >
                IA
              </span>
              <span className="font-semibold text-ink text-[15px]">
                Internal Audit Skill Library
              </span>
            </Link>
            <nav className="flex items-center gap-6 text-sm">
              <Link href="/" className="text-slate1 hover:text-brand transition">
                Catalog
              </Link>
              <Link href="/skills/wizard" className="text-slate1 hover:text-brand transition">
                Create skill
              </Link>
              <Link href="/chat" className="text-slate1 hover:text-brand transition">
                Chat
              </Link>
            </nav>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
        <footer className="border-t border-line bg-paper mt-12">
          <div className="max-w-6xl mx-auto px-6 py-4 text-xs text-slate1 flex justify-between">
            <span>Internal Audit Skill Library · v0.1.0</span>
            <span>All actions audit-logged</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
