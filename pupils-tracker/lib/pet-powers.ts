// Superpowers a pupil buys for their pet with the marks they have earned.
//
// The economy deliberately has two tracks, like XP and gold in a game:
//   • LEVEL comes from every positive mark a pupil has ever earned and never
//     goes down (see getPupilExp in lib/store.tsx). Buying a power cannot
//     de-level a pet or send it back to being an egg.
//   • BALANCE is the NET mark total — negatives included — minus whatever has
//     been spent (see getPupilBalance). So poor behaviour costs buying power
//     while the pet itself keeps everything it has grown. Always recoverable:
//     earning positives lifts the balance back, and it never drops below zero.
//
// A bought power adds a button to the pet's row: its own sound effect, colour,
// floating glyphs and animation. Sounds are one clip per power rather than one
// per species — a fire breath sounds the same whichever animal makes it — so
// the whole set is 8 clips, not 120. Generate with:
//   npm run gen:power-sounds

/** Particle behaviours. Named for what they look like, not what they do. */
export type PowerMotion =
  | "rise"    // flames licking upward, flickering
  | "fall"    // shards dropping and scattering
  | "jagged"  // an instant, sharp strike
  | "float"   // bubbles wobbling gently up
  | "spiral"  // caught in a vortex
  | "arc"     // a sweeping curve
  | "spray"   // an even radial burst
  | "soar";   // launched hard upward

export interface PetPower {
  /** Stable key stored on each purchase record. */
  id: string;
  label: string;
  emoji: string;
  /** Marks it costs to buy. */
  cost: number;
  /** Shown in the shop. */
  blurb: string;
  /** Said in the speech bubble when the power is used (text only). */
  shout: string;
  /** Floating glyphs, matching the CARE_GLYPHS pattern in Pets.tsx. */
  glyphs: [string, string, string];
  /** Prompt for scripts/generate-power-sounds.mjs (ElevenLabs sound effects). */
  sfx: string;
  /** Colour washed over the scene the instant the power fires. */
  tint: string;
  /**
   * How this power's particles move. Every power used to throw the same radial
   * fan, so eight powers were really one effect in eight colours — fire drifted
   * sideways like confetti and ice floated upward. Each motion below has its own
   * trajectory and keyframes (see .pet-fx.is-<motion> in globals.css).
   */
  motion: PowerMotion;
}

// Three price tiers so there is something to save towards. With the default 2
// marks per award, 10 is about five good moments and 30 is a sustained run.
export const PET_POWERS: PetPower[] = [
  {
    id: "sparkle",
    motion: "spray",
    tint: "rgba(253, 231, 166, 0.95)",
    label: "Magic Sparkle",
    emoji: "✨",
    cost: 10,
    blurb: "Showers the room in glitter.",
    shout: "Sparkle burst!",
    glyphs: ["✨", "💫", "⭐"],
    sfx: "a magical sparkle shimmer chime, light and twinkly, short, clean, no music",
  },
  {
    id: "bubble",
    motion: "float",
    tint: "rgba(207, 225, 251, 0.95)",
    label: "Bubble Blast",
    emoji: "🫧",
    cost: 10,
    blurb: "Blows a stream of giant bubbles.",
    shout: "Bubble blast!",
    glyphs: ["🫧", "💧", "○"],
    sfx: "playful bubbles blowing and popping, light and bouncy, short, clean, no music",
  },
  {
    id: "fire",
    motion: "rise",
    tint: "rgba(253, 146, 60, 0.95)",
    label: "Fire Breath",
    emoji: "🔥",
    cost: 20,
    blurb: "Breathes a mighty jet of flame.",
    shout: "Fire breath!",
    glyphs: ["🔥", "💥", "🌋"],
    sfx: "a cartoon dragon breathing a whoosh of fire, short flame burst, clean, no music",
  },
  {
    id: "frost",
    motion: "fall",
    tint: "rgba(186, 230, 253, 0.95)",
    label: "Frost Breath",
    emoji: "❄️",
    cost: 20,
    blurb: "Freezes everything in one puff.",
    shout: "Frost breath!",
    glyphs: ["❄️", "🧊", "✨"],
    sfx: "a magical ice freezing whoosh with crystal crackle, short, clean, no music",
  },
  {
    id: "lightning",
    motion: "jagged",
    tint: "rgba(255, 255, 255, 0.98)",
    label: "Lightning Dash",
    emoji: "⚡",
    cost: 20,
    blurb: "Moves quicker than you can blink.",
    shout: "Lightning dash!",
    glyphs: ["⚡", "💨", "✨"],
    sfx: "a quick electric zap and crackle whoosh, short and snappy, clean, no music",
  },
  {
    id: "whirlwind",
    motion: "spiral",
    tint: "rgba(203, 213, 225, 0.95)",
    label: "Whirlwind",
    emoji: "🌪️",
    cost: 30,
    blurb: "Spins up a friendly tornado.",
    shout: "Whirlwind spin!",
    glyphs: ["🌪️", "💨", "🍃"],
    sfx: "a swirling wind gust whoosh spinning up, short, clean, no music",
  },
  {
    id: "rainbow",
    motion: "arc",
    tint: "rgba(244, 171, 220, 0.95)",
    label: "Rainbow Trail",
    emoji: "🌈",
    cost: 30,
    blurb: "Leaves a rainbow wherever it goes.",
    shout: "Rainbow trail!",
    glyphs: ["🌈", "✨", "💖"],
    sfx: "a soft magical rising shimmer with a gentle chime, dreamy, short, clean, no music",
  },
  {
    id: "flight",
    motion: "soar",
    tint: "rgba(191, 219, 254, 0.95)",
    label: "Super Flight",
    emoji: "🦸",
    cost: 30,
    blurb: "Soars right up into the clouds.",
    shout: "Up, up and away!",
    glyphs: ["🦸", "☁️", "💨"],
    sfx: "a heroic whoosh of something flying past fast, short, clean, no music",
  },
];

export const powerById = (id: string): PetPower | undefined =>
  PET_POWERS.find((p) => p.id === id);

// Bump when the sound clips are regenerated so browsers drop cached copies.
export const PET_POWER_VERSION = "1";

export function powerSoundSrc(powerId: string): string {
  return `/pets/powers/${powerId}.mp3?v=${PET_POWER_VERSION}`;
}
