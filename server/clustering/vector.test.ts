import { describe, it, expect } from "vitest";
import { encodeEmbedding, decodeEmbedding, normalizeInPlace, centroidOf } from "./vector";

describe("encode/decodeEmbedding", () => {
  it("왕복 변환이 float32 정밀도 안에서 보존된다", () => {
    const src = [0.1, -0.25, 0, 1, -1, 0.333333];
    const out = decodeEmbedding(encodeEmbedding(src));
    expect(out.length).toBe(src.length);
    src.forEach((v, i) => expect(out[i]).toBeCloseTo(v, 6));
  });

  it("512차원이 2,048바이트가 된다 (JSON 대비 5배 절감의 근거)", () => {
    expect(encodeEmbedding(new Float32Array(512)).byteLength).toBe(2048);
  });

  it("byteOffset이 어긋난 뷰도 읽는다 (Prisma 반환값 방어)", () => {
    const encoded = encodeEmbedding([1, 2, 3]);
    const padded = new Uint8Array(encoded.byteLength + 1);
    padded.set(encoded, 1);
    const misaligned = padded.subarray(1);
    expect(misaligned.byteOffset).toBe(1);
    const out = decodeEmbedding(misaligned);
    expect([...out]).toEqual([1, 2, 3]);
  });

  it("길이가 4의 배수가 아니면 던진다", () => {
    expect(() => decodeEmbedding(new Uint8Array(5))).toThrow("4의 배수");
  });
});

describe("normalizeInPlace", () => {
  it("단위 벡터로 만든다", () => {
    const v = normalizeInPlace(new Float32Array([3, 4]));
    expect(Math.hypot(v[0], v[1])).toBeCloseTo(1);
  });

  it("영벡터는 그대로 둔다", () => {
    expect([...normalizeInPlace(new Float32Array([0, 0]))]).toEqual([0, 0]);
  });
});

describe("centroidOf", () => {
  it("그룹 평균을 정규화해 돌려준다", () => {
    const vectors = [new Float32Array([1, 0]), new Float32Array([0, 1])];
    const c = centroidOf(vectors, [0, 1]);
    expect(c[0]).toBeCloseTo(c[1], 6);
    expect(Math.hypot(c[0], c[1])).toBeCloseTo(1);
  });

  it("원소가 하나면 그 벡터를 낸다", () => {
    const vectors = [new Float32Array([0.6, 0.8])];
    const c = centroidOf(vectors, [0]);
    expect(c[0]).toBeCloseTo(0.6);
  });
});
