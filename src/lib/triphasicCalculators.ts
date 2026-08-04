export type MassUnit = "kg" | "lb";

export type CalculatorIssue = Readonly<{
  code: string;
  field: string;
  severity: "error" | "warning";
  messageUk: string;
}>;

export type CalculatorResult<T> = Readonly<{
  value: T | null;
  issues: readonly CalculatorIssue[];
}>;

export type OneRepMaxInput = Readonly<{
  liftedWeight: number;
  repetitions: number;
  unit: MassUnit;
}>;

export type PercentageLoad = Readonly<{
  percentage: number;
  load: number;
}>;

export type OneRepMaxEstimate = Readonly<{
  estimatedOneRepMax: number;
  formula: "Brzycki";
  unit: MassUnit;
  percentageLoads: readonly PercentageLoad[];
}>;

export type CaffeineReferenceInput = Readonly<{
  bodyWeight: number;
  unit: MassUnit;
}>;

export type CaffeineReferenceRange = Readonly<{
  bodyWeightKg: number;
  lowerMg: number;
  upperMg: number;
  lowerMgPerKg: 3;
  upperMgPerKg: 6;
}>;

export type SweatAndSodiumInput = Readonly<{
  preExerciseMassKg: number;
  postExerciseMassKg: number;
  fluidIntakeLiters: number;
  urineLiters: number;
  durationMinutes: number;
  sweatSodiumMgPerLiter: number;
}>;

export type SweatAndSodiumEstimate = Readonly<{
  bodyMassChangePercent: number;
  sweatLossLiters: number;
  sweatRateLitersPerHour: number;
  sodiumLossMg: number;
  sodiumLossMgPerHour: number;
}>;

const POUNDS_PER_KILOGRAM = 2.2046226218;
const ONE_REP_MAX_PERCENTAGES = Object.freeze(
  Array.from({ length: 11 }, (_, index) => 100 - index * 5),
);

