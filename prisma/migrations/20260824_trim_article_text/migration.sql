-- 저작권 대응. 되돌릴 수 없다 — 원본 description은 이 시점에 소실된다.
--
-- 일부 언론사(뉴시스·서울신문·천지일보)가 RSS description에 본문 전문을 실어 보내
-- 최대 7,681자가 저장·표시되고 있었다. 우리는 "어느 매체가 이 이슈를 어떻게 다뤘는가"를
-- 보여주는 서비스이므로 발췌면 충분하고, 전문은 원문 링크로 보낸다.
-- 앞으로의 수집은 scripts/collect.ts의 toExcerpt()가 같은 길이로 자른다.
UPDATE "Article"
SET description = left(description, 300) || '…'
WHERE description IS NOT NULL AND length(description) > 300;

-- body는 한 번도 채워진 적이 없다(전 24,526행 null). 전문 저장 의도가 남아 있던 흔적이라
-- 리스크로 인식돼 왔으므로 제거한다.
ALTER TABLE "Article" DROP COLUMN "body";

-- Postgres는 DROP COLUMN·UPDATE 만으로 디스크를 돌려주지 않는다. 적용 후 따로 실행:
--   VACUUM FULL "Article";
