'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { guard } from '@/lib/guard';
import { serviceSchema } from '@/lib/validation';

export async function createServiceAction(formData: FormData) {
  const { businessId } = await guard('service.manage');
  const parsed = serviceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error('Invalid service data');
  await prisma.service.create({ data: { ...parsed.data, businessId } });
  revalidatePath('/', 'layout');
}

export async function updateServiceAction(formData: FormData) {
  const { businessId } = await guard('service.manage');
  const id = String(formData.get('id') ?? '');
  const parsed = serviceSchema.safeParse(Object.fromEntries(formData));
  if (!id || !parsed.success) throw new Error('Invalid service data');
  await prisma.service.updateMany({ where: { id, businessId }, data: parsed.data });
  revalidatePath('/', 'layout');
}

export async function deleteServiceAction(formData: FormData) {
  const { businessId } = await guard('service.manage');
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await prisma.service.deleteMany({ where: { id, businessId } });
  revalidatePath('/', 'layout');
}