function round(value: number, decimalPlaces: number): number {
  const factor = 10 ** decimalPlaces;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function error(code: string, field: string, messageUk: string): CalculatorIssue {
  return Object.freeze({ code, field, severity: "error" as const, messageUk });
}

function warning(code: string, field: string, messageUk: string): CalculatorIssue {
  return Object.freeze({ code, field, severity: "warning" as const, messageUk });
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function isNonNegativeFinite(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

/** Converts a mass value without rounding the returned number. */
export function convertMass(value: number, from: MassUnit, to: MassUnit): number {
  if (from === to) return value;
  return from === "kg" ? value * POUNDS_PER_KILOGRAM : value / POUNDS_PER_KILOGRAM;
}

/**
 * Estimates 1RM with the Brzycki equation: load * 36 / (37 - repetitions).
 *
 * The official Triphasic 1RM calculator reproduces this equation (100 x 5
 * returns 112.5). Original formula: Brzycki (1993),
 * https://doi.org/10.1080/07303084.1993.10606684
 *
 * The function intentionally accepts only 1-10 repetitions. It estimates a
 * maximum from one near-fatigue set; it does not prescribe a load or require a
 * true maximal attempt.
 */
export function calculateEstimatedOneRepMax(
  input: OneRepMaxInput,
): CalculatorResult<OneRepMaxEstimate> {
  const issues: CalculatorIssue[] = [];

  if (!isPositiveFinite(input.liftedWeight)) {
    issues.push(error(
      "invalid_lifted_weight",
      "liftedWeight",
      "Робоча вага має бути додатним числом.",
    ));
  }

  if (!Number.isInteger(input.repetitions) || input.repetitions < 1 || input.repetitions > 10) {
    issues.push(error(
      "invalid_repetitions",
      "repetitions",
      "Вкажіть ціле число повторень від 1 до 10.",
    ));
  } else if (input.repetitions > 5) {
    issues.push(warning(
      "higher_rep_uncertainty",
      "repetitions",
      "За більшої кількості повторень похибка e1RM зазвичай зростає.",
    ));
  }

  if (issues.some((issue) => issue.severity === "error")) {
    return Object.freeze({ value: null, issues: Object.freeze(issues) });
  }

  const estimatedOneRepMax = round(
    input.liftedWeight * 36 / (37 - input.repetitions),
    1,
  );
  const percentageLoads = ONE_REP_MAX_PERCENTAGES.map((percentage) => Object.freeze({
    percentage,
    load: round(estimatedOneRepMax * percentage / 100, 1),
  }));

  return Object.freeze({
    value: Object.freeze({
      estimatedOneRepMax,
      formula: "Brzycki" as const,
      unit: input.unit,
      percentageLoads: Object.freeze(percentageLoads),
    }),
    issues: Object.freeze(issues),
  });
}

/**
 * Calculates the 3-6 mg/kg caffeine range reported in the ISSN position stand.
 * Source: Guest et al. (2021), https://doi.org/10.1186/s12970-020-00383-4
 *
 * This is an adult research reference range, not an individualized intake
 * recommendation. The caller should preserve the returned warning in the UI.
 */
export function calculateCaffeineReferenceRange(
  input: CaffeineReferenceInput,
): CalculatorResult<CaffeineReferenceRange> {
  if (!isPositiveFinite(input.bodyWeight)) {
    return Object.freeze({
      value: null,
      issues: Object.freeze([
        error("invalid_body_weight", "bodyWeight", "Маса тіла має бути додатним числом."),
      ]),
    });
  }

  const bodyWeightKg = round(convertMass(input.bodyWeight, input.unit, "kg"), 2);
  const range = Object.freeze({
    bodyWeightKg,
    lowerMg: Math.round(bodyWeightKg * 3),
    upperMg: Math.round(bodyWeightKg * 6),
    lowerMgPerKg: 3 as const,
    upperMgPerKg: 6 as const,
  });

  return Object.freeze({
    value: range,
    issues: Object.freeze([
      warning(
        "reference_not_prescription",
        "bodyWeight",
        "Це довідковий діапазон для дорослих, а не персональна рекомендація.",
      ),
    ]),
  });
}

/**
 * Estimates whole-session sweat loss and sweat rate using the NATA equation:
 * sweat loss = pre mass - post mass + fluid consumed - urine; sweat rate =
 * sweat loss / duration. Source: McDermott et al. (2017),
 * https://doi.org/10.4085/1062-6050-52.9.02
 *
 * Sodium loss is dimensional arithmetic (sweat L * measured sodium mg/L), not
 * a replacement target. Sweat sodium concentration must come from an external
 * measurement and can vary by athlete, environment, clothing, and session.
 */
export function calculateSweatAndSodiumLoss(
  input: SweatAndSodiumInput,
): CalculatorResult<SweatAndSodiumEstimate> {
  const issues: CalculatorIssue[] = [];

  if (!isPositiveFinite(input.preExerciseMassKg)) {
    issues.push(error("invalid_pre_mass", "preExerciseMassKg", "Маса до сесії має бути додатним числом."));
  }
  if (!isPositiveFinite(input.postExerciseMassKg)) {
    issues.push(error("invalid_post_mass", "postExerciseMassKg", "Маса після сесії має бути додатним числом."));
  }
  if (!isNonNegativeFinite(input.fluidIntakeLiters)) {
    issues.push(error("invalid_fluid_intake", "fluidIntakeLiters", "Об’єм випитої рідини не може бути від’ємним."));
  }
  if (!isNonNegativeFinite(input.urineLiters)) {
    issues.push(error("invalid_urine_volume", "urineLiters", "Об’єм сечі не може бути від’ємним."));
  }
  if (!isPositiveFinite(input.durationMinutes)) {
    issues.push(error("invalid_duration", "durationMinutes", "Тривалість має бути більшою за нуль."));
  }
  if (!isNonNegativeFinite(input.sweatSodiumMgPerLiter)) {
    issues.push(error(
      "invalid_sweat_sodium",
      "sweatSodiumMgPerLiter",
      "Концентрація натрію не може бути від’ємною.",
    ));
  }

  const coreInputsAreFinite = [
    input.preExerciseMassKg,
    input.postExerciseMassKg,
    input.fluidIntakeLiters,
    input.urineLiters,
  ].every(Number.isFinite);
  const rawSweatLoss = coreInputsAreFinite
    ? input.preExerciseMassKg
      - input.postExerciseMassKg
      + input.fluidIntakeLiters
      - input.urineLiters
    : Number.NaN;

  if (coreInputsAreFinite && rawSweatLoss <= 0) {
    issues.push(error(
      "non_positive_sweat_loss",
      "postExerciseMassKg",
      "За введеними даними втрата поту не є додатною. Перевірте зважування та об’єми.",
    ));
  }

  if (issues.some((issue) => issue.severity === "error")) {
    return Object.freeze({ value: null, issues: Object.freeze(issues) });
  }

  const durationHours = input.durationMinutes / 60;
  const sweatRate = rawSweatLoss / durationHours;
  const bodyMassChangePercent = (
    (input.preExerciseMassKg - input.postExerciseMassKg) / input.preExerciseMassKg
  ) * 100;

  return Object.freeze({
    value: Object.freeze({
      bodyMassChangePercent: round(bodyMassChangePercent, 1),
      sweatLossLiters: round(rawSweatLoss, 2),
      sweatRateLitersPerHour: round(sweatRate, 2),
      sodiumLossMg: Math.round(rawSweatLoss * input.sweatSodiumMgPerLiter),
      sodiumLossMgPerHour: Math.round(sweatRate * input.sweatSodiumMgPerLiter),
    }),
    issues: Object.freeze(issues),
  });
}
