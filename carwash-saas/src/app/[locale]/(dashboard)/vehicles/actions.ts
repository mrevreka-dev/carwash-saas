'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { guard } from '@/lib/guard';
import { vehicleSchema } from '@/lib/validation';

export async function createVehicleAction(formData: FormData) {
  const { businessId } = await guard('vehicle.manage');
  const parsed = vehicleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error('Invalid vehicle data');
  const { customerId, ...rest } = parsed.data;
  await prisma.vehicle.create({
    data: { ...rest, customerId: customerId || null, businessId }
  });
  revalidatePath('/', 'layout');
}

export async function deleteVehicleAction(formData: FormData) {
  const { businessId } = await guard('vehicle.manage');
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await prisma.vehicle.deleteMany({ where: { id, businessId } });
  revalidatePath('/', 'layout');
}
