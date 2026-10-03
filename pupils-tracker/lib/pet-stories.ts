// Animated pet story videos: self-contained HTML players built with the
// lesson-video skill from video-src/<id>/ (chapter.js + audio + the pet
// sprites), shown in an iframe from the Pets page. Same static-manifest pattern
// as lib/lessons.ts — add a story by building it into public/pets/stories/ and
// appending an entry here.

export interface PetStory {
  id: string; // stable slug, matches video-src/<id>/
  title: string;
  blurb: string;
  path: string; // path under public/
  minutes: number; // rough running time, shown on the card
  cover: { species: string; stageId: string };
  // "adventure" = interactive: the video stops at challenges and pupils must
  // answer correctly to continue (gate engine). Omitted = a plain story.
  kind?: "story" | "adventure";
  unit?: string; // Super Minds unit it teaches, shown on adventure cards
}

export const PET_STORIES: PetStory[] = [
  {
    id: "runaway-egg",
    title: "The Runaway Egg",
    blurb:
      "Dragon, Fox, Owl and Panda chase a glowing egg from the park, through the woods, to a frozen river — then play hide and seek with the new Robot. Words: under, in, behind, on, above, next to, across.",
    path: "/pets/stories/runaway-egg.html",
    minutes: 3,
    cover: { species: "robot", stageId: "egg" },
  },
  {
    id: "dragon-home",
    title: "Dragon's Home",
    blurb:
      "Fox visits Dragon's cosy cave. When the wind blows the lamp out, Dragon lights it again — gently. Words: bed, table, chair, window, lamp.",
    path: "/pets/stories/dragon-home.html",
    minutes: 1,
    cover: { species: "dragon", stageId: "teen" },
  },
  {
    id: "dragon-suit",
    title: "Dragon's Super Suit",
    blurb:
      "A snowstorm freezes Fox's door. Dragon suits up piece by piece and saves the day with Dragon Flame. Words: boots, gloves, scarf, goggles, cape.",
    path: "/pets/stories/dragon-suit.html",
    minutes: 1,
    cover: { species: "dragon", stageId: "adult" },
  },
  {
    id: "stolen-week",
    title: "The Stolen Week",
    blurb:
      "A whirlwind steals the 7 day-pages from Pet Town's calendar. Solve 8 challenges to win them back — and help a lost little Rabbit. Days of the week, I go swimming on Mondays, Do you…? Yes, I do / No, I don't, the u sound, healthy habits.",
    path: "/pets/stories/stolen-week.html",
    minutes: 5,
    cover: { species: "rabbit", stageId: "teen" },
    kind: "adventure",
    unit: "Year 2 · Unit 5 Free time",
  },
  {
    // same script, voices and 8 challenges as "stolen-week", rebuilt as a live
    // 3D world (three.js) — kept side by side so the two looks can be compared
    id: "stolen-week-3d",
    title: "The Stolen Week (3D)",
    blurb:
      "The same adventure in a 3D Pet Town: fly over the rooftops from the pool to the field, the arcade, the stage and the dark forest to win back the 7 day-pages. Same 8 challenges as The Stolen Week.",
    path: "/pets/stories/stolen-week-3d.html",
    minutes: 5,
    cover: { species: "fox", stageId: "teen" },
    kind: "adventure",
    unit: "Year 2 · Unit 5 Free time",
  },
];
