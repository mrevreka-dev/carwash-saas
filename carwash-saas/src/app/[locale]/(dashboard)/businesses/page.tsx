import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { prisma } from '@/lib/db';
import { getPageContext } from '@/lib/page-context';
import PageHeader from '@/components/PageHeader';
import FormPanel, { Field } from '@/components/FormPanel';
import DeleteForm from '@/components/DeleteForm';
import { setActiveBusinessAction } from '@/lib/session-actions';
import { createBusinessAction, deleteBusinessAction } from './actions';

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

  const businesses = await prisma.business.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { members: true, customers: true } } }
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  return (
    <div className="space-y-5">
      <PageHeader title={t('title')} />

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
          </select>
        </Field>
        <Field label={t('address')} full>
          <input name="address" className="input" />
        </Field>
        <Field label={t('ownerName')}>
          <input name="ownerName" required className="input" />
        </Field>
        <Field label={t('ownerEmail')}>
          <input name="ownerEmail" type="email" required className="input" />
        </Field>
        <Field label={t('ownerPassword')}>
          <input name="ownerPassword" type="text" required className="input" minLength={6} />
        </Field>
      </FormPanel>

      <div className="card overflow-hidden">
        <table className="data">
          <thead>
            <tr>
              <th>{t('name')}</th>
              <th>{t('bookingLink')}</th>
              <th>{tc('total')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {businesses.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-slate-400 py-8">
                  {t('empty')}
                </td>
              </tr>
            )}
            {businesses.map((b) => {
              const link = `${appUrl}/${locale}/book/${b.slug}`;
              const isActive = b.id === businessId;
              return (
                <tr key={b.id}>
                  <td>
                    <div className="font-semibold">{b.name}</div>
                    <div className="text-xs text-slate-500">{b.city ?? ''}</div>
                  </td>
                  <td>
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 text-xs underline break-all"
                    >
                      /{locale}/book/{b.slug}
                    </a>
                  </td>
                  <td className="text-xs text-slate-500">
                    {b._count.members} · {b._count.customers}
                  </td>
                  <td className="text-right whitespace-nowrap">
                    <form action={setActiveBusinessAction.bind(null, b.id)} style={{ display: 'inline' }}>
                      <button
                        className={`btn ${isActive ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ padding: '0.3rem 0.6rem' }}
                      >
                        {isActive ? t('selected') : t('select')}
                      </button>
                    </form>{' '}
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
