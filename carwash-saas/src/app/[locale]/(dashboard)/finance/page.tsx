import { getTranslations, setRequestLocale } from 'next-intl/server';
import { prisma } from '@/lib/db';
import { guardTenantPage } from '@/lib/page-context';
import { getFinanceSummary } from '@/lib/services/finance';
import { formatMoney, formatDate } from '@/lib/format';
import { can } from '@/lib/rbac';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import FormPanel, { Field } from '@/components/FormPanel';
import DeleteForm from '@/components/DeleteForm';
import NoBusiness from '@/components/NoBusiness';
import { createTransactionAction, deleteTransactionAction } from './actions';

const EXPENSE_CATEGORIES = [
  'SALARY',
  'RENT',
  'UTILITIES',
  'SUPPLIES',
  'MAINTENANCE',
  'MARKETING',
  'TAX',
  'OTHER'
] as const;

export default async function FinancePage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { businessId, session } = await guardTenantPage(locale);
  const t = await getTranslations('finance');
  const tc = await getTranslations('common');
  const tMethod = await getTranslations('method');
  const tCat = await getTranslations('category');

  if (!businessId) return <NoBusiness />;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [business, summary, txns, employees, bankAccounts] = await Promise.all([
    prisma.business.findUnique({ where: { id: businessId }, select: { currency: true } }),
    getFinanceSummary(businessId, monthStart),
    prisma.transaction.findMany({
      where: { businessId },
      orderBy: { occurredAt: 'desc' },
      take: 100,
      include: { employee: true }
    }),
    prisma.employee.findMany({ where: { businessId }, orderBy: { firstName: 'asc' } }),
    prisma.bankAccount.findMany({ where: { businessId }, orderBy: { name: 'asc' } })
  ]);
  const currency = business?.currency ?? 'TRY';
  const canManage = can(session.role, 'finance.manage');
  const nowLocal = new Date().toISOString().slice(0, 16);

  return (
    <div className="space-y-5">
      <PageHeader title={t('title')} />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('income')} value={formatMoney(summary.income, currency, locale)} accent="green" />
        <StatCard label={t('expense')} value={formatMoney(summary.expense, currency, locale)} accent="red" />
        <StatCard label="Net" value={formatMoney(summary.net, currency, locale)} accent={summary.net >= 0 ? 'green' : 'red'} />
        <StatCard
          label={`${t('cashTotal')} / ${t('cardTotal')}`}
          value={
            <span className="text-base">
              {formatMoney(summary.byMethod['CASH'] ?? 0, currency, locale)} ·{' '}
              {formatMoney(summary.byMethod['CREDIT_CARD'] ?? 0, currency, locale)}
            </span>
          }
          accent="brand"
        />
      </div>

      {canManage && (
        <FormPanel title={t('new')} action={createTransactionAction} submitLabel={tc('create')}>
          <Field label={t('type')}>
            <select name="type" className="input" defaultValue="INCOME">
              <option value="INCOME">{t('income')}</option>
              <option value="EXPENSE">{t('expense')}</option>
            </select>
          </Field>
          <Field label={tc('amount')}>
            <input name="amount" type="number" step="0.01" min={0} required className="input" />
          </Field>
          <Field label={t('method')}>
            <select name="method" className="input" defaultValue="CASH">
              <option value="CASH">{tMethod('CASH')}</option>
              <option value="CREDIT_CARD">{tMethod('CREDIT_CARD')}</option>
              <option value="BANK_TRANSFER">{tMethod('BANK_TRANSFER')}</option>
              <option value="OTHER">{tMethod('OTHER')}</option>
            </select>
          </Field>
          <Field label={t('category')}>
            <select name="category" className="input" defaultValue="OTHER">
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {tCat(c)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('occurredAt')}>
            <input name="occurredAt" type="datetime-local" required defaultValue={nowLocal} className="input" />
          </Field>
          <Field label={t('relatedEmployee')}>
            <select name="employeeId" className="input" defaultValue="">
              <option value="">—</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName ?? ''}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('relatedBank')}>
            <select name="bankAccountId" className="input" defaultValue="">
              <option value="">—</option>
              {bankAccounts.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('description')} full>
            <input name="description" className="input" />
          </Field>
        </FormPanel>
      )}

      <div className="card overflow-hidden">
        <table className="data">
          <thead>
            <tr>
              <th>{tc('date')}</th>
              <th>{t('type')}</th>
              <th>{t('description')}</th>
              <th>{t('method')}</th>
              <th className="text-right">{tc('amount')}</th>
              {canManage && <th></th>}
            </tr>
          </thead>
          <tbody>
            {txns.length === 0 && (
              <tr>
                <td colSpan={canManage ? 6 : 5} className="text-center text-slate-400 py-8">
                  {t('empty')}
                </td>
              </tr>
            )}
            {txns.map((tx) => (
              <tr key={tx.id}>
                <td className="whitespace-nowrap">{formatDate(tx.occurredAt, locale)}</td>
                <td>
                  <span
                    className="badge"
                    style={
                      tx.type === 'INCOME'
                        ? { background: '#dcfce7', color: '#166534' }
                        : { background: '#fee2e2', color: '#991b1b' }
                    }
                  >
                    {tx.type === 'INCOME' ? t('income') : t('expense')}
                  </span>
                </td>
                <td>
                  {tx.description ?? '—'}
                  {tx.category && (
                    <span className="text-xs text-slate-400"> · {tCat(tx.category)}</span>
                  )}
                </td>
                <td>{tMethod(tx.method)}</td>
                <td className="text-right font-semibold" style={{ color: tx.type === 'INCOME' ? '#15803d' : '#dc2626' }}>
                  {tx.type === 'INCOME' ? '+' : '−'}
                  {formatMoney(tx.amount, currency, locale)}
                </td>
                {canManage && (
                  <td className="text-right">
                    <DeleteForm action={deleteTransactionAction} id={tx.id} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
