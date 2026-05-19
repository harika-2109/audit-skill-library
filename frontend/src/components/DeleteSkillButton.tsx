'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { deleteSkill } from '@/lib/api';

export function DeleteSkillButton({ name }: { name: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onClick = async () => {
    if (!confirm(`Delete skill "${name}"? It will be soft-deleted and recoverable.`)) {
      return;
    }
    setLoading(true);
    try {
      await deleteSkill(name);
      router.push('/');
      router.refresh();
    } catch (e) {
      alert(`Failed to delete: ${e instanceof Error ? e.message : 'unknown error'}`);
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="px-4 py-2 text-sm rounded border border-line text-brand hover:bg-red-50 inline-flex items-center gap-1 disabled:opacity-50"
    >
      🗑 {loading ? 'Deleting…' : 'Delete'}
    </button>
  );
}
