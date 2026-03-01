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
