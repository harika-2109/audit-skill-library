'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function SearchBar({ initial }: { initial: string }) {
  const [q, setQ] = useState(initial);
  const router = useRouter();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = q.trim();
    router.push(trimmed ? `/?q=${encodeURIComponent(trimmed)}` : '/');
  };

  return (
    <form onSubmit={submit} className="relative">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search skills by name or description…"
        className="w-full px-4 py-2.5 pl-10 border border-line rounded-md text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
      />
      <svg
        className="absolute left-3 top-3 w-4 h-4 text-slate1"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-4.35-4.35M11 17a6 6 0 100-12 6 6 0 000 12z"
        />
      </svg>
    </form>
  );
}
