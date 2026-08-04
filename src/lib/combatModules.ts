import type {
  Assessment,
  AthleteProfile,
  CombatDiscipline,
  CombatProfile,
} from "../types";

export type CombatModuleId = "kyokushin-karate" | "mma";
export type TestDimensionId =
  | "lower-body-strength"
  | "upper-body-capacity"
  | "lower-body-power"
  | "rotational-power"
  | "speed"
  | "aerobic-capacity";

export type CombatModuleDefinition = {
  id: CombatModuleId;
  discipline: CombatDiscipline;
  labelUa: string;
  descriptionUa: string;
  allowedProfiles: readonly CombatProfile[];
  demandTags: readonly string[];
  mobilityRegions: readonly string[];
  requiredTestDimensions: readonly TestDimensionId[];
};

export type TestReadiness = {
  completionPercent: number;
  missingRequired: TestDimensionId[];
  safetyFlags: Array<"pain-reported" | "concussion-history" | "under-minimum-age">;
  blockedTestCategories: Array<"max-strength" | "high-impact-power" | "max-conditioning">;
  canGenerateConservativeProgram: boolean;
  requiresCoachReview: boolean;
  performanceClassification: "pending-normative-data";
};

export const ACTIVE_COMBAT_MODULES = [
  {
    id: "kyokushin-karate",
    discipline: "Kyokushin Karate",
    labelUa: "Кіокушинкай карате",
    descriptionUa: "Ударна підготовка для раундів, вибухових серій, стійки та повторних зусиль.",
    allowedProfiles: ["striker"],
    demandTags: [
      "rotational-power",
      "elastic-lower-body",
      "repeat-effort",
      "aerobic-recovery",
      "lower-leg-durability",
    ],
    mobilityRegions: ["ankle", "hip", "adductor", "t-spine", "shoulder"],
    requiredTestDimensions: [
      "lower-body-strength",
      "upper-body-capacity",
      "lower-body-power",
      "rotational-power",
      "speed",
      "aerobic-capacity",
    ],
  },
  {
    id: "mma",
    discipline: "MMA",
    labelUa: "MMA",
    descriptionUa: "Підготовка ударника, борця або змішаного профілю з контролем сумарного бойового навантаження.",
    allowedProfiles: ["striker", "grappler", "hybrid"],
    demandTags: [
      "total-body-strength",
      "rotational-power",
      "isometric-strength",
      "repeat-effort",
      "aerobic-recovery",
      "grip-neck-trunk",
    ],
    mobilityRegions: ["ankle", "hip", "adductor", "t-spine", "shoulder", "wrist", "neck"],
    requiredTestDimensions: [
      "lower-body-strength",
      "upper-body-capacity",
      "lower-body-power",
      "rotational-power",
      "speed",
      "aerobic-capacity",
    ],
  },
] as const satisfies readonly CombatModuleDefinition[];

const MODULE_BY_DISCIPLINE = new Map(
  ACTIVE_COMBAT_MODULES.map((module) => [module.discipline, module]),
);

export function getCombatModule(discipline: CombatDiscipline): CombatModuleDefinition {
  const module = MODULE_BY_DISCIPLINE.get(discipline);
  if (!module) throw new Error(`Unsupported combat discipline: ${discipline}`);
  return module;
}

export function normalizeCombatProfile(
  discipline: CombatDiscipline,
  requestedProfile: CombatProfile,
): CombatProfile {
  const module = getCombatModule(discipline);
  return module.allowedProfiles.includes(requestedProfile)
    ? requestedProfile
    : module.allowedProfiles[0];
}

function hasMeasurement(value: number | string | undefined): boolean {
  if (typeof value === "number") return Number.isFinite(value) && value > 0;
  return typeof value === "string" && value.trim().length > 0;
}

function hasDimension(assessment: Assessment, dimension: TestDimensionId): boolean {
  const checks: Record<TestDimensionId, boolean> = {
    "lower-body-strength": hasMeasurement(assessment.squatOrTrapBar),
    "upper-body-capacity": hasMeasurement(assessment.benchOrPushups) || hasMeasurement(assessment.pullups),
    "lower-body-power": hasMeasurement(assessment.verticalJump) || hasMeasurement(assessment.broadJump),
    "rotational-power": hasMeasurement(assessment.medBallThrow),
    speed: hasMeasurement(assessment.sprint10m),
    "aerobic-capacity": hasMeasurement(assessment.mas)
      || hasMeasurement(assessment.beepTest)
      || hasMeasurement(assessment.run5k)
      || hasMeasurement(assessment.row1500m),
  };
  return checks[dimension];
}

export function assessTestReadiness({
  athlete,
  assessment,
}: {
  athlete: AthleteProfile;
  assessment: Assessment;
}): TestReadiness {
  const module = getCombatModule(athlete.sport);
  const missingRequired = module.requiredTestDimensions.filter(
    (dimension) => !hasDimension(assessment, dimension),
  );
  const completed = module.requiredTestDimensions.length - missingRequired.length;
  const completionPercent = Math.round(
    (completed / module.requiredTestDimensions.length) * 100,
  );

  const hasPain = athlete.painAreas.length > 0;
  const hasConcussionHistory = athlete.painAreas.includes("Concussion History");
  const isUnderMinimumAge = athlete.age !== "" && Number(athlete.age) < 16;
  const safetyFlags: TestReadiness["safetyFlags"] = [
    ...(hasPain ? ["pain-reported" as const] : []),
    ...(hasConcussionHistory ? ["concussion-history" as const] : []),
    ...(isUnderMinimumAge ? ["under-minimum-age" as const] : []),
  ];
  const blockedTestCategories: TestReadiness["blockedTestCategories"] = [
    ...(hasPain ? ["max-strength" as const, "high-impact-power" as const] : []),
    ...(hasConcussionHistory ? ["max-conditioning" as const] : []),
  ];

  return {
    completionPercent,
    missingRequired,
    safetyFlags,
    blockedTestCategories: [...new Set(blockedTestCategories)],
    canGenerateConservativeProgram: !isUnderMinimumAge,
    requiresCoachReview: missingRequired.length > 0 || safetyFlags.length > 0,
    performanceClassification: "pending-normative-data",
  };
}
