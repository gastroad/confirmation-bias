import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../src/generated/prisma/client";
import { OUTLETS } from "../src/entities/outlet/model";

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL ?? "file:./dev.db" });
const db = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding outlets…");

  for (const outlet of OUTLETS) {
    await db.outlet.upsert({
      where:  { id: outlet.id },
      update: { name: outlet.name, domain: outlet.domain, leaning: outlet.leaning },
      create: { id: outlet.id, name: outlet.name, domain: outlet.domain, leaning: outlet.leaning },
    });
  }

  console.log(`  ✓ ${OUTLETS.length} outlets`);
  console.log("✅ Seeding complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
