import {
  Assessment,
  AthleteProfile,
  CombatLoad,
  CombatProfile,
  ExercisePrescription,
  GeneratedProgram,
  ProgramDay,
  ProgramSettings,
  ProgramWeek,
} from "../types";
import { prescribeBestExercise, prescribeExercise } from "./exerciseLibrary";
import { createGeneratedLifecycle, createProgramMethodologyMetadata } from "./methodology";

type GenerateProgramParams = {
  combatProfile: CombatProfile;
  combatLoad: CombatLoad;
  athleteProfile: AthleteProfile;
  programSettings: ProgramSettings;
  assessment: Assessment;
};

type SessionTemplate = "strength" | "upper_trunk" | "power_conditioning" | "conditioning_prehab";

type LoadingPlan = {
  volume: "normal" | "reduced";
  blockLabel: string;
  powerSets: string;
  heavySets: string;
  secondarySets: string;
  accessorySets: string;
  conditioningSets: string;
  zone2Duration: string;
  strengthIntensity: string;
  secondaryIntensity: string;
  conditioningIntensity: string;
  strengthTempo: string;
  noteUa: string;
  noteEn: string;
};

const PROFILE_LABELS: Record<CombatProfile, string> = {
  grappler: "Grappler",
  striker: "Striker",
  hybrid: "Striker + Grappler",
};

export function generateProgram(params: GenerateProgramParams): GeneratedProgram {
  const { combatProfile, combatLoad, athleteProfile, programSettings, assessment } = params;
  const weeks: ProgramWeek[] = [];

  for (let week = 1; week <= programSettings.lengthWeeks; week += 1) {
    const isCheckpoint = week % 4 === 0;
    const blockName = getBlockName(week, programSettings.lengthWeeks, isCheckpoint);
    const focus = getWeekFocus(week, programSettings.lengthWeeks, programSettings.phase, programSettings.mainGoal, isCheckpoint);
    const templates = getSessionTemplates(programSettings.scDaysPerWeek);
    const days = templates.map((template, index) =>
      generateDay({
        dayIndex: index + 1,
        template,
        combatProfile,
        combatLoad,
        athleteProfile,
        week,
        lengthWeeks: programSettings.lengthWeeks,
        isCheckpoint,
        programSettings,
        assessment,
      }),
    );

    weeks.push({
      week,
      blockName,
      focus,
      isCheckpoint,
      days,
    });
  }

  const summary = `${PROFILE_LABELS[combatProfile]} program for ${athleteProfile.name || "Athlete"}: ${programSettings.lengthWeeks} weeks, ${programSettings.scDaysPerWeek} S&C days/week, ${programSettings.phase}.`;

  return {
    summary,
    weeks,
    methodology: createProgramMethodologyMetadata({
      hasPainFlags: athleteProfile.painAreas.length > 0,
      includesTaper: programSettings.lengthWeeks >= 8,
    }),
    lifecycle: createGeneratedLifecycle(),
  };
}

function getBlockName(week: number, length: number, isCheckpoint: boolean) {
  if (isCheckpoint && week !== length) return "Checkpoint / Deload";
  if (length === 4) return week < 4 ? "Base Build" : "Checkpoint / Deload";
  if (week <= 4) return "Accumulation";
  if (week <= 8) return "Transmutation";
  return week === length ? "Realization / Taper" : "Realization";
}

function getWeekFocus(week: number, length: number, phase: string, goal: string, isCheckpoint: boolean) {
  if (isCheckpoint && week !== length) return "Reduce volume, keep technical quality, retest key markers.";
  if (week === length && length >= 8) return "Keep speed/power sharp, lower fatigue, finalize testing notes.";
  if (phase === "Fight camp") return `Fight camp readiness: ${goal}, fatigue control, and round-specific conditioning.`;
  return `${goal}: build the base qualities without interfering with combat practice.`;
}

function getSessionTemplates(days: number): SessionTemplate[] {
  if (days === 2) return ["strength", "power_conditioning"];
  if (days === 4) return ["strength", "upper_trunk", "power_conditioning", "conditioning_prehab"];
  return ["strength", "upper_trunk", "power_conditioning"];
}

