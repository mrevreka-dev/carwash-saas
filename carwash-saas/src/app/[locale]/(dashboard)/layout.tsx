import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getSession } from '@/lib/auth';
import { getActiveBusinessId } from '@/lib/tenant';
import { prisma } from '@/lib/db';
import { canBusinessLogin } from '@/lib/services/operator';
import { logoutAction } from '@/lib/session-actions';
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

  // Enforce subscription/active status for owners & staff on every request,
  // so a business deactivated mid-session loses access immediately.
  if (!isSuperAdmin && session.businessId) {
    const biz = await prisma.business.findUnique({
      where: { id: session.businessId },
      select: { isActive: true, subscriptionEndsAt: true }
    });
    if (!biz || !canBusinessLogin(biz)) {
      const tAuth = await getTranslations('auth');
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
          <div className="card p-8 max-w-md text-center">
            <div className="text-4xl mb-3">🔒</div>
            <p className="text-slate-700">{tAuth('accountInactive')}</p>
            <form action={logoutAction.bind(null, locale)} className="mt-5">
              <button className="btn btn-ghost">↩</button>
            </form>
          </div>
        </div>
      );
    }
  }

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
