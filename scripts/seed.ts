import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  if (process.env.NODE_ENV !== 'development') {
    console.log('Seeding is only allowed in development mode.')
    await prisma.$disconnect()
    process.exit(0)
  }

  const adminPasswordHash = await bcrypt.hash('Admin123!', 12)

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      passwordHash: adminPasswordHash,
      acceptedTerms: true,
      displayName: 'System Administrator',
    },
  })

  await prisma.user.upsert({
    where: { email: 'demo.user@example.com' },
    update: {},
    create: {
      email: 'demo.user@example.com',
      firstName: 'Demo',
      lastName: 'User',
      passwordHash: await bcrypt.hash('Demo123!', 12),
      acceptedTerms: true,
      displayName: 'Demo User',
    },
  })

  await prisma.session.upsert({
    where: { token: 'demo-session-token' },
    update: {
      userId: adminUser.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    },
    create: {
      userId: adminUser.id,
      token: 'demo-session-token',
      ip: '127.0.0.1',
      userAgent: 'seed-script',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      createdBy: 'seed-script',
      updatedBy: 'seed-script',
    },
  })

  await prisma.magicLink.upsert({
    where: { token: 'demo-magic-link-token' },
    update: {
      email: 'demo.user@example.com',
      expiresAt: new Date(Date.now() + 1000 * 60 * 10),
    },
    create: {
      email: 'demo.user@example.com',
      token: 'demo-magic-link-token',
      expiresAt: new Date(Date.now() + 1000 * 60 * 10),
      createdBy: 'seed-script',
      updatedBy: 'seed-script',
    },
  })

  console.log('Seed completed.')
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
