import 'server-only';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/format';

export interface FinanceSummary {
  income: number;
  expense: number;
  net: number;
  byMethod: Record<string, number>;
}

/** Income/expense totals for a business over an optional date range. */
export async function getFinanceSummary(
  businessId: string,
  from?: Date,
  to?: Date
): Promise<FinanceSummary> {
  const where = {
    businessId,
    ...(from || to
      ? { occurredAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
      : {})
  };

  const txns = await prisma.transaction.findMany({
    where,
    select: { type: true, amount: true, method: true }
  });

  const summary: FinanceSummary = { income: 0, expense: 0, net: 0, byMethod: {} };
  for (const t of txns) {
    const amt = toNumber(t.amount);
    if (t.type === 'INCOME') {
      summary.income += amt;
      summary.byMethod[t.method] = (summary.byMethod[t.method] ?? 0) + amt;
    } else {
      summary.expense += amt;
    }
  }
  summary.net = summary.income - summary.expense;
  return summary;
}

/** Current balance for a bank account: opening + IN - OUT. */
export async function getBankAccountBalance(accountId: string): Promise<number> {
  const account = await prisma.bankAccount.findUnique({
    where: { id: accountId },
    select: { openingBalance: true }
  });
  if (!account) return 0;

  const agg = await prisma.bankTransaction.groupBy({
    by: ['direction'],
    where: { bankAccountId: accountId },
    _sum: { amount: true }
  });

  let balance = toNumber(account.openingBalance);
  for (const row of agg) {
    const sum = toNumber(row._sum.amount);
    balance += row.direction === 'IN' ? sum : -sum;
  }
  return balance;
}
