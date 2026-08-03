import type {
  MethodologyDecisionTraceEntry,
  MethodologyRuleReference,
  MethodologySourceReference,
  ProgramLifecycleMetadata,
  ProgramMethodologyMetadata,
  UnsupportedDecisionWarning,
} from "../types";

export const METHODOLOGY_VERSION = "black-bear-methodology-mvp@1.1.0";
export const METHODOLOGY_HASH = "sha256:01f3875ea8db27614a3e29847b8923a8961c7984d7d98f6fb66a0cadb48f15ba";
export const GENERATOR_VERSION = "black-bear-generator@1.1.0";
export const GENERATOR_HASH = "sha256:48e075553ac7830e60d7e5d8fe8d81a7ea394b05ae3ee6e719f523b3c75858ae";

type SourceId = "project-spec-ua" | "master-task-ua" | "methodology-orchestrator-ua";
type RuleId =
  | "bbp.priority.input-signals"
  | "bbp.program.day-structure"
  | "bbp.program.loading-inputs"
  | "bbp.exercise.selection"
  | "bbp.loading.conservative"
  | "bbp.safety.pain-escalation"
  | "bbp.generator.reproducibility"
  | "bbp.generator.unsupported-decision"
  | "bbp.orchestrator.single-base-profile"
  | "bbp.orchestrator.hard-constraints-first"
  | "bbp.orchestrator.goal-limits"
  | "bbp.orchestrator.substitution-equivalence"
  | "bbp.orchestrator.source-required";

type SourceDefinition = Omit<MethodologySourceReference, "anchor">;
type RuleDefinition = {
  ruleId: RuleId;
  title: string;
  sourceId: SourceId;
  anchor: string;
};

const SOURCES: Readonly<Record<SourceId, SourceDefinition>> = Object.freeze({
  "project-spec-ua": Object.freeze({
    sourceId: "project-spec-ua",
    sourceTitle: "PROJECT_SPEC_UA.md",
    sourceVersion: "local-approved-2026-08-03",
    contentHash: "sha256:59d7588017a77ff6c70bb6828e869a9d6631e37660ef0ebc8996bcbdd036594b",
  }),
  "master-task-ua": Object.freeze({
    sourceId: "master-task-ua",
    sourceTitle: "CHATGPT_DESKTOP_MULTI_AGENT_SPORTS_PLATFORM_MASTER_TASK_UA.md",
    sourceVersion: "local-approved-2026-08-03",
    contentHash: "sha256:0b6640de8d0b83bb6121534ef31136745feddb8078b1d7395667953dfc91e64b",
  }),
  "methodology-orchestrator-ua": Object.freeze({
    sourceId: "methodology-orchestrator-ua",
    sourceTitle: "Як об'єднати методики в одному порталі",
    sourceVersion: "user-approved-2026-08-03",
    contentHash: "sha256:01f3875ea8db27614a3e29847b8923a8961c7984d7d98f6fb66a0cadb48f15ba",
  }),
});

