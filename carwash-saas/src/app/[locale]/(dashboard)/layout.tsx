import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getSession } from '@/lib/auth';
import { getActiveBusinessId } from '@/lib/tenant';
import { prisma } from '@/lib/db';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';

export default async function DashboardLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);

  const tRole = await getTranslations('role');
  const isSuperAdmin = session.role === 'SUPER_ADMIN';

  const businesses = isSuperAdmin
    ? await prisma.business.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true }
      })
    : [];
  const activeBusinessId = await getActiveBusinessId(session);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role={session.role} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar
          name={session.name}
          roleLabel={tRole(session.role)}
          isSuperAdmin={isSuperAdmin}
          businesses={businesses}
          activeBusinessId={activeBusinessId}
        />
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
