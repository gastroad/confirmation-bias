import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { generateEmbeddings, generateEmbedding } from "./embed";

// OpenAI 임베딩 호출의 **재시도·순서 복원**을 고정한다.
//
// 이 파일이 다루는 실패는 전부 실제로 겪은 것들이다:
//  - 431: Cloudflare edge의 stale keep-alive 커넥션. 더 길게 쉬어 새 커넥션을 강제한다.
//  - 401/403: 키가 틀린 것이라 재시도해봐야 5번 다 틀린다. 즉시 던진다.
//  - 응답 순서: OpenAI는 요청 순서를 보장하지 않는다. data[].index로 되돌려야 한다.
//    이게 어긋나면 **틀린 벡터가 조용히 다른 기사에 붙어** 엉뚱한 클러스터가 만들어진다.

const OK_HEADERS = { "Content-Type": "application/json" };

/** data[].index를 붙인 정상 응답. order로 응답 순서를 뒤섞을 수 있다. */
function okResponse(count: number, order?: number[]) {
  const indices = order ?? [...Array(count).keys()];
  return new Response(
    JSON.stringify({ data: indices.map((index) => ({ index, embedding: [index, index + 0.5] })) }),
    { status: 200, headers: OK_HEADERS }
  );
}

const errResponse = (status: number, body = "boom") => new Response(body, { status });

/**
 * 매 호출마다 **새** Response를 만든다.
 * Response body는 한 번만 읽을 수 있어, 같은 객체를 mockResolvedValue로 재사용하면
 * 2회차부터 "Body is unusable"이 나 재시도 검증이 엉뚱한 오류로 덮인다.
 */
const alwaysRespond = (make: () => Response) =>
  fetchMock.mockImplementation(() => Promise.resolve(make()));

/**
 * 재시도 대기(setTimeout)를 건너뛰며 끝까지 돌린다.
 * fake timer 아래서는 pending 타이머를 직접 밀어줘야 프로미스가 진행된다.
 */
async function runWithTimers<T>(promise: Promise<T>): Promise<T> {
  const settled = promise.then(
    (value) => ({ ok: true as const, value }),
    (error) => ({ ok: false as const, error })
  );
  // 최대 재시도(5회)의 최장 대기(431: 3s·6s·9s·12s)를 덮고도 남는 만큼 민다.
  for (let i = 0; i < 40; i++) {
    await vi.advanceTimersByTimeAsync(5_000);
  }
  const result = await settled;
  if (!result.ok) throw result.error;
  return result.value;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("OPENAI_API_KEY", "sk-test");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("generateEmbeddings — 요청 형태", () => {
  it("입력이 비면 호출하지 않는다", async () => {
    expect(await generateEmbeddings([])).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("키가 없으면 호출 전에 던진다 — 네트워크를 낭비하지 않는다", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    await expect(generateEmbeddings(["가"])).rejects.toThrow("OPENAI_API_KEY is not set");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("모델·차원·인증 헤더를 실어 보낸다", async () => {
    alwaysRespond(() => okResponse(1));
    await runWithTimers(generateEmbeddings(["가"]));

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/embeddings");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer sk-test");
    expect(JSON.parse(init.body)).toEqual({
      model: "text-embedding-3-small",
      input: ["가"],
      dimensions: 512,
    });
  });

  it("100건씩 나눠 보낸다 — 기사마다 1요청이던 것을 배치로 묶은 이유", async () => {
    fetchMock.mockImplementation((_url: string, init: { body: string }) =>
      Promise.resolve(okResponse(JSON.parse(init.body).input.length))
    );

    const texts = Array.from({ length: 250 }, (_, i) => `기사 ${i}`);
    const out = await runWithTimers(generateEmbeddings(texts));

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const sizes = fetchMock.mock.calls.map((c) => JSON.parse(c[1].body).input.length);
    expect(sizes).toEqual([100, 100, 50]);
    expect(out).toHaveLength(250);
  });

  it("배치 경계를 넘어 순서가 이어진다", async () => {
    let batch = 0;
    fetchMock.mockImplementation((_url: string, init: { body: string }) => {
      const n = JSON.parse(init.body).input.length;
      const offset = batch++ * 100;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: Array.from({ length: n }, (_, i) => ({ index: i, embedding: [offset + i] })),
          }),
          { status: 200, headers: OK_HEADERS }
        )
      );
    });

    const out = await runWithTimers(
      generateEmbeddings(Array.from({ length: 150 }, (_, i) => `t${i}`))
    );
    expect(out[0]).toEqual([0]);
    expect(out[99]).toEqual([99]);
    expect(out[100]).toEqual([100]);
    expect(out[149]).toEqual([149]);
  });
});

