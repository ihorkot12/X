import { describe, expect, it } from "vitest";

import {
  evaluateSubstitutionEligibility,
  evaluateTransferEligibility,
  getModuleScoreComponents,
  hasDuplicateStimulus,
  orchestrateMethodology,
  validateBaseProfileSelection,
  validateGoalSelection,
  type BaseMethodologyProfile,
  type MethodologyModule,
  type OrchestratorInput,
} from "./methodologyOrchestrator";

const baseProfile: BaseMethodologyProfile = {
  id: "combat-base",
  methodologyId: "coach-method-a",
};

function module(overrides: Partial<MethodologyModule> = {}): MethodologyModule {
  return {
    id: "power-module",
    kind: "module",
    approved: true,
    methodologyId: "coach-method-a",
    compatibleProfileIds: [baseProfile.id],
    primaryAdaptation: "ROTATIONAL_POWER",
    deficitId: "rotation-deficit",
    developmentMethodId: "ballistic-throws",
    stimulusId: "rotational-ballistic-throw",
    movementPattern: "rotation",
    movementVector: "transverse",
    trainingPhases: ["specific"],
    sportScopes: ["combat"],
    hardConstraints: {
      painOrInjuryCompatible: true,
      ageEligible: true,
      athleteLevelEligible: true,
      equipmentAvailable: true,
      timeAvailable: true,
      scheduleCompatible: true,
      technicalComplexityAllowed: true,
    },
    loadRecalculationSupported: true,
    penalties: {
      fatigue: false,
      interference: false,
      injury: false,
      competitionProximity: false,
    },
    ...overrides,
  };
}

function input(overrides: Partial<OrchestratorInput> = {}): OrchestratorInput {
  return {
    mode: "controlled-hybrid",
    baseProfiles: [baseProfile],
    goals: {
      primary: ["ROTATIONAL_POWER"],
      secondary: ["TRUNK_STIFFNESS"],
      maintenance: ["AEROBIC_BASE"],
    },
    modules: [module()],
    selectedModules: [],
    scoringContext: {
      sport: "combat",
      phase: "specific",
      athleteDeficitIds: ["rotation-deficit"],
      coachPreferredModuleIds: ["power-module"],
    },
    ...overrides,
  };
}

describe("goal and mesocycle contracts", () => {
  it("requires one primary goal and caps secondary and maintenance goals", () => {
    expect(validateGoalSelection({
      primary: ["POWER", "STRENGTH"],
      secondary: ["A", "B", "C"],
      maintenance: ["D", "E", "F", "G"],
    })).toEqual({
      valid: false,
      violations: [
        "exactly-one-primary-goal-required",
        "secondary-goal-limit-exceeded",
        "maintenance-goal-limit-exceeded",
      ],
    });

    expect(validateGoalSelection({
      primary: ["POWER"],
      secondary: ["A", "B"],
      maintenance: ["C", "D", "E"],
    })).toEqual({ valid: true, violations: [] });
  });

  it("requires exactly one base methodology profile per mesocycle", () => {
    expect(validateBaseProfileSelection([]).valid).toBe(false);
    expect(validateBaseProfileSelection([baseProfile]).valid).toBe(true);
    expect(validateBaseProfileSelection([baseProfile, { ...baseProfile, id: "other" }])).toEqual({
      valid: false,
      violations: ["exactly-one-base-profile-required"],
    });
  });
});

describe("module eligibility", () => {
  it("applies hard constraints before reading any scoring fields", () => {
    const blocked = module({
      id: "blocked",
      hardConstraints: {
        ...module().hardConstraints,
        equipmentAvailable: false,
      },
    });

    Object.defineProperty(blocked, "sportScopes", {
      get: () => {
        throw new Error("scoring must not run");
      },
    });

    const result = orchestrateMethodology(input({ modules: [blocked] }));

    expect(result.evaluations).toEqual([{
      moduleId: "blocked",
      eligible: false,
      rejectionReasons: ["equipment-unavailable"],
    }]);
    expect(result.trace.map((entry) => entry.stage)).toEqual([
      "validation",
      "validation",
      "hard-constraints",
    ]);
  });

  it("enforces Strict, Controlled Hybrid, and Goal-Based mode boundaries", () => {
    const borrowed = module({ id: "borrowed", methodologyId: "method-b" });
    const incompatible = module({
      id: "incompatible",
      methodologyId: "method-b",
      compatibleProfileIds: ["another-profile"],
    });

    const strict = orchestrateMethodology(input({ mode: "strict", modules: [borrowed] }));
    const hybrid = orchestrateMethodology(input({ mode: "controlled-hybrid", modules: [borrowed] }));
    const goalBased = orchestrateMethodology(input({ mode: "goal-based", modules: [incompatible] }));

    expect(strict.evaluations[0]).toMatchObject({
      eligible: false,
      rejectionReasons: ["strict-source-mismatch"],
    });
    expect(hybrid.evaluations[0]).toMatchObject({ eligible: true });
    expect(goalBased.evaluations[0]).toMatchObject({
      eligible: false,
      rejectionReasons: ["base-profile-incompatible"],
    });
  });

  it("never treats a complete borrowed program as an eligible module", () => {
    const completeProgram = module({
      id: "complete-program",
      kind: "complete-program",
      methodologyId: "method-b",
    });

    const result = orchestrateMethodology(input({ modules: [completeProgram] }));

    expect(result.evaluations[0]).toMatchObject({
      eligible: false,
      rejectionReasons: ["complete-program-not-transferable"],
    });
  });

  it("forbids a duplicate stimulus", () => {
    const selected = module({ id: "selected" });
    const duplicate = module({ id: "duplicate", methodologyId: "method-b" });

    expect(hasDuplicateStimulus(duplicate, [selected])).toBe(true);
    expect(orchestrateMethodology(input({
      modules: [duplicate],
      selectedModules: [selected],
    })).evaluations[0]).toMatchObject({
      eligible: false,
      rejectionReasons: ["duplicate-stimulus"],
    });
  });
});

