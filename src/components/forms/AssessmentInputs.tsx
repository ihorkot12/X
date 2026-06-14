import React from "react";
import { Assessment, ProgramSettings } from "../../types";
import { Input, Card } from "../ui/Base";

export const AssessmentInputs = ({ 
  assessment, 
  setAssessment 
}: { 
  assessment: Assessment; 
  setAssessment: (val: Assessment) => void 
}) => {
  const updateField = (field: keyof Assessment, val: any) => {
    setAssessment({ ...assessment, [field]: val });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="space-y-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-widest border-b border-zinc-800 pb-2">Strength & Power</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input 
            label="Squat / Trap Bar max" 
            type="number" 
            value={assessment.squatOrTrapBar} 
            onChange={(v) => updateField("squatOrTrapBar", v)} 
            placeholder="kg"
          />
          <Input 
            label="Bench / Push-up max" 
            type="number" 
            value={assessment.benchOrPushups} 
            onChange={(v) => updateField("benchOrPushups", v)} 
            placeholder="kg/reps"
          />
          <Input 
            label="Pull-up Max Reps" 
            type="number" 
            value={assessment.pullups} 
            onChange={(v) => updateField("pullups", v)} 
          />
          <Input 
            label="Vertical Jump" 
            type="number" 
            value={assessment.verticalJump} 
            onChange={(v) => updateField("verticalJump", v)} 
            placeholder="cm"
          />
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-widest border-b border-zinc-800 pb-2">Readiness (1-5)</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Sleep Quality" type="number" value={assessment.sleep} onChange={(v) => updateField("sleep", v)} />
          <Input label="Stress Level" type="number" value={assessment.stress} onChange={(v) => updateField("stress", v)} />
          <Input label="Muscle Soreness" type="number" value={assessment.soreness} onChange={(v) => updateField("soreness", v)} />
          <Input label="Motivation" type="number" value={assessment.motivation} onChange={(v) => updateField("motivation", v)} />
        </div>
      </div>
    </div>
  );
};
