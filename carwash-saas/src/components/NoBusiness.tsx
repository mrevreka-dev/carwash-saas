import { getTranslations } from 'next-intl/server';

export default async function NoBusiness() {
  const t = await getTranslations('dashboard');
  return (
    <div className="card p-10 text-center">
      <div className="text-4xl mb-3">◆</div>
      <h2 className="text-lg font-semibold">{t('selectBusiness')}</h2>
      <p className="text-sm text-slate-500 mt-1">{t('selectBusinessHint')}</p>
    </div>
  );
}
