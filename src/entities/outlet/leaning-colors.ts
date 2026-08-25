import { vars } from "@/shared/styles/theme.css";
import type { Leaning, TiltSide } from "./model";

// model.ts와 분리해 둔 이유: prisma/seed.ts가 model.ts를 tsx로 직접 import한다.
// 거기에 .css.ts 의존이 섞이면 번들러 없이 도는 시드 스크립트가 깨진다.

export const LEANING_COLORS: Record<Leaning, string> = {
  left: vars.leaning.left,
  center_left: vars.leaning.centerLeft,
  center: vars.leaning.center,
  center_right: vars.leaning.centerRight,
  right: vars.leaning.right,
  unknown: vars.leaning.unknown,
};

/** 편향 수치를 글자로 쓸 때의 색. 막대 색은 배경용이라 본문 대비가 부족하다. */
export const TILT_COLORS: Record<TiltSide, string> = {
  progressive: vars.leaning.progressiveText,
  conservative: vars.leaning.conservativeText,
  balanced: vars.color.textFaint,
};
