import { AthleteProfile, CombatProfile, ProgramSettings } from "../types";

export function profileLabel(profile: CombatProfile) {
  if (profile === "grappler") return "Борець";
  if (profile === "striker") return "Ударник";
  return "Ударник + борець";
}

export function programTextUa(value: string) {
  const exact: Record<string, string> = {
    "Checkpoint / Deload": "Контроль і розвантаження",
    "Base Build": "Розвиток бази",
    Accumulation: "Накопичення",
    Transmutation: "Трансформація",
    "Realization / Taper": "Реалізація і зниження навантаження",
    Realization: "Реалізація",
    "Deload / Checkpoint": "Розвантаження і контроль",
    "Load-in / Technique": "Поступове входження й техніка",
    "Build / Combat Load Managed": "Розвиток з урахуванням бойового навантаження",
    Build: "Розвиток",
    "High Stimulus": "Високе тренувальне навантаження",
    "Checkpoint, tissue quality, and low fatigue output": "Контроль, якість руху й низький рівень втоми",
    "Lower strength, grip support, trunk stiffness": "Сила нижньої частини тіла, хват і стабільність корпуса",
    "Lower strength, acceleration, elastic stiffness": "Сила нижньої частини тіла, прискорення й пружність",
    "Total body strength with fatigue control": "Сила всього тіла з контролем втоми",
    "Upper pull, neck, trunk, and shoulder armor": "Тягові рухи, шия, корпус і захист плечових суглобів",
    "Upper power transfer, shoulder/scap control": "Передавання зусилля верхньої частини тіла й контроль лопаток",
    "Upper strength, trunk, and joint resilience": "Сила верхньої частини тіла, корпус і стійкість суглобів",
    "Repeated effort power and grappling conditioning": "Потужність повторних зусиль і борцівська витривалість",
    "Rotational power, footwork, and round conditioning": "Ротаційна потужність, робота ніг і витривалість у раундах",
    "Power transfer and fight-specific intervals": "Передавання зусилля й спеціальні бойові інтервали",
    "Aerobic base, carries, neck and knee prehab": "Аеробна база, перенесення вантажу, профілактика для шиї та колін",
    "Aerobic base, ankle stiffness, shoulder prehab": "Аеробна база, пружність гомілковостопного суглоба й профілактика для плечей",
    "Aerobic base and full-body durability": "Аеробна база й витривалість усього тіла",
    "Reduce volume, keep technical quality, retest key markers.": "Зменшити обсяг, зберегти якість техніки й повторити ключові тести.",
    "Keep speed/power sharp, lower fatigue, finalize testing notes.": "Зберегти швидкість і потужність, зменшити втому й зафіксувати підсумки тестування.",
  };
  if (exact[value]) return exact[value];
  if (/^Day \d+$/.test(value)) return value.replace("Day", "День");
  if (value.startsWith("Fight camp readiness:")) {
    return value
      .replace("Fight camp readiness:", "Готовність до бойових зборів:")
      .replace("Strength & Power", "сила й потужність")
      .replace(", fatigue control, and round-specific conditioning.", ", контроль втоми й спеціальна витривалість для раундів.");
  }
  if (value.endsWith(": build the base qualities without interfering with combat practice.")) {
    const goal = value.replace(": build the base qualities without interfering with combat practice.", "").replace("Strength & Power", "Сила й потужність");
    return `${goal}: розвивати базові якості, не заважаючи бойовим тренуванням.`;
  }
  return value;
}

export function prescriptionValueUa(value: string) {
  const labels: Record<string, string> = {
    Easy: "Легко",
    Crisp: "Вибухово й технічно",
    "High quality": "Висока якість",
    "Max speed": "Максимальна швидкість",
    "Pain-free": "Без болю",
    "Heavy but clean": "Важко, але технічно",
    Smooth: "Плавно",
    Hard: "Важко",
    "HR Zone 2": "Зона HR 2",
    "Zone 3-4": "Зона 3-4",
    Clean: "Технічно",
    Moderate: "Помірно",
  };
  if (labels[value]) return labels[value];
  return value
    .replace(/\bmin\b/g, "хв")
    .replace(/\bsec\b/g, "с")
    .replace(/(\d)s\b/g, "$1 с")
    .replace(/(\d)m\b/g, "$1 м")
    .replace(/\/side\b/g, " на бік")
    .replace(/\/position\b/g, " на позицію")
    .replace(/\beach\b/g, "кожна");
}

