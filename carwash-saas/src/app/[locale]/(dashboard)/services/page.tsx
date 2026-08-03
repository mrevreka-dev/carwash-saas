import { getTranslations, setRequestLocale } from 'next-intl/server';
import { prisma } from '@/lib/db';
import { guardTenantPage } from '@/lib/page-context';
import { formatMoney } from '@/lib/format';
import PageHeader from '@/components/PageHeader';
import FormPanel, { Field } from '@/components/FormPanel';
import DeleteForm from '@/components/DeleteForm';
import NoBusiness from '@/components/NoBusiness';
import {
  createServiceAction,
  updateServiceAction,
  deleteServiceAction
} from './actions';

export default async function ServicesPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { businessId } = await guardTenantPage(locale);
  const t = await getTranslations('services');
  const tc = await getTranslations('common');

  if (!businessId) return <NoBusiness />;

  const [business, services] = await Promise.all([
    prisma.business.findUnique({ where: { id: businessId }, select: { currency: true } }),
    prisma.service.findMany({ where: { businessId }, orderBy: { createdAt: 'desc' } })
  ]);
  const currency = business?.currency ?? 'TRY';

  return (
    <div className="space-y-5">
      <PageHeader title={t('title')} />

      <FormPanel title={t('new')} action={createServiceAction} submitLabel={tc('create')}>
        <Field label={t('name')}>
          <input name="name" required className="input" />
        </Field>
        <Field label={t('duration')}>
          <input name="durationMin" type="number" min={1} defaultValue={30} className="input" />
        </Field>
        <Field label={t('price')}>
          <input name="price" type="number" step="0.01" min={0} required className="input" />
        </Field>
        <Field label={tc('active')}>
          <select name="isActive" className="input" defaultValue="true">
            <option value="true">{tc('yes')}</option>
            <option value="false">{tc('no')}</option>
          </select>
        </Field>
        <Field label={t('description')} full>
          <input name="description" className="input" />
        </Field>
      </FormPanel>

      <div className="card overflow-hidden">
        <table className="data">
          <thead>
            <tr>
              <th>{t('name')}</th>
              <th>{t('duration')}</th>
              <th>{t('price')}</th>
              <th>{tc('status')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {services.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-slate-400 py-8">
                  {t('empty')}
                </td>
              </tr>
            )}
            {services.map((s) => (
              <tr key={s.id}>
                <td>
                  <div className="font-semibold">{s.name}</div>
                  {s.description && (
                    <div className="text-xs text-slate-500">{s.description}</div>
                  )}
                </td>
                <td>{s.durationMin} dk</td>
                <td className="font-medium">{formatMoney(s.price, currency, locale)}</td>
                <td>
                  <span className={`badge ${s.isActive ? '' : ''}`} style={s.isActive ? { background: '#dcfce7', color: '#166534' } : { background: '#f1f5f9', color: '#64748b' }}>
                    {s.isActive ? tc('active') : tc('inactive')}
                  </span>
                </td>
                <td className="text-right whitespace-nowrap">
                  <FormPanel
                    title={tc('edit')}
                    action={updateServiceAction}
                    submitLabel={tc('update')}
                    compact
                  >
                    <input type="hidden" name="id" value={s.id} />
                    <Field label={t('name')}>
                      <input name="name" required defaultValue={s.name} className="input" />
                    </Field>
                    <Field label={t('duration')}>
                      <input name="durationMin" type="number" min={1} defaultValue={s.durationMin} className="input" />
                    </Field>
                    <Field label={t('price')}>
                      <input name="price" type="number" step="0.01" min={0} defaultValue={Number(s.price)} className="input" />
                    </Field>
                    <Field label={tc('active')}>
                      <select name="isActive" className="input" defaultValue={String(s.isActive)}>
                        <option value="true">{tc('yes')}</option>
                        <option value="false">{tc('no')}</option>
                      </select>
                    </Field>
                    <Field label={t('description')} full>
                      <input name="description" defaultValue={s.description ?? ''} className="input" />
                    </Field>
                  </FormPanel>{' '}
                  <DeleteForm action={deleteServiceAction} id={s.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
