import type { Key, ReactNode } from "react";
import { useState } from "react";
import { BarChart3, CalendarDays, CheckCircle2, ClipboardList, Dumbbell, HeartPulse, ShieldCheck, Zap } from "lucide-react";
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
  const week = program.weeks[activeWeek];
  const nextSession = week?.days[0];

  if (!week) return null;

  return (
    <div className="grid gap-5">
      <div className="grid gap-2 rounded-lg border border-zinc-800 bg-black/45 p-2 md:grid-cols-[auto_1fr] md:items-center">
        <div className="px-2">
          <p className="text-[11px] font-bold uppercase text-amber-300">Program weeks</p>
          <p className="text-xs text-zinc-500">Tap a week to review sessions</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 md:justify-end md:pb-0">
        {program.weeks.map((item, index) => (
          <button
            key={item.week}
            type="button"
            onClick={() => setActiveWeek(index)}
            className={`min-w-[96px] rounded-md border px-3 py-2 text-left text-xs font-bold uppercase transition ${
              activeWeek === index ? "border-amber-300 bg-amber-300 text-zinc-950" : "border-zinc-800 bg-zinc-950 text-zinc-500 hover:text-zinc-200"
            }`}
          >
            <span className="block">Week {item.week}</span>
            <span className="block text-[9px] opacity-70">{item.isCheckpoint ? "Checkpoint" : item.blockName}</span>
          </button>
        ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <Card className="grid content-start gap-4 border-amber-300/20 bg-[linear-gradient(145deg,rgba(24,24,27,0.96),rgba(12,10,7,0.96))]">
          <div>
            <p className="text-[11px] font-bold uppercase text-amber-300">Active block</p>
            <h3 className="mt-1 text-xl font-black text-white">{week.blockName}</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-300">{week.focus}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-md border border-zinc-800 bg-black/45 p-3">
              <p className="text-xl font-black text-white">{week.days.length}</p>
              <p className="text-[10px] font-bold uppercase text-zinc-500">sessions</p>
            </div>
            <div className="rounded-md border border-zinc-800 bg-black/45 p-3">
              <p className="text-xl font-black text-white">{week.isCheckpoint ? "Test" : "Build"}</p>
              <p className="text-[10px] font-bold uppercase text-zinc-500">week type</p>
            </div>
          </div>
          <div className="grid gap-3 border-t border-zinc-800 pt-4 text-sm leading-6 text-zinc-300">
            <p>
              <span className="font-semibold text-white">Rule:</span> every 4th week reduces load and becomes a testing/checkpoint week.
            </p>
            <p>
              <span className="font-semibold text-white">Coach check:</span> do not stack heavy legs before sparring or heavy grip/neck/back before wrestling.
            </p>
          </div>
          {nextSession && (
            <div className="rounded-lg border border-amber-300/20 bg-amber-300/5 p-3">
              <div className="flex items-center gap-2 text-amber-200">
                <CalendarDays className="h-4 w-4" />
                <p className="text-[11px] font-bold uppercase">Next session</p>
              </div>
              <p className="mt-2 text-sm font-black text-white">{nextSession.day}</p>
              <p className="mt-1 text-sm leading-5 text-zinc-300">{nextSession.sessionGoal}</p>
            </div>
          )}
          <WeeklyLoadChart days={week.days} />
        </Card>

        <div className="grid gap-4">
          {week.days.map((day) => (
            <DayCard key={day.day} day={day} languageMode={languageMode} />
          ))}
        </div>
      </div>
    </div>
  );
};

function DayCard({ day, languageMode }: { day: ProgramDay; languageMode: LanguageMode; key?: Key }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="grid gap-2 border-b border-zinc-800 bg-zinc-950/90 px-4 py-3 md:grid-cols-[1fr_minmax(220px,0.8fr)] md:items-center">
        <div>
          <h3 className="font-bold text-white">
            {day.day}: {day.sessionGoal}
          </h3>
          <p className="text-xs uppercase text-zinc-600">{day.block}</p>
        </div>
        <div className="rounded-md border border-zinc-800 bg-black/35 p-2 text-xs leading-5 text-zinc-400">
          {languageMode !== "en" && day.coachNotesUa && <span>{day.coachNotesUa}</span>}
          {languageMode === "ua_en" && day.coachNotesUa && day.coachNotesEn && <span> / </span>}
          {languageMode !== "ua" && day.coachNotesEn && <span>{day.coachNotesEn}</span>}
        </div>
      </div>

      <div className="grid gap-5 p-4">
        <ExerciseSection title="Warm-up" icon={<HeartPulse className="h-4 w-4" />} exercises={day.warmup} languageMode={languageMode} />
        <ExerciseSection title="Power / Speed" icon={<Zap className="h-4 w-4" />} exercises={day.powerSpeed} languageMode={languageMode} />
        <ExerciseSection title="Strength" icon={<Dumbbell className="h-4 w-4" />} exercises={day.strength} languageMode={languageMode} />
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
    <div className="grid gap-3 rounded-lg border border-zinc-800 bg-black/35 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-zinc-300">
          <BarChart3 className="h-4 w-4 text-emerald-200" />
          <p className="text-[11px] font-bold uppercase">Weekly density</p>
        </div>
        <CheckCircle2 className="h-4 w-4 text-zinc-600" />
      </div>
      <div className="flex h-20 items-end gap-2">
        {values.map((value, index) => (
          <div key={`${value}-${index}`} className="grid flex-1 gap-1">
            <div className="flex h-16 items-end rounded bg-zinc-950 p-1">
              <div
                className="w-full rounded-t bg-gradient-to-t from-emerald-600 to-amber-200"
                style={{ height: `${Math.max(18, (value / max) * 100)}%` }}
              />
            </div>
            <p className="text-center text-[10px] font-bold uppercase text-zinc-600">D{index + 1}</p>
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
}: {
  title: string;
  icon: ReactNode;
  exercises: ExercisePrescription[];
  languageMode: LanguageMode;
}) {
  if (!exercises.length) return null;

  return (
    <section className="grid gap-2">
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 text-zinc-400">
        {icon}
        <h4 className="text-xs font-bold uppercase">{title}</h4>
      </div>
      <div className="grid gap-2 md:hidden">
        {exercises.map((exercise, index) => (
          <div key={`${exercise.name}-mobile-${index}`} className="rounded-lg border border-zinc-800 bg-black/55 p-3">
            <p className="font-semibold text-white">{exercise.name}</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-zinc-400">
              <Metric label="Sets" value={exercise.sets || "-"} />
              <Metric label="Reps" value={exercise.reps || "-"} />
              <Metric label="Tempo" value={exercise.tempo || "-"} />
              <Metric label="Rest" value={exercise.rest || "-"} />
            </div>
            <p className="mt-2 rounded border border-zinc-800 bg-zinc-950 p-2 text-xs leading-5 text-zinc-300">{exercise.intensity || "Coach-selected intensity"}</p>
            <div className="mt-2 text-xs leading-5 text-zinc-400">
              {languageMode !== "en" && exercise.notesUa && <p>{exercise.notesUa}</p>}
              {languageMode !== "ua" && exercise.notesEn && <p>{exercise.notesEn}</p>}
            </div>
          </div>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase text-zinc-600">
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
              <tr key={`${exercise.name}-${index}`} className="border-t border-zinc-900 align-top">
                <td className="py-2 pr-3 font-semibold text-white">{exercise.name}</td>
                <td className="py-2 pr-3 text-zinc-400">{exercise.sets || "-"}</td>
                <td className="py-2 pr-3 text-zinc-400">{exercise.reps || "-"}</td>
                <td className="py-2 pr-3 text-zinc-400">{exercise.tempo || "-"}</td>
                <td className="py-2 pr-3 text-zinc-400">{exercise.rest || "-"}</td>
                <td className="py-2 pr-3 text-zinc-400">{exercise.intensity || "-"}</td>
                <td className="max-w-[340px] py-2 pr-3 text-xs leading-5 text-zinc-400">
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
    <div className="rounded border border-zinc-800 bg-zinc-950 p-2">
      <p className="text-[10px] font-bold uppercase text-zinc-600">{label}</p>
      <p className="mt-1 font-semibold text-zinc-200">{value}</p>
    </div>
  );
}
