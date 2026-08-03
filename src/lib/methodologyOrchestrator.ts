export type MethodologyMode = "strict" | "controlled-hybrid" | "goal-based";

export type GoalSelection = Readonly<{
  primary: readonly string[];
  secondary: readonly string[];
  maintenance: readonly string[];
}>;

export type BaseMethodologyProfile = Readonly<{
  id: string;
  methodologyId: string;
}>;

export type ModuleHardConstraints = Readonly<{
  painOrInjuryCompatible: boolean;
  ageEligible: boolean;
  athleteLevelEligible: boolean;
  equipmentAvailable: boolean;
  timeAvailable: boolean;
  scheduleCompatible: boolean;
  technicalComplexityAllowed: boolean;
}>;

export type MethodologyModule = Readonly<{
  id: string;
  kind: "module" | "complete-program";
  approved: boolean;
  methodologyId: string;
  compatibleProfileIds: readonly string[];
  primaryAdaptation: string;
  deficitId: string;
  developmentMethodId: string;
  stimulusId: string;
  movementPattern: string;
  movementVector: string;
  trainingPhases: readonly string[];
  sportScopes: readonly string[];
  hardConstraints: ModuleHardConstraints;
  loadRecalculationSupported: boolean;
  penalties: Readonly<{
    fatigue: boolean;
    interference: boolean;
    injury: boolean;
    competitionProximity: boolean;
  }>;
}>;

export type ScoringContext = Readonly<{
  sport: string;
  phase: string;
  athleteDeficitIds: readonly string[];
  coachPreferredModuleIds: readonly string[];
}>;

export type ModuleScoreComponents = Readonly<{
  goalMatch: boolean;
  sportDemandMatch: boolean;
  athleteDeficitMatch: boolean;
  phaseMatch: boolean;
  scheduleMatch: boolean;
  equipmentMatch: boolean;
  coachPreference: boolean;
  fatiguePenalty: boolean;
  interferencePenalty: boolean;
  injuryPenalty: boolean;
  competitionProximityPenalty: boolean;
}>;

export type ValidationViolation =
  | "exactly-one-primary-goal-required"
  | "secondary-goal-limit-exceeded"
  | "maintenance-goal-limit-exceeded"
  | "exactly-one-base-profile-required";

export type EligibilityReason =
  | "pain-or-injury-incompatible"
  | "age-ineligible"
  | "athlete-level-ineligible"
  | "equipment-unavailable"
  | "insufficient-time"
  | "schedule-conflict"
  | "technical-complexity-not-allowed"
  | "module-not-approved"
  | "complete-program-not-transferable"
  | "strict-source-mismatch"
  | "base-profile-incompatible"
  | "goal-incompatible"
  | "phase-incompatible"
  | "load-recalculation-unavailable"
  | "duplicate-stimulus"
  | "deficit-development-method-conflict"
  | "primary-adaptation-mismatch"
  | "movement-pattern-incompatible"
  | "movement-vector-incompatible";

export type DecisionTraceEntry = Readonly<{
  sequence: number;
  stage: "validation" | "hard-constraints" | "mode" | "stimulus" | "transfer" | "scoring";
  outcome: "accepted" | "rejected";
  code: string;
  explanation: string;
  moduleId?: string;
}>;

export type ModuleEvaluation = Readonly<{
  moduleId: string;
  eligible: boolean;
  rejectionReasons: readonly EligibilityReason[];
  score?: ModuleScoreComponents;
}>;

export type OrchestratorInput = Readonly<{
  mode: MethodologyMode;
  baseProfiles: readonly BaseMethodologyProfile[];
  goals: GoalSelection;
  modules: readonly MethodologyModule[];
  selectedModules: readonly MethodologyModule[];
  scoringContext: ScoringContext;
}>;

export type OrchestratorResult = Readonly<{
  valid: boolean;
  violations: readonly ValidationViolation[];
  eligibleModules: readonly MethodologyModule[];
  evaluations: readonly ModuleEvaluation[];
  trace: readonly DecisionTraceEntry[];
}>;

type EligibilityResult = Readonly<{
  eligible: boolean;
  reasons: readonly EligibilityReason[];
}>;

