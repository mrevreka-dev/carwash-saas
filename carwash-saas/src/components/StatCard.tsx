import type { ReactNode } from 'react';

export default function StatCard({
  label,
  value,
  accent = 'slate',
  hint
}: {
  label: string;
  value: ReactNode;
  accent?: 'slate' | 'green' | 'red' | 'brand';
  hint?: string;
}) {
  const colors: Record<string, string> = {
    slate: '#0f172a',
    green: '#15803d',
    red: '#dc2626',
    brand: '#1a5ff0'
  };
  return (
    <div className="card p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="text-2xl font-bold mt-1" style={{ color: colors[accent] }}>
        {value}
      </div>
      {hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
    </div>
  );
}
