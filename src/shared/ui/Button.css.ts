import { style, styleVariants } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

/**
 * 버튼의 공통 기하. **색은 variant가, 크기는 size가** 정하고 세 갈래는 서로 겹치지 않는다 —
 * 겹치지 않아야 선언 순서(base → variants → sizes)만으로 덮이고, 클래스를 나열하는 쪽이
 * 순서를 신경 쓰지 않아도 된다.
 *
 * 테두리를 투명한 1px로 깔아 둔다. 채운 버튼(primary)과 윤곽 버튼(secondary)이 같은 size에서
 * 같은 높이로 서게 하려는 것이다 — 흩어져 있던 시절엔 `border: none`과 1px이 섞여 나란히
 * 두면 2px씩 어긋났다.
 */
export const base = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  border: "1px solid transparent",
  borderRadius: vars.radius.md,
  background: "transparent",
  fontFamily: vars.font.sans,
  lineHeight: 1.4,
  textDecoration: "none",
  cursor: "pointer",
  transition: "opacity 0.15s, background 0.12s, border-color 0.15s, color 0.15s",
  selectors: {
    "&:disabled": { opacity: 0.5, cursor: "default" },
  },
});

export const variants = styleVariants({
  /** 그 화면이 권하는 동작. 유채색을 두지 않으므로 강조는 색이 아니라 잉크 반전이다. */
  primary: {
    background: vars.color.accent,
    color: vars.color.accentFg,
    fontWeight: 600,
    selectors: { "&:hover:not(:disabled)": { opacity: 0.9 } },
  },
  /** 되돌릴 수 없는 동작(회원 탈퇴). 상태 색은 정치 성향과 무관하다. */
  danger: {
    background: vars.color.dangerFg,
    color: vars.color.accentFg,
    fontWeight: 600,
    selectors: { "&:hover:not(:disabled)": { opacity: 0.9 } },
  },
  /** 나란히 놓인 대안(취소·홈으로·더 보기). 지면 위에 윤곽으로만 선다. */
  secondary: {
    borderColor: vars.color.border,
    color: vars.color.textSecondary,
    fontWeight: 500,
    selectors: {
      "&:hover:not(:disabled)": {
        background: vars.color.surfaceHover,
        borderColor: vars.color.borderHover,
        color: vars.color.text,
      },
    },
  },
  /**
   * 행 끝에 숨어 있는 파괴적 동작(댓글 삭제·차단 해제). 평소엔 흐리게 두고 hover에서만
   * danger로 드러낸다 — 목록을 훑는 동안 빨강이 시선을 끌면 읽을 것이 밀린다.
   */
  quiet: {
    color: vars.color.textFaint,
    fontWeight: 400,
    selectors: {
      "&:hover:not(:disabled)": {
        background: vars.color.dangerBg,
        color: vars.color.dangerFg,
      },
    },
  },
});

export const sizes = styleVariants({
  /** 행 안에 끼어 드는 크기. 줄 높이를 밀지 않는다. */
  xs: { padding: "2px 6px", borderRadius: vars.radius.sm, fontSize: 12 },
  sm: { padding: "6px 12px", fontSize: 13 },
  md: { padding: "9px 16px", fontSize: 13 },
  /** 그 화면의 주 동작(로그인·탈퇴·상태 화면). */
  lg: { padding: "11px 18px", fontSize: 14 },
});

export const fullWidth = style({ width: "100%" });
