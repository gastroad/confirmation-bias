import { describe, it, expect } from "vitest";
import { successorByOldCluster } from "./daily";

// 관리자 재실행·백필로 같은 날짜를 다시 돌리면 클러스터가 새 id로 재생성된다.
// 이 매핑이 없으면 그 날짜의 댓글이 통째로 유실된다.
describe("successorByOldCluster", () => {
  const ids = ["a1", "a2", "a3", "a4"];

  it("기사를 가장 많이 물려받은 새 클러스터가 후계자가 된다", () => {
    const prev = new Map([
      ["a1", "old-1"],
      ["a2", "old-1"],
      ["a3", "old-1"],
    ]);
    // new-A가 a1,a2 / new-B가 a3 를 가져간다
    const groups = [[0, 1], [2]];
    const clusterIds = ["new-A", "new-B"];

    expect(successorByOldCluster(prev, ids, groups, clusterIds).get("old-1")).toBe("new-A");
  });

  it("옛 클러스터가 여럿이면 각각 후계자를 갖는다", () => {
    const prev = new Map([
      ["a1", "old-1"],
      ["a2", "old-2"],
    ]);
    const groups = [[0], [1]];
    const clusterIds = ["new-A", "new-B"];

    const m = successorByOldCluster(prev, ids, groups, clusterIds);
    expect(m.get("old-1")).toBe("new-A");
    expect(m.get("old-2")).toBe("new-B");
  });

  it("옛 클러스터가 쪼개져 동수가 되면 id가 작은 쪽으로 (결정적)", () => {
    const prev = new Map([
      ["a1", "old-1"],
      ["a2", "old-1"],
    ]);
    const groups = [[0], [1]];

    expect(successorByOldCluster(prev, ids, groups, ["new-B", "new-A"]).get("old-1")).toBe("new-A");
    // 순서를 바꿔도 같은 결과여야 한다
    expect(successorByOldCluster(prev, ids, [[1], [0]], ["new-A", "new-B"]).get("old-1")).toBe(
      "new-A"
    );
  });

  it("여러 옛 클러스터가 하나로 합쳐지면 둘 다 같은 후계자를 가리킨다", () => {
    const prev = new Map([
      ["a1", "old-1"],
      ["a2", "old-2"],
    ]);
    const groups = [[0, 1]];
    const clusterIds = ["new-A"];

    const m = successorByOldCluster(prev, ids, groups, clusterIds);
    expect(m.get("old-1")).toBe("new-A");
    expect(m.get("old-2")).toBe("new-A");
  });

  it("이전 배정이 없으면 (최초 클러스터링) 빈 매핑", () => {
    expect(successorByOldCluster(new Map(), ids, [[0, 1]], ["new-A"]).size).toBe(0);
  });
});
