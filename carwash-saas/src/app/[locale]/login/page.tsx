import { getTranslations, setRequestLocale } from 'next-intl/server';
import LoginForm from './LoginForm';
import LocaleSwitcher from '@/components/LocaleSwitcher';

export default async function LoginPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('auth');
  const tApp = await getTranslations('app');

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-brand-50 to-slate-100">
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-3">
          <LocaleSwitcher />
        </div>
        <div className="card p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 h-12 w-12 rounded-xl bg-brand-600 text-white flex items-center justify-center text-2xl font-bold">
              ⌾
            </div>
            <h1 className="text-xl font-bold">{tApp('name')}</h1>
            <p className="text-sm text-slate-500 mt-1">{t('loginSubtitle')}</p>
          </div>
          <LoginForm locale={locale} />
        </div>
        <p className="text-center text-xs text-slate-400 mt-4">
          {tApp('tagline')}
        </p>
      </div>
    </div>
  );
}
