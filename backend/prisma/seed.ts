import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  ALL_PERMISSIONS,
  SYSTEM_ROLE_PERMISSIONS,
  ROLE_ADMIN,
} from '../src/core/constants/permissions';

const prisma = new PrismaClient();

async function seedPermissions() {
  console.log('1/3  Seeding permissions catalog...');
  for (const p of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: { description: p.description, module: p.module },
      create: { key: p.key, description: p.description, module: p.module },
    });
  }
  const count = await prisma.permission.count();
  console.log(`     ✓ ${count} permissions ensured`);
}

async function seedRoles() {
  console.log('2/3  Seeding system roles + role-permissions...');
  const allPerms = await prisma.permission.findMany({ select: { id: true, key: true } });
  const keyToId = new Map(allPerms.map((p) => [p.key, p.id]));

  for (const [roleName, permKeys] of Object.entries(SYSTEM_ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: { isSystem: true },
      create: { name: roleName, isSystem: true },
    });

    // Reset permissions for this system role to match the catalog (idempotent re-seed).
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

    const rows = permKeys
      .map((k) => keyToId.get(k))
      .filter((id): id is string => Boolean(id))
      .map((permissionId) => ({ roleId: role.id, permissionId }));

    if (rows.length > 0) {
      await prisma.rolePermission.createMany({ data: rows, skipDuplicates: true });
    }
    console.log(`     ✓ ${roleName} (${rows.length} permissions)`);
  }
}

async function seedAdminUser() {
  console.log('3/3  Seeding default admin user...');
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME ?? 'Admin';

  if (!email || !password) {
    throw new Error(
      'SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in the environment to run the seed.',
    );
  }
  if (password.length < 8) {
    throw new Error('SEED_ADMIN_PASSWORD must be at least 8 characters long.');
  }

  const adminRole = await prisma.role.findUnique({ where: { name: ROLE_ADMIN } });
  if (!adminRole) throw new Error('Admin role missing — seedRoles() must run first');

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`     ✓ admin already exists: ${email} (skipping)`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      isActive: true,
      roles: { create: { roleId: adminRole.id } },
    },
  });
  // Don't log the password — operator already knows it (they set the env var)
  console.log(`     ✓ admin created: ${user.email}`);
}

async function main() {
  await seedPermissions();
  await seedRoles();
  await seedAdminUser();
  console.log('\nSeed complete.');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
