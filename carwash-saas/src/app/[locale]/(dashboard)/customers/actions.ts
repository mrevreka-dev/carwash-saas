'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { guard } from '@/lib/guard';
import { customerSchema } from '@/lib/validation';

export async function createCustomerAction(formData: FormData) {
  const { businessId } = await guard('customer.manage');
  const parsed = customerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error('Invalid customer data');
  await prisma.customer.create({ data: { ...parsed.data, businessId } });
  revalidatePath('/', 'layout');
}

export async function updateCustomerAction(formData: FormData) {
  const { businessId } = await guard('customer.manage');
  const id = String(formData.get('id') ?? '');
  const parsed = customerSchema.safeParse(Object.fromEntries(formData));
  if (!id || !parsed.success) throw new Error('Invalid customer data');
  // updateMany scoped by businessId guarantees tenant isolation.
  await prisma.customer.updateMany({
    where: { id, businessId },
    data: parsed.data
  });
  revalidatePath('/', 'layout');
}

export async function deleteCustomerAction(formData: FormData) {
  const { businessId } = await guard('customer.manage');
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await prisma.customer.deleteMany({ where: { id, businessId } });
  revalidatePath('/', 'layout');
}
