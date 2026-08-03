'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { guardPlatform } from '@/lib/guard';
import { hashPassword } from '@/lib/auth';
import {
  businessSchema,
  businessUpdateSchema,
  subscriptionSchema,
  ownerPasswordResetSchema
} from '@/lib/validation';
import { ACTIVE_BUSINESS_COOKIE } from '@/lib/tenant';

function parseDate(v?: string): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

export async function createBusinessAction(formData: FormData) {
  await guardPlatform('business.manage');

  const parsed = businessSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error('Invalid business data');
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
        currency: d.currency || 'TRY',
        plan: d.plan || 'standard',
        subscriptionEndsAt: parseDate(d.subscriptionEndsAt)
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

  const store = await cookies();
  store.set(ACTIVE_BUSINESS_COOKIE, business.id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30
  });

  revalidatePath('/', 'layout');
}

export async function updateBusinessAction(formData: FormData) {
  await guardPlatform('business.manage');
  const id = String(formData.get('id') ?? '');
  const parsed = businessUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!id || !parsed.success) throw new Error('Invalid business data');
  const d = parsed.data;
  await prisma.business.update({
    where: { id },
    data: {
      name: d.name,
      slug: d.slug.toLowerCase(),
      email: d.email,
      phone: d.phone,
      address: d.address,
      city: d.city,
      currency: d.currency || 'TRY',
      plan: d.plan || 'standard'
    }
  });
  revalidatePath('/', 'layout');
}

export async function toggleBusinessActiveAction(formData: FormData) {
  await guardPlatform('business.manage');
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const b = await prisma.business.findUnique({
    where: { id },
    select: { isActive: true }
  });
  if (!b) return;
  await prisma.business.update({ where: { id }, data: { isActive: !b.isActive } });
  revalidatePath('/', 'layout');
}

export async function setSubscriptionAction(formData: FormData) {
  await guardPlatform('business.manage');
  const id = String(formData.get('id') ?? '');
  const parsed = subscriptionSchema.safeParse(Object.fromEntries(formData));
  if (!id || !parsed.success) throw new Error('Invalid subscription data');
  await prisma.business.update({
    where: { id },
    data: { subscriptionEndsAt: parseDate(parsed.data.subscriptionEndsAt) }
  });
  revalidatePath('/', 'layout');
}

export async function resetOwnerPasswordAction(formData: FormData) {
  await guardPlatform('business.manage');
  const id = String(formData.get('id') ?? '');
  const parsed = ownerPasswordResetSchema.safeParse(Object.fromEntries(formData));
  if (!id || !parsed.success) throw new Error('Invalid password');
  const owner = await prisma.user.findFirst({
    where: { businessId: id, role: 'OWNER' },
    orderBy: { createdAt: 'asc' }
  });
  if (!owner) throw new Error('Owner not found');
  await prisma.user.update({
    where: { id: owner.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) }
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
