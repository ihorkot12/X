export const COMBAT_DISCIPLINES = ["kyokushin_karate", "mma"] as const;
export const METHODOLOGY_TAGS = ["daru-combat-performance", "westside-conjugate", "triphasic"] as const;
export const EXERCISE_SOURCE_TAGS = [
  "xl-athlete-index",
  "daru-strong-exercise-db",
  "black-bear-original",
  "ota",
] as const;

export const CURATED_COMBAT_EXERCISE_IDS = [
  "zercher-squat",
  "belt-split-squat-isometric-overcoming",
  "rdl-isometric-hold",
  "single-leg-ghr-eccentric",
  "db-bench-isometric-hold",
  "contralateral-band-row",
  "wrist-pronation-supination-overcoming-isometric",
  "four-way-neck-yielding-isometric",
  "groin-bench-oscillatory",
  "accelerated-band-ankle-hops",
  "staggered-depth-jump",
  "standing-band-hip-flexor-oscillation",
  "ankle-rocker-single-leg-squat",
  "90-90-hip-switch",
  "adductor-rock-back",
  "quadruped-t-spine-rotation",
  "shoulder-wall-slide",
  "scapular-push-up",
  "quadruped-wrist-rock",
  "neck-controlled-rotation",
] as const;

export type CombatDiscipline = (typeof COMBAT_DISCIPLINES)[number];
export type MethodologyTag = (typeof METHODOLOGY_TAGS)[number];
export type ExerciseSourceTag = (typeof EXERCISE_SOURCE_TAGS)[number];
export type CuratedCombatExerciseId = (typeof CURATED_COMBAT_EXERCISE_IDS)[number];
export type MobilityRegion =
  | "ankles"
  | "hips"
  | "adductors"
  | "t-spine"
  | "shoulders-scapulae"
  | "wrists"
  | "neck";

type RelevancePriority = "primary" | "supporting";

interface DisciplineRelevance {
  priority: RelevancePriority;
  rationaleUa: string;
}

export interface ExerciseMetadata {
  methodologyTags: readonly MethodologyTag[];
  sourceTag: ExerciseSourceTag;
  sourceUrl?: string;
  demoUrl?: string;
  mobilityRegions?: readonly MobilityRegion[];
  relevance: Readonly<Record<CombatDiscipline, DisciplineRelevance>>;
}

const xl = (path: string) => `https://www.xlathlete.com/${path}`;
const daruStrongExerciseDatabase = "https://invasiondigitalmedia.com/exercisedatabase-3-2/";

const relevance = (
  kyokushinPriority: RelevancePriority,
  kyokushinRationaleUa: string,
  mmaPriority: RelevancePriority,
  mmaRationaleUa: string,
): Readonly<Record<CombatDiscipline, DisciplineRelevance>> => ({
  kyokushin_karate: { priority: kyokushinPriority, rationaleUa: kyokushinRationaleUa },
  mma: { priority: mmaPriority, rationaleUa: mmaRationaleUa },
});

