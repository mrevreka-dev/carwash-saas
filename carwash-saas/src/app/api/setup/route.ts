import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * One-time bootstrap + maintenance endpoint. Protect it with SEED_KEY:
 *   GET /api/setup?key=SEED_KEY            → create SUPER_ADMIN if none exists
 *   GET /api/setup?key=SEED_KEY&reset=1    → reset SUPER_ADMIN password to SUPERADMIN_PASSWORD
 *   GET /api/setup?key=SEED_KEY&seed=1     → create a demo business + owner + services + staff
 *
 * Credentials come from SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD (or defaults).
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const key = params.get('key');
  const expected = process.env.SEED_KEY;
  if (expected && key !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const email = (process.env.SUPERADMIN_EMAIL ?? 'admin@carwash.app').toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD ?? 'admin1234';
  const result: Record<string, unknown> = {};

  // --- ensure / reset super admin ---
  const existing = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  if (!existing) {
    await prisma.user.create({
      data: { name: 'System Owner', email, passwordHash: await hashPassword(password), role: 'SUPER_ADMIN' }
    });
    result.admin = 'created';
  } else if (params.get('reset') === '1') {
    await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash: await hashPassword(password), email }
    });
    result.admin = 'password_reset';
  } else {
    result.admin = 'exists';
  }

  // --- optional demo seed ---
  if (params.get('seed') === '1') {
    let business = await prisma.business.findUnique({ where: { slug: 'demo-oto' } });
    if (!business) {
      business = await prisma.business.create({
        data: {
          name: 'Demo Oto Yıkama',
          slug: 'demo-oto',
          city: 'İstanbul',
          currency: 'TRY',
          phone: '+90 555 000 0000'
        }
      });
      const ownerExists = await prisma.user.findUnique({ where: { email: 'owner@demo-oto.app' } });
      if (!ownerExists) {
        await prisma.user.create({
          data: {
            name: 'Demo Sahibi',
            email: 'owner@demo-oto.app',
            passwordHash: await hashPassword('owner1234'),
            role: 'OWNER',
            businessId: business.id
          }
        });
      }
      await prisma.service.createMany({
        data: [
          { businessId: business.id, name: 'İç-Dış Yıkama', durationMin: 45, price: 350 },
          { businessId: business.id, name: 'Detaylı Temizlik', durationMin: 120, price: 1200 },
          { businessId: business.id, name: 'Sadece Dış Yıkama', durationMin: 20, price: 200 }
        ]
      });
      await prisma.employee.createMany({
        data: [
          { businessId: business.id, firstName: 'Ahmet', lastName: 'Yılmaz', position: 'Yıkama Ustası', monthlySalary: 25000 },
          { businessId: business.id, firstName: 'Mehmet', lastName: 'Demir', position: 'Detaycı', monthlySalary: 28000 }
        ]
      });
      const customer = await prisma.customer.create({
        data: { businessId: business.id, firstName: 'Ayşe', lastName: 'Kaya', phone: '+90 555 111 2233' }
      });
      await prisma.vehicle.create({
        data: {
          businessId: business.id,
          customerId: customer.id,
          plate: '34 ABC 123',
          make: 'Volkswagen',
          model: 'Golf',
          color: 'Beyaz',
          type: 'HATCHBACK'
        }
      });
      result.seed = 'created';
    } else {
      result.seed = 'exists';
    }
  }

  return NextResponse.json({ status: 'ok', email, ...result });
}
