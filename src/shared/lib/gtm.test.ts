import { describe, expect, it } from "vitest";
import { CONSENT_REQUIRED_REGIONS, gtmBootstrapScript } from "./gtm";

type DataLayerEntry = IArguments | Record<string, unknown>;

function run(gtmId: string) {
  const inserted: { src: string }[] = [];
  const document = {
    getElementsByTagName: () => [
      { parentNode: { insertBefore: (el: { src: string }) => inserted.push(el) } },
    ],
    createElement: () => ({ src: "", async: false }),
  };
  const window: { dataLayer?: DataLayerEntry[] } = {};
  new Function("window", "document", `with(window){${gtmBootstrapScript(gtmId)}}`)(
    window,
    document
  );
  const entries = (window.dataLayer ?? []).map((e): unknown[] | Record<string, unknown> =>
    Object.prototype.toString.call(e) === "[object Arguments]"
      ? Array.from(e as IArguments)
      : (e as Record<string, unknown>)
  );
  return { entries, inserted };
}

describe("gtmBootstrapScript", () => {
  it("동의 기본값이 GTM 시작 이벤트보다 먼저 dataLayer에 들어간다", () => {
    const { entries } = run("GTM-TEST");
    const gtmStart = entries.findIndex((e) => !Array.isArray(e) && e.event === "gtm.js");
    const consents = entries.flatMap((e, i) =>
      Array.isArray(e) && e[0] === "consent" && e[1] === "default" ? [i] : []
    );
    expect(consents).toHaveLength(2);
    expect(Math.max(...consents)).toBeLessThan(gtmStart);
  });

  it("동의 지역은 네 항목 모두 거부로 시작하고, 그 밖은 허용이다", () => {
    const { entries } = run("GTM-TEST");
    const [global, regional] = entries
      .filter((e): e is unknown[] => Array.isArray(e) && e[0] === "consent")
      .map((e) => e[2] as Record<string, unknown>);
    expect(global).toMatchObject({ analytics_storage: "granted", ad_storage: "granted" });
    expect(global).not.toHaveProperty("region");
    expect(regional).toMatchObject({
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied",
      region: [...CONSENT_REQUIRED_REGIONS],
    });
  });

  it("컨테이너 ID로 gtm.js를 불러온다", () => {
    const { inserted } = run("GTM-TEST");
    expect(inserted.map((s) => s.src)).toEqual([
      "https://www.googletagmanager.com/gtm.js?id=GTM-TEST",
    ]);
  });
});