export const exerciseMetadata: Readonly<Record<CuratedCombatExerciseId, ExerciseMetadata>> = {
  "zercher-squat": {
    methodologyTags: ["daru-combat-performance", "westside-conjugate"],
    sourceTag: "xl-athlete-index",
    sourceUrl: xl("exercises/zurcher-squat/"),
    demoUrl: "https://www.youtube.com/watch?v=JiAmqNV15xU",
    relevance: relevance(
      "supporting",
      "Підсилює корпус і ноги для стабільної ударної стійки без вимог фронтального хвату.",
      "primary",
      "Фронтальне утримання навантаження переноситься на клінч, підйом і контроль суперника.",
    ),
  },
  "belt-split-squat-isometric-overcoming": {
    methodologyTags: ["westside-conjugate", "triphasic"],
    sourceTag: "xl-athlete-index",
    sourceUrl: xl("exercises/belt-split-squat-isometric-overcoming/"),
    relevance: relevance(
      "primary",
      "Розвиває силу в розділеній стійці для удару, гальмування та повернення у позицію.",
      "primary",
      "Підсилює силову передачу в бойовій стійці під час проходу в ноги й захисту від нього.",
    ),
  },
  "rdl-isometric-hold": {
    methodologyTags: ["daru-combat-performance", "triphasic"],
    sourceTag: "xl-athlete-index",
    sourceUrl: xl("exercises/rdl-isometric/"),
    relevance: relevance(
      "supporting",
      "Зміцнює задню лінію для контролю нахилу тулуба під час ударів ногами.",
      "primary",
      "Утримання шарніра допомагає зберігати позицію таза й спини у клінчі та боротьбі.",
    ),
  },
  "single-leg-ghr-eccentric": {
    methodologyTags: ["triphasic"],
    sourceTag: "xl-athlete-index",
    sourceUrl: xl("exercises/glute-hamstring-eccentric-single-leg/"),
    relevance: relevance(
      "primary",
      "Ексцентричний контроль задньої поверхні стегна підтримує гальмування ударної ноги.",
      "primary",
      "Однобічна ексцентрика готує задню лінію до ривків, зміни рівня та хаотичних опор.",
    ),
  },
  "db-bench-isometric-hold": {
    methodologyTags: ["westside-conjugate", "triphasic"],
    sourceTag: "xl-athlete-index",
    sourceUrl: xl("exercises/dumbbell-bench-isometric-hold/"),
    relevance: relevance(
      "supporting",
      "Дає силову паузу в жимі без надмірного обсягу для плечей ударника.",
      "primary",
      "Підсилює жорсткість плечового пояса для рамок, поштовху та виходу з нижньої позиції.",
    ),
  },
  "contralateral-band-row": {
    methodologyTags: ["daru-combat-performance"],
    sourceTag: "xl-athlete-index",
    sourceUrl: xl("exercises/horizontal-band-pull-contra-lateral-single-arm/"),
    relevance: relevance(
      "primary",
      "Зв'язує опорну ногу, таз і протилежну руку для повернення удару та захисту плеча.",
      "primary",
      "Розвиває діагональну тягу для клінчу, зриву захвату й ротаційного контролю.",
    ),
  },
  "wrist-pronation-supination-overcoming-isometric": {
    methodologyTags: ["daru-combat-performance", "triphasic"],
    sourceTag: "xl-athlete-index",
    sourceUrl: xl("exercises/wrist-pro-sup-isometric-overcoming/"),
    demoUrl: "https://www.youtube.com/watch?v=0IaL9_MN_aw",
    relevance: relevance(
      "supporting",
      "Підсилює зап'ясток для контакту кулаком і стабільного положення кисті.",
      "primary",
      "Ізометрія пронації та супінації підтримує хват, ручний бій і контроль зап'ястка.",
    ),
  },
  "four-way-neck-yielding-isometric": {
    methodologyTags: ["daru-combat-performance", "triphasic"],
    sourceTag: "daru-strong-exercise-db",
    sourceUrl: daruStrongExerciseDatabase,
    relevance: relevance(
      "primary",
      "Підвищує здатність утримувати нейтральну шию під час ударного контакту.",
      "primary",
      "Готує шию до клінчу, боротьби за голову та багатовекторного тиску.",
    ),
  },
  "groin-bench-oscillatory": {
    methodologyTags: ["daru-combat-performance", "triphasic"],
    sourceTag: "xl-athlete-index",
    sourceUrl: xl("exercises/groin-bench-oscillatory/"),
    relevance: relevance(
      "primary",
      "Швидка робота аддукторів підтримує контроль високих ударів і повернення ноги.",
      "primary",
      "Підсилює пахову зону для широких баз, скремблів і зміни напрямку під опором.",
    ),
  },
  "accelerated-band-ankle-hops": {
    methodologyTags: ["daru-combat-performance", "triphasic"],
    sourceTag: "xl-athlete-index",
    sourceUrl: xl("exercises/accelerated-ankle-hops-band/"),
    relevance: relevance(
      "primary",
      "Підвищує пружність стопи для ритму, підскоку й швидкого повернення зі стійки.",
      "supporting",
      "Покращує короткий контакт із підлогою для входів, виходів і зміни кута.",
    ),
  },
  "staggered-depth-jump": {
    methodologyTags: ["westside-conjugate", "triphasic"],
    sourceTag: "xl-athlete-index",
    sourceUrl: xl("exercises/depth-jump-1080-staggered/"),
    relevance: relevance(
      "primary",
      "Тренує прийняття сили й миттєвий вихід зі зміщеної бойової опори.",
      "primary",
      "Розвиває реактивність після нерівного приземлення, характерного для обмінів і скремблів.",
    ),
  },
  "standing-band-hip-flexor-oscillation": {
    methodologyTags: ["daru-combat-performance", "triphasic"],
    sourceTag: "xl-athlete-index",
    sourceUrl: xl("exercises/hip-flex-standing-band-oscillatory-isometric-nxcit/"),
    relevance: relevance(
      "primary",
      "Швидке згинання стегна підтримує підйом коліна та повторні удари ногами.",
      "primary",
      "Підсилює зміну рівня, повернення ноги після удару й крок у прохід.",
    ),
  },
  "ankle-rocker-single-leg-squat": {
    methodologyTags: ["triphasic"],
    sourceTag: "xl-athlete-index",
    sourceUrl: xl("exercises/single-leg-squat-for-ankle-rocker/"),
    mobilityRegions: ["ankles"],
    relevance: relevance(
      "primary",
      "Дає коліну рухатися над стопою без втрати п'яти для глибокої ударної стійки.",
      "primary",
      "Покращує дорзальне згинання для зміни рівня та стабільної опори у боротьбі.",
    ),
  },
  "90-90-hip-switch": {
    methodologyTags: ["daru-combat-performance"],
    sourceTag: "xl-athlete-index",
    sourceUrl: xl("exercises/90-90-hip-switch/"),
    demoUrl: "https://www.youtube.com/watch?v=m51AZSXMvEA",
    mobilityRegions: ["hips"],
    relevance: relevance(
      "primary",
      "Розвиває внутрішню й зовнішню ротацію таза для ударів ногами без компенсації попереком.",
      "primary",
      "Готує ротацію стегон для гард-позицій, скремблів і переходів між базами.",
    ),
  },
  "adductor-rock-back": {
    methodologyTags: ["daru-combat-performance"],
    sourceTag: "black-bear-original",
    mobilityRegions: ["adductors"],
    relevance: relevance(
      "primary",
      "Відкриває пахову зону для широкої стійки й ударів без пасивного провисання.",
      "primary",
      "Дає контрольований діапазон для широкої бази, проходів і роботи з гарду.",
    ),
  },
  "quadruped-t-spine-rotation": {
    methodologyTags: ["daru-combat-performance"],
    sourceTag: "xl-athlete-index",
    sourceUrl: xl("uncategorized/t-spine-rotation-quadruped/"),
    demoUrl: "https://www.youtube.com/watch?v=NzK5RA8xNxc",
    mobilityRegions: ["t-spine"],
    relevance: relevance(
      "primary",
      "Відділяє ротацію грудного відділу від попереку для ударів руками й розворотів.",
      "primary",
      "Покращує поворот корпусу для клінчу, ударів і виходу з нижніх позицій.",
    ),
  },
  "shoulder-wall-slide": {
    methodologyTags: ["daru-combat-performance"],
    sourceTag: "xl-athlete-index",
    sourceUrl: xl("exercises/shoulder-wall-slides/"),
    demoUrl: "https://www.youtube.com/watch?v=Eaj_NG5_hIo",
    mobilityRegions: ["shoulders-scapulae"],
    relevance: relevance(
      "primary",
      "Повертає контроль підйому руки й лопатки після великого обсягу ударів.",
      "primary",
      "Підтримує рух лопатки для ударів, рамок і безпечної роботи над головою.",
    ),
  },
  "scapular-push-up": {
    methodologyTags: ["daru-combat-performance"],
    sourceTag: "black-bear-original",
    mobilityRegions: ["shoulders-scapulae"],
    relevance: relevance(
      "primary",
      "Навчає лопатку ковзати навколо ребер без згинання ліктя під час ударної підготовки.",
      "primary",
      "Покращує опору на руки, рамки та стабільність плеча в партері.",
    ),
  },
  "quadruped-wrist-rock": {
    methodologyTags: ["daru-combat-performance"],
    sourceTag: "black-bear-original",
    mobilityRegions: ["wrists"],
    relevance: relevance(
      "supporting",
      "Готує розгинання зап'ястка до упорів і падінь без агресивного розтягнення.",
      "primary",
      "Розвиває контрольований діапазон кисті для постингу, рамок і боротьби на руках.",
    ),
  },
  "neck-controlled-rotation": {
    methodologyTags: ["daru-combat-performance"],
    sourceTag: "black-bear-original",
    mobilityRegions: ["neck"],
    relevance: relevance(
      "primary",
      "Повертає безболісний контроль огляду й положення підборіддя перед контактною роботою.",
      "primary",
      "Готує контрольований рух шиї перед клінчем, боротьбою за голову та ударами.",
    ),
  },
};
