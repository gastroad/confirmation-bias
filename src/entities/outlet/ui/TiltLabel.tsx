import { LEANING_GROUP_LABELS, tiltSide } from "../model";
import { TILT_COLORS } from "../leaning-colors";
import * as styles from "./TiltLabel.css";

interface Props {
  /** 진보 비율 − 보수 비율 (%p) */
  tilt: number;
  /**
   * 단위(%p)까지 적는다. 좁은 카드 한 줄에서는 생략해 자리를 아끼고,
   * 수치가 주장인 자리(주간 리포트)에서는 붙인다.
   */
  showUnit?: boolean;
}

/** "보수 +20" / "균형". 막대가 말하는 것을 수치로 한 번 더 못박는다. */
export function TiltLabel({ tilt, showUnit = false }: Props) {
  const side = tiltSide(tilt);
  const text =
    side === "balanced"
      ? "균형"
      : `${LEANING_GROUP_LABELS[side]} +${Math.round(Math.abs(tilt))}${showUnit ? "%p" : ""}`;

  return (
    <span className={styles.root} style={{ color: TILT_COLORS[side] }}>
      {text}
    </span>
  );
}
