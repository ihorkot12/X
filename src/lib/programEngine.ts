import { 
  CombatProfile, 
  CombatLoad, 
  AthleteProfile, 
  ProgramSettings, 
  Assessment, 
  GeneratedProgram, 
  ProgramWeek, 
  ProgramDay,
  ExercisePrescription
} from "../types";

export function generateProgram(params: {
  combatProfile: CombatProfile;
  combatLoad: CombatLoad;
  athleteProfile: AthleteProfile;
  programSettings: ProgramSettings;
  assessment: Assessment;
}): GeneratedProgram {
  const { combatProfile, programSettings } = params;
  const weeks: ProgramWeek[] = [];

  for (let w = 1; w <= programSettings.lengthWeeks; w++) {
    const isCheckpoint = w % 4 === 0;
    const focus = isCheckpoint ? "Deload & Testing" : programSettings.mainGoal;
    const blockName = w <= 4 ? "Base Phase" : w <= 8 ? "Development Phase" : "Peaking Phase";

    const days: ProgramDay[] = [];
    for (let d = 1; d <= programSettings.scDaysPerWeek; d++) {
      days.push(generateDay(w, d, combatProfile, isCheckpoint, programSettings.mainGoal));
    }

    weeks.push({
      week: w,
      blockName,
      focus,
      isCheckpoint,
      days,
    });
  }

  const summary = `${combatProfile.charAt(0).toUpperCase() + combatProfile.slice(1)} Performance Program - ${programSettings.lengthWeeks} Weeks. 
    Focusing on ${programSettings.mainGoal} for ${params.athleteProfile.name || 'Athlete'}.`;

  return {
    summary,
    weeks,
  };
}

function generateDay(
  week: number, 
  dayNum: number, 
  profile: CombatProfile, 
  isDeload: boolean, 
  goal: string
): ProgramDay {
  const dayName = `Day ${dayNum}`;
  
  const programDay: ProgramDay = {
    day: dayName,
    sessionGoal: isDeload ? "Recovery & Technique" : goal,
    block: "S&C Session",
    warmup: [
      { name: "Dynamic Mobility Flow", sets: "1", reps: "5 min", notesEn: "Focus on hips and T-spine", notesUa: "Фокус на мобільність кульшових суглобів та грудного відділу" },
      { name: "World's Greatest Stretch", sets: "2", reps: "5/side", notesEn: "Slow and controlled", notesUa: "Повільно та контрольовано" }
    ],
    powerSpeed: [],
    strength: [],
    accessory: [],
    conditioning: [],
    mobilityPrehab: [
      { name: "Copenhagen Plank", sets: "2", reps: "20s", notesEn: "Keep bottom leg active", notesUa: "Тримай нижню ногу активною" }
    ],
  };

  if (profile === "grappler") {
    programDay.powerSpeed.push({ name: "Medicine Ball Slam", sets: "3", reps: "5", intensity: "Max effort", notesEn: "Explosive movement", notesUa: "Вибуховий рух" });
    programDay.strength.push({ name: "Trap Bar Deadlift", sets: isDeload ? "2" : "3", reps: isDeload ? "5" : "5", intensity: isDeload ? "60%" : "75-80%", notesEn: "Neutral grip, strong brace", notesUa: "Нейтральний хват, сильний кор" });
    programDay.strength.push({ name: "Weighted Chin-Ups", sets: "3", reps: "6-8", notesEn: "Strict form", notesUa: "Строга форма" });
    programDay.accessory.push({ name: "Z-Press", sets: "3", reps: "10", notesEn: "Sit tall", notesUa: "Сиди рівно" });
    programDay.accessory.push({ name: "Farmer Carries", sets: "3", reps: "30m", notesEn: "Heavy load, controlled walk", notesUa: "Важка вага, контрольована хода" });
  } else if (profile === "striker") {
    programDay.powerSpeed.push({ name: "Box Jumps", sets: "4", reps: "3", intensity: "Max power", notesEn: "Land soft", notesUa: "М'яке приземлення" });
    programDay.strength.push({ name: "Front Squat", sets: isDeload ? "2" : "3", reps: "5", intensity: isDeload ? "60%" : "70-75%", notesEn: "Maintain upright torso", notesUa: "Тримай корпус вертикально" });
    programDay.strength.push({ name: "Landmine Press", sets: "3", reps: "8/side", notesEn: "Rotational stability", notesUa: "Ротаційна стабільність" });
    programDay.accessory.push({ name: "Pogo Jumps", sets: "3", reps: "15", notesEn: "Ankle stiffness", notesUa: "Жорсткість гомілкостопа" });
    programDay.conditioning.push({ name: "AirBike Sprints", sets: "5", reps: "10s", rest: "50s", notesEn: "Max effort burst", notesUa: "Максимальне зусилля" });
  } else {
    // Hybrid
    programDay.powerSpeed.push({ name: "Kettlebell Swings", sets: "3", reps: "10", intensity: "Hard", notesEn: "Hinged movement", notesUa: "Рух від тазу" });
    programDay.strength.push({ name: "Zercher Squat", sets: isDeload ? "2" : "3", reps: "6", intensity: "RPE 8", notesEn: "Great for grapplers and mma", notesUa: "Чудово для борців та мма" });
    programDay.strength.push({ name: "Dumbbell Bench Press", sets: "3", reps: "8", notesEn: "Controlled eccentric", notesUa: "Контрольована ексцентрика" });
    programDay.accessory.push({ name: "Sled Push", sets: "4", reps: "20m", notesEn: "Drive hard", notesUa: "Штовхай сильно" });
  }

  return programDay;
}
