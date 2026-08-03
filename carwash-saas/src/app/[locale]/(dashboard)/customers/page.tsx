import { getTranslations, setRequestLocale } from 'next-intl/server';
import { prisma } from '@/lib/db';
import { getPageContext } from '@/lib/page-context';
import PageHeader from '@/components/PageHeader';
import FormPanel, { Field } from '@/components/FormPanel';
import DeleteForm from '@/components/DeleteForm';
import NoBusiness from '@/components/NoBusiness';
import {
  createCustomerAction,
  updateCustomerAction,
  deleteCustomerAction
} from './actions';

export default async function CustomersPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { businessId } = await getPageContext(locale);
  const t = await getTranslations('customers');
  const tc = await getTranslations('common');

  if (!businessId) return <NoBusiness />;

  const customers = await prisma.customer.findMany({
    where: { businessId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { vehicles: true, appointments: true } } }
  });

  return (
    <div className="space-y-5">
      <PageHeader title={t('title')} subtitle={t('count', { count: customers.length })} />

      <FormPanel title={t('new')} action={createCustomerAction} submitLabel={tc('create')}>
        <Field label={t('firstName')}>
          <input name="firstName" required className="input" />
        </Field>
        <Field label={t('lastName')}>
          <input name="lastName" className="input" />
        </Field>
        <Field label={tc('phone')}>
          <input name="phone" className="input" />
        </Field>
        <Field label={tc('email')}>
          <input name="email" type="email" className="input" />
        </Field>
        <Field label={tc('notes')} full>
          <input name="notes" className="input" />
        </Field>
      </FormPanel>

      <div className="card overflow-hidden">
        <table className="data">
          <thead>
            <tr>
              <th>{tc('name')}</th>
              <th>{tc('phone')}</th>
              <th>{tc('email')}</th>
              <th>{t('vehicles')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-slate-400 py-8">
                  {t('empty')}
                </td>
              </tr>
            )}
            {customers.map((c) => (
              <tr key={c.id}>
                <td className="font-semibold">
                  {c.firstName} {c.lastName ?? ''}
                </td>
                <td>{c.phone ?? '—'}</td>
                <td>{c.email ?? '—'}</td>
                <td className="text-slate-500">{c._count.vehicles}</td>
                <td className="text-right whitespace-nowrap">
                  <FormPanel
                    title={tc('edit')}
                    action={updateCustomerAction}
                    submitLabel={tc('update')}
                    compact
                  >
                    <input type="hidden" name="id" value={c.id} />
                    <Field label={t('firstName')}>
                      <input name="firstName" required defaultValue={c.firstName} className="input" />
                    </Field>
                    <Field label={t('lastName')}>
                      <input name="lastName" defaultValue={c.lastName ?? ''} className="input" />
                    </Field>
                    <Field label={tc('phone')}>
                      <input name="phone" defaultValue={c.phone ?? ''} className="input" />
                    </Field>
                    <Field label={tc('email')}>
                      <input name="email" defaultValue={c.email ?? ''} className="input" />
                    </Field>
                    <Field label={tc('notes')} full>
                      <input name="notes" defaultValue={c.notes ?? ''} className="input" />
                    </Field>
                  </FormPanel>{' '}
                  <DeleteForm action={deleteCustomerAction} id={c.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
