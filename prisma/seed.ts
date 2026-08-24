import { db } from "../server/db";
import { OUTLETS } from "../src/entities/outlet/model";

async function main() {
  console.log("🌱 Seeding outlets…");

  for (const outlet of OUTLETS) {
    await db.outlet.upsert({
      where: { id: outlet.id },
      update: { name: outlet.name, domain: outlet.domain, leaning: outlet.leaning },
      create: { id: outlet.id, name: outlet.name, domain: outlet.domain, leaning: outlet.leaning },
    });
  }
  console.log(`  ✓ ${OUTLETS.length} outlets`);

  // 목록에서 뺀 언론사가 DB에 남으면 필터 UI에 계속 뜬다(upsert만으로는 안 지워진다).
  // 기사가 있는 언론사는 FK 때문에 지울 수 없고, 지워서도 안 된다 — 과거 기사의 출처이므로
  // 수집만 멈추고 데이터는 보존한다. 기사가 0건인 것만 정리한다.
  const stale = await db.outlet.findMany({
    where: { id: { notIn: OUTLETS.map((o) => o.id) } },
    select: { id: true, name: true, _count: { select: { articles: true } } },
  });

  for (const o of stale) {
    if (o._count.articles > 0) {
      console.log(`  · ${o.name}: 목록에 없지만 기사 ${o._count.articles}건이 있어 남긴다`);
      continue;
    }
    await db.outlet.delete({ where: { id: o.id } });
    console.log(`  ✗ ${o.name}: 제거 (기사 0건)`);
  }

  console.log("✅ Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
