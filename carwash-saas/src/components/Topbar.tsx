'use client';

import { useLocale } from 'next-intl';
import LocaleSwitcher from './LocaleSwitcher';
import { logoutAction } from '@/lib/session-actions';

interface Props {
  name: string;
  roleLabel: string;
}

export default function Topbar({ name, roleLabel }: Props) {
  const locale = useLocale();

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-end px-4 sticky top-0 z-10 gap-3">
      <LocaleSwitcher />
      <div className="text-right leading-tight hidden sm:block">
        <div className="text-sm font-semibold">{name}</div>
        <div className="text-xs text-slate-500">{roleLabel}</div>
      </div>
      <form action={logoutAction.bind(null, locale)}>
        <button type="submit" className="btn btn-ghost" style={{ padding: '0.4rem 0.7rem' }}>
          ⎋
        </button>
      </form>
    </header>
  );
}
