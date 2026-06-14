import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { FileSpreadsheet, Lock, Table } from "lucide-react";
import { Assessment, AthleteProfile, CombatLoad, CombatProfile, GeneratedProgram, LanguageMode, ProgramDay, ProgramSettings, SheetTab } from "../../types";
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
  const [activeTab, setActiveTab] = useState("Week 1");
  const tabs = useMemo<SheetTab[]>(() => {
    const weekTabs: SheetTab[] = program.weeks.map((week) => ({ name: `Week ${week.week}`, type: "week" }));
    return [
      { name: "Athlete Profile", type: "profile" },
      { name: "Assessment", type: "assessment" },
      { name: "Goals", type: "goals" },
      ...weekTabs,
      { name: "Exercise Notes", type: "notes" },
      { name: "Conditioning Zones", type: "zones" },
      { name: "Testing Checkpoints", type: "checkpoints" },
      { name: "Readiness", type: "readiness" },
    ];
  }, [program.weeks]);

  const activeWeek = program.weeks.find((week) => `Week ${week.week}` === activeTab) || program.weeks[0];
  const rows = activeTab.startsWith("Week") ? activeWeek.days : [];
  const canDownloadCsv = activeTab.startsWith("Week");

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
    <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 shadow-[0_16px_50px_rgba(0,0,0,0.28)]">
      <div className="grid gap-3 border-b border-zinc-800 bg-zinc-900/90 p-3 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-600 text-white">
            <Table className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">BBP_Program_Export</p>
            <p className="text-xs text-zinc-500">Google Sheets structure preview</p>
          </div>
        </div>
        <Button disabled className="w-full lg:w-auto">
          <Lock className="h-4 w-4" /> Export integration later
        </Button>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-zinc-800 bg-black/75 p-2">
        {tabs.map((tab) => (
          <button
            key={tab.name}
            type="button"
            onClick={() => setActiveTab(tab.name)}
            className={`whitespace-nowrap rounded-md border px-3 py-1.5 text-[11px] font-semibold transition ${
              activeTab === tab.name ? "border-amber-300 bg-amber-300 text-zinc-950" : "border-zinc-800 text-zinc-500 hover:text-zinc-200"
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      <div className="max-h-[620px] overflow-auto bg-white text-black">
        {activeTab.startsWith("Week") ? (
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

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 bg-zinc-900/90 p-3">
        <p className="text-xs leading-5 text-zinc-500">
          Final MVP output should generate this as a styled Google Sheet with profile, tests, weekly plan, notes, zones, checkpoints, and readiness.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" disabled={!canDownloadCsv} onClick={downloadActiveTabCsv}>
            Download active week CSV
          </Button>
          <Button variant="secondary" onClick={downloadFullProgramCsv}>
            Download workbook CSV
          </Button>
          <Button variant="secondary" onClick={downloadExcelWorkbook}>
            Download Excel workbook
          </Button>
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-zinc-500">
            <FileSpreadsheet className="h-4 w-4" /> OTA-style structure, Black Bear logic
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
            "Day",
            "Session Goal",
            "Block",
            "Warm-Up",
            "Power / Speed",
            "Strength",
            "Accessory",
            "Conditioning",
            "Mobility / Prehab",
            "Sets",
            "Reps",
            "Tempo",
            "Rest",
            "Intensity",
            "HR Zone / MAS",
            "Coach Notes",
            "Athlete Notes",
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
              <Cell strong>{day.day}</Cell>
              <Cell>{day.sessionGoal}</Cell>
              <Cell>{day.block}</Cell>
              <Cell>{joinNames(day.warmup)}</Cell>
              <Cell>{joinNames(day.powerSpeed)}</Cell>
              <Cell>{joinNames(day.strength)}</Cell>
              <Cell>{joinNames(day.accessory)}</Cell>
              <Cell>{joinNames(day.conditioning)}</Cell>
              <Cell>{joinNames(day.mobilityPrehab)}</Cell>
              <Cell>{lead?.sets || "-"}</Cell>
              <Cell>{lead?.reps || "-"}</Cell>
              <Cell>{lead?.tempo || "-"}</Cell>
              <Cell>{lead?.rest || "-"}</Cell>
              <Cell>{lead?.intensity || "-"}</Cell>
              <Cell>{day.conditioning[0]?.intensity || "Zone by method"}</Cell>
              <Cell>
                {languageMode !== "en" && day.coachNotesUa}
                {languageMode === "ua_en" && day.coachNotesUa && day.coachNotesEn ? " / " : ""}
                {languageMode !== "ua" && day.coachNotesEn}
              </Cell>
              <Cell>
                {languageMode !== "en" && day.athleteNotesUa}
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
          <th className="w-[220px] border border-zinc-300 px-2 py-2 text-left">Field</th>
          <th className="border border-zinc-300 px-2 py-2 text-left">Value</th>
          <th className="w-[360px] border border-zinc-300 px-2 py-2 text-left">Coach / Athlete Note</th>
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
  if (activeTab === "Athlete Profile") {
    return [
      ["Name", athleteProfile.name || "-", "Stable profile data"],
      ["Sport", athleteProfile.sport, profileLabel(combatProfile)],
      ["Combat profile", profileLabel(combatProfile), "Program template is filtered from this"],
      ["Age / Sex", `${athleteProfile.age || "-"} / ${athleteProfile.sex}`, "Use for coaching context"],
      ["Height / Weight", `${athleteProfile.heightCm || "-"} cm / ${athleteProfile.weightKg || "-"} kg`, "Used for strength ratio"],
      ["Level", athleteProfile.level, "Affects coaching interpretation"],
      ["Strength training age", athleteProfile.strengthTrainingAge, "Use conservative loading if low"],
      ["Equipment", list(athleteProfile.equipment), "Exercise selection should respect this"],
      ["Pain / risk flags", list(athleteProfile.painAreas), "Not a diagnosis; use for safer substitutions"],
    ];
  }

  if (activeTab === "Assessment") {
    return [
      ["Squat / Trap Bar", value(assessment.squatOrTrapBar, "kg"), "Strength base marker"],
      ["Bench / Push-Ups", value(assessment.benchOrPushups, "kg/reps"), "Upper strength marker"],
      ["Pull-Ups", value(assessment.pullups, "reps"), "Pulling/grip marker"],
      ["Vertical Jump", value(assessment.verticalJump, "cm"), "Power marker"],
      ["Broad Jump", value(assessment.broadJump, "cm"), "Horizontal power marker"],
      ["Med Ball Throw", value(assessment.medBallThrow, "m"), "Rotational/upper power marker"],
      ["10m Sprint", value(assessment.sprint10m, "s"), "Acceleration marker"],
      ["MAS", value(assessment.mas, "m/s"), "Used for running zones if available"],
      ["Resting HR / HR Max", `${assessment.restingHr || "-"} / ${assessment.hrMax || "-"}`, "Used for HR zones if available"],
      ...priorityScores.map((score) => [
        score.label,
        `${score.score}/5`,
        localizedReason(score, languageMode),
      ]),
    ];
  }

  if (activeTab === "Goals") {
    return [
      ["Program summary", program.summary, "Generated from profile and settings"],
      ["Length", `${programSettings.lengthWeeks} weeks`, "Options: 4 / 8 / 12"],
      ["S&C days", `${programSettings.scDaysPerWeek} days/week`, "Place around combat practice"],
      ["Session duration", programSettings.sessionDuration, "Keep sessions realistic"],
      ["Phase", programSettings.phase, "Off-season, pre-camp, fight camp, in-season, or return"],
      ["Main goal", programSettings.mainGoal, "Primary adaptation target"],
      ["Competition date", programSettings.competitionDate || "-", "Use to guide taper and checkpoint timing"],
      ["Combat weekly load", `${combatLoad.strikingSessions} striking / ${combatLoad.grapplingSessions} grappling / ${combatLoad.technicalSessions} technical`, "Avoid stacking hard days"],
      ["Hard days", `${combatLoad.hardSparringDays} hard sparring / ${combatLoad.hardGrapplingDays} hard wrestling`, "Controls conflict notes"],
    ];
  }

  if (activeTab === "Exercise Notes") {
    const unique = new Map<string, string>();
    program.weeks.forEach((week) =>
      week.days.forEach((day) =>
        [...day.warmup, ...day.powerSpeed, ...day.strength, ...day.accessory, ...day.conditioning, ...day.mobilityPrehab].forEach((exercise) => {
          if (!unique.has(exercise.name)) {
            unique.set(exercise.name, [
              languageMode !== "en" ? exercise.notesUa : "",
              languageMode !== "ua" ? exercise.notesEn : "",
            ].filter(Boolean).join(" / "));
          }
        }),
      ),
    );
    return Array.from(unique.entries()).map(([name, note]) => [name, note || "-", "Keep quality before load"]);
  }

  if (activeTab === "Conditioning Zones") {
    return getZoneRows(assessment);
  }

  if (activeTab === "Testing Checkpoints") {
    return program.weeks
      .filter((week) => week.isCheckpoint || week.week === program.weeks.length)
      .map((week) => [`Week ${week.week}`, week.blockName, week.focus]);
  }

  if (activeTab === "Readiness") {
    return [
      ["Sleep", `${assessment.sleep}/5`, assessment.sleep <= 2 ? "Reduce volume today" : "Normal readiness input"],
      ["Stress", `${assessment.stress}/5`, assessment.stress >= 4 ? "Avoid forcing intensity" : "Normal readiness input"],
      ["Soreness", `${assessment.soreness}/5`, assessment.soreness >= 4 ? "Reduce volume or use recovery option" : "Normal readiness input"],
      ["Motivation", `${assessment.motivation}/5`, assessment.motivation <= 2 ? "Use simpler session target" : "Normal readiness input"],
      ["Rule", "Bad sleep, high stress, or high soreness lowers volume", "Program engine uses this for session volume"],
    ];
  }

  return [["Status", activeTab, "No data"]];
}

function Cell({ children, strong = false }: { children: ReactNode; strong?: boolean }) {
  return <td className={`border border-zinc-300 px-2 py-2 align-top leading-5 ${strong ? "font-bold" : ""}`}>{children}</td>;
}

function joinNames(items: { name: string }[]) {
  return items.map((item) => item.name).join(", ") || "-";
}

function buildWeekCsv(rows: ProgramDay[], languageMode: LanguageMode) {
  const header = [
    "Day",
    "Session Goal",
    "Block",
    "Warm-Up",
    "Power / Speed",
    "Strength",
    "Accessory",
    "Conditioning",
    "Mobility / Prehab",
    "Sets",
    "Reps",
    "Tempo",
    "Rest",
    "Intensity",
    "HR Zone / MAS",
    "Coach Notes",
    "Athlete Notes",
  ];
  const body = rows.map((day) => {
    const lead = day.strength[0] || day.powerSpeed[0] || day.accessory[0];
    const coachNotes = [
      languageMode !== "en" ? day.coachNotesUa : "",
      languageMode !== "ua" ? day.coachNotesEn : "",
    ]
      .filter(Boolean)
      .join(" / ");
    const athleteNotes = [
      languageMode !== "en" ? day.athleteNotesUa : "",
      languageMode !== "ua" ? day.athleteNotesEn : "",
    ]
      .filter(Boolean)
      .join(" / ");
    return [
      day.day,
      day.sessionGoal,
      day.block,
      joinNames(day.warmup),
      joinNames(day.powerSpeed),
      joinNames(day.strength),
      joinNames(day.accessory),
      joinNames(day.conditioning),
      joinNames(day.mobilityPrehab),
      lead?.sets || "-",
      lead?.reps || "-",
      lead?.tempo || "-",
      lead?.rest || "-",
      lead?.intensity || "-",
      day.conditioning[0]?.intensity || "Zone by method",
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
    "Week",
    "Block",
    "Week Focus",
    "Day",
    "Session Goal",
    "Day Block",
    "Warm-Up",
    "Power / Speed",
    "Strength",
    "Accessory",
    "Conditioning",
    "Mobility / Prehab",
    "Sets",
    "Reps",
    "Tempo",
    "Rest",
    "Intensity",
    "HR Zone / MAS",
    "Coach Notes",
    "Athlete Notes",
  ];
  const weekRows = program.weeks.flatMap((week) =>
    week.days.map((day) => {
      const lead = day.strength[0] || day.powerSpeed[0] || day.accessory[0];
      const coachNotes = [
        languageMode !== "en" ? day.coachNotesUa : "",
        languageMode !== "ua" ? day.coachNotesEn : "",
      ]
        .filter(Boolean)
        .join(" / ");
      const athleteNotes = [
        languageMode !== "en" ? day.athleteNotesUa : "",
        languageMode !== "ua" ? day.athleteNotesEn : "",
      ]
        .filter(Boolean)
        .join(" / ");
      return [
        String(week.week),
        week.blockName,
        week.focus,
        day.day,
        day.sessionGoal,
        day.block,
        joinNames(day.warmup),
        joinNames(day.powerSpeed),
        joinNames(day.strength),
        joinNames(day.accessory),
        joinNames(day.conditioning),
        joinNames(day.mobilityPrehab),
        lead?.sets || "-",
        lead?.reps || "-",
        lead?.tempo || "-",
        lead?.rest || "-",
        lead?.intensity || "-",
        day.conditioning[0]?.intensity || "Zone by method",
        coachNotes,
        athleteNotes,
      ];
    }),
  );
  const sections = ["Athlete Profile", "Assessment", "Goals", "Exercise Notes", "Conditioning Zones", "Testing Checkpoints", "Readiness"]
    .flatMap((tab) => [
      [tab, "", ""],
      ["Field", "Value", "Coach / Athlete Note"],
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
    ["BBP Workbook Export", "", ""],
    ...sections,
    ["Weekly Program", "", ""],
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
    ...["Athlete Profile", "Assessment", "Goals"].map((tab) => ({
      name: tab,
      rows: [["Field", "Value", "Coach / Athlete Note"], ...getInfoRows({ activeTab: tab, ...infoContext })],
    })),
    ...program.weeks.map((week) => ({
      name: `Week ${week.week}`,
      rows: buildWeekRows(week.days, languageMode, ["Day", "Session Goal", "Block", "Warm-Up", "Power / Speed", "Strength", "Accessory", "Conditioning", "Mobility / Prehab", "Sets", "Reps", "Tempo", "Rest", "Intensity", "HR Zone / MAS", "Coach Notes", "Athlete Notes"]),
    })),
    ...["Exercise Notes", "Conditioning Zones", "Testing Checkpoints", "Readiness"].map((tab) => ({
      name: tab,
      rows: [["Field", "Value", "Coach / Athlete Note"], ...getInfoRows({ activeTab: tab, ...infoContext })],
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
        languageMode !== "en" ? day.coachNotesUa : "",
        languageMode !== "ua" ? day.coachNotesEn : "",
      ].filter(Boolean).join(" / ");
      const athleteNotes = [
        languageMode !== "en" ? day.athleteNotesUa : "",
        languageMode !== "ua" ? day.athleteNotesEn : "",
      ].filter(Boolean).join(" / ");
      return [
        day.day,
        day.sessionGoal,
        day.block,
        joinNames(day.warmup),
        joinNames(day.powerSpeed),
        joinNames(day.strength),
        joinNames(day.accessory),
        joinNames(day.conditioning),
        joinNames(day.mobilityPrehab),
        lead?.sets || "-",
        lead?.reps || "-",
        lead?.tempo || "-",
        lead?.rest || "-",
        lead?.intensity || "-",
        day.conditioning[0]?.intensity || "Zone by method",
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

function profileLabel(profile: CombatProfile) {
  if (profile === "grappler") return "Grappler";
  if (profile === "striker") return "Striker";
  return "Striker + Grappler";
}

function list(items: string[]) {
  return items.length ? items.join(", ") : "-";
}

function value(input: number | string | undefined, unit: string) {
  return input === "" || input === undefined ? "-" : `${input} ${unit}`;
}

function localizedReason(score: PrioritySheetScore, languageMode: LanguageMode) {
  return [
    languageMode !== "en" ? score.reasonUa : "",
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
  const hrrZone2 = hrMax && restingHr ? `${Math.round((hrMax - restingHr) * 0.6 + restingHr)}-${Math.round((hrMax - restingHr) * 0.7 + restingHr)} bpm` : "-";

  return [
    ["HR Zone 2", hrMax ? `${zone2Low}-${zone2High} bpm` : "Use nasal/easy talk pace", "Aerobic base / mitochondria work"],
    ["HR Zone 3", hrMax ? `${zone3Low}-${zone3High} bpm` : "Moderate controlled pace", "Tempo conditioning"],
    ["HR Zone 4", hrMax ? `${zone4Low}-${zone4High} bpm` : "Hard but repeatable", "Round-specific intervals"],
    ["HRR Zone 2", hrrZone2, "Uses resting HR when available"],
    ["MAS 70%", mas ? `${(mas * 0.7).toFixed(2)} m/s` : "-", "Easy aerobic intervals"],
    ["MAS 85%", mas ? `${(mas * 0.85).toFixed(2)} m/s` : "-", "Tempo / threshold work"],
    ["MAS 100%", mas ? `${mas.toFixed(2)} m/s` : "-", "Max aerobic speed reference"],
  ];
}
