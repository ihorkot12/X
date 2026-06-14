import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Info,
  Layout,
  LogOut,
  Send,
  Shield,
  Sparkles,
  Target,
  Upload,
  User,
  UserPlus,
} from "lucide-react";
import {
  Assessment,
  AthleteProfile,
  CombatLoad,
  CombatProfile,
  GeneratedProgram,
  LanguageMode,
  ProgramSettings,
  SavedAthleteProfile,
  SavedProgramRecord,
  TeamMembership,
  TeamRecord,
  TestHistoryEntry,
  TrainingLogEntry,
  TrainingLogStatus,
  UserAccount,
  UserMode,
} from "./types";
import { generateProgram } from "./lib/programEngine";
import { scorePriorities } from "./lib/priorityScoring";
import { fetchRemoteSnapshot, pushRemoteSnapshot, remoteSyncEnabled, SyncSnapshot, SyncStatus } from "./lib/remoteSync";
import { AssessmentInputs } from "./components/forms/AssessmentInputs";
import { ProgramDashboard } from "./components/program/ProgramDashboard";
import { SheetPreview } from "./components/sheets/SheetPreview";
import { Button, Card, Input, SegmentedControl } from "./components/ui/Base";

const SPORTS = ["MMA", "Karate", "Kickboxing", "Boxing", "Wrestling", "Sambo", "Judo", "BJJ", "Muay Thai", "Other"];
const EQUIPMENT = ["Barbell", "Dumbbells", "Kettlebells", "Machines", "Pull-up Bar", "Sled", "Bike", "Rower", "Treadmill", "Med Balls", "Bands", "Mat Only"];
const PAIN_AREAS = ["Neck", "Shoulder", "Elbow/Wrist/Hand", "Lower Back", "Hip", "Knee", "Ankle/Foot", "Concussion History"];
const ACCOUNT_STORAGE_KEY = "bbp_accounts_v1";
const SESSION_STORAGE_KEY = "bbp_session_v1";
const ATHLETE_STORAGE_KEY = "bbp_saved_athletes_v1";
const PROGRAM_STORAGE_KEY = "bbp_saved_programs_v1";
const TRAINING_LOG_STORAGE_KEY = "bbp_training_logs_v1";
const TEAM_STORAGE_KEY = "bbp_teams_v1";
const MEMBERSHIP_STORAGE_KEY = "bbp_team_memberships_v1";
const TEST_HISTORY_STORAGE_KEY = "bbp_test_history_v1";

const PROFILE_COPY: Record<CombatProfile, { title: string; summary: string; emphasis: string[] }> = {
  grappler: {
    title: "Grappler",
    summary: "Wrestling, sambo, judo, BJJ, or MMA with a grappling bias.",
    emphasis: ["Posterior chain", "Grip and neck", "Carries and isometrics", "Repeated efforts"],
  },
  striker: {
    title: "Striker",
    summary: "Boxing, karate, kickboxing, Muay Thai, or a striking-biased fighter.",
    emphasis: ["Elastic power", "Rotational throws", "Footwork and decel", "Aerobic base"],
  },
  hybrid: {
    title: "Striker + Grappler",
    summary: "MMA, combat sambo, or a mixed profile that must manage both stressors.",
    emphasis: ["Balanced volume", "Power transfer", "Fight-specific conditioning", "Recovery management"],
  },
};

