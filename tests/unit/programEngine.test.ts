import { describe, expect, it } from "vitest";

import { generateProgram } from "../../src/lib/programEngine";
import type {
  Assessment,
  AthleteProfile,
  CombatLoad,
  CombatProfile,
  ProgramSettings,
} from "../../src/types";

function createParams(overrides: {
  combatProfile?: CombatProfile;
  combatLoad?: Partial<CombatLoad>;
  athleteProfile?: Partial<AthleteProfile>;
  programSettings?: Partial<ProgramSettings>;
  assessment?: Partial<Assessment>;
} = {}): Parameters<typeof generateProgram>[0] {
  return {
    combatProfile: overrides.combatProfile ?? "hybrid",
    combatLoad: {
      strikingSessions: 2,
      grapplingSessions: 2,
      hardSparringDays: 1,
      hardGrapplingDays: 0,
      technicalSessions: 1,
      ...overrides.combatLoad,
    },
    athleteProfile: {
      name: "Test Athlete",
      age: 24,
      sex: "Male",
      heightCm: 180,
      weightKg: 82,
      sport: "MMA",
      level: "Intermediate",
      strengthTrainingAge: "2-4 years",
      equipment: ["Barbell", "Trap Bar", "Dumbbells", "Kettlebells", "Med Balls", "Bands", "Bike", "Sled", "Pull-up Bar", "Box", "Bench"],
      painAreas: [],
      ...overrides.athleteProfile,
    },
    programSettings: {
      lengthWeeks: 8 as const,
      scDaysPerWeek: 3 as const,
      sessionDuration: "60 min",
      phase: "General preparation",
      mainGoal: "Strength and power",
      ...overrides.programSettings,
    },
    assessment: {
      squatOrTrapBar: 140,
      benchOrPushups: 100,
      pullups: 12,
      verticalJump: 55,
      broadJump: 240,
      medBallThrow: 8,
      sleep: 4,
      stress: 2,
      soreness: 2,
      motivation: 4,
      ...overrides.assessment,
    },
  };
}

describe("generateProgram", () => {
  it("returns identical structured output for identical inputs", () => {
    const first = generateProgram(createParams());
    const second = generateProgram(createParams());

    expect(second).toEqual(first);
    expect(first.summary).toContain("Test Athlete");
    expect(first.weeks).toHaveLength(8);
    expect(first.weeks.every((week) => week.days.length === 3)).toBe(true);
  });

  it.each([
    [2, 2],
    [3, 3],
    [4, 4],
  ] as const)("creates %i sessions when %i S&C days are requested", (requestedDays, expectedDays) => {
    const program = generateProgram(createParams({
      programSettings: { scDaysPerWeek: requestedDays },
    }));

    expect(program.weeks.every((week) => week.days.length === expectedDays)).toBe(true);
  });

  it("applies checkpoint deloads and a final taper across a 12-week wave", () => {
    const program = generateProgram(createParams({
      programSettings: { lengthWeeks: 12, scDaysPerWeek: 4 },
    }));

    expect(program.weeks[3]).toMatchObject({
      week: 4,
      blockName: "Checkpoint / Deload",
      isCheckpoint: true,
    });
    expect(program.weeks[3].days[0].block).toBe("Deload / Checkpoint");
    expect(program.weeks[7].days[0].block).toBe("Deload / Checkpoint");
    expect(program.weeks[11]).toMatchObject({
      blockName: "Realization / Taper",
      isCheckpoint: true,
    });
    expect(program.weeks[11].days[0].block).toBe("Realization / Taper");
    expect(program.weeks[11].days[0].strength[0].sets).toBe("2-3");
  });

  it("lets readiness risk override normal loading and taper loading", () => {
    const program = generateProgram(createParams({
      programSettings: { lengthWeeks: 12 },
      assessment: { sleep: 2, stress: 4, soreness: 4 },
    }));

    expect(program.weeks[0].days[0].block).toBe("Deload / Checkpoint");
    expect(program.weeks[11].days[0].block).toBe("Deload / Checkpoint");
    expect(program.weeks[0].days[0].athleteNotesEn).toContain("readiness");
  });

  it("manages high combat load and preserves reps in reserve", () => {
    const program = generateProgram(createParams({
      combatLoad: {
        strikingSessions: 4,
        grapplingSessions: 3,
        technicalSessions: 2,
        hardSparringDays: 2,
        hardGrapplingDays: 1,
      },
    }));

    expect(program.weeks[0].days[0].athleteNotesEn).toContain("1-2 reps in reserve");
    expect(program.weeks[1].days[0].block).toBe("Build / Combat Load Managed");
    expect(program.weeks[2].days[0].block).toBe("Build / Combat Load Managed");
  });

  it.each([
    ["grappler", "Lower strength, grip support, trunk stiffness", "heavy grip, neck, or back work"],
    ["striker", "Lower strength, acceleration, elastic stiffness", "Do not crush the legs"],
    ["hybrid", "Total body strength with fatigue control", "Do not crush the legs"],
  ] as const)("creates profile-specific sessions for a %s", (combatProfile, goal, conflictNote) => {
    const program = generateProgram(createParams({ combatProfile }));
    const firstDay = program.weeks[0].days[0];

    expect(firstDay.sessionGoal).toBe(goal);
    expect(firstDay.coachNotesEn).toContain(conflictNote);
  });

  it("uses the discipline contract to keep Kyokushin programs striker-specific", () => {
    const program = generateProgram(createParams({
      combatProfile: "hybrid",
      athleteProfile: { sport: "Kyokushin Karate" },
    }));

    expect(program.summary).toContain("Кіокушинкай карате");
    expect(program.weeks[0].days[0].sessionGoal).toBe(
      "Lower strength, acceleration, elastic stiffness",
    );
    expect(program.weeks[0].days[0].coachNotesEn).toContain("Do not crush the legs");
  });

  it("uses fight-camp focus and safe bodyweight fallbacks", () => {
    const program = generateProgram(createParams({
      combatProfile: "striker",
      athleteProfile: {
        equipment: ["Bodyweight"],
        painAreas: ["Knee", "Shoulder"],
      },
      programSettings: {
        lengthWeeks: 4,
        scDaysPerWeek: 4,
        phase: "Fight camp",
        mainGoal: "Taper for competition",
      },
    }));

    expect(program.weeks[0].focus).toContain("Fight camp readiness");
    expect(program.weeks[0].days[0].strength[0].name).toBe("Rear Foot Elevated Split Squat");
    expect(program.weeks[0].days[1].strength[0].name).toBe("Shoulder Isometric Reset");
    expect(program.weeks[3].blockName).toBe("Checkpoint / Deload");
  });
});
