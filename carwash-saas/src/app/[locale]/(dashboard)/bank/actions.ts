'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { guard } from '@/lib/guard';
import { bankAccountSchema, bankTransactionSchema } from '@/lib/validation';

export async function createBankAccountAction(formData: FormData) {
  const { businessId } = await guard('bank.manage');
  const parsed = bankAccountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error('Invalid bank account data');
  await prisma.bankAccount.create({ data: { ...parsed.data, businessId } });
  revalidatePath('/', 'layout');
}

export async function deleteBankAccountAction(formData: FormData) {
  const { businessId } = await guard('bank.manage');
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await prisma.bankAccount.deleteMany({ where: { id, businessId } });
  revalidatePath('/', 'layout');
}

export async function createBankTransactionAction(formData: FormData) {
  const { businessId } = await guard('bank.manage');
  const parsed = bankTransactionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error('Invalid bank transaction data');
  const d = parsed.data;
  // Ensure the account belongs to this business (tenant isolation).
  const account = await prisma.bankAccount.findFirst({
    where: { id: d.bankAccountId, businessId },
    select: { id: true }
  });
  if (!account) throw new Error('Account not found');
  await prisma.bankTransaction.create({
    data: {
      businessId,
      bankAccountId: d.bankAccountId,
      direction: d.direction,
      amount: d.amount,
      description: d.description,
      counterparty: d.counterparty,
      reference: d.reference,
      occurredAt: new Date(d.occurredAt)
    }
  });
  revalidatePath('/', 'layout');
}

export async function deleteBankTransactionAction(formData: FormData) {
  const { businessId } = await guard('bank.manage');
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await prisma.bankTransaction.deleteMany({ where: { id, businessId } });
  revalidatePath('/', 'layout');
}
