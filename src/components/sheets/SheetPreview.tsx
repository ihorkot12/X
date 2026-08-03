import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { FileSpreadsheet, Table } from "lucide-react";
import { Assessment, AthleteProfile, CombatLoad, CombatProfile, GeneratedProgram, LanguageMode, ProgramDay, ProgramSettings, SheetTab } from "../../types";
import {
  goalLabel,
  levelLabel,
  localizedList,
  phaseLabel,
  prescriptionValueUa,
  priorityLabel,
  priorityReasonUa,
  profileLabel,
  programSummaryUa,
  programTextUa,
  sexLabel,
  sportLabel,
  trainingAgeLabel,
  ukrainianNote,
} from "../uaCopy";
import { Button } from "../ui/Base";

type PrioritySheetScore = {
  label: string;
  score: number;
  reasonUa: string;
  reasonEn: string;
};

export const SheetPreview = ({
  program,
  languageMode,
  athleteProfile,
  combatProfile,
  combatLoad,
  programSettings,
  assessment,
  priorityScores,
}: {
  program: GeneratedProgram;
  languageMode: LanguageMode;
  athleteProfile: AthleteProfile;
  combatProfile: CombatProfile;
  combatLoad: CombatLoad;
  programSettings: ProgramSettings;
  assessment: Assessment;
  priorityScores: PrioritySheetScore[];
}) => {
  const [activeTab, setActiveTab] = useState("Тиждень 1");
  const tabs = useMemo<SheetTab[]>(() => {
    const weekTabs: SheetTab[] = program.weeks.map((week) => ({ name: `Тиждень ${week.week}`, type: "week" }));
    return [
      { name: "Профіль спортсмена", type: "profile" },
      { name: "Оцінювання", type: "assessment" },
      { name: "Цілі", type: "goals" },
      ...weekTabs,
      { name: "Примітки до вправ", type: "notes" },
      { name: "Зони витривалості", type: "zones" },
      { name: "Контрольні тести", type: "checkpoints" },
      { name: "Готовність", type: "readiness" },
    ];
  }, [program.weeks]);

  const activeWeek = program.weeks.find((week) => `Тиждень ${week.week}` === activeTab) || program.weeks[0];
  const rows = activeTab.startsWith("Тиждень") ? activeWeek.days : [];
  const canDownloadCsv = activeTab.startsWith("Тиждень");

  const downloadActiveTabCsv = () => {
    if (!canDownloadCsv) return;
    const csv = buildWeekCsv(rows, languageMode);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bbp-${activeTab.toLowerCase().replace(/\s+/g, "-")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadFullProgramCsv = () => {
    const csv = buildWorkbookCsv({
      program,
      languageMode,
      athleteProfile,
      combatProfile,
      combatLoad,
      programSettings,
      assessment,
      priorityScores,
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "bbp-workbook-export.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadExcelWorkbook = () => {
    const workbook = buildExcelXmlWorkbook({
      program,
      languageMode,
      athleteProfile,
      combatProfile,
      combatLoad,
      programSettings,
      assessment,
      priorityScores,
    });
    const blob = new Blob([workbook], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "bbp-program-workbook.xls";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--bbp-border)] bg-[rgba(8,12,17,0.92)] shadow-[0_22px_60px_rgba(0,0,0,0.32)]">
      <div className="grid gap-3 border-b border-[var(--bbp-border)] bg-[rgba(10,16,22,0.94)] p-3 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--bbp-border-strong)] bg-[var(--bbp-accent-soft)] text-[#dff8ff]">
            <Table className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Експорт програми Black Bear</p>
            <p className="text-xs text-[var(--bbp-muted)]">Попередній перегляд структури Google Sheets</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-[var(--bbp-border)] bg-[rgba(6,9,13,0.78)] p-2">
        {tabs.map((tab) => (
          <button
            key={tab.name}
            type="button"
            onClick={() => setActiveTab(tab.name)}
            className={`whitespace-nowrap rounded-md border px-3 py-1.5 text-[11px] font-semibold transition ${
              activeTab === tab.name
                ? "border-[var(--bbp-border-strong)] bg-[var(--bbp-accent-soft)] text-[var(--bbp-text)]"
                : "border-[var(--bbp-border)] text-[var(--bbp-muted)] hover:text-[var(--bbp-text)]"
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      <div className="max-h-[620px] overflow-auto bg-white text-black">
        {activeTab.startsWith("Тиждень") ? (
          <WeekSheet rows={rows} languageMode={languageMode} />
        ) : (
          <InfoSheet
            activeTab={activeTab}
            program={program}
            languageMode={languageMode}
            athleteProfile={athleteProfile}
            combatProfile={combatProfile}
            combatLoad={combatLoad}
            programSettings={programSettings}
            assessment={assessment}
            priorityScores={priorityScores}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--bbp-border)] bg-[rgba(10,16,22,0.94)] p-3">
        <p className="text-xs leading-5 text-[var(--bbp-muted)]">
          Підсумковий документ міститиме профіль, тести, тижневий план, примітки, зони, контрольні тести та готовність у форматі Google Sheets.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" disabled={!canDownloadCsv} onClick={downloadActiveTabCsv}>
            Завантажити CSV за тиждень
          </Button>
          <Button variant="secondary" onClick={downloadFullProgramCsv}>
            Завантажити CSV програми
          </Button>
          <Button variant="secondary" onClick={downloadExcelWorkbook}>
            Завантажити книгу Excel
          </Button>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--bbp-muted)]">
            <FileSpreadsheet className="h-4 w-4" /> Структура OTA, логіка Black Bear
          </div>
        </div>
      </div>
    </div>
  );
};

function WeekSheet({ rows, languageMode }: { rows: ProgramDay[]; languageMode: LanguageMode }) {
  return (
    <table className="w-full min-w-[1760px] table-fixed border-collapse text-xs">
      <colgroup>
        <col className="w-[72px]" />
        <col className="w-[150px]" />
        <col className="w-[120px]" />
        <col className="w-[160px]" />
        <col className="w-[150px]" />
        <col className="w-[170px]" />
        <col className="w-[150px]" />
        <col className="w-[170px]" />
        <col className="w-[170px]" />
        <col className="w-[68px]" />
        <col className="w-[80px]" />
        <col className="w-[90px]" />
        <col className="w-[90px]" />
        <col className="w-[110px]" />
        <col className="w-[120px]" />
        <col className="w-[260px]" />
        <col className="w-[260px]" />
      </colgroup>
      <thead className="sticky top-0 bg-zinc-100 text-[10px] uppercase text-zinc-600">
        <tr>
          {[
            "День",
            "Мета тренування",
            "Блок",
            "Розминка",
            "Потужність і швидкість",
            "Сила",
            "Допоміжні вправи",
            "Витривалість",
            "Рухливість і профілактика",
            "Підходи",
            "Повторення",
            "Темп",
            "Відпочинок",
            "Інтенсивність",
            "Зона HR / MAS",
            "Примітки тренера",
            "Примітки спортсмена",
          ].map((header) => (
            <th key={header} className="border border-zinc-300 px-2 py-2 text-left">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((day) => {
          const lead = day.strength[0] || day.powerSpeed[0] || day.accessory[0];
          return (
            <tr key={day.day} className="align-top">
              <Cell strong>{programTextUa(day.day)}</Cell>
              <Cell>{programTextUa(day.sessionGoal)}</Cell>
              <Cell>{programTextUa(day.block)}</Cell>
              <Cell>{joinNames(day.warmup)}</Cell>
              <Cell>{joinNames(day.powerSpeed)}</Cell>
              <Cell>{joinNames(day.strength)}</Cell>
              <Cell>{joinNames(day.accessory)}</Cell>
              <Cell>{joinNames(day.conditioning)}</Cell>
              <Cell>{joinNames(day.mobilityPrehab)}</Cell>
              <Cell>{lead?.sets || "-"}</Cell>
              <Cell>{prescriptionValueUa(lead?.reps || "-")}</Cell>
              <Cell>{lead?.tempo || "-"}</Cell>
              <Cell>{prescriptionValueUa(lead?.rest || "-")}</Cell>
              <Cell>{prescriptionValueUa(lead?.intensity || "-")}</Cell>
              <Cell>{day.conditioning[0]?.intensity ? prescriptionValueUa(day.conditioning[0].intensity) : "Зона за методикою"}</Cell>
              <Cell>
                {languageMode !== "en" && ukrainianNote(day.coachNotesUa)}
                {languageMode === "ua_en" && day.coachNotesUa && day.coachNotesEn ? " / " : ""}
                {languageMode !== "ua" && day.coachNotesEn}
              </Cell>
              <Cell>
                {languageMode !== "en" && ukrainianNote(day.athleteNotesUa)}
                {languageMode === "ua_en" && day.athleteNotesUa && day.athleteNotesEn ? " / " : ""}
                {languageMode !== "ua" && day.athleteNotesEn}
              </Cell>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function InfoSheet({
  activeTab,
  program,
  languageMode,
  athleteProfile,
  combatProfile,
  combatLoad,
  programSettings,
  assessment,
  priorityScores,
}: {
  activeTab: string;
  program: GeneratedProgram;
  languageMode: LanguageMode;
  athleteProfile: AthleteProfile;
  combatProfile: CombatProfile;
  combatLoad: CombatLoad;
  programSettings: ProgramSettings;
  assessment: Assessment;
  priorityScores: PrioritySheetScore[];
}) {
  const rows = getInfoRows({
    activeTab,
    program,
    languageMode,
    athleteProfile,
    combatProfile,
    combatLoad,
    programSettings,
    assessment,
    priorityScores,
  });

  return (
    <table className="w-full min-w-[860px] border-collapse text-sm">
      <thead className="sticky top-0 bg-zinc-100 text-[10px] uppercase text-zinc-600">
        <tr>
          <th className="w-[220px] border border-zinc-300 px-2 py-2 text-left">Поле</th>
          <th className="border border-zinc-300 px-2 py-2 text-left">Значення</th>
          <th className="w-[360px] border border-zinc-300 px-2 py-2 text-left">Примітка тренера або спортсмена</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${row[0]}-${index}`}>
            <Cell strong>{row[0]}</Cell>
            <Cell>{row[1]}</Cell>
            <Cell>{row[2]}</Cell>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function getInfoRows({
  activeTab,
  program,
  languageMode,
  athleteProfile,
  combatProfile,
  combatLoad,
  programSettings,
  assessment,
  priorityScores,
}: {
  activeTab: string;
  program: GeneratedProgram;
  languageMode: LanguageMode;
  athleteProfile: AthleteProfile;
  combatProfile: CombatProfile;
  combatLoad: CombatLoad;
  programSettings: ProgramSettings;
  assessment: Assessment;
  priorityScores: PrioritySheetScore[];
}): string[][] {
  if (activeTab === "Профіль спортсмена") {
    return [
      ["Ім'я", athleteProfile.name || "-", "Постійні дані профілю"],
      ["Вид спорту", sportLabel(athleteProfile.sport), profileLabel(combatProfile)],
      ["Бойовий профіль", profileLabel(combatProfile), "Визначає шаблон програми"],
      ["Вік / стать", `${athleteProfile.age || "-"} / ${sexLabel(athleteProfile.sex)}`, "Для тренувального контексту"],
      ["Зріст / вага", `${athleteProfile.heightCm || "-"} см / ${athleteProfile.weightKg || "-"} кг`, "Для оцінки співвідношення сили до ваги"],
      ["Рівень", levelLabel(athleteProfile.level), "Впливає на інтерпретацію тренера"],
      ["Стаж силових тренувань", trainingAgeLabel(athleteProfile.strengthTrainingAge), "За малого стажу навантаження має бути помірним"],
      ["Обладнання", localizedList(athleteProfile.equipment), "Визначає вибір вправ"],
      ["Біль та обмеження", localizedList(athleteProfile.painAreas), "Не є діагнозом; потрібні безпечні заміни"],
    ];
  }

  if (activeTab === "Оцінювання") {
    return [
      ["Squat / Trap Bar", value(assessment.squatOrTrapBar, "кг"), "Показник базової сили"],
      ["Bench Press / Push-ups", value(assessment.benchOrPushups, "кг/повт."), "Показник сили верхньої частини тіла"],
      ["Pull-ups", value(assessment.pullups, "повт."), "Показник тягової сили й хвату"],
      ["Vertical Jump", value(assessment.verticalJump, "см"), "Показник потужності"],
      ["Broad Jump", value(assessment.broadJump, "см"), "Показник горизонтальної потужності"],
      ["Med Ball Throw", value(assessment.medBallThrow, "м"), "Показник ротаційної потужності"],
      ["10m Sprint", value(assessment.sprint10m, "с"), "Показник прискорення"],
      ["MAS", value(assessment.mas, "м/с"), "Для розрахунку бігових зон"],
      ["HR у спокої / макс. HR", `${assessment.restingHr || "-"} / ${assessment.hrMax || "-"}`, "Для розрахунку зон HR"],
      ...priorityScores.map((score) => [
        priorityLabel(score.label),
        `${score.score}/5`,
        localizedReason(score, languageMode),
      ]),
    ];
  }

  if (activeTab === "Цілі") {
    return [
      ["Опис програми", programSummaryUa(combatProfile, athleteProfile, programSettings), "Сформовано з профілю й параметрів"],
      ["Тривалість", `${programSettings.lengthWeeks} тижнів`, "Варіанти: 4 / 8 / 12"],
      ["Силові тренування", `${programSettings.scDaysPerWeek} на тиждень`, "Розмістити з урахуванням бойових тренувань"],
      ["Тривалість тренування", prescriptionValueUa(programSettings.sessionDuration), "Реалістична тривалість"],
      ["Фаза", phaseLabel(programSettings.phase), "Від міжсезоння до повернення після перерви"],
      ["Головна мета", goalLabel(programSettings.mainGoal), "Основна ціль адаптації"],
      ["Дата змагання", programSettings.competitionDate || "-", "Визначає зниження навантаження й контрольні тести"],
      ["Бойове навантаження", `ударні тренування: ${combatLoad.strikingSessions} / борцівські тренування: ${combatLoad.grapplingSessions} / технічні тренування: ${combatLoad.technicalSessions}`, "Для контексту тренувань"],
      ["Важкі дні", `важкі спаринги: ${combatLoad.hardSparringDays} / важка боротьба: ${combatLoad.hardGrapplingDays}`, "Впливає на оцінку тренера"],
    ];
  }

  if (activeTab === "Примітки до вправ") {
    const unique = new Map<string, string>();
    program.weeks.forEach((week) =>
      week.days.forEach((day) =>
        [...day.warmup, ...day.powerSpeed, ...day.strength, ...day.accessory, ...day.conditioning, ...day.mobilityPrehab].forEach((exercise) => {
          if (!unique.has(exercise.name)) {
            unique.set(exercise.name, [
              languageMode !== "en" ? ukrainianNote(exercise.notesUa) : "",
              languageMode !== "ua" ? exercise.notesEn : "",
            ].filter(Boolean).join(" / "));
          }
        }),
      ),
    );
    return Array.from(unique.entries()).map(([name, note]) => [name, note || "-", "Якість руху важливіша за вагу"]);
  }

  if (activeTab === "Зони витривалості") {
    return getZoneRows(assessment);
  }

  if (activeTab === "Контрольні тести") {
    return program.weeks
      .filter((week) => week.isCheckpoint || week.week === program.weeks.length)
      .map((week) => [`Тиждень ${week.week}`, programTextUa(week.blockName), programTextUa(week.focus)]);
  }

  if (activeTab === "Готовність") {
    return [
      ["Сон", `${assessment.sleep}/5`, assessment.sleep <= 2 ? "Сьогодні зменшити обсяг" : "Готовність у межах норми"],
      ["Стрес", `${assessment.stress}/5`, assessment.stress >= 4 ? "Не форсувати інтенсивність" : "Готовність у межах норми"],
      ["М'язовий біль", `${assessment.soreness}/5`, assessment.soreness >= 4 ? "Зменшити обсяг або додати відновлення" : "Готовність у межах норми"],
      ["Мотивація", `${assessment.motivation}/5`, assessment.motivation <= 2 ? "Спростити мету тренування" : "Готовність у межах норми"],
      ["Правило", "Поганий сон, високий стрес або сильний м'язовий біль зменшують обсяг", "Система враховує це в обсязі тренування"],
    ];
  }

  return [["Статус", activeTab, "Немає даних"]];
}

function Cell({ children, strong = false }: { children: ReactNode; strong?: boolean }) {
  return <td className={`border border-zinc-300 px-2 py-2 align-top leading-5 ${strong ? "font-bold" : ""}`}>{children}</td>;
}

function joinNames(items: { name: string }[]) {
  return items.map((item) => item.name).join(", ") || "-";
}

function buildWeekCsv(rows: ProgramDay[], languageMode: LanguageMode) {
  const header = [
    "День",
    "Мета тренування",
    "Блок",
    "Розминка",
    "Потужність і швидкість",
    "Сила",
    "Допоміжні вправи",
    "Витривалість",
    "Рухливість і профілактика",
    "Підходи",
    "Повторення",
    "Темп",
    "Відпочинок",
    "Інтенсивність",
    "Зона HR / MAS",
    "Примітки тренера",
    "Примітки спортсмена",
  ];
  const body = rows.map((day) => {
    const lead = day.strength[0] || day.powerSpeed[0] || day.accessory[0];
    const coachNotes = [
      languageMode !== "en" ? ukrainianNote(day.coachNotesUa) : "",
      languageMode !== "ua" ? day.coachNotesEn : "",
    ]
      .filter(Boolean)
      .join(" / ");
    const athleteNotes = [
      languageMode !== "en" ? ukrainianNote(day.athleteNotesUa) : "",
      languageMode !== "ua" ? day.athleteNotesEn : "",
    ]
      .filter(Boolean)
      .join(" / ");
    return [
      programTextUa(day.day),
      programTextUa(day.sessionGoal),
      programTextUa(day.block),
      joinNames(day.warmup),
      joinNames(day.powerSpeed),
      joinNames(day.strength),
      joinNames(day.accessory),
      joinNames(day.conditioning),
      joinNames(day.mobilityPrehab),
      lead?.sets || "-",
      prescriptionValueUa(lead?.reps || "-"),
      lead?.tempo || "-",
      prescriptionValueUa(lead?.rest || "-"),
      prescriptionValueUa(lead?.intensity || "-"),
      day.conditioning[0]?.intensity ? prescriptionValueUa(day.conditioning[0].intensity) : "Зона за методикою",
      coachNotes,
      athleteNotes,
    ];
  });
  return [header, ...body].map((row) => row.map(csvCell).join(",")).join("\n");
}

function buildWorkbookCsv({
  program,
  languageMode,
  athleteProfile,
  combatProfile,
  combatLoad,
  programSettings,
  assessment,
  priorityScores,
}: {
  program: GeneratedProgram;
  languageMode: LanguageMode;
  athleteProfile: AthleteProfile;
  combatProfile: CombatProfile;
  combatLoad: CombatLoad;
  programSettings: ProgramSettings;
  assessment: Assessment;
  priorityScores: PrioritySheetScore[];
}) {
  const header = [
    "Тиждень",
    "Блок",
    "Фокус тижня",
    "День",
    "Мета тренування",
    "Блок дня",
    "Розминка",
    "Потужність і швидкість",
    "Сила",
    "Допоміжні вправи",
    "Витривалість",
    "Рухливість і профілактика",
    "Підходи",
    "Повторення",
    "Темп",
    "Відпочинок",
    "Інтенсивність",
    "Зона HR / MAS",
    "Примітки тренера",
    "Примітки спортсмена",
  ];
  const weekRows = program.weeks.flatMap((week) =>
    week.days.map((day) => {
      const lead = day.strength[0] || day.powerSpeed[0] || day.accessory[0];
      const coachNotes = [
        languageMode !== "en" ? ukrainianNote(day.coachNotesUa) : "",
        languageMode !== "ua" ? day.coachNotesEn : "",
      ]
        .filter(Boolean)
        .join(" / ");
      const athleteNotes = [
        languageMode !== "en" ? ukrainianNote(day.athleteNotesUa) : "",
        languageMode !== "ua" ? day.athleteNotesEn : "",
      ]
        .filter(Boolean)
        .join(" / ");
      return [
        String(week.week),
        programTextUa(week.blockName),
        programTextUa(week.focus),
        programTextUa(day.day),
        programTextUa(day.sessionGoal),
        programTextUa(day.block),
        joinNames(day.warmup),
        joinNames(day.powerSpeed),
        joinNames(day.strength),
        joinNames(day.accessory),
        joinNames(day.conditioning),
        joinNames(day.mobilityPrehab),
        lead?.sets || "-",
        prescriptionValueUa(lead?.reps || "-"),
        lead?.tempo || "-",
        prescriptionValueUa(lead?.rest || "-"),
        prescriptionValueUa(lead?.intensity || "-"),
        day.conditioning[0]?.intensity ? prescriptionValueUa(day.conditioning[0].intensity) : "Зона за методикою",
        coachNotes,
        athleteNotes,
      ];
    }),
  );
  const sections = ["Профіль спортсмена", "Оцінювання", "Цілі", "Примітки до вправ", "Зони витривалості", "Контрольні тести", "Готовність"]
    .flatMap((tab) => [
      [tab, "", ""],
      ["Поле", "Значення", "Примітка тренера або спортсмена"],
      ...getInfoRows({
        activeTab: tab,
        program,
        languageMode,
        athleteProfile,
        combatProfile,
        combatLoad,
        programSettings,
        assessment,
        priorityScores,
      }),
      ["", "", ""],
    ]);
  return [
    ["Експорт книги Black Bear", "", ""],
    ...sections,
    ["Тижнева програма", "", ""],
    header,
    ...weekRows,
  ].map((row) => row.map(csvCell).join(",")).join("\n");
}

function buildExcelXmlWorkbook({
  program,
  languageMode,
  athleteProfile,
  combatProfile,
  combatLoad,
  programSettings,
  assessment,
  priorityScores,
}: {
  program: GeneratedProgram;
  languageMode: LanguageMode;
  athleteProfile: AthleteProfile;
  combatProfile: CombatProfile;
  combatLoad: CombatLoad;
  programSettings: ProgramSettings;
  assessment: Assessment;
  priorityScores: PrioritySheetScore[];
}) {
  const infoContext = {
    program,
    languageMode,
    athleteProfile,
    combatProfile,
    combatLoad,
    programSettings,
    assessment,
    priorityScores,
  };
  const sheets: Array<{ name: string; rows: string[][] }> = [
    ...["Профіль спортсмена", "Оцінювання", "Цілі"].map((tab) => ({
      name: tab,
      rows: [["Поле", "Значення", "Примітка тренера або спортсмена"], ...getInfoRows({ activeTab: tab, ...infoContext })],
    })),
    ...program.weeks.map((week) => ({
      name: `Тиждень ${week.week}`,
      rows: buildWeekRows(week.days, languageMode, ["День", "Мета тренування", "Блок", "Розминка", "Потужність і швидкість", "Сила", "Допоміжні вправи", "Витривалість", "Рухливість і профілактика", "Підходи", "Повторення", "Темп", "Відпочинок", "Інтенсивність", "Зона HR / MAS", "Примітки тренера", "Примітки спортсмена"]),
    })),
    ...["Примітки до вправ", "Зони витривалості", "Контрольні тести", "Готовність"].map((tab) => ({
      name: tab,
      rows: [["Поле", "Значення", "Примітка тренера або спортсмена"], ...getInfoRows({ activeTab: tab, ...infoContext })],
    })),
  ];

  const worksheets = sheets.map((sheet) => {
    const rowsXml = sheet.rows
      .map((row) => `<Row>${row.map((cell) => `<Cell><Data ss:Type="String">${xmlEscape(cell)}</Data></Cell>`).join("")}</Row>`)
      .join("");
    return `<Worksheet ss:Name="${xmlEscape(sheet.name.slice(0, 31))}"><Table>${rowsXml}</Table></Worksheet>`;
  }).join("");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Top" ss:WrapText="1"/>
   <Font ss:FontName="Aptos" ss:Size="10"/>
  </Style>
 </Styles>
 ${worksheets}
</Workbook>`;
}

function buildWeekRows(rows: ProgramDay[], languageMode: LanguageMode, header: string[]) {
  return [
    header,
    ...rows.map((day) => {
      const lead = day.strength[0] || day.powerSpeed[0] || day.accessory[0];
      const coachNotes = [
        languageMode !== "en" ? ukrainianNote(day.coachNotesUa) : "",
        languageMode !== "ua" ? day.coachNotesEn : "",
      ].filter(Boolean).join(" / ");
      const athleteNotes = [
        languageMode !== "en" ? ukrainianNote(day.athleteNotesUa) : "",
        languageMode !== "ua" ? day.athleteNotesEn : "",
      ].filter(Boolean).join(" / ");
      return [
        programTextUa(day.day),
        programTextUa(day.sessionGoal),
        programTextUa(day.block),
        joinNames(day.warmup),
        joinNames(day.powerSpeed),
        joinNames(day.strength),
        joinNames(day.accessory),
        joinNames(day.conditioning),
        joinNames(day.mobilityPrehab),
        lead?.sets || "-",
        prescriptionValueUa(lead?.reps || "-"),
        lead?.tempo || "-",
        prescriptionValueUa(lead?.rest || "-"),
        prescriptionValueUa(lead?.intensity || "-"),
        day.conditioning[0]?.intensity ? prescriptionValueUa(day.conditioning[0].intensity) : "Зона за методикою",
        coachNotes,
        athleteNotes,
      ];
    }),
  ];
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function xmlEscape(value: string) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function value(input: number | string | undefined, unit: string) {
  return input === "" || input === undefined ? "-" : `${input} ${unit}`;
}

function localizedReason(score: PrioritySheetScore, languageMode: LanguageMode) {
  return [
    languageMode !== "en" ? priorityReasonUa(score.reasonUa) : "",
    languageMode !== "ua" ? score.reasonEn : "",
  ].filter(Boolean).join(" / ");
}

function getZoneRows(assessment: Assessment) {
  const hrMax = Number(assessment.hrMax) || 0;
  const restingHr = Number(assessment.restingHr) || 0;
  const mas = Number(assessment.mas) || 0;
  const zone2Low = hrMax ? Math.round(hrMax * 0.6) : "";
  const zone2High = hrMax ? Math.round(hrMax * 0.7) : "";
  const zone3Low = hrMax ? Math.round(hrMax * 0.7) : "";
  const zone3High = hrMax ? Math.round(hrMax * 0.8) : "";
  const zone4Low = hrMax ? Math.round(hrMax * 0.8) : "";
  const zone4High = hrMax ? Math.round(hrMax * 0.9) : "";
  const hrrZone2 = hrMax && restingHr ? `${Math.round((hrMax - restingHr) * 0.6 + restingHr)}-${Math.round((hrMax - restingHr) * 0.7 + restingHr)} уд/хв` : "-";

  return [
    ["Зона HR 2", hrMax ? `${zone2Low}-${zone2High} уд/хв` : "Легкий темп із вільною розмовою", "Аеробна база"],
    ["Зона HR 3", hrMax ? `${zone3Low}-${zone3High} уд/хв` : "Помірний контрольований темп", "Темпова витривалість"],
    ["Зона HR 4", hrMax ? `${zone4Low}-${zone4High} уд/хв` : "Важко, але повторювано", "Спеціальні інтервали для раундів"],
    ["Зона HRR 2", hrrZone2, "Ураховує HR у спокої"],
    ["MAS 70%", mas ? `${(mas * 0.7).toFixed(2)} м/с` : "-", "Легкі аеробні інтервали"],
    ["MAS 85%", mas ? `${(mas * 0.85).toFixed(2)} м/с` : "-", "Темпова й порогова робота"],
    ["MAS 100%", mas ? `${mas.toFixed(2)} м/с` : "-", "Орієнтир максимальної аеробної швидкості"],
  ];
}
