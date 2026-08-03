export type AccountRole = "athlete" | "coach" | "methodology_editor" | "admin";
export type PublicAccountRole = Extract<AccountRole, "athlete" | "coach">;

export type AuthAccount = {
  id: string;
  name: string;
  email: string;
  role: AccountRole;
  createdAt: string;
};

export type RemoteTeamMembership = {
  id: string;
  teamId: string;
  coachId: string;
  athleteAccountId: string;
  athleteName: string;
  athleteEmail?: string;
  athleteProfileId?: string;
  joinedAt: string;
};

export type RemoteTeamSummary = {
  id: string;
  ownerId: string;
  name: string;
  joinCode?: string;
  createdAt: string;
};

type ErrorPayload = { code?: unknown; error?: unknown };

const ACCOUNT_ROLES = new Set<AccountRole>(["athlete", "coach", "methodology_editor", "admin"]);
const ERROR_MESSAGES: Record<string, string> = {
  account_exists: "Обліковий запис із цією електронною поштою вже існує.",
  authentication_required: "Увійдіть, щоб продовжити.",
  forbidden: "Ваш обліковий запис не має дозволу на цю дію.",
  invalid_credentials: "Неправильна електронна пошта або пароль.",
  invalid_email: "Введіть коректну електронну адресу.",
  invalid_name: "Ім'я має містити від 2 до 80 символів.",
  invalid_password: "Пароль має містити від 10 до 128 символів.",
  invalid_role: "Для реєстрації виберіть роль спортсмена або тренера.",
  invalid_session: "Сеанс завершився. Увійдіть знову.",
  rate_limited: "Забагато спроб. Зачекайте трохи й повторіть.",
  team_not_found: "Команду з таким кодом не знайдено.",
  duplicate_membership: "Ви вже приєднані до цієї команди.",
  team_owner_conflict: "Ви вже є власником цієї команди.",
  already_member: "Ви вже приєднані до цієї команди.",
};

export class AuthClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "AuthClientError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new AuthClientError("Сервер повернув некоректні дані. Повторіть спробу.", 502, "invalid_response");
  }
  return value;
}

function optionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function parseAccount(payload: unknown): AuthAccount {
  if (!isRecord(payload) || !isRecord(payload.account)) {
    throw new AuthClientError("Сервер повернув некоректні дані облікового запису.", 502, "invalid_response");
  }
  const role = requiredString(payload.account, "role") as AccountRole;
  if (!ACCOUNT_ROLES.has(role)) {
    throw new AuthClientError("Сервер повернув невідому роль облікового запису.", 502, "invalid_response");
  }
  return {
    id: requiredString(payload.account, "id"),
    name: requiredString(payload.account, "name"),
    email: requiredString(payload.account, "email").toLowerCase(),
    role,
    createdAt: requiredString(payload.account, "createdAt"),
  };
}

async function parseJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function checkedJson(response: Response): Promise<unknown> {
  const payload = await parseJson(response);
  if (response.ok) return payload;
  const error = isRecord(payload) ? (payload as ErrorPayload) : {};
  const code = typeof error.code === "string" ? error.code : undefined;
  const serverMessage = typeof error.error === "string" ? error.error : undefined;
  const fallback = response.status >= 500
    ? "Сервер тимчасово недоступний. Повторіть спробу пізніше."
    : "Не вдалося виконати запит. Перевірте дані й повторіть.";
  throw new AuthClientError((code && ERROR_MESSAGES[code]) || serverMessage || fallback, response.status, code);
}

async function postJson(path: string, body: Record<string, unknown>): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AuthClientError("Немає зв'язку із сервером. Перевірте мережу й повторіть.", 0, "network_error");
  }
  return checkedJson(response);
}

function validatePassword(password: string) {
  if (password.length < 10 || password.length > 128) {
    throw new AuthClientError(ERROR_MESSAGES.invalid_password, 400, "invalid_password");
  }
}

export async function registerAccount(input: {
  name: string;
  email: string;
  password: string;
  role: PublicAccountRole;
}): Promise<AuthAccount> {
  validatePassword(input.password);
  const payload = await postJson("/api/auth/register", {
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    password: input.password,
    role: input.role,
  });
  return parseAccount(payload);
}

export async function loginAccount(input: { email: string; password: string }): Promise<AuthAccount> {
  validatePassword(input.password);
  const payload = await postJson("/api/auth/login", {
    email: input.email.trim().toLowerCase(),
    password: input.password,
  });
  return parseAccount(payload);
}

export async function getCurrentAccount(): Promise<AuthAccount> {
  let response: Response;
  try {
    response = await fetch("/api/auth/me", {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new AuthClientError("Немає зв'язку із сервером. Перевірте мережу й повторіть.", 0, "network_error");
  }
  return parseAccount(await checkedJson(response));
}

export async function logoutAccount(): Promise<void> {
  await postJson("/api/auth/logout", {});
}

export async function joinRemoteTeam(input: {
  joinCode: string;
  athleteName: string;
  athleteProfileId?: string;
}): Promise<{ membership: RemoteTeamMembership; team: RemoteTeamSummary }> {
  const payload = await postJson("/api/team-join", {
    joinCode: input.joinCode.trim().toUpperCase(),
    athleteName: input.athleteName.trim(),
    ...(input.athleteProfileId ? { athleteProfileId: input.athleteProfileId } : {}),
  });
  if (!isRecord(payload) || !isRecord(payload.membership)) {
    throw new AuthClientError("Сервер повернув некоректні дані команди.", 502, "invalid_response");
  }
  const teamValue = isRecord(payload.team) ? payload.team : payload.teamSummary;
  if (!isRecord(teamValue)) {
    throw new AuthClientError("Сервер повернув некоректні дані команди.", 502, "invalid_response");
  }
  return {
    membership: {
      id: requiredString(payload.membership, "id"),
      teamId: requiredString(payload.membership, "teamId"),
      coachId: requiredString(payload.membership, "coachId"),
      athleteAccountId: requiredString(payload.membership, "athleteAccountId"),
      athleteName: requiredString(payload.membership, "athleteName"),
      athleteEmail: optionalString(payload.membership, "athleteEmail"),
      athleteProfileId: optionalString(payload.membership, "athleteProfileId"),
      joinedAt: requiredString(payload.membership, "joinedAt"),
    },
    team: {
      id: requiredString(teamValue, "id"),
      ownerId: optionalString(teamValue, "ownerId") || requiredString(teamValue, "coachId"),
      name: requiredString(teamValue, "name"),
      joinCode: optionalString(teamValue, "joinCode"),
      createdAt: requiredString(teamValue, "createdAt"),
    },
  };
}