describe("generateEmbeddings — 응답 순서 복원", () => {
  it("응답이 뒤섞여 와도 index로 되돌린다 — 벡터가 남의 기사에 붙지 않는다", async () => {
    alwaysRespond(() => okResponse(3, [2, 0, 1]));
    const out = await runWithTimers(generateEmbeddings(["가", "나", "다"]));
    expect(out).toEqual([
      [0, 0.5],
      [1, 1.5],
      [2, 2.5],
    ]);
  });

  it("입력 개수만큼의 배열을 돌려준다", async () => {
    alwaysRespond(() => okResponse(3));
    expect(await runWithTimers(generateEmbeddings(["가", "나", "다"]))).toHaveLength(3);
  });
});

describe("generateEmbeddings — 재시도", () => {
  it("일시적 실패(500) 뒤 성공하면 그 결과를 쓴다", async () => {
    fetchMock.mockResolvedValueOnce(errResponse(500)).mockResolvedValueOnce(okResponse(1));

    expect(await runWithTimers(generateEmbeddings(["가"]))).toEqual([[0, 0.5]]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("431도 재시도한다 — stale Cloudflare 커넥션이라 다음 시도에서 살아난다", async () => {
    fetchMock
      .mockResolvedValueOnce(errResponse(431, "Request Header Fields Too Large"))
      .mockResolvedValueOnce(errResponse(431))
      .mockResolvedValueOnce(okResponse(1));

    expect(await runWithTimers(generateEmbeddings(["가"]))).toEqual([[0, 0.5]]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("431은 일반 오류보다 오래 쉰다 — 커넥션이 만료되도록 기다리는 게 목적이다", async () => {
    const waits: number[] = [];
    const spy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((
      fn: () => void,
      ms?: number
    ) => {
      waits.push(ms ?? 0);
      fn();
      return 0 as unknown as NodeJS.Timeout;
    }) as typeof setTimeout);

    fetchMock.mockResolvedValueOnce(errResponse(431)).mockResolvedValueOnce(okResponse(1));
    await generateEmbeddings(["가"]);
    const wait431 = waits[0];

    waits.length = 0;
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(errResponse(500)).mockResolvedValueOnce(okResponse(1));
    await generateEmbeddings(["가"]);
    const wait500 = waits[0];

    spy.mockRestore();
    expect(wait431).toBeGreaterThan(wait500);
  });

  it("네트워크 예외(fetch reject)도 재시도한다", async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(okResponse(1));

    expect(await runWithTimers(generateEmbeddings(["가"]))).toEqual([[0, 0.5]]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("5번 모두 실패하면 마지막 오류를 던진다", async () => {
    alwaysRespond(() => errResponse(503, "unavailable"));
    await expect(runWithTimers(generateEmbeddings(["가"]))).rejects.toThrow("OpenAI 503");
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });
});

describe("generateEmbeddings — 재시도하면 안 되는 실패", () => {
  it("401은 즉시 던진다 — 키가 틀린 것이라 다시 걸어도 똑같다", async () => {
    alwaysRespond(() => errResponse(401, "invalid api key"));
    await expect(runWithTimers(generateEmbeddings(["가"]))).rejects.toThrow("OpenAI 401");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("403도 즉시 던진다", async () => {
    alwaysRespond(() => errResponse(403, "forbidden"));
    await expect(runWithTimers(generateEmbeddings(["가"]))).rejects.toThrow("OpenAI 403");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("오류 메시지에 상태 코드와 본문을 함께 담는다 — 로그만 보고 원인을 가려야 한다", async () => {
    alwaysRespond(() => errResponse(401, "Incorrect API key provided"));
    await expect(runWithTimers(generateEmbeddings(["가"]))).rejects.toThrow(
      /401.*Incorrect API key/
    );
  });
});

describe("generateEmbedding (단건)", () => {
  it("배치 함수의 첫 원소를 돌려준다", async () => {
    alwaysRespond(() => okResponse(1));
    expect(await runWithTimers(generateEmbedding("가"))).toEqual([0, 0.5]);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).input).toEqual(["가"]);
  });
});