function generateDay({
  dayIndex,
  template,
  combatProfile,
  combatLoad,
  athleteProfile,
  week,
  lengthWeeks,
  isCheckpoint,
  programSettings,
  assessment,
}: {
  dayIndex: number;
  template: SessionTemplate;
  combatProfile: CombatProfile;
  combatLoad: CombatLoad;
  athleteProfile: AthleteProfile;
  week: number;
  lengthWeeks: number;
  isCheckpoint: boolean;
  programSettings: ProgramSettings;
  assessment: Assessment;
}): ProgramDay {
  const readinessRisk = Number(assessment.sleep) <= 2 || Number(assessment.stress) >= 4 || Number(assessment.soreness) >= 4;
  const highCombatLoad = combatLoad.hardGrapplingDays + combatLoad.hardSparringDays >= 3
    || combatLoad.grapplingSessions + combatLoad.strikingSessions + combatLoad.technicalSessions >= 7;
  const loading = getLoadingPlan({ week, lengthWeeks, isCheckpoint, readinessRisk, highCombatLoad });
  const conflictNote = getConflictNote(combatProfile, combatLoad);
  const sessionGoal = getSessionGoal(template, combatProfile, isCheckpoint);

  return {
    day: `Day ${dayIndex}`,
    sessionGoal,
    block: loading.blockLabel,
    warmup: getWarmup(combatProfile, athleteProfile),
    powerSpeed: getPowerSpeed(template, combatProfile, loading, athleteProfile),
    strength: getStrength(template, combatProfile, loading, athleteProfile),
    accessory: getAccessory(template, combatProfile, loading, athleteProfile),
    conditioning: getConditioning(template, combatProfile, loading, athleteProfile),
    mobilityPrehab: getPrehab(combatProfile, athleteProfile),
    coachNotesUa: conflictNote.ua,
    coachNotesEn: conflictNote.en,
    athleteNotesUa: loading.noteUa,
    athleteNotesEn: loading.noteEn,
  };
}

