import type { ButtonHTMLAttributes } from "react";
import * as styles from "./Button.css";

export type ButtonVariant = keyof typeof styles.variants;
export type ButtonSize = keyof typeof styles.sizes;

export interface ButtonStyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** 폼에서 한 줄을 다 쓰는 주 동작(로그인·가입) */
  fullWidth?: boolean;
  /** 바깥 자리가 정하는 것만 얹는다 — 정렬·flex 지분 같은 것 */
  className?: string;
}

/**
 * 버튼의 생김새를 클래스로만 꺼낸다. `<Link>`처럼 button 엘리먼트가 아닌 것에 입힐 때 쓴다.
 * shared는 프레임워크를 모르므로 next/link는 이 레이어로 들어오지 않는다.
 */
export function buttonClass({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
}: ButtonStyleProps = {}): string {
  const classes = [styles.base, styles.variants[variant], styles.sizes[size]];
  if (fullWidth) classes.push(styles.fullWidth);
  if (className) classes.push(className);
  return classes.join(" ");
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & ButtonStyleProps;

/** 기본 `type`은 "button"이다. 폼 안에서 제출이 필요하면 `type="submit"`을 명시한다. */
export function Button({
  variant,
  size,
  fullWidth,
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, fullWidth, className })}
      {...rest}
    />
  );
}
