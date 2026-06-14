---
description: RSS 수집부터 DB 저장까지 전체 파이프라인을 실행합니다.
---

# Run Pipeline

RSS 피드 수집부터 임베딩·클러스터 배정·DB 저장까지 전체 파이프라인을 순서대로 실행합니다.

## 실행 순서

1. **수집** — `npm run collect`
   RSS 피드를 수집해 `data/new-articles.json`에 저장합니다.
2. **수집 결과 확인** — 몇 개가 수집됐는지, 에러는 없는지 점검합니다.
3. **적재** — `npm run ingest`
   임베딩을 생성한 뒤 클러스터를 배정하여 DB에 저장합니다.
4. **적재 결과 확인** — `assigned` / `new_cluster` 비율과 에러 여부를 점검합니다.

## 에러 처리

- OpenAI **431** 에러는 자동 재시도(최대 5회)되므로 기다립니다.
- **ECONNRESET** 에러도 동일하게 자동 재시도됩니다.
