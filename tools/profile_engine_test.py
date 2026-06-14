import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


SCRIPT = r"""
import { generateProgram } from "./src/lib/programEngine";

const base = {
  combatLoad: { strikingSessions: 2, grapplingSessions: 2, hardSparringDays: 1, hardGrapplingDays: 1, technicalSessions: 2 },
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

function names(program) {
  return JSON.stringify(program.weeks.flatMap((week) => week.days.flatMap((day) => [
    ...day.warmup,
    ...day.powerSpeed,
    ...day.strength,
    ...day.accessory,
    ...day.conditioning,
    ...day.mobilityPrehab,
  ].map((exercise) => exercise.name))));
}

const grappler = names(generateProgram({ ...base, combatProfile: "grappler" }));
const striker = names(generateProgram({ ...base, combatProfile: "striker" }));
const hybrid = names(generateProgram({ ...base, combatProfile: "hybrid" }));
const minimalEquipment = names(generateProgram({
  ...base,
  combatProfile: "striker",
  athleteProfile: {
    ...base.athleteProfile,
    equipment: ["Bands", "Mat Only"],
  },
}));
const shoulderRisk = names(generateProgram({
  ...base,
  combatProfile: "striker",
  athleteProfile: {
    ...base.athleteProfile,
    painAreas: ["Shoulder"],
  },
}));
const periodized = generateProgram({ ...base, combatProfile: "striker" });
const week1Strength = periodized.weeks[0].days[0].strength[0];
const week3Strength = periodized.weeks[2].days[0].strength[0];
const week4Strength = periodized.weeks[3].days[0].strength[0];
const week12Strength = periodized.weeks[11].days[0].strength[0];
const week1Conditioning = periodized.weeks[0].days[2].conditioning[0];
const week3Conditioning = periodized.weeks[2].days[2].conditioning[0];

if (!grappler.includes("Neck Isometric Series")) throw new Error("Grappler missing neck work");
if (!grappler.includes("Farmer Carry")) throw new Error("Grappler missing carry/grip work");
if (!striker.includes("Med Ball Rotational Throw")) throw new Error("Striker missing rotational power");
if (!striker.includes("Tempo Runs or Bike")) throw new Error("Striker missing tempo conditioning");
if (!hybrid.includes("Copenhagen Plank")) throw new Error("Hybrid missing durability/prehab");
if (!hybrid.includes("Trap Bar Deadlift")) throw new Error("Hybrid missing total strength");
if (minimalEquipment.includes("Front Squat")) throw new Error("Minimal equipment profile should not receive front squat");
if (minimalEquipment.includes("Med Ball Rotational Throw")) throw new Error("Minimal equipment profile should not receive med ball throws");
if (!minimalEquipment.includes("Goblet Squat") && !minimalEquipment.includes("Rear Foot Elevated Split Squat")) {
  throw new Error("Minimal equipment profile missing lower-body replacement");
}
if (!shoulderRisk.includes("Shoulder Isometric Reset")) {
  throw new Error("Shoulder risk profile missing shoulder-safe reset replacement");
}
if (week1Strength.sets === week3Strength.sets && week1Strength.intensity === week3Strength.intensity) {
  throw new Error("Week 1 and Week 3 should not prescribe identical strength loading");
}
if (week1Conditioning.sets === week3Conditioning.sets) {
  throw new Error("Week 1 and Week 3 should not prescribe identical conditioning loading");
}
if (!periodized.weeks[3].isCheckpoint || !periodized.weeks[7].isCheckpoint) {
  throw new Error("Weeks 4 and 8 should remain checkpoint weeks");
}
if (week4Strength.sets !== "2" || week4Strength.intensity !== "RPE 6") {
  throw new Error("Week 4 checkpoint should reduce strength loading");
}
if (periodized.weeks[11].blockName !== "Realization / Taper" || week12Strength.sets !== "2-3") {
  throw new Error("Week 12 should finish with a taper strength prescription");
}

console.log("Profile engine test passed");
"""


def main():
    result = subprocess.run(
        ["node", "node_modules/tsx/dist/cli.mjs", "-e", SCRIPT],
        cwd=ROOT,
        text=True,
        capture_output=True,
        timeout=120,
    )
    print(result.stdout)
    if result.stderr:
        print(result.stderr)
    raise SystemExit(result.returncode)


if __name__ == "__main__":
    main()
