'use server';

import { prisma } from '@/lib/db';
import { publicBookingSchema } from '@/lib/validation';

export interface BookingState {
  ok?: boolean;
  error?: boolean;
}

export async function createBookingAction(
  slug: string,
  _prev: BookingState,
  formData: FormData
): Promise<BookingState> {
  const parsed = publicBookingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: true };
  const d = parsed.data;

  const business = await prisma.business.findUnique({
    where: { slug },
    select: { id: true, isActive: true }
  });
  if (!business || !business.isActive) return { error: true };

  const service = await prisma.service.findFirst({
    where: { id: d.serviceId, businessId: business.id, isActive: true },
    select: { id: true, durationMin: true, price: true }
  });
  if (!service) return { error: true };

  const start = new Date(d.startAt);
  const end = new Date(start.getTime() + service.durationMin * 60_000);

  await prisma.appointment.create({
    data: {
      businessId: business.id,
      serviceId: service.id,
      startAt: start,
      endAt: end,
      status: 'PENDING',
      source: 'ONLINE',
      price: service.price,
      contactName: d.contactName,
      contactPhone: d.contactPhone,
      notes: d.notes
    }
  });

  return { ok: true };
}
