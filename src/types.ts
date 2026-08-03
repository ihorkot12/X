export type UserMode = "athlete" | "coach" | "admin";
export type LanguageMode = "ua" | "en" | "ua_en";
export type CombatProfile = "grappler" | "striker" | "hybrid";
export type ProgramLength = 4 | 8 | 12;
export type SCDaysPerWeek = 2 | 3 | 4;

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: UserMode;
  createdAt: string;
  syncToken?: string;
}

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
  legacySourceReference?: ExerciseLibraryItem["sourceReference"];
  sourceReferences?: MethodologySourceReference[];
  ruleReferences?: MethodologyRuleReference[];
  methodologySupport?: MethodologySupportStatus;
}

export type MethodologySupportStatus = "approved" | "unsupported";

export interface MethodologySourceReference {
  sourceId: string;
  sourceTitle: string;
  sourceVersion: string;
  contentHash: `sha256:${string}`;
  anchor: string;
}

export interface MethodologyRuleReference {
  ruleId: string;
  title: string;
  status: "approved";
  source: MethodologySourceReference;
}

export interface MethodologyDecisionTraceEntry {
  id: string;
  stage: "input" | "structure" | "loading" | "exercise-selection" | "safety" | "output";
  decision: string;
  outcome: string;
  supportStatus: MethodologySupportStatus;
  ruleReferences: MethodologyRuleReference[];
  sourceReferences: MethodologySourceReference[];
}

export interface UnsupportedDecisionWarning {
  code: string;
  decision: string;
  messageUa: string;
  messageEn: string;
  supportStatus: MethodologySupportStatus;
  requiresCoachDecision: true;
  affectedPaths: string[];
  sourceReferences: MethodologySourceReference[];
}

export interface ProgramMethodologyMetadata {
  methodologyVersion: string;
  methodologyHash: `sha256:${string}`;
  generatorVersion: string;
  generatorHash: `sha256:${string}`;
  matchedRuleIds: string[];
  decisionTrace: MethodologyDecisionTraceEntry[];
  warnings: UnsupportedDecisionWarning[];
}

export interface ProgramLifecycleMetadata {
  status: "generated" | "saved" | "approved" | "assigned" | "archived";
  revision: number;
  generatorMode: "deterministic";
  generatedAt?: string;
  savedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  parentProgramId?: string;
}

export type ExerciseCategory = "warmup" | "speed" | "power" | "strength" | "accessory" | "conditioning" | "mobility" | "prehab";
export type ExerciseLevel = "beginner" | "intermediate" | "advanced";
export type ExercisePattern =
  | "squat"
  | "hinge"
  | "push"
  | "pull"
  | "carry"
  | "throw"
  | "jump"
  | "sprint"
  | "cod"
  | "rotation"
  | "anti_rotation"
  | "isometric"
  | "mobility"
  | "conditioning";

export interface ExerciseLibraryItem {
  id: string;
  nameEn: string;
  nameUa?: string;
  category: ExerciseCategory;
  combatProfiles: Array<CombatProfile | "all">;
  pattern: ExercisePattern;
  bodyRegions: string[];
  equipment: string[];
  level: ExerciseLevel;
  phases: string[];
  contraindications: string[];
  defaultSets?: string;
  defaultReps?: string;
  defaultTempo?: string;
  defaultRest?: string;
  defaultIntensity?: string;
  notesUa: string;
  notesEn: string;
  sourceReference: "OTA-inspired" | "Daru-inspired" | "Black Bear";
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
  methodology?: ProgramMethodologyMetadata;
  lifecycle?: ProgramLifecycleMetadata;
}

export interface SheetTab {
  name: string;
  type: "profile" | "assessment" | "goals" | "week" | "notes" | "zones" | "checkpoints" | "readiness";
}

export interface SavedAthleteProfile {
  id: string;
  ownerId: string;
  savedAt: string;
  combatProfile: CombatProfile;
  athleteProfile: AthleteProfile;
}

export interface SavedProgramRecord {
  id: string;
  ownerId: string;
  athleteId: string;
  athleteName: string;
  savedAt: string;
  combatProfile: CombatProfile;
  combatLoad: CombatLoad;
  athleteProfile: AthleteProfile;
  programSettings: ProgramSettings;
  assessment: Assessment;
  program: GeneratedProgram;
  methodology?: ProgramMethodologyMetadata;
  lifecycle?: ProgramLifecycleMetadata;
}

export type TrainingLogStatus = "planned" | "done" | "modified" | "skipped";

export interface TrainingLogEntry {
  id: string;
  ownerId: string;
  athleteId: string;
  athleteName: string;
  date: string;
  week: number;
  day: string;
  status: TrainingLogStatus;
  readiness: number;
  notes: string;
  sessionRpe?: number;
  bodyWeightKg?: number | "";
  painNote?: string;
  createdAt: string;
}

export interface TeamRecord {
  id: string;
  ownerId: string;
  name: string;
  joinCode: string;
  createdAt: string;
}

export interface TeamMembership {
  id: string;
  teamId: string;
  coachId: string;
  athleteAccountId: string;
  athleteName: string;
  athleteEmail: string;
  athleteProfileId?: string;
  joinedAt: string;
}

export interface TestHistoryEntry {
  id: string;
  ownerId: string;
  athleteId: string;
  athleteName: string;
  date: string;
  microcycle: string;
  squatOrTrapBar?: number | "";
  benchOrPushups?: number | "";
  pullups?: number | "";
  verticalJump?: number | "";
  broadJump?: number | "";
  medBallThrow?: number | "";
  sprint10m?: number | "";
  mas?: number | "";
  notes?: string;
  createdAt: string;
}
