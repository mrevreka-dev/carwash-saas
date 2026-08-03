import type { Role } from '@prisma/client';

/** Coarse-grained permissions used across the app. */
export type Permission =
  | 'business.manage' // create/edit businesses (platform level)
  | 'customer.manage'
  | 'vehicle.manage'
  | 'service.manage'
  | 'appointment.manage'
  | 'employee.manage'
  | 'finance.view'
  | 'finance.manage'
  | 'bank.manage'
  | 'settings.manage';

const MATRIX: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    'business.manage',
    'customer.manage',
    'vehicle.manage',
    'service.manage',
    'appointment.manage',
    'employee.manage',
    'finance.view',
    'finance.manage',
    'bank.manage',
    'settings.manage'
  ],
  OWNER: [
    'customer.manage',
    'vehicle.manage',
    'service.manage',
    'appointment.manage',
    'employee.manage',
    'finance.view',
    'finance.manage',
    'bank.manage',
    'settings.manage'
  ],
  // Staff run day-to-day ops but cannot see payroll/bank or manage employees.
  STAFF: [
    'customer.manage',
    'vehicle.manage',
    'appointment.manage',
    'finance.view'
  ]
};

export function can(role: Role, permission: Permission): boolean {
  return MATRIX[role]?.includes(permission) ?? false;
}

export function assertCan(role: Role, permission: Permission): void {
  if (!can(role, permission)) {
    throw new Error(`Forbidden: role ${role} lacks permission ${permission}`);
  }
}