function getLoadingPlan({
  week,
  lengthWeeks,
  isCheckpoint,
  readinessRisk,
  highCombatLoad,
}: {
  week: number;
  lengthWeeks: number;
  isCheckpoint: boolean;
  readinessRisk: boolean;
  highCombatLoad: boolean;
}): LoadingPlan {
  const finalTaper = lengthWeeks >= 8 && week === lengthWeeks;
  const waveWeek = ((week - 1) % 4) + 1;

  const reduced = (reason: "checkpoint" | "readiness" | "taper"): LoadingPlan => {
    const note = {
      checkpoint: {
        ua: "Контрольний тиждень: не женись за рекордами, тримай якість руху і свіже самопочуття.",
        en: "Checkpoint week: do not chase records, keep movement quality high and fatigue low.",
      },
      readiness: {
        ua: "Сьогодні обсяг зменшений через readiness. Працюй чисто, без форсування.",
        en: "Volume is reduced due to readiness. Move cleanly and do not force it today.",
      },
      taper: {
        ua: "Фінальний taper: швидкість залишаємо, втому прибираємо. Все має відчуватись свіжо.",
        en: "Final taper: keep speed sharp and remove fatigue. Everything should feel fresh.",
      },
    }[reason];

    return {
      volume: "reduced",
      blockLabel: reason === "taper" ? "Realization / Taper" : "Deload / Checkpoint",
      powerSets: reason === "taper" ? "2-3" : "2",
      heavySets: reason === "taper" ? "2-3" : "2",
      secondarySets: "2",
      accessorySets: "2",
      conditioningSets: reason === "taper" ? "3-4" : "4",
      zone2Duration: reason === "taper" ? "20-25 min" : "20 min",
      strengthIntensity: reason === "taper" ? "RPE 6-7" : "RPE 6",
      secondaryIntensity: "2-3 RIR",
      conditioningIntensity: "RPE 6-7",
      strengthTempo: "3-1-X-1",
      noteUa: note.ua,
      noteEn: note.en,
    };
  };

  if (readinessRisk) return reduced("readiness");
  if (finalTaper) return reduced("taper");
  if (isCheckpoint) return reduced("checkpoint");

  const highLoadSuffixUa = highCombatLoad ? " Через високе бойове навантаження залиш 1-2 повтори в запасі." : "";
  const highLoadSuffixEn = highCombatLoad ? " Because combat load is high, keep 1-2 reps in reserve." : "";

  if (waveWeek === 1) {
    return {
      volume: "normal",
      blockLabel: "Load-in / Technique",
      powerSets: "3",
      heavySets: "3",
      secondarySets: "2-3",
      accessorySets: "2",
      conditioningSets: "5-6",
      zone2Duration: "25-30 min",
      strengthIntensity: "RPE 6-7",
      secondaryIntensity: "2 RIR",
      conditioningIntensity: "RPE 7",
      strengthTempo: "3-1-X-1",
      noteUa: `Вхідний тиждень: техніка, стабільність і контроль темпу важливіші за вагу.${highLoadSuffixUa}`,
      noteEn: `Load-in week: technique, stability, and tempo control matter more than load.${highLoadSuffixEn}`,
    };
  }

  if (waveWeek === 2 || highCombatLoad) {
    return {
      volume: "normal",
      blockLabel: highCombatLoad ? "Build / Combat Load Managed" : "Build",
      powerSets: "4",
      heavySets: "4",
      secondarySets: "3",
      accessorySets: "3",
      conditioningSets: "6-7",
      zone2Duration: "30-35 min",
      strengthIntensity: "RPE 7",
      secondaryIntensity: "1-2 RIR",
      conditioningIntensity: "RPE 7-8",
      strengthTempo: "3-1-X-1",
      noteUa: `Тиждень нарощення: додай робочий обсяг, але не ламай техніку.${highLoadSuffixUa}`,
      noteEn: `Build week: add work volume without breaking technique.${highLoadSuffixEn}`,
    };
  }

  return {
    volume: "normal",
    blockLabel: "High Stimulus",
    powerSets: "4-5",
    heavySets: "4-5",
    secondarySets: "3",
    accessorySets: "2-3",
    conditioningSets: "7-8",
    zone2Duration: "30-40 min",
    strengthIntensity: "RPE 7-8",
    secondaryIntensity: "1-2 RIR",
    conditioningIntensity: "RPE 8",
    strengthTempo: "2-1-X-1",
    noteUa: "Сильний стимул тижня: працюй потужно, але зупиняй підхід до розвалу техніки.",
    noteEn: "High stimulus week: work powerfully, but stop before technique falls apart.",
  };
}

function getSessionGoal(template: SessionTemplate, profile: CombatProfile, isCheckpoint: boolean) {
  if (isCheckpoint) return "Checkpoint, tissue quality, and low fatigue output";
  const goals: Record<SessionTemplate, Record<CombatProfile, string>> = {
    strength: {
      grappler: "Lower strength, grip support, trunk stiffness",
      striker: "Lower strength, acceleration, elastic stiffness",
      hybrid: "Total body strength with fatigue control",
    },
    upper_trunk: {
      grappler: "Upper pull, neck, trunk, and shoulder armor",
      striker: "Upper power transfer, shoulder/scap control",
      hybrid: "Upper strength, trunk, and joint resilience",
    },
    power_conditioning: {
      grappler: "Repeated effort power and grappling conditioning",
      striker: "Rotational power, footwork, and round conditioning",
      hybrid: "Power transfer and fight-specific intervals",
    },
    conditioning_prehab: {
      grappler: "Aerobic base, carries, neck and knee prehab",
      striker: "Aerobic base, ankle stiffness, shoulder prehab",
      hybrid: "Aerobic base and full-body durability",
    },
  };
  return goals[template][profile];
}

