import { describe, expect, test } from "vitest";

import type {
  Assessment,
  AthleteProfile,
  CombatLoad,
  CombatProfile,
  ProgramSettings,
} from "../types";
import { prescribeExercise } from "./exerciseLibrary";
import {
  GENERATOR_HASH,
  GENERATOR_VERSION,
  METHODOLOGY_HASH,
  METHODOLOGY_VERSION,
} from "./methodology";
import { scorePriorities } from "./priorityScoring";
import { generateProgram } from "./programEngine";

type GeneratorInput = {
  combatProfile: CombatProfile;
  combatLoad: CombatLoad;
  athleteProfile: AthleteProfile;
  programSettings: ProgramSettings;
  assessment: Assessment;
};

const input: GeneratorInput = {
  combatProfile: "striker",
  combatLoad: {
    strikingSessions: 2,
    grapplingSessions: 2,
    hardSparringDays: 1,
    hardGrapplingDays: 1,
    technicalSessions: 2,
  },
  athleteProfile: {
    name: "Engine Test",
    age: 22,
    sex: "Male",
    heightCm: 178,
    weightKg: 74,
    sport: "MMA",
    level: "Amateur",
    strengthTrainingAge: "1-3 years",
    equipment: ["Barbell", "Dumbbells", "Bike", "Med Balls", "Bands"],
    painAreas: [],
  },
  programSettings: {
    lengthWeeks: 12,
    scDaysPerWeek: 3,
    sessionDuration: "60 min",
    phase: "Fight camp",
    mainGoal: "Power and conditioning",
  },
  assessment: {
    squatOrTrapBar: 150,
    benchOrPushups: 95,
    pullups: 12,
    verticalJump: 54,
    broadJump: 245,
    medBallThrow: 8,
    sleep: 4,
    stress: 3,
    soreness: 2,
    motivation: 5,
  },
};

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

describe("methodology contracts", () => {
test("generation is deterministic, pure, and keeps the existing plan", () => {
  const frozenInput = deepFreeze(structuredClone(input));
  const before = structuredClone(frozenInput);

  const first = generateProgram(frozenInput);
  const second = generateProgram(frozenInput);

  expect(first).toEqual(second);
  expect(frozenInput).toEqual(before);
  expect(first.weeks).toHaveLength(12);
  expect(first.weeks[0].days[0].strength[0].name).toBe("Front Squat");
  expect(first.weeks[0].days[0].strength[0].sets).toBe("3");
  expect(first.weeks[3].days[0].strength[0].intensity).toBe("RPE 6");
  expect(first.weeks[11].blockName).toBe("Realization / Taper");
});

test("generated programs expose reproducibility and lifecycle contracts", () => {
  const program = generateProgram(input);

  expect(program.methodology?.methodologyVersion).toBe(METHODOLOGY_VERSION);
  expect(program.methodology?.methodologyHash).toBe(METHODOLOGY_HASH);
  expect(program.methodology?.generatorVersion).toBe(GENERATOR_VERSION);
  expect(program.methodology?.generatorHash).toBe(GENERATOR_HASH);
  expect(METHODOLOGY_HASH).toMatch(/^sha256:[a-f0-9]{64}$/);
  expect(GENERATOR_HASH).toMatch(/^sha256:[a-f0-9]{64}$/);
  expect(program.lifecycle).toEqual({
    status: "generated",
    revision: 1,
    generatorMode: "deterministic",
  });
  expect(program.methodology?.decisionTrace.some((entry) => entry.ruleReferences.length > 0)).toBe(true);
  expect(program.methodology?.decisionTrace.every((entry) =>
    entry.supportStatus === "unsupported" || entry.sourceReferences.length > 0,
  )).toBe(true);
  expect(program.methodology?.warnings.some((warning) => warning.code === "unsupported.numeric-prescription")).toBe(true);
  expect(program.methodology?.warnings.some((warning) => warning.code === "unsupported.taper-prescription")).toBe(true);
});

test("pain flags create an escalation warning without inventing a medical decision", () => {
  const program = generateProgram({
    ...input,
    athleteProfile: {
      ...input.athleteProfile,
      painAreas: ["Shoulder"],
    },
  });

  const warning = program.methodology?.warnings.find((item) => item.code === "safety.pain-requires-review");
  expect(warning?.requiresCoachDecision).toBe(true);
  expect(warning?.supportStatus).toBe("approved");
  expect(warning?.sourceReferences.length).toBeTruthy();
  expect(warning?.messageEn ?? "").toMatch(/coach or qualified medical specialist must review/i);
  expect(warning?.messageEn ?? "").not.toMatch(/medication|dosage|PED|weight[- ]cut/i);
});

test("exercise and priority decisions carry rule and source references", () => {
  const exercise = prescribeExercise("goblet-squat");
  const priorities = scorePriorities(input);

  expect(exercise.legacySourceReference).toBe("Black Bear");
  expect(exercise.ruleReferences?.length).toBeTruthy();
  expect(exercise.sourceReferences?.length).toBeTruthy();
  expect(priorities.every((priority) => priority.ruleReferences.length > 0)).toBe(true);
  expect(priorities.every((priority) => priority.sourceReferences.length > 0)).toBe(true);
  expect(priorities.every((priority) => priority.supportStatus === "unsupported")).toBe(true);
});
});
