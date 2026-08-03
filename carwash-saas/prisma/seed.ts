import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = (p: string) => bcrypt.hash(p, 10);

  // Platform super admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@carwash.app' },
    update: {},
    create: {
      name: 'System Owner',
      email: 'admin@carwash.app',
      passwordHash: await hash('admin1234'),
      role: 'SUPER_ADMIN'
    }
  });

  // Demo business + owner
  const business = await prisma.business.upsert({
    where: { slug: 'demo-oto' },
    update: {},
    create: {
      name: 'Demo Oto Yıkama',
      slug: 'demo-oto',
      city: 'İstanbul',
      currency: 'TRY',
      email: 'info@demo-oto.app',
      phone: '+90 555 000 0000'
    }
  });

  await prisma.user.upsert({
    where: { email: 'owner@demo-oto.app' },
    update: {},
    create: {
      name: 'Demo Sahibi',
      email: 'owner@demo-oto.app',
      passwordHash: await hash('owner1234'),
      role: 'OWNER',
      businessId: business.id
    }
  });

  // Services
  const serviceData = [
    { name: 'İç-Dış Yıkama', durationMin: 45, price: 350 },
    { name: 'Detaylı Temizlik', durationMin: 120, price: 1200 },
    { name: 'Sadece Dış Yıkama', durationMin: 20, price: 200 }
  ];
  for (const s of serviceData) {
    const exists = await prisma.service.findFirst({
      where: { businessId: business.id, name: s.name }
    });
    if (!exists) {
      await prisma.service.create({ data: { ...s, businessId: business.id } });
    }
  }

  // A couple of employees
  const empData = [
    { firstName: 'Ahmet', lastName: 'Yılmaz', position: 'Yıkama Ustası', monthlySalary: 25000 },
    { firstName: 'Mehmet', lastName: 'Demir', position: 'Detaycı', monthlySalary: 28000 }
  ];
  for (const e of empData) {
    const exists = await prisma.employee.findFirst({
      where: { businessId: business.id, firstName: e.firstName, lastName: e.lastName }
    });
    if (!exists) {
      await prisma.employee.create({ data: { ...e, businessId: business.id } });
    }
  }

  // A sample customer + vehicle
  let customer = await prisma.customer.findFirst({
    where: { businessId: business.id, phone: '+90 555 111 2233' }
  });
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        businessId: business.id,
        firstName: 'Ayşe',
        lastName: 'Kaya',
        phone: '+90 555 111 2233'
      }
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
  }

  console.log('Seed complete.');
  console.log('  Super admin:  admin@carwash.app / admin1234');
  console.log('  Business owner: owner@demo-oto.app / owner1234');
  console.log(`  Admin id: ${admin.id}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
