// Irregular past-tense questions — the gate in front of a locked pet.
//
// The pet is the prize, so the English has to be the work. Every question shows
// a sentence with the verb missing and asks for the past form, because that is
// how the verb is actually used; asking "what is the past tense of go?" tests
// whether a child can recite a table, which is not the same skill.
//
// The distractors are deliberate, not random other verbs. Each wrong option is a
// mistake a Year 1-2 pupil genuinely makes:
//   • the over-regularised form  (goed, eated, runned) — the commonest by far
//   • the past participle        (gone, eaten, drunk)  — the next commonest
//   • the bare present           (go, eat, run)        — no marking at all
// A child who picks "goed" has a different gap from one who picks "gone", and
// both are worth more than a child guessing between four unrelated words.

export interface VerbQuestion {
  /** Stable id so a run can't ask the same verb twice. */
  id: string;
  /** The sentence, with "___" where the verb belongs. */
  sentence: string;
  /** Present form, shown as the prompt ("go → ?"). */
  base: string;
  /** The correct past form. */
  past: string;
  /** Wrong answers: over-regularised, participle, bare present. */
  wrong: [string, string, string];
}

/**
 * Year 1-2 irregular verbs — the high-frequency set a child meets in stories and
 * classroom talk. Kept deliberately short: 24 verbs is enough that five drawn at
 * random rarely repeat across a lesson, without drifting into verbs
 * ("sought", "bore") no seven-year-old needs.
 */
export const VERB_QUESTIONS: VerbQuestion[] = [
  { id: "go", base: "go", past: "went", wrong: ["goed", "gone", "go"], sentence: "Yesterday I ___ to school." },
  { id: "eat", base: "eat", past: "ate", wrong: ["eated", "eaten", "eat"], sentence: "Last night we ___ rice." },
  { id: "see", base: "see", past: "saw", wrong: ["seed", "seen", "see"], sentence: "I ___ a big cat this morning." },
  { id: "run", base: "run", past: "ran", wrong: ["runned", "run", "running"], sentence: "She ___ very fast in the race." },
  { id: "come", base: "come", past: "came", wrong: ["comed", "come", "coming"], sentence: "My friend ___ to my house." },
  { id: "give", base: "give", past: "gave", wrong: ["gived", "given", "give"], sentence: "He ___ me a pencil." },
  { id: "take", base: "take", past: "took", wrong: ["taked", "taken", "take"], sentence: "We ___ a photo at the park." },
  { id: "make", base: "make", past: "made", wrong: ["maked", "make", "making"], sentence: "I ___ a card for my mother." },
  { id: "sit", base: "sit", past: "sat", wrong: ["sitted", "sit", "sitting"], sentence: "The dog ___ on the mat." },
  { id: "drink", base: "drink", past: "drank", wrong: ["drinked", "drunk", "drink"], sentence: "He ___ all the milk." },
  { id: "swim", base: "swim", past: "swam", wrong: ["swimmed", "swum", "swim"], sentence: "We ___ in the pool." },
  { id: "sing", base: "sing", past: "sang", wrong: ["singed", "sung", "sing"], sentence: "The class ___ a happy song." },
  { id: "write", base: "write", past: "wrote", wrong: ["writed", "written", "write"], sentence: "I ___ my name on the book." },
  { id: "sleep", base: "sleep", past: "slept", wrong: ["sleeped", "sleep", "sleeping"], sentence: "The baby ___ all night." },
  { id: "ride", base: "ride", past: "rode", wrong: ["rided", "ridden", "ride"], sentence: "She ___ her bicycle to the shop." },
  { id: "fly", base: "fly", past: "flew", wrong: ["flied", "flown", "fly"], sentence: "The bird ___ over the tree." },
  { id: "draw", base: "draw", past: "drew", wrong: ["drawed", "drawn", "draw"], sentence: "He ___ a picture of a robot." },
  { id: "catch", base: "catch", past: "caught", wrong: ["catched", "catch", "catching"], sentence: "I ___ the ball with two hands." },
  { id: "buy", base: "buy", past: "bought", wrong: ["buyed", "buy", "buying"], sentence: "We ___ bread at the shop." },
  { id: "find", base: "find", past: "found", wrong: ["finded", "find", "finding"], sentence: "She ___ her lost shoe." },
  { id: "get", base: "get", past: "got", wrong: ["getted", "gotten", "get"], sentence: "I ___ a new bag today." },
  { id: "tell", base: "tell", past: "told", wrong: ["telled", "tell", "telling"], sentence: "My teacher ___ us a story." },
  { id: "bring", base: "bring", past: "brought", wrong: ["bringed", "bring", "bringing"], sentence: "He ___ his lunch to school." },
  { id: "teach", base: "teach", past: "taught", wrong: ["teached", "teach", "teaching"], sentence: "She ___ us a new game." },
];

/** How many must be answered, and how many may be missed, to open a pod. */
export const UNLOCK_QUESTIONS = 5;

export interface QuizItem extends VerbQuestion {
  /** The four answers in the order they should be shown. */
  options: string[];
}

function shuffle<T>(list: T[], rand: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Draw a fresh run of questions. Verbs never repeat inside one run, and the
 * options are shuffled per question so the answer isn't always in the same
 * place — children spot a fixed position long before they learn the verb.
 */
export function buildUnlockQuiz(
  count: number = UNLOCK_QUESTIONS,
  rand: () => number = Math.random
): QuizItem[] {
  return shuffle(VERB_QUESTIONS, rand)
    .slice(0, Math.min(count, VERB_QUESTIONS.length))
    .map((q) => ({ ...q, options: shuffle([q.past, ...q.wrong], rand) }));
}
