import type { Key, ReactNode } from "react";
import { useState } from "react";
import { ClipboardList, Dumbbell, HeartPulse, ShieldCheck, Zap } from "lucide-react";
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

  if (!week) return null;

  return (
    <div className="grid gap-5">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {program.weeks.map((item, index) => (
          <button
            key={item.week}
            type="button"
            onClick={() => setActiveWeek(index)}
            className={`min-w-[92px] border px-3 py-2 text-left text-xs font-bold uppercase tracking-[0.12em] transition ${
              activeWeek === index ? "border-white bg-white text-black" : "border-zinc-800 bg-black text-zinc-500 hover:text-zinc-200"
            }`}
          >
            <span className="block">Week {item.week}</span>
            <span className="block text-[9px] opacity-70">{item.isCheckpoint ? "Checkpoint" : item.blockName}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <Card className="grid content-start gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Block</p>
            <h3 className="mt-1 text-xl font-black text-white">{week.blockName}</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-300">{week.focus}</p>
          </div>
          <div className="grid gap-3 border-t border-zinc-900 pt-4 text-sm leading-6 text-zinc-300">
            <p>
              <span className="font-semibold text-white">Rule:</span> every 4th week reduces load and becomes a testing/checkpoint week.
            </p>
            <p>
              <span className="font-semibold text-white">Coach check:</span> do not stack heavy legs before sparring or heavy grip/neck/back before wrestling.
            </p>
          </div>
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
    <Card className="p-0">
      <div className="grid gap-2 border-b border-zinc-900 bg-zinc-950 px-4 py-3 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <h3 className="font-bold text-white">
            {day.day}: {day.sessionGoal}
          </h3>
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">{day.block}</p>
        </div>
        <div className="text-xs leading-5 text-zinc-400">
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
      <div className="flex items-center gap-2 border-b border-zinc-900 pb-2 text-zinc-400">
        {icon}
        <h4 className="text-xs font-bold uppercase tracking-[0.16em]">{title}</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-zinc-600">
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
