import "dotenv/config";
import { MembershipRole } from "@prisma/client";
import { prisma } from "../src/lib/db";
import { generatePassword, hashPassword } from "../src/lib/auth/password";

async function main() {
  const orgName = process.env.SEED_SUPERADMIN_ORG_NAME || "Contact Point HQ";
  const orgSlug = process.env.SEED_SUPERADMIN_ORG_SLUG || "contact-point-hq";
  const username = process.env.SEED_SUPERADMIN_USERNAME || "superadmin";
  const email = process.env.SEED_SUPERADMIN_EMAIL;

  if (!email) {
    throw new Error("SEED_SUPERADMIN_EMAIL is required for seeding");
  }

  const password = process.env.SEED_SUPERADMIN_PASSWORD || generatePassword(20);

  const org = await prisma.organization.upsert({
    where: { slug: orgSlug },
    update: { name: orgName },
    create: {
      name: orgName,
      slug: orgSlug
    }
  });

  const user = await prisma.user.upsert({
    where: { username },
    update: {
      email,
      passwordHash: hashPassword(password)
    },
    create: {
      username,
      email,
      passwordHash: hashPassword(password)
    }
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: user.id
      }
    },
    update: {
      role: MembershipRole.SUPERADMIN
    },
    create: {
      organizationId: org.id,
      userId: user.id,
      role: MembershipRole.SUPERADMIN
    }
  });

  console.log("Seed complete");
  console.log(`username: ${username}`);
  console.log(`email: ${email}`);
  if (!process.env.SEED_SUPERADMIN_PASSWORD) {
    console.log(`generated password: ${password}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