function getWarmup(profile: CombatProfile, athleteProfile: AthleteProfile): ExercisePrescription[] {
  const common: ExercisePrescription[] = [fromLibrary("dynamic-mobility-flow")];

  if (profile === "grappler") {
    return [...common, fromLibrary("scap-pushup-neck-prep")];
  }
  if (profile === "striker") {
    return [...common, fromLibrary("low-pogo-hip-switch")];
  }
  return [...common, fromLibrary("low-pogo-hip-switch"), best(["band-external-rotation", "shoulder-isometric-reset", "dead-bug"], athleteProfile)];
}

function getPowerSpeed(template: SessionTemplate, profile: CombatProfile, loading: LoadingPlan, athleteProfile: AthleteProfile): ExercisePrescription[] {
  const sets = loading.powerSets;
  if (template === "upper_trunk") {
    if (profile === "striker") return [best(["med-ball-rotational-throw", "med-ball-chest-pass", "shoulder-isometric-reset"], athleteProfile, { defaultSets: sets })];
    return [best(["med-ball-chest-pass", "push-up", "shoulder-isometric-reset"], athleteProfile, { defaultSets: sets })];
  }
  if (template === "power_conditioning") {
    if (profile === "grappler") return [best(["broad-jump", "box-jump"], athleteProfile, { defaultSets: sets })];
    if (profile === "striker") return [best(["lateral-bound", "broad-jump"], athleteProfile, { defaultSets: sets })];
    return [best(["med-ball-rotational-throw", "broad-jump"], athleteProfile, { defaultSets: sets })];
  }
  if (template === "strength") {
    return [best(profile === "striker" ? ["acceleration-build-up", "broad-jump"] : ["box-jump", "broad-jump"], athleteProfile, { defaultSets: sets })];
  }
  return [];
}

function getStrength(template: SessionTemplate, profile: CombatProfile, loading: LoadingPlan, athleteProfile: AthleteProfile): ExercisePrescription[] {
  const heavySets = loading.heavySets;
  const secondarySets = loading.secondarySets;
  if (template === "strength") {
    if (profile === "grappler") {
      return [
        best(["trap-bar-deadlift", "goblet-squat", "rear-foot-elevated-split-squat"], athleteProfile, { defaultSets: heavySets, defaultTempo: loading.strengthTempo, defaultIntensity: loading.strengthIntensity }),
        best(["rear-foot-elevated-split-squat", "goblet-squat"], athleteProfile, { defaultSets: secondarySets, defaultIntensity: loading.secondaryIntensity }),
      ];
    }
    if (profile === "striker") {
      return [
        best(["front-squat", "goblet-squat", "rear-foot-elevated-split-squat"], athleteProfile, { defaultSets: heavySets, defaultTempo: loading.strengthTempo, defaultIntensity: loading.strengthIntensity }),
        best(["rear-foot-elevated-split-squat", "goblet-squat"], athleteProfile, { defaultSets: secondarySets, defaultIntensity: loading.secondaryIntensity }),
      ];
    }
    return [
      best(["trap-bar-deadlift", "goblet-squat", "rear-foot-elevated-split-squat"], athleteProfile, { defaultSets: heavySets, defaultTempo: loading.strengthTempo, defaultIntensity: loading.strengthIntensity }),
      best(["landmine-press", "push-up"], athleteProfile, { defaultSets: secondarySets, defaultIntensity: loading.secondaryIntensity }),
    ];
  }

  if (template === "upper_trunk") {
    if (profile === "grappler") return [best(["weighted-chin-up", "push-up", "shoulder-isometric-reset"], athleteProfile, { defaultSets: secondarySets, defaultIntensity: loading.secondaryIntensity })];
    if (profile === "striker") return [best(["landmine-press", "push-up", "shoulder-isometric-reset"], athleteProfile, { defaultSets: secondarySets, defaultIntensity: loading.secondaryIntensity })];
    return [best(["weighted-chin-up", "landmine-press", "push-up", "shoulder-isometric-reset"], athleteProfile, { defaultSets: secondarySets, defaultIntensity: loading.secondaryIntensity })];
  }

  return [];
}

