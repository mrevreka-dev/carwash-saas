import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { AppointmentStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getPageContext } from '@/lib/page-context';
import { formatMoney, formatDateTime, toDateTimeLocal } from '@/lib/format';
import PageHeader from '@/components/PageHeader';
import FormPanel, { Field } from '@/components/FormPanel';
import DeleteForm from '@/components/DeleteForm';
import StatusBadge from '@/components/StatusBadge';
import NoBusiness from '@/components/NoBusiness';
import { Link } from '@/i18n/navigation';
import {
  createAppointmentAction,
  updateAppointmentStatusAction,
  completeAppointmentAction,
  deleteAppointmentAction
} from './actions';

const STATUSES: AppointmentStatus[] = [
  'PENDING',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW'
];

export default async function AppointmentsPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale } = await params;
  const { status: statusFilter } = await searchParams;
  setRequestLocale(locale);
  const { businessId } = await getPageContext(locale);
  const t = await getTranslations('appointments');
  const tc = await getTranslations('common');
  const tStatus = await getTranslations('status');
  const tMethod = await getTranslations('method');

  if (!businessId) return <NoBusiness />;

  const activeStatus =
    statusFilter && STATUSES.includes(statusFilter as AppointmentStatus)
      ? (statusFilter as AppointmentStatus)
      : undefined;

  const [business, appointments, customers, vehicles, services, employees] =
    await Promise.all([
      prisma.business.findUnique({ where: { id: businessId }, select: { currency: true } }),
      prisma.appointment.findMany({
        where: { businessId, ...(activeStatus ? { status: activeStatus } : {}) },
        orderBy: { startAt: 'desc' },
        take: 100,
        include: { customer: true, vehicle: true, service: true, employee: true }
      }),
      prisma.customer.findMany({ where: { businessId }, orderBy: { firstName: 'asc' } }),
      prisma.vehicle.findMany({ where: { businessId }, orderBy: { plate: 'asc' } }),
      prisma.service.findMany({ where: { businessId, isActive: true }, orderBy: { name: 'asc' } }),
      prisma.employee.findMany({ where: { businessId, isActive: true }, orderBy: { firstName: 'asc' } })
    ]);
  const currency = business?.currency ?? 'TRY';

  return (
    <div className="space-y-5">
      <PageHeader title={t('title')} />

      <FormPanel title={t('new')} action={createAppointmentAction} submitLabel={tc('create')}>
        <Field label={t('service')}>
          <select name="serviceId" className="input" defaultValue="">
            <option value="">—</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {formatMoney(s.price, currency, locale)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('start')}>
          <input name="startAt" type="datetime-local" required className="input" defaultValue={toDateTimeLocal(new Date())} />
        </Field>
        <Field label={t('customer')}>
          <select name="customerId" className="input" defaultValue="">
            <option value="">— {t('walkIn')} —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName ?? ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('vehicle')}>
          <select name="vehicleId" className="input" defaultValue="">
            <option value="">—</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plate}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('employee')}>
          <select name="employeeId" className="input" defaultValue="">
            <option value="">—</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.firstName} {e.lastName ?? ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('price')}>
          <input name="price" type="number" step="0.01" min={0} className="input" placeholder={t('service')} />
        </Field>
        <Field label={tc('status')}>
          <select name="status" className="input" defaultValue="CONFIRMED">
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {tStatus(s)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('contactPhone')}>
          <input name="contactPhone" className="input" />
        </Field>
        <Field label={tc('notes')} full>
          <input name="notes" className="input" />
        </Field>
      </FormPanel>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/appointments"
          className={`badge ${!activeStatus ? 'bg-brand-600 text-white' : 'bg-white'}`}
          style={{ border: '1px solid #e2e8f0', padding: '0.3rem 0.7rem' }}
        >
          {tc('all')}
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={{ pathname: '/appointments', query: { status: s } }}
            className="badge"
            style={{
              border: '1px solid #e2e8f0',
              padding: '0.3rem 0.7rem',
              background: activeStatus === s ? '#1a5ff0' : '#fff',
              color: activeStatus === s ? '#fff' : '#334155'
            }}
          >
            {tStatus(s)}
          </Link>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="data">
          <thead>
            <tr>
              <th>{t('start')}</th>
              <th>{t('customer')}</th>
              <th>{t('service')}</th>
              <th>{t('price')}</th>
              <th>{tc('status')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {appointments.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-slate-400 py-8">
                  {t('empty')}
                </td>
              </tr>
            )}
            {appointments.map((a) => (
              <tr key={a.id}>
                <td className="whitespace-nowrap">
                  {formatDateTime(a.startAt, locale)}
                  <div className="text-xs text-slate-400">{a.source === 'ONLINE' ? 'online' : 'manuel'}</div>
                </td>
                <td>
                  {a.customer
                    ? `${a.customer.firstName} ${a.customer.lastName ?? ''}`
                    : a.contactName || t('walkIn')}
                  {a.vehicle && <div className="text-xs text-slate-400 uppercase">{a.vehicle.plate}</div>}
                </td>
                <td>{a.service?.name ?? '—'}</td>
                <td>{a.price ? formatMoney(a.price, currency, locale) : '—'}</td>
                <td>
                  <StatusBadge status={a.status} label={tStatus(a.status)} />
                </td>
                <td className="text-right whitespace-nowrap">
                  {a.status !== 'COMPLETED' && a.status !== 'CANCELLED' && (
                    <FormPanel title="⋯" action={completeAppointmentAction} submitLabel={t('createIncome')} compact>
                      <input type="hidden" name="id" value={a.id} />
                      <Field label={t('createIncome')} full>
                        <select name="method" className="input" defaultValue="CASH">
                          <option value="CASH">{tMethod('CASH')}</option>
                          <option value="CREDIT_CARD">{tMethod('CREDIT_CARD')}</option>
                          <option value="BANK_TRANSFER">{tMethod('BANK_TRANSFER')}</option>
                        </select>
                      </Field>
                    </FormPanel>
                  )}{' '}
                  {/* quick status transitions */}
                  {a.status === 'PENDING' && (
                    <StatusButton id={a.id} status="CONFIRMED" label={tStatus('CONFIRMED')} />
                  )}
                  {a.status === 'CONFIRMED' && (
                    <StatusButton id={a.id} status="IN_PROGRESS" label={tStatus('IN_PROGRESS')} />
                  )}
                  <DeleteForm action={deleteAppointmentAction} id={a.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusButton({
  id,
  status,
  label
}: {
  id: string;
  status: AppointmentStatus;
  label: string;
}) {
  return (
    <form action={updateAppointmentStatusAction} style={{ display: 'inline' }}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className="btn btn-ghost" style={{ padding: '0.3rem 0.6rem' }}>
        {label}
      </button>
    </form>
  );
}
