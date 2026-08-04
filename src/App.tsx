import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock3,
  Download,
  FileSpreadsheet,
  Info,
  Layout,
  LoaderCircle,
  LogOut,
  Send,
  Shield,
  Sparkles,
  Target,
  Upload,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import {
  Assessment,
  AthleteProfile,
  CombatDiscipline,
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
import {
  AccountRole,
  AuthAccount,
  AuthClientError,
  getCurrentAccount,
  joinRemoteTeam,
  loginAccount,
  logoutAccount,
  registerAccount,
} from "./lib/authClient";
import { AssessmentInputs } from "./components/forms/AssessmentInputs";
import { ProgramDashboard } from "./components/program/ProgramDashboard";
import { SheetPreview } from "./components/sheets/SheetPreview";
import { Button, Card, Input, SegmentedControl } from "./components/ui/Base";
import { WelcomeFlow, type WelcomeFlowData } from "./components/onboarding/WelcomeFlow";

const SPORTS: AthleteProfile["sport"][] = ["Kyokushin Karate", "MMA"];
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

function isSupportedSport(value: string): value is CombatDiscipline {
  return SPORTS.includes(value as CombatDiscipline);
}

type AuthMode = "login" | "register";
type StoredAccount = UserAccount & { serverRole?: AccountRole };
type AuthRequest = {
  name: string;
  email: string;
  password: string;
  mode: AuthMode;
  role: "athlete" | "coach";
};

function toStoredAccount(account: AuthAccount): StoredAccount {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role === "methodology_editor" ? "admin" : account.role,
    serverRole: account.role,
    createdAt: account.createdAt,
  };
}

function accountMetadata(account: StoredAccount): StoredAccount {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role,
    ...(account.serverRole ? { serverRole: account.serverRole } : {}),
    createdAt: account.createdAt,
  };
}

const PROFILE_COPY: Record<CombatProfile, { title: string; summary: string; emphasis: string[] }> = {
  grappler: {
    title: "Борець",
    summary: "MMA з акцентом на боротьбу, клінч, контроль суперника й роботу в партері.",
    emphasis: ["Задня ланка", "Хват і шия", "Перенесення й ізометрія", "Повторні зусилля"],
  },
  striker: {
    title: "Ударник",
    summary: "Кіокушинкай карате або MMA з акцентом на ударну техніку, стійку й роботу ніг.",
    emphasis: ["Вибухова сила", "Ротаційні кидки", "Робота ніг", "Аеробна база"],
  },
  hybrid: {
    title: "Ударник + борець",
    summary: "MMA зі змішаним навантаженням: ударна робота, боротьба, клінч і переходи.",
    emphasis: ["Збалансований обсяг", "Передавання зусилля", "Бойова витривалість", "Відновлення"],
  },
};

