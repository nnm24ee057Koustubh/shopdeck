// One-time brand migration: purge remaining old-brand values from the live database.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = await prisma.setting.updateMany({
    where: { key: "contactEmail", value: { contains: "shopdeck" } },
    data: { value: "koustubhrd2005@gmail.com" },
  });
  console.log(`contactEmail rows updated: ${email.count}`);

  const addr = await prisma.setting.findFirst({
    where: { key: "businessAddress", value: { contains: "ShopDeck" } },
  });
  if (addr) {
    await prisma.setting.update({
      where: { key: "businessAddress" },
      data: { value: "Unic — delivering across India" },
    });
    console.log("businessAddress updated");
  }

  const admin = await prisma.user.findUnique({ where: { email: "admin@shopdeck.local" } });
  if (admin) {
    await prisma.user.update({ where: { id: admin.id }, data: { email: "admin@unic.local" } });
    console.log("admin email -> admin@unic.local");
  }

  console.log("brand migration complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
