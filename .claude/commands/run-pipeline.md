RSS 수집부터 DB 저장까지 전체 파이프라인을 실행합니다.

다음 순서로 실행하세요:

1. `npm run collect` — RSS 피드를 수집해 `data/new-articles.json`에 저장합니다.
2. 수집 결과를 확인합니다 (몇 개 수집됐는지, 에러 없는지).
3. `npm run ingest` — 임베딩 생성 후 클러스터 배정하여 DB에 저장합니다.
4. ingest 결과를 확인합니다 (assigned/new_cluster 비율, 에러 없는지).

OpenAI 431 에러가 발생하면 자동 재시도(최대 5회)되므로 기다립니다.
ECONNRESET 에러도 마찬가지로 자동 재시도됩니다.
