import { db } from "../server/db";

// 첫 관리자를 만드는 부트스트랩 스크립트.
//
//   npm run grant:admin -- you@example.com
//   npm run grant:admin -- you@example.com --revoke
//
// SDK의 auth.admin.setRole()은 호출자가 이미 admin이어야 해서 최초 1명은 만들 수 없다.
// Neon Auth가 관리하는 neon_auth."user" 테이블을 직접 갱신한다(Prisma 스키마 밖이라 raw SQL).

async function main() {
  const args = process.argv.slice(2);
  const email = args.find((a) => !a.startsWith("--"));
  const revoke = args.includes("--revoke");

  if (!email) {
    console.error("사용법: npm run grant:admin -- <이메일> [--revoke]");
    process.exit(1);
  }

  const role = revoke ? "user" : "admin";
  const rows = await db.$queryRawUnsafe<{ id: string; email: string; role: string }[]>(
    `UPDATE neon_auth."user" SET role = $1, "updatedAt" = now()
     WHERE lower(email) = lower($2)
     RETURNING id, email, role`,
    role,
    email
  );

  if (rows.length === 0) {
    console.error(`❌ ${email} 계정을 찾지 못했습니다. 먼저 /auth/sign-up 에서 가입하세요.`);
    process.exit(1);
  }

  console.log(`✅ ${rows[0].email} → role=${rows[0].role}`);
  console.log("   (이미 로그인 중이라면 다시 로그인해야 세션에 반영됩니다)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
