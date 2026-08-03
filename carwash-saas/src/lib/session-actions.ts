'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { destroySession, getSession } from '@/lib/auth';
import { ACTIVE_BUSINESS_COOKIE } from '@/lib/tenant';
import { prisma } from '@/lib/db';

export async function logoutAction(locale: string) {
  await destroySession();
  redirect(`/${locale}/login`);
}

export async function setActiveBusinessAction(businessId: string) {
  const session = await getSession();
  if (!session || session.role !== 'SUPER_ADMIN') throw new Error('Unauthorized');
  const exists = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true }
  });
  const store = await cookies();
  if (exists) {
    store.set(ACTIVE_BUSINESS_COOKIE, businessId, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30
    });
  }
  revalidatePath('/', 'layout');
}
