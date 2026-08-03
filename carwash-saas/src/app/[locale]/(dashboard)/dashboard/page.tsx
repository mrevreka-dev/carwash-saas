import type { CSSProperties } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { prisma } from '@/lib/db';
import { getPageContext } from '@/lib/page-context';
import { getFinanceSummary } from '@/lib/services/finance';
import { getOperatorOverview, type BusinessStatus } from '@/lib/services/operator';
import { formatMoney, formatDateTime, formatDate } from '@/lib/format';
import { Link } from '@/i18n/navigation';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import NoBusiness from '@/components/NoBusiness';

const STATUS_STYLE: Record<BusinessStatus, CSSProperties> = {
  ACTIVE: { background: '#dcfce7', color: '#166534' },
  PASSIVE: { background: '#f1f5f9', color: '#475569' },
  EXPIRED: { background: '#fee2e2', color: '#991b1b' }
};

export default async function DashboardPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { businessId, session } = await getPageContext(locale);
  const t = await getTranslations('dashboard');
  const tb = await getTranslations('business');
  const tc = await getTranslations('common');
  const tStatus = await getTranslations('status');

  // ---- SUPER_ADMIN: platform operator dashboard ----
  if (session.role === 'SUPER_ADMIN') {
    const ov = await getOperatorOverview();
    const currency = ov.rows[0]?.business.currency ?? 'TRY';
    const statusLabel = (s: BusinessStatus) =>
      s === 'ACTIVE' ? tc('active') : s === 'PASSIVE' ? tb('passive') : tb('expired');

    return (
      <div className="space-y-6">
        <PageHeader title={t('title')} subtitle={t('welcome', { name: session.name })} />

        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <StatCard label={tb('totalBusinesses')} value={ov.totalBusinesses} accent="brand" />
          <StatCard label={tb('activeBusinesses')} value={ov.activeBusinesses} accent="green" />
          <StatCard label={tb('todayWashes')} value={ov.todayWashesTotal} />
          <StatCard label={tb('monthRevenue')} value={formatMoney(ov.monthRevenueTotal, currency, locale)} accent="green" />
        </div>

        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 font-semibold text-sm flex items-center justify-between">
            <span>{tb('byBusiness')}</span>
            <Link href="/businesses" className="text-brand-600 text-xs">
              {tb('title')} →
            </Link>
          </div>
          <table className="data">
            <thead>
              <tr>
                <th>{tb('name')}</th>
                <th>{tc('status')}</th>
                <th>{tb('subscriptionEnds')}</th>
                <th>{tb('todayWashes')}</th>
                <th>{tb('monthRevenue')}</th>
              </tr>
            </thead>
            <tbody>
              {ov.rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-slate-400 py-8">
                    {tb('empty')}
                  </td>
                </tr>
              )}
              {ov.rows.map(({ business: b, status, todayWashes, monthRevenue }) => (
                <tr key={b.id}>
                  <td className="font-semibold">{b.name}</td>
                  <td>
                    <span className="badge" style={STATUS_STYLE[status]}>
                      {statusLabel(status)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap">
                    {b.subscriptionEndsAt ? formatDate(b.subscriptionEndsAt, locale) : tb('unlimited')}
                  </td>
                  <td className="font-semibold">{todayWashes}</td>
                  <td className="font-medium">{formatMoney(monthRevenue, b.currency, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ---- OWNER / STAFF: single-business operational dashboard ----
  if (!businessId) return <NoBusiness />;
  const bId = businessId;

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [business, summary, todayCount, customerCount, employeeCount, upcoming, recentTxns] =
    await Promise.all([
      prisma.business.findUnique({ where: { id: bId }, select: { currency: true } }),
      getFinanceSummary(bId, monthStart),
      prisma.appointment.count({
        where: { businessId: bId, startAt: { gte: dayStart, lt: dayEnd } }
      }),
      prisma.customer.count({ where: { businessId: bId } }),
      prisma.employee.count({ where: { businessId: bId, isActive: true } }),
      prisma.appointment.findMany({
        where: { businessId: bId, startAt: { gte: now } },
        orderBy: { startAt: 'asc' },
        take: 8,
        include: { customer: true, service: true }
      }),
      prisma.transaction.findMany({
        where: { businessId: bId },
        orderBy: { occurredAt: 'desc' },
        take: 6
      })
    ]);
  const currency = business?.currency ?? 'TRY';

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} subtitle={t('welcome', { name: session.name })} />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('todayAppointments')} value={todayCount} accent="brand" />
        <StatCard label={t('monthlyIncome')} value={formatMoney(summary.income, currency, locale)} accent="green" />
        <StatCard label={t('monthlyExpense')} value={formatMoney(summary.expense, currency, locale)} accent="red" />
        <StatCard
          label={t('netProfit')}
          value={formatMoney(summary.net, currency, locale)}
          accent={summary.net >= 0 ? 'green' : 'red'}
        />
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('totalCustomers')} value={customerCount} />
        <StatCard label={t('activeEmployees')} value={employeeCount} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card">
          <div className="px-4 py-3 border-b border-slate-100 font-semibold text-sm">
            {t('upcoming')}
          </div>
          <div className="divide-y divide-slate-100">
            {upcoming.length === 0 && (
              <div className="p-6 text-center text-slate-400 text-sm">
                {t('noAppointmentsToday')}
              </div>
            )}
            {upcoming.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="text-sm font-medium">
                    {a.customer ? `${a.customer.firstName} ${a.customer.lastName ?? ''}` : a.contactName ?? '—'}
                  </div>
                  <div className="text-xs text-slate-500">
                    {a.service?.name ?? ''} · {formatDateTime(a.startAt, locale)}
                  </div>
                </div>
                <StatusBadge status={a.status} label={tStatus(a.status)} />
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="px-4 py-3 border-b border-slate-100 font-semibold text-sm">
            {t('recentTransactions')}
          </div>
          <div className="divide-y divide-slate-100">
            {recentTxns.length === 0 && (
              <div className="p-6 text-center text-slate-400 text-sm">—</div>
            )}
            {recentTxns.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between px-4 py-3">
                <div className="text-sm">{tx.description ?? (tx.type === 'INCOME' ? '+' : '−')}</div>
                <div
                  className="text-sm font-semibold"
                  style={{ color: tx.type === 'INCOME' ? '#15803d' : '#dc2626' }}
                >
                  {tx.type === 'INCOME' ? '+' : '−'}
                  {formatMoney(tx.amount, currency, locale)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
