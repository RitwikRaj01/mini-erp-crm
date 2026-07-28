import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("password123", 10);

  const users: { name: string; email: string; role: Role }[] = [
    { name: "Admin User", email: "admin@erp.test", role: Role.ADMIN },
    { name: "Sales User", email: "sales@erp.test", role: Role.SALES },
    { name: "Warehouse User", email: "warehouse@erp.test", role: Role.WAREHOUSE },
    { name: "Accounts User", email: "accounts@erp.test", role: Role.ACCOUNTS },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: { ...user, password },
    });
  }

  console.log("Seeded users with password: password123");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
