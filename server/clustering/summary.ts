/**
 * 클러스터 요약 문장 생성 — **이 서비스가 화면에 쓰는 유일한 자체 텍스트다.**
 *
 * 뉴스 애그리게이터는 남의 제목과 발췌만 늘어놓으면 "복제된 콘텐츠"가 된다(실제로
 * 2026-08-25 AdSense 심사에서 그 통보를 받았다). 원문 어디에도 없고 우리 데이터로만
 * 나오는 정보 — **누가 얼마나 다뤘고, 어느 진영이 침묵했으며, 누가 먼저 썼는가** — 를
 * 문장으로 옮긴다. → docs/agent/adsense-compliance.md
 *
 * **LLM을 쓰지 않는다.** 1만 개를 자동 생성하면 이번엔 Google의 `scaled content abuse`에
 * 걸려 위반 하나를 다른 위반으로 바꾸는 셈이 된다. 규칙 기반이면서도 문장이 데이터에서
 * 나오므로 클러스터마다 내용이 달라진다.
 *
 * 순수 함수다 — DB도 시각(now)도 보지 않는다.
 */

export type SummaryLeaningGroup = "progressive" | "neutral" | "conservative";

/**
 * leaning → 진영 그룹. `src/entities/outlet/model.ts`의 `LEANING_GROUPS`와 **같은 값이어야
 * 한다.** `server/`는 `src/`를 import할 수 없어(레이어 방향) 부득이하게 여기 한 번 더 둔다.
 * 새 leaning 값을 추가하면 양쪽을 같이 고친다. 여기 없는 leaning은 어느 진영도 아닌 것으로
 * 다뤄져 진영 통계에서 빠진다(그래야 "미분류"가 한 진영처럼 잡히지 않는다).
 */
const GROUP_BY_LEANING: Record<string, SummaryLeaningGroup> = {
  left: "progressive",
  center_left: "progressive",
  center: "neutral",
  center_right: "conservative",
  right: "conservative",
};

const GROUP_ORDER: SummaryLeaningGroup[] = ["progressive", "neutral", "conservative"];

const GROUP_LABEL: Record<SummaryLeaningGroup, string> = {
  progressive: "진보",
  neutral: "중도",
  conservative: "보수",
};

export interface SummaryOutlet {
  id: string;
  name: string;
  leaning: string;
}

export interface SummaryArticle {
  outletId: string;
  publishedAt: Date;
}

/** 이름을 나열할 때 최대 몇 개까지 적을지. 넘으면 "등 N곳"으로 접는다. */
const MAX_NAMES = 3;

