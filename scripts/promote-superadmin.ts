import "dotenv/config";
import { UserRole } from "@prisma/client";
import { prisma } from "../src/lib/db";

function readArg(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) return null;
  return value.trim();
}

async function main() {
  const username = readArg("--username");
  const emailArg = readArg("--email");
  const email = emailArg ? emailArg.toLowerCase() : null;

  if (!username && !email) {
    throw new Error("Provide --username <value> or --email <value>");
  }

  const user = await prisma.user.findFirst({
    where: username ? { username } : { email: email! },
    select: {
      id: true,
      username: true,
      email: true
    }
  });

  if (!user) {
    throw new Error("User not found");
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { role: UserRole.SUPERADMIN }
    });

    await tx.organizationMember.deleteMany({
      where: { userId: user.id }
    });
  });

  console.log("User promoted to SUPERADMIN.");
  console.log(`username: ${user.username}`);
  console.log(`email: ${user.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