export default function App() {
  const [step, setStep] = useState(1);
  const [highestStepReached, setHighestStepReached] = useState(1);
  const [userMode, setUserMode] = useState<UserMode>("coach");
  const [languageMode, setLanguageMode] = useState<LanguageMode>("ua_en");
  const [combatProfile, setCombatProfile] = useState<CombatProfile>("hybrid");
  const [combatLoad, setCombatLoad] = useState<CombatLoad>({
    strikingSessions: 3,
    grapplingSessions: 2,
    hardSparringDays: 1,
    hardGrapplingDays: 1,
    technicalSessions: 2,
  });
  const [athleteProfile, setAthleteProfile] = useState<AthleteProfile>({
    name: "",
    age: "",
    sex: "Male",
    heightCm: "",
    weightKg: "",
    sport: "MMA",
    level: "Amateur",
    strengthTrainingAge: "1-3 years",
    equipment: ["Barbell", "Dumbbells", "Med Balls", "Bike"],
    painAreas: [],
  });
  const [programSettings, setProgramSettings] = useState<ProgramSettings>({
    lengthWeeks: 8,
    scDaysPerWeek: 3,
    sessionDuration: "60 min",
    competitionDate: "",
    phase: "Off-season",
    mainGoal: "Strength & Power",
  });
  const [assessment, setAssessment] = useState<Assessment>({
    squatOrTrapBar: "",
    benchOrPushups: "",
    pullups: "",
    verticalJump: "",
    broadJump: "",
    medBallThrow: "",
    sprint10m: "",
    mas: "",
    restingHr: "",
    hrMax: "",
    sleep: 4,
    stress: 3,
    soreness: 2,
    motivation: 5,
  });
  const [program, setProgram] = useState<GeneratedProgram | null>(null);
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [authForm, setAuthForm] = useState({ name: "", email: "" });
  const [allSavedAthletes, setAllSavedAthletes] = useState<SavedAthleteProfile[]>([]);
  const [allSavedPrograms, setAllSavedPrograms] = useState<SavedProgramRecord[]>([]);
  const [allTrainingLogs, setAllTrainingLogs] = useState<TrainingLogEntry[]>([]);
  const [allTeams, setAllTeams] = useState<TeamRecord[]>([]);
  const [allMemberships, setAllMemberships] = useState<TeamMembership[]>([]);
  const [allTestHistory, setAllTestHistory] = useState<TestHistoryEntry[]>([]);
  const [logDraft, setLogDraft] = useState({
    date: new Date().toISOString().slice(0, 10),
    week: "1",
    day: "Day 1",
    status: "done" as TrainingLogStatus,
    readiness: "4",
    sessionRpe: "7",
    bodyWeightKg: "",
    painNote: "",
    notes: "",
  });
  const [teamDraft, setTeamDraft] = useState({ name: "Fight Team", joinCode: "" });
  const [testDraft, setTestDraft] = useState({ date: new Date().toISOString().slice(0, 10), microcycle: "Week 4 checkpoint", notes: "" });
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("local");
  const [backupMessage, setBackupMessage] = useState("");
  const [aiDraft, setAiDraft] = useState("Explain the biggest risk in this block and what the coach should watch in week 1.");
  const [aiResponse, setAiResponse] = useState("");
  const [aiError, setAiError] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const steps = [
    { name: "Start", icon: Shield },
    { name: "Combat", icon: Target },
    { name: "Athlete", icon: User },
    { name: "Settings", icon: Activity },
    { name: "Assessment", icon: Info },
    { name: "Program", icon: Layout },
    { name: "Sheet", icon: FileSpreadsheet },
  ];

  const profileSummary = useMemo(() => PROFILE_COPY[combatProfile], [combatProfile]);
  const priorityScores = useMemo(
    () => scorePriorities({ combatProfile, combatLoad, athleteProfile, assessment }),
    [assessment, athleteProfile, combatLoad, combatProfile],
  );
  const savedAthletes = useMemo(
    () => allSavedAthletes.filter((athlete) => account && athlete.ownerId === account.id),
    [account, allSavedAthletes],
  );
  const trainingLogs = useMemo(
    () => allTrainingLogs.filter((log) => account && log.ownerId === account.id),
    [account, allTrainingLogs],
  );
  const savedPrograms = useMemo(
    () => allSavedPrograms.filter((record) => account && record.ownerId === account.id),
    [account, allSavedPrograms],
  );
  const teams = useMemo(
    () => allTeams.filter((team) => account && team.ownerId === account.id),
    [account, allTeams],
  );
  const coachMemberships = useMemo(
    () => allMemberships.filter((membership) => account && membership.coachId === account.id),
    [account, allMemberships],
  );
  const athleteMemberships = useMemo(
    () => allMemberships.filter((membership) => account && membership.athleteAccountId === account.id),
    [account, allMemberships],
  );
  const visibleTestHistory = useMemo(
    () =>
      allTestHistory.filter((entry) => {
        if (!account) return false;
        if (entry.ownerId === account.id) return true;
        return coachMemberships.some((membership) => membership.athleteAccountId === entry.ownerId || membership.athleteProfileId === entry.athleteId);
      }),
    [account, allTestHistory, coachMemberships],
  );

  useEffect(() => {
    try {
      const rawAccounts = window.localStorage.getItem(ACCOUNT_STORAGE_KEY);
      const parsedAccounts: UserAccount[] = rawAccounts ? JSON.parse(rawAccounts) : [];
      const migratedAccounts = parsedAccounts.map((item) => ({ ...item, syncToken: item.syncToken || createId("sync") }));
      if (rawAccounts && JSON.stringify(parsedAccounts) !== JSON.stringify(migratedAccounts)) {
        window.localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(migratedAccounts));
      }
      setAccounts(migratedAccounts);

      const sessionId = window.localStorage.getItem(SESSION_STORAGE_KEY);
      const sessionAccount = migratedAccounts.find((item) => item.id === sessionId) ?? null;
      setAccount(sessionAccount);
      if (sessionAccount) {
        setUserMode(sessionAccount.role);
        setAuthForm({ name: sessionAccount.name, email: sessionAccount.email });
      }

      const raw = window.localStorage.getItem(ATHLETE_STORAGE_KEY);
      if (raw) {
        const parsedAthletes: SavedAthleteProfile[] = JSON.parse(raw);
        const migratedAthletes = sessionAccount
          ? parsedAthletes.map((athlete) => ({
              ...athlete,
              ownerId: athlete.ownerId || sessionAccount.id,
              id: athlete.id.startsWith(sessionAccount.id) ? athlete.id : getAthleteId(sessionAccount.id, athlete.athleteProfile.name),
            }))
          : parsedAthletes;
        setAllSavedAthletes(migratedAthletes);
        if (sessionAccount) window.localStorage.setItem(ATHLETE_STORAGE_KEY, JSON.stringify(migratedAthletes));
      }

      const rawPrograms = window.localStorage.getItem(PROGRAM_STORAGE_KEY);
      if (rawPrograms) setAllSavedPrograms(JSON.parse(rawPrograms));

      const rawLogs = window.localStorage.getItem(TRAINING_LOG_STORAGE_KEY);
      if (rawLogs) setAllTrainingLogs(JSON.parse(rawLogs));

      const rawTeams = window.localStorage.getItem(TEAM_STORAGE_KEY);
      if (rawTeams) setAllTeams(JSON.parse(rawTeams));

      const rawMemberships = window.localStorage.getItem(MEMBERSHIP_STORAGE_KEY);
      if (rawMemberships) setAllMemberships(JSON.parse(rawMemberships));

      const rawTestHistory = window.localStorage.getItem(TEST_HISTORY_STORAGE_KEY);
      if (rawTestHistory) setAllTestHistory(JSON.parse(rawTestHistory));
    } catch {
      setAccounts([]);
      setAccount(null);
      setAllSavedAthletes([]);
      setAllSavedPrograms([]);
      setAllTrainingLogs([]);
      setAllTeams([]);
      setAllMemberships([]);
      setAllTestHistory([]);
    } finally {
      setDataLoaded(true);
    }
  }, []);

  const nextStep = () => {
    const errors = validateStep(step);
    setFormErrors(errors);
    if (errors.length) return;
    moveToStep(Math.min(step + 1, steps.length));
  };
  const prevStep = () => {
    setFormErrors([]);
    setStep((current) => Math.max(current - 1, 1));
  };
  const moveToStep = (targetStep: number) => {
    setStep(targetStep);
    setHighestStepReached((current) => Math.max(current, targetStep));
  };
  const canUseStep = (targetStep: number) => {
    if ((targetStep === 6 || targetStep === 7) && !program) return false;
    return targetStep <= highestStepReached || targetStep === step + 1;
  };
  const goToStep = (targetStep: number) => {
    if (!canUseStep(targetStep)) return;
    if (targetStep <= highestStepReached) {
      setFormErrors([]);
      setStep(targetStep);
      return;
    }
    nextStep();
  };
  const resetDemo = () => {
    setProgram(null);
    setFormErrors([]);
    setHighestStepReached(1);
    setStep(1);
  };

  const saveAccounts = (nextAccounts: UserAccount[]) => {
    setAccounts(nextAccounts);
    window.localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(nextAccounts));
  };

  const handleAuth = () => {
    const email = authForm.email.trim().toLowerCase();
    const name = authForm.name.trim();
    const errors: string[] = [];
    if (!email || !email.includes("@")) errors.push("Enter a valid email for the account.");
    if (!name && !accounts.some((item) => item.email === email)) errors.push("Enter your name to create a new account.");
    setFormErrors(errors);
    if (errors.length) return;

    const existing = accounts.find((item) => item.email === email);
    const nextAccount =
      existing ??
      ({
        id: createId("acct"),
        name,
        email,
        role: userMode,
        createdAt: new Date().toISOString(),
        syncToken: createId("sync"),
      } satisfies UserAccount);

    if (!existing) saveAccounts([nextAccount, ...accounts]);
    setAccount(nextAccount);
    setUserMode(nextAccount.role);
    setAuthForm({ name: nextAccount.name, email: nextAccount.email });
    window.localStorage.setItem(SESSION_STORAGE_KEY, nextAccount.id);
    setFormErrors([]);
  };

  const logout = () => {
    setAccount(null);
    setProgram(null);
    setFormErrors([]);
    setHighestStepReached(1);
    setStep(1);
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  };

  const exportBackup = () => {
    if (!account) {
      setFormErrors(["Register or log in before exporting a backup."]);
      setBackupMessage("Log in first, then export a backup.");
      return;
    }
    const backup = {
      app: "Black Bear Performance",
      version: 1,
      exportedAt: new Date().toISOString(),
      account,
      athletes: savedAthletes,
      programs: savedPrograms,
      logs: trainingLogs,
      teams,
      memberships: coachMemberships,
      testHistory: visibleTestHistory.filter((entry) => entry.ownerId === account.id),
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bbp-backup-${account.email.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setBackupMessage("Backup downloaded. Keep this JSON file if you are testing on another browser or computer.");
  };

  const importBackup = async (file: File | null) => {
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text()) as {
        account?: UserAccount;
        athletes?: SavedAthleteProfile[];
        programs?: SavedProgramRecord[];
        logs?: TrainingLogEntry[];
        teams?: TeamRecord[];
        memberships?: TeamMembership[];
        testHistory?: TestHistoryEntry[];
      };
      if (!payload.account?.id || !payload.account.email) {
        setFormErrors(["Backup file is missing account data."]);
        setBackupMessage("Import failed: this is not a valid BBP backup.");
        return;
      }

      const importedAccount = payload.account;
      const nextAccounts = [importedAccount, ...accounts.filter((item) => item.id !== importedAccount.id)];
      const importedAthletes = (payload.athletes || []).map((athlete) => ({ ...athlete, ownerId: importedAccount.id }));
      const importedPrograms = (payload.programs || []).map((record) => ({ ...record, ownerId: importedAccount.id }));
      const importedLogs = (payload.logs || []).map((log) => ({ ...log, ownerId: importedAccount.id }));
      const importedTeams = (payload.teams || []).map((team) => ({ ...team, ownerId: importedAccount.id }));
      const importedMemberships = (payload.memberships || []).map((membership) => ({ ...membership, coachId: importedAccount.id }));
      const importedTestHistory = (payload.testHistory || []).map((entry) => ({ ...entry, ownerId: importedAccount.id }));

      const nextAthletes = [...importedAthletes, ...allSavedAthletes.filter((athlete) => athlete.ownerId !== importedAccount.id)];
      const nextPrograms = [...importedPrograms, ...allSavedPrograms.filter((record) => record.ownerId !== importedAccount.id)];
      const nextLogs = [...importedLogs, ...allTrainingLogs.filter((log) => log.ownerId !== importedAccount.id)];
      const nextTeams = [...importedTeams, ...allTeams.filter((team) => team.ownerId !== importedAccount.id)];
      const nextMemberships = [...importedMemberships, ...allMemberships.filter((membership) => membership.coachId !== importedAccount.id)];
      const nextTestHistory = [...importedTestHistory, ...allTestHistory.filter((entry) => entry.ownerId !== importedAccount.id)];

      saveAccounts(nextAccounts);
      setAccount(importedAccount);
      setUserMode(importedAccount.role);
      setAuthForm({ name: importedAccount.name, email: importedAccount.email });
      setAllSavedAthletes(nextAthletes);
      setAllSavedPrograms(nextPrograms);
      setAllTrainingLogs(nextLogs);
      setAllTeams(nextTeams);
      setAllMemberships(nextMemberships);
      setAllTestHistory(nextTestHistory);
      window.localStorage.setItem(SESSION_STORAGE_KEY, importedAccount.id);
      window.localStorage.setItem(ATHLETE_STORAGE_KEY, JSON.stringify(nextAthletes));
      window.localStorage.setItem(PROGRAM_STORAGE_KEY, JSON.stringify(nextPrograms));
      window.localStorage.setItem(TRAINING_LOG_STORAGE_KEY, JSON.stringify(nextLogs));
      window.localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(nextTeams));
      window.localStorage.setItem(MEMBERSHIP_STORAGE_KEY, JSON.stringify(nextMemberships));
      window.localStorage.setItem(TEST_HISTORY_STORAGE_KEY, JSON.stringify(nextTestHistory));
      setBackupMessage(`Backup imported: ${importedAthletes.length} athletes, ${importedPrograms.length} programs, ${importedLogs.length} logs, ${importedTeams.length} teams.`);
      setFormErrors([]);
    } catch {
      setFormErrors(["Could not import backup. Check that the file is a valid BBP backup JSON."]);
      setBackupMessage("Import failed. Choose a BBP backup JSON file.");
    }
  };

  const updateCombatLoad = (field: keyof CombatLoad, value: string | number) => {
    setCombatLoad((current) => ({ ...current, [field]: Number(value) || 0 }));
  };

  const updateAthleteProfile = (patch: Partial<AthleteProfile>) => {
    setAthleteProfile((current) => ({ ...current, ...patch }));
  };

  const updateProgramSettings = (patch: Partial<ProgramSettings>) => {
    setProgramSettings((current) => ({ ...current, ...patch }));
  };

  const toggleListValue = (field: "equipment" | "painAreas", value: string) => {
    setAthleteProfile((current) => {
      const existing = current[field];
      return {
        ...current,
        [field]: existing.includes(value) ? existing.filter((item) => item !== value) : [...existing, value],
      };
    });
  };

  const handleGenerate = () => {
    const errors = validateStep(5);
    setFormErrors(errors);
    if (errors.length) return;
    if (!account) {
      setFormErrors(["Register or log in before generating a saved program."]);
      return;
    }
    const result = generateProgram({
      combatProfile,
      combatLoad,
      athleteProfile,
      programSettings,
      assessment,
    });
    setProgram(result);
    saveProgramRecord(result);
    moveToStep(6);
  };

  const validateStep = (targetStep: number) => {
    const errors: string[] = [];
    if (targetStep === 1 && !account) {
      errors.push("Register or log in first so athletes and logs are saved to your account.");
    }
    if (targetStep === 2) {
      const totalCombatSessions = combatLoad.strikingSessions + combatLoad.grapplingSessions + combatLoad.technicalSessions;
      if (totalCombatSessions < 1) errors.push("Add at least one weekly combat session.");
      if (combatLoad.hardSparringDays > combatLoad.strikingSessions) errors.push("Hard sparring days cannot exceed striking sessions.");
      if (combatLoad.hardGrapplingDays > combatLoad.grapplingSessions) errors.push("Hard wrestling days cannot exceed grappling sessions.");
    }
    if (targetStep === 3) {
      if (!athleteProfile.name.trim()) errors.push("Athlete name is required before saving/generating.");
      if (!athleteProfile.age || Number(athleteProfile.age) < 12 || Number(athleteProfile.age) > 70) errors.push("Age must be between 12 and 70.");
      if (!athleteProfile.weightKg || Number(athleteProfile.weightKg) < 30 || Number(athleteProfile.weightKg) > 180) errors.push("Weight must be realistic in kg.");
      if (!athleteProfile.heightCm || Number(athleteProfile.heightCm) < 120 || Number(athleteProfile.heightCm) > 230) errors.push("Height must be realistic in cm.");
    }
    if (targetStep === 5) {
      for (const key of ["sleep", "stress", "soreness", "motivation"] as const) {
        const value = Number(assessment[key]);
        if (value < 1 || value > 5) errors.push(`${key} must be from 1 to 5.`);
      }
    }
    return errors;
  };

  const persistAthletes = (nextAthletes: SavedAthleteProfile[]) => {
    if (!account) return;
    const otherAccounts = allSavedAthletes.filter((athlete) => athlete.ownerId !== account.id);
    const merged = [...nextAthletes, ...otherAccounts];
    setAllSavedAthletes(merged);
    window.localStorage.setItem(ATHLETE_STORAGE_KEY, JSON.stringify(merged));
  };

  const persistPrograms = (nextPrograms: SavedProgramRecord[]) => {
    if (!account) return;
    const otherAccounts = allSavedPrograms.filter((record) => record.ownerId !== account.id);
    const merged = [...nextPrograms, ...otherAccounts];
    setAllSavedPrograms(merged);
    window.localStorage.setItem(PROGRAM_STORAGE_KEY, JSON.stringify(merged));
  };

  const saveProgramRecord = (generatedProgram: GeneratedProgram) => {
    if (!account) return;
    const athleteId = getAthleteId(account.id, athleteProfile.name);
    const record: SavedProgramRecord = {
      id: createId("program"),
      ownerId: account.id,
      athleteId,
      athleteName: athleteProfile.name.trim() || "Athlete",
      savedAt: new Date().toISOString(),
      combatProfile,
      combatLoad,
      athleteProfile,
      programSettings,
      assessment,
      program: generatedProgram,
    };
    persistPrograms([record, ...savedPrograms].slice(0, 100));
  };

  const saveAthleteProfile = () => {
    if (!account) {
      setFormErrors(["Register or log in before saving athletes."]);
      return;
    }
    const errors = validateStep(3);
    setFormErrors(errors);
    if (errors.length) return;
    const savedId = getAthleteId(account.id, athleteProfile.name);
    const saved: SavedAthleteProfile = {
      id: savedId,
      ownerId: account.id,
      savedAt: new Date().toISOString(),
      combatProfile,
      athleteProfile,
    };
    const nextAthletes = [saved, ...savedAthletes.filter((athlete) => athlete.id !== savedId)].slice(0, 20);
    persistAthletes(nextAthletes);
  };

  const loadAthleteProfile = (saved: SavedAthleteProfile) => {
    setCombatProfile(saved.combatProfile);
    setAthleteProfile(saved.athleteProfile);
    setFormErrors([]);
  };

  const loadProgramRecord = (record: SavedProgramRecord) => {
    setCombatProfile(record.combatProfile);
    setCombatLoad(record.combatLoad);
    setAthleteProfile(record.athleteProfile);
    setProgramSettings(record.programSettings);
    setAssessment(record.assessment);
    setProgram(record.program);
    setFormErrors([]);
    moveToStep(6);
  };

  const deleteProgramRecord = (id: string) => {
    persistPrograms(savedPrograms.filter((record) => record.id !== id));
  };

  const deleteAthleteProfile = (id: string) => {
    persistAthletes(savedAthletes.filter((athlete) => athlete.id !== id));
  };

  const persistTrainingLogs = (nextLogs: TrainingLogEntry[]) => {
    if (!account) return;
    const otherAccounts = allTrainingLogs.filter((log) => log.ownerId !== account.id);
    const merged = [...nextLogs, ...otherAccounts];
    setAllTrainingLogs(merged);
    window.localStorage.setItem(TRAINING_LOG_STORAGE_KEY, JSON.stringify(merged));
  };

  const saveTrainingLog = () => {
    if (!account) {
      setFormErrors(["Register or log in before saving training logs."]);
      return;
    }
    if (!athleteProfile.name.trim()) {
      setFormErrors(["Load or create an athlete before saving a training log."]);
      return;
    }
    const readiness = Number(logDraft.readiness);
    if (readiness < 1 || readiness > 5) {
      setFormErrors(["Log readiness must be from 1 to 5."]);
      return;
    }

    const entry: TrainingLogEntry = {
      id: createId("log"),
      ownerId: account.id,
      athleteId: getAthleteId(account.id, athleteProfile.name),
      athleteName: athleteProfile.name.trim(),
      date: logDraft.date || new Date().toISOString().slice(0, 10),
      week: Number(logDraft.week) || 1,
      day: logDraft.day || "Day 1",
      status: logDraft.status,
      readiness,
      notes: logDraft.notes.trim(),
      sessionRpe: Number(logDraft.sessionRpe) || undefined,
      bodyWeightKg: logDraft.bodyWeightKg === "" ? "" : Number(logDraft.bodyWeightKg),
      painNote: logDraft.painNote.trim(),
      createdAt: new Date().toISOString(),
    };

    persistTrainingLogs([entry, ...trainingLogs].slice(0, 200));
    setLogDraft((current) => ({ ...current, notes: "", painNote: "" }));
    setFormErrors([]);
  };

  const persistTeams = (nextTeams: TeamRecord[]) => {
    const otherAccounts = account ? allTeams.filter((team) => team.ownerId !== account.id) : allTeams;
    const merged = account ? [...nextTeams, ...otherAccounts] : nextTeams;
    setAllTeams(merged);
    window.localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(merged));
  };

  const persistMemberships = (nextMemberships: TeamMembership[]) => {
    setAllMemberships(nextMemberships);
    window.localStorage.setItem(MEMBERSHIP_STORAGE_KEY, JSON.stringify(nextMemberships));
  };

  const persistTestHistory = (nextEntries: TestHistoryEntry[]) => {
    const otherAccounts = account ? allTestHistory.filter((entry) => entry.ownerId !== account.id) : allTestHistory;
    const merged = account ? [...nextEntries, ...otherAccounts] : nextEntries;
    setAllTestHistory(merged);
    window.localStorage.setItem(TEST_HISTORY_STORAGE_KEY, JSON.stringify(merged));
  };

  const createTeam = () => {
    if (!account) {
      setFormErrors(["Register or log in before creating a team."]);
      return;
    }
    const name = teamDraft.name.trim() || `${account.name} Team`;
    const team: TeamRecord = {
      id: createId("team"),
      ownerId: account.id,
      name,
      joinCode: createJoinCode(name),
      createdAt: new Date().toISOString(),
    };
    persistTeams([team, ...teams].slice(0, 20));
    setTeamDraft((current) => ({ ...current, name: "", joinCode: team.joinCode }));
    setFormErrors([]);
  };

  const joinTeam = () => {
    if (!account) {
      setFormErrors(["Register or log in before joining a team."]);
      return;
    }
    const code = teamDraft.joinCode.trim().toUpperCase();
    const team = allTeams.find((item) => item.joinCode.toUpperCase() === code);
    if (!team) {
      setFormErrors(["Team code was not found on this device or backup."]);
      return;
    }
    if (team.ownerId === account.id) {
      setFormErrors(["You own this team already."]);
      return;
    }
    const existing = allMemberships.find((membership) => membership.teamId === team.id && membership.athleteAccountId === account.id);
    if (existing) {
      setFormErrors(["You are already connected to this team."]);
      return;
    }
    const membership: TeamMembership = {
      id: createId("member"),
      teamId: team.id,
      coachId: team.ownerId,
      athleteAccountId: account.id,
      athleteName: athleteProfile.name.trim() || account.name,
      athleteEmail: account.email,
      athleteProfileId: athleteProfile.name.trim() ? getAthleteId(account.id, athleteProfile.name) : undefined,
      joinedAt: new Date().toISOString(),
    };
    persistMemberships([membership, ...allMemberships]);
    setTeamDraft((current) => ({ ...current, joinCode: "" }));
    setFormErrors([]);
  };

  const saveTestEntry = () => {
    if (!account) {
      setFormErrors(["Register or log in before saving test history."]);
      return;
    }
    if (!athleteProfile.name.trim()) {
      setFormErrors(["Load or create an athlete before saving test history."]);
      return;
    }
    const entry: TestHistoryEntry = {
      id: createId("test"),
      ownerId: account.id,
      athleteId: getAthleteId(account.id, athleteProfile.name),
      athleteName: athleteProfile.name.trim(),
      date: testDraft.date || new Date().toISOString().slice(0, 10),
      microcycle: testDraft.microcycle.trim() || "Checkpoint",
      squatOrTrapBar: assessment.squatOrTrapBar,
      benchOrPushups: assessment.benchOrPushups,
      pullups: assessment.pullups,
      verticalJump: assessment.verticalJump,
      broadJump: assessment.broadJump,
      medBallThrow: assessment.medBallThrow,
      sprint10m: assessment.sprint10m,
      mas: assessment.mas,
      notes: testDraft.notes.trim(),
      createdAt: new Date().toISOString(),
    };
    persistTestHistory([entry, ...allTestHistory.filter((item) => item.ownerId === account.id)].slice(0, 200));
    setTestDraft((current) => ({ ...current, notes: "" }));
    setFormErrors([]);
  };

  const loadTestEntry = (entry: TestHistoryEntry) => {
    setAthleteProfile((current) => ({ ...current, name: entry.athleteName || current.name }));
    setAssessment((current) => ({
      ...current,
      squatOrTrapBar: entry.squatOrTrapBar ?? "",
      benchOrPushups: entry.benchOrPushups ?? "",
      pullups: entry.pullups ?? "",
      verticalJump: entry.verticalJump ?? "",
      broadJump: entry.broadJump ?? "",
      medBallThrow: entry.medBallThrow ?? "",
      sprint10m: entry.sprint10m ?? "",
      mas: entry.mas ?? "",
    }));
    setTestDraft({ date: entry.date, microcycle: entry.microcycle, notes: entry.notes || "" });
    setFormErrors([]);
    moveToStep(5);
  };

  const askGemini = async () => {
    if (!account) {
      setAiError("Register or log in before using Gemini.");
      return;
    }
    if (!aiDraft.trim()) {
      setAiError("Enter a question for Gemini.");
      return;
    }
    setAiLoading(true);
    setAiError("");
    setAiResponse("");
    try {
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-BBP-Account-Id": account.id,
        },
        body: JSON.stringify({
          accountId: account.id,
          prompt: buildGeminiPrompt({
            question: aiDraft,
            userMode,
            combatProfile,
            athleteProfile,
            programSettings,
            assessment,
            program,
          }),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Gemini request failed.");
      setAiResponse(payload.text || "Gemini returned an empty response.");
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Gemini request failed.");
    } finally {
      setAiLoading(false);
    }
  };

  const makeSyncSnapshot = (sourceAccount = account): SyncSnapshot | null => {
    if (!sourceAccount) return null;
    return {
      account: sourceAccount,
      athletes: allSavedAthletes.filter((athlete) => athlete.ownerId === sourceAccount.id),
      programs: allSavedPrograms.filter((record) => record.ownerId === sourceAccount.id),
      logs: allTrainingLogs.filter((log) => log.ownerId === sourceAccount.id),
      teams: allTeams.filter((team) => team.ownerId === sourceAccount.id),
      memberships: allMemberships.filter((membership) => membership.coachId === sourceAccount.id || membership.athleteAccountId === sourceAccount.id),
      testHistory: allTestHistory.filter((entry) => entry.ownerId === sourceAccount.id),
    };
  };

  const applyRemoteSnapshot = (snapshot: SyncSnapshot) => {
    const currentAccount = accounts.find((item) => item.id === snapshot.account.id || item.email === snapshot.account.email) || account;
    const mergedAccount = { ...snapshot.account, syncToken: currentAccount?.syncToken || snapshot.account.syncToken || createId("sync") };
    const nextAccounts = [mergedAccount, ...accounts.filter((item) => item.id !== mergedAccount.id && item.email !== mergedAccount.email)];
    const nextAthletes = [...snapshot.athletes, ...allSavedAthletes.filter((athlete) => athlete.ownerId !== mergedAccount.id)];
    const nextPrograms = [...snapshot.programs, ...allSavedPrograms.filter((record) => record.ownerId !== mergedAccount.id)];
    const nextLogs = [...snapshot.logs, ...allTrainingLogs.filter((log) => log.ownerId !== mergedAccount.id)];
    const nextTeams = [...(snapshot.teams || []), ...allTeams.filter((team) => team.ownerId !== mergedAccount.id)];
    const nextMemberships = [...(snapshot.memberships || []), ...allMemberships.filter((membership) => membership.coachId !== mergedAccount.id && membership.athleteAccountId !== mergedAccount.id)];
    const nextTestHistory = [...(snapshot.testHistory || []), ...allTestHistory.filter((entry) => entry.ownerId !== mergedAccount.id)];

    setAccounts(nextAccounts);
    setAccount(mergedAccount);
    setUserMode(mergedAccount.role);
    setAuthForm({ name: mergedAccount.name, email: mergedAccount.email });
    setAllSavedAthletes(nextAthletes);
    setAllSavedPrograms(nextPrograms);
    setAllTrainingLogs(nextLogs);
    setAllTeams(nextTeams);
    setAllMemberships(nextMemberships);
    setAllTestHistory(nextTestHistory);

    window.localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(nextAccounts));
    window.localStorage.setItem(SESSION_STORAGE_KEY, mergedAccount.id);
    window.localStorage.setItem(ATHLETE_STORAGE_KEY, JSON.stringify(nextAthletes));
    window.localStorage.setItem(PROGRAM_STORAGE_KEY, JSON.stringify(nextPrograms));
    window.localStorage.setItem(TRAINING_LOG_STORAGE_KEY, JSON.stringify(nextLogs));
    window.localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(nextTeams));
    window.localStorage.setItem(MEMBERSHIP_STORAGE_KEY, JSON.stringify(nextMemberships));
    window.localStorage.setItem(TEST_HISTORY_STORAGE_KEY, JSON.stringify(nextTestHistory));
  };

  const syncNow = async () => {
    if (!remoteSyncEnabled) {
      setSyncStatus("local");
      return;
    }
    const snapshot = makeSyncSnapshot();
    if (!snapshot) return;
    setSyncStatus("syncing");
    try {
      await pushRemoteSnapshot(snapshot);
      setSyncStatus("synced");
    } catch {
      setSyncStatus("offline");
    }
  };

  useEffect(() => {
    if (!dataLoaded || !account) return;
    if (!remoteSyncEnabled) {
      setSyncStatus("local");
      return;
    }

    let cancelled = false;
    setSyncStatus("syncing");
    fetchRemoteSnapshot(account)
      .then(async (snapshot) => {
        if (cancelled) return;
        if (snapshot) {
          applyRemoteSnapshot(snapshot);
          setSyncStatus("synced");
          return;
        }
        const localSnapshot = makeSyncSnapshot(account);
        if (localSnapshot) await pushRemoteSnapshot(localSnapshot);
        if (!cancelled) setSyncStatus("synced");
      })
      .catch(() => {
        if (!cancelled) setSyncStatus("offline");
      });

    return () => {
      cancelled = true;
    };
  }, [dataLoaded, account?.id]);

  useEffect(() => {
    if (!dataLoaded || !account || !remoteSyncEnabled) return;
    const timeout = window.setTimeout(() => {
      const snapshot = makeSyncSnapshot();
      if (!snapshot) return;
      setSyncStatus("syncing");
      pushRemoteSnapshot(snapshot)
        .then(() => setSyncStatus("synced"))
        .catch(() => setSyncStatus("offline"));
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [dataLoaded, account?.id, allSavedAthletes, allSavedPrograms, allTrainingLogs, allTeams, allMemberships, allTestHistory]);

  return (
    <div className="min-h-screen bg-black px-4 py-5 text-zinc-300 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-6">
        <header className="grid gap-4 border-b border-zinc-900 pb-4 lg:grid-cols-[280px_1fr] lg:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center bg-white text-black">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-black uppercase leading-none tracking-tight text-white">Black Bear</h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">Performance S&C</p>
            </div>
          </div>
          <nav className="grid grid-cols-4 gap-1 md:grid-cols-7">
            {steps.map((item, index) => {
              const Icon = item.icon;
              const active = step === index + 1;
              const targetStep = index + 1;
              const completed = highestStepReached > targetStep;
              const enabled = canUseStep(targetStep);
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => goToStep(targetStep)}
                  disabled={!enabled}
                  aria-disabled={!enabled}
                  className={`flex min-h-10 items-center justify-center gap-2 border px-2 text-[10px] font-bold uppercase tracking-[0.14em] transition ${
                    active
                      ? "border-white bg-white text-black"
                      : completed
                        ? "border-zinc-700 bg-zinc-950 text-zinc-300"
                        : enabled
                          ? "border-zinc-900 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                          : "cursor-not-allowed border-zinc-950 text-zinc-700 opacity-50"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden xl:inline">{item.name}</span>
                </button>
              );
            })}
          </nav>
        </header>

        <main className="min-h-[620px]">
          <ErrorList errors={formErrors} />
          <CurrentSummary
            account={account}
            languageMode={languageMode}
            userMode={userMode}
            combatProfile={combatProfile}
            athleteProfile={athleteProfile}
            programSettings={programSettings}
          />

          {step === 1 && (
            <ScreenShell eyebrow="Step 1" title="Start: account, role, language." description="Set who is creating the plan, then continue to the fighter profile. Saved athletes and logs stay attached to this account.">
              <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
                <Card className="grid gap-5">
                  <SegmentedControl
                    label="Language mode"
                    value={languageMode}
                    onChange={(value) => setLanguageMode(value as LanguageMode)}
                    options={[
                      { label: "UA", value: "ua" },
                      { label: "EN", value: "en" },
                      { label: "UA + EN", value: "ua_en" },
                    ]}
                  />
                  <SegmentedControl
                    label="User mode"
                    value={userMode}
                    disabled={Boolean(account)}
                    onChange={(value) => setUserMode(value as UserMode)}
                    options={[
                      { label: "Athlete", value: "athlete" },
                      { label: "Coach", value: "coach" },
                      { label: "Admin", value: "admin" },
                    ]}
                  />
                  <p className="text-xs leading-5 text-zinc-500">
                    Athlete mode is for one fighter. Coach mode keeps teams and logs. Admin mode is a local MVP overview for accounts, programs, and system checks.
                  </p>
                  <AccountPanel
                    account={account}
                    authForm={authForm}
                    setAuthForm={setAuthForm}
                    onSubmit={handleAuth}
                    onLogout={logout}
                    syncStatus={syncStatus}
                    onSyncNow={syncNow}
                    authActionLabel={accounts.some((item) => item.email === authForm.email.trim().toLowerCase()) ? "Login" : "Register"}
                  />
                  <DataBackupPanel
                    account={account}
                    athletesCount={savedAthletes.length}
                    programsCount={savedPrograms.length}
                    logsCount={trainingLogs.length}
                    onExport={exportBackup}
                    onImport={importBackup}
                    message={backupMessage}
                  />
                  {userMode === "admin" ? (
                    <AdminPanel
                      accounts={accounts}
                      athletesCount={allSavedAthletes.length}
                      programsCount={allSavedPrograms.length}
                      logsCount={allTrainingLogs.length}
                      teamsCount={allTeams.length}
                    />
                  ) : (
                    <TeamPortalPanel
                      account={account}
                      userMode={userMode}
                      teams={teams}
                      allTeams={allTeams}
                      memberships={coachMemberships}
                      athleteMemberships={athleteMemberships}
                      logs={allTrainingLogs}
                      testHistory={visibleTestHistory}
                      draft={teamDraft}
                      setDraft={setTeamDraft}
                      onCreateTeam={createTeam}
                      onJoinTeam={joinTeam}
                      onLoadTestEntry={loadTestEntry}
                    />
                  )}
                  <Button onClick={nextStep} className="mt-2 w-full md:w-fit">
                    Continue to Combat Profile <ChevronRight className="h-4 w-4" />
                  </Button>
                </Card>
                <StartWorkbenchCard
                  account={account}
                  athletesCount={savedAthletes.length}
                  programs={savedPrograms}
                  logs={trainingLogs}
                  onOpenProgram={loadProgramRecord}
                />
              </div>
            </ScreenShell>
          )}

          {step === 2 && (
            <ScreenShell eyebrow="Step 2" title="Classify the fighter first." description="The program starts from combat profile, then sport details and weekly combat stress.">
              <div className="grid gap-5">
                <Card className="grid gap-4">
                  <SegmentedControl
                    label="Sport"
                    value={athleteProfile.sport}
                    onChange={(value) => updateAthleteProfile({ sport: value })}
                    options={SPORTS.map((sport) => ({ label: sport, value: sport }))}
                  />
                  <div className="grid gap-3 md:grid-cols-3">
                    {(Object.keys(PROFILE_COPY) as CombatProfile[]).map((profile) => {
                      const active = combatProfile === profile;
                      return (
                        <button
                          key={profile}
                          type="button"
                          aria-label={`Select combat profile: ${PROFILE_COPY[profile].title}`}
                          onClick={() => setCombatProfile(profile)}
                          className={`grid gap-3 border p-4 text-left transition ${
                            active ? "border-white bg-white text-black" : "border-zinc-800 bg-black text-zinc-400 hover:border-zinc-500"
                          }`}
                        >
                          <h3 className="text-sm font-black uppercase tracking-[0.14em]">{PROFILE_COPY[profile].title}</h3>
                          <p className={`text-sm leading-5 ${active ? "text-zinc-700" : "text-zinc-500"}`}>{PROFILE_COPY[profile].summary}</p>
                          <div className="flex flex-wrap gap-1">
                            {PROFILE_COPY[profile].emphasis.map((tag) => (
                              <span key={tag} className={`border px-2 py-1 text-[10px] font-bold uppercase ${active ? "border-zinc-300" : "border-zinc-800"}`}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </Card>
                <Card className="grid gap-4">
                  <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-white">Weekly combat load</h3>
                  <div className="grid gap-4 md:grid-cols-5">
                    <Input label="Striking" type="number" value={combatLoad.strikingSessions} onChange={(value) => updateCombatLoad("strikingSessions", value)} min={0} />
                    <Input label="Grappling" type="number" value={combatLoad.grapplingSessions} onChange={(value) => updateCombatLoad("grapplingSessions", value)} min={0} />
                    <Input label="Hard sparring" type="number" value={combatLoad.hardSparringDays} onChange={(value) => updateCombatLoad("hardSparringDays", value)} min={0} />
                    <Input label="Hard wrestling" type="number" value={combatLoad.hardGrapplingDays} onChange={(value) => updateCombatLoad("hardGrapplingDays", value)} min={0} />
                    <Input label="Technical" type="number" value={combatLoad.technicalSessions} onChange={(value) => updateCombatLoad("technicalSessions", value)} min={0} />
                  </div>
                  <p className="border-l-2 border-zinc-700 pl-3 text-sm leading-6 text-zinc-400">
                    {profileSummary.title}: {profileSummary.summary}
                  </p>
                </Card>
                <NavigationButtons prev={prevStep} next={nextStep} />
              </div>
            </ScreenShell>
          )}

          {step === 3 && (
            <ScreenShell eyebrow="Step 3" title="Build the athlete profile." description="Only collect what changes training decisions: level, equipment, and pain flags.">
              <div className="grid gap-5">
                <Card className="grid gap-4 md:grid-cols-4">
                  <Input label="Name" value={athleteProfile.name} onChange={(value) => updateAthleteProfile({ name: String(value) })} placeholder="Athlete name" />
                  <Input label="Age" type="number" value={athleteProfile.age} onChange={(value) => updateAthleteProfile({ age: value as number | "" })} min={0} />
                  <Input label="Height cm" type="number" value={athleteProfile.heightCm} onChange={(value) => updateAthleteProfile({ heightCm: value as number | "" })} min={0} />
                  <Input label="Weight kg" type="number" value={athleteProfile.weightKg} onChange={(value) => updateAthleteProfile({ weightKg: value as number | "" })} min={0} />
                  <SegmentedControl
                    label="Sex"
                    value={athleteProfile.sex}
                    onChange={(value) => updateAthleteProfile({ sex: value })}
                    options={[
                      { label: "Male", value: "Male" },
                      { label: "Female", value: "Female" },
                    ]}
                  />
                  <SegmentedControl
                    label="Level"
                    value={athleteProfile.level}
                    onChange={(value) => updateAthleteProfile({ level: value })}
                    options={[
                      { label: "Beginner", value: "Beginner" },
                      { label: "Amateur", value: "Amateur" },
                      { label: "Advanced", value: "Advanced Amateur" },
                      { label: "Pro", value: "Professional" },
                    ]}
                  />
                  <SegmentedControl
                    label="Strength training age"
                    value={athleteProfile.strengthTrainingAge}
                    onChange={(value) => updateAthleteProfile({ strengthTrainingAge: value })}
                    options={[
                      { label: "0-3 mo", value: "0-3 months" },
                      { label: "3-12 mo", value: "3-12 months" },
                      { label: "1-3 yr", value: "1-3 years" },
                      { label: "3+ yr", value: "3+ years" },
                    ]}
                  />
                </Card>
                <SavedAthletesPanel athletes={savedAthletes} onLoad={loadAthleteProfile} onDelete={deleteAthleteProfile} />
                <SavedProgramsPanel programs={savedPrograms} onLoad={loadProgramRecord} onDelete={deleteProgramRecord} />
                <Checklist title="Equipment" items={EQUIPMENT} selected={athleteProfile.equipment} onToggle={(value) => toggleListValue("equipment", value)} />
                <Checklist title="Pain / risk flags" items={PAIN_AREAS} selected={athleteProfile.painAreas} onToggle={(value) => toggleListValue("painAreas", value)} />
                <Card className="border-zinc-800 bg-zinc-950 text-sm leading-6 text-zinc-400">
                  This tool does not diagnose injuries. Acute pain, neurological symptoms, concussion signs, chest pain, or severe dizziness require qualified medical assessment.
                </Card>
                <div className="flex flex-wrap justify-between gap-3">
                  <Button variant="outline" onClick={saveAthleteProfile}>
                    Save athlete profile
                  </Button>
                  <NavigationButtons prev={prevStep} next={nextStep} />
                </div>
              </div>
            </ScreenShell>
          )}

          {step === 4 && (
            <ScreenShell eyebrow="Step 4" title="Set the training block." description="The first MVP supports 4, 8, and 12 week outputs. Every fourth week is checkpoint/deload.">
              <div className="grid gap-5">
                <Card className="grid gap-5">
                  <SegmentedControl
                    label="Program length"
                    value={String(programSettings.lengthWeeks)}
                    onChange={(value) => updateProgramSettings({ lengthWeeks: Number(value) as ProgramSettings["lengthWeeks"] })}
                    options={[
                      { label: "4 Weeks", value: "4" },
                      { label: "8 Weeks", value: "8" },
                      { label: "12 Weeks", value: "12" },
                    ]}
                  />
                  <SegmentedControl
                    label="S&C days per week"
                    value={String(programSettings.scDaysPerWeek)}
                    onChange={(value) => updateProgramSettings({ scDaysPerWeek: Number(value) as ProgramSettings["scDaysPerWeek"] })}
                    options={[
                      { label: "2 Days", value: "2" },
                      { label: "3 Days", value: "3" },
                      { label: "4 Days", value: "4" },
                    ]}
                  />
                  <div className="grid gap-4 md:grid-cols-3">
                    <SegmentedControl
                      label="Session duration"
                      value={programSettings.sessionDuration}
                      onChange={(value) => updateProgramSettings({ sessionDuration: value })}
                      options={[
                        { label: "45", value: "45 min" },
                        { label: "60", value: "60 min" },
                        { label: "75", value: "75 min" },
                        { label: "90", value: "90 min" },
                      ]}
                    />
                    <Input label="Competition date" type="date" value={programSettings.competitionDate || ""} onChange={(value) => updateProgramSettings({ competitionDate: String(value) })} />
                    <Input label="Main goal" value={programSettings.mainGoal} onChange={(value) => updateProgramSettings({ mainGoal: String(value) })} />
                  </div>
                  <SegmentedControl
                    label="Current phase"
                    value={programSettings.phase}
                    onChange={(value) => updateProgramSettings({ phase: value })}
                    options={[
                      { label: "Off-season", value: "Off-season" },
                      { label: "Pre-camp", value: "Pre-camp" },
                      { label: "Fight camp", value: "Fight camp" },
                      { label: "In-season", value: "In-season" },
                      { label: "Return", value: "Return to training" },
                    ]}
                  />
                </Card>
                <NavigationButtons prev={prevStep} next={nextStep} />
              </div>
            </ScreenShell>
          )}

          {step === 5 && (
            <ScreenShell eyebrow="Step 5" title="Enter assessment numbers." description="These inputs are enough for the first rule-based engine and sheet output preview.">
              <div className="grid gap-5">
                <Card>
                  <AssessmentInputs assessment={assessment} setAssessment={setAssessment} />
                </Card>
                <PriorityPanel scores={priorityScores} languageMode={languageMode} />
                <TestHistoryPanel
                  account={account}
                  athleteName={athleteProfile.name}
                  entries={visibleTestHistory.filter((entry) => entry.athleteName === athleteProfile.name)}
                  draft={testDraft}
                  setDraft={setTestDraft}
                  onSave={saveTestEntry}
                />
                <div className="flex flex-wrap justify-between gap-3">
                  <Button variant="secondary" onClick={prevStep}>
                    <ChevronLeft className="h-4 w-4" /> Back
                  </Button>
                  <Button onClick={handleGenerate} className="px-8">
                    Generate Program
                  </Button>
                </div>
              </div>
            </ScreenShell>
          )}

          {step === 6 && program && (
            <ScreenShell eyebrow="Step 6" title="Review the generated program." description={program.summary}>
              <div className="grid gap-5">
                <ProgramDashboard program={program} languageMode={languageMode} />
                <GeminiPanel
                  account={account}
                  draft={aiDraft}
                  response={aiResponse}
                  error={aiError}
                  loading={aiLoading}
                  setDraft={setAiDraft}
                  onAsk={askGemini}
                />
                <div className="flex flex-wrap justify-between gap-3 border-t border-zinc-900 pt-5">
                  <Button variant="secondary" onClick={prevStep}>
                    Back to assessment
                  </Button>
                  <Button onClick={nextStep}>
                    Preview Google Sheets <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </ScreenShell>
          )}

          {step === 7 && program && (
            <ScreenShell eyebrow="Step 7" title="Google Sheets output preview." description="This is the structure the athlete or coach should receive as the final training document.">
              <div className="grid gap-5">
                <SheetPreview
                  program={program}
                  languageMode={languageMode}
                  athleteProfile={athleteProfile}
                  combatProfile={combatProfile}
                  combatLoad={combatLoad}
                  programSettings={programSettings}
                  assessment={assessment}
                  priorityScores={priorityScores}
                />
                <TrainingLogPanel
                  account={account}
                  athleteName={athleteProfile.name}
                  logs={trainingLogs.filter((log) => log.athleteId === (account ? getAthleteId(account.id, athleteProfile.name) : ""))}
                  draft={logDraft}
                  setDraft={setLogDraft}
                  onSave={saveTrainingLog}
                />
                <div className="flex justify-center">
                  <Button variant="secondary" onClick={resetDemo}>
                    Reset demo
                  </Button>
                </div>
              </div>
            </ScreenShell>
          )}
        </main>

        <footer className="border-t border-zinc-900 py-4 text-center text-[10px] uppercase tracking-[0.18em] text-zinc-600">
          <p>2026 Black Bear Performance. Built for fighters, coaches, and real training decisions.</p>
        </footer>
      </div>
    </div>
  );
}

function AccountPanel({
  account,
  authForm,
  setAuthForm,
  onSubmit,
  onLogout,
  syncStatus,
  onSyncNow,
  authActionLabel,
}: {
  account: UserAccount | null;
  authForm: { name: string; email: string };
  setAuthForm: React.Dispatch<React.SetStateAction<{ name: string; email: string }>>;
  onSubmit: () => void;
  onLogout: () => void;
  syncStatus: SyncStatus;
  onSyncNow: () => void;
  authActionLabel: string;
}) {
  const syncCopy: Record<SyncStatus, string> = {
    local: "Local browser storage",
    syncing: "Syncing",
    synced: "Cloud synced",
    offline: "Offline fallback",
    error: "Sync issue",
  };
  const syncTone =
    syncStatus === "synced"
      ? "border-emerald-700 text-emerald-300"
      : syncStatus === "offline" || syncStatus === "error"
        ? "border-amber-700 text-amber-300"
        : "border-zinc-700 text-zinc-300";

  if (account) {
    return (
      <div className="grid gap-3 border border-zinc-800 bg-black p-4 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">Signed in</p>
          <p className="mt-1 font-bold text-white">{account.name}</p>
          <p className="text-xs text-zinc-500">
            {account.email} / {account.role}
          </p>
          <span className={`mt-2 inline-flex w-fit border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${syncTone}`}>
            Data: {syncCopy[syncStatus]}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {remoteSyncEnabled && (
            <Button variant="secondary" onClick={onSyncNow} disabled={syncStatus === "syncing"}>
              Sync now
            </Button>
          )}
          <Button variant="outline" onClick={onLogout}>
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 border border-zinc-800 bg-black p-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">Account</p>
        <p className="mt-1 text-sm leading-5 text-zinc-400">Register or log in so athletes and logs stay attached to you.</p>
        <span className={`mt-2 inline-flex w-fit border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${syncTone}`}>
          Data: {syncCopy[syncStatus]}
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Input label="Name" value={authForm.name} onChange={(value) => setAuthForm((current) => ({ ...current, name: String(value) }))} placeholder="Coach / athlete name" />
        <Input label="Email" type="email" value={authForm.email} onChange={(value) => setAuthForm((current) => ({ ...current, email: String(value) }))} placeholder="email@example.com" />
      </div>
      <Button onClick={onSubmit} className="w-full md:w-fit">
        <UserPlus className="h-4 w-4" /> {authActionLabel}
      </Button>
    </div>
  );
}

function DataBackupPanel({
  account,
  athletesCount,
  programsCount,
  logsCount,
  onExport,
  onImport,
  message,
}: {
  account: UserAccount | null;
  athletesCount: number;
  programsCount: number;
  logsCount: number;
  onExport: () => void;
  onImport: (file: File | null) => void;
  message: string;
}) {
  return (
    <div className="grid gap-3 border border-zinc-800 bg-black p-4">
      <div className="grid gap-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">Local data backup</p>
        <p className="text-sm leading-5 text-zinc-400">
          {account
            ? `${athletesCount} athletes / ${programsCount} programs / ${logsCount} logs saved for this account.`
            : "Import a backup to restore an account, or log in to start a new local database."}
        </p>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <Button variant="secondary" onClick={onExport} disabled={!account}>
          <Download className="h-4 w-4" /> Export backup
        </Button>
        <label className="inline-flex items-center justify-center gap-2 bg-zinc-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700">
          <Upload className="h-4 w-4" /> Import backup
          <input
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              void onImport(event.target.files?.[0] || null);
              event.currentTarget.value = "";
            }}
          />
        </label>
      </div>
      {message && <p className="border border-zinc-800 bg-zinc-950 p-2 text-xs leading-5 text-zinc-400">{message}</p>}
    </div>
  );
}

function StartWorkbenchCard({
  account,
  athletesCount,
  programs,
  logs,
  onOpenProgram,
}: {
  account: UserAccount | null;
  athletesCount: number;
  programs: SavedProgramRecord[];
  logs: TrainingLogEntry[];
  onOpenProgram: (program: SavedProgramRecord) => void;
}) {
  const recentPrograms = programs.slice(0, 3);
  const recentLogs = logs.slice(0, 3);

  return (
    <Card className="grid content-start gap-4">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-white">{account ? "Workbench" : "Final output"}</h3>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          {account
            ? "Continue from saved athletes, reopen generated plans, or start a new assessment block."
            : "OTA-style Google Sheets structure with Black Bear combat-sport logic."}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <StatBox label="Athletes" value={String(athletesCount)} />
        <StatBox label="Programs" value={String(programs.length)} />
        <StatBox label="Logs" value={String(logs.length)} />
      </div>
      <div className="grid gap-2 text-sm leading-5 text-zinc-500">
        <p>{programs.length ? "Open the latest plan directly, or go to Athlete step for the full database." : "Create or load an athlete, then generate the first block."}</p>
        <p>Outputs: 4, 8, or 12 weeks with notes, zones, checkpoints, readiness, CSV and Excel export.</p>
      </div>
      {recentPrograms.length > 0 && (
        <div className="grid gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">Recent programs</p>
          {recentPrograms.map((record) => (
            <div key={record.id} className="grid gap-2 border border-zinc-800 bg-black p-3">
              <div>
                <p className="font-bold text-white">{record.athleteName}</p>
                <p className="text-xs text-zinc-500">
                  {record.programSettings.lengthWeeks} weeks / {record.programSettings.scDaysPerWeek} days / {record.programSettings.phase}
                </p>
              </div>
              <Button variant="secondary" onClick={() => onOpenProgram(record)}>
                Open latest plan
              </Button>
            </div>
          ))}
        </div>
      )}
      {recentLogs.length > 0 && (
        <div className="grid gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">Recent logs</p>
          {recentLogs.map((log) => (
            <div key={log.id} className="border border-zinc-800 bg-black p-3 text-xs leading-5 text-zinc-400">
              <p className="font-semibold text-white">
                {log.athleteName} / {log.date}
              </p>
              <p>
                Week {log.week}, {log.day}, readiness {log.readiness}/5, {log.status}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-zinc-800 bg-black p-3">
      <p className="text-xl font-black text-white">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-600">{label}</p>
    </div>
  );
}

function AdminPanel({
  accounts,
  athletesCount,
  programsCount,
  logsCount,
  teamsCount,
}: {
  accounts: UserAccount[];
  athletesCount: number;
  programsCount: number;
  logsCount: number;
  teamsCount: number;
}) {
  return (
    <Card className="grid gap-4">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-white">Admin overview</h3>
        <p className="mt-1 text-xs leading-5 text-zinc-500">Local MVP control view for accounts, saved data, and system checks.</p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-center md:grid-cols-5">
        <StatBox label="Accounts" value={String(accounts.length)} />
        <StatBox label="Athletes" value={String(athletesCount)} />
        <StatBox label="Programs" value={String(programsCount)} />
        <StatBox label="Logs" value={String(logsCount)} />
        <StatBox label="Teams" value={String(teamsCount)} />
      </div>
      <div className="grid gap-2 text-xs text-zinc-400">
        {accounts.slice(0, 6).map((item) => (
          <div key={item.id} className="grid gap-1 border border-zinc-900 bg-black p-3 md:grid-cols-[1fr_auto]">
            <span className="font-semibold text-white">{item.name}</span>
            <span>
              {item.email} / {item.role}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function TeamPortalPanel({
  account,
  userMode,
  teams,
  allTeams,
  memberships,
  athleteMemberships,
  logs,
  testHistory,
  draft,
  setDraft,
  onCreateTeam,
  onJoinTeam,
  onLoadTestEntry,
}: {
  account: UserAccount | null;
  userMode: UserMode;
  teams: TeamRecord[];
  allTeams: TeamRecord[];
  memberships: TeamMembership[];
  athleteMemberships: TeamMembership[];
  logs: TrainingLogEntry[];
  testHistory: TestHistoryEntry[];
  draft: { name: string; joinCode: string };
  setDraft: React.Dispatch<React.SetStateAction<{ name: string; joinCode: string }>>;
  onCreateTeam: () => void;
  onJoinTeam: () => void;
  onLoadTestEntry: (entry: TestHistoryEntry) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const todayLogs = logs.filter((log) => log.date === today);
  const latestTestFor = (membership: TeamMembership) =>
    testHistory.find((entry) => entry.ownerId === membership.athleteAccountId || entry.athleteName === membership.athleteName);

  return (
    <Card className="grid gap-4">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-white">Team portal</h3>
        <p className="mt-1 text-xs leading-5 text-zinc-500">
          {userMode === "coach"
            ? "Create a team, share the join code, then watch athlete diary entries and checkpoint tests."
            : "Join your coach team and fill the plan diary from training instead of paper."}
        </p>
      </div>

      {userMode === "coach" ? (
        <div className="grid gap-3">
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <Input label="Team name" value={draft.name} onChange={(value) => setDraft((current) => ({ ...current, name: String(value) }))} />
            <Button onClick={onCreateTeam} disabled={!account}>
              Create team
            </Button>
          </div>
          {teams.length > 0 && (
            <div className="grid gap-2">
              {teams.map((team) => {
                const teamMembers = memberships.filter((membership) => membership.teamId === team.id);
                return (
                  <div key={team.id} className="grid gap-3 border border-zinc-800 bg-black p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-bold text-white">{team.name}</p>
                        <p className="text-xs text-zinc-500">Join code: {team.joinCode}</p>
                      </div>
                      <span className="border border-zinc-800 px-2 py-1 text-xs text-zinc-400">{teamMembers.length} athletes</span>
                    </div>
                    {teamMembers.length > 0 && (
                      <div className="grid gap-2">
                        {teamMembers.map((membership) => {
                          const log = todayLogs.find((item) => item.ownerId === membership.athleteAccountId || item.athleteName === membership.athleteName);
                          const latestTest = latestTestFor(membership);
                          return (
                            <div key={membership.id} className="grid gap-2 border border-zinc-900 bg-zinc-950 p-3 text-xs md:grid-cols-[1fr_1.4fr_auto] md:items-center">
                              <div>
                                <p className="font-semibold text-white">{membership.athleteName}</p>
                                <p className="text-zinc-500">{membership.athleteEmail}</p>
                              </div>
                              <div className="text-zinc-400">
                                <p>Today: {log ? `${log.status}, readiness ${log.readiness}/5${log.sessionRpe ? `, RPE ${log.sessionRpe}/10` : ""}` : "no diary yet"}</p>
                                <p>
                                  Last test:{" "}
                                  {latestTest
                                    ? `${latestTest.date}, ${latestTest.microcycle}, jump ${latestTest.verticalJump || "-"}`
                                    : "no checkpoint yet"}
                                </p>
                              </div>
                              <Button variant="secondary" onClick={() => latestTest && onLoadTestEntry(latestTest)} disabled={!latestTest}>
                                Use test numbers
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <Input label="Coach join code" value={draft.joinCode} onChange={(value) => setDraft((current) => ({ ...current, joinCode: String(value).toUpperCase() }))} placeholder="TEAM-1234" />
            <Button onClick={onJoinTeam} disabled={!account}>
              Join team
            </Button>
          </div>
          {athleteMemberships.length > 0 && (
            <div className="grid gap-2 text-xs text-zinc-400">
              {athleteMemberships.map((membership) => {
                const team = allTeams.find((item) => item.id === membership.teamId);
                return (
                  <div key={membership.id} className="border border-zinc-800 bg-black p-3">
                    Connected to {team?.name || "Coach team"} as <span className="font-semibold text-white">{membership.athleteName}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function GeminiPanel({
  account,
  draft,
  response,
  error,
  loading,
  setDraft,
  onAsk,
}: {
  account: UserAccount | null;
  draft: string;
  response: string;
  error: string;
  loading: boolean;
  setDraft: React.Dispatch<React.SetStateAction<string>>;
  onAsk: () => void;
}) {
  return (
    <Card className="grid gap-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center border border-zinc-800 bg-black text-white">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-white">Gemini coach check</h3>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Backend-only AI helper. The structured OTA-style sheet remains the source of truth.
          </p>
        </div>
      </div>
      <label className="grid gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">Question</span>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={1200}
          placeholder="Ask for coach notes, risk flags, or a plain-language athlete explanation."
          className="min-h-24 border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-zinc-400"
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onAsk} disabled={!account || loading}>
          {loading ? "Asking..." : "Ask Gemini"} <Send className="h-4 w-4" />
        </Button>
        <p className="text-xs text-zinc-600">{account ? "Uses server GEMINI_API_KEY with rate limit." : "Log in to use AI."}</p>
      </div>
      {error && <p className="border border-red-900 bg-red-950/40 p-3 text-sm text-red-200">{error}</p>}
      {response && <div className="whitespace-pre-wrap border border-zinc-800 bg-black p-4 text-sm leading-6 text-zinc-200">{response}</div>}
    </Card>
  );
}

function TestHistoryPanel({
  account,
  athleteName,
  entries,
  draft,
  setDraft,
  onSave,
}: {
  account: UserAccount | null;
  athleteName: string;
  entries: TestHistoryEntry[];
  draft: { date: string; microcycle: string; notes: string };
  setDraft: React.Dispatch<React.SetStateAction<{ date: string; microcycle: string; notes: string }>>;
  onSave: () => void;
}) {
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const latest = sorted[0];
  const previous = sorted[1];
  const broadJumpDelta = latest && previous && latest.broadJump && previous.broadJump ? Number(latest.broadJump) - Number(previous.broadJump) : null;

  return (
    <Card className="grid gap-4">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-white">Microcycle test history</h3>
        <p className="mt-1 text-xs leading-5 text-zinc-500">
          Save checkpoint numbers after a microcycle. The coach can track progress without rewriting the athlete profile.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-[160px_1fr_1fr_auto]">
        <Input label="Date" type="date" value={draft.date} onChange={(value) => setDraft((current) => ({ ...current, date: String(value) }))} />
        <Input label="Microcycle" value={draft.microcycle} onChange={(value) => setDraft((current) => ({ ...current, microcycle: String(value) }))} />
        <Input label="Notes" value={draft.notes} onChange={(value) => setDraft((current) => ({ ...current, notes: String(value) }))} placeholder="Fresh / tired / after sparring" />
        <Button onClick={onSave} disabled={!account || !athleteName.trim()}>
          Save test
        </Button>
      </div>
      {latest && (
        <div className="grid gap-2 border border-zinc-800 bg-black p-3 text-xs text-zinc-400 md:grid-cols-4">
          <p>
            Latest: <span className="font-semibold text-white">{latest.date}</span>
          </p>
          <p>Pullups: {latest.pullups || "-"}</p>
          <p>Broad jump: {latest.broadJump || "-"} {broadJumpDelta !== null ? `(${broadJumpDelta >= 0 ? "+" : ""}${broadJumpDelta})` : ""}</p>
          <p>MAS: {latest.mas || "-"}</p>
        </div>
      )}
      {sorted.length > 0 && (
        <div className="grid gap-2">
          {sorted.slice(0, 5).map((entry) => (
            <div key={entry.id} className="grid gap-1 border border-zinc-900 bg-black p-3 text-xs md:grid-cols-[130px_1fr_1fr]">
              <p className="font-semibold text-white">{entry.date}</p>
              <p className="text-zinc-400">
                {entry.microcycle}: SQ/TB {entry.squatOrTrapBar || "-"}, push {entry.benchOrPushups || "-"}, pullups {entry.pullups || "-"}
              </p>
              <p className="text-zinc-500">{entry.notes || "No notes"}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function TrainingLogPanel({
  account,
  athleteName,
  logs,
  draft,
  setDraft,
  onSave,
}: {
  account: UserAccount | null;
  athleteName: string;
  logs: TrainingLogEntry[];
  draft: { date: string; week: string; day: string; status: TrainingLogStatus; readiness: string; sessionRpe: string; bodyWeightKg: string; painNote: string; notes: string };
  setDraft: React.Dispatch<React.SetStateAction<{ date: string; week: string; day: string; status: TrainingLogStatus; readiness: string; sessionRpe: string; bodyWeightKg: string; painNote: string; notes: string }>>;
  onSave: () => void;
}) {
  return (
    <Card className="grid gap-4">
      <div className="grid gap-1">
        <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-white">Training log</h3>
        <p className="text-sm leading-6 text-zinc-500">
          {account ? `Logs are saved for ${athleteName || "current athlete"} under ${account.name}.` : "Log in to save training history."}
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-5">
        <Input label="Date" type="date" value={draft.date} onChange={(value) => setDraft((current) => ({ ...current, date: String(value) }))} />
        <Input label="Week" type="number" value={draft.week} min={1} max={12} onChange={(value) => setDraft((current) => ({ ...current, week: String(value) }))} />
        <Input label="Day" value={draft.day} onChange={(value) => setDraft((current) => ({ ...current, day: String(value) }))} />
        <Input label="Readiness" type="number" value={draft.readiness} min={1} max={5} onChange={(value) => setDraft((current) => ({ ...current, readiness: String(value) }))} />
        <SegmentedControl
          label="Status"
          value={draft.status}
          onChange={(value) => setDraft((current) => ({ ...current, status: value as TrainingLogStatus }))}
          options={[
            { label: "Done", value: "done" },
            { label: "Modified", value: "modified" },
            { label: "Skipped", value: "skipped" },
            { label: "Planned", value: "planned" },
          ]}
        />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Input label="Session RPE" type="number" value={draft.sessionRpe} min={1} max={10} onChange={(value) => setDraft((current) => ({ ...current, sessionRpe: String(value) }))} />
        <Input label="Body weight kg" type="number" value={draft.bodyWeightKg} min={30} max={180} onChange={(value) => setDraft((current) => ({ ...current, bodyWeightKg: String(value) }))} />
        <Input label="Pain / restriction" value={draft.painNote} onChange={(value) => setDraft((current) => ({ ...current, painNote: String(value) }))} placeholder="Shoulder tight / knee OK / none" />
      </div>
      <label className="grid gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">Training diary</span>
        <textarea
          value={draft.notes}
          onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
          placeholder="What was done, what changed, how athlete felt, what coach should adjust"
          className="min-h-24 border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-zinc-400"
        />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button onClick={onSave} disabled={!account || !athleteName.trim()}>
          Save log
        </Button>
        <p className="text-xs text-zinc-600">{logs.length} saved logs for this athlete</p>
      </div>
      {logs.length > 0 && (
        <div className="grid gap-2">
          {logs.slice(0, 5).map((log) => (
            <div key={log.id} className="grid gap-1 border border-zinc-800 bg-black p-3 text-sm md:grid-cols-[120px_1fr_auto] md:items-center">
              <p className="font-semibold text-white">{log.date}</p>
              <p className="text-zinc-400">
                Week {log.week} / {log.day} / readiness {log.readiness}/5
                {log.sessionRpe ? ` / RPE ${log.sessionRpe}/10` : ""}
                {log.bodyWeightKg ? ` / BW ${log.bodyWeightKg}kg` : ""}
                {log.painNote ? ` / pain: ${log.painNote}` : ""}
                {log.notes ? ` - ${log.notes}` : ""}
              </p>
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">{log.status}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function ErrorList({ errors }: { errors: string[] }) {
  if (!errors.length) return null;

  return (
    <div className="mb-5 border border-red-900 bg-red-950/40 p-4">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-red-200">Check the input</p>
      <ul className="mt-2 grid gap-1 text-sm text-red-100">
        {errors.map((error) => (
          <li key={error}>- {error}</li>
        ))}
      </ul>
    </div>
  );
}

function CurrentSummary({
  account,
  languageMode,
  userMode,
  combatProfile,
  athleteProfile,
  programSettings,
}: {
  account: UserAccount | null;
  languageMode: LanguageMode;
  userMode: UserMode;
  combatProfile: CombatProfile;
  athleteProfile: AthleteProfile;
  programSettings: ProgramSettings;
}) {
  return (
    <div className="mb-5 grid gap-2 border border-zinc-900 bg-zinc-950/60 p-3 text-xs md:grid-cols-6">
      <SummaryItem label="Account" value={account ? account.name : "Not signed in"} />
      <SummaryItem label="Mode" value={`${userMode} / ${languageMode.toUpperCase().replace("_", "+")}`} />
      <SummaryItem label="Fighter" value={athleteProfile.name || "Not set"} />
      <SummaryItem label="Profile" value={PROFILE_COPY[combatProfile].title} />
      <SummaryItem label="Sport" value={athleteProfile.sport} />
      <SummaryItem label="Output" value={`${programSettings.lengthWeeks} wk / ${programSettings.scDaysPerWeek} days`} />
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-600">{label}</p>
      <p className="mt-1 truncate font-semibold text-zinc-200">{value}</p>
    </div>
  );
}

function PriorityPanel({
  scores,
  languageMode,
}: {
  scores: ReturnType<typeof scorePriorities>;
  languageMode: LanguageMode;
}) {
  return (
    <Card className="grid gap-3">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-white">Priority score</h3>
        <p className="mt-1 text-xs leading-5 text-zinc-500">Top items the current cycle should respect. This is guidance, not a medical diagnosis.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        {scores.map((score) => (
          <div key={score.id} className="border border-zinc-800 bg-black p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-white">{score.label}</p>
              <span className="bg-white px-2 py-1 text-xs font-black text-black">{score.score}/5</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-zinc-500">
              {languageMode !== "en" && score.reasonUa}
              {languageMode === "ua_en" ? " / " : ""}
              {languageMode !== "ua" && score.reasonEn}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SavedAthletesPanel({
  athletes,
  onLoad,
  onDelete,
}: {
  athletes: SavedAthleteProfile[];
  onLoad: (athlete: SavedAthleteProfile) => void;
  onDelete: (id: string) => void;
}) {
  if (!athletes.length) {
    return (
      <Card className="grid gap-2">
        <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-white">Saved athletes</h3>
        <p className="text-sm text-zinc-500">No saved athlete profiles yet. Save stable data once: combat profile, sport, age, sex, equipment, and injury flags.</p>
      </Card>
    );
  }

  return (
    <Card className="grid gap-3">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-white">Saved athletes</h3>
        <p className="mt-1 text-xs text-zinc-500">Stable profile data is saved locally. Assessment and readiness stay editable for each training cycle.</p>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {athletes.map((saved) => (
          <div key={saved.id} className="grid gap-3 border border-zinc-800 bg-black p-3 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="font-bold text-white">{saved.athleteProfile.name}</p>
              <p className="text-xs text-zinc-500">
                {PROFILE_COPY[saved.combatProfile].title} / {saved.athleteProfile.sport} / {saved.athleteProfile.age || "-"} y / {saved.athleteProfile.sex}
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                Risks: {saved.athleteProfile.painAreas.length ? saved.athleteProfile.painAreas.join(", ") : "none"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => onLoad(saved)}>
                Load
              </Button>
              <Button variant="outline" onClick={() => onDelete(saved.id)}>
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SavedProgramsPanel({
  programs,
  onLoad,
  onDelete,
}: {
  programs: SavedProgramRecord[];
  onLoad: (program: SavedProgramRecord) => void;
  onDelete: (id: string) => void;
}) {
  if (!programs.length) {
    return (
      <Card className="grid gap-2">
        <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-white">Program history</h3>
        <p className="text-sm text-zinc-500">Generated programs will be saved here, so a coach can reopen the last plan instead of rebuilding it.</p>
      </Card>
    );
  }

  return (
    <Card className="grid gap-3">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-white">Program history</h3>
        <p className="mt-1 text-xs text-zinc-500">Open a previous plan with its original tests, settings, and generated weeks.</p>
      </div>
      <div className="grid gap-2">
        {programs.slice(0, 8).map((record) => (
          <div key={record.id} className="grid gap-3 border border-zinc-800 bg-black p-3 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="font-bold text-white">{record.athleteName}</p>
              <p className="text-xs text-zinc-500">
                {PROFILE_COPY[record.combatProfile].title} / {record.programSettings.lengthWeeks} weeks / {record.programSettings.scDaysPerWeek} days /{" "}
                {new Date(record.savedAt).toLocaleDateString()}
              </p>
              <p className="mt-1 text-xs text-zinc-600">{record.programSettings.mainGoal}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => onLoad(record)}>
                Open
              </Button>
              <Button variant="outline" onClick={() => onDelete(record.id)}>
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ScreenShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-5">
      <div className="grid gap-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-600">{eyebrow}</p>
        <h2 className="max-w-4xl text-2xl font-black tracking-tight text-white md:text-3xl">{title}</h2>
        <p className="max-w-3xl text-sm leading-6 text-zinc-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

function NavigationButtons({ prev, next }: { prev: () => void; next: () => void }) {
  return (
    <div className="flex flex-wrap justify-between gap-3">
      <Button variant="secondary" onClick={prev}>
        <ChevronLeft className="h-4 w-4" /> Back
      </Button>
      <Button onClick={next}>
        Next Step <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function Checklist({
  title,
  items,
  selected,
  onToggle,
}: {
  title: string;
  items: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <Card className="grid gap-3">
      <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-white">{title}</h3>
      <div className="grid gap-2 md:grid-cols-4">
        {items.map((item) => {
          const active = selected.includes(item);
          return (
            <button
              key={item}
              type="button"
              onClick={() => onToggle(item)}
              className={`border px-3 py-2 text-left text-xs font-semibold transition ${
                active ? "border-white bg-white text-black" : "border-zinc-800 bg-black text-zinc-500 hover:border-zinc-600 hover:text-zinc-200"
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function buildGeminiPrompt({
  question,
  userMode,
  combatProfile,
  athleteProfile,
  programSettings,
  assessment,
  program,
}: {
  question: string;
  userMode: UserMode;
  combatProfile: CombatProfile;
  athleteProfile: AthleteProfile;
  programSettings: ProgramSettings;
  assessment: Assessment;
  program: GeneratedProgram | null;
}) {
  const firstDay = program?.weeks[0]?.days[0];
  const firstDayExercises = firstDay
    ? [...firstDay.warmup, ...firstDay.powerSpeed, ...firstDay.strength, ...firstDay.accessory, ...firstDay.conditioning, ...firstDay.mobilityPrehab]
    : [];
  const firstDayText = firstDay
    ? `${firstDay.day}: ${firstDay.sessionGoal}. Blocks: ${firstDayExercises.map((exercise) => `${exercise.name} ${exercise.sets || ""}x${exercise.reps || ""}`).join("; ")}`
    : "No generated day yet.";

  return [
    "Context: Black Bear Performance MVP for combat-sport strength and conditioning.",
    `Role: ${userMode}. Fighter: ${athleteProfile.name || "Unnamed"}, ${athleteProfile.sport}, ${combatProfile}, level ${athleteProfile.level}.`,
    `Program: ${programSettings.lengthWeeks} weeks, ${programSettings.scDaysPerWeek} S&C days/week, phase ${programSettings.phase}, goal ${programSettings.mainGoal}, competition ${programSettings.competitionDate || "not set"}.`,
    `Assessment: SQ/TB ${assessment.squatOrTrapBar || "-"}, push ${assessment.benchOrPushups || "-"}, pullups ${assessment.pullups || "-"}, VJ ${assessment.verticalJump || "-"}, broad ${assessment.broadJump || "-"}, MAS ${assessment.mas || "-"}, readiness sleep/stress/soreness/motivation ${assessment.sleep}/${assessment.stress}/${assessment.soreness}/${assessment.motivation}.`,
    `Plan summary: ${program?.summary || "Program has not been generated yet."}`,
    `First day: ${firstDayText.slice(0, 900)}`,
    "Answer in concise Ukrainian with English exercise names if useful. Mention that final loading decisions belong to the coach.",
    `Question: ${question}`,
  ].join("\n");
}

function getAthleteId(ownerId: string, name: string) {
  const slug =
    name
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/(^-|-$)/g, "") || createId("athlete");
  return `${ownerId}-${slug}`;
}

function createId(prefix: string) {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${random}`;
}

function createJoinCode(seed: string) {
  const base = seed
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 4) || "TEAM";
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}-${suffix}`;
}