/** 이 시차 미만이면 "따라왔다"고 말할 만한 간격이 아니라고 보고 문장을 만들지 않는다. */
const MIN_LAG_MS = 60 * 60 * 1000;

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function formatKstTime(d: Date): string {
  const kst = new Date(d.getTime() + KST_OFFSET_MS);
  const hh = String(kst.getUTCHours()).padStart(2, "0");
  const mm = String(kst.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function nameList(names: string[]): string {
  if (names.length <= MAX_NAMES) return names.join("·");
  return `${names.slice(0, MAX_NAMES).join("·")} 등 ${names.length}곳`;
}

interface GroupStat {
  group: SummaryLeaningGroup;
  reporting: SummaryOutlet[];
  silent: SummaryOutlet[];
  earliest: Date | null;
}

function collectStats(articles: SummaryArticle[], outlets: SummaryOutlet[]): GroupStat[] {
  // 이름 나열이 실행할 때마다 달라지면 안 된다(DB findMany는 순서를 보장하지 않는다).
  const sorted = [...outlets].sort((a, b) => a.id.localeCompare(b.id));

  const earliestByOutlet = new Map<string, Date>();
  for (const a of articles) {
    const prev = earliestByOutlet.get(a.outletId);
    if (!prev || a.publishedAt < prev) earliestByOutlet.set(a.outletId, a.publishedAt);
  }

  return GROUP_ORDER.map((group) => {
    const members = sorted.filter((o) => GROUP_BY_LEANING[o.leaning] === group);
    const reporting = members.filter((o) => earliestByOutlet.has(o.id));
    const times = reporting.map((o) => earliestByOutlet.get(o.id)!.getTime());
    return {
      group,
      reporting,
      silent: members.filter((o) => !earliestByOutlet.has(o.id)),
      earliest: times.length > 0 ? new Date(Math.min(...times)) : null,
    };
  });
}

/** "7개 언론사가 이 사건을 보도했습니다 — 진보 4곳, 중도 2곳, 보수 1곳." */
function coverageSentence(stats: GroupStat[], reportingOutlets: SummaryOutlet[]): string {
  if (reportingOutlets.length === 1) {
    return `${reportingOutlets[0].name} 한 곳만 이 사건을 보도했습니다.`;
  }

  const parts = stats
    .filter((s) => s.reporting.length > 0)
    .map((s) => `${GROUP_LABEL[s.group]} ${s.reporting.length}곳`);

  const head = `${reportingOutlets.length}개 언론사가 이 사건을 보도했습니다`;
  return parts.length > 0 ? `${head} — ${parts.join(", ")}.` : `${head}.`;
}

/**
 * 침묵 문장. **원문 어디에도 없는, 이 서비스의 가장 고유한 정보다.**
 *
 * "다루지 않았습니다"가 아니라 "확인되지 않았습니다"라고 쓴다 — 우리가 아는 것은 수집한
 * 피드에 없었다는 사실뿐이고, 지면에 실렸는데 RSS에 안 실렸을 수 있다.
 */
function silenceSentence(stats: GroupStat[]): string | null {
  const silentGroups = stats.filter((s) => s.reporting.length === 0 && s.silent.length > 0);

  if (silentGroups.length === 1) {
    const s = silentGroups[0];
    return `${GROUP_LABEL[s.group]} 성향 매체 ${s.silent.length}곳(${nameList(
      s.silent.map((o) => o.name)
    )})에서는 관련 보도가 확인되지 않았습니다.`;
  }
  if (silentGroups.length > 1) {
    // 두 진영 이상이 통째로 빠지면 이름까지 적기엔 길다. 진영만 말한다.
    const labels = silentGroups.map((s) => GROUP_LABEL[s.group]).join("·");
    const total = silentGroups.reduce((n, s) => n + s.silent.length, 0);
    return `${labels} 성향 매체 ${total}곳에서는 관련 보도가 확인되지 않았습니다.`;
  }

  // 통째로 빠진 진영이 없으면 개별 매체를 짚는다.
  const silent = stats.flatMap((s) => s.silent);
  if (silent.length === 0) return null;
  return `${nameList(silent.map((o) => o.name))}에서는 관련 보도가 확인되지 않았습니다.`;
}

/**
 * "최초 보도는 한겨레신문(06:12), 보수 성향 매체는 9시간 뒤에 따라왔습니다."
 *
 * **언론사 이름 뒤에 조사를 붙이지 않는다.** "…였고"는 받침에 따라 "이었고"가 되어야 하고
 * ("서울신문이었고"), SBS 같은 알파벳 이름까지 얹히면 규칙이 늘어난다. 이름 뒤를 쉼표로
 * 끊으면 그 문제가 통째로 사라진다.
 */
function lagSentence(
  stats: GroupStat[],
  articles: SummaryArticle[],
  outletById: Map<string, SummaryOutlet>
): string | null {
  const covered = stats.filter((s) => s.earliest !== null);
  if (covered.length < 2) return null;

  const first = articles.reduce((a, b) => (a.publishedAt <= b.publishedAt ? a : b));
  const firstName = outletById.get(first.outletId)?.name;
  if (!firstName) return null;

  const latest = covered.reduce((a, b) => (a.earliest! > b.earliest! ? a : b));
  const lagMs = latest.earliest!.getTime() - first.publishedAt.getTime();
  if (lagMs < MIN_LAG_MS) return null;

  const hours = Math.round(lagMs / (60 * 60 * 1000));
  return `최초 보도는 ${firstName}(${formatKstTime(first.publishedAt)}), ${
    GROUP_LABEL[latest.group]
  } 성향 매체는 ${hours}시간 뒤에 따라왔습니다.`;
}

/**
 * 클러스터 하나의 요약 문장. 기사가 없으면 null.
 *
 * `outlets`에는 **그 사건을 보도하지 않은 매체까지 전부** 넘겨야 한다. 침묵을 말하려면
 * 전체 명단을 알아야 하기 때문이다.
 */
export function buildClusterSummary(
  articles: SummaryArticle[],
  outlets: SummaryOutlet[]
): string | null {
  if (articles.length === 0) return null;

  const outletById = new Map(outlets.map((o) => [o.id, o]));
  const reportingIds = new Set(articles.map((a) => a.outletId));
  const reportingOutlets = [...reportingIds]
    .map((id) => outletById.get(id))
    .filter((o): o is SummaryOutlet => Boolean(o));
  if (reportingOutlets.length === 0) return null;

  const stats = collectStats(articles, outlets);

  return [
    coverageSentence(stats, reportingOutlets),
    silenceSentence(stats),
    lagSentence(stats, articles, outletById),
  ]
    .filter((s): s is string => Boolean(s))
    .join(" ");
}