const RULES: Readonly<Record<RuleId, RuleDefinition>> = Object.freeze({
  "bbp.priority.input-signals": Object.freeze({
    ruleId: "bbp.priority.input-signals",
    title: "Priority scoring input categories",
    sourceId: "project-spec-ua",
    anchor: "Sections 10.5-10.6",
  }),
  "bbp.program.day-structure": Object.freeze({
    ruleId: "bbp.program.day-structure",
    title: "Program day structure",
    sourceId: "project-spec-ua",
    anchor: "Section 11.4",
  }),
  "bbp.program.loading-inputs": Object.freeze({
    ruleId: "bbp.program.loading-inputs",
    title: "Loading decision inputs",
    sourceId: "project-spec-ua",
    anchor: "Section 11.5",
  }),
  "bbp.exercise.selection": Object.freeze({
    ruleId: "bbp.exercise.selection",
    title: "Exercise profile, equipment, and risk selection order",
    sourceId: "project-spec-ua",
    anchor: "Section 12.2",
  }),
  "bbp.loading.conservative": Object.freeze({
    ruleId: "bbp.loading.conservative",
    title: "Conservative load handling",
    sourceId: "project-spec-ua",
    anchor: "Section 20.3",
  }),
  "bbp.safety.pain-escalation": Object.freeze({
    ruleId: "bbp.safety.pain-escalation",
    title: "Pain requires coach or medical specialist review",
    sourceId: "master-task-ua",
    anchor: "Section 18, rule 3",
  }),
  "bbp.generator.reproducibility": Object.freeze({
    ruleId: "bbp.generator.reproducibility",
    title: "Generator reproducibility",
    sourceId: "master-task-ua",
    anchor: "Section 6.5",
  }),
  "bbp.generator.unsupported-decision": Object.freeze({
    ruleId: "bbp.generator.unsupported-decision",
    title: "Unsupported decisions require coach review",
    sourceId: "master-task-ua",
    anchor: "Section 1",
  }),
  "bbp.orchestrator.single-base-profile": Object.freeze({
    ruleId: "bbp.orchestrator.single-base-profile",
    title: "One base methodology profile per mesocycle",
    sourceId: "methodology-orchestrator-ua",
    anchor: "Sections 8 and 15, rules 4 and 11",
  }),
  "bbp.orchestrator.hard-constraints-first": Object.freeze({
    ruleId: "bbp.orchestrator.hard-constraints-first",
    title: "Apply safety and schedule constraints before module scoring",
    sourceId: "methodology-orchestrator-ua",
    anchor: "Section 6",
  }),
  "bbp.orchestrator.goal-limits": Object.freeze({
    ruleId: "bbp.orchestrator.goal-limits",
    title: "Limit primary, secondary, and maintenance goals",
    sourceId: "methodology-orchestrator-ua",
    anchor: "Sections 10 and 15, rule 13",
  }),
  "bbp.orchestrator.substitution-equivalence": Object.freeze({
    ruleId: "bbp.orchestrator.substitution-equivalence",
    title: "Substitutions preserve the primary adaptation",
    sourceId: "methodology-orchestrator-ua",
    anchor: "Sections 4-5 and 15, rules 7-9",
  }),
  "bbp.orchestrator.source-required": Object.freeze({
    ruleId: "bbp.orchestrator.source-required",
    title: "Methodology decisions require approved provenance",
    sourceId: "methodology-orchestrator-ua",
    anchor: "Sections 14-15, rules 14-15",
  }),
});

export const APPROVED_METHODOLOGY_SOURCES = Object.freeze(
  Object.values(SOURCES).map((source) => Object.freeze({ ...source })),
);

export const APPROVED_METHODOLOGY_RULES = Object.freeze(
  Object.values(RULES).map((rule) => Object.freeze({ ...rule })),
);

export function getRuleReference(ruleId: RuleId): MethodologyRuleReference {
  const rule = RULES[ruleId];
  const source = SOURCES[rule.sourceId];
  return {
    ruleId: rule.ruleId,
    title: rule.title,
    status: "approved",
    source: {
      ...source,
      anchor: rule.anchor,
    },
  };
}

export function getRuleEvidence(ruleIds: RuleId[]) {
  const ruleReferences = ruleIds.map(getRuleReference);
  return {
    ruleReferences,
    sourceReferences: ruleReferences.map((rule) => ({ ...rule.source })),
  };
}

function trace(
  id: string,
  stage: MethodologyDecisionTraceEntry["stage"],
  decision: string,
  outcome: string,
  ruleIds: RuleId[],
  supportStatus: MethodologyDecisionTraceEntry["supportStatus"] = "approved",
): MethodologyDecisionTraceEntry {
  const evidence = getRuleEvidence(ruleIds);
  return {
    id,
    stage,
    decision,
    outcome,
    supportStatus,
    ...evidence,
  };
}

function warning(
  code: string,
  decision: string,
  messageEn: string,
  affectedPaths: string[],
  ruleIds: RuleId[],
  supportStatus: UnsupportedDecisionWarning["supportStatus"] = "unsupported",
): UnsupportedDecisionWarning {
  return {
    code,
    decision,
    messageUa: "Недостатньо методичних даних для автоматичного призначення. Потрібне рішення тренера.",
    messageEn,
    supportStatus,
    requiresCoachDecision: true,
    affectedPaths: [...affectedPaths],
    sourceReferences: getRuleEvidence(ruleIds).sourceReferences,
  };
}

