import { Assessment, AthleteProfile, CombatLoad, CombatProfile } from "../types";

export type PriorityScore = {
  id: string;
  label: string;
  score: number;
  reasonUa: string;
  reasonEn: string;
};

export function scorePriorities({
  combatProfile,
  combatLoad,
  athleteProfile,
  assessment,
}: {
  combatProfile: CombatProfile;
  combatLoad: CombatLoad;
  athleteProfile: AthleteProfile;
  assessment: Assessment;
}): PriorityScore[] {
  const weight = Number(athleteProfile.weightKg) || 75;
  const squat = Number(assessment.squatOrTrapBar) || 0;
  const vertical = Number(assessment.verticalJump) || 0;
  const broad = Number(assessment.broadJump) || 0;
  const mas = Number(assessment.mas) || 0;
  const sleep = Number(assessment.sleep) || 3;
  const stress = Number(assessment.stress) || 3;
  const soreness = Number(assessment.soreness) || 3;
  const motivation = Number(assessment.motivation) || 3;
  const combatSessions = combatLoad.strikingSessions + combatLoad.grapplingSessions + combatLoad.technicalSessions;
  const hardDays = combatLoad.hardSparringDays + combatLoad.hardGrapplingDays;

  const strengthRatio = squat ? squat / weight : 0;
  const strengthScore = squat === 0 ? 3 : strengthRatio < 1.2 ? 5 : strengthRatio < 1.6 ? 4 : strengthRatio < 2 ? 3 : 2;
  const powerScore = vertical === 0 && broad === 0 ? 3 : vertical < 40 || broad < 210 ? 5 : vertical < 50 || broad < 240 ? 4 : 2;
  const aerobicScore = mas === 0 ? 3 : mas < 3.7 ? 5 : mas < 4.2 ? 4 : mas < 4.7 ? 3 : 2;
  const repeatEffortScore = hardDays >= 3 ? 5 : combatProfile === "grappler" && combatLoad.grapplingSessions >= 3 ? 4 : combatSessions >= 7 ? 4 : 3;
  const movementScore = Math.min(5, 1 + athleteProfile.painAreas.length);
  const recoveryScore = Math.min(5, Math.max(1, Math.round((6 - sleep + stress + soreness + (6 - motivation)) / 4)));
  const combatLoadScore = combatSessions >= 9 || hardDays >= 4 ? 5 : combatSessions >= 7 || hardDays >= 3 ? 4 : combatSessions >= 5 ? 3 : 2;

  return [
    {
      id: "strength",
      label: "Strength deficit",
      score: strengthScore,
      reasonUa: squat ? `Орієнтовне співвідношення сили до ваги: ${strengthRatio.toFixed(1)}x.` : "Немає силового тесту, тому сила поки невідома.",
      reasonEn: squat ? `Estimated strength-to-bodyweight ratio: ${strengthRatio.toFixed(1)}x.` : "No strength test yet, so strength is unknown.",
    },
    {
      id: "power",
      label: "Power deficit",
      score: powerScore,
      reasonUa: "Стрибки і кидки визначають акцент power/speed блоку.",
      reasonEn: "Jump and throw results drive the power/speed emphasis.",
    },
    {
      id: "aerobic",
      label: "Aerobic deficit",
      score: aerobicScore,
      reasonUa: mas ? `MAS введено: ${mas}.` : "MAS не введено, зони будуть приблизними.",
      reasonEn: mas ? `MAS entered: ${mas}.` : "No MAS entered, zones will remain approximate.",
    },
    {
      id: "repeat-effort",
      label: "Repeat effort deficit",
      score: repeatEffortScore,
      reasonUa: "Важливо для раундів, scramble, клінчу і повторних вибухів.",
      reasonEn: "Important for rounds, scrambles, clinch, and repeated bursts.",
    },
    {
      id: "movement-risk",
      label: "Mobility / stability risk",
      score: movementScore,
      reasonUa: athleteProfile.painAreas.length ? `Позначені ризики: ${athleteProfile.painAreas.join(", ")}.` : "Ризики не позначені.",
      reasonEn: athleteProfile.painAreas.length ? `Marked risks: ${athleteProfile.painAreas.join(", ")}.` : "No risk flags selected.",
    },
    {
      id: "recovery",
      label: "Recovery risk",
      score: recoveryScore,
      reasonUa: "Сон, стрес, soreness і мотивація впливають на обсяг.",
      reasonEn: "Sleep, stress, soreness, and motivation affect volume.",
    },
    {
      id: "combat-load",
      label: "Combat load risk",
      score: combatLoadScore,
      reasonUa: `${combatSessions} бойових сесій, ${hardDays} важких днів на тиждень.`,
      reasonEn: `${combatSessions} combat sessions, ${hardDays} hard days per week.`,
    },
  ].sort((a, b) => b.score - a.score);
}
