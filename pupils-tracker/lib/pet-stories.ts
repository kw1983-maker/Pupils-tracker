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
];
