import { MembershipRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { generatePassword, hashPassword } from "@/lib/auth/password";

export async function createUserWithGeneratedPassword(input: {
  username: string;
  email: string;
  organizationId?: string;
  role?: MembershipRole;
}) {
  const generatedPassword = generatePassword(20);

  const user = await prisma.user.create({
    data: {
      username: input.username.trim(),
      email: input.email.trim().toLowerCase(),
      passwordHash: hashPassword(generatedPassword)
    }
  });

  if (input.organizationId) {
    await prisma.organizationMember.create({
      data: {
        organizationId: input.organizationId,
        userId: user.id,
        role: input.role || MembershipRole.ADMIN
      }
    });
  }

  return { user, generatedPassword };
}

export async function listUsersWithMemberships() {
  return prisma.user.findMany({
    include: {
      memberships: {
        include: {
          organization: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function listOrganizationAdmins(organizationId: string) {
  return prisma.organizationMember.findMany({
    where: {
      organizationId,
      role: MembershipRole.ADMIN
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          createdAt: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}

export async function createOrganizationAdminWithGeneratedPassword(input: {
  organizationId: string;
  username: string;
  email: string;
}) {
  const generatedPassword = generatePassword(20);

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        username: input.username.trim(),
        email: input.email.trim().toLowerCase(),
        passwordHash: hashPassword(generatedPassword)
      }
    });

    const membership = await tx.organizationMember.create({
      data: {
        organizationId: input.organizationId,
        userId: user.id,
        role: MembershipRole.ADMIN
      }
    });

    return { user, membership };
  });

  return { ...created, generatedPassword };
}

export async function resetOrganizationAdminPassword(input: {
  organizationId: string;
  userId: string;
}) {
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: input.organizationId,
        userId: input.userId
      }
    },
    include: {
      user: true
    }
  });

  if (!membership) {
    throw new Error("MEMBERSHIP_NOT_FOUND");
  }

  if (membership.role !== MembershipRole.ADMIN) {
    throw new Error("TARGET_NOT_ADMIN");
  }

  const generatedPassword = generatePassword(20);

  const user = await prisma.user.update({
    where: { id: input.userId },
    data: {
      passwordHash: hashPassword(generatedPassword)
    }
  });

  return { user, membership, generatedPassword };
}
