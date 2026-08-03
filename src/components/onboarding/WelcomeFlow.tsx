import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Check,
  ChevronRight,
  CircleGauge,
  Dumbbell,
  Eye,
  EyeOff,
  HeartPulse,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Target,
  UserRound,
  UsersRound,
} from "lucide-react";
import {
  type CSSProperties,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import "./welcomeFlow.css";

export type WelcomeFlowStep =
  | "welcome"
  | "intent"
  | "details"
  | "role"
  | "preview"
  | "completion";

export type TrainingIntent =
  | "performance"
  | "strength"
  | "movement"
  | "return";

export type WelcomeFlowRole = "athlete" | "coach";

export type WelcomeFlowAuthMode = "login" | "register";

export interface WelcomeFlowData {
  authMode: WelcomeFlowAuthMode;
  intent: TrainingIntent | null;
  sessionsPerWeek: 2 | 3 | 4 | 5 | null;
  displayName: string;
  email: string;
  password: string;
  acceptedTerms: boolean;
  role: WelcomeFlowRole | null;
}

export interface WelcomeFlowProps {
  /** Optional editorial image shown on the welcome screen. */
  heroImageSrc?: string | null;
  heroImageAlt?: string;
  /** Controlled onboarding data. Pair with onChange. */
  value?: Partial<WelcomeFlowData>;
  /** Initial data for uncontrolled usage. */
  defaultValue?: Partial<WelcomeFlowData>;
  onChange?: (value: WelcomeFlowData) => void;
  /** Controlled step. Pair with onStepChange. */
  step?: WelcomeFlowStep;
  defaultStep?: WelcomeFlowStep;
  onStepChange?: (step: WelcomeFlowStep, value: WelcomeFlowData) => void;
  /** Called after the preview confirmation. API/auth work belongs in the parent. */
  onComplete?: (value: WelcomeFlowData) => void | Promise<void>;
  /** Optional notification when the user selects the login route. */
  onSignIn?: () => void;
  onFinish?: (value: WelcomeFlowData) => void;
  isSubmitting?: boolean;
  className?: string;
}

const EMPTY_DATA: WelcomeFlowData = {
  authMode: "register",
  intent: null,
  sessionsPerWeek: null,
  displayName: "",
  email: "",
  password: "",
  acceptedTerms: false,
  role: null,
};

const REGISTER_STEPS: readonly WelcomeFlowStep[] = [
  "welcome",
  "intent",
  "details",
  "role",
  "preview",
];

const LOGIN_STEPS: readonly WelcomeFlowStep[] = ["welcome", "details"];

const STEP_LABELS: Record<WelcomeFlowStep, string> = {
  welcome: "Початок",
  intent: "Намір",
  details: "Профіль",
  role: "Роль",
  preview: "Огляд",
  completion: "Готово",
};

const INTENTS: ReadonlyArray<{
  value: TrainingIntent;
  label: string;
  description: string;
  icon: typeof Target;
}> = [
  {
    value: "performance",
    label: "Покращити результат",
    description: "Системно розвивати форму й бачити прогрес у цифрах.",
    icon: CircleGauge,
  },
  {
    value: "strength",
    label: "Стати сильніше",
    description: "Будувати силу через послідовне навантаження.",
    icon: Dumbbell,
  },
  {
    value: "movement",
    label: "Рухатися якісніше",
    description: "Працювати над мобільністю, контролем і технікою.",
    icon: Activity,
  },
  {
    value: "return",
    label: "Повернутися у форму",
    description: "Відновити ритм без поспіху й зайвого ризику.",
    icon: HeartPulse,
  },
];

const ROLE_COPY: Record<
  WelcomeFlowRole,
  { name: "Athlete" | "Coach"; description: string; icon: typeof UserRound }
> = {
  athlete: {
    name: "Athlete",
    description: "Тренувальний план, готовність і особистий прогрес в одному місці.",
    icon: UserRound,
  },
  coach: {
    name: "Coach",
    description: "Спортсмени, програми й сигнали навантаження у спільному робочому просторі.",
    icon: UsersRound,
  },
};

type FieldErrors = Partial<
  Record<"intent" | "sessionsPerWeek" | "displayName" | "email" | "password" | "acceptedTerms" | "role" | "submit", string>
>;

function normalizeData(value?: Partial<WelcomeFlowData>): WelcomeFlowData {
  return { ...EMPTY_DATA, ...value };
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function IntentPreview({ intent }: { intent: TrainingIntent | null }) {
  const selected = INTENTS.find((option) => option.value === intent);
  if (!selected) return null;

  const Icon = selected.icon;
  return (
    <span className="bbwf-summary-value bbwf-summary-value--icon">
      <Icon aria-hidden="true" size={16} strokeWidth={1.8} />
      {selected.label}
    </span>
  );
}

export function WelcomeFlow({
  heroImageSrc = "/assets/onboarding/combat-athlete-welcome.webp",
  heroImageAlt = "Тренування в Black Bear Performance",
  value,
  defaultValue,
  onChange,
  step,
  defaultStep = "welcome",
  onStepChange,
  onComplete,
  onSignIn,
  onFinish,
  isSubmitting = false,
  className,
}: WelcomeFlowProps) {
  const [internalData, setInternalData] = useState<WelcomeFlowData>(() =>
    normalizeData(defaultValue),
  );
  const [internalStep, setInternalStep] = useState<WelcomeFlowStep>(defaultStep);
  const [highestVisited, setHighestVisited] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const data = useMemo(
    () => (value === undefined ? internalData : normalizeData(value)),
    [internalData, value],
  );
  const currentStep = step ?? internalStep;
  const flowSteps = data.authMode === "login" ? LOGIN_STEPS : REGISTER_STEPS;
  const flowStepIndex = flowSteps.indexOf(currentStep);
  const progressIndex = currentStep === "completion"
    ? flowSteps.length - 1
    : Math.max(flowStepIndex, 0);
  const progress = ((progressIndex + 1) / flowSteps.length) * 100;
  const busy = pending || isSubmitting;

  useEffect(() => {
    setHighestVisited((visited) => Math.max(visited, progressIndex));
    setErrors({});
    const root = rootRef.current;
    root?.scrollTo({ top: 0, behavior: "smooth" });
    const focusTimer = window.setTimeout(() => headingRef.current?.focus(), 180);
    return () => window.clearTimeout(focusTimer);
  }, [currentStep, progressIndex]);

  const updateData = (patch: Partial<WelcomeFlowData>): WelcomeFlowData => {
    const nextData = { ...data, ...patch };
    if (value === undefined) setInternalData(nextData);
    onChange?.(nextData);

    const clearedErrors = Object.keys(patch).reduce<FieldErrors>(
      (nextErrors, key) => ({ ...nextErrors, [key]: undefined }),
      errors,
    );
    setErrors(clearedErrors);
    return nextData;
  };

  const goToStep = (nextStep: WelcomeFlowStep, snapshot = data) => {
    if (step === undefined) setInternalStep(nextStep);
    onStepChange?.(nextStep, snapshot);
  };

  const goBack = () => {
    const previousStep = flowSteps[Math.max(0, progressIndex - 1)];
    goToStep(previousStep);
  };

  const selectAuthMode = (authMode: WelcomeFlowAuthMode) => {
    const loginOnlyPatch: Partial<WelcomeFlowData> = authMode === "login"
      ? {
          authMode,
          intent: null,
          sessionsPerWeek: null,
          displayName: "",
          acceptedTerms: false,
          role: null,
        }
      : { authMode };
    const nextData = updateData(loginOnlyPatch);
    if (authMode === "login") onSignIn?.();
    goToStep(authMode === "login" ? "details" : "intent", nextData);
  };

  const validateCurrentStep = (): boolean => {
    const nextErrors: FieldErrors = {};

    if (currentStep === "intent") {
      if (!data.intent) nextErrors.intent = "Оберіть головну ціль.";
      if (!data.sessionsPerWeek) {
        nextErrors.sessionsPerWeek = "Оберіть бажану частоту.";
      }
    }

    if (currentStep === "details") {
      if (data.authMode === "register" && data.displayName.trim().length < 2) {
        nextErrors.displayName = "Вкажіть ім’я, щонайменше 2 символи.";
      }
      if (!validateEmail(data.email.trim())) {
        nextErrors.email = "Перевірте адресу електронної пошти.";
      }
      if (data.password.length < 10 || data.password.length > 128) {
        nextErrors.password = "Пароль має містити від 10 до 128 символів.";
      }
      if (data.authMode === "register" && !data.acceptedTerms) {
        nextErrors.acceptedTerms = "Потрібна згода для створення профілю.";
      }
    }

    if (currentStep === "role" && !data.role) {
      nextErrors.role = "Оберіть роль у платформі.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleNext = (event?: FormEvent) => {
    event?.preventDefault();
    if (!validateCurrentStep()) return;
    const nextStep = flowSteps[Math.min(progressIndex + 1, flowSteps.length - 1)];
    goToStep(nextStep);
  };

  const handleDetailsSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!validateCurrentStep()) return;
    if (data.authMode === "login") {
      void handleComplete();
      return;
    }
    goToStep("role");
  };

  const handleComplete = async () => {
    setErrors({});
    setPending(true);
    try {
      await onComplete?.(data);
      goToStep("completion");
    } catch {
      setErrors({
        submit: "Не вдалося завершити налаштування. Спробуйте ще раз.",
      });
    } finally {
      setPending(false);
    }
  };

  const rootClassName = ["bb-welcome-flow", className].filter(Boolean).join(" ");
  const heroStyle = heroImageSrc
    ? ({ "--bbwf-hero-image": `url("${heroImageSrc}")` } as CSSProperties)
    : undefined;

  return (
    <div className={rootClassName} ref={rootRef}>
      <div className="bbwf-shell">
        <aside className="bbwf-rail" aria-label="Прогрес налаштування">
          <div className="bbwf-brand">
            <span className="bbwf-brand-mark" aria-hidden="true">
              <Dumbbell size={20} strokeWidth={1.7} />
            </span>
            <span>
              <strong>Black Bear</strong>
              <small>Performance</small>
            </span>
          </div>

          <nav className="bbwf-step-nav" aria-label="Кроки налаштування">
            {flowSteps.map((item, index) => {
              const isCurrent = index === progressIndex && currentStep !== "completion";
              const isComplete = index < progressIndex || currentStep === "completion";
              const isAvailable = index <= highestVisited && index < progressIndex;

              return (
                <button
                  className="bbwf-step-link"
                  data-current={isCurrent || undefined}
                  data-complete={isComplete || undefined}
                  disabled={!isAvailable}
                  key={item}
                  onClick={() => goToStep(item)}
                  type="button"
                >
                  <span className="bbwf-step-number" aria-hidden="true">
                    {isComplete ? <Check size={13} strokeWidth={2.2} /> : index + 1}
                  </span>
                  <span>{STEP_LABELS[item]}</span>
                </button>
              );
            })}
          </nav>

          <div className="bbwf-rail-note">
            <ShieldCheck aria-hidden="true" size={17} strokeWidth={1.7} />
            <span>Дані профілю захищені та належать вам.</span>
          </div>
        </aside>

        <main className="bbwf-main">
          <div className="bbwf-mobile-head">
            <div className="bbwf-brand">
              <span className="bbwf-brand-mark" aria-hidden="true">
                <Dumbbell size={18} strokeWidth={1.7} />
              </span>
              <span>
                <strong>Black Bear</strong>
                <small>Performance</small>
              </span>
            </div>
            <span className="bbwf-mobile-step">
              {progressIndex + 1}/{flowSteps.length}
            </span>
          </div>
          <div
            aria-hidden="true"
            className="bbwf-progress"
            style={{ "--bbwf-progress": `${progress}%` } as CSSProperties}
          >
            <span />
          </div>

          <section
            aria-labelledby={`bbwf-heading-${currentStep}`}
            className={`bbwf-stage bbwf-stage--${currentStep}`}
          >
            {currentStep === "welcome" && (
              <div className="bbwf-welcome-layout">
                <div className="bbwf-content bbwf-content--welcome">
                  <p className="bbwf-eyebrow">Персональний тренувальний простір</p>
                  <h1 id="bbwf-heading-welcome" ref={headingRef} tabIndex={-1}>
                    Сильні рішення починаються з ясної картини.
                  </h1>
                  <p className="bbwf-lead">
                    Налаштуйте простір під свою ціль, роль і реальний ритм тренувань.
                    Це займе близько двох хвилин.
                  </p>

                  <div className="bbwf-welcome-points" aria-label="Можливості платформи">
                    <span><BadgeCheck aria-hidden="true" size={17} />Чіткий план</span>
                    <span><CircleGauge aria-hidden="true" size={17} />Живий прогрес</span>
                    <span><HeartPulse aria-hidden="true" size={17} />Контроль готовності</span>
                  </div>

                  <div className="bbwf-welcome-actions">
                    <button className="bbwf-button bbwf-button--primary" onClick={() => selectAuthMode("register")} type="button">
                      Почати налаштування
                      <ArrowRight aria-hidden="true" size={18} />
                    </button>
                    <button className="bbwf-text-button" onClick={() => selectAuthMode("login")} type="button">
                      У мене вже є акаунт
                    </button>
                  </div>
                </div>

                <div
                  className="bbwf-hero"
                  data-has-image={Boolean(heroImageSrc) || undefined}
                  style={heroStyle}
                >
                  {heroImageSrc && <img alt={heroImageAlt} src={heroImageSrc} />}
                  <div className="bbwf-hero-overlay">
                    <span className="bbwf-hero-kicker">Тренування з наміром</span>
                    <strong>Послідовність.<br />Якість. Результат.</strong>
                    <span className="bbwf-hero-index">01 / 05</span>
                  </div>
                </div>
              </div>
            )}

            {currentStep === "intent" && (
              <form className="bbwf-content" onSubmit={handleNext} noValidate>
                <header className="bbwf-stage-header">
                  <p className="bbwf-eyebrow">Ваш напрям</p>
                  <h1 id="bbwf-heading-intent" ref={headingRef} tabIndex={-1}>
                    Що має змінитися завдяки тренуванням?
                  </h1>
                  <p>Оберіть головний орієнтир. Його можна змінити пізніше.</p>
                </header>

                <fieldset className="bbwf-fieldset" aria-describedby={errors.intent ? "bbwf-intent-error" : undefined}>
                  <legend className="bbwf-sr-only">Головна тренувальна ціль</legend>
                  <div className="bbwf-choice-grid">
                    {INTENTS.map((option) => {
                      const Icon = option.icon;
                      return (
                        <label className="bbwf-choice" data-selected={data.intent === option.value || undefined} key={option.value}>
                          <input
                            checked={data.intent === option.value}
                            name="intent"
                            onChange={() => updateData({ intent: option.value })}
                            type="radio"
                            value={option.value}
                          />
                          <span className="bbwf-choice-icon"><Icon aria-hidden="true" size={20} strokeWidth={1.7} /></span>
                          <span className="bbwf-choice-copy">
                            <strong>{option.label}</strong>
                            <small>{option.description}</small>
                          </span>
                          <span className="bbwf-choice-check" aria-hidden="true"><Check size={13} /></span>
                        </label>
                      );
                    })}
                  </div>
                  {errors.intent && <p className="bbwf-error" id="bbwf-intent-error" role="alert">{errors.intent}</p>}
                </fieldset>

                <fieldset className="bbwf-fieldset bbwf-frequency" aria-describedby={errors.sessionsPerWeek ? "bbwf-frequency-error" : undefined}>
                  <legend>Скільки тренувань на тиждень реально вписуються у ваш ритм?</legend>
                  <div className="bbwf-segmented">
                    {([2, 3, 4, 5] as const).map((count) => (
                      <label key={count} data-selected={data.sessionsPerWeek === count || undefined}>
                        <input
                          checked={data.sessionsPerWeek === count}
                          name="sessionsPerWeek"
                          onChange={() => updateData({ sessionsPerWeek: count })}
                          type="radio"
                          value={count}
                        />
                        <span>{count}</span>
                      </label>
                    ))}
                  </div>
                  {errors.sessionsPerWeek && <p className="bbwf-error" id="bbwf-frequency-error" role="alert">{errors.sessionsPerWeek}</p>}
                </fieldset>

                <StepActions onBack={goBack} />
              </form>
            )}

            {currentStep === "details" && (
              <form className="bbwf-content" onSubmit={handleDetailsSubmit} noValidate>
                <header className="bbwf-stage-header">
                  <p className="bbwf-eyebrow">{data.authMode === "login" ? "Вхід до профілю" : "Деталі профілю"}</p>
                  <h1 id="bbwf-heading-details" ref={headingRef} tabIndex={-1}>
                    {data.authMode === "login" ? "Продовжуйте з того місця, де зупинилися." : "Створімо ваш захищений профіль."}
                  </h1>
                  <p>
                    {data.authMode === "login"
                      ? "Введіть дані доступу до Black Bear Performance."
                      : "Ми використаємо ці дані лише для доступу та персоналізації простору."}
                  </p>
                </header>

                <div className="bbwf-form-grid">
                  {data.authMode === "register" && (
                    <label className="bbwf-field bbwf-field--full">
                      <span>Ваше ім’я</span>
                      <span className="bbwf-input-wrap">
                        <UserRound aria-hidden="true" size={18} />
                        <input
                          aria-invalid={Boolean(errors.displayName)}
                          autoComplete="name"
                          autoFocus
                          onChange={(event) => updateData({ displayName: event.target.value })}
                          placeholder="Як до вас звертатися"
                          required
                          type="text"
                          value={data.displayName}
                        />
                      </span>
                      {errors.displayName && <small className="bbwf-error" role="alert">{errors.displayName}</small>}
                    </label>
                  )}

                  <label className="bbwf-field bbwf-field--full">
                    <span>Електронна пошта</span>
                    <span className="bbwf-input-wrap">
                      <Mail aria-hidden="true" size={18} />
                      <input
                        aria-invalid={Boolean(errors.email)}
                        autoComplete="email"
                        autoFocus={data.authMode === "login"}
                        inputMode="email"
                        onChange={(event) => updateData({ email: event.target.value })}
                        placeholder="name@example.com"
                        required
                        type="email"
                        value={data.email}
                      />
                    </span>
                    {errors.email && <small className="bbwf-error" role="alert">{errors.email}</small>}
                  </label>

                  <label className="bbwf-field bbwf-field--full">
                    <span>Пароль</span>
                    <span className="bbwf-input-wrap">
                      <LockKeyhole aria-hidden="true" size={18} />
                      <input
                        aria-invalid={Boolean(errors.password)}
                        autoComplete={data.authMode === "login" ? "current-password" : "new-password"}
                        maxLength={128}
                        minLength={10}
                        onChange={(event) => updateData({ password: event.target.value })}
                        placeholder="Від 10 до 128 символів"
                        required
                        type={showPassword ? "text" : "password"}
                        value={data.password}
                      />
                      <button
                        aria-label={showPassword ? "Сховати пароль" : "Показати пароль"}
                        className="bbwf-input-action"
                        onClick={() => setShowPassword((visible) => !visible)}
                        type="button"
                      >
                        {showPassword ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
                      </button>
                    </span>
                    {errors.password && <small className="bbwf-error" role="alert">{errors.password}</small>}
                  </label>

                  {data.authMode === "register" && (
                    <>
                      <label className="bbwf-checkbox bbwf-field--full">
                        <input
                          checked={data.acceptedTerms}
                          onChange={(event) => updateData({ acceptedTerms: event.target.checked })}
                          required
                          type="checkbox"
                        />
                        <span className="bbwf-checkbox-box" aria-hidden="true"><Check size={13} /></span>
                        <span>Погоджуюся з умовами користування та правилами обробки даних.</span>
                      </label>
                      {errors.acceptedTerms && <p className="bbwf-error bbwf-field--full" role="alert">{errors.acceptedTerms}</p>}
                    </>
                  )}
                </div>

                {errors.submit && <p className="bbwf-submit-error" role="alert">{errors.submit}</p>}
                <StepActions
                  busy={data.authMode === "login" ? busy : false}
                  nextLabel={data.authMode === "login" ? "Увійти" : "Продовжити"}
                  onBack={goBack}
                />
              </form>
            )}

            {currentStep === "role" && (
              <form className="bbwf-content" onSubmit={handleNext} noValidate>
                <header className="bbwf-stage-header">
                  <p className="bbwf-eyebrow">Робочий режим</p>
                  <h1 id="bbwf-heading-role" ref={headingRef} tabIndex={-1}>
                    Як ви використовуватимете платформу?
                  </h1>
                  <p>Ми підлаштуємо перший екран, навігацію та ключові показники.</p>
                </header>

                <fieldset className="bbwf-fieldset" aria-describedby={errors.role ? "bbwf-role-error" : undefined}>
                  <legend className="bbwf-sr-only">Роль у платформі</legend>
                  <div className="bbwf-role-grid">
                    {(Object.keys(ROLE_COPY) as WelcomeFlowRole[]).map((role) => {
                      const roleContent = ROLE_COPY[role];
                      const Icon = roleContent.icon;
                      return (
                        <label className="bbwf-role-choice" data-selected={data.role === role || undefined} key={role}>
                          <input
                            checked={data.role === role}
                            name="role"
                            onChange={() => updateData({ role })}
                            type="radio"
                            value={role}
                          />
                          <span className="bbwf-role-icon"><Icon aria-hidden="true" size={25} strokeWidth={1.55} /></span>
                          <span className="bbwf-role-copy">
                            <strong>{roleContent.name}</strong>
                            <small>{roleContent.description}</small>
                          </span>
                          <span className="bbwf-role-arrow" aria-hidden="true"><ChevronRight size={19} /></span>
                        </label>
                      );
                    })}
                  </div>
                  {errors.role && <p className="bbwf-error" id="bbwf-role-error" role="alert">{errors.role}</p>}
                </fieldset>

                <div className="bbwf-role-note">
                  <ShieldCheck aria-hidden="true" size={18} />
                  <p><strong>Роль не обмежує профіль.</strong> Її можна змінити в налаштуваннях.</p>
                </div>

                <StepActions onBack={goBack} />
              </form>
            )}

            {currentStep === "preview" && (
              <div className="bbwf-content bbwf-content--preview">
                <header className="bbwf-stage-header">
                  <p className="bbwf-eyebrow">Ваш простір</p>
                  <h1 id="bbwf-heading-preview" ref={headingRef} tabIndex={-1}>
                    {data.role === "coach" ? "Керуйте підготовкою без втрати контексту." : "Кожне тренування має своє місце й сенс."}
                  </h1>
                  <p>Ось як виглядатиме ваш стартовий робочий простір.</p>
                </header>

                {data.role === "coach" ? <CoachPreview /> : <AthletePreview />}

                <div className="bbwf-summary" aria-label="Підсумок налаштувань">
                  <div><span>Профіль</span><strong>{data.displayName}</strong></div>
                  <div><span>Роль</span><strong>{data.role ? ROLE_COPY[data.role].name : "Athlete"}</strong></div>
                  <div><span>Напрям</span><IntentPreview intent={data.intent} /></div>
                  <div><span>Ритм</span><strong>{data.sessionsPerWeek} тренування на тиждень</strong></div>
                </div>

                {errors.submit && <p className="bbwf-submit-error" role="alert">{errors.submit}</p>}
                <div className="bbwf-actions">
                  <button className="bbwf-button bbwf-button--secondary" disabled={busy} onClick={goBack} type="button">
                    <ArrowLeft aria-hidden="true" size={18} />Назад
                  </button>
                  <button className="bbwf-button bbwf-button--primary" disabled={busy} onClick={handleComplete} type="button">
                    {busy ? <LoaderCircle aria-hidden="true" className="bbwf-spinner" size={18} /> : <Check aria-hidden="true" size={18} />}
                    {busy ? "Створюємо простір" : "Підтвердити й завершити"}
                  </button>
                </div>
              </div>
            )}

            {currentStep === "completion" && (
              <div className="bbwf-content bbwf-content--completion">
                <div className="bbwf-complete-mark" aria-hidden="true"><Check size={30} strokeWidth={1.8} /></div>
                <p className="bbwf-eyebrow">{data.authMode === "login" ? "Вхід виконано" : "Налаштування завершено"}</p>
                <h1 id="bbwf-heading-completion" ref={headingRef} tabIndex={-1}>
                  {data.authMode === "login"
                    ? "Раді знову бачити вас."
                    : data.displayName
                      ? `${data.displayName}, ваш простір готовий.`
                      : "Ваш простір готовий."}
                </h1>
                <p className="bbwf-lead">
                  {data.authMode === "login"
                    ? "Ваш профіль готовий до продовження роботи."
                    : data.role === "coach"
                    ? "Додайте першого спортсмена або відкрийте огляд команди."
                    : "Перегляньте перше тренування й зафіксуйте стартову готовність."}
                </p>

                <div className="bbwf-complete-detail">
                  <BadgeCheck aria-hidden="true" size={20} />
                  <span>
                    <small>{data.authMode === "login" ? "Активний профіль" : "Активний режим"}</small>
                    <strong>{data.authMode === "login" ? data.email : data.role ? ROLE_COPY[data.role].name : "Athlete"}</strong>
                  </span>
                </div>

                {onFinish && (
                  <button className="bbwf-button bbwf-button--primary" onClick={() => onFinish(data)} type="button">
                    Відкрити робочий простір
                    <ArrowRight aria-hidden="true" size={18} />
                  </button>
                )}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

interface StepActionsProps {
  busy?: boolean;
  nextLabel?: string;
  onBack: () => void;
}

function StepActions({ busy = false, nextLabel = "Продовжити", onBack }: StepActionsProps) {
  return (
    <div className="bbwf-actions">
      <button className="bbwf-button bbwf-button--secondary" disabled={busy} onClick={onBack} type="button">
        <ArrowLeft aria-hidden="true" size={18} />
        Назад
      </button>
      <button className="bbwf-button bbwf-button--primary" disabled={busy} type="submit">
        {busy ? <LoaderCircle aria-hidden="true" className="bbwf-spinner" size={18} /> : null}
        {busy ? "Входимо" : nextLabel}
        {!busy && <ArrowRight aria-hidden="true" size={18} />}
      </button>
    </div>
  );
}

function AthletePreview() {
  return (
    <div className="bbwf-product-preview" aria-label="Приклад простору Athlete">
      <div className="bbwf-preview-topline">
        <span><CalendarDays aria-hidden="true" size={16} />Сьогодні</span>
        <span className="bbwf-status">План готовий</span>
      </div>
      <div className="bbwf-preview-body">
        <div className="bbwf-session-copy">
          <small>Силове тренування · 48 хв</small>
          <strong>Сила нижньої частини тіла</strong>
          <span>4 вправи · середнє навантаження</span>
        </div>
        <div className="bbwf-exercise-row">
          <span className="bbwf-exercise-index">01</span>
          <span><strong>Back Squat</strong><small>4 підходи · 5 повторень</small></span>
          <span className="bbwf-exercise-load">80%</span>
        </div>
        <div className="bbwf-readiness">
          <span><CircleGauge aria-hidden="true" size={18} /><small>Готовність</small></span>
          <strong>8.4</strong>
          <span className="bbwf-readiness-bars" aria-hidden="true"><i /><i /><i /><i /><i /></span>
        </div>
      </div>
    </div>
  );
}

function CoachPreview() {
  return (
    <div className="bbwf-product-preview" aria-label="Приклад простору Coach">
      <div className="bbwf-preview-topline">
        <span><UsersRound aria-hidden="true" size={16} />Команда</span>
        <span className="bbwf-status">12 активних</span>
      </div>
      <div className="bbwf-preview-body">
        <div className="bbwf-coach-metrics">
          <div><small>Готові тренуватися</small><strong>9</strong></div>
          <div><small>Потребують уваги</small><strong>3</strong></div>
        </div>
        <div className="bbwf-athlete-row">
          <span className="bbwf-avatar" aria-hidden="true">МК</span>
          <span><strong>Марія Коваль</strong><small>Сила нижньої частини тіла · сьогодні</small></span>
          <span className="bbwf-score"><CircleGauge aria-hidden="true" size={14} />8.7</span>
        </div>
        <div className="bbwf-athlete-row">
          <span className="bbwf-avatar" aria-hidden="true">ОС</span>
          <span><strong>Олег Савчук</strong><small>Відновлення · сьогодні</small></span>
          <span className="bbwf-score bbwf-score--attention"><HeartPulse aria-hidden="true" size={14} />5.2</span>
        </div>
      </div>
    </div>
  );
}

export default WelcomeFlow;
