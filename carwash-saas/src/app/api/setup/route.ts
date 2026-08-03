import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * One-time bootstrap endpoint. Creates the platform SUPER_ADMIN account if none
 * exists. Idempotent: repeated calls after the admin exists do nothing.
 *
 * Protect it by setting SEED_KEY in the environment and calling
 *   GET /api/setup?key=YOUR_SEED_KEY
 * Credentials come from SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD (or defaults).
 */
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key');
  const expected = process.env.SEED_KEY;
  if (expected && key !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const existing = await prisma.user.count({ where: { role: 'SUPER_ADMIN' } });
  if (existing > 0) {
    return NextResponse.json({ status: 'already_initialized' });
  }

  const email = (process.env.SUPERADMIN_EMAIL ?? 'admin@carwash.app').toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD ?? 'admin1234';

  await prisma.user.create({
    data: {
      name: 'System Owner',
      email,
      passwordHash: await hashPassword(password),
      role: 'SUPER_ADMIN'
    }
  });

  return NextResponse.json({ status: 'created', email });
}
