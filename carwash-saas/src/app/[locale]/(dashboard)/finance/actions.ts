'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { guard } from '@/lib/guard';
import { transactionSchema } from '@/lib/validation';

export async function createTransactionAction(formData: FormData) {
  const { businessId, session } = await guard('finance.manage');
  const parsed = transactionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error('Invalid transaction data');
  const d = parsed.data;

  await prisma.transaction.create({
    data: {
      businessId,
      type: d.type,
      amount: d.amount,
      method: d.method,
      category: d.type === 'EXPENSE' ? d.category ?? 'OTHER' : null,
      description: d.description,
      occurredAt: new Date(d.occurredAt),
      employeeId: d.employeeId || null,
      bankAccountId: d.bankAccountId || null,
      appointmentId: d.appointmentId || null,
      createdById: session.sub
    }
  });
  revalidatePath('/', 'layout');
}

export async function deleteTransactionAction(formData: FormData) {
  const { businessId } = await guard('finance.manage');
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await prisma.transaction.deleteMany({ where: { id, businessId } });
  revalidatePath('/', 'layout');
}
