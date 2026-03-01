import { MembershipRole, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { toSlug } from "@/lib/slug";
import { generatePassword, hashPassword } from "@/lib/auth/password";

export async function listOrganizations() {
  return prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          members: true,
          templates: true,
          apiKeys: true
        }
      }
    }
  });
}

export async function createOrganization(input: { name: string; slug?: string }) {
  const slug = input.slug ? toSlug(input.slug) : toSlug(input.name);

  return prisma.organization.create({
    data: {
      name: input.name.trim(),
      slug
    }
  });
}

export async function createOrganizationWithInitialAdmin(input: {
  name: string;
  slug?: string;
  adminUsername: string;
  adminEmail: string;
}) {
  const slug = input.slug ? toSlug(input.slug) : toSlug(input.name);
  const generatedPassword = generatePassword(20);

  return prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: input.name.trim(),
        slug
      }
    });

    const adminUser = await tx.user.create({
      data: {
        username: input.adminUsername.trim(),
        email: input.adminEmail.trim().toLowerCase(),
        passwordHash: hashPassword(generatedPassword),
        mustChangePassword: true
      }
    });

    const membership = await tx.organizationMember.create({
      data: {
        organizationId: organization.id,
        userId: adminUser.id,
        role: MembershipRole.ADMIN
      }
    });

    return { organization, adminUser, membership, generatedPassword };
  });
}

export async function updateOrganization(orgId: string, input: { name?: string; slug?: string }) {
  const data: Prisma.OrganizationUpdateInput = {};

  if (input.name) {
    data.name = input.name.trim();
  }

  if (input.slug) {
    data.slug = toSlug(input.slug);
  }

  return prisma.organization.update({
    where: { id: orgId },
    data
  });
}

export async function deleteOrganization(orgId: string) {
  return prisma.organization.delete({
    where: { id: orgId }
  });
}

export async function assignOrganizationAdmin(input: {
  organizationId: string;
  userId: string;
  role?: MembershipRole;
}) {
  return prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: input.organizationId,
        userId: input.userId
      }
    },
    update: {
      role: input.role || MembershipRole.ADMIN
    },
    create: {
      organizationId: input.organizationId,
      userId: input.userId,
      role: input.role || MembershipRole.ADMIN
    }
  });
}

export async function revokeOrganizationAdmin(input: { organizationId: string; userId: string }) {
  return prisma.organizationMember.delete({
    where: {
      organizationId_userId: {
        organizationId: input.organizationId,
        userId: input.userId
      }
    }
  });
}
