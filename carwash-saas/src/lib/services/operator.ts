import 'server-only';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/format';
import type { Business } from '@prisma/client';

export type BusinessStatus = 'ACTIVE' | 'PASSIVE' | 'EXPIRED';

/** Effective status combining the active flag and subscription expiry. */
export function businessStatus(b: {
  isActive: boolean;
  subscriptionEndsAt: Date | null;
}): BusinessStatus {
  if (!b.isActive) return 'PASSIVE';
  if (b.subscriptionEndsAt && b.subscriptionEndsAt.getTime() < Date.now()) {
    return 'EXPIRED';
  }
  return 'ACTIVE';
}

/** Whether members of this business may currently sign in. */
export function canBusinessLogin(b: {
  isActive: boolean;
  subscriptionEndsAt: Date | null;
}): boolean {
  return businessStatus(b) === 'ACTIVE';
}

export interface BusinessMetrics {
  business: Business;
  status: BusinessStatus;
  ownerEmail: string | null;
  todayWashes: number;
  monthRevenue: number;
  appointmentsToday: number;
}

export interface OperatorOverview {
  rows: BusinessMetrics[];
  totalBusinesses: number;
  activeBusinesses: number;
  expiringSoon: number; // active, expiry within 7 days
  todayWashesTotal: number;
  monthRevenueTotal: number;
}

/**
 * Platform-wide view for the SUPER_ADMIN: every tenant business with its
 * subscription status, today's completed washes and this month's revenue.
 */
export async function getOperatorOverview(): Promise<OperatorOverview> {
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [businesses, owners, washAgg, revenueAgg] = await Promise.all([
    prisma.business.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.user.findMany({
      where: { role: 'OWNER' },
      select: { businessId: true, email: true }
    }),
    prisma.appointment.groupBy({
      by: ['businessId'],
      where: { status: 'COMPLETED', startAt: { gte: dayStart, lt: dayEnd } },
      _count: { _all: true }
    }),
    prisma.transaction.groupBy({
      by: ['businessId'],
      where: { type: 'INCOME', occurredAt: { gte: monthStart } },
      _sum: { amount: true }
    })
  ]);

  const ownerMap = new Map<string, string>();
  for (const o of owners) if (o.businessId) ownerMap.set(o.businessId, o.email);
  const washMap = new Map<string, number>();
  for (const w of washAgg) washMap.set(w.businessId, w._count._all);
  const revMap = new Map<string, number>();
  for (const r of revenueAgg) revMap.set(r.businessId, toNumber(r._sum.amount));

  let activeBusinesses = 0;
  let expiringSoon = 0;
  let todayWashesTotal = 0;
  let monthRevenueTotal = 0;

  const rows: BusinessMetrics[] = businesses.map((business) => {
    const status = businessStatus(business);
    const todayWashes = washMap.get(business.id) ?? 0;
    const monthRevenue = revMap.get(business.id) ?? 0;
    if (status === 'ACTIVE') activeBusinesses++;
    if (
      status === 'ACTIVE' &&
      business.subscriptionEndsAt &&
      business.subscriptionEndsAt <= soon
    ) {
      expiringSoon++;
    }
    todayWashesTotal += todayWashes;
    monthRevenueTotal += monthRevenue;
    return {
      business,
      status,
      ownerEmail: ownerMap.get(business.id) ?? null,
      todayWashes,
      monthRevenue,
      appointmentsToday: todayWashes
    };
  });

  return {
    rows,
    totalBusinesses: businesses.length,
    activeBusinesses,
    expiringSoon,
    todayWashesTotal,
    monthRevenueTotal
  };
}