function getAccessory(template: SessionTemplate, profile: CombatProfile, loading: LoadingPlan, athleteProfile: AthleteProfile): ExercisePrescription[] {
  const sets = loading.accessorySets;
  if (profile === "grappler") {
    if (template === "strength" || template === "conditioning_prehab") return [best(["farmer-carry", "copenhagen-plank"], athleteProfile, { defaultSets: sets })];
    return [best(["weighted-chin-up", "push-up", "shoulder-isometric-reset"], athleteProfile, { defaultSets: sets, defaultReps: "5", defaultIntensity: "2 RIR" })];
  }
  if (profile === "striker") {
    if (template === "power_conditioning") return [best(["pallof-press", "dead-bug"], athleteProfile, { defaultSets: sets })];
    return [best(["pallof-press", "dead-bug"], athleteProfile, { defaultSets: sets })];
  }
  if (template === "power_conditioning") return [best(["sled-push", "copenhagen-plank"], athleteProfile, { defaultSets: sets })];
  return [fromLibrary("copenhagen-plank", { defaultSets: sets })];
}

function getConditioning(template: SessionTemplate, profile: CombatProfile, loading: LoadingPlan, athleteProfile: AthleteProfile): ExercisePrescription[] {
  if (template !== "power_conditioning" && template !== "conditioning_prehab") return [];
  if (template === "conditioning_prehab") {
    return [best(["zone-2-bike", "tempo-runs-or-bike"], athleteProfile, { defaultReps: loading.zone2Duration, defaultIntensity: loading.conditioningIntensity })];
  }
  if (profile === "grappler") return [best(["assault-bike-repeated-efforts", "tempo-runs-or-bike"], athleteProfile, { defaultSets: loading.conditioningSets, defaultIntensity: loading.conditioningIntensity })];
  if (profile === "striker") return [best(["tempo-runs-or-bike", "assault-bike-repeated-efforts"], athleteProfile, { defaultSets: loading.conditioningSets, defaultIntensity: loading.conditioningIntensity })];
  return [best(["assault-bike-repeated-efforts", "tempo-runs-or-bike"], athleteProfile, { defaultSets: loading.conditioningSets, defaultIntensity: loading.conditioningIntensity })];
}

function getPrehab(profile: CombatProfile, athleteProfile: AthleteProfile): ExercisePrescription[] {
  if (profile === "grappler") {
    return [
      fromLibrary("neck-isometric-series"),
      fromLibrary("copenhagen-plank"),
    ];
  }
  if (profile === "striker") {
    return [
      fromLibrary("calf-isometric-hold"),
      best(["band-external-rotation", "shoulder-isometric-reset", "push-up"], athleteProfile),
    ];
  }
  return [
    fromLibrary("dead-bug"),
    fromLibrary("copenhagen-plank"),
  ];
}

function getConflictNote(profile: CombatProfile, load: CombatLoad) {
  if (profile === "grappler" || load.hardGrapplingDays > load.hardSparringDays) {
    return {
      ua: "Не став важкий хват/шию/спину перед важкою боротьбою.",
      en: "Do not place heavy grip, neck, or back work before hard wrestling.",
    };
  }
  if (profile === "striker" || load.hardSparringDays > 0) {
    return {
      ua: "Не добивай ноги перед важким спарингом.",
      en: "Do not crush the legs before hard sparring.",
    };
  }
  return {
    ua: "Тримай обʼєм нижчим, якщо бойових сесій багато.",
    en: "Keep volume lower when combat sessions are high.",
  };
}

function fromLibrary(
  id: string,
  overrides: Partial<{
    defaultSets: string;
    defaultReps: string;
    defaultTempo: string;
    defaultRest: string;
    defaultIntensity: string;
  }> = {},
): ExercisePrescription {
  return prescribeExercise(id, overrides);
}

function best(
  ids: string[],
  athleteProfile: AthleteProfile,
  overrides: Partial<{
    defaultSets: string;
    defaultReps: string;
    defaultTempo: string;
    defaultRest: string;
    defaultIntensity: string;
  }> = {},
): ExercisePrescription {
  return prescribeBestExercise(ids, athleteProfile, overrides);
}
