'use server';

import { revalidatePath } from 'next/cache';
import type { AppointmentStatus, PaymentMethod } from '@prisma/client';
import { prisma } from '@/lib/db';
import { guard } from '@/lib/guard';
import { appointmentSchema } from '@/lib/validation';

export async function createAppointmentAction(formData: FormData) {
  const { businessId } = await guard('appointment.manage');
  const parsed = appointmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error('Invalid appointment data');
  const d = parsed.data;

  const start = new Date(d.startAt);
  let durationMin = d.durationMin;
  let price = d.price;

  if (d.serviceId) {
    const service = await prisma.service.findFirst({
      where: { id: d.serviceId, businessId },
      select: { durationMin: true, price: true }
    });
    if (service) {
      if (!formData.get('durationMin')) durationMin = service.durationMin;
      if (price == null) price = Number(service.price);
    }
  }
  const end = new Date(start.getTime() + durationMin * 60_000);

  await prisma.appointment.create({
    data: {
      businessId,
      customerId: d.customerId || null,
      vehicleId: d.vehicleId || null,
      serviceId: d.serviceId || null,
      employeeId: d.employeeId || null,
      contactName: d.contactName,
      contactPhone: d.contactPhone,
      startAt: start,
      endAt: end,
      status: d.status,
      source: 'MANUAL',
      price: price ?? null,
      notes: d.notes
    }
  });
  revalidatePath('/', 'layout');
}

export async function updateAppointmentStatusAction(formData: FormData) {
  const { businessId } = await guard('appointment.manage');
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '') as AppointmentStatus;
  if (!id || !status) return;
  await prisma.appointment.updateMany({ where: { id, businessId }, data: { status } });
  revalidatePath('/', 'layout');
}

/** Mark completed and, if a price exists, record an income transaction. */
export async function completeAppointmentAction(formData: FormData) {
  const { businessId, session } = await guard('appointment.manage');
  const id = String(formData.get('id') ?? '');
  const method = (String(formData.get('method') ?? 'CASH') || 'CASH') as PaymentMethod;
  if (!id) return;

  const appt = await prisma.appointment.findFirst({
    where: { id, businessId },
    select: { id: true, price: true, status: true }
  });
  if (!appt) return;

  await prisma.$transaction(async (tx) => {
    await tx.appointment.update({ where: { id }, data: { status: 'COMPLETED' } });
    const amount = appt.price ? Number(appt.price) : 0;
    if (amount > 0) {
      await tx.transaction.create({
        data: {
          businessId,
          type: 'INCOME',
          amount,
          method,
          description: 'Randevu geliri',
          appointmentId: id,
          createdById: session.sub
        }
      });
    }
  });
  revalidatePath('/', 'layout');
}

export async function deleteAppointmentAction(formData: FormData) {
  const { businessId } = await guard('appointment.manage');
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await prisma.appointment.deleteMany({ where: { id, businessId } });
  revalidatePath('/', 'layout');
}
