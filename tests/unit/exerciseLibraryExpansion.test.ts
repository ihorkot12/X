import { describe, expect, it } from "vitest";

import {
  COMBAT_DISCIPLINES,
  CURATED_COMBAT_EXERCISE_IDS,
  EXERCISE_SOURCE_TAGS,
  METHODOLOGY_TAGS,
  exerciseMetadata,
} from "../../src/lib/exerciseMetadata";
import { exerciseLibrary } from "../../src/lib/exerciseLibrary";

const REQUIRED_MOBILITY_REGIONS = [
  "ankles",
  "hips",
  "adductors",
  "t-spine",
  "shoulders-scapulae",
  "wrists",
  "neck",
] as const;

describe("curated Kyokushin Karate and MMA exercise expansion", () => {
  it("keeps the expansion curated, unique, and fully represented in metadata", () => {
    expect(CURATED_COMBAT_EXERCISE_IDS).toHaveLength(20);
    expect(new Set(CURATED_COMBAT_EXERCISE_IDS).size).toBe(CURATED_COMBAT_EXERCISE_IDS.length);
    expect(Object.keys(exerciseMetadata).sort()).toEqual([...CURATED_COMBAT_EXERCISE_IDS].sort());
  });

  it("provides complete programming and research fields for every added exercise", () => {
    for (const id of CURATED_COMBAT_EXERCISE_IDS) {
      const matchingExercises = exerciseLibrary.filter((item) => item.id === id);
      const exercise = matchingExercises[0];
      const metadata = exerciseMetadata[id];

      expect(matchingExercises, `${id} must occur exactly once`).toHaveLength(1);
      expect(exercise, `${id} is missing from exerciseLibrary`).toBeDefined();
      expect(exercise?.nameEn).toBeTruthy();
      expect(exercise?.notesUa).toMatch(/[А-Яа-яІіЇїЄє]/u);
      expect(exercise?.category).toBeTruthy();
      expect(exercise?.pattern).toBeTruthy();
      expect(exercise?.bodyRegions.length).toBeGreaterThan(0);
      expect(exercise?.equipment.length).toBeGreaterThan(0);
      expect(exercise?.level).toBeTruthy();
      expect(exercise?.phases.length).toBeGreaterThan(0);
      expect(exercise?.contraindications).toBeInstanceOf(Array);

      expect(Object.keys(metadata.relevance).sort()).toEqual([...COMBAT_DISCIPLINES].sort());
      for (const discipline of COMBAT_DISCIPLINES) {
        expect(metadata.relevance[discipline].priority).toMatch(/^(primary|supporting)$/);
        expect(metadata.relevance[discipline].rationaleUa).toMatch(/[А-Яа-яІіЇїЄє]/u);
      }

      expect(metadata.methodologyTags.length).toBeGreaterThan(0);
      expect(EXERCISE_SOURCE_TAGS).toContain(metadata.sourceTag);
      if (metadata.sourceTag === "xl-athlete-index") {
        expect(metadata.sourceUrl).toMatch(/^https:\/\/www\.xlathlete\.com\//);
      }
      if (metadata.sourceTag === "daru-strong-exercise-db") {
        expect(metadata.sourceUrl).toBe("https://invasiondigitalmedia.com/exercisedatabase-3-2/");
      }
      if (metadata.demoUrl) {
        expect(metadata.demoUrl).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}$/);
      }
    }
  });

  it("covers every requested mobility region with discipline-specific relevance", () => {
    const coveredRegions = new Set(
      CURATED_COMBAT_EXERCISE_IDS.flatMap((id) => exerciseMetadata[id].mobilityRegions ?? []),
    );

    expect([...coveredRegions].sort()).toEqual([...REQUIRED_MOBILITY_REGIONS].sort());

    for (const region of REQUIRED_MOBILITY_REGIONS) {
      const matchingIds = CURATED_COMBAT_EXERCISE_IDS.filter((id) =>
        exerciseMetadata[id].mobilityRegions?.includes(region),
      );
      expect(matchingIds.length, `${region} has no mobility exercise`).toBeGreaterThan(0);
      expect(matchingIds.every((id) => exerciseLibrary.find((item) => item.id === id)?.category === "mobility")).toBe(true);
    }
  });

  it("keeps OTA as a source tag rather than a methodology layer", () => {
    expect(EXERCISE_SOURCE_TAGS).toContain("ota");
    expect(EXERCISE_SOURCE_TAGS).toContain("daru-strong-exercise-db");
    expect(exerciseMetadata["four-way-neck-yielding-isometric"].sourceTag).toBe("daru-strong-exercise-db");
    expect(METHODOLOGY_TAGS).not.toContain("ota");
    expect(new Set(METHODOLOGY_TAGS)).toEqual(
      new Set(["daru-combat-performance", "westside-conjugate", "triphasic"]),
    );
  });
});
