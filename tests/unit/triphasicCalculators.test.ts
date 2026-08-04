import { describe, expect, it } from "vitest";

import {
  calculateCaffeineReferenceRange,
  calculateEstimatedOneRepMax,
  calculateSweatAndSodiumLoss,
  convertMass,
} from "../../src/lib/triphasicCalculators";

describe("convertMass", () => {
  it("converts between kilograms and pounds without changing the source value", () => {
    expect(convertMass(80, "kg", "lb")).toBeCloseTo(176.37, 2);
    expect(convertMass(176.37, "lb", "kg")).toBeCloseTo(80, 2);
    expect(convertMass(80, "kg", "kg")).toBe(80);
  });
});

describe("calculateEstimatedOneRepMax", () => {
  it("uses the verified Brzycki equation and returns a 50-100% load table", () => {
    const result = calculateEstimatedOneRepMax({
      liftedWeight: 100,
      repetitions: 5,
      unit: "kg",
    });

    expect(result.issues).toEqual([]);
    expect(result.value).toMatchObject({
      estimatedOneRepMax: 112.5,
      formula: "Brzycki",
      unit: "kg",
    });
    expect(result.value?.percentageLoads).toHaveLength(11);
    expect(result.value?.percentageLoads[0]).toEqual({ percentage: 100, load: 112.5 });
    expect(result.value?.percentageLoads.at(-1)).toEqual({ percentage: 50, load: 56.3 });
  });

  it("returns the lifted weight for a successful single repetition", () => {
    const result = calculateEstimatedOneRepMax({
      liftedWeight: 140,
      repetitions: 1,
      unit: "kg",
    });

    expect(result.value?.estimatedOneRepMax).toBe(140);
  });

  it("warns that estimates become less certain above five repetitions", () => {
    const result = calculateEstimatedOneRepMax({
      liftedWeight: 80,
      repetitions: 8,
      unit: "kg",
    });

    expect(result.value).not.toBeNull();
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "higher_rep_uncertainty",
      severity: "warning",
      field: "repetitions",
    }));
  });

  it.each([
    [{ liftedWeight: 0, repetitions: 5, unit: "kg" as const }, "liftedWeight"],
    [{ liftedWeight: Number.NaN, repetitions: 5, unit: "kg" as const }, "liftedWeight"],
    [{ liftedWeight: 100, repetitions: 0, unit: "kg" as const }, "repetitions"],
    [{ liftedWeight: 100, repetitions: 11, unit: "kg" as const }, "repetitions"],
    [{ liftedWeight: 100, repetitions: 2.5, unit: "kg" as const }, "repetitions"],
  ])("rejects invalid input %#", (input, field) => {
    const result = calculateEstimatedOneRepMax(input);

    expect(result.value).toBeNull();
    expect(result.issues).toContainEqual(expect.objectContaining({
      severity: "error",
      field,
    }));
  });
});

describe("calculateCaffeineReferenceRange", () => {
  it("calculates the ISSN 3-6 mg/kg reference range", () => {
    const result = calculateCaffeineReferenceRange({ bodyWeight: 80, unit: "kg" });

    expect(result.value).toEqual({
      bodyWeightKg: 80,
      lowerMg: 240,
      upperMg: 480,
      lowerMgPerKg: 3,
      upperMgPerKg: 6,
    });
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "reference_not_prescription",
      severity: "warning",
    }));
  });

  it("produces the same range from an equivalent weight in pounds", () => {
    const kilograms = calculateCaffeineReferenceRange({ bodyWeight: 80, unit: "kg" });
    const pounds = calculateCaffeineReferenceRange({ bodyWeight: 176.36981, unit: "lb" });

    expect(pounds.value).toEqual(kilograms.value);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid body weight %s",
    (bodyWeight) => {
      const result = calculateCaffeineReferenceRange({ bodyWeight, unit: "kg" });

      expect(result.value).toBeNull();
      expect(result.issues).toContainEqual(expect.objectContaining({
        severity: "error",
        field: "bodyWeight",
      }));
    },
  );
});

describe("calculateSweatAndSodiumLoss", () => {
  it("calculates sweat rate and sodium loss from measured session data", () => {
    const result = calculateSweatAndSodiumLoss({
      preExerciseMassKg: 61.7,
      postExerciseMassKg: 60.3,
      fluidIntakeLiters: 0.42,
      urineLiters: 0.09,
      durationMinutes: 90,
      sweatSodiumMgPerLiter: 800,
    });

    expect(result.issues).toEqual([]);
    expect(result.value).toEqual({
      bodyMassChangePercent: 2.3,
      sweatLossLiters: 1.73,
      sweatRateLitersPerHour: 1.15,
      sodiumLossMg: 1384,
      sodiumLossMgPerHour: 923,
    });
  });

  it("does not mutate a frozen input object", () => {
    const input = Object.freeze({
      preExerciseMassKg: 80,
      postExerciseMassKg: 79.5,
      fluidIntakeLiters: 0.5,
      urineLiters: 0,
      durationMinutes: 60,
      sweatSodiumMgPerLiter: 700,
    });

    expect(() => calculateSweatAndSodiumLoss(input)).not.toThrow();
    expect(input.postExerciseMassKg).toBe(79.5);
  });

  it("rejects impossible or incomplete session data", () => {
    const result = calculateSweatAndSodiumLoss({
      preExerciseMassKg: 80,
      postExerciseMassKg: 81,
      fluidIntakeLiters: 0,
      urineLiters: 0,
      durationMinutes: 0,
      sweatSodiumMgPerLiter: -1,
    });

    expect(result.value).toBeNull();
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "durationMinutes", severity: "error" }),
      expect.objectContaining({ field: "sweatSodiumMgPerLiter", severity: "error" }),
      expect.objectContaining({ code: "non_positive_sweat_loss", severity: "error" }),
    ]));
  });
});
