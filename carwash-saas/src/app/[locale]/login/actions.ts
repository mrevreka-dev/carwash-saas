'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { verifyPassword, createSession } from '@/lib/auth';
import { canBusinessLogin } from '@/lib/services/operator';
import { loginSchema } from '@/lib/validation';

export interface LoginState {
  error?: string;
}

export async function loginAction(
  locale: string,
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password')
  });
  if (!parsed.success) {
    return { error: 'invalid' };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() }
  });
  if (!user || !user.isActive) {
    return { error: 'invalid' };
  }

  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) {
    return { error: 'invalid' };
  }

  // Gate owners/staff whose business is passive or past its subscription date.
  if (user.role !== 'SUPER_ADMIN' && user.businessId) {
    const business = await prisma.business.findUnique({
      where: { id: user.businessId },
      select: { isActive: true, subscriptionEndsAt: true }
    });
    if (!business || !canBusinessLogin(business)) {
      return { error: 'inactive' };
    }
  }

  await createSession({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    businessId: user.businessId ?? null
  });

  redirect(`/${locale}/dashboard`);
}