export function validateGoalSelection(goals: GoalSelection): Readonly<{
  valid: boolean;
  violations: readonly ValidationViolation[];
}> {
  const violations: ValidationViolation[] = [
    ...(goals.primary.length === 1 ? [] : ["exactly-one-primary-goal-required" as const]),
    ...(goals.secondary.length <= 2 ? [] : ["secondary-goal-limit-exceeded" as const]),
    ...(goals.maintenance.length <= 3 ? [] : ["maintenance-goal-limit-exceeded" as const]),
  ];

  return { valid: violations.length === 0, violations };
}

export function validateBaseProfileSelection(
  profiles: readonly BaseMethodologyProfile[],
): Readonly<{ valid: boolean; violations: readonly ValidationViolation[] }> {
  const violations: ValidationViolation[] = profiles.length === 1
    ? []
    : ["exactly-one-base-profile-required"];

  return { valid: violations.length === 0, violations };
}

export function evaluateHardConstraints(candidate: MethodologyModule): EligibilityResult {
  const constraints = candidate.hardConstraints;
  const reasons: EligibilityReason[] = [
    ...(constraints.painOrInjuryCompatible ? [] : ["pain-or-injury-incompatible" as const]),
    ...(constraints.ageEligible ? [] : ["age-ineligible" as const]),
    ...(constraints.athleteLevelEligible ? [] : ["athlete-level-ineligible" as const]),
    ...(constraints.equipmentAvailable ? [] : ["equipment-unavailable" as const]),
    ...(constraints.timeAvailable ? [] : ["insufficient-time" as const]),
    ...(constraints.scheduleCompatible ? [] : ["schedule-conflict" as const]),
    ...(constraints.technicalComplexityAllowed ? [] : ["technical-complexity-not-allowed" as const]),
  ];

  return { eligible: reasons.length === 0, reasons };
}

export function getModuleScoreComponents(
  candidate: MethodologyModule,
  goals: GoalSelection,
  context: ScoringContext,
): ModuleScoreComponents {
  const goalIds = [...goals.primary, ...goals.secondary, ...goals.maintenance];

  return {
    goalMatch: goalIds.includes(candidate.primaryAdaptation),
    sportDemandMatch: candidate.sportScopes.includes(context.sport),
    athleteDeficitMatch: context.athleteDeficitIds.includes(candidate.deficitId),
    phaseMatch: candidate.trainingPhases.includes(context.phase),
    scheduleMatch: candidate.hardConstraints.scheduleCompatible,
    equipmentMatch: candidate.hardConstraints.equipmentAvailable,
    coachPreference: context.coachPreferredModuleIds.includes(candidate.id),
    fatiguePenalty: candidate.penalties.fatigue,
    interferencePenalty: candidate.penalties.interference,
    injuryPenalty: candidate.penalties.injury,
    competitionProximityPenalty: candidate.penalties.competitionProximity,
  };
}

export function hasDuplicateStimulus(
  candidate: MethodologyModule,
  selectedModules: readonly MethodologyModule[],
): boolean {
  return selectedModules.some((selected) => selected.stimulusId === candidate.stimulusId);
}

function hasDevelopmentMethodConflict(
  candidate: MethodologyModule,
  selectedModules: readonly MethodologyModule[],
): boolean {
  return selectedModules.some((selected) => (
    selected.deficitId === candidate.deficitId
    && selected.developmentMethodId !== candidate.developmentMethodId
  ));
}

export function evaluateTransferEligibility({
  candidate,
  baseProfile,
  phase,
  selectedModules,
}: Readonly<{
  candidate: MethodologyModule;
  baseProfile: BaseMethodologyProfile;
  phase: string;
  selectedModules: readonly MethodologyModule[];
}>): EligibilityResult {
  const reasons: EligibilityReason[] = [
    ...(candidate.kind === "module" ? [] : ["complete-program-not-transferable" as const]),
    ...(candidate.compatibleProfileIds.includes(baseProfile.id) ? [] : ["base-profile-incompatible" as const]),
    ...(candidate.trainingPhases.includes(phase) ? [] : ["phase-incompatible" as const]),
    ...(candidate.hardConstraints.scheduleCompatible ? [] : ["schedule-conflict" as const]),
    ...(candidate.loadRecalculationSupported ? [] : ["load-recalculation-unavailable" as const]),
    ...(hasDuplicateStimulus(candidate, selectedModules) ? ["duplicate-stimulus" as const] : []),
    ...(hasDevelopmentMethodConflict(candidate, selectedModules)
      ? ["deficit-development-method-conflict" as const]
      : []),
  ];

  return { eligible: reasons.length === 0, reasons };
}

