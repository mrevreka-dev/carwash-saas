import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function LocaleIndex({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();
  redirect(session ? `/${locale}/dashboard` : `/${locale}/login`);
}