describe("score components", () => {
  it("exposes the documented components without inventing weights or a total", () => {
    const score = getModuleScoreComponents(module(), input().goals, input().scoringContext);

    expect(score).toEqual({
      goalMatch: true,
      sportDemandMatch: true,
      athleteDeficitMatch: true,
      phaseMatch: true,
      scheduleMatch: true,
      equipmentMatch: true,
      coachPreference: true,
      fatiguePenalty: false,
      interferencePenalty: false,
      injuryPenalty: false,
      competitionProximityPenalty: false,
    });
    expect(score).not.toHaveProperty("total");
    expect(score).not.toHaveProperty("weights");
  });
});

describe("transfer and substitution", () => {
  it("requires a transferable module, profile/phase compatibility, load recalculation, and no conflict", () => {
    expect(evaluateTransferEligibility({
      candidate: module({ methodologyId: "method-b" }),
      baseProfile,
      phase: "specific",
      selectedModules: [],
    })).toEqual({ eligible: true, reasons: [] });

    expect(evaluateTransferEligibility({
      candidate: module({
        methodologyId: "method-b",
        trainingPhases: ["general"],
        loadRecalculationSupported: false,
      }),
      baseProfile,
      phase: "specific",
      selectedModules: [],
    })).toEqual({
      eligible: false,
      reasons: ["phase-incompatible", "load-recalculation-unavailable"],
    });
  });

  it("keeps one main development method per deficit during transfer", () => {
    const existing = module({ id: "existing", stimulusId: "existing-stimulus" });
    const candidate = module({
      id: "candidate",
      methodologyId: "method-b",
      stimulusId: "different-stimulus",
      developmentMethodId: "different-method",
    });

    expect(evaluateTransferEligibility({
      candidate,
      baseProfile,
      phase: "specific",
      selectedModules: [existing],
    })).toEqual({
      eligible: false,
      reasons: ["deficit-development-method-conflict"],
    });
  });

  it("allows substitution only for the same primary adaptation and compatible pattern/vector", () => {
    const original = module();

    expect(evaluateSubstitutionEligibility(original, module({ id: "replacement" }))).toEqual({
      eligible: true,
      reasons: [],
    });
    expect(evaluateSubstitutionEligibility(original, module({
      id: "wrong-adaptation",
      primaryAdaptation: "MAX_STRENGTH",
      movementPattern: "hinge",
      movementVector: "vertical",
    }))).toEqual({
      eligible: false,
      reasons: [
        "primary-adaptation-mismatch",
        "movement-pattern-incompatible",
        "movement-vector-incompatible",
      ],
    });
  });
});

describe("decision trace", () => {
  it("is deterministic, explanatory, and does not mutate frozen input", () => {
    const secondModule = module({ id: "second", stimulusId: "second-stimulus" });
    const frozenInput = Object.freeze({
      ...input({ modules: [module(), secondModule] }),
      modules: Object.freeze([module(), secondModule]),
    }) as OrchestratorInput;

    const first = orchestrateMethodology(frozenInput);
    const second = orchestrateMethodology(frozenInput);

    expect(first).toEqual(second);
    expect(first.valid).toBe(true);
    expect(first.eligibleModules.map((item) => item.id)).toEqual(["power-module", "second"]);
    expect(first.trace.every((entry, index) => (
      entry.sequence === index + 1 && entry.explanation.length > 0
    ))).toBe(true);
    expect(first.trace.some((entry) => entry.stage === "scoring" && entry.moduleId === "power-module")).toBe(true);
  });
});
