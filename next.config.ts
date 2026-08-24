import type { NextConfig } from "next";
import { createVanillaExtractPlugin } from "@vanilla-extract/next-plugin";

// Turbopack support is experimental in @vanilla-extract/next-plugin.
// `mode: "auto"` enables Turbopack config on Next >= 16, Webpack otherwise.
// If a Turbopack build breaks, run with `next build --webpack` to opt out.
const withVanillaExtract = createVanillaExtractPlugin({
  unstable_turbopack: { mode: "auto" },
});

// async `generateMetadata`의 결과는 body 끝으로 스트리밍된 뒤 인라인 스크립트가 head로 옮긴다.
// JS를 실행하지 않는 크롤러는 이걸 못 읽으므로, Next는 "HTML만 읽는 봇" 목록의 UA에만
// 메타데이터를 head에 담아 blocking 전송한다. 기본 목록에 **카카오톡이 없어** 카톡 공유 시
// OG 태그가 비었다(네이버 Yeti·페이스북·트위터는 기본 목록에 있어 정상).
// 이 옵션은 기본 목록을 대체하므로 기본값을 그대로 옮겨 적고 뒤에 카카오톡·다음을 덧붙인다.
// → Next 업그레이드 시 node_modules/next/dist/shared/lib/router/utils/html-bots.js 와 대조할 것.
const htmlLimitedBots =
  /[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight|kakaotalk-scrap|daumoa/i;

const nextConfig: NextConfig = {
  htmlLimitedBots,
};

export default withVanillaExtract(nextConfig);
