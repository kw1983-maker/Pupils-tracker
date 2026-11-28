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
  // answer correctly to continue (gate engine). "tour" = a short AI video clip
  // (an .mp4, not an HTML player) of a pet in its house — see lib/pets.ts
  // PET_HOMES. Omitted = a plain story.
  kind?: "story" | "adventure" | "tour";
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
  {
    // 3D world from the start (no 2D version); voices are free edge-tts, sound effects Web Audio
    id: "go-kart-race",
    title: "The Great Go-Kart Race",
    blurb:
      "Help Rabbit build a go-kart across a 3D Pet Town — the toy shop, the toy fair, the tangram lab and Ken's paint shed — then win the race fairly when show-off Monkey cheats. Toys, What's his/her name? How old is he/she?, a / an old go-kart, shapes, the e sound, fair play.",
    path: "/pets/stories/go-kart-race.html",
    minutes: 5,
    cover: { species: "rabbit", stageId: "adult" },
    kind: "adventure",
    unit: "Year 1 · Unit 2 Let's play!",
  },
  // House tours: ~5 s ElevenLabs (Kling 2.5 Turbo) clips made from each pet's
  // house picture (public/pets/homes/) with its sprite placed inside.
  {
    id: "dragon-house",
    title: "Dragon's House",
    blurb: "Peek inside Dragon's cosy cave: a red-blanket bed, a table and chair, a round window and a glowing lantern.",
    path: "/pets/homes/dragon-tour.mp4",
    minutes: 0.1,
    cover: { species: "dragon", stageId: "adult" },
    kind: "tour",
  },
  {
    id: "rabbit-house",
    title: "Rabbit's House",
    blurb: "Visit Rabbit's burrow under the carrot garden: a patchwork bed, a round door and a window full of flowers.",
    path: "/pets/homes/rabbit-tour.mp4",
    minutes: 0.1,
    cover: { species: "rabbit", stageId: "adult" },
    kind: "tour",
  },
  {
    id: "fox-house",
    title: "Fox's House",
    blurb: "Step into Fox's den inside a hollow tree: an orange blanket, a basket of acorns and autumn leaves outside the window.",
    path: "/pets/homes/fox-tour.mp4",
    minutes: 0.1,
    cover: { species: "fox", stageId: "adult" },
    kind: "tour",
  },
  {
    id: "cat-house",
    title: "Cat's House",
    blurb: "Visit Cat's sunny cottage: a cushion bed with a paw-print blanket, a cat tree, a fish bowl, a ball of yarn and a window full of flowers.",
    path: "/pets/homes/cat-tour.mp4",
    minutes: 0.1,
    cover: { species: "cat", stageId: "adult" },
    kind: "tour",
  },
  {
    id: "dog-house",
    title: "Dog's House",
    blurb: "Come into Dog's kennel-house: a red door with a bone sign, a cosy bed, food bowls, a basket of toys and a window onto the garden.",
    path: "/pets/homes/dog-tour.mp4",
    minutes: 0.1,
    cover: { species: "dog", stageId: "adult" },
    kind: "tour",
  },
  {
    id: "panda-house",
    title: "Panda's House",
    blurb: "Step into Panda's bamboo hut: a leafy round bed, a low table of bamboo shoots, glowing paper lanterns and a round window onto misty mountains.",
    path: "/pets/homes/panda-tour.mp4",
    minutes: 0.1,
    cover: { species: "panda", stageId: "adult" },
    kind: "tour",
  },
];
