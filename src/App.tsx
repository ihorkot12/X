import React, { useState } from "react";
import { 
  UserMode, 
  LanguageMode, 
  CombatProfile, 
  CombatLoad, 
  AthleteProfile, 
  ProgramSettings, 
  Assessment, 
  GeneratedProgram 
} from "./types";
import { generateProgram } from "./lib/programEngine";
import { Card, Button, Input, SegmentedControl } from "./components/ui/Base";
import { AssessmentInputs } from "./components/forms/AssessmentInputs";
import { ProgramDashboard } from "./components/program/ProgramDashboard";
import { SheetPreview } from "./components/sheets/SheetPreview";
import { Shield, ChevronRight, ChevronLeft, Target, Activity, Layout, FileSpreadsheet, User, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function App() {
  const [step, setStep] = useState(1);
  const [userMode, setUserMode] = useState<UserMode>("athlete");
  const [languageMode, setLanguageMode] = useState<LanguageMode>("ua_en");

  const [combatProfile, setCombatProfile] = useState<CombatProfile>("hybrid");
  const [combatLoad, setCombatLoad] = useState<CombatLoad>({
    strikingSessions: 3,
    grapplingSessions: 2,
    hardSparringDays: 1,
    hardGrapplingDays: 1,
    technicalSessions: 2,
  });

  const [athleteProfile, setAthleteProfile] = useState<AthleteProfile>({
    name: "",
    age: "",
    sex: "Male",
    heightCm: "",
    weightKg: "",
    sport: "MMA",
    level: "Amateur",
    strengthTrainingAge: "1-3 years",
    equipment: ["Barbell", "Dumbbells"],
    painAreas: [],
  });

  const [programSettings, setProgramSettings] = useState<ProgramSettings>({
    lengthWeeks: 8,
    scDaysPerWeek: 3,
    sessionDuration: "60 min",
    phase: "Off-season",
    mainGoal: "Strength & Power",
  });

  const [assessment, setAssessment] = useState<Assessment>({
    squatOrTrapBar: "",
    benchOrPushups: "",
    pullups: "",
    verticalJump: "",
    broadJump: "",
    medBallThrow: "",
    sleep: 4,
    stress: 3,
    soreness: 2,
    motivation: 5,
  });

  const [program, setProgram] = useState<GeneratedProgram | null>(null);

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const handleGenerate = () => {
    const res = generateProgram({
      combatProfile,
      combatLoad,
      athleteProfile,
      programSettings,
      assessment
    });
    setProgram(res);
    nextStep();
  };

  const STEPS = [
    { name: "Start", icon: <Shield className="w-4 h-4" /> },
    { name: "Profile", icon: <Target className="w-4 h-4" /> },
    { name: "Athlete", icon: <User className="w-4 h-4" /> },
    { name: "Settings", icon: <Activity className="w-4 h-4" /> },
    { name: "Assessment", icon: <Info className="w-4 h-4" /> },
    { name: "Program", icon: <Layout className="w-4 h-4" /> },
    { name: "Export", icon: <FileSpreadsheet className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-black text-zinc-300 font-sans p-4 md:p-8 selection:bg-white selection:text-black">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tighter uppercase leading-none">Black Bear</h1>
              <p className="text-[10px] font-bold text-zinc-500 tracking-[0.2em] uppercase">Performance S&C</p>
            </div>
          </div>

          <nav className="flex items-center gap-1 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800/50">
            {STEPS.map((s, i) => (
              <div 
                key={s.name} 
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${
                  step === i + 1 ? "bg-zinc-800 text-white" : "text-zinc-600"
                }`}
              >
                {s.icon}
                <span className="hidden lg:inline">{s.name}</span>
              </div>
            ))}
          </nav>
        </header>

        {/* Main Content Area */}
        <main className="min-h-[500px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {step === 1 && (
                <div className="max-w-2xl mx-auto space-y-8 pt-12">
                  <div className="text-center space-y-2">
                    <h2 className="text-4xl font-black text-white tracking-tight">Evolve Your Combat Performance.</h2>
                    <p className="text-zinc-400 text-lg">Bespoke strength and conditioning for the modern combat athlete.</p>
                  </div>
                  
                  <Card className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <SegmentedControl 
                        label="Language" 
                        value={languageMode} 
                        onChange={setLanguageMode} 
                        options={[{ label: "UA", value: "ua" }, { label: "EN", value: "en" }, { label: "UA+EN", value: "ua_en" }]} 
                      />
                      <SegmentedControl 
                        label="User Mode" 
                        value={userMode} 
                        onChange={setUserMode} 
                        options={[{ label: "Athlete", value: "athlete" }, { label: "Coach", value: "coach" }]} 
                      />
                    </div>
                    <div className="pt-4">
                      <Button onClick={nextStep} className="w-full text-lg py-4">Start Assessment</Button>
                    </div>
                  </Card>
                </div>
              )}

              {step === 2 && (
                <div className="max-w-3xl mx-auto space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {(['grappler', 'striker', 'hybrid'] as CombatProfile[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => setCombatProfile(p)}
                        className={`p-6 rounded-xl border transition-all text-left space-y-3 ${
                          combatProfile === p 
                            ? "bg-white border-white text-black" 
                            : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                        }`}
                      >
                        <h3 className="font-bold uppercase tracking-widest">{p}</h3>
                        <p className="text-xs leading-relaxed opacity-70">
                          {p === 'grappler' && "Posterior chain, grip, neck, trunk, and carries."}
                          {p === 'striker' && "Elastic power, rotational power, and aerobic base."}
                          {p === 'hybrid' && "Balanced plan, volume management, and mma focus."}
                        </p>
                      </button>
                    ))}
                  </div>
                  <NavigationButtons prev={prevStep} next={nextStep} />
                </div>
              )}

              {step === 3 && (
                <div className="max-w-3xl mx-auto space-y-8">
                  <Card className="p-8 space-y-8">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input label="Name" value={athleteProfile.name} onChange={(v) => setAthleteProfile({...athleteProfile, name: v})} />
                        <Input label="Sport" value={athleteProfile.sport} onChange={(v) => setAthleteProfile({...athleteProfile, sport: v})} />
                        <Input label="Level" value={athleteProfile.level} onChange={(v) => setAthleteProfile({...athleteProfile, level: v})} />
                        <Input label="Training Age" value={athleteProfile.strengthTrainingAge} onChange={(v) => setAthleteProfile({...athleteProfile, strengthTrainingAge: v})} />
                     </div>
                  </Card>
                  <NavigationButtons prev={prevStep} next={nextStep} />
                </div>
              )}

              {step === 4 && (
                <div className="max-w-3xl mx-auto space-y-8">
                  <Card className="p-8 space-y-6">
                    <SegmentedControl 
                      label="Program Length" 
                      value={programSettings.lengthWeeks.toString()} 
                      onChange={(v) => setProgramSettings({...programSettings, lengthWeeks: Number(v) as any})} 
                      options={[{ label: "4 Weeks", value: "4" }, { label: "8 Weeks", value: "8" }, { label: "12 Weeks", value: "12" }]} 
                    />
                    <SegmentedControl 
                      label="S&C Days Per Week" 
                      value={programSettings.scDaysPerWeek.toString()} 
                      onChange={(v) => setProgramSettings({...programSettings, scDaysPerWeek: Number(v) as any})} 
                      options={[{ label: "2 Days", value: "2" }, { label: "3 Days", value: "3" }, { label: "4 Days", value: "4" }]} 
                    />
                  </Card>
                  <NavigationButtons prev={prevStep} next={nextStep} />
                </div>
              )}

              {step === 5 && (
                 <div className="max-w-4xl mx-auto space-y-8">
                    <Card className="p-8">
                      <AssessmentInputs assessment={assessment} setAssessment={setAssessment} />
                    </Card>
                    <div className="flex justify-between">
                        <Button variant="secondary" onClick={prevStep}><ChevronLeft className="w-4 h-4" /></Button>
                        <Button onClick={handleGenerate} className="px-12">Generate Plan</Button>
                    </div>
                 </div>
              )}

              {step === 6 && (
                <div className="w-full space-y-8">
                  {program && <ProgramDashboard program={program} languageMode={languageMode} />}
                  <div className="flex justify-between border-t border-zinc-800 pt-8">
                    <Button variant="secondary" onClick={prevStep}>Back to Edits</Button>
                    <Button onClick={nextStep}>Preview Spreadsheet</Button>
                  </div>
                </div>
              )}

              {step === 7 && (
                <div className="w-full space-y-8">
                   <div className="text-center space-y-2 mb-8">
                      <h2 className="text-2xl font-bold text-white">Export Ready.</h2>
                      <p className="text-zinc-500">Your program is structured and ready for Google Sheets synchronization.</p>
                   </div>
                   {program && <SheetPreview program={program} />}
                   <div className="flex justify-center pt-8">
                      <Button variant="secondary" onClick={() => setStep(1)} className="px-8">Reset Application</Button>
                   </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="pt-24 pb-8 text-center text-[10px] text-zinc-600 uppercase tracking-widest leading-loose">
          <p>© 2026 Black Bear Performance. Built for those who fight.</p>
          <p>This tool does not provide medical advice. Consult a professional before training.</p>
        </footer>
      </div>
    </div>
  );
}

const NavigationButtons = ({ prev, next }: { prev: () => void, next: () => void }) => (
  <div className="flex justify-between">
    <Button variant="secondary" onClick={prev}>
      <ChevronLeft className="w-4 h-4" />
    </Button>
    <Button onClick={next}>
      <div className="flex items-center gap-2">Next Step <ChevronRight className="w-4 h-4" /></div>
    </Button>
  </div>
);
