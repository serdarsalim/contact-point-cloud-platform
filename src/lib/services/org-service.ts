import { MembershipRole, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { toSlug } from "@/lib/slug";

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
