import type { Key, ReactNode } from "react";
import { useState } from "react";
import { BarChart3, CalendarDays, CheckCircle2, ChevronDown, ClipboardList, Dumbbell, HeartPulse, ShieldCheck, Zap } from "lucide-react";
import { ExercisePrescription, GeneratedProgram, LanguageMode, ProgramDay } from "../../types";
import { Card } from "../ui/Base";

export const ProgramDashboard = ({
  program,
  languageMode,
}: {
  program: GeneratedProgram;
  languageMode: LanguageMode;
}) => {
  const [activeWeek, setActiveWeek] = useState(0);
  const [activeMobileDay, setActiveMobileDay] = useState(0);
  const week = program.weeks[activeWeek];
  const nextSession = week?.days[0];

  if (!week) return null;

  return (
    <div className="grid gap-5">
      <div className="grid gap-2 rounded-lg border border-[var(--bbp-border)] bg-[rgba(8,12,16,0.72)] p-2 md:grid-cols-[auto_1fr] md:items-center">
        <div className="px-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#c5f4ff]">Program weeks</p>
          <p className="text-xs text-[var(--bbp-muted)]">Tap a week to review sessions</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 md:justify-end md:pb-0">
          {program.weeks.map((item, index) => (
            <button
              key={item.week}
              type="button"
              onClick={() => {
                setActiveWeek(index);
                setActiveMobileDay(0);
              }}
              className={`min-w-[96px] rounded-md border px-3 py-2 text-left text-xs font-bold uppercase transition ${
                activeWeek === index
                  ? "border-[var(--bbp-border-strong)] bg-[var(--bbp-accent-soft)] text-[var(--bbp-text)]"
                  : "border-[var(--bbp-border)] bg-[rgba(7,11,15,0.92)] text-[var(--bbp-muted)] hover:border-[var(--bbp-border-strong)] hover:text-[var(--bbp-text)]"
              }`}
            >
              <span className="block">Week {item.week}</span>
              <span className="block text-[9px] opacity-70">{item.isCheckpoint ? "Checkpoint" : item.blockName}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <Card className="grid content-start gap-4 border-[var(--bbp-border-strong)] bg-[linear-gradient(145deg,rgba(14,22,30,0.98),rgba(7,12,18,0.98))]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#c5f4ff]">Active block</p>
            <h3 className="font-display mt-1 text-xl font-black text-white">{week.blockName}</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--bbp-muted)]">{week.focus}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-md border border-[var(--bbp-border)] bg-[rgba(5,9,13,0.48)] p-3">
              <p className="text-xl font-black text-white">{week.days.length}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--bbp-muted-strong)]">sessions</p>
            </div>
            <div className="rounded-md border border-[var(--bbp-border)] bg-[rgba(5,9,13,0.48)] p-3">
              <p className="text-xl font-black text-white">{week.isCheckpoint ? "Test" : "Build"}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--bbp-muted-strong)]">week type</p>
            </div>
          </div>
          <div className="grid gap-3 border-t border-[var(--bbp-border)] pt-4 text-sm leading-6 text-[var(--bbp-muted)]">
            <p>
              <span className="font-semibold text-white">Rule:</span> every 4th week reduces load and becomes a testing/checkpoint week.
            </p>
            <p>
              <span className="font-semibold text-white">Coach check:</span> do not stack heavy legs before sparring or heavy grip/neck/back before wrestling.
            </p>
          </div>
          {nextSession && (
            <div className="rounded-lg border border-[var(--bbp-border-strong)] bg-[var(--bbp-accent-soft)] p-3">
              <div className="flex items-center gap-2 text-[#c9f5ff]">
                <CalendarDays className="h-4 w-4" />
                <p className="text-[11px] font-bold uppercase tracking-[0.16em]">Next session</p>
              </div>
              <p className="mt-2 text-sm font-black text-white">{nextSession.day}</p>
              <p className="mt-1 text-sm leading-5 text-[var(--bbp-muted)]">{nextSession.sessionGoal}</p>
            </div>
          )}
          <WeeklyLoadChart days={week.days} />
        </Card>

        <div className="grid gap-4">
          <div className="grid gap-2 md:hidden">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--bbp-muted-strong)]">Training days</p>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#c9f5ff]">Show one day at a time</p>
            </div>
            <div className="grid grid-cols-3 gap-1 rounded-lg border border-[var(--bbp-border)] bg-[rgba(7,10,14,0.72)] p-1">
              {week.days.map((day, index) => (
                <button
                  key={`${day.day}-tab`}
                  type="button"
                  onClick={() => setActiveMobileDay(index)}
                  className={`min-h-10 rounded-md px-2 py-2 text-[11px] font-bold uppercase transition ${
                    activeMobileDay === index
                      ? "border border-[var(--bbp-border-strong)] bg-[var(--bbp-accent-soft)] text-[var(--bbp-text)]"
                      : "text-[var(--bbp-muted)] hover:bg-[rgba(255,255,255,0.03)] hover:text-[var(--bbp-text)]"
                  }`}
                >
                  {day.day}
                </button>
              ))}
            </div>
          </div>
          <div className="md:hidden">
            <DayCard day={week.days[activeMobileDay]} languageMode={languageMode} defaultOpen />
          </div>
          <div className="hidden gap-4 md:grid">
            {week.days.map((day, index) => (
              <DayCard key={day.day} day={day} languageMode={languageMode} defaultOpen={index === 0} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

function DayCard({ day, languageMode, defaultOpen = false }: { day: ProgramDay; languageMode: LanguageMode; key?: Key; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const totalExercises = [day.warmup, day.powerSpeed, day.strength, day.accessory, day.conditioning, day.mobilityPrehab].reduce(
    (sum, section) => sum + section.length,
    0,
  );

  return (
    <Card className="overflow-hidden p-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="grid w-full gap-2 border-b border-[var(--bbp-border)] bg-[rgba(7,11,15,0.95)] px-4 py-3 text-left transition hover:bg-[rgba(9,14,19,0.98)] md:pointer-events-none md:grid-cols-[1fr_minmax(220px,0.8fr)] md:items-center"
        aria-expanded={open}
      >
        <div>
          <div className="flex items-center justify-between gap-3 md:block">
            <h3 className="font-bold text-white">
              {day.day}: {day.sessionGoal}
            </h3>
            <div className="flex items-center gap-2 md:hidden">
              <span className="rounded-full border border-[var(--bbp-border)] bg-[rgba(255,255,255,0.03)] px-2 py-1 text-[10px] font-bold uppercase text-[var(--bbp-muted)]">
                {totalExercises} items
              </span>
              <ChevronDown className={`h-4 w-4 text-[var(--bbp-muted)] transition ${open ? "rotate-180 text-[#c9f5ff]" : ""}`} />
            </div>
          </div>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--bbp-muted-strong)]">{day.block}</p>
        </div>
        <div className="rounded-md border border-[var(--bbp-border)] bg-[rgba(255,255,255,0.02)] p-2 text-xs leading-5 text-[var(--bbp-muted)]">
          {languageMode !== "en" && day.coachNotesUa && <span>{day.coachNotesUa}</span>}
          {languageMode === "ua_en" && day.coachNotesUa && day.coachNotesEn && <span> / </span>}
          {languageMode !== "ua" && day.coachNotesEn && <span>{day.coachNotesEn}</span>}
        </div>
      </button>

      <div className={`${open ? "grid" : "hidden"} gap-5 p-4 md:grid`}>
        <ExerciseSection title="Warm-up" icon={<HeartPulse className="h-4 w-4" />} exercises={day.warmup} languageMode={languageMode} defaultOpen />
        <ExerciseSection title="Power / Speed" icon={<Zap className="h-4 w-4" />} exercises={day.powerSpeed} languageMode={languageMode} defaultOpen />
        <ExerciseSection title="Strength" icon={<Dumbbell className="h-4 w-4" />} exercises={day.strength} languageMode={languageMode} defaultOpen />
        <ExerciseSection title="Accessory" icon={<ClipboardList className="h-4 w-4" />} exercises={day.accessory} languageMode={languageMode} />
        <ExerciseSection title="Conditioning" icon={<HeartPulse className="h-4 w-4" />} exercises={day.conditioning} languageMode={languageMode} />
        <ExerciseSection title="Mobility / Prehab" icon={<ShieldCheck className="h-4 w-4" />} exercises={day.mobilityPrehab} languageMode={languageMode} />
      </div>
    </Card>
  );
}

function WeeklyLoadChart({ days }: { days: ProgramDay[] }) {
  const values = days.map((day) => {
    const sections = [day.warmup, day.powerSpeed, day.strength, day.accessory, day.conditioning, day.mobilityPrehab];
    return sections.reduce((sum, section) => sum + section.length, 0);
  });
  const max = Math.max(...values, 1);

  return (
    <div className="grid gap-3 rounded-lg border border-[var(--bbp-border)] bg-[rgba(6,10,14,0.72)] p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[var(--bbp-text)]">
          <BarChart3 className="h-4 w-4 text-[#c5f4ff]" />
          <p className="text-[11px] font-bold uppercase tracking-[0.16em]">Weekly density</p>
        </div>
        <CheckCircle2 className="h-4 w-4 text-[var(--bbp-muted-strong)]" />
      </div>
      <div className="flex h-20 items-end gap-2">
        {values.map((value, index) => (
          <div key={`${value}-${index}`} className="grid flex-1 gap-1">
            <div className="flex h-16 items-end rounded bg-[rgba(255,255,255,0.03)] p-1">
              <div
                className="w-full rounded-t bg-gradient-to-t from-[#6de0c0] via-[#67cfff] to-[#dff8ff]"
                style={{ height: `${Math.max(18, (value / max) * 100)}%` }}
              />
            </div>
            <p className="text-center text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--bbp-muted-strong)]">D{index + 1}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExerciseSection({
  title,
  icon,
  exercises,
  languageMode,
  defaultOpen = false,
}: {
  title: string;
  icon: ReactNode;
  exercises: ExercisePrescription[];
  languageMode: LanguageMode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (!exercises.length) return null;

  return (
    <section className="grid gap-2">
      <div className="hidden items-center gap-2 border-b border-[var(--bbp-border)] pb-2 text-[var(--bbp-muted)] md:flex">
        {icon}
        <h4 className="text-xs font-bold uppercase">{title}</h4>
      </div>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-12 items-center justify-between gap-3 rounded-lg border border-[var(--bbp-border)] bg-[rgba(7,10,14,0.72)] px-3 py-2 text-left text-[var(--bbp-text)] transition hover:border-[var(--bbp-border-strong)] md:hidden"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          {icon}
          <span>
            <span className="block text-xs font-bold uppercase text-white">{title}</span>
            <span className="block text-[11px] text-[var(--bbp-muted)]">{exercises.length} items</span>
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 text-[var(--bbp-muted)] transition ${open ? "rotate-180 text-[#c9f5ff]" : ""}`} />
      </button>
      <div className={`${open ? "grid" : "hidden"} gap-2 md:hidden`}>
        {exercises.map((exercise, index) => (
          <div key={`${exercise.name}-mobile-${index}`} className="rounded-lg border border-[var(--bbp-border)] bg-[rgba(6,10,14,0.82)] p-3">
            <p className="font-semibold text-white">{exercise.name}</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[var(--bbp-muted)]">
              <Metric label="Sets" value={exercise.sets || "-"} />
              <Metric label="Reps" value={exercise.reps || "-"} />
              <Metric label="Tempo" value={exercise.tempo || "-"} />
              <Metric label="Rest" value={exercise.rest || "-"} />
            </div>
            <p className="mt-2 rounded border border-[var(--bbp-border)] bg-[rgba(255,255,255,0.03)] p-2 text-xs leading-5 text-[var(--bbp-text)]">
              {exercise.intensity || "Coach-selected intensity"}
            </p>
            <div className="mt-2 text-xs leading-5 text-[var(--bbp-muted)]">
              {languageMode !== "en" && exercise.notesUa && <p>{exercise.notesUa}</p>}
              {languageMode !== "ua" && exercise.notesEn && <p>{exercise.notesEn}</p>}
            </div>
          </div>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase text-[var(--bbp-muted-strong)]">
              <th className="py-2 pr-3">Exercise</th>
              <th className="py-2 pr-3">Sets</th>
              <th className="py-2 pr-3">Reps</th>
              <th className="py-2 pr-3">Tempo</th>
              <th className="py-2 pr-3">Rest</th>
              <th className="py-2 pr-3">Intensity</th>
              <th className="py-2 pr-3">Notes</th>
            </tr>
          </thead>
          <tbody>
            {exercises.map((exercise, index) => (
              <tr key={`${exercise.name}-${index}`} className="border-t border-[rgba(255,255,255,0.04)] align-top">
                <td className="py-2 pr-3 font-semibold text-white">{exercise.name}</td>
                <td className="py-2 pr-3 text-[var(--bbp-muted)]">{exercise.sets || "-"}</td>
                <td className="py-2 pr-3 text-[var(--bbp-muted)]">{exercise.reps || "-"}</td>
                <td className="py-2 pr-3 text-[var(--bbp-muted)]">{exercise.tempo || "-"}</td>
                <td className="py-2 pr-3 text-[var(--bbp-muted)]">{exercise.rest || "-"}</td>
                <td className="py-2 pr-3 text-[var(--bbp-muted)]">{exercise.intensity || "-"}</td>
                <td className="max-w-[340px] py-2 pr-3 text-xs leading-5 text-[var(--bbp-muted)]">
                  {languageMode !== "en" && exercise.notesUa && <p>{exercise.notesUa}</p>}
                  {languageMode !== "ua" && exercise.notesEn && <p>{exercise.notesEn}</p>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-[var(--bbp-border)] bg-[rgba(255,255,255,0.03)] p-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--bbp-muted-strong)]">{label}</p>
      <p className="mt-1 font-semibold text-[var(--bbp-text)]">{value}</p>
    </div>
  );
}
