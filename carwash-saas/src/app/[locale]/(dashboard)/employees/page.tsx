import { getTranslations, setRequestLocale } from 'next-intl/server';
import { prisma } from '@/lib/db';
import { getPageContext } from '@/lib/page-context';
import { formatMoney, formatDate } from '@/lib/format';
import { can } from '@/lib/rbac';
import PageHeader from '@/components/PageHeader';
import FormPanel, { Field } from '@/components/FormPanel';
import DeleteForm from '@/components/DeleteForm';
import NoBusiness from '@/components/NoBusiness';
import {
  createEmployeeAction,
  updateEmployeeAction,
  deleteEmployeeAction,
  paySalaryAction
} from './actions';

export default async function EmployeesPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { businessId, session } = await getPageContext(locale);
  const t = await getTranslations('employees');
  const tc = await getTranslations('common');

  if (!businessId) return <NoBusiness />;

  const [business, employees] = await Promise.all([
    prisma.business.findUnique({ where: { id: businessId }, select: { currency: true } }),
    prisma.employee.findMany({ where: { businessId }, orderBy: { createdAt: 'desc' } })
  ]);
  const currency = business?.currency ?? 'TRY';
  const canPay = can(session.role, 'finance.manage');

  return (
    <div className="space-y-5">
      <PageHeader title={t('title')} />

      <FormPanel title={t('new')} action={createEmployeeAction} submitLabel={tc('create')}>
        <Field label={tc('name')}>
          <input name="firstName" required className="input" placeholder={tc('name')} />
        </Field>
        <Field label="Soyad">
          <input name="lastName" className="input" />
        </Field>
        <Field label={t('position')}>
          <input name="position" className="input" />
        </Field>
        <Field label={t('salary')}>
          <input name="monthlySalary" type="number" step="0.01" min={0} defaultValue={0} className="input" />
        </Field>
        <Field label={tc('phone')}>
          <input name="phone" className="input" />
        </Field>
        <Field label={t('hireDate')}>
          <input name="hireDate" type="date" className="input" />
        </Field>
        <Field label={tc('email')}>
          <input name="email" type="email" className="input" />
        </Field>
        <Field label={t('createLogin')}>
          <select name="createLogin" className="input" defaultValue="false">
            <option value="false">{tc('no')}</option>
            <option value="true">{tc('yes')}</option>
          </select>
        </Field>
        <Field label={t('loginPassword')} full>
          <input name="loginPassword" type="text" minLength={6} className="input" placeholder="min. 6" />
        </Field>
      </FormPanel>

      <div className="card overflow-hidden">
        <table className="data">
          <thead>
            <tr>
              <th>{tc('name')}</th>
              <th>{t('position')}</th>
              <th>{t('salary')}</th>
              <th>{t('hireDate')}</th>
              <th>{tc('status')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-slate-400 py-8">
                  {t('empty')}
                </td>
              </tr>
            )}
            {employees.map((e) => (
              <tr key={e.id}>
                <td className="font-semibold">
                  {e.firstName} {e.lastName ?? ''}
                  {e.userId && <span className="badge ml-2" style={{ background: '#e0e7ff', color: '#3730a3' }}>login</span>}
                </td>
                <td>{e.position ?? '—'}</td>
                <td>{formatMoney(e.monthlySalary, currency, locale)}</td>
                <td>{e.hireDate ? formatDate(e.hireDate, locale) : '—'}</td>
                <td>
                  <span className="badge" style={e.isActive ? { background: '#dcfce7', color: '#166534' } : { background: '#f1f5f9', color: '#64748b' }}>
                    {e.isActive ? tc('active') : tc('inactive')}
                  </span>
                </td>
                <td className="text-right whitespace-nowrap">
                  {canPay && (
                    <>
                      <form action={paySalaryAction} style={{ display: 'inline' }}>
                        <input type="hidden" name="id" value={e.id} />
                        <button className="btn btn-ghost" style={{ padding: '0.3rem 0.6rem' }}>
                          {t('payedSalary')}
                        </button>
                      </form>{' '}
                    </>
                  )}
                  <FormPanel title={tc('edit')} action={updateEmployeeAction} submitLabel={tc('update')} compact>
                    <input type="hidden" name="id" value={e.id} />
                    <Field label={tc('name')}>
                      <input name="firstName" required defaultValue={e.firstName} className="input" />
                    </Field>
                    <Field label="Soyad">
                      <input name="lastName" defaultValue={e.lastName ?? ''} className="input" />
                    </Field>
                    <Field label={t('position')}>
                      <input name="position" defaultValue={e.position ?? ''} className="input" />
                    </Field>
                    <Field label={t('salary')}>
                      <input name="monthlySalary" type="number" step="0.01" min={0} defaultValue={Number(e.monthlySalary)} className="input" />
                    </Field>
                    <Field label={tc('phone')}>
                      <input name="phone" defaultValue={e.phone ?? ''} className="input" />
                    </Field>
                    <Field label={t('hireDate')}>
                      <input name="hireDate" type="date" defaultValue={e.hireDate ? e.hireDate.toISOString().slice(0, 10) : ''} className="input" />
                    </Field>
                    <Field label={tc('active')}>
                      <select name="isActive" className="input" defaultValue={String(e.isActive)}>
                        <option value="true">{tc('yes')}</option>
                        <option value="false">{tc('no')}</option>
                      </select>
                    </Field>
                  </FormPanel>{' '}
                  <DeleteForm action={deleteEmployeeAction} id={e.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
