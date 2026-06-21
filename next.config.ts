import type { NextConfig } from "next";
import { createVanillaExtractPlugin } from "@vanilla-extract/next-plugin";

// Turbopack support is experimental in @vanilla-extract/next-plugin.
// `mode: "auto"` enables Turbopack config on Next >= 16, Webpack otherwise.
// If a Turbopack build breaks, run with `next build --webpack` to opt out.
const withVanillaExtract = createVanillaExtractPlugin({
  unstable_turbopack: { mode: "auto" },
});

const nextConfig: NextConfig = {};

export default withVanillaExtract(nextConfig);
