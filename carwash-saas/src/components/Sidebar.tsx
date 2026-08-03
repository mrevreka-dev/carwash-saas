'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import type { Role } from '@prisma/client';

interface NavItem {
  href: string;
  key: string;
  roles: Role[];
  icon: string;
}

const ITEMS: NavItem[] = [
  // SUPER_ADMIN (platform operator) sees only the operator console:
  { href: '/dashboard', key: 'dashboard', roles: ['SUPER_ADMIN', 'OWNER', 'STAFF'], icon: '▤' },
  { href: '/businesses', key: 'businesses', roles: ['SUPER_ADMIN'], icon: '◆' },
  // Tenant-scoped operational modules — owners & staff only:
  { href: '/appointments', key: 'appointments', roles: ['OWNER', 'STAFF'], icon: '◷' },
  { href: '/customers', key: 'customers', roles: ['OWNER', 'STAFF'], icon: '☺' },
  { href: '/vehicles', key: 'vehicles', roles: ['OWNER', 'STAFF'], icon: '⛟' },
  { href: '/services', key: 'services', roles: ['OWNER'], icon: '≡' },
  { href: '/employees', key: 'employees', roles: ['OWNER'], icon: '⚇' },
  { href: '/finance', key: 'finance', roles: ['OWNER', 'STAFF'], icon: '₺' },
  { href: '/bank', key: 'bank', roles: ['OWNER'], icon: '▦' }
];

export default function Sidebar({ role }: { role: Role }) {
  const t = useTranslations('nav');
  const tApp = useTranslations('app');
  const pathname = usePathname();

  const items = ITEMS.filter((i) => i.roles.includes(role));

  return (
    <aside className="w-60 shrink-0 bg-[#0f1a30] text-slate-200 min-h-screen sticky top-0 hidden md:flex flex-col">
      <div className="px-5 py-5 flex items-center gap-2 border-b border-white/10">
        <span className="h-8 w-8 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold">
          ⌾
        </span>
        <span className="font-bold text-sm leading-tight">{tApp('name')}</span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                active
                  ? 'bg-brand-600 text-white font-semibold'
                  : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              <span className="w-5 text-center opacity-80">{item.icon}</span>
              {t(item.key)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
