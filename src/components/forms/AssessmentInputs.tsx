import type { ReactNode } from "react";
import { Assessment } from "../../types";
import { Input } from "../ui/Base";

type AssessmentInputsProps = {
  assessment: Assessment;
  setAssessment: (val: Assessment) => void;
};

export const AssessmentInputs = ({ assessment, setAssessment }: AssessmentInputsProps) => {
  const updateField = (field: keyof Assessment, val: string | number) => {
    setAssessment({ ...assessment, [field]: val });
  };

  return (
    <div className="grid gap-8">
      <AssessmentGroup
        title="Strength"
        description="Use estimated maxes or safe submax tests. Beginners can use reps instead of 1RM."
      >
        <Input label="Squat / Trap Bar" type="number" value={assessment.squatOrTrapBar} onChange={(value) => updateField("squatOrTrapBar", value)} placeholder="kg" min={0} />
        <Input label="Bench / Push-ups" type="number" value={assessment.benchOrPushups} onChange={(value) => updateField("benchOrPushups", value)} placeholder="kg or reps" min={0} />
        <Input label="Pull-ups" type="number" value={assessment.pullups} onChange={(value) => updateField("pullups", value)} placeholder="reps" min={0} />
      </AssessmentGroup>

      <AssessmentGroup title="Power / Speed" description="These values help choose power, sprint, and COD emphasis.">
        <Input label="Vertical Jump" type="number" value={assessment.verticalJump} onChange={(value) => updateField("verticalJump", value)} placeholder="cm" min={0} />
        <Input label="Broad Jump" type="number" value={assessment.broadJump} onChange={(value) => updateField("broadJump", value)} placeholder="cm" min={0} />
        <Input label="Med Ball Throw" type="number" value={assessment.medBallThrow} onChange={(value) => updateField("medBallThrow", value)} placeholder="m" min={0} />
        <Input label="10m Sprint" type="number" value={assessment.sprint10m || ""} onChange={(value) => updateField("sprint10m", value)} placeholder="sec" min={0} />
      </AssessmentGroup>

      <AssessmentGroup title="Conditioning" description="Optional now, but this is where MAS and HR zones will drive intervals later.">
        <Input label="MAS" type="number" value={assessment.mas || ""} onChange={(value) => updateField("mas", value)} placeholder="m/s" min={0} />
        <Input label="Resting HR" type="number" value={assessment.restingHr || ""} onChange={(value) => updateField("restingHr", value)} placeholder="bpm" min={0} />
        <Input label="HR Max" type="number" value={assessment.hrMax || ""} onChange={(value) => updateField("hrMax", value)} placeholder="bpm" min={0} />
      </AssessmentGroup>

      <AssessmentGroup title="Readiness (1-5)" description="Low readiness should reduce unnecessary volume and intensity.">
        <Input label="Sleep" type="number" value={assessment.sleep} onChange={(value) => updateField("sleep", value)} min={1} max={5} />
        <Input label="Stress" type="number" value={assessment.stress} onChange={(value) => updateField("stress", value)} min={1} max={5} />
        <Input label="Soreness" type="number" value={assessment.soreness} onChange={(value) => updateField("soreness", value)} min={1} max={5} />
        <Input label="Motivation" type="number" value={assessment.motivation} onChange={(value) => updateField("motivation", value)} min={1} max={5} />
      </AssessmentGroup>
    </div>
  );
};

function AssessmentGroup({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-3 border-b border-zinc-900 pb-6 last:border-b-0 last:pb-0">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-white">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-zinc-500">{description}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-4">{children}</div>
    </section>
  );
}
