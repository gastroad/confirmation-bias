import type { CSSProperties } from "react";
import { LEANING_COLORS, LEANING_GROUP_LABELS } from "@/entities/outlet";
import type { LagGeometry } from "@/entities/cluster";
import { formatDuration } from "@/shared/lib/format";
import * as styles from "./LagStrip.css";

interface Props {
  lag: LagGeometry;
}

const AXIS_HOURS = [0, 6, 12, 18, 24];

/** 양 끝 눈금은 트랙 밖으로 삐져나가지 않게 끝에 붙인다. 가운데만 눈금 위에 중심을 맞춘다. */
function tickPosition(hour: number): CSSProperties {
  if (hour === 0) return { left: 0 };
  if (hour === 24) return { right: 0 };
  return { left: `${(hour / 24) * 100}%`, transform: "translateX(-50%)" };
}

/**
 * 시차를 문장으로. 가장 먼저 쓴 진영은 기준점이라 적지 않고, 따라온 진영만 격차를 적는다.
 * 보도하지 않은 진영은 `ranked`가 맨 뒤로 보내므로 문장 끝에 남는다.
 */
function lagBits(lag: LagGeometry): string[] {
  return lag.ranked.flatMap((lane) => {
    const name = LEANING_GROUP_LABELS[lane.group];
    if (lane.gapMinutes === null) return [`${name} 보도 없음`];
    if (lane.gapMinutes === 0) return [];
    return [`${name} +${formatDuration(lane.gapMinutes)}`];
  });
}

/**
 * 진영별 첫 보도와 그 뒤의 기사들을 KST 하루(0–24시) 위에 점으로 세운다.
 *
 * 기하 계산은 `calcLagGeometry`에 있고 여기서는 인라인 스타일로 옮기기만 한다.
 * recharts를 쓰지 않으므로 **클라이언트 컴포넌트가 아니다** — 점 위치가 서버에서 정해진다.
 *
 * **겹치는 점에 지터를 주지 않는다.** 같은 시간대에 몰렸다는 것 자체가 읽어야 할 신호라,
 * 흩뜨리면 그 신호가 사라진다. 대신 점마다 지면색 테두리를 둘러 개수가 세어지게 했다.
 */
export function LagStrip({ lag }: Props) {
  if (!lag.first) return null;

  return (
    <>
      <p className={styles.note}>
        <b className={styles.noteLead}>
          최초 {lag.first.time} {lag.first.outletName}
        </b>
        {lagBits(lag).map((bit) => (
          <span key={bit}> · {bit}</span>
        ))}
        {" · "}점 하나가 기사 하나, 가로축은 KST 0–24시
      </p>

      <div className={styles.strip}>
        <div className={styles.body}>
          <span className={styles.grid} aria-hidden="true" />

          {lag.lanes.map((lane) => (
            <div key={lane.group} className={styles.lane}>
              <span className={styles.laneLabel}>
                <span className={styles.laneName}>{LEANING_GROUP_LABELS[lane.group]}</span>
                <span className={styles.laneTime[lane.gapMinutes === 0 ? "lead" : "follower"]}>
                  {lane.firstTime ?? "—"}
                </span>
              </span>

              <span className={styles.laneTrack}>
                {lane.dots.length === 0 ? (
                  <span className={styles.laneEmpty}>보도 없음</span>
                ) : (
                  lane.dots.map((d, i) => (
                    <i
                      key={d.id}
                      className={styles.dot[d.isFirst ? "first" : "follower"]}
                      style={{
                        left: `${d.left}%`,
                        backgroundColor: LEANING_COLORS[d.leaning],
                        animationDelay: `${i * 22}ms`,
                      }}
                      title={`${d.outletName} ${d.time}`}
                    />
                  ))
                )}
              </span>
            </div>
          ))}
        </div>

        <div className={styles.axis}>
          {AXIS_HOURS.map((h) => (
            <span key={h} className={styles.tick} style={tickPosition(h)}>
              {h}시
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