export function evaluateSubstitutionEligibility(
  original: MethodologyModule,
  replacement: MethodologyModule,
): EligibilityResult {
  const reasons: EligibilityReason[] = [
    ...(replacement.primaryAdaptation === original.primaryAdaptation
      ? []
      : ["primary-adaptation-mismatch" as const]),
    ...(replacement.movementPattern === original.movementPattern
      ? []
      : ["movement-pattern-incompatible" as const]),
    ...(replacement.movementVector === original.movementVector
      ? []
      : ["movement-vector-incompatible" as const]),
  ];

  return { eligible: reasons.length === 0, reasons };
}

function modeEligibility(
  mode: MethodologyMode,
  candidate: MethodologyModule,
  baseProfile: BaseMethodologyProfile,
  goals: GoalSelection,
): EligibilityResult {
  const commonReasons: EligibilityReason[] = [
    ...(candidate.approved ? [] : ["module-not-approved" as const]),
    ...(candidate.kind === "module" ? [] : ["complete-program-not-transferable" as const]),
  ];

  if (commonReasons.length > 0) {
    return { eligible: false, reasons: commonReasons };
  }

  if (mode === "strict") {
    const reasons: EligibilityReason[] = candidate.methodologyId === baseProfile.methodologyId
      ? []
      : ["strict-source-mismatch"];
    return { eligible: reasons.length === 0, reasons };
  }

  if (mode === "goal-based") {
    const allGoals = [...goals.primary, ...goals.secondary, ...goals.maintenance];
    const reasons: EligibilityReason[] = [
      ...(candidate.compatibleProfileIds.includes(baseProfile.id) ? [] : ["base-profile-incompatible" as const]),
      ...(allGoals.includes(candidate.primaryAdaptation) ? [] : ["goal-incompatible" as const]),
    ];
    return { eligible: reasons.length === 0, reasons };
  }

  return { eligible: true, reasons: [] };
}

function traceEntry(
  sequence: number,
  stage: DecisionTraceEntry["stage"],
  outcome: DecisionTraceEntry["outcome"],
  code: string,
  explanation: string,
  moduleId?: string,
): DecisionTraceEntry {
  return {
    sequence,
    stage,
    outcome,
    code,
    explanation,
    ...(moduleId === undefined ? {} : { moduleId }),
  };
}

function rejectionEvaluation(
  candidate: MethodologyModule,
  reasons: readonly EligibilityReason[],
): ModuleEvaluation {
  return { moduleId: candidate.id, eligible: false, rejectionReasons: [...reasons] };
}

