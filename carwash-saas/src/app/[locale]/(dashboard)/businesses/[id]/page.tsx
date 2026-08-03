import { redirect, notFound } from 'next/navigation';
import type { CSSProperties } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { prisma } from '@/lib/db';
import { getPageContext } from '@/lib/page-context';
import { getFinanceSummary } from '@/lib/services/finance';
import { businessStatus, type BusinessStatus } from '@/lib/services/operator';
import { formatMoney, formatDate, formatDateTime } from '@/lib/format';
import { Link } from '@/i18n/navigation';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';

const STATUS_STYLE: Record<BusinessStatus, CSSProperties> = {
  ACTIVE: { background: '#dcfce7', color: '#166534' },
  PASSIVE: { background: '#f1f5f9', color: '#475569' },
  EXPIRED: { background: '#fee2e2', color: '#991b1b' }
};

export default async function BusinessDetailPage({
  params
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const { session } = await getPageContext(locale);
  if (session.role !== 'SUPER_ADMIN') redirect(`/${locale}/dashboard`);

  const t = await getTranslations('business');
  const tc = await getTranslations('common');
  const td = await getTranslations('dashboard');
  const ta = await getTranslations('appointments');
  const tStatus = await getTranslations('status');

  const business = await prisma.business.findUnique({ where: { id } });
  if (!business) notFound();

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [owner, summary, todayWashes, totalAppointments, customerCount, employeeCount, recentAppts] =
    await Promise.all([
      prisma.user.findFirst({
        where: { businessId: id, role: 'OWNER' },
        select: { email: true, name: true }
      }),
      getFinanceSummary(id, monthStart),
      prisma.appointment.count({
        where: { businessId: id, status: 'COMPLETED', startAt: { gte: dayStart, lt: dayEnd } }
      }),
      prisma.appointment.count({ where: { businessId: id } }),
      prisma.customer.count({ where: { businessId: id } }),
      prisma.employee.count({ where: { businessId: id, isActive: true } }),
      prisma.appointment.findMany({
        where: { businessId: id },
        orderBy: { startAt: 'desc' },
        take: 12,
        include: { customer: true, service: true }
      })
    ]);

  const status = businessStatus(business);
  const currency = business.currency;
  const statusLabel =
    status === 'ACTIVE' ? tc('active') : status === 'PASSIVE' ? t('passive') : t('expired');

  return (
    <div className="space-y-5">
      <div>
        <Link href="/businesses" className="text-brand-600 text-sm">
          ← {t('title')}
        </Link>
      </div>
      <PageHeader
        title={business.name}
        subtitle={[business.city, owner?.email].filter(Boolean).join(' · ')}
        action={
          <span className="badge" style={STATUS_STYLE[status]}>
            {statusLabel}
          </span>
        }
      />

      {/* Tenant info */}
      <div className="card p-4 grid gap-3 sm:grid-cols-3 text-sm">
        <div>
          <div className="text-xs text-slate-500">{t('plan')}</div>
          <div className="font-semibold capitalize">{business.plan}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">{t('subscriptionEnds')}</div>
          <div className="font-semibold">
            {business.subscriptionEndsAt ? formatDate(business.subscriptionEndsAt, locale) : t('unlimited')}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500">{t('bookingLink')}</div>
          <a
            href={`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/${locale}/book/${business.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-brand-600 underline break-all"
          >
            /{locale}/book/{business.slug}
          </a>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('todayWashes')} value={todayWashes} accent="brand" />
        <StatCard label={t('monthRevenue')} value={formatMoney(summary.income, currency, locale)} accent="green" />
        <StatCard label={t('totalAppointments')} value={totalAppointments} />
        <StatCard label={td('totalCustomers')} value={customerCount} />
      </div>
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard label={td('monthlyExpense')} value={formatMoney(summary.expense, currency, locale)} accent="red" />
        <StatCard label={td('netProfit')} value={formatMoney(summary.net, currency, locale)} accent={summary.net >= 0 ? 'green' : 'red'} />
        <StatCard label={td('activeEmployees')} value={employeeCount} />
      </div>

      {/* Recent appointments (read-only) */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 font-semibold text-sm">
          {ta('title')}
        </div>
        <table className="data">
          <thead>
            <tr>
              <th>{ta('start')}</th>
              <th>{ta('customer')}</th>
              <th>{ta('service')}</th>
              <th>{ta('price')}</th>
              <th>{tc('status')}</th>
            </tr>
          </thead>
          <tbody>
            {recentAppts.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-slate-400 py-8">
                  {ta('empty')}
                </td>
              </tr>
            )}
            {recentAppts.map((a) => (
              <tr key={a.id}>
                <td className="whitespace-nowrap">{formatDateTime(a.startAt, locale)}</td>
                <td>
                  {a.customer
                    ? `${a.customer.firstName} ${a.customer.lastName ?? ''}`
                    : a.contactName || ta('walkIn')}
                </td>
                <td>{a.service?.name ?? '—'}</td>
                <td>{a.price ? formatMoney(a.price, currency, locale) : '—'}</td>
                <td>
                  <StatusBadge status={a.status} label={tStatus(a.status)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