export default function App() {
  const [step, setStep] = useState(1);
  const [highestStepReached, setHighestStepReached] = useState(1);
  const [userMode, setUserMode] = useState<UserMode>("coach");
  const [languageMode, setLanguageMode] = useState<LanguageMode>("ua");
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
  const [account, setAccount] = useState<StoredAccount | null>(null);
  const [accounts, setAccounts] = useState<StoredAccount[]>([]);
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [sessionRestoring, setSessionRestoring] = useState(remoteSyncEnabled);
  const [joinLoading, setJoinLoading] = useState(false);
  const [allSavedAthletes, setAllSavedAthletes] = useState<SavedAthleteProfile[]>([]);
  const [allSavedPrograms, setAllSavedPrograms] = useState<SavedProgramRecord[]>([]);
  const [allTrainingLogs, setAllTrainingLogs] = useState<TrainingLogEntry[]>([]);
  const [allTeams, setAllTeams] = useState<TeamRecord[]>([]);
  const [allMemberships, setAllMemberships] = useState<TeamMembership[]>([]);
  const [allTestHistory, setAllTestHistory] = useState<TestHistoryEntry[]>([]);
  const [logDraft, setLogDraft] = useState({
    date: new Date().toISOString().slice(0, 10),
    week: "1",
    day: "День 1",
    status: "done" as TrainingLogStatus,
    readiness: "4",
    sessionRpe: "7",
    bodyWeightKg: "",
    painNote: "",
    notes: "",
  });
  const [teamDraft, setTeamDraft] = useState({ name: "Спортивна команда", joinCode: "" });
  const [testDraft, setTestDraft] = useState({ date: new Date().toISOString().slice(0, 10), microcycle: "Контроль наприкінці 4-го тижня", notes: "" });
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("local");
  const [backupMessage, setBackupMessage] = useState("");
  const [aiDraft, setAiDraft] = useState("Поясни головний ризик цього блоку й за чим тренеру стежити в перший тиждень.");
  const [aiResponse, setAiResponse] = useState("");
  const [aiError, setAiError] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const steps = [
    { name: "Кабінет", icon: Shield },
    { name: "Бій", icon: Target },
    { name: "Спортсмен", icon: User },
    { name: "Параметри", icon: Activity },
    { name: "Оцінювання", icon: Info },
    { name: "Програма", icon: Layout },
    { name: "Таблиця", icon: FileSpreadsheet },
  ];

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [step]);

  const profileSummary = useMemo(() => PROFILE_COPY[combatProfile], [combatProfile]);
  const availableCombatProfiles = useMemo<CombatProfile[]>(
    () => athleteProfile.sport === "Kyokushin Karate"
      ? ["striker"]
      : ["striker", "grappler", "hybrid"],
    [athleteProfile.sport],
  );
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
      const parsedAccounts: StoredAccount[] = rawAccounts ? JSON.parse(rawAccounts) : [];
      const migratedAccounts = parsedAccounts.map((item) =>
        remoteSyncEnabled ? accountMetadata(item) : { ...item, syncToken: item.syncToken || createId("sync") },
      );
      if (rawAccounts && JSON.stringify(parsedAccounts) !== JSON.stringify(migratedAccounts)) {
        window.localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(migratedAccounts));
      }
      setAccounts(migratedAccounts);

      const sessionId = remoteSyncEnabled ? null : window.localStorage.getItem(SESSION_STORAGE_KEY);
      const sessionAccount = migratedAccounts.find((item) => item.id === sessionId) ?? null;
      setAccount(sessionAccount);
      if (sessionAccount) {
        setUserMode(sessionAccount.role);
        setAuthForm({ name: sessionAccount.name, email: sessionAccount.email, password: "" });
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

  const saveAccounts = (nextAccounts: StoredAccount[]) => {
    const accountsToStore = remoteSyncEnabled ? nextAccounts.map(accountMetadata) : nextAccounts;
    setAccounts(accountsToStore);
    window.localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(accountsToStore));
  };

  const finishAuthentication = (nextAccount: StoredAccount, entryMode: AuthMode = "login") => {
    saveAccounts([nextAccount, ...accounts.filter((item) => item.id !== nextAccount.id && item.email !== nextAccount.email)]);
    setAccount(nextAccount);
    setUserMode(nextAccount.role);
    setAuthForm({ name: nextAccount.name, email: nextAccount.email, password: "" });
    if (remoteSyncEnabled) window.localStorage.removeItem(SESSION_STORAGE_KEY);
    else window.localStorage.setItem(SESSION_STORAGE_KEY, nextAccount.id);
    setAuthError("");
    setFormErrors([]);
    setStep(entryMode === "register" ? 2 : 1);
    setHighestStepReached((current) => Math.max(current, entryMode === "register" ? 2 : 1));
  };

  const handleAuth = async (request?: AuthRequest): Promise<string | null> => {
    const requestedForm = request ?? {
      ...authForm,
      mode: authMode,
      role: userMode === "coach" ? "coach" as const : "athlete" as const,
    };
    const email = requestedForm.email.trim().toLowerCase();
    const name = requestedForm.name.trim();
    const requestedMode = requestedForm.mode;
    const requestedRole = requestedForm.role;
    const errors: string[] = [];
    if (!email || !email.includes("@")) errors.push("Введіть коректну електронну адресу.");
    if (remoteSyncEnabled && (requestedForm.password.length < 10 || requestedForm.password.length > 128)) {
      errors.push("Пароль має містити від 10 до 128 символів.");
    }
    if (remoteSyncEnabled && requestedMode === "register" && !name) errors.push("Введіть ім'я, щоб створити обліковий запис.");
    if (!remoteSyncEnabled && !name && !accounts.some((item) => item.email === email)) errors.push("Введіть ім'я, щоб створити обліковий запис.");
    setFormErrors(errors);
    if (errors.length) return errors.join(" ");

    if (remoteSyncEnabled) {
      setAuthLoading(true);
      setAuthError("");
      try {
        const authenticated = requestedMode === "login"
          ? await loginAccount({ email, password: requestedForm.password })
          : await registerAccount({
              name,
              email,
              password: requestedForm.password,
              role: requestedRole,
            });
        finishAuthentication(toStoredAccount(authenticated), requestedMode);
        return null;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Не вдалося виконати вхід. Повторіть спробу.";
        setAuthError(message);
        return message;
      } finally {
        setAuthForm((current) => ({ ...current, password: "" }));
        setAuthLoading(false);
      }
    }

    const existing = accounts.find((item) => item.email === email);
    const nextAccount =
      existing ??
      ({
        id: createId("acct"),
        name,
        email,
        role: requestedRole,
        createdAt: new Date().toISOString(),
        syncToken: createId("sync"),
      } satisfies UserAccount);

    finishAuthentication(nextAccount, existing ? "login" : "register");
    return null;
  };

  const completeWelcomeFlow = async (data: WelcomeFlowData) => {
    const role = data.role ?? "athlete";
    const nextMode = data.authMode;
    setUserMode(role);
    setAuthMode(nextMode);
    setAuthForm({ name: data.displayName, email: data.email, password: data.password });
    setAthleteProfile((current) => ({ ...current, sport: data.discipline }));
    if (data.sessionsPerWeek) {
      const scDaysPerWeek = Math.min(data.sessionsPerWeek, 4) as ProgramSettings["scDaysPerWeek"];
      const mainGoalByIntent: Record<NonNullable<WelcomeFlowData["intent"]>, string> = {
        performance: "Strength & Power",
        strength: "Maximum Strength",
        movement: "Mobility & Stability",
        return: "Return to Performance",
      };
      setProgramSettings((current) => ({
        ...current,
        scDaysPerWeek,
        ...(data.intent ? { mainGoal: mainGoalByIntent[data.intent] } : {}),
      }));
    }
    const authenticationError = await handleAuth({
      name: data.displayName,
      email: data.email,
      password: data.password,
      mode: nextMode,
      role,
    });
    if (authenticationError) throw new Error(authenticationError);
  };

  const clearAuthenticatedState = () => {
    setAccount(null);
    setProgram(null);
    setFormErrors([]);
    setHighestStepReached(1);
    setStep(1);
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  };

  const logout = async () => {
    setAuthError("");
    if (remoteSyncEnabled) {
      setAuthLoading(true);
      try {
        await logoutAccount();
      } catch (error) {
        setAuthError(error instanceof Error ? error.message : "Не вдалося завершити сеанс. Повторіть спробу.");
        setAuthLoading(false);
        return;
      }
      setAuthLoading(false);
    }
    clearAuthenticatedState();
  };

  const exportBackup = () => {
    if (!account) {
      setFormErrors(["Увійдіть або зареєструйтеся перед експортом резервної копії."]);
      setBackupMessage("Спочатку увійдіть, а потім експортуйте резервну копію.");
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
    setBackupMessage("Резервну копію завантажено. Збережіть цей JSON-файл для роботи в іншому браузері або на іншому комп'ютері.");
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
        setFormErrors(["У резервній копії немає даних облікового запису."]);
        setBackupMessage("Не вдалося імпортувати: це не резервна копія Black Bear.");
        return;
      }
      if (remoteSyncEnabled && !account) {
        setFormErrors(["Увійдіть, перш ніж імпортувати дані в серверному режимі."]);
        setBackupMessage("Імпорт не виконано: потрібен активний сеанс.");
        return;
      }

      const importedAccount = remoteSyncEnabled ? account! : payload.account;
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
      setAuthForm({ name: importedAccount.name, email: importedAccount.email, password: "" });
      setAllSavedAthletes(nextAthletes);
      setAllSavedPrograms(nextPrograms);
      setAllTrainingLogs(nextLogs);
      setAllTeams(nextTeams);
      setAllMemberships(nextMemberships);
      setAllTestHistory(nextTestHistory);
      if (!remoteSyncEnabled) window.localStorage.setItem(SESSION_STORAGE_KEY, importedAccount.id);
      window.localStorage.setItem(ATHLETE_STORAGE_KEY, JSON.stringify(nextAthletes));
      window.localStorage.setItem(PROGRAM_STORAGE_KEY, JSON.stringify(nextPrograms));
      window.localStorage.setItem(TRAINING_LOG_STORAGE_KEY, JSON.stringify(nextLogs));
      window.localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(nextTeams));
      window.localStorage.setItem(MEMBERSHIP_STORAGE_KEY, JSON.stringify(nextMemberships));
      window.localStorage.setItem(TEST_HISTORY_STORAGE_KEY, JSON.stringify(nextTestHistory));
      setBackupMessage(`Імпортовано: спортсменів - ${importedAthletes.length}, програм - ${importedPrograms.length}, записів - ${importedLogs.length}, команд - ${importedTeams.length}.`);
      setFormErrors([]);
    } catch {
      setFormErrors(["Не вдалося імпортувати резервну копію. Перевірте, чи це коректний JSON-файл Black Bear."]);
      setBackupMessage("Імпорт не виконано. Виберіть JSON-файл резервної копії Black Bear.");
    }
  };

  const updateCombatLoad = (field: keyof CombatLoad, value: string | number) => {
    setCombatLoad((current) => ({ ...current, [field]: Number(value) || 0 }));
  };

  const updateAthleteProfile = (patch: Partial<AthleteProfile>) => {
    setAthleteProfile((current) => ({ ...current, ...patch }));
  };

  const updateSport = (value: string) => {
    if (!isSupportedSport(value)) return;
    updateAthleteProfile({ sport: value });
    if (value === "Kyokushin Karate") setCombatProfile("striker");
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
      setFormErrors(["Увійдіть або зареєструйтеся, щоб створити й зберегти програму."]);
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
      errors.push("Спочатку увійдіть або зареєструйтеся, щоб зберігати спортсменів і журнал.");
    }
    if (targetStep === 2) {
      const totalCombatSessions = combatLoad.strikingSessions + combatLoad.grapplingSessions + combatLoad.technicalSessions;
      if (totalCombatSessions < 1) errors.push("Додайте щонайменше одне бойове тренування на тиждень.");
      if (combatLoad.hardSparringDays > combatLoad.strikingSessions) errors.push("Важких спарингів не може бути більше, ніж ударних тренувань.");
      if (combatLoad.hardGrapplingDays > combatLoad.grapplingSessions) errors.push("Важких борцівських днів не може бути більше, ніж тренувань з боротьби.");
    }
    if (targetStep === 3) {
      if (!athleteProfile.name.trim()) errors.push("Перед збереженням або створенням програми вкажіть ім'я спортсмена.");
      if (!athleteProfile.age || Number(athleteProfile.age) < 12 || Number(athleteProfile.age) > 70) errors.push("Вік має бути від 12 до 70 років.");
      if (!athleteProfile.weightKg || Number(athleteProfile.weightKg) < 30 || Number(athleteProfile.weightKg) > 180) errors.push("Вкажіть коректну вагу в кілограмах.");
      if (!athleteProfile.heightCm || Number(athleteProfile.heightCm) < 120 || Number(athleteProfile.heightCm) > 230) errors.push("Вкажіть коректний зріст у сантиметрах.");
    }
    if (targetStep === 5) {
      for (const key of ["sleep", "stress", "soreness", "motivation"] as const) {
        const value = Number(assessment[key]);
        if (value < 1 || value > 5) errors.push(`${readinessLabel(key)}: значення має бути від 1 до 5.`);
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
      athleteName: athleteProfile.name.trim() || "Спортсмен",
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
      setFormErrors(["Увійдіть або зареєструйтеся, щоб зберігати спортсменів."]);
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
      setFormErrors(["Увійдіть або зареєструйтеся, щоб зберігати журнал тренувань."]);
      return;
    }
    if (!athleteProfile.name.trim()) {
      setFormErrors(["Завантажте або створіть профіль спортсмена перед записом у журнал."]);
      return;
    }
    const readiness = Number(logDraft.readiness);
    if (readiness < 1 || readiness > 5) {
      setFormErrors(["Готовність у журналі має бути від 1 до 5."]);
      return;
    }

    const entry: TrainingLogEntry = {
      id: createId("log"),
      ownerId: account.id,
      athleteId: getAthleteId(account.id, athleteProfile.name),
      athleteName: athleteProfile.name.trim(),
      date: logDraft.date || new Date().toISOString().slice(0, 10),
      week: Number(logDraft.week) || 1,
      day: logDraft.day || "День 1",
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
      setFormErrors(["Увійдіть або зареєструйтеся, щоб створити команду."]);
      return;
    }
    const name = teamDraft.name.trim() || `Команда ${account.name}`;
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

  const joinTeam = async () => {
    if (!account) {
      setFormErrors(["Увійдіть або зареєструйтеся, щоб приєднатися до команди."]);
      return;
    }
    const code = teamDraft.joinCode.trim().toUpperCase();
    if (!code) {
      setFormErrors(["Введіть код команди."]);
      return;
    }
    if (remoteSyncEnabled) {
      setJoinLoading(true);
      setFormErrors([]);
      try {
        const athleteName = athleteProfile.name.trim() || account.name;
        const athleteProfileId = athleteProfile.name.trim() ? getAthleteId(account.id, athleteProfile.name) : undefined;
        const result = await joinRemoteTeam({ joinCode: code, athleteName, athleteProfileId });
        const membership: TeamMembership = {
          ...result.membership,
          athleteEmail: result.membership.athleteEmail || account.email,
          athleteProfileId: result.membership.athleteProfileId || athleteProfileId,
        };
        const team: TeamRecord = {
          ...result.team,
          joinCode: "",
        };
        const nextTeams = [team, ...allTeams.filter((item) => item.id !== team.id)];
        const nextMemberships = [
          membership,
          ...allMemberships.filter(
            (item) => item.id !== membership.id && !(item.teamId === membership.teamId && item.athleteAccountId === membership.athleteAccountId),
          ),
        ];
        setAllTeams(nextTeams);
        setAllMemberships(nextMemberships);
        window.localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(nextTeams));
        window.localStorage.setItem(MEMBERSHIP_STORAGE_KEY, JSON.stringify(nextMemberships));
        setTeamDraft((current) => ({ ...current, joinCode: "" }));
      } catch (error) {
        setFormErrors([error instanceof Error ? error.message : "Не вдалося приєднатися до команди."]);
      } finally {
        setJoinLoading(false);
      }
      return;
    }
    const team = allTeams.find((item) => item.joinCode.toUpperCase() === code);
    if (!team) {
      setFormErrors(["Код команди не знайдено на цьому пристрої або в резервній копії."]);
      return;
    }
    if (team.ownerId === account.id) {
      setFormErrors(["Ви вже є власником цієї команди."]);
      return;
    }
    const existing = allMemberships.find((membership) => membership.teamId === team.id && membership.athleteAccountId === account.id);
    if (existing) {
      setFormErrors(["Ви вже приєднані до цієї команди."]);
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
      setFormErrors(["Увійдіть або зареєструйтеся, щоб зберігати історію тестів."]);
      return;
    }
    if (!athleteProfile.name.trim()) {
      setFormErrors(["Завантажте або створіть профіль спортсмена перед збереженням тесту."]);
      return;
    }
    const entry: TestHistoryEntry = {
      id: createId("test"),
      ownerId: account.id,
      athleteId: getAthleteId(account.id, athleteProfile.name),
      athleteName: athleteProfile.name.trim(),
      date: testDraft.date || new Date().toISOString().slice(0, 10),
      microcycle: testDraft.microcycle.trim() || "Контрольний тест",
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
      setAiError("Увійдіть або зареєструйтеся, щоб користуватися Gemini.");
      return;
    }
    if (!aiDraft.trim()) {
      setAiError("Введіть запитання для Gemini.");
      return;
    }
    setAiLoading(true);
    setAiError("");
    setAiResponse("");
    try {
      const response = await fetch("/api/gemini", {
        method: "POST",
        credentials: remoteSyncEnabled ? "include" : "same-origin",
        headers: {
          "Content-Type": "application/json",
          ...(remoteSyncEnabled ? {} : { "X-BBP-Account-Id": account.id }),
        },
        body: JSON.stringify({
          ...(remoteSyncEnabled ? {} : { accountId: account.id }),
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
      const contentType = response.headers.get("content-type") || "";
      const payload = contentType.includes("application/json") ? await response.json() : null;
      if (!response.ok) throw new Error(payload?.error || "Не вдалося надіслати запит до Gemini.");
      setAiResponse(payload?.text || "Gemini повернув порожню відповідь.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не вдалося надіслати запит до Gemini.";
      setAiError(
        message.includes("Unexpected end of JSON") || message.includes("Failed to fetch")
          ? "Gemini тимчасово недоступний. Програма працює; повторіть запит, коли відновиться зв'язок із сервером."
          : message,
      );
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
    const mergedAccount: StoredAccount = remoteSyncEnabled
      ? accountMetadata({ ...snapshot.account, serverRole: currentAccount?.serverRole })
      : { ...snapshot.account, syncToken: currentAccount?.syncToken || snapshot.account.syncToken || createId("sync") };
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
    setAuthForm({ name: mergedAccount.name, email: mergedAccount.email, password: "" });
    setAllSavedAthletes(nextAthletes);
    setAllSavedPrograms(nextPrograms);
    setAllTrainingLogs(nextLogs);
    setAllTeams(nextTeams);
    setAllMemberships(nextMemberships);
    setAllTestHistory(nextTestHistory);

    window.localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(nextAccounts));
    if (!remoteSyncEnabled) window.localStorage.setItem(SESSION_STORAGE_KEY, mergedAccount.id);
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
    if (!dataLoaded || !remoteSyncEnabled) return;
    let cancelled = false;
    setSessionRestoring(true);
    getCurrentAccount()
      .then((restoredAccount) => {
        if (!cancelled) finishAuthentication(toStoredAccount(restoredAccount));
      })
      .catch((error) => {
        if (cancelled) return;
        clearAuthenticatedState();
        if (!(error instanceof AuthClientError && (error.status === 401 || error.status === 403))) {
          setAuthError(error instanceof Error ? error.message : "Не вдалося відновити сеанс.");
        }
      })
      .finally(() => {
        if (!cancelled) setSessionRestoring(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dataLoaded]);

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

  if (!dataLoaded || sessionRestoring) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#080a0d] px-6 text-[#f3efe5]" aria-busy="true">
        <div className="grid justify-items-center gap-3 text-center">
          <LoaderCircle className="h-7 w-7 animate-spin text-[#b99a5b]" aria-hidden="true" />
          <p className="text-sm font-semibold">Відновлюємо ваш робочий простір</p>
        </div>
      </main>
    );
  }

  if (!account) {
    return (
      <WelcomeFlow
        heroImageSrc="/assets/onboarding/combat-performance-hero.webp"
        heroImageAlt="Боєць виконує вибуховий кидок медболу в центрі спортивної підготовки"
        defaultValue={{
          authMode,
          displayName: authForm.name,
          email: authForm.email,
          role: userMode === "coach" ? "coach" : "athlete",
        }}
        onSignIn={() => setAuthMode("login")}
        onComplete={completeWelcomeFlow}
        isSubmitting={authLoading}
        requiresPassword={remoteSyncEnabled}
      />
    );
  }

  return (
    <div className="min-h-screen px-3 py-4 text-[var(--bbp-text)] sm:px-5 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-5">
        <header className="sticky top-0 z-20 grid gap-4 rounded-lg border border-[var(--bbp-border)] bg-[linear-gradient(180deg,rgba(8,12,16,0.92),rgba(8,12,16,0.82))] p-3 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur lg:grid-cols-[300px_1fr] lg:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--bbp-border-strong)] bg-[var(--bbp-accent-soft)] text-[#e8fbff] shadow-[0_12px_30px_rgba(84,200,255,0.14)]">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-lg font-black uppercase leading-none text-white">Black Bear</h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--bbp-muted)]">Система спортивної підготовки</p>
            </div>
          </div>
          <div className="grid gap-2">
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
                    className={`flex min-h-10 items-center justify-center gap-2 rounded-md border px-2 text-[10px] font-bold uppercase transition ${
                      active
                        ? "border-[var(--bbp-border-strong)] bg-[var(--bbp-accent-soft)] text-[var(--bbp-text)]"
                        : completed
                          ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                          : enabled
                            ? "border-[var(--bbp-border)] bg-[rgba(7,11,15,0.8)] text-[var(--bbp-muted)] hover:border-[var(--bbp-border-strong)] hover:text-[var(--bbp-text)]"
                            : "cursor-not-allowed border-[rgba(255,255,255,0.03)] text-[rgba(150,167,184,0.35)] opacity-50"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden xl:inline">{item.name}</span>
                  </button>
                );
              })}
            </nav>
            <div className="grid gap-1">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--bbp-muted)]">
                <span>Налаштування</span>
                <span>
                  Крок {step}/{steps.length}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
                <div className="h-full rounded-full bg-gradient-to-r from-[#67cfff] via-[#86dfbf] to-[#eef7ff] transition-all duration-500" style={{ width: `${(step / steps.length) * 100}%` }} />
              </div>
            </div>
          </div>
        </header>

        <main className="min-h-[620px]">
          <ErrorList errors={formErrors} />
          {step > 1 && (
            <>
              <CurrentSummary
                account={account}
                languageMode={languageMode}
                userMode={userMode}
                combatProfile={combatProfile}
                athleteProfile={athleteProfile}
                programSettings={programSettings}
              />
              <NextActionBar
                step={step}
                account={account}
                athleteProfile={athleteProfile}
                program={program}
                savedProgramsCount={savedPrograms.length}
                logsCount={trainingLogs.length}
              />
            </>
          )}

          {step === 1 && (
            <ScreenShell
              eyebrow={roleLabel(account.serverRole || account.role)}
              title={`Кабінет: ${account.name}`}
              description={userMode === "coach" ? "Команди, програми спортсменів і контроль прогресу в одному робочому просторі." : "Ваш профіль, готовність, тренувальний журнал і поточна програма."}
            >
              <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
                <Card className="premium-reveal grid gap-5 border-[var(--bbp-border-strong)] bg-[linear-gradient(145deg,rgba(13,20,27,0.98),rgba(7,11,16,0.98))]">
                  <div className="grid gap-3 border-b border-[var(--bbp-border)] pb-4 md:grid-cols-[1fr_auto] md:items-end">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#d1b36e]">Сьогодні у фокусі</p>
                      <h2 className="font-display mt-2 max-w-3xl text-3xl font-black text-white md:text-5xl">
                        {userMode === "coach" ? "Керуйте підготовкою команди без зайвого шуму." : "Виконайте план і зафіксуйте результат."}
                      </h2>
                      <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--bbp-muted)]">
                        {savedPrograms.length
                          ? "Остання програма, журнал і контрольні показники доступні праворуч. Новий блок можна почати з бойового профілю."
                          : "Почніть із бойового профілю, внесіть базові дані й отримайте першу структуровану програму підготовки."}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <StatusPill tone="gold" label={`${savedPrograms.length} програм`} />
                        <StatusPill tone="green" label={`${trainingLogs.length} записів журналу`} />
                        <StatusPill tone="red" label={`${savedAthletes.length} профілів`} />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <StatBox label="Програми" value={String(savedPrograms.length)} />
                      <StatBox label="Журнал" value={String(trainingLogs.length)} />
                      <StatBox label="Спортсмени" value={String(savedAthletes.length)} />
                    </div>
                  </div>
                  <SegmentedControl
                    label="Мова матеріалів"
                    value={languageMode}
                    onChange={(value) => setLanguageMode(value as LanguageMode)}
                    options={[
                      { label: "Українська", value: "ua" },
                      { label: "Англійська", value: "en" },
                      { label: "Обидві", value: "ua_en" },
                    ]}
                  />
                  <AccountPanel
                    account={account}
                    authForm={authForm}
                    setAuthForm={setAuthForm}
                    onSubmit={() => { void handleAuth(); }}
                    onLogout={logout}
                    syncStatus={syncStatus}
                    onSyncNow={syncNow}
                    authActionLabel={remoteSyncEnabled ? (authMode === "login" ? "Увійти" : "Зареєструватися") : accounts.some((item) => item.email === authForm.email.trim().toLowerCase()) ? "Увійти" : "Зареєструватися"}
                    authMode={authMode}
                    setAuthMode={setAuthMode}
                    loading={authLoading || sessionRestoring}
                    error={authError}
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
                      joinLoading={joinLoading}
                      onLoadTestEntry={loadTestEntry}
                    />
                  )}
                  <Button onClick={nextStep} className="mt-2 w-full md:w-fit">
                    {savedPrograms.length ? "Створити новий блок" : "Створити першу програму"} <ChevronRight className="h-4 w-4" />
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
            <ScreenShell eyebrow="Крок 2" title="Бойовий профіль" description="Виберіть борцівський, ударний або змішаний профіль MMA, а потім укажіть тижневе навантаження.">
              <div className="grid gap-5">
                <Card className="grid gap-4">
                  <SegmentedControl
                    label="Вид спорту"
                    value={athleteProfile.sport}
                    onChange={updateSport}
                    options={SPORTS.map((sport) => ({ label: sportLabel(sport), value: sport }))}
                  />
                  <div className="grid gap-3 md:grid-cols-3">
                    {availableCombatProfiles.map((profile) => {
                      const active = combatProfile === profile;
                      return (
                        <button
                          key={profile}
                          type="button"
                          aria-label={`Вибрати бойовий профіль: ${PROFILE_COPY[profile].title}`}
                          onClick={() => setCombatProfile(profile)}
                          className={`grid min-h-[180px] gap-3 rounded-lg border p-4 text-left transition ${
                            active
                              ? "border-[var(--bbp-border-strong)] bg-[var(--bbp-accent-soft)] text-[var(--bbp-text)] shadow-[0_16px_42px_rgba(84,200,255,0.12)]"
                              : "border-[var(--bbp-border)] bg-[rgba(7,10,14,0.72)] text-[var(--bbp-muted)] hover:border-[var(--bbp-border-strong)]"
                          }`}
                        >
                          <h3 className="text-sm font-black uppercase">{PROFILE_COPY[profile].title}</h3>
                          <p className={`text-sm leading-5 ${active ? "text-[var(--bbp-text)]" : "text-[var(--bbp-muted)]"}`}>{PROFILE_COPY[profile].summary}</p>
                          <div className="flex flex-wrap gap-1">
                            {PROFILE_COPY[profile].emphasis.map((tag) => (
                              <span
                                key={tag}
                                className={`rounded border px-2 py-1 text-[10px] font-bold uppercase ${
                                  active
                                    ? "border-[var(--bbp-border-strong)] bg-[rgba(255,255,255,0.05)] text-[#e9fbff]"
                                    : "border-[var(--bbp-border)] bg-[rgba(255,255,255,0.03)]"
                                }`}
                              >
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
                  <h3 className="text-sm font-bold uppercase text-white">Тижневе бойове навантаження</h3>
                  <div className="grid gap-4 md:grid-cols-5">
                    <Input label="Ударні тренування" type="number" value={combatLoad.strikingSessions} onChange={(value) => updateCombatLoad("strikingSessions", value)} min={0} />
                    <Input label="Борцівські тренування" type="number" value={combatLoad.grapplingSessions} onChange={(value) => updateCombatLoad("grapplingSessions", value)} min={0} />
                    <Input label="Важкі спаринги" type="number" value={combatLoad.hardSparringDays} onChange={(value) => updateCombatLoad("hardSparringDays", value)} min={0} />
                    <Input label="Важка боротьба" type="number" value={combatLoad.hardGrapplingDays} onChange={(value) => updateCombatLoad("hardGrapplingDays", value)} min={0} />
                    <Input label="Технічні тренування" type="number" value={combatLoad.technicalSessions} onChange={(value) => updateCombatLoad("technicalSessions", value)} min={0} />
                  </div>
                  <p className="rounded-md border border-[var(--bbp-border-strong)] bg-[var(--bbp-accent-soft)] p-3 text-sm leading-6 text-[var(--bbp-text)]">
                    {profileSummary.title}: {profileSummary.summary}
                  </p>
                </Card>
                <NavigationButtons prev={prevStep} next={nextStep} />
              </div>
            </ScreenShell>
          )}

          {step === 3 && (
            <ScreenShell eyebrow="Крок 3" title="Профіль спортсмена" description="Збережіть постійні дані: вік, стать, стаж, обладнання та обмеження. Тести й готовність можна змінювати в кожному циклі.">
              <div className="grid gap-5">
                <Card className="grid gap-4 md:grid-cols-4">
                  <Input label="Ім'я" value={athleteProfile.name} onChange={(value) => updateAthleteProfile({ name: String(value) })} placeholder="Ім'я спортсмена" />
                  <Input label="Вік" type="number" value={athleteProfile.age} onChange={(value) => updateAthleteProfile({ age: value as number | "" })} min={0} />
                  <Input label="Зріст, см" type="number" value={athleteProfile.heightCm} onChange={(value) => updateAthleteProfile({ heightCm: value as number | "" })} min={0} />
                  <Input label="Вага, кг" type="number" value={athleteProfile.weightKg} onChange={(value) => updateAthleteProfile({ weightKg: value as number | "" })} min={0} />
                  <SegmentedControl
                    label="Стать"
                    value={athleteProfile.sex}
                    onChange={(value) => updateAthleteProfile({ sex: value })}
                    options={[
                      { label: "Чоловіча", value: "Male" },
                      { label: "Жіноча", value: "Female" },
                    ]}
                  />
                  <SegmentedControl
                    label="Рівень"
                    value={athleteProfile.level}
                    onChange={(value) => updateAthleteProfile({ level: value })}
                    options={[
                      { label: "Початківець", value: "Beginner" },
                      { label: "Аматор", value: "Amateur" },
                      { label: "Досвідчений", value: "Advanced Amateur" },
                      { label: "Професіонал", value: "Professional" },
                    ]}
                  />
                  <SegmentedControl
                    label="Стаж силових тренувань"
                    value={athleteProfile.strengthTrainingAge}
                    onChange={(value) => updateAthleteProfile({ strengthTrainingAge: value })}
                    options={[
                      { label: "0-3 міс.", value: "0-3 months" },
                      { label: "3-12 міс.", value: "3-12 months" },
                      { label: "1-3 роки", value: "1-3 years" },
                      { label: "3+ роки", value: "3+ years" },
                    ]}
                  />
                </Card>
                <SavedAthletesPanel athletes={savedAthletes} onLoad={loadAthleteProfile} onDelete={deleteAthleteProfile} />
                <SavedProgramsPanel programs={savedPrograms} onLoad={loadProgramRecord} onDelete={deleteProgramRecord} />
                <Checklist title="Обладнання" items={EQUIPMENT} selected={athleteProfile.equipment} onToggle={(value) => toggleListValue("equipment", value)} />
                <Checklist title="Біль та обмеження" items={PAIN_AREAS} selected={athleteProfile.painAreas} onToggle={(value) => toggleListValue("painAreas", value)} />
                <Card className="border-[rgba(255,128,139,0.28)] bg-[rgba(255,128,139,0.08)] text-sm leading-6 text-[var(--bbp-text)]">
                  Цей інструмент не встановлює діагнозів. Гострий біль, неврологічні симптоми, ознаки струсу, біль у грудях або сильне запаморочення потребують огляду лікаря.
                </Card>
                <div className="flex flex-wrap justify-between gap-3">
                  <Button variant="outline" onClick={saveAthleteProfile}>
                    Зберегти спортсмена
                  </Button>
                  <NavigationButtons prev={prevStep} next={nextStep} />
                </div>
              </div>
            </ScreenShell>
          )}

          {step === 4 && (
            <ScreenShell eyebrow="Крок 4" title="Тренувальний блок" description="Виберіть тривалість, кількість силових тренувань, фазу підготовки й дату змагання. Кожен четвертий тиждень буде контрольним і розвантажувальним.">
              <div className="grid gap-5">
                <Card className="grid gap-5">
                  <SegmentedControl
                    label="Тривалість блоку"
                    value={String(programSettings.lengthWeeks)}
                    onChange={(value) => updateProgramSettings({ lengthWeeks: Number(value) as ProgramSettings["lengthWeeks"] })}
                    options={[
                      { label: "4 тижні", value: "4" },
                      { label: "8 тижнів", value: "8" },
                      { label: "12 тижнів", value: "12" },
                    ]}
                  />
                  <SegmentedControl
                    label="Силових тренувань на тиждень"
                    value={String(programSettings.scDaysPerWeek)}
                    onChange={(value) => updateProgramSettings({ scDaysPerWeek: Number(value) as ProgramSettings["scDaysPerWeek"] })}
                    options={[
                      { label: "2 дні", value: "2" },
                      { label: "3 дні", value: "3" },
                      { label: "4 дні", value: "4" },
                    ]}
                  />
                  <div className="grid gap-4 md:grid-cols-3">
                    <SegmentedControl
                      label="Тривалість тренування"
                      value={programSettings.sessionDuration}
                      onChange={(value) => updateProgramSettings({ sessionDuration: value })}
                      options={[
                        { label: "45 хв", value: "45 min" },
                        { label: "60 хв", value: "60 min" },
                        { label: "75 хв", value: "75 min" },
                        { label: "90 хв", value: "90 min" },
                      ]}
                    />
                    <Input label="Дата змагання" type="date" value={programSettings.competitionDate || ""} onChange={(value) => updateProgramSettings({ competitionDate: String(value) })} />
                    <Input label="Головна мета" value={goalLabel(programSettings.mainGoal)} onChange={(value) => updateProgramSettings({ mainGoal: String(value) })} />
                  </div>
                  <SegmentedControl
                    label="Поточна фаза"
                    value={programSettings.phase}
                    onChange={(value) => updateProgramSettings({ phase: value })}
                    options={[
                      { label: "Міжсезоння", value: "Off-season" },
                      { label: "Перед зборами", value: "Pre-camp" },
                      { label: "Бойові збори", value: "Fight camp" },
                      { label: "Сезон", value: "In-season" },
                      { label: "Повернення", value: "Return to training" },
                    ]}
                  />
                </Card>
                <NavigationButtons prev={prevStep} next={nextStep} />
              </div>
            </ScreenShell>
          )}

          {step === 5 && (
            <ScreenShell eyebrow="Крок 5" title="Оцінювання" description="Внесіть результати тестів, робочі ваги, показники потужності, витривалості й готовності. Система перетворить їх на практичний тижневий план.">
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
                    <ChevronLeft className="h-4 w-4" /> Назад
                  </Button>
                  <Button onClick={handleGenerate} className="px-8">
                    Створити програму
                  </Button>
                </div>
              </div>
            </ScreenShell>
          )}

          {step === 6 && program && (
            <ScreenShell eyebrow="Крок 6" title="План тренувань" description={programSummaryUa(combatProfile, athleteProfile, programSettings)}>
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
                    До оцінювання
                  </Button>
                  <Button onClick={nextStep}>
                    Відкрити підсумкову таблицю <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </ScreenShell>
          )}

          {step === 7 && program && (
            <ScreenShell eyebrow="Крок 7" title="Підсумкова таблиця" description="Таку структуру спортсмен або тренер отримає як готовий тренувальний документ.">
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
                    Почати спочатку
                  </Button>
                </div>
              </div>
            </ScreenShell>
          )}
        </main>

        <footer className="border-t border-zinc-900 py-4 text-center text-[10px] uppercase text-zinc-600">
          <p>2026 Black Bear. Для спортсменів, тренерів і зважених тренувальних рішень.</p>
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
  authMode,
  setAuthMode,
  loading,
  error,
}: {
  account: StoredAccount | null;
  authForm: { name: string; email: string; password: string };
  setAuthForm: React.Dispatch<React.SetStateAction<{ name: string; email: string; password: string }>>;
  onSubmit: () => void;
  onLogout: () => void;
  syncStatus: SyncStatus;
  onSyncNow: () => void;
  authActionLabel: string;
  authMode: AuthMode;
  setAuthMode: React.Dispatch<React.SetStateAction<AuthMode>>;
  loading: boolean;
  error: string;
}) {
  const syncCopy: Record<SyncStatus, string> = {
    local: "Збережено на пристрої",
    syncing: "Синхронізація",
    synced: "Синхронізовано",
    offline: "Локальний режим",
    error: "Помилка синхронізації",
  };
  const syncTone =
    syncStatus === "synced"
      ? "border-emerald-400/30 text-emerald-200"
      : syncStatus === "offline" || syncStatus === "error"
        ? "border-[rgba(255,128,139,0.28)] text-[#ffd5da]"
        : "border-[var(--bbp-border)] text-[var(--bbp-muted)]";

  if (account) {
    return (
      <div className="grid gap-3 rounded-lg border border-emerald-400/25 bg-[var(--bbp-success-soft)] p-4 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-200">Вхід виконано</p>
          <p className="mt-1 font-bold text-white">{account.name}</p>
          <p className="text-xs text-[var(--bbp-muted)]">
            {account.email} / {roleLabel(account.serverRole || account.role)}
          </p>
          <span className={`mt-2 inline-flex w-fit rounded border px-2 py-1 text-[10px] font-bold uppercase ${syncTone}`}>
            Дані: {syncCopy[syncStatus]}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {remoteSyncEnabled && (
            <Button variant="secondary" onClick={onSyncNow} disabled={syncStatus === "syncing"}>
              Синхронізувати
            </Button>
          )}
          <Button variant="outline" onClick={onLogout} disabled={loading}>
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Вийти
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded-lg border border-[var(--bbp-border)] bg-[rgba(7,10,14,0.78)] p-4" aria-busy={loading}>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#c7f4ff]">Обліковий запис</p>
        <p className="mt-1 text-sm leading-5 text-[var(--bbp-muted)]">Увійдіть або зареєструйтеся, щоб зберігати спортсменів і журнал.</p>
        <span className={`mt-2 inline-flex w-fit rounded border px-2 py-1 text-[10px] font-bold uppercase ${syncTone}`}>
          Дані: {syncCopy[syncStatus]}
        </span>
      </div>
      {remoteSyncEnabled && (
        <SegmentedControl
          label="Дія"
          value={authMode}
          disabled={loading}
          onChange={(value) => setAuthMode(value as AuthMode)}
          options={[
            { label: "Вхід", value: "login" },
            { label: "Реєстрація", value: "register" },
          ]}
        />
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {(!remoteSyncEnabled || authMode === "register") && <Input label="Ім'я" value={authForm.name} onChange={(value) => setAuthForm((current) => ({ ...current, name: String(value) }))} placeholder="Ім'я тренера або спортсмена" />}
        <Input label="Електронна пошта" type="email" value={authForm.email} onChange={(value) => setAuthForm((current) => ({ ...current, email: String(value) }))} placeholder="email@example.com" />
        {remoteSyncEnabled && <Input label="Пароль (10-128 символів)" type="password" value={authForm.password} onChange={(value) => setAuthForm((current) => ({ ...current, password: String(value) }))} placeholder="Введіть пароль" />}
      </div>
      {error && <p className="text-sm font-semibold text-[#ffd5da]" role="alert">{error}</p>}
      <Button onClick={onSubmit} className="w-full md:w-fit" disabled={loading}>
        {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} {loading ? "Зачекайте..." : authActionLabel}
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
    <div className="grid gap-3 rounded-lg border border-zinc-800 bg-black/55 p-4">
      <div className="grid gap-1">
        <p className="text-[11px] font-bold uppercase text-zinc-500">Резервна копія даних</p>
        <p className="text-sm leading-5 text-zinc-400">
          {account
            ? `Спортсменів: ${athletesCount} / програм: ${programsCount} / записів: ${logsCount}.`
            : "Імпортуйте резервну копію або увійдіть, щоб створити локальну базу."}
        </p>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <Button variant="secondary" onClick={onExport} disabled={!account}>
          <Download className="h-4 w-4" /> Експортувати
        </Button>
        <label className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-zinc-800 px-4 py-2 text-sm font-bold text-white transition hover:bg-zinc-700">
          <Upload className="h-4 w-4" /> Імпортувати
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
      {message && <p className="rounded-md border border-zinc-800 bg-zinc-950 p-2 text-xs leading-5 text-zinc-400">{message}</p>}
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
  const doneLogs = logs.filter((log) => log.status === "done").length;
  const modifiedLogs = logs.filter((log) => log.status === "modified").length;
  const plannedLogs = logs.filter((log) => log.status === "planned").length;
  const skippedLogs = logs.filter((log) => log.status === "skipped").length;
  const latestProgram = recentPrograms[0];
  const readinessDataRaw = logs.slice(0, 6).reverse().map((log) => Number(log.readiness) || 0);
  const readinessData = readinessDataRaw.length ? [...Array(Math.max(0, 6 - readinessDataRaw.length)).fill(0), ...readinessDataRaw] : [2, 3, 4, 3, 4, 5];

  return (
    <Card className="premium-reveal grid content-start gap-4 self-start border-zinc-700/80 lg:sticky lg:top-32">
      <div>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold uppercase text-white">{account ? "Робочий простір" : "Підсумковий документ"}</h3>
          <StatusPill tone={account ? "green" : "gold"} label={account ? "Готово" : "Демо"} />
        </div>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          {account
            ? "Продовжуйте роботу зі спортсменами, відкривайте програми або починайте нове оцінювання."
            : "Таблична структура за зразком OTA з логікою Black Bear для єдиноборств."}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <StatBox label="Спортсмени" value={String(athletesCount)} />
        <StatBox label="Програми" value={String(programs.length)} />
        <StatBox label="Записи" value={String(logs.length)} />
      </div>
      <div className="grid gap-3 rounded-lg border border-[var(--bbp-border)] bg-[rgba(7,10,14,0.68)] p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--bbp-muted-strong)]">Сьогодні</p>
            <p className="mt-1 text-sm font-semibold text-white">{latestProgram ? `Відкрити останній блок: ${latestProgram.athleteName}` : "Створити першу програму"}</p>
          </div>
          <Clock3 className="h-4 w-4 text-[#c7f4ff]" />
        </div>
        <p className="text-xs leading-5 text-[var(--bbp-muted)]">
          {latestProgram
            ? `${latestProgram.programSettings.lengthWeeks} тиж. / ${latestProgram.programSettings.scDaysPerWeek} силових тренувань / ${phaseLabel(latestProgram.programSettings.phase)}`
            : "Зареєструйтеся, виберіть тип бійця, внесіть тести й сформуйте першу таблицю."}
        </p>
      </div>
      <div className="grid gap-3 rounded-lg border border-zinc-800 bg-zinc-950/80 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase text-zinc-500">Стан тренувань</p>
            <p className="mt-1 text-sm font-semibold text-white">{logs.length ? "Виконання й готовність" : "У журналі ще немає даних"}</p>
          </div>
          <BarChart3 className="h-4 w-4 text-emerald-200" />
        </div>
        <MiniBarChart values={readinessData} max={5} />
        <div className="grid grid-cols-4 gap-1 text-center text-[10px] font-bold uppercase text-zinc-500">
          <span>Виконано {doneLogs}</span>
          <span>Змінено {modifiedLogs}</span>
          <span>Заплановано {plannedLogs}</span>
          <span>Пропущено {skippedLogs}</span>
        </div>
      </div>
      {recentPrograms.length > 0 && (
        <div className="grid gap-2">
          <p className="text-[11px] font-bold uppercase text-zinc-500">Останні програми</p>
          {recentPrograms.map((record) => (
            <div key={record.id} className="grid gap-2 rounded-lg border border-zinc-800 bg-black/55 p-3">
              <div>
                <p className="font-bold text-white">{record.athleteName}</p>
                <p className="text-xs text-zinc-500">
                  {record.programSettings.lengthWeeks} тиж. / {record.programSettings.scDaysPerWeek} дні / {phaseLabel(record.programSettings.phase)}
                </p>
              </div>
              <Button variant="secondary" onClick={() => onOpenProgram(record)}>
                Відкрити програму
              </Button>
            </div>
          ))}
        </div>
      )}
      {recentLogs.length > 0 && (
        <div className="grid gap-2">
          <p className="text-[11px] font-bold uppercase text-zinc-500">Останні записи</p>
          {recentLogs.map((log) => (
            <div key={log.id} className="rounded-lg border border-zinc-800 bg-black/55 p-3 text-xs leading-5 text-zinc-400">
              <p className="font-semibold text-white">
                {log.athleteName} / {log.date}
              </p>
              <p>
                Тиждень {log.week}, {log.day}, готовність {log.readiness}/5, {logStatusLabel(log.status)}
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
    <div className="rounded-md border border-[var(--bbp-border)] bg-[rgba(255,255,255,0.03)] p-3">
      <p className="text-xl font-black text-white">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--bbp-muted-strong)]">{label}</p>
    </div>
  );
}

function StatusPill({ label, tone = "zinc" }: { label: string; tone?: "gold" | "green" | "red" | "zinc" }) {
  const tones = {
    gold: "border-[var(--bbp-border-strong)] bg-[var(--bbp-accent-soft)] text-[#dff8ff]",
    green: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
    red: "border-[rgba(255,128,139,0.32)] bg-[rgba(255,128,139,0.12)] text-[#ffd5da]",
    zinc: "border-[var(--bbp-border)] bg-[rgba(255,255,255,0.03)] text-[var(--bbp-muted)]",
  };

  return <span className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ${tones[tone]}`}>{label}</span>;
}

function MiniBarChart({ values, max }: { values: number[]; max: number }) {
  return (
    <div className="flex h-20 items-end gap-1 rounded-md border border-[var(--bbp-border)] bg-[rgba(255,255,255,0.03)] p-2">
      {values.map((value, index) => {
        const height = Math.max(12, Math.min(100, (value / max) * 100));
        return (
          <div key={`${value}-${index}`} className="flex h-full flex-1 items-end">
            <div
              className="w-full rounded-t bg-gradient-to-t from-[#6de0c0] via-[#67cfff] to-[#dff8ff] shadow-[0_0_18px_rgba(84,200,255,0.15)]"
              style={{ height: `${height}%` }}
              aria-label={`Готовність: ${value} з ${max}`}
            />
          </div>
        );
      })}
    </div>
  );
}

function DashboardMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--bbp-border)] bg-[rgba(255,255,255,0.03)] p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[#c7f4ff]">{icon}</div>
        <p className="text-2xl font-black text-white">{value}</p>
      </div>
      <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--bbp-muted-strong)]">{label}</p>
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
        <h3 className="text-sm font-bold uppercase text-white">Огляд адміністратора</h3>
        <p className="mt-1 text-xs leading-5 text-zinc-500">Облікові записи, збережені дані та стан локальної системи.</p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-center md:grid-cols-5">
        <StatBox label="Облікові записи" value={String(accounts.length)} />
        <StatBox label="Спортсмени" value={String(athletesCount)} />
        <StatBox label="Програми" value={String(programsCount)} />
        <StatBox label="Журнал" value={String(logsCount)} />
        <StatBox label="Команди" value={String(teamsCount)} />
      </div>
      <div className="grid gap-2 text-xs text-zinc-400">
        {accounts.slice(0, 6).map((item) => (
          <div key={item.id} className="grid gap-1 rounded-lg border border-zinc-900 bg-black/55 p-3 md:grid-cols-[1fr_auto]">
            <span className="font-semibold text-white">{item.name}</span>
            <span>
              {item.email} / {roleLabel(item.role)}
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
  joinLoading,
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
  joinLoading: boolean;
  onLoadTestEntry: (entry: TestHistoryEntry) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const todayLogs = logs.filter((log) => log.date === today);
  const latestTestFor = (membership: TeamMembership) =>
    testHistory.find((entry) => entry.ownerId === membership.athleteAccountId || entry.athleteName === membership.athleteName);
  const totalCoachAthletes = userMode === "coach" ? memberships.length : athleteMemberships.length;
  const checkedInToday = userMode === "coach" ? memberships.filter((membership) => todayLogs.some((log) => log.ownerId === membership.athleteAccountId || log.athleteName === membership.athleteName)).length : todayLogs.length;
  const testsSaved = testHistory.length;

  return (
    <Card className="grid gap-4">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-bold uppercase text-white">{userMode === "coach" ? "Панель тренера" : "Панель спортсмена"}</h3>
          <StatusPill tone={account ? "green" : "zinc"} label={account ? "Дані збережено" : "Потрібен вхід"} />
        </div>
        <p className="mt-1 text-xs leading-5 text-zinc-500">
          {userMode === "coach"
            ? "Створіть команду, надайте код і переглядайте журнали спортсменів та контрольні тести."
            : "Приєднайтеся до команди тренера й ведіть електронний журнал тренувань."}
        </p>
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        <DashboardMetric icon={<Users className="h-4 w-4" />} label={userMode === "coach" ? "Спортсмени" : "Команди"} value={String(totalCoachAthletes)} />
        <DashboardMetric icon={<CheckCircle2 className="h-4 w-4" />} label="Записи за сьогодні" value={String(checkedInToday)} />
        <DashboardMetric icon={<CalendarDays className="h-4 w-4" />} label="Контрольні тести" value={String(testsSaved)} />
      </div>

      {userMode === "coach" ? (
        <div className="grid gap-3">
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <Input label="Назва команди" value={draft.name} onChange={(value) => setDraft((current) => ({ ...current, name: String(value) }))} />
            <Button onClick={onCreateTeam} disabled={!account}>
              Створити команду
            </Button>
          </div>
          {teams.length > 0 && (
            <div className="grid gap-2">
              {teams.map((team) => {
                const teamMembers = memberships.filter((membership) => membership.teamId === team.id);
                return (
                  <div key={team.id} className="grid gap-3 rounded-lg border border-zinc-800 bg-black/55 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-bold text-white">{team.name}</p>
                        <p className="text-xs text-zinc-500">Код приєднання: {team.joinCode}</p>
                      </div>
                      <span className="rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-400">Спортсменів: {teamMembers.length}</span>
                    </div>
                    {teamMembers.length > 0 && (
                      <div className="grid gap-2">
                        {teamMembers.map((membership) => {
                          const log = todayLogs.find((item) => item.ownerId === membership.athleteAccountId || item.athleteName === membership.athleteName);
                          const latestTest = latestTestFor(membership);
                          return (
                            <div key={membership.id} className="grid gap-2 rounded-lg border border-zinc-800 bg-zinc-950/80 p-3 text-xs md:grid-cols-[1fr_1.4fr_auto] md:items-center">
                              <div>
                                <p className="font-semibold text-white">{membership.athleteName}</p>
                                <p className="text-zinc-500">{membership.athleteEmail}</p>
                              </div>
                              <div className="text-zinc-400">
                                <p>Сьогодні: {log ? `${logStatusLabel(log.status)}, готовність ${log.readiness}/5${log.sessionRpe ? `, RPE ${log.sessionRpe}/10` : ""}` : "записів ще немає"}</p>
                                <p>
                                  Останній тест:{" "}
                                  {latestTest
                                    ? `${latestTest.date}, ${latestTest.microcycle}, вертикальний стрибок ${latestTest.verticalJump || "-"}`
                                    : "контрольного тесту ще немає"}
                                </p>
                              </div>
                              <Button variant="secondary" onClick={() => latestTest && onLoadTestEntry(latestTest)} disabled={!latestTest}>
                                Підставити результати
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
            <Input label="Код команди тренера" value={draft.joinCode} onChange={(value) => setDraft((current) => ({ ...current, joinCode: String(value).toUpperCase() }))} placeholder="BB-1234" />
            <Button onClick={onJoinTeam} disabled={!account || joinLoading}>
              {joinLoading && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {joinLoading ? "Приєднання..." : "Приєднатися"}
            </Button>
          </div>
          {athleteMemberships.length > 0 && (
            <div className="grid gap-2 text-xs text-zinc-400">
              {athleteMemberships.map((membership) => {
                const team = allTeams.find((item) => item.id === membership.teamId);
                return (
                  <div key={membership.id} className="rounded-lg border border-emerald-900/60 bg-emerald-950/15 p-3">
                    Приєднано до команди «{team?.name || "Команда тренера"}» як <span className="font-semibold text-white">{membership.athleteName}</span>
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
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--bbp-border-strong)] bg-[var(--bbp-accent-soft)] text-[#dff8ff]">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase text-white">Перевірка плану через Gemini</h3>
          <p className="mt-1 text-xs leading-5 text-[var(--bbp-muted)]">
            Помічник працює лише на сервері. Таблична структура за зразком OTA залишається основою програми.
          </p>
        </div>
      </div>
      <label className="grid gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--bbp-muted-strong)]">Запитання</span>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={1200}
          placeholder="Запитайте про примітки тренера, ризики або просте пояснення для спортсмена."
          className="min-h-24 rounded-md border border-[var(--bbp-border)] bg-[rgba(7,11,15,0.9)] px-3 py-2 text-sm text-[var(--bbp-text)] outline-none transition placeholder:text-[var(--bbp-muted-strong)] focus:border-[var(--bbp-accent-strong)] focus:ring-2 focus:ring-[var(--bbp-accent-ring)]"
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onAsk} disabled={!account || loading}>
          {loading ? "Надсилання..." : "Запитати Gemini"} <Send className="h-4 w-4" />
        </Button>
        <p className="text-xs text-[var(--bbp-muted-strong)]">{account ? "Запити обмежені лімітом на сервері." : "Увійдіть, щоб користуватися помічником."}</p>
      </div>
      {error && <p className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-200">{error}</p>}
      {response && <div className="whitespace-pre-wrap rounded-lg border border-[var(--bbp-border)] bg-[rgba(7,10,14,0.78)] p-4 text-sm leading-6 text-[var(--bbp-text)]">{response}</div>}
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
        <h3 className="text-sm font-bold uppercase text-white">Історія тестів мікроциклу</h3>
        <p className="mt-1 text-xs leading-5 text-zinc-500">
          Зберігайте контрольні показники після мікроциклу, щоб тренер бачив прогрес без повторного заповнення профілю.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-[160px_1fr_1fr_auto]">
        <Input label="Дата" type="date" value={draft.date} onChange={(value) => setDraft((current) => ({ ...current, date: String(value) }))} />
        <Input label="Мікроцикл" value={draft.microcycle} onChange={(value) => setDraft((current) => ({ ...current, microcycle: String(value) }))} />
        <Input label="Примітки" value={draft.notes} onChange={(value) => setDraft((current) => ({ ...current, notes: String(value) }))} placeholder="Бадьорий / втомлений / після спарингу" />
        <Button onClick={onSave} disabled={!account || !athleteName.trim()}>
          Зберегти тест
        </Button>
      </div>
      {latest && (
        <div className="grid gap-2 rounded-lg border border-emerald-900/60 bg-emerald-950/15 p-3 text-xs text-zinc-300 md:grid-cols-4">
          <p>
            Останній: <span className="font-semibold text-white">{latest.date}</span>
          </p>
          <p>Підтягування: {latest.pullups || "-"}</p>
          <p>Стрибок у довжину: {latest.broadJump || "-"} {broadJumpDelta !== null ? `(${broadJumpDelta >= 0 ? "+" : ""}${broadJumpDelta})` : ""}</p>
          <p>MAS: {latest.mas || "-"}</p>
        </div>
      )}
      {sorted.length > 0 && (
        <div className="grid gap-2">
          {sorted.slice(0, 5).map((entry) => (
            <div key={entry.id} className="grid gap-1 rounded-lg border border-zinc-800 bg-black/55 p-3 text-xs md:grid-cols-[130px_1fr_1fr]">
              <p className="font-semibold text-white">{entry.date}</p>
              <p className="text-zinc-400">
                {entry.microcycle}: присідання / Trap Bar {entry.squatOrTrapBar || "-"}, жим {entry.benchOrPushups || "-"}, підтягування {entry.pullups || "-"}
              </p>
              <p className="text-zinc-500">{entry.notes || "Без приміток"}</p>
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
        <h3 className="text-sm font-bold uppercase text-white">Журнал тренувань</h3>
        <p className="text-sm leading-6 text-zinc-500">
          {account ? `Журнал спортсмена ${athleteName || "без імені"} зберігається в обліковому записі ${account.name}.` : "Увійдіть, щоб зберігати історію тренувань."}
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-5">
        <Input label="Дата" type="date" value={draft.date} onChange={(value) => setDraft((current) => ({ ...current, date: String(value) }))} />
        <Input label="Тиждень" type="number" value={draft.week} min={1} max={12} onChange={(value) => setDraft((current) => ({ ...current, week: String(value) }))} />
        <Input label="День" value={draft.day} onChange={(value) => setDraft((current) => ({ ...current, day: String(value) }))} />
        <Input label="Готовність" type="number" value={draft.readiness} min={1} max={5} onChange={(value) => setDraft((current) => ({ ...current, readiness: String(value) }))} />
        <SegmentedControl
          label="Статус"
          value={draft.status}
          onChange={(value) => setDraft((current) => ({ ...current, status: value as TrainingLogStatus }))}
          options={[
            { label: "Виконано", value: "done" },
            { label: "Змінено", value: "modified" },
            { label: "Пропущено", value: "skipped" },
            { label: "Заплановано", value: "planned" },
          ]}
        />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Input label="RPE тренування" type="number" value={draft.sessionRpe} min={1} max={10} onChange={(value) => setDraft((current) => ({ ...current, sessionRpe: String(value) }))} />
        <Input label="Вага тіла, кг" type="number" value={draft.bodyWeightKg} min={30} max={180} onChange={(value) => setDraft((current) => ({ ...current, bodyWeightKg: String(value) }))} />
        <Input label="Біль або обмеження" value={draft.painNote} onChange={(value) => setDraft((current) => ({ ...current, painNote: String(value) }))} placeholder="Напружене плече / коліно без болю / немає" />
      </div>
      <label className="grid gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--bbp-muted-strong)]">Щоденник тренування</span>
        <textarea
          value={draft.notes}
          onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
          placeholder="Що виконано, що змінилося, яке було самопочуття та що тренеру скоригувати"
          className="min-h-24 rounded-md border border-[var(--bbp-border)] bg-[rgba(7,11,15,0.9)] px-3 py-2 text-sm text-[var(--bbp-text)] outline-none transition placeholder:text-[var(--bbp-muted-strong)] focus:border-[var(--bbp-accent-strong)] focus:ring-2 focus:ring-[var(--bbp-accent-ring)]"
        />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button onClick={onSave} disabled={!account || !athleteName.trim()}>
          Зберегти запис
        </Button>
        <p className="text-xs text-zinc-600">Збережених записів: {logs.length}</p>
      </div>
      {logs.length > 0 && (
        <div className="grid gap-2">
          {logs.slice(0, 5).map((log) => (
            <div key={log.id} className="grid gap-1 rounded-lg border border-zinc-800 bg-black/55 p-3 text-sm md:grid-cols-[120px_1fr_auto] md:items-center">
              <p className="font-semibold text-white">{log.date}</p>
              <p className="text-zinc-400">
                Тиждень {log.week} / {log.day} / готовність {log.readiness}/5
                {log.sessionRpe ? ` / RPE ${log.sessionRpe}/10` : ""}
                {log.bodyWeightKg ? ` / вага ${log.bodyWeightKg} кг` : ""}
                {log.painNote ? ` / біль: ${log.painNote}` : ""}
                {log.notes ? ` - ${log.notes}` : ""}
              </p>
              <span className="text-xs font-bold uppercase text-zinc-500">{logStatusLabel(log.status)}</span>
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
    <div className="mb-5 rounded-lg border border-red-900 bg-red-950/40 p-4">
      <p className="text-sm font-bold uppercase text-red-200">Перевірте введені дані</p>
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
    <div className="mb-5 grid gap-2 rounded-lg border border-[var(--bbp-border)] bg-[rgba(8,12,16,0.72)] p-3 text-xs shadow-[0_10px_30px_rgba(0,0,0,0.18)] md:grid-cols-6">
      <SummaryItem label="Обліковий запис" value={account ? account.name : "Вхід не виконано"} />
      <SummaryItem label="Режим" value={`${roleLabel(userMode)} / ${languageLabel(languageMode)}`} />
      <SummaryItem label="Спортсмен" value={athleteProfile.name || "Не вказано"} />
      <SummaryItem label="Профіль" value={PROFILE_COPY[combatProfile].title} />
      <SummaryItem label="Вид спорту" value={sportLabel(athleteProfile.sport)} />
      <SummaryItem label="Результат" value={`${programSettings.lengthWeeks} тиж. / ${programSettings.scDaysPerWeek} дні`} />
    </div>
  );
}

function NextActionBar({
  step,
  account,
  athleteProfile,
  program,
  savedProgramsCount,
  logsCount,
}: {
  step: number;
  account: UserAccount | null;
  athleteProfile: AthleteProfile;
  program: GeneratedProgram | null;
  savedProgramsCount: number;
  logsCount: number;
}) {
  const actions = [
    "Увійдіть, виберіть роль і мову матеріалів.",
    "Виберіть тип бійця та вкажіть бойове навантаження.",
    "Збережіть постійні дані спортсмена для майбутніх блоків.",
    "Виберіть тривалість блоку, силові дні та змагальний контекст.",
    "Внесіть тести й готовність, а потім створіть програму.",
    "Перегляньте наступне тренування, ризики та примітки тренера.",
    "Експортуйте таблицю й заповніть журнал після тренування.",
  ];
  const label = actions[step - 1] || actions[0];
  const detail = program
    ? `Готових тижнів: ${program.weeks.length} / записів: ${logsCount}`
    : account
      ? `Збережено програм: ${savedProgramsCount} / ${athleteProfile.name || "спортсмена не вказано"}`
      : "Облікового запису ще немає";

  return (
    <div className="mb-5 grid gap-3 rounded-lg border border-[var(--bbp-border-strong)] bg-[var(--bbp-accent-soft)] p-3 md:grid-cols-[auto_1fr_auto] md:items-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-md border border-[var(--bbp-border-strong)] bg-[rgba(255,255,255,0.05)] text-[#dff8ff]">
        <Target className="h-5 w-5" />
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#dff8ff]">Наступна дія</p>
        <p className="mt-1 text-sm font-semibold text-white">{label}</p>
      </div>
      <StatusPill tone={program ? "green" : account ? "gold" : "zinc"} label={detail} />
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--bbp-muted-strong)]">{label}</p>
      <p className="mt-1 truncate font-semibold text-[var(--bbp-text)]">{value}</p>
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
        <h3 className="text-sm font-bold uppercase text-white">Оцінка пріоритетів</h3>
        <p className="mt-1 text-xs leading-5 text-zinc-500">Головні чинники поточного циклу. Це рекомендації, а не медичний діагноз.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        {scores.map((score) => (
          <div key={score.id} className="rounded-lg border border-zinc-800 bg-black/55 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase text-white">{priorityLabel(score.id, score.label)}</p>
              <span className="rounded border border-[var(--bbp-border-strong)] bg-[var(--bbp-accent-soft)] px-2 py-1 text-xs font-black text-[#e7fbff]">{score.score}/5</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-[var(--bbp-muted)]">
              {languageMode !== "en" && priorityReasonUa(score.id, score.reasonUa)}
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
        <h3 className="text-sm font-bold uppercase text-white">Збережені спортсмени</h3>
        <p className="text-sm text-zinc-500">Збережених профілів ще немає. Один раз внесіть бойовий профіль, вид спорту, вік, стать, обладнання та обмеження.</p>
      </Card>
    );
  }

  return (
    <Card className="grid gap-3">
      <div>
        <h3 className="text-sm font-bold uppercase text-white">Збережені спортсмени</h3>
        <p className="mt-1 text-xs text-zinc-500">Профілі зберігаються локально. Оцінювання й готовність можна змінювати для кожного циклу.</p>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {athletes.map((saved) => (
          <div key={saved.id} className="grid gap-3 rounded-lg border border-zinc-800 bg-black/55 p-3 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="font-bold text-white">{saved.athleteProfile.name}</p>
              <p className="text-xs text-zinc-500">
                {PROFILE_COPY[saved.combatProfile].title} / {sportLabel(saved.athleteProfile.sport)} / {saved.athleteProfile.age || "-"} р. / {sexLabel(saved.athleteProfile.sex)}
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                Обмеження: {saved.athleteProfile.painAreas.length ? saved.athleteProfile.painAreas.map(checklistItemLabel).join(", ") : "немає"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => onLoad(saved)}>
                Завантажити
              </Button>
              <Button variant="outline" onClick={() => onDelete(saved.id)}>
                Видалити
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
        <h3 className="text-sm font-bold uppercase text-white">Історія програм</h3>
        <p className="text-sm text-zinc-500">Створені програми з'являться тут, щоб тренер міг відкрити останній план без повторного налаштування.</p>
      </Card>
    );
  }

  return (
    <Card className="grid gap-3">
      <div>
        <h3 className="text-sm font-bold uppercase text-white">Історія програм</h3>
        <p className="mt-1 text-xs text-zinc-500">Відкрийте попередній план із початковими тестами, параметрами та тижнями.</p>
      </div>
      <div className="grid gap-2">
        {programs.slice(0, 8).map((record) => (
          <div key={record.id} className="grid gap-3 rounded-lg border border-zinc-800 bg-black/55 p-3 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="font-bold text-white">{record.athleteName}</p>
              <p className="text-xs text-zinc-500">
                {PROFILE_COPY[record.combatProfile].title} / {record.programSettings.lengthWeeks} тиж. / {record.programSettings.scDaysPerWeek} дні /{" "}
                {new Date(record.savedAt).toLocaleDateString()}
              </p>
              <p className="mt-1 text-xs text-zinc-600">{goalLabel(record.programSettings.mainGoal)}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => onLoad(record)}>
                Відкрити
              </Button>
              <Button variant="outline" onClick={() => onDelete(record.id)}>
                Видалити
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
    <section className="premium-reveal grid gap-5">
      <div className="grid gap-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#c7f4ff]">{eyebrow}</p>
        <h2 className="font-display max-w-4xl text-3xl font-black text-white md:text-4xl">{title}</h2>
        <p className="max-w-3xl text-sm leading-6 text-[var(--bbp-muted)]">{description}</p>
      </div>
      {children}
    </section>
  );
}

function NavigationButtons({ prev, next }: { prev: () => void; next: () => void }) {
  return (
    <div className="flex flex-wrap justify-between gap-3">
      <Button variant="secondary" onClick={prev}>
        <ChevronLeft className="h-4 w-4" /> Назад
      </Button>
      <Button onClick={next}>
        Далі <ChevronRight className="h-4 w-4" />
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
      <h3 className="text-sm font-bold uppercase text-white">{title}</h3>
      <div className="grid gap-2 md:grid-cols-4">
        {items.map((item) => {
          const active = selected.includes(item);
          return (
            <button
              key={item}
              type="button"
              onClick={() => onToggle(item)}
              className={`rounded-md border px-3 py-2 text-left text-xs font-semibold transition ${
                active
                  ? "border-[var(--bbp-border-strong)] bg-[var(--bbp-accent-soft)] text-[var(--bbp-text)]"
                  : "border-[var(--bbp-border)] bg-[rgba(255,255,255,0.03)] text-[var(--bbp-muted)] hover:border-[var(--bbp-border-strong)] hover:text-[var(--bbp-text)]"
              }`}
            >
              {checklistItemLabel(item)}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function roleLabel(role: AccountRole) {
  return {
    athlete: "спортсмен",
    coach: "тренер",
    methodology_editor: "редактор методики",
    admin: "адміністратор",
  }[role];
}

function languageLabel(mode: LanguageMode) {
  return { ua: "українська", en: "англійська", ua_en: "українська + англійська" }[mode];
}

function logStatusLabel(status: TrainingLogStatus) {
  return { planned: "заплановано", done: "виконано", modified: "змінено", skipped: "пропущено" }[status];
}

function sexLabel(sex: string) {
  return sex === "Female" ? "жіноча" : sex === "Male" ? "чоловіча" : sex;
}

function sportLabel(sport: string) {
  const labels: Record<string, string> = {
    Karate: "Карате",
    Kickboxing: "Кікбоксинг",
    Boxing: "Бокс",
    Wrestling: "Боротьба",
    Sambo: "Самбо",
    Judo: "Дзюдо",
    "Muay Thai": "Муай-тай",
    Other: "Інше",
  };
  return labels[sport] || sport;
}

function checklistItemLabel(item: string) {
  const labels: Record<string, string> = {
    Barbell: "Штанга",
    Dumbbells: "Гантелі",
    Kettlebells: "Гирі",
    Machines: "Тренажери",
    "Pull-up Bar": "Турнік",
    Sled: "Санчата",
    Bike: "Велотренажер",
    Rower: "Гребний тренажер",
    Treadmill: "Бігова доріжка",
    "Med Balls": "Медболи",
    Bands: "Еспандери",
    "Mat Only": "Лише мат",
    Neck: "Шия",
    Shoulder: "Плече",
    "Elbow/Wrist/Hand": "Лікоть, зап'ясток або кисть",
    "Lower Back": "Поперек",
    Hip: "Тазостегновий суглоб",
    Knee: "Коліно",
    "Ankle/Foot": "Гомілковостопний суглоб або стопа",
    "Concussion History": "Струс мозку в анамнезі",
  };
  return labels[item] || item;
}

function phaseLabel(phase: string) {
  const labels: Record<string, string> = {
    "Off-season": "Міжсезоння",
    "Pre-camp": "Перед зборами",
    "Fight camp": "Бойові збори",
    "In-season": "Змагальний сезон",
    "Return to training": "Повернення до тренувань",
  };
  return labels[phase] || phase;
}

function goalLabel(goal: string) {
  return goal === "Strength & Power" ? "Сила й потужність" : goal;
}

function readinessLabel(key: "sleep" | "stress" | "soreness" | "motivation") {
  return { sleep: "Сон", stress: "Стрес", soreness: "М'язовий біль", motivation: "Мотивація" }[key];
}

function priorityLabel(id: string, fallback: string) {
  const labels: Record<string, string> = {
    strength: "Дефіцит сили",
    power: "Дефіцит потужності",
    aerobic: "Аеробний дефіцит",
    "repeat-effort": "Повторні зусилля",
    "movement-risk": "Ризик рухливості й стабільності",
    recovery: "Ризик відновлення",
    "combat-load": "Ризик бойового навантаження",
  };
  return labels[id] || fallback;
}

function priorityReasonUa(id: string, reason: string) {
  let localized = reason
    .replace("power/speed блоку", "швидкісно-силового блоку")
    .replace("scramble", "динамічної боротьби")
    .replace("soreness", "м'язового болю")
    .replace("бойових сесій", "бойових тренувань")
    .replace("1 бойових тренувань", "1 бойове тренування")
    .replace(/([234]) бойових тренувань/, "$1 бойові тренування")
    .replace("1 важких днів", "1 важкий день")
    .replace(/([234]) важких днів/, "$1 важкі дні");
  if (id === "movement-risk") {
    PAIN_AREAS.forEach((area) => {
      localized = localized.replace(area, checklistItemLabel(area));
    });
  }
  return localized;
}

function programSummaryUa(profile: CombatProfile, athlete: AthleteProfile, settings: ProgramSettings) {
  return `Програма для ${athlete.name || "спортсмена"}: профіль: ${PROFILE_COPY[profile].title.toLowerCase()}, тривалість: ${settings.lengthWeeks} тижнів, силові тренування на тиждень: ${settings.scDaysPerWeek}, фаза: ${phaseLabel(settings.phase).toLowerCase()}.`;
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
    ? `${firstDay.day}: ${firstDay.sessionGoal}. Блоки: ${firstDayExercises.map((exercise) => `${exercise.name} ${exercise.sets || ""}x${exercise.reps || ""}`).join("; ")}`
    : "Програму ще не створено.";

  return [
    "Контекст: Black Bear Performance, система силової підготовки для єдиноборств.",
    `Роль: ${roleLabel(userMode)}. Спортсмен: ${athleteProfile.name || "без імені"}, ${sportLabel(athleteProfile.sport)}, профіль ${PROFILE_COPY[combatProfile].title}, рівень ${athleteProfile.level}.`,
    `Програма: ${programSettings.lengthWeeks} тижнів, ${programSettings.scDaysPerWeek} силових тренувань на тиждень, фаза ${phaseLabel(programSettings.phase)}, мета ${goalLabel(programSettings.mainGoal)}, змагання ${programSettings.competitionDate || "не вказано"}.`,
    `Оцінювання: присідання/Trap Bar ${assessment.squatOrTrapBar || "-"}, жим ${assessment.benchOrPushups || "-"}, підтягування ${assessment.pullups || "-"}, вертикальний стрибок ${assessment.verticalJump || "-"}, стрибок у довжину ${assessment.broadJump || "-"}, MAS ${assessment.mas || "-"}, готовність сон/стрес/м'язовий біль/мотивація ${assessment.sleep}/${assessment.stress}/${assessment.soreness}/${assessment.motivation}.`,
    `Опис плану: ${program?.summary || "Програму ще не створено."}`,
    `Перший день: ${firstDayText.slice(0, 900)}`,
    "Відповідай стисло українською. Назви вправ можна лишати англійською. Зазнач, що остаточне рішення щодо навантаження ухвалює тренер.",
    `Запитання: ${question}`,
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
