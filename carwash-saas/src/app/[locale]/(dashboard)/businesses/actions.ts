'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { guardPlatform } from '@/lib/guard';
import { hashPassword } from '@/lib/auth';
import { businessSchema } from '@/lib/validation';
import { ACTIVE_BUSINESS_COOKIE } from '@/lib/tenant';

export async function createBusinessAction(formData: FormData) {
  await guardPlatform('business.manage');

  const parsed = businessSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    throw new Error('Invalid business data');
  }
  const d = parsed.data;

  const existingUser = await prisma.user.findUnique({
    where: { email: d.ownerEmail.toLowerCase() }
  });
  if (existingUser) throw new Error('Owner email already in use');

  const passwordHash = await hashPassword(d.ownerPassword);

  const business = await prisma.$transaction(async (tx) => {
    const b = await tx.business.create({
      data: {
        name: d.name,
        slug: d.slug.toLowerCase(),
        email: d.email,
        phone: d.phone,
        address: d.address,
        city: d.city,
        currency: d.currency || 'TRY'
      }
    });
    await tx.user.create({
      data: {
        name: d.ownerName,
        email: d.ownerEmail.toLowerCase(),
        passwordHash,
        role: 'OWNER',
        businessId: b.id
      }
    });
    return b;
  });

  // Make the freshly created business the active one for the super admin.
  const store = await cookies();
  store.set(ACTIVE_BUSINESS_COOKIE, business.id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30
  });

  revalidatePath('/', 'layout');
}

export async function deleteBusinessAction(formData: FormData) {
  await guardPlatform('business.manage');
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await prisma.business.delete({ where: { id } });
  revalidatePath('/', 'layout');
}
