import { globalStyle } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

globalStyle("*, *::before, *::after", {
  boxSizing: "border-box",
});

globalStyle("html", {
  height: "100%",
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale",
});

globalStyle("body", {
  minHeight: "100%",
  margin: 0,
  display: "flex",
  flexDirection: "column",
  background: vars.color.bg,
  color: vars.color.text,
  fontFamily: vars.font.sans,
  // 한글은 어절 단위로 끊는다. keep-all이 없으면 "진보보다"가 "진보/보다"로 쪼개진다.
  // 긴 URL·식별자가 넘치지 않게 overflow-wrap을 함께 건다.
  wordBreak: "keep-all",
  overflowWrap: "break-word",
});

globalStyle("a", {
  color: "inherit",
  textDecoration: "none",
});

globalStyle("h1, h2, h3, p, ul, li", {
  margin: 0,
});

globalStyle("ul", {
  padding: 0,
  listStyle: "none",
});
