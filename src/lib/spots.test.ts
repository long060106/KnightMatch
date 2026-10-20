import { describe, expect, it } from "vitest";
import { spotsFraction, spotsLevel } from "./spots";

describe("spotsLevel", () => {
  it("bands the share of the team that is still open", () => {
    expect(spotsLevel(17, 20)).toBe("high"); // 85%
    expect(spotsLevel(14, 20)).toBe("high"); // exactly 70%
    expect(spotsLevel(9, 20)).toBe("mid"); // 45%
    expect(spotsLevel(6, 20)).toBe("mid"); // exactly 30%
    expect(spotsLevel(3, 20)).toBe("low"); // 15%
    expect(spotsLevel(1, 1)).toBe("high");
  });

  it("treats a missing or zero team size as nearly full", () => {
    expect(spotsLevel(0, 0)).toBe("low");
  });
});

describe("spotsFraction", () => {
  it("writes open over team size", () => {
    expect(spotsFraction(8, 20)).toBe("8 / 20");
    expect(spotsFraction(8, null)).toBe("8");
  });
});
