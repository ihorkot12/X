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
        title="Сила"
        description="Використовуйте орієнтовні максимуми або безпечні субмаксимальні тести. Початківці можуть указати повторення замість 1RM."
      >
        <Input label="Squat / Trap Bar" type="number" value={assessment.squatOrTrapBar} onChange={(value) => updateField("squatOrTrapBar", value)} placeholder="кг" min={0} />
        <Input label="Bench Press / Push-ups" type="number" value={assessment.benchOrPushups} onChange={(value) => updateField("benchOrPushups", value)} placeholder="кг або повторення" min={0} />
        <Input label="Pull-ups" type="number" value={assessment.pullups} onChange={(value) => updateField("pullups", value)} placeholder="повторення" min={0} />
      </AssessmentGroup>

      <AssessmentGroup title="Потужність і швидкість" description="Ці показники визначають акцент на потужності, спринті та зміні напрямку.">
        <Input label="Vertical Jump" type="number" value={assessment.verticalJump} onChange={(value) => updateField("verticalJump", value)} placeholder="см" min={0} />
        <Input label="Broad Jump" type="number" value={assessment.broadJump} onChange={(value) => updateField("broadJump", value)} placeholder="см" min={0} />
        <Input label="Med Ball Throw" type="number" value={assessment.medBallThrow} onChange={(value) => updateField("medBallThrow", value)} placeholder="м" min={0} />
        <Input label="10m Sprint" type="number" value={assessment.sprint10m || ""} onChange={(value) => updateField("sprint10m", value)} placeholder="с" min={0} />
      </AssessmentGroup>

      <AssessmentGroup title="Витривалість" description="Необов'язкові показники. Надалі MAS і зони HR використовуватимуться для визначення інтервалів."
      >
        <Input label="MAS" type="number" value={assessment.mas || ""} onChange={(value) => updateField("mas", value)} placeholder="м/с" min={0} />
        <Input label="HR у спокої" type="number" value={assessment.restingHr || ""} onChange={(value) => updateField("restingHr", value)} placeholder="уд/хв" min={0} />
        <Input label="Макс. HR" type="number" value={assessment.hrMax || ""} onChange={(value) => updateField("hrMax", value)} placeholder="уд/хв" min={0} />
      </AssessmentGroup>

      <AssessmentGroup title="Готовність (1-5)" description="Низька готовність має зменшувати зайвий обсяг та інтенсивність.">
        <Input label="Сон" type="number" value={assessment.sleep} onChange={(value) => updateField("sleep", value)} min={1} max={5} />
        <Input label="Стрес" type="number" value={assessment.stress} onChange={(value) => updateField("stress", value)} min={1} max={5} />
        <Input label="М'язовий біль" type="number" value={assessment.soreness} onChange={(value) => updateField("soreness", value)} min={1} max={5} />
        <Input label="Мотивація" type="number" value={assessment.motivation} onChange={(value) => updateField("motivation", value)} min={1} max={5} />
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
    <section className="grid gap-3 rounded-lg border border-zinc-800 bg-black/35 p-4">
      <div>
        <h3 className="text-sm font-bold uppercase text-white">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-zinc-500">{description}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-4">{children}</div>
    </section>
  );
}