export function phaseLabel(phase: string) {
  const labels: Record<string, string> = {
    "Off-season": "Міжсезоння",
    "Pre-camp": "Перед зборами",
    "Fight camp": "Бойові збори",
    "In-season": "Змагальний сезон",
    "Return to training": "Повернення до тренувань",
  };
  return labels[phase] || phase;
}

export function goalLabel(goal: string) {
  return goal === "Strength & Power" ? "Сила й потужність" : goal;
}

export function sportLabel(sport: string) {
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

export function sexLabel(sex: string) {
  return sex === "Female" ? "жіноча" : sex === "Male" ? "чоловіча" : sex;
}

export function levelLabel(level: string) {
  const labels: Record<string, string> = {
    Beginner: "Початківець",
    Amateur: "Аматор",
    "Advanced Amateur": "Досвідчений аматор",
    Professional: "Професіонал",
  };
  return labels[level] || level;
}

export function trainingAgeLabel(age: string) {
  const labels: Record<string, string> = {
    "0-3 months": "0-3 місяці",
    "3-12 months": "3-12 місяців",
    "1-3 years": "1-3 роки",
    "3+ years": "Понад 3 роки",
  };
  return labels[age] || age;
}

const itemLabels: Record<string, string> = {
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

export function localizedItemLabel(item: string) {
  return itemLabels[item] || item;
}

export function localizedList(items: string[]) {
  return items.length ? items.map(localizedItemLabel).join(", ") : "-";
}

export function priorityLabel(label: string) {
  const labels: Record<string, string> = {
    "Strength deficit": "Дефіцит сили",
    "Power deficit": "Дефіцит потужності",
    "Aerobic deficit": "Аеробний дефіцит",
    "Repeat effort deficit": "Дефіцит повторних зусиль",
    "Mobility / stability risk": "Ризик рухливості й стабільності",
    "Recovery risk": "Ризик відновлення",
    "Combat load risk": "Ризик бойового навантаження",
  };
  return labels[label] || label;
}

export function priorityReasonUa(reason: string) {
  let localized = reason
    .replace("power/speed блоку", "швидкісно-силового блоку")
    .replace("scramble", "динамічної боротьби")
    .replace("soreness", "м'язового болю")
    .replace("бойових сесій", "бойових тренувань")
    .replace("1 бойових тренувань", "1 бойове тренування")
    .replace(/([234]) бойових тренувань/, "$1 бойові тренування")
    .replace("1 важких днів", "1 важкий день")
    .replace(/([234]) важких днів/, "$1 важкі дні");
  Object.entries(itemLabels).forEach(([source, label]) => {
    localized = localized.replace(source, label.toLowerCase());
  });
  return localized;
}

export function programSummaryUa(profile: CombatProfile, athlete: AthleteProfile, settings: ProgramSettings) {
  return `Програма для ${athlete.name || "спортсмена"}: профіль: ${profileLabel(profile).toLowerCase()}, тривалість: ${settings.lengthWeeks} тижнів, силові тренування на тиждень: ${settings.scDaysPerWeek}, фаза: ${phaseLabel(settings.phase).toLowerCase()}.`;
}

export function ukrainianNote(value: string) {
  return value
    .replace("через readiness", "через низьку готовність")
    .replace("Фінальний taper", "Фінальне зниження навантаження")
    .replaceAll("сет", "підхід")
    .replace("Сильний brace", "Стабільний корпус")
    .replace("не силова мʼясорубка", "без зайвого силового напруження")
    .replace("без забивання", "без надмірної втоми")
    .replace("не вбивай хват", "не перевантажуй хват")
    .replace("рухається чисто", "рухається технічно")
    .replace("без закислення", "без надмірної втоми")
    .replace("Не став важкий хват/шию/спину", "Не ставте важку роботу для хвату, шиї чи спини")
    .replace("Не добивай ноги", "Не перевантажуйте ноги")
    .replace("обʼєм", "обсяг")
    .replace("бойових сесій", "бойових тренувань");
}
