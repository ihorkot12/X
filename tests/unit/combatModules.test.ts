import { describe, expect, it } from "vitest";

import {
  ACTIVE_COMBAT_MODULES,
  assessTestReadiness,
  getCombatModule,
  normalizeCombatProfile,
} from "../../src/lib/combatModules";
import type { Assessment, AthleteProfile } from "../../src/types";

const athlete: AthleteProfile = {
  name: "Тестовий спортсмен",
  age: 24,
  sex: "Male",
  heightCm: 180,
  weightKg: 82,
  sport: "MMA",
  level: "Amateur",
  strengthTrainingAge: "1-3 years",
  equipment: ["Barbell", "Med Balls", "Bike"],
  painAreas: [],
};

const assessment: Assessment = {
  squatOrTrapBar: 140,
  benchOrPushups: 35,
  pullups: 12,
  verticalJump: 52,
  broadJump: 245,
  medBallThrow: 8,
  sprint10m: 1.85,
  mas: 4.4,
  restingHr: 56,
  hrMax: 194,
  sleep: 4,
  stress: 2,
  soreness: 2,
  motivation: 5,
};

describe("combat module registry", () => {
  it("exposes only Kyokushin Karate and MMA in the current MVP", () => {
    expect(ACTIVE_COMBAT_MODULES.map((module) => module.id)).toEqual([
      "kyokushin-karate",
      "mma",
    ]);
  });

  it("keeps MMA profiles and normalizes Kyokushin to a striker profile", () => {
    expect(normalizeCombatProfile("MMA", "grappler")).toBe("grappler");
    expect(normalizeCombatProfile("MMA", "hybrid")).toBe("hybrid");
    expect(normalizeCombatProfile("Kyokushin Karate", "hybrid")).toBe("striker");
  });

  it("defines discipline-specific demands and mobility priorities", () => {
    const kyokushin = getCombatModule("Kyokushin Karate");
    const mma = getCombatModule("MMA");

    expect(kyokushin.allowedProfiles).toEqual(["striker"]);
    expect(kyokushin.mobilityRegions).toEqual(
      expect.arrayContaining(["ankle", "hip", "adductor", "t-spine"]),
    );
    expect(mma.allowedProfiles).toEqual(["striker", "grappler", "hybrid"]);
    expect(mma.mobilityRegions).toEqual(
      expect.arrayContaining(["hip", "t-spine", "shoulder", "wrist", "neck"]),
    );
  });
});

describe("test readiness", () => {
  it("reports complete data without inventing a performance classification", () => {
    const result = assessTestReadiness({ athlete, assessment });

    expect(result.completionPercent).toBe(100);
    expect(result.missingRequired).toEqual([]);
    expect(result.requiresCoachReview).toBe(false);
    expect(result.performanceClassification).toBe("pending-normative-data");
  });

  it("keeps a program possible with missing tests but lowers confidence", () => {
    const result = assessTestReadiness({
      athlete,
      assessment: {
        ...assessment,
        squatOrTrapBar: "",
        verticalJump: "",
        broadJump: "",
        medBallThrow: "",
        mas: "",
      },
    });

    expect(result.completionPercent).toBeLessThan(100);
    expect(result.missingRequired).toEqual(
      expect.arrayContaining(["lower-body-strength", "lower-body-power", "aerobic-capacity"]),
    );
    expect(result.canGenerateConservativeProgram).toBe(true);
    expect(result.requiresCoachReview).toBe(true);
  });

  it("adds safety gates when pain or concussion history is reported", () => {
    const result = assessTestReadiness({
      athlete: {
        ...athlete,
        painAreas: ["Knee", "Concussion History"],
      },
      assessment,
    });

    expect(result.requiresCoachReview).toBe(true);
    expect(result.safetyFlags).toEqual(
      expect.arrayContaining(["pain-reported", "concussion-history"]),
    );
    expect(result.blockedTestCategories).toEqual(
      expect.arrayContaining(["max-strength", "high-impact-power"]),
    );
  });
});