export function orchestrateMethodology(input: OrchestratorInput): OrchestratorResult {
  const profileValidation = validateBaseProfileSelection(input.baseProfiles);
  const goalValidation = validateGoalSelection(input.goals);
  const violations = [...profileValidation.violations, ...goalValidation.violations];
  let trace: DecisionTraceEntry[] = [
    traceEntry(
      1,
      "validation",
      profileValidation.valid ? "accepted" : "rejected",
      profileValidation.valid ? "single-base-profile" : "invalid-base-profile-count",
      profileValidation.valid
        ? "Exactly one base methodology profile is assigned to the mesocycle."
        : "A mesocycle must have exactly one base methodology profile.",
    ),
    traceEntry(
      2,
      "validation",
      goalValidation.valid ? "accepted" : "rejected",
      goalValidation.valid ? "goal-limits-satisfied" : "invalid-goal-selection",
      goalValidation.valid
        ? "The goal selection contains one primary, at most two secondary, and at most three maintenance goals."
        : `Goal selection violates: ${goalValidation.violations.join(", ")}.`,
    ),
  ];

  if (violations.length > 0) {
    return { valid: false, violations, eligibleModules: [], evaluations: [], trace };
  }

  const baseProfile = input.baseProfiles[0];
  let eligibleModules: MethodologyModule[] = [];
  let evaluations: ModuleEvaluation[] = [];
  let comparisonModules: readonly MethodologyModule[] = [...input.selectedModules];

  for (const candidate of input.modules) {
    const hardConstraints = evaluateHardConstraints(candidate);
    trace = [...trace, traceEntry(
      trace.length + 1,
      "hard-constraints",
      hardConstraints.eligible ? "accepted" : "rejected",
      hardConstraints.eligible ? "hard-constraints-satisfied" : "hard-constraint-rejection",
      hardConstraints.eligible
        ? "The module passed every hard safety, access, time, schedule, and complexity constraint."
        : `The module was rejected before scoring: ${hardConstraints.reasons.join(", ")}.`,
      candidate.id,
    )];

    if (!hardConstraints.eligible) {
      evaluations = [...evaluations, rejectionEvaluation(candidate, hardConstraints.reasons)];
      continue;
    }

    const modeResult = modeEligibility(input.mode, candidate, baseProfile, input.goals);
    trace = [...trace, traceEntry(
      trace.length + 1,
      "mode",
      modeResult.eligible ? "accepted" : "rejected",
      modeResult.eligible ? `${input.mode}-eligible` : `${input.mode}-rejection`,
      modeResult.eligible
        ? `The module satisfies the ${input.mode} mode boundary.`
        : `The module violates the ${input.mode} mode boundary: ${modeResult.reasons.join(", ")}.`,
      candidate.id,
    )];

    if (!modeResult.eligible) {
      evaluations = [...evaluations, rejectionEvaluation(candidate, modeResult.reasons)];
      continue;
    }

    const duplicateStimulus = hasDuplicateStimulus(candidate, comparisonModules);
    trace = [...trace, traceEntry(
      trace.length + 1,
      "stimulus",
      duplicateStimulus ? "rejected" : "accepted",
      duplicateStimulus ? "duplicate-stimulus" : "unique-stimulus",
      duplicateStimulus
        ? "The module duplicates a stimulus already assigned to the mesocycle."
        : "The module does not duplicate an already assigned stimulus.",
      candidate.id,
    )];

    if (duplicateStimulus) {
      evaluations = [...evaluations, rejectionEvaluation(candidate, ["duplicate-stimulus"])];
      continue;
    }

    const isBorrowedHybridModule = input.mode === "controlled-hybrid"
      && candidate.methodologyId !== baseProfile.methodologyId;
    if (isBorrowedHybridModule) {
      const transfer = evaluateTransferEligibility({
        candidate,
        baseProfile,
        phase: input.scoringContext.phase,
        selectedModules: comparisonModules,
      });
      trace = [...trace, traceEntry(
        trace.length + 1,
        "transfer",
        transfer.eligible ? "accepted" : "rejected",
        transfer.eligible ? "transfer-eligible" : "transfer-rejection",
        transfer.eligible
          ? "The borrowed module is compatible with the base profile, phase, schedule, and load recalculation contract."
          : `The borrowed module cannot transfer: ${transfer.reasons.join(", ")}.`,
        candidate.id,
      )];

      if (!transfer.eligible) {
        evaluations = [...evaluations, rejectionEvaluation(candidate, transfer.reasons)];
        continue;
      }
    }

    const score = getModuleScoreComponents(candidate, input.goals, input.scoringContext);
    trace = [...trace, traceEntry(
      trace.length + 1,
      "scoring",
      "accepted",
      "score-components-recorded",
      "Documented match and penalty components were recorded without unapproved weights or an aggregate score.",
      candidate.id,
    )];
    evaluations = [...evaluations, {
      moduleId: candidate.id,
      eligible: true,
      rejectionReasons: [],
      score,
    }];
    eligibleModules = [...eligibleModules, candidate];
    comparisonModules = [...comparisonModules, candidate];
  }

  return { valid: true, violations: [], eligibleModules, evaluations, trace };
}
