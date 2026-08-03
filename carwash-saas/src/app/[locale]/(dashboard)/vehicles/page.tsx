import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { VehicleType } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getPageContext } from '@/lib/page-context';
import PageHeader from '@/components/PageHeader';
import FormPanel, { Field } from '@/components/FormPanel';
import DeleteForm from '@/components/DeleteForm';
import NoBusiness from '@/components/NoBusiness';
import { createVehicleAction, deleteVehicleAction } from './actions';

const TYPES: VehicleType[] = [
  'MOTORCYCLE',
  'SEDAN',
  'HATCHBACK',
  'SUV',
  'VAN',
  'TRUCK',
  'OTHER'
];

export default async function VehiclesPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { businessId } = await getPageContext(locale);
  const t = await getTranslations('vehicles');
  const tc = await getTranslations('common');
  const tType = await getTranslations('vehicleType');

  if (!businessId) return <NoBusiness />;

  const [vehicles, customers] = await Promise.all([
    prisma.vehicle.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      include: { customer: true }
    }),
    prisma.customer.findMany({
      where: { businessId },
      orderBy: { firstName: 'asc' },
      select: { id: true, firstName: true, lastName: true }
    })
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title={t('title')} />

      <FormPanel title={t('new')} action={createVehicleAction} submitLabel={tc('create')}>
        <Field label={t('plate')}>
          <input name="plate" required className="input" placeholder="34 ABC 123" />
        </Field>
        <Field label={t('owner')}>
          <select name="customerId" className="input" defaultValue="">
            <option value="">— {tc('none')} —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName ?? ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('make')}>
          <input name="make" className="input" />
        </Field>
        <Field label={t('model')}>
          <input name="model" className="input" />
        </Field>
        <Field label={t('color')}>
          <input name="color" className="input" />
        </Field>
        <Field label={t('type')}>
          <select name="type" className="input" defaultValue="SEDAN">
            {TYPES.map((ty) => (
              <option key={ty} value={ty}>
                {tType(ty)}
              </option>
            ))}
          </select>
        </Field>
      </FormPanel>

      <div className="card overflow-hidden">
        <table className="data">
          <thead>
            <tr>
              <th>{t('plate')}</th>
              <th>{t('make')} / {t('model')}</th>
              <th>{t('type')}</th>
              <th>{t('owner')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {vehicles.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-slate-400 py-8">
                  {t('empty')}
                </td>
              </tr>
            )}
            {vehicles.map((v) => (
              <tr key={v.id}>
                <td className="font-semibold uppercase">{v.plate}</td>
                <td>
                  {[v.make, v.model].filter(Boolean).join(' ') || '—'}
                  {v.color && <span className="text-slate-400"> · {v.color}</span>}
                </td>
                <td>{tType(v.type)}</td>
                <td>
                  {v.customer
                    ? `${v.customer.firstName} ${v.customer.lastName ?? ''}`
                    : '—'}
                </td>
                <td className="text-right">
                  <DeleteForm action={deleteVehicleAction} id={v.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
