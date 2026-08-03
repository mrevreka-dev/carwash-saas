'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import LocaleSwitcher from './LocaleSwitcher';
import { logoutAction, setActiveBusinessAction } from '@/lib/session-actions';

interface Props {
  name: string;
  roleLabel: string;
  isSuperAdmin: boolean;
  businesses: { id: string; name: string }[];
  activeBusinessId: string | null;
}

export default function Topbar({
  name,
  roleLabel,
  isSuperAdmin,
  businesses,
  activeBusinessId
}: Props) {
  const t = useTranslations('business');
  const locale = useLocale();
  const router = useRouter();

  async function onSelectBusiness(e: React.ChangeEvent<HTMLSelectElement>) {
    await setActiveBusinessAction(e.target.value);
    router.refresh();
  }

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        {isSuperAdmin && (
          <select
            aria-label={t('activeBusiness')}
            value={activeBusinessId ?? ''}
            onChange={onSelectBusiness}
            className="input"
            style={{ width: 'auto' }}
          >
            <option value="" disabled>
              {t('activeBusiness')}…
            </option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex items-center gap-3">
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
      </div>
    </header>
  );
}
