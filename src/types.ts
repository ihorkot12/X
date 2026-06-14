export type UserMode = "athlete" | "coach";
export type LanguageMode = "ua" | "en" | "ua_en";
export type CombatProfile = "grappler" | "striker" | "hybrid";
export type ProgramLength = 4 | 8 | 12;
export type SCDaysPerWeek = 2 | 3 | 4;

export interface CombatLoad {
  strikingSessions: number;
  grapplingSessions: number;
  hardSparringDays: number;
  hardGrapplingDays: number;
  technicalSessions: number;
}

export interface AthleteProfile {
  name: string;
  age: number | "";
  sex: string;
  heightCm: number | "";
  weightKg: number | "";
  sport: string;
  level: string;
  strengthTrainingAge: string;
  equipment: string[];
  painAreas: string[];
}

export interface ProgramSettings {
  lengthWeeks: ProgramLength;
  scDaysPerWeek: SCDaysPerWeek;
  sessionDuration: string;
  competitionDate?: string;
  phase: string;
  mainGoal: string;
}

export interface Assessment {
  squatOrTrapBar: number | "";
  benchOrPushups: number | "";
  pullups: number | "";
  verticalJump: number | "";
  broadJump: number | "";
  medBallThrow: number | "";
  sprint10m?: number | "";
  mas?: number | "";
  beepTest?: string;
  run5k?: string;
  row1500m?: string;
  restingHr?: number | "";
  hrMax?: number | "";
  sleep: number;
  stress: number;
  soreness: number;
  motivation: number;
}

export interface ExercisePrescription {
  name: string;
  sets?: string;
  reps?: string;
  tempo?: string;
  rest?: string;
  intensity?: string;
  notesUa?: string;
  notesEn?: string;
}

export interface ProgramDay {
  day: string;
  sessionGoal: string;
  block: string;
  warmup: ExercisePrescription[];
  powerSpeed: ExercisePrescription[];
  strength: ExercisePrescription[];
  accessory: ExercisePrescription[];
  conditioning: ExercisePrescription[];
  mobilityPrehab: ExercisePrescription[];
  coachNotesUa?: string;
  coachNotesEn?: string;
  athleteNotesUa?: string;
  athleteNotesEn?: string;
}

export interface ProgramWeek {
  week: number;
  blockName: string;
  focus: string;
  isCheckpoint: boolean;
  days: ProgramDay[];
}

export interface GeneratedProgram {
  summary: string;
  weeks: ProgramWeek[];
}

export interface SheetTab {
  name: string;
  type: "profile" | "assessment" | "goals" | "week" | "notes" | "zones" | "checkpoints" | "readiness";
}
