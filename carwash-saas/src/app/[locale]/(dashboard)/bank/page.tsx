import { getTranslations, setRequestLocale } from 'next-intl/server';
import { prisma } from '@/lib/db';
import { getPageContext } from '@/lib/page-context';
import { getBankAccountBalance } from '@/lib/services/finance';
import { formatMoney, formatDate } from '@/lib/format';
import PageHeader from '@/components/PageHeader';
import FormPanel, { Field } from '@/components/FormPanel';
import DeleteForm from '@/components/DeleteForm';
import NoBusiness from '@/components/NoBusiness';
import {
  createBankAccountAction,
  deleteBankAccountAction,
  createBankTransactionAction,
  deleteBankTransactionAction
} from './actions';

export default async function BankPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { businessId } = await getPageContext(locale);
  const t = await getTranslations('bank');
  const tc = await getTranslations('common');

  if (!businessId) return <NoBusiness />;

  const [business, accounts, txns] = await Promise.all([
    prisma.business.findUnique({ where: { id: businessId }, select: { currency: true } }),
    prisma.bankAccount.findMany({ where: { businessId }, orderBy: { createdAt: 'desc' } }),
    prisma.bankTransaction.findMany({
      where: { businessId },
      orderBy: { occurredAt: 'desc' },
      take: 100,
      include: { bankAccount: true }
    })
  ]);
  const currency = business?.currency ?? 'TRY';

  const balances = await Promise.all(
    accounts.map(async (a) => ({ id: a.id, balance: await getBankAccountBalance(a.id) }))
  );
  const balanceMap = Object.fromEntries(balances.map((b) => [b.id, b.balance]));
  const nowLocal = new Date().toISOString().slice(0, 16);

  return (
    <div className="space-y-5">
      <PageHeader title={t('title')} />

      {/* Accounts */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((a) => (
          <div key={a.id} className="card p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold">{a.name}</div>
                <div className="text-xs text-slate-500">{a.bankName ?? ''}</div>
              </div>
              <DeleteForm action={deleteBankAccountAction} id={a.id} />
            </div>
            <div className="text-2xl font-bold mt-3">
              {formatMoney(balanceMap[a.id] ?? 0, a.currency || currency, locale)}
            </div>
            {a.iban && <div className="text-xs text-slate-400 mt-1">{a.iban}</div>}
          </div>
        ))}
        {accounts.length === 0 && (
          <div className="card p-6 text-center text-slate-400 sm:col-span-2 lg:col-span-3">
            {t('empty')}
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <FormPanel title={t('newAccount')} action={createBankAccountAction} submitLabel={tc('create')}>
          <Field label={t('accountName')}>
            <input name="name" required className="input" />
          </Field>
          <Field label={t('bankName')}>
            <input name="bankName" className="input" />
          </Field>
          <Field label={t('iban')} full>
            <input name="iban" className="input" placeholder="TR.." />
          </Field>
          <Field label={t('openingBalance')}>
            <input name="openingBalance" type="number" step="0.01" defaultValue={0} className="input" />
          </Field>
          <Field label={t('bankName') /* currency */}>
            <select name="currency" className="input" defaultValue={currency}>
              <option value="TRY">TRY ₺</option>
              <option value="EUR">EUR €</option>
              <option value="USD">USD $</option>
            </select>
          </Field>
        </FormPanel>

        {accounts.length > 0 && (
          <FormPanel title={t('newTransaction')} action={createBankTransactionAction} submitLabel={tc('create')}>
            <Field label={t('accounts')}>
              <select name="bankAccountId" required className="input">
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('direction')}>
              <select name="direction" className="input" defaultValue="IN">
                <option value="IN">{t('in')}</option>
                <option value="OUT">{t('out')}</option>
              </select>
            </Field>
            <Field label={tc('amount')}>
              <input name="amount" type="number" step="0.01" min={0} required className="input" />
            </Field>
            <Field label={tc('date')}>
              <input name="occurredAt" type="datetime-local" required defaultValue={nowLocal} className="input" />
            </Field>
            <Field label={t('counterparty')}>
              <input name="counterparty" className="input" />
            </Field>
            <Field label={t('reference')}>
              <input name="reference" className="input" />
            </Field>
            <Field label={tc('notes')} full>
              <input name="description" className="input" />
            </Field>
          </FormPanel>
        )}
      </div>

      {/* Transactions */}
      <div className="card overflow-hidden">
        <table className="data">
          <thead>
            <tr>
              <th>{tc('date')}</th>
              <th>{t('accounts')}</th>
              <th>{t('direction')}</th>
              <th>{t('counterparty')}</th>
              <th className="text-right">{tc('amount')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {txns.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-slate-400 py-8">
                  {t('noTransactions')}
                </td>
              </tr>
            )}
            {txns.map((x) => (
              <tr key={x.id}>
                <td className="whitespace-nowrap">{formatDate(x.occurredAt, locale)}</td>
                <td>{x.bankAccount.name}</td>
                <td>
                  <span
                    className="badge"
                    style={
                      x.direction === 'IN'
                        ? { background: '#dcfce7', color: '#166534' }
                        : { background: '#fee2e2', color: '#991b1b' }
                    }
                  >
                    {x.direction === 'IN' ? t('in') : t('out')}
                  </span>
                </td>
                <td>
                  {x.counterparty ?? '—'}
                  {x.description && <div className="text-xs text-slate-400">{x.description}</div>}
                </td>
                <td className="text-right font-semibold" style={{ color: x.direction === 'IN' ? '#15803d' : '#dc2626' }}>
                  {x.direction === 'IN' ? '+' : '−'}
                  {formatMoney(x.amount, currency, locale)}
                </td>
                <td className="text-right">
                  <DeleteForm action={deleteBankTransactionAction} id={x.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
