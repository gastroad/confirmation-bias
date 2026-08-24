const BYTES_PER_FLOAT = 4;
const LITTLE_ENDIAN = true;

// 임베딩을 JSON 문자열(≈10KB/건)이 아니라 Float32 raw bytes(2,048B/건)로 저장한다.
// Neon free의 storage 0.5GB 안에 들어가려면 5배 절감이 필요했다.
//
// Buffer 대신 DataView를 쓰는 이유: (1) 엔디안을 명시할 수 있고 (2) byteOffset 정렬 제약이
// 없어 Prisma가 돌려주는 뷰를 그대로 읽을 수 있으며 (3) Prisma 7의 Bytes 타입이
// Uint8Array<ArrayBuffer>라 Buffer<ArrayBufferLike>와 제네릭이 어긋난다.

export function encodeEmbedding(vec: ArrayLike<number>): Uint8Array {
  const out = new Uint8Array(vec.length * BYTES_PER_FLOAT);
  const view = new DataView(out.buffer);
  for (let i = 0; i < vec.length; i++) {
    view.setFloat32(i * BYTES_PER_FLOAT, vec[i], LITTLE_ENDIAN);
  }
  return out;
}

export function decodeEmbedding(bytes: Uint8Array): Float32Array {
  if (bytes.byteLength % BYTES_PER_FLOAT !== 0) {
    throw new Error(`임베딩 바이트 길이가 4의 배수가 아님: ${bytes.byteLength}`);
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out = new Float32Array(bytes.byteLength / BYTES_PER_FLOAT);
  for (let i = 0; i < out.length; i++) {
    out[i] = view.getFloat32(i * BYTES_PER_FLOAT, LITTLE_ENDIAN);
  }
  return out;
}

/** 제자리 정규화. 배치가 수천 벡터를 다루므로 사본을 만들지 않는다. */
export function normalizeInPlace(v: Float32Array): Float32Array {
  let norm = 0;
  for (let i = 0; i < v.length; i++) norm += v[i] * v[i];
  norm = Math.sqrt(norm);
  if (norm === 0) return v;
  for (let i = 0; i < v.length; i++) v[i] /= norm;
  return v;
}

/** 그룹의 평균 벡터(정규화됨). 대표 기사 선정에 쓴다. */
export function centroidOf(
  vectors: readonly Float32Array[],
  indices: readonly number[]
): Float32Array {
  const dim = vectors[indices[0]].length;
  const c = new Float32Array(dim);
  for (const idx of indices) {
    const v = vectors[idx];
    for (let d = 0; d < dim; d++) c[d] += v[d];
  }
  for (let d = 0; d < dim; d++) c[d] /= indices.length;
  return normalizeInPlace(c);
}
