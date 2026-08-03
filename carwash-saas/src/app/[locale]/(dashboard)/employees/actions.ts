'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { guard } from '@/lib/guard';
import { hashPassword } from '@/lib/auth';
import { employeeSchema } from '@/lib/validation';

export async function createEmployeeAction(formData: FormData) {
  const { businessId } = await guard('employee.manage');
  const parsed = employeeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error('Invalid employee data');
  const d = parsed.data;

  await prisma.$transaction(async (tx) => {
    let userId: string | null = null;
    if (d.createLogin && d.email && d.loginPassword) {
      const existing = await tx.user.findUnique({ where: { email: d.email.toLowerCase() } });
      if (existing) throw new Error('Login email already in use');
      const user = await tx.user.create({
        data: {
          name: `${d.firstName} ${d.lastName ?? ''}`.trim(),
          email: d.email.toLowerCase(),
          passwordHash: await hashPassword(d.loginPassword),
          role: 'STAFF',
          businessId
        }
      });
      userId = user.id;
    }
    await tx.employee.create({
      data: {
        businessId,
        firstName: d.firstName,
        lastName: d.lastName,
        phone: d.phone,
        email: d.email,
        position: d.position,
        monthlySalary: d.monthlySalary,
        hireDate: d.hireDate ? new Date(d.hireDate) : null,
        isActive: d.isActive,
        userId
      }
    });
  });
  revalidatePath('/', 'layout');
}

export async function updateEmployeeAction(formData: FormData) {
  const { businessId } = await guard('employee.manage');
  const id = String(formData.get('id') ?? '');
  const parsed = employeeSchema.safeParse(Object.fromEntries(formData));
  if (!id || !parsed.success) throw new Error('Invalid employee data');
  const d = parsed.data;
  await prisma.employee.updateMany({
    where: { id, businessId },
    data: {
      firstName: d.firstName,
      lastName: d.lastName,
      phone: d.phone,
      email: d.email,
      position: d.position,
      monthlySalary: d.monthlySalary,
      hireDate: d.hireDate ? new Date(d.hireDate) : null,
      isActive: d.isActive
    }
  });
  revalidatePath('/', 'layout');
}

export async function deleteEmployeeAction(formData: FormData) {
  const { businessId } = await guard('employee.manage');
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await prisma.employee.deleteMany({ where: { id, businessId } });
  revalidatePath('/', 'layout');
}

/** Record this month's salary as an expense transaction. */
export async function paySalaryAction(formData: FormData) {
  const { businessId, session } = await guard('finance.manage');
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const employee = await prisma.employee.findFirst({
    where: { id, businessId },
    select: { id: true, monthlySalary: true, firstName: true, lastName: true }
  });
  if (!employee) return;
  await prisma.transaction.create({
    data: {
      businessId,
      type: 'EXPENSE',
      category: 'SALARY',
      amount: employee.monthlySalary,
      method: 'BANK_TRANSFER',
      description: `Maaş: ${employee.firstName} ${employee.lastName ?? ''}`.trim(),
      employeeId: employee.id,
      createdById: session.sub
    }
  });
  revalidatePath('/', 'layout');
}