export function createProgramMethodologyMetadata({
  hasPainFlags,
  includesTaper,
}: {
  hasPainFlags: boolean;
  includesTaper: boolean;
}): ProgramMethodologyMetadata {
  const decisionTrace = [
    trace(
      "trace.orchestrator-constraints",
      "input",
      "Apply safety, schedule, equipment, age, and level constraints before ranking modules.",
      "Only candidates that survive hard constraints may enter deterministic selection.",
      ["bbp.orchestrator.hard-constraints-first"],
    ),
    trace(
      "trace.orchestrator-profile",
      "structure",
      "Keep one base methodology profile for the mesocycle.",
      "Additional methodologies may contribute compatible modules, not complete competing plans.",
      ["bbp.orchestrator.single-base-profile"],
    ),
    trace(
      "trace.program-structure",
      "structure",
      "Build each day from the approved block categories.",
      "Warm-up, power/speed, strength, accessory, conditioning, and mobility/prehab blocks were created.",
      ["bbp.program.day-structure"],
    ),
    trace(
      "trace.loading-inputs",
      "loading",
      "Use readiness, combat load, checkpoint, and final-week signals.",
      "The existing deterministic loading branch was selected from the supplied inputs.",
      ["bbp.program.loading-inputs", "bbp.loading.conservative"],
    ),
    trace(
      "trace.exercise-selection",
      "exercise-selection",
      "Select exercises by profile, equipment availability, and pain flags.",
      "Exercise candidates were evaluated in stable declared order.",
      ["bbp.exercise.selection"],
    ),
    trace(
      "trace.numeric-prescription",
      "loading",
      "Assign exact sets, repetitions, intensity, tempo, and thresholds.",
      "Legacy MVP values were preserved for backward compatibility and flagged for coach review.",
      ["bbp.generator.unsupported-decision"],
      "unsupported",
    ),
    trace(
      "trace.reproducibility",
      "output",
      "Attach stable methodology and generator fingerprints.",
      "The result contains deterministic version, hash, trace, and warning metadata.",
      ["bbp.generator.reproducibility"],
    ),
    trace(
      "trace.orchestrator-provenance",
      "output",
      "Require an approved source or an explicit coach-decision warning for each methodology decision.",
      "The output exposes source references and unsupported-decision warnings.",
      ["bbp.orchestrator.source-required", "bbp.generator.unsupported-decision"],
    ),
  ];

  const warnings = [
    warning(
      "unsupported.numeric-prescription",
      "Exact numeric loading and assessment thresholds",
      "The approved local specifications do not cite the exact numeric loading or assessment thresholds retained by this MVP. Coach review is required.",
      ["weeks.*.days.*.*.sets", "weeks.*.days.*.*.reps", "weeks.*.days.*.*.intensity", "weeks.*.days.*.*.tempo"],
      ["bbp.generator.unsupported-decision"],
    ),
    ...(includesTaper
      ? [warning(
          "unsupported.taper-prescription",
          "Final-week taper prescription",
          "The approved local specifications name taper as a phase but do not approve an exact taper prescription. Coach review is required.",
          ["weeks[last]"],
          ["bbp.generator.unsupported-decision"],
        )]
      : []),
    ...(hasPainFlags
      ? [warning(
          "safety.pain-requires-review",
          "Exercise selection when pain is reported",
          "Pain was reported. The system does not diagnose or prescribe treatment; a coach or qualified medical specialist must review the program.",
          ["athleteProfile.painAreas", "weeks.*.days.*"],
          ["bbp.safety.pain-escalation"],
          "approved",
        )]
      : []),
  ];

  return {
    methodologyVersion: METHODOLOGY_VERSION,
    methodologyHash: METHODOLOGY_HASH,
    generatorVersion: GENERATOR_VERSION,
    generatorHash: GENERATOR_HASH,
    matchedRuleIds: [...new Set(decisionTrace.flatMap((entry) => entry.ruleReferences.map((rule) => rule.ruleId)))],
    decisionTrace,
    warnings,
  };
}

export function createGeneratedLifecycle(): ProgramLifecycleMetadata {
  return {
    status: "generated",
    revision: 1,
    generatorMode: "deterministic",
  };
}
