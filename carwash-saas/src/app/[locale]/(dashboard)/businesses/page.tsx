import { redirect } from 'next/navigation';
import type { CSSProperties } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getPageContext } from '@/lib/page-context';
import { getOperatorOverview, type BusinessStatus } from '@/lib/services/operator';
import { formatMoney, formatDate } from '@/lib/format';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import FormPanel, { Field } from '@/components/FormPanel';
import DeleteForm from '@/components/DeleteForm';
import { setActiveBusinessAction } from '@/lib/session-actions';
import {
  createBusinessAction,
  updateBusinessAction,
  toggleBusinessActiveAction,
  setSubscriptionAction,
  resetOwnerPasswordAction,
  deleteBusinessAction
} from './actions';

const STATUS_STYLE: Record<BusinessStatus, CSSProperties> = {
  ACTIVE: { background: '#dcfce7', color: '#166534' },
  PASSIVE: { background: '#f1f5f9', color: '#475569' },
  EXPIRED: { background: '#fee2e2', color: '#991b1b' }
};

function dateInput(d: Date | null): string {
  return d ? new Date(d).toISOString().slice(0, 10) : '';
}

export default async function BusinessesPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { session, businessId } = await getPageContext(locale);
  if (session.role !== 'SUPER_ADMIN') redirect(`/${locale}/dashboard`);

  const t = await getTranslations('business');
  const tc = await getTranslations('common');

  const ov = await getOperatorOverview();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const statusLabel = (s: BusinessStatus) =>
    s === 'ACTIVE' ? tc('active') : s === 'PASSIVE' ? t('passive') : t('expired');

  return (
    <div className="space-y-5">
      <PageHeader title={t('title')} />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('totalBusinesses')} value={ov.totalBusinesses} accent="brand" />
        <StatCard label={t('activeBusinesses')} value={ov.activeBusinesses} accent="green" />
        <StatCard label={t('expiringSoon')} value={ov.expiringSoon} accent={ov.expiringSoon ? 'red' : 'slate'} />
        <StatCard label={t('todayWashes')} value={ov.todayWashesTotal} />
      </div>

      <FormPanel title={t('new')} action={createBusinessAction} submitLabel={tc('create')}>
        <Field label={t('name')}>
          <input name="name" required className="input" />
        </Field>
        <Field label={t('slug')}>
          <input name="slug" required className="input" placeholder="parlak-oto" />
        </Field>
        <Field label={t('city')}>
          <input name="city" className="input" />
        </Field>
        <Field label={t('currency')}>
          <select name="currency" className="input" defaultValue="TRY">
            <option value="TRY">TRY ₺</option>
            <option value="EUR">EUR €</option>
            <option value="USD">USD $</option>
            <option value="UAH">UAH ₴</option>
          </select>
        </Field>
        <Field label={t('plan')}>
          <select name="plan" className="input" defaultValue="standard">
            <option value="trial">Trial</option>
            <option value="standard">Standard</option>
            <option value="premium">Premium</option>
          </select>
        </Field>
        <Field label={t('subscriptionEnds')}>
          <input name="subscriptionEndsAt" type="date" className="input" />
        </Field>
        <Field label={t('ownerName')}>
          <input name="ownerName" required className="input" />
        </Field>
        <Field label={t('ownerEmail')}>
          <input name="ownerEmail" type="email" required className="input" />
        </Field>
        <Field label={t('ownerPassword')}>
          <input name="ownerPassword" type="text" required minLength={6} className="input" />
        </Field>
      </FormPanel>

      <div className="card overflow-hidden">
        <table className="data">
          <thead>
            <tr>
              <th>{t('name')}</th>
              <th>{tc('status')}</th>
              <th>{t('subscriptionEnds')}</th>
              <th>{t('todayWashes')}</th>
              <th>{t('monthRevenue')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {ov.rows.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-slate-400 py-8">
                  {t('empty')}
                </td>
              </tr>
            )}
            {ov.rows.map(({ business: b, status, ownerEmail, todayWashes, monthRevenue }) => {
              const link = `${appUrl}/${locale}/book/${b.slug}`;
              const isActive = b.id === businessId;
              return (
                <tr key={b.id}>
                  <td>
                    <div className="font-semibold">{b.name}</div>
                    <div className="text-xs text-slate-500">{ownerEmail ?? '—'}</div>
                    <a href={link} target="_blank" rel="noopener noreferrer" className="text-brand-600 text-xs underline">
                      /{locale}/book/{b.slug}
                    </a>
                  </td>
                  <td>
                    <span className="badge" style={STATUS_STYLE[status]}>
                      {statusLabel(status)}
                    </span>
                    <div className="text-xs text-slate-400 mt-1 capitalize">{b.plan}</div>
                  </td>
                  <td className="whitespace-nowrap">
                    {b.subscriptionEndsAt ? formatDate(b.subscriptionEndsAt, locale) : t('unlimited')}
                  </td>
                  <td className="font-semibold">{todayWashes}</td>
                  <td className="font-medium">{formatMoney(monthRevenue, b.currency, locale)}</td>
                  <td className="text-right whitespace-nowrap space-x-1">
                    <form action={setActiveBusinessAction.bind(null, b.id)} style={{ display: 'inline' }}>
                      <button className={`btn ${isActive ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '0.3rem 0.6rem' }}>
                        {isActive ? t('selected') : t('select')}
                      </button>
                    </form>
                    <form action={toggleBusinessActiveAction} style={{ display: 'inline' }}>
                      <input type="hidden" name="id" value={b.id} />
                      <button className="btn btn-ghost" style={{ padding: '0.3rem 0.6rem' }}>
                        {b.isActive ? t('deactivate') : t('activate')}
                      </button>
                    </form>

                    {/* Edit */}
                    <FormPanel title={tc('edit')} action={updateBusinessAction} submitLabel={tc('update')} compact>
                      <input type="hidden" name="id" value={b.id} />
                      <Field label={t('name')}>
                        <input name="name" required defaultValue={b.name} className="input" />
                      </Field>
                      <Field label={t('slug')}>
                        <input name="slug" required defaultValue={b.slug} className="input" />
                      </Field>
                      <Field label={t('city')}>
                        <input name="city" defaultValue={b.city ?? ''} className="input" />
                      </Field>
                      <Field label={t('currency')}>
                        <select name="currency" className="input" defaultValue={b.currency}>
                          <option value="TRY">TRY ₺</option>
                          <option value="EUR">EUR €</option>
                          <option value="USD">USD $</option>
                          <option value="UAH">UAH ₴</option>
                        </select>
                      </Field>
                      <Field label={t('plan')}>
                        <select name="plan" className="input" defaultValue={b.plan}>
                          <option value="trial">Trial</option>
                          <option value="standard">Standard</option>
                          <option value="premium">Premium</option>
                        </select>
                      </Field>
                    </FormPanel>

                    {/* Subscription */}
                    <FormPanel title={t('subscription')} action={setSubscriptionAction} submitLabel={tc('save')} compact>
                      <input type="hidden" name="id" value={b.id} />
                      <Field label={t('subscriptionEnds')} full>
                        <input name="subscriptionEndsAt" type="date" defaultValue={dateInput(b.subscriptionEndsAt)} className="input" />
                      </Field>
                      <p className="sm:col-span-2 text-xs text-slate-400">{t('unlimitedHint')}</p>
                    </FormPanel>

                    {/* Reset owner password */}
                    <FormPanel title={t('resetOwnerPassword')} action={resetOwnerPasswordAction} submitLabel={tc('save')} compact>
                      <input type="hidden" name="id" value={b.id} />
                      <Field label={t('newPassword')} full>
                        <input name="newPassword" type="text" required minLength={6} className="input" />
                      </Field>
                    </FormPanel>

                    <DeleteForm action={deleteBusinessAction} id={b.id} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
