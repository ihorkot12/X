import React, { useState } from "react";
import { GeneratedProgram, LanguageMode, ProgramWeek, ProgramDay } from "../../types";
import { Card } from "../ui/Base";
import { Clock, Dumbbell, Zap, HeartPulse, ClipboardList } from "lucide-react";

export const ProgramDashboard = ({ 
  program, 
  languageMode 
}: { 
  program: GeneratedProgram; 
  languageMode: LanguageMode 
}) => {
  const [activeWeek, setActiveWeek] = useState(0);
  const week = program.weeks[activeWeek];

  if (!week) return null;

  return (
    <div className="space-y-8">
      {/* Week Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {program.weeks.map((w, idx) => (
          <button
            key={w.week}
            onClick={() => setActiveWeek(idx)}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
              activeWeek === idx 
                ? "bg-white text-black shadow-lg" 
                : "bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-zinc-800"
            }`}
          >
            Week {w.week} {w.isCheckpoint ? "(Deload)" : ""}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Week Summary */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="p-6 border-l-4 border-l-white">
            <h2 className="text-xl font-bold text-white mb-1">{week.blockName}</h2>
            <p className="text-sm text-zinc-400 mb-4">{week.focus}</p>
            <div className="space-y-4 pt-4 border-t border-zinc-800">
              <div className="flex items-start gap-3">
                <ClipboardList className="w-5 h-5 text-zinc-500 mt-1" />
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Coaching Notes</p>
                  <p className="text-sm text-zinc-300">
                    {languageMode !== "en" && "Приділяй увагу відновленню після важких спарингів. "}
                    {languageMode !== "ua" && "Focus on recovery after hard sparring sessions."}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Days List */}
        <div className="lg:col-span-8 space-y-6">
          {week.days.map((day, dIdx) => (
            <DayCard key={dIdx} day={day} languageMode={languageMode} />
          ))}
        </div>
      </div>
    </div>
  );
};

const DayCard = ({ day, languageMode }: { day: ProgramDay; languageMode: LanguageMode; key?: React.Key }) => {
  return (
    <Card className="p-0">
      <div className="bg-zinc-800/50 px-6 py-3 border-b border-zinc-800 flex justify-between items-center">
        <h3 className="font-bold text-white tracking-wide">{day.day} — {day.sessionGoal}</h3>
        <span className="text-[10px] font-bold bg-white text-black px-2 py-0.5 rounded uppercase">{day.block}</span>
      </div>
      <div className="p-6 space-y-6">
        <ExerciseSection title="Warm-up" icon={<HeartPulse className="w-4 h-4" />} exercises={day.warmup} languageMode={languageMode} />
        <ExerciseSection title="Power & Speed" icon={<Zap className="w-4 h-4 text-yellow-500" />} exercises={day.powerSpeed} languageMode={languageMode} />
        <ExerciseSection title="Main Strength" icon={<Dumbbell className="w-4 h-4 text-white" />} exercises={day.strength} languageMode={languageMode} />
        <ExerciseSection title="Accessory" icon={<ClipboardList className="w-4 h-4 text-zinc-500" />} exercises={day.accessory} languageMode={languageMode} />
      </div>
    </Card>
  );
};

const ExerciseSection = ({ title, icon, exercises, languageMode }: { title: string; icon: React.ReactNode; exercises: any[]; languageMode: LanguageMode }) => {
  if (exercises.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 border-b border-zinc-800/50 pb-2">
        {icon}
        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{title}</h4>
      </div>
      <div className="space-y-4">
        {exercises.map((ex, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-5">
              <p className="text-sm font-bold text-white">{ex.name}</p>
              {languageMode !== "en" && ex.notesUa && <p className="text-[11px] text-zinc-500 italic mt-0.5">{ex.notesUa}</p>}
              {languageMode !== "ua" && ex.notesEn && <p className="text-[11px] text-zinc-500 italic mt-0.5">{ex.notesEn}</p>}
            </div>
            <div className="col-span-12 md:col-span-7 flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              {ex.sets && <div><span className="text-zinc-400">Sets:</span> {ex.sets}</div>}
              {ex.reps && <div><span className="text-zinc-400">Reps:</span> {ex.reps}</div>}
              {ex.intensity && <div><span className="text-zinc-400">Int:</span> {ex.intensity}</div>}
              {ex.rest && <div><span className="text-zinc-400">Rest:</span> {ex.rest}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
