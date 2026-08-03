import { getTranslations, setRequestLocale } from 'next-intl/server';
import { prisma } from '@/lib/db';
import { formatMoney, toDateTimeLocal } from '@/lib/format';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import BookingForm from './BookingForm';

export default async function BookingPage({
  params
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('booking');

  const business = await prisma.business.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      isActive: true,
      currency: true,
      city: true,
      services: {
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, price: true, durationMin: true }
      }
    }
  });

  if (!business || !business.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">{t('notFound')}</p>
      </div>
    );
  }

  const defaultStart = toDateTimeLocal(new Date(Date.now() + 60 * 60 * 1000));
  const services = business.services.map((s) => ({
    id: s.id,
    name: s.name,
    durationMin: s.durationMin,
    price: formatMoney(s.price, business.currency, locale)
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-slate-100 py-10 px-4">
      <div className="max-w-md mx-auto">
        <div className="flex justify-end mb-3">
          <LocaleSwitcher />
        </div>
        <div className="card p-8">
          <div className="mb-6">
            <div className="h-10 w-10 rounded-xl bg-brand-600 text-white flex items-center justify-center text-xl font-bold mb-3">
              ⌾
            </div>
            <h1 className="text-xl font-bold">{business.name}</h1>
            <p className="text-sm text-slate-500">
              {t('subtitle', { business: business.name })}
            </p>
          </div>

          {services.length === 0 ? (
            <p className="text-sm text-slate-500">{t('closed')}</p>
          ) : (
            <BookingForm slug={slug} services={services} defaultStart={defaultStart} />
          )}
        </div>
      </div>
    </div>
  );
}
