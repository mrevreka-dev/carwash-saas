import { z } from 'zod';

/** Empty/whitespace strings become undefined. */
const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v == null || v === '' ? undefined : v));

/** Parse HTML form booleans ("true"/"on"/"1") correctly. z.coerce.boolean is
 *  wrong here because the string "false" is truthy. */
const formBoolean = (def = false) =>
  z.preprocess(
    (v) => v === true || v === 'true' || v === 'on' || v === '1',
    z.boolean()
  ).default(def);

/** Optional number that treats "" as absent. */
const optionalNumber = z.preprocess(
  (v) => (v === '' || v == null ? undefined : v),
  z.coerce.number().min(0).optional()
);

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1)
});

const slugField = z
  .string()
  .trim()
  .min(2)
  .regex(/^[a-z0-9-]+$/, 'lowercase letters, numbers and dashes only');

export const businessSchema = z.object({
  name: z.string().trim().min(2),
  slug: slugField,
  email: optionalString,
  phone: optionalString,
  address: optionalString,
  city: optionalString,
  currency: z.string().trim().default('TRY'),
  plan: z.string().trim().default('standard'),
  subscriptionEndsAt: optionalString,
  ownerName: z.string().trim().min(2),
  ownerEmail: z.string().trim().email(),
  ownerPassword: z.string().min(6)
});

// SUPER_ADMIN editing an existing business (no owner-account fields)
export const businessUpdateSchema = z.object({
  name: z.string().trim().min(2),
  slug: slugField,
  email: optionalString,
  phone: optionalString,
  address: optionalString,
  city: optionalString,
  currency: z.string().trim().default('TRY'),
  plan: z.string().trim().default('standard')
});

export const subscriptionSchema = z.object({
  subscriptionEndsAt: optionalString // empty => unlimited
});

export const ownerPasswordResetSchema = z.object({
  newPassword: z.string().min(6)
});

export const customerSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: optionalString,
  phone: optionalString,
  email: optionalString,
  notes: optionalString
});

export const vehicleSchema = z.object({
  customerId: optionalString,
  plate: z.string().trim().min(1),
  make: optionalString,
  model: optionalString,
  color: optionalString,
  type: z
    .enum(['MOTORCYCLE', 'SEDAN', 'HATCHBACK', 'SUV', 'VAN', 'TRUCK', 'OTHER'])
    .default('SEDAN')
});

export const serviceSchema = z.object({
  name: z.string().trim().min(1),
  description: optionalString,
  durationMin: z.coerce.number().int().min(1).max(1440).default(30),
  price: z.coerce.number().min(0),
  isActive: formBoolean(true)
});

export const employeeSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: optionalString,
  phone: optionalString,
  email: optionalString,
  position: optionalString,
  monthlySalary: z.coerce.number().min(0).default(0),
  hireDate: optionalString,
  isActive: formBoolean(true),
  createLogin: formBoolean(false),
  loginPassword: optionalString
});

export const appointmentSchema = z.object({
  customerId: optionalString,
  vehicleId: optionalString,
  serviceId: optionalString,
  employeeId: optionalString,
  contactName: optionalString,
  contactPhone: optionalString,
  startAt: z.string().min(1),
  durationMin: z.coerce.number().int().min(1).max(1440).default(30),
  status: z
    .enum([
      'PENDING',
      'CONFIRMED',
      'IN_PROGRESS',
      'COMPLETED',
      'CANCELLED',
      'NO_SHOW'
    ])
    .default('PENDING'),
  price: optionalNumber,
  notes: optionalString
});

export const transactionSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  amount: z.coerce.number().min(0),
  method: z
    .enum(['CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'OTHER'])
    .default('CASH'),
  category: z
    .enum([
      'SALARY',
      'RENT',
      'UTILITIES',
      'SUPPLIES',
      'MAINTENANCE',
      'MARKETING',
      'TAX',
      'OTHER'
    ])
    .optional(),
  description: optionalString,
  occurredAt: z.string().min(1),
  employeeId: optionalString,
  bankAccountId: optionalString,
  appointmentId: optionalString
});

export const bankAccountSchema = z.object({
  name: z.string().trim().min(1),
  bankName: optionalString,
  iban: optionalString,
  currency: z.string().trim().default('TRY'),
  openingBalance: z.coerce.number().default(0),
  isActive: formBoolean(true)
});

export const bankTransactionSchema = z.object({
  bankAccountId: z.string().min(1),
  direction: z.enum(['IN', 'OUT']),
  amount: z.coerce.number().min(0),
  description: optionalString,
  counterparty: optionalString,
  reference: optionalString,
  occurredAt: z.string().min(1)
});

export const publicBookingSchema = z.object({
  serviceId: z.string().min(1),
  startAt: z.string().min(1),
  contactName: z.string().trim().min(1),
  contactPhone: z.string().trim().min(1),
  notes: optionalString
});
