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
