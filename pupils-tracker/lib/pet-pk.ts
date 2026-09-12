// Pet PK — two pets face off over three rounds.
//
// This gives the superpower shop a point. Owning Fire Breath was previously a
// button that made a noise; here the powers a pupil has saved for are what they
// actually fight with, so spending marks becomes a decision rather than a toy.
//
// Design constraints that matter more than the maths:
//   • NOTHING IS LOST. No marks change hands, no power is spent, the pet is
//     unaffected. A duel is entertainment, so losing one costs a child nothing.
//   • AN UNDERDOG CAN WIN. Level and powers tilt the odds, they don't decide
//     the outcome — each round carries a big roll. Measured over 20k duels:
//     evenly matched pets are ~44/44, one cheap power wins ~56%, a full set ~70%,
//     and a level-8 pet with everything beats a level-1 pet with nothing ~82% —
//     so even the weakest pupil takes roughly one in five off the champion,
//     which is what keeps the whole class willing to play.
//   • IT IS WATCHABLE. Three rounds with a named move each, rather than one
//     number, so there is something to narrate on the projector.
//
// ── Who chooses the moves ────────────────────────────────────────────────────
// Originally nobody did: runPk rolled the whole duel in one call and the
// cinematic replayed it, which is still exactly what Watch mode does. The vs-PC
// and 2-player modes need to hand one round at a time to a child, so the loop is
// built from parts they can drive:
//
//   pickOption   choose a move at random (what Watch mode and the Easy AI use)
//   resolveMove  turn a chosen move into a scored PkMove
//   resolveRound score both sides of one round together
//   duelStatus   read the score and say whether it is over
//
// runPk is now just those four in a while loop, so the interactive modes and the
// watched one cannot drift apart on who won.

import { elementBonus as elementBonusFor, elementOf, type PetElement } from "./pet-elements";
import { PET_POWERS, powerById, type PetPower } from "./pet-powers";
import { levelFromExp } from "./pets";

export const PK_ROUNDS = 3;
/** Luck per round: 0..ROLL_RANGE-1. See the note in resolveMove. */
const ROLL_RANGE = 14;
/** A roll this high or better lands a critical — the moment the class shouts. */
export const CRIT_ROLL = ROLL_RANGE - 2;
/** What a critical adds on top of the roll. */
const CRIT_BONUS = 4;
/**
 * Every species signature hits for the same amount. The powerId only picks the
 * look (tint, glyphs, sound) — deriving strength from it too meant a child who
 * chose a panda started three times stronger than one who chose a mouse, before
 * a single mark was spent.
 */
const SIGNATURE_STRENGTH = 2;
/**
 * Owning more powers makes a pet steadily tougher, capped so a full collection
 * can't outrun the roll. This is also what stops a purchase ever being a
 * downgrade: buying a power weaker than your signature used to dilute the pool
 * and leave the pet worse off than before it spent the marks.
 */
const COLLECTION_CAP = 2;
/** Sudden-death rounds allowed before a duel is finally called a draw. */
const MAX_SUDDEN_DEATH = 3;

/**
 * A plain tackle, used only when a pet has no species and no shop powers.
 * Worth 0, not 1: at 1 it tied the cheapest power, which meant spending 10 marks
 * on Magic Sparkle bought a pupil no advantage at all.
 */
export const BASIC_MOVE = {
  id: "tackle",
  label: "Tackle",
  emoji: "💢",
  power: 0,
} as const;

/**
 * Species signature attacks for PK. Each has its own name/emoji so a fox and a
 * penguin never look like they cast the same generic move — even before anyone
 * buys from the shop. `powerId` ties into tint / glyphs / strength / SFX.
 */
export interface SpeciesSignature {
  powerId: string;
  label: string;
  emoji: string;
}

export const SPECIES_SIGNATURE: Record<string, SpeciesSignature> = {
  dragon: { powerId: "fire", label: "Dragon Flame", emoji: "🐉🔥" },
  fox: { powerId: "sparkle", label: "Clever Spark", emoji: "🦊✨" },
  cat: { powerId: "bubble", label: "Purr Pop", emoji: "🐱🫧" },
  owl: { powerId: "flight", label: "Moon Glide", emoji: "🦉🌙" },
  penguin: { powerId: "frost", label: "Ice Waddle", emoji: "🐧❄️" },
  rabbit: { powerId: "rainbow", label: "Hop Beam", emoji: "🐰🌈" },
  dino: { powerId: "whirlwind", label: "Tail Twister", emoji: "🦕🌪️" },
  unicorn: { powerId: "sparkle", label: "Star Leap", emoji: "🦄💫" },
  dog: { powerId: "lightning", label: "Happy Zap", emoji: "🐶⚡" },
  panda: { powerId: "whirlwind", label: "Bamboo Spin", emoji: "🐼🌪️" },
  koala: { powerId: "bubble", label: "Sleepy Bubbles", emoji: "🐨🫧" },
  pig: { powerId: "whirlwind", label: "Oink Tornado", emoji: "🐷🌪️" },
  monkey: { powerId: "lightning", label: "Banana Bolt", emoji: "🐵⚡" },
  tiger: { powerId: "fire", label: "Tiger Roar", emoji: "🐯🔥" },
  mouse: { powerId: "sparkle", label: "Tiny Twinkle", emoji: "🐭✨" },
  robot: { powerId: "laser", label: "Laser Beam", emoji: "🤖🔷" },
};

/** @deprecated use SPECIES_SIGNATURE — kept so older imports keep typechecking */
export const SPECIES_INNATE_POWER: Record<string, string> = Object.fromEntries(
  Object.entries(SPECIES_SIGNATURE).map(([k, v]) => [k, v.powerId])
);

export interface PkFighter {
  pupilId: string;
  /** Display name of the pet (falls back to the pupil's name). */
  name: string;
  pupilName: string;
  species?: string;
  stageId: string;
  level: number;
  /** Power ids this pet owns from the shop. */
  powers: string[];
}

export interface PkMove {
  /** power / melee / super — what the stage and the soundtrack key off. */
  kind: MoveKind;
  label: string;
  emoji: string;
  /** The power used, or null for a basic tackle. */
  power: PetPower | null;
  /** Contribution from the move itself. */
  strength: number;
  /** Contribution from the pet's level. */
  levelBonus: number;
  /** The luck of the round. */
  roll: number;
  /** True on a top-end roll: worth extra, and worth shouting about. */
  critical: boolean;
  /** Which of the three groups this move belongs to (null for a tackle). */
  element: PetElement | null;
  /** ELEMENT_BONUS when this move's element beats the other side's, else 0. */
  elementBonus: number;
  total: number;
  /**
   * The species' own move rather than a bought one. Both can borrow the same
   * power, so the label is the only thing that tells "Dragon Flame" from a
   * dragon that also bought "Fire Breath" — and they are announced with
   * different spoken lines (see lib/pet-battle-lines.ts).
   */
  signature: boolean;
}

/**
 * What a move IS, which decides how it is drawn and what it can do:
 *   power  a shop power or the species signature — carries an element
 *   melee  a plain punch or kick — no element, so no element game either way
 *   super  the pet's big one, once per duel
 */
export type MoveKind = "power" | "melee" | "super";

/** One attack a pet can throw — what the move chooser lists. */
export type MoveOption = {
  kind: MoveKind;
  /** null for melee: nothing is thrown, so there is no projectile and no element. */
  power: PetPower | null;
  label: string;
  emoji: string;
  /** Signature moves all hit alike; bought powers scale with their price. */
  strength: number;
  signature: boolean;
};

export interface PkRound {
  index: number;
  a: PkMove;
  b: PkMove;
  /** "a" | "b" | "draw" */
  winner: "a" | "b" | "draw";
  /**
   * HP this round took off the loser. Set by resolveTurn, where a blow is worth
   * more than its kind alone — being strong against the defender's type and
   * landing a critical both add to it. Watch mode leaves it unset and is scored
   * in pips, not life.
   */
  damage?: number;
}

export interface PkResult {
  rounds: PkRound[];
  scoreA: number;
  scoreB: number;
  winner: "a" | "b" | "draw";
  /** Settled before the final round — a straight-sets win worth celebrating. */
  flawless: boolean;
  /** Went past the scheduled rounds because the scores were level. */
  suddenDeath: boolean;
}

/** A power's clout, derived from its price so the tiers stay in step (1–3). */
export function powerStrength(power: PetPower): number {
  return Math.max(1, Math.round(power.cost / 10));
}

/**
 * Level helps, but gently — at most 3 across the whole ladder, against a roll of
 * 0–13. Without the cap a level-8 pet would simply never lose, and the rest of
 * the class would stop wanting to play.
 */
function levelBonus(level: number): number {
  return Math.min(3, Math.floor(level / 3));
}

/** How much a pet's whole collection is worth, on top of the move it uses. */
export function collectionBonus(fighter: PkFighter): number {
  return Math.min(uniqueOwned(fighter).length, COLLECTION_CAP);
}

function uniqueOwned(fighter: PkFighter): PetPower[] {
  const seen = new Set<string>();
  const out: PetPower[] = [];
  for (const id of fighter.powers) {
    if (seen.has(id)) continue;
    const p = powerById(id);
    if (!p) continue;
    seen.add(id);
    out.push(p);
  }
  return out;
}

/**
 * Attack options: every shop power bought, plus the species signature under its
 * own name so fox ≠ penguin even at 0 ⚡ shop spends.
 */
export function movePool(fighter: PkFighter): MoveOption[] {
  const options: MoveOption[] = uniqueOwned(fighter).map((p) => ({
    kind: "power",
    power: p,
    label: p.label,
    emoji: p.emoji,
    strength: powerStrength(p),
    signature: false,
  }));

  const sig = fighter.species ? SPECIES_SIGNATURE[fighter.species] : undefined;
  if (sig) {
    const p = powerById(sig.powerId);
    if (p) {
      // Always offer the species move (even if they also bought the same catalog
      // power — "Clever Spark" is not "Magic Sparkle").
      options.push({
        kind: "power",
        power: p,
        label: sig.label,
        emoji: sig.emoji,
        strength: SIGNATURE_STRENGTH,
        signature: true,
      });
    }
  }

  const seen = new Set<string>();
  return options.filter((o) => {
    if (seen.has(o.label)) return false;
    seen.add(o.label);
    return true;
  });
}

/**
 * Flavours for the plain physical attack. Cycled by round rather than drawn at
 * random so the same round always shows the same word — a button whose label
 * changed under the child's finger between renders was worse than a repeat.
 */
export const MELEE_MOVES: ReadonlyArray<{ label: string; emoji: string }> = [
  { label: "Punch", emoji: "👊" },
  { label: "Kick", emoji: "🦵" },
  { label: "Headbutt", emoji: "💥" },
  { label: "Tail Whip", emoji: "🌀" },
];

/** A punch is worth little, but it is worth more than nothing (see BASIC_MOVE). */
export const MELEE_STRENGTH = 1;
/** The big one. Above any power plus a full collection, below a lucky roll. */
export const SUPER_STRENGTH = 6;

/**
 * The plain attack every pet can always throw.
 *
 * Two jobs, and the second is the interesting one:
 *   1. A pet with nothing bought owns exactly one move, so without this the
 *      chooser was a single button and round two had nothing to click.
 *   2. It carries NO element, so it cannot be countered. When the opponent is
 *      about to melt your only Frost move, punching denies them the +4 instead
 *      of handing it over — which is a real decision, and one a child works out
 *      for themselves after losing to it once.
 */
export function meleeOption(roundIndex = 0): MoveOption {
  const flavour = MELEE_MOVES[Math.abs(roundIndex) % MELEE_MOVES.length];
  return {
    kind: "melee",
    power: null,
    label: flavour.label,
    emoji: flavour.emoji,
    strength: MELEE_STRENGTH,
    signature: false,
  };
}

/**
 * The pet's big move, usable once per duel.
 *
 * Built from whatever it hits hardest with, so it looks and sounds like that
 * pet's own move rather than a generic blast — a rabbit supers with "Super Hop
 * Beam" in rainbow, a dragon with "Super Dragon Flame" in fire.
 *
 * It takes its round outright and costs the other pet MOVE_DAMAGE.super, so the
 * element it carries is a look rather than a match-up. The decision it asks for
 * is when to spend it, not what to spend it into.
 */
export function superOption(fighter: PkFighter): MoveOption | null {
  const pool = movePool(fighter);
  if (pool.length === 0) return null;
  const base = pool.reduce((best, o) => (o.strength > best.strength ? o : best), pool[0]);
  return {
    kind: "super",
    power: base.power,
    label: `Super ${base.label}`,
    emoji: "⭐",
    strength: SUPER_STRENGTH,
    signature: base.signature,
  };
}

/**
 * Everything a pet can throw in an INTERACTIVE round: a punch, its powers, and
 * its super until that has been spent.
 *
 * Watch mode deliberately keeps using movePool on its own. Nobody is choosing
 * there, so a punch would just be a weak move drawn at random and a super would
 * be a coin flip deciding the duel — both of which only mean something when
 * there is a hand on the button. It also keeps the watched duel's balance
 * exactly as it has always been measured.
 */
export function battleOptions(
  fighter: PkFighter,
  { roundIndex = 0, superUsed = false }: { roundIndex?: number; superUsed?: boolean } = {}
): MoveOption[] {
  const out: MoveOption[] = [meleeOption(roundIndex), ...movePool(fighter)];
  if (!superUsed) {
    const big = superOption(fighter);
    if (big) out.push(big);
  }
  return out;
}

/**
 * Pick a move at random from this fighter's pool, avoiding the previous round's
 * label when they have 2+ so the duel doesn't look like the same move three
 * times. Returns null only when the pet has no species and nothing bought, which
 * is the BASIC_MOVE tackle case.
 *
 * This is the chooser Watch mode uses for both sides, and the one the Easy PC
 * opponent uses for itself (see lib/pet-ai.ts).
 */
export function pickOption(
  fighter: PkFighter,
  rand: () => number,
  previousLabel?: string | null
): MoveOption | null {
  const pickFrom = selectableFrom(movePool(fighter), previousLabel ?? null);
  if (pickFrom.length === 0) return null;
  return pickFrom[Math.floor(rand() * pickFrom.length)] ?? null;
}

/**
 * The moves a fighter may actually throw this round: everything they own, minus
 * last round's, so a duel is never the same move three times over.
 *
 * The "minus" is dropped whenever it would leave them with no POWER to throw.
 *
 * Leaving them with nothing at all was the first version of this escape, and it
 * was not enough. In the turn-based modes the options carry a punch and a
 * once-per-duel super alongside the powers, so a pet whose only power is its
 * species signature — which is every pet a class actually owns — still had
 * something in the list after the rule bit, and the rule bit every other round.
 * What the child saw was their one real move greyed out on half their turns and
 * a 10% punch they would never choose in its place: 20, 10, 20, 10, against a
 * boss with powers to spare. Repeating your only move is not a duel looking
 * broken, it is a pet that has not been shopped for.
 *
 * A pet with two or more powers still alternates, which is all the rule was for.
 *
 * Both the chooser UI and the random picker read the rule from here, because
 * when they each had their own copy they disagreed, and the one that mattered
 * was the one the child was looking at.
 */
export function selectableFrom(
  options: MoveOption[],
  lastLabel: string | null
): MoveOption[] {
  if (options.length <= 1 || !lastLabel) return options;
  const fresh = options.filter((o) => o.label !== lastLabel);
  if (fresh.length === 0) return options;
  const hasPower = (list: MoveOption[]) => list.some((o) => o.kind === "power");
  if (hasPower(options) && !hasPower(fresh)) return options;
  return fresh;
}

/** selectableFrom, for a fighter's whole pool. */
export function selectableMoves(
  fighter: PkFighter,
  lastLabel: string | null
): MoveOption[] {
  return selectableFrom(movePool(fighter), lastLabel);
}

/**
 * Score a move. `against` is the move the other side is throwing this round —
 * needed because the element bonus is a match-up, not a property of the move on
 * its own. Both sides are resolved from options BOTH have already committed to,
 * so neither can be said to have seen the other's pick first.
 *
 * `chosen` says whether a player (or the PC opponent) picked this move, as
 * opposed to it being rolled at random in Watch mode. The element bonus is paid
 * ONLY on a chosen move, and this is the rule, not a special case:
 *
 *   reading your opponent is worth ELEMENT_BONUS, and you can only read them if
 *   you are the one choosing.
 *
 * Paying it on random picks too was tried first and quietly broke the economy.
 * Both sides pick blind in Watch mode, so a dragon that bought Frost Breath was
 * handing a fire opponent a free +4 two rounds in five: buying three more powers
 * took its win rate DOWN from 72% to 62%. "A purchase must never be a downgrade"
 * (see COLLECTION_CAP above) outranks having one rule fewer.
 */
export function resolveMove(
  fighter: PkFighter,
  picked: MoveOption | null,
  against: MoveOption | null,
  rand: () => number,
  chosen = false
): PkMove {
  const power = picked?.power ?? null;
  const strength =
    (picked ? picked.strength : BASIC_MOVE.power) + collectionBonus(fighter);
  const bonus = levelBonus(fighter.level);
  // Wide enough that investment tilts the odds without settling them; at a
  // narrower range the strongest pet in the class won ~90% and nobody else
  // wanted a turn.
  const roll = Math.floor(rand() * ROLL_RANGE);
  const critical = roll >= CRIT_ROLL;
  const element = elementOf(power?.id);
  const elemBonus = chosen
    ? elementBonusFor(element, elementOf(against?.power?.id))
    : 0;
  return {
    kind: picked?.kind ?? "melee",
    label: picked ? picked.label : BASIC_MOVE.label,
    emoji: picked ? picked.emoji : BASIC_MOVE.emoji,
    power,
    strength,
    levelBonus: bonus,
    roll,
    critical,
    element,
    elementBonus: elemBonus,
    total: strength + bonus + roll + (critical ? CRIT_BONUS : 0) + elemBonus,
    signature: picked?.signature ?? false,
  };
}

/**
 * Score one round: both sides throw at once, highest total takes it.
 *
 * `chosen` is passed straight to resolveMove and applies to BOTH sides — the
 * interactive modes have a player or the PC picking on each side, and Watch mode
 * has neither, so there is no mode where one side reads and the other guesses.
 */
export function resolveRound(
  index: number,
  a: PkFighter,
  b: PkFighter,
  optA: MoveOption | null,
  optB: MoveOption | null,
  rand: () => number = Math.random,
  chosen = false
): PkRound {
  const moveA = resolveMove(a, optA, optB, rand, chosen);
  const moveB = resolveMove(b, optB, optA, rand, chosen);

  // A super takes its round outright.
  //
  // It plays as the power-up scene and a finisher that visibly CONNECTS, so a
  // super that lost on the roll had the screen showing a pet break through,
  // transform and land its ultimate attack — and then its own life bar dropped.
  // The animation and the score were telling the class opposite things.
  //
  // Making it certain also puts the decision where it belongs: not "shall I
  // press the big button" but "which round do I spend my one big move on", which
  // is the question the PC opponent already asks itself (see superIsWorthIt).
  // Both sides get exactly one, so neither can lean on it.
  const superA = optA?.kind === "super";
  const superB = optB?.kind === "super";
  const winner =
    superA && !superB
      ? "a"
      : superB && !superA
        ? "b"
        : moveA.total > moveB.total
          ? "a"
          : moveB.total > moveA.total
            ? "b"
            : "draw";
  return { index, a: moveA, b: moveB, winner };
}

/** A pet's life in the interactive modes, as a percentage. */
export const MAX_HP = 100;

/**
 * What landing each kind of move takes off the other pet.
 *
 * Watch mode does not use these — it is scored as best-of-three pips, and its
 * 32-second cinematic is cut to exactly that. HP only exists where somebody is
 * choosing, because the numbers are there to be weighed up: a super is six
 * punches, so the question is which round to spend it on.
 */
export const MOVE_DAMAGE: Record<MoveKind, number> = {
  melee: 10,
  power: 20,
  super: 60,
};

/** Damage this move deals when it lands. */
export function damageOf(move: Pick<PkMove, "kind">): number {
  return MOVE_DAMAGE[move.kind];
}

/**
 * Rounds an HP duel may run before it is called on who is ahead.
 *
 * Two pets trading punches take ten clean wins each to finish, and alternating
 * wins would never get there at all — so the bout is stopped rather than left
 * to run out the lesson.
 */
export const MAX_HP_ROUNDS = 12;

export interface HpStatus {
  hpA: number;
  hpB: number;
  /** Damage each side has taken so far. */
  lostA: number;
  lostB: number;
  winner: "a" | "b" | "draw";
  settled: boolean;
  /** Stopped on the round cap rather than by a knockout. */
  onPoints: boolean;
}

/**
 * Read a run of rounds as an HP duel: the winner of each round lands their move
 * and takes that much off the loser.
 *
 * A drawn round costs nobody anything — neither pet got through.
 */
export function hpStatus(rounds: PkRound[]): HpStatus {
  let lostA = 0;
  let lostB = 0;
  for (const r of rounds) {
    // The winner lands their own move on the loser, for what that blow was
    // actually worth — resolveTurn adds type advantage and criticals on top.
    if (r.winner === "a") lostB += r.damage ?? damageOf(r.a);
    else if (r.winner === "b") lostA += r.damage ?? damageOf(r.b);
  }
  const hpA = Math.max(0, MAX_HP - lostA);
  const hpB = Math.max(0, MAX_HP - lostB);
  const out = hpA <= 0 || hpB <= 0;
  const capped = rounds.length >= MAX_HP_ROUNDS;
  return {
    hpA,
    hpB,
    lostA,
    lostB,
    winner: hpA > hpB ? "a" : hpB > hpA ? "b" : "draw",
    settled: out || capped,
    onPoints: !out && capped,
  };
}

/**
 * A pet's own element, from its species signature — a penguin is Frost, a dragon
 * is Fire, a panda is Storm.
 *
 * This is what a move is strong or weak AGAINST in the turn-based modes. With
 * both sides choosing at once there was an opposing move to read; taking turns,
 * the defender is not throwing anything, so the thing to read is the pet in
 * front of you. It is also public — a child can see it is a penguin — which
 * keeps the computer's counters fair rather than clairvoyant.
 */
export function petElement(fighter: PkFighter): PetElement | null {
  const sig = fighter.species ? SPECIES_SIGNATURE[fighter.species] : undefined;
  return sig ? elementOf(sig.powerId) : null;
}

/** Extra damage for hitting a pet with the element its own type is weak to. */
export const ELEMENT_DAMAGE_BONUS = 10;
/** Extra damage on a top-end roll. */
export const CRIT_DAMAGE_BONUS = 10;

/**
 * The defender's slot in a turn.
 *
 * A turn has one pet swinging and one taking it, but a PkRound carries a move
 * for each side — so the pet being hit braces instead. It is never announced and
 * never drawn: its beats fall outside the attacker's half of the clip.
 */
export const BRACE_MOVE: PkMove = {
  kind: "melee",
  label: "Brace",
  emoji: "🛡️",
  power: null,
  strength: 0,
  levelBonus: 0,
  roll: 0,
  critical: false,
  element: null,
  elementBonus: 0,
  total: 0,
  signature: false,
};

/** Whose turn it is on this round — the two sides alternate, "a" opening. */
export function attackerAt(roundIndex: number): "a" | "b" {
  return roundIndex % 2 === 0 ? "a" : "b";
}

/**
 * What a move takes off for CERTAIN — everything resolveTurn pays except the
 * critical, which is a roll and must never be promised.
 *
 * The chooser says this out loud so a child can spend their star on the round it
 * settles the duel. The computer has always known: superIsWorthIt asks exactly
 * this question before it spends its own, and a pupil holding theirs "for later"
 * was the only one in the duel without the number.
 *
 * `against` is the defending pet's own type, which is public — you can see it is
 * a penguin.
 */
export function certainDamage(
  option: MoveOption,
  against: PetElement | null
): number {
  // A super costs its sixty and nothing else — see resolveTurn.
  if (option.kind === "super") return MOVE_DAMAGE.super;
  const element = elementOf(option.power?.id);
  const effective = elementBonusFor(element, against) > 0;
  return MOVE_DAMAGE[option.kind] + (effective ? ELEMENT_DAMAGE_BONUS : 0);
}

/**
 * Play one turn: the attacker throws, the defender takes it.
 *
 * Damage is the move's own worth, plus being strong against the defender's type,
 * plus a critical — all flat so a child can do the arithmetic out loud: "twenty
 * for the power, ten more because fire melts frost".
 */
export function resolveTurn(
  index: number,
  attacker: "a" | "b",
  fighter: PkFighter,
  defender: PkFighter,
  picked: MoveOption | null,
  rand: () => number = Math.random
): PkRound {
  const against = petElement(defender);
  const move = resolveMove(fighter, picked, null, rand, false);
  const element = elementOf(picked?.power?.id);
  /**
   * A super costs its sixty and nothing else — no type bonus, no critical.
   *
   * It is the one move in the duel that is spent rather than aimed: you get one,
   * and the only question it asks is WHICH round to spend it on. superOption
   * builds it out of the pet's best move for the look, which is why it carries
   * an element at all, and the PC's own "will this finish them?" test reads
   * MOVE_DAMAGE.super as the exact figure it will take off.
   *
   * Paying the bonuses on it anyway made the star land for 60, 70 or 80 at
   * random — so the most deliberate move in the duel was the least predictable
   * one, a child saving it could not tell whether it would finish the job, and
   * the class watched the same star take a different bite each time.
   */
  const spent = move.kind === "super";
  const effective = !spent && elementBonusFor(element, against) > 0;
  const critical = !spent && move.critical;
  const damage =
    MOVE_DAMAGE[move.kind] +
    (effective ? ELEMENT_DAMAGE_BONUS : 0) +
    (critical ? CRIT_DAMAGE_BONUS : 0);

  const landed: PkMove = {
    ...move,
    // Cleared with the bonus, or the commentary announces a critical that was
    // never paid for.
    critical,
    element,
    elementBonus: effective ? ELEMENT_DAMAGE_BONUS : 0,
  };

  return {
    index,
    a: attacker === "a" ? landed : BRACE_MOVE,
    b: attacker === "b" ? landed : BRACE_MOVE,
    winner: attacker,
    damage,
  };
}

export interface DuelStatus {
  scoreA: number;
  scoreB: number;
  winner: "a" | "b" | "draw";
  /**
   * True when no further round should be played — either someone has taken the
   * majority, or sudden death has run out of patience. The interactive modes ask
   * this after every round to know whether the next one is a plain exchange or
   * the finisher.
   */
  settled: boolean;
  /** Settled before the final round — a straight-sets win worth celebrating. */
  flawless: boolean;
  /** Went past the scheduled rounds because the scores were level. */
  suddenDeath: boolean;
}

/**
 * Read a run of rounds and say where the duel stands.
 *
 * Kept as a pure function of the rounds so the round-by-round modes and runPk
 * apply the same rules: stop the moment it is decided (playing a dead third
 * round after a 2-0 wasted a third of the running time and turned a dominant win
 * into an anticlimax), and keep going rather than end level on a shrug.
 */
export function duelStatus(rounds: PkRound[]): DuelStatus {
  const toWin = Math.floor(PK_ROUNDS / 2) + 1;
  let scoreA = 0;
  let scoreB = 0;
  let scheduled = 0;
  let extra = 0;
  // The scheduled best-of is over once someone reaches the majority or all
  // PK_ROUNDS have been played; everything after that is sudden death.
  let closed = false;

  for (const r of rounds) {
    if (r.winner === "a") scoreA += 1;
    else if (r.winner === "b") scoreB += 1;
    if (closed) {
      extra += 1;
    } else {
      scheduled += 1;
      if (scheduled >= PK_ROUNDS || scoreA >= toWin || scoreB >= toWin) {
        closed = true;
      }
    }
  }

  const level = scoreA === scoreB;
  return {
    scoreA,
    scoreB,
    winner: scoreA > scoreB ? "a" : scoreB > scoreA ? "b" : "draw",
    settled: closed && (!level || extra >= MAX_SUDDEN_DEATH),
    flawless: closed && scheduled < PK_ROUNDS,
    suddenDeath: extra > 0,
  };
}

/**
 * Run a whole duel with both sides choosing at random — Watch mode.
 * `rand` is injectable so the outcome can be tested deterministically.
 */
export function runPk(
  a: PkFighter,
  b: PkFighter,
  rand: () => number = Math.random
): PkResult {
  const rounds: PkRound[] = [];
  let prevA: string | null = null;
  let prevB: string | null = null;
  let status = duelStatus(rounds);

  while (!status.settled) {
    const optA = pickOption(a, rand, prevA);
    const optB = pickOption(b, rand, prevB);
    prevA = optA?.label ?? null;
    prevB = optB?.label ?? null;
    rounds.push(resolveRound(rounds.length, a, b, optA, optB, rand));
    status = duelStatus(rounds);
  }

  return {
    rounds,
    scoreA: status.scoreA,
    scoreB: status.scoreB,
    winner: status.winner,
    flawless: status.flawless,
    suddenDeath: status.suddenDeath,
  };
}

/** Build a fighter from the pieces the Pets tab already has to hand. */
export function toFighter(args: {
  pupilId: string;
  pupilName: string;
  petName?: string;
  species?: string;
  stageId: string;
  exp: number;
  powers: string[];
}): PkFighter {
  return {
    pupilId: args.pupilId,
    pupilName: args.pupilName,
    name: args.petName?.trim() || `${args.pupilName}'s pet`,
    species: args.species,
    stageId: args.stageId,
    level: levelFromExp(args.exp).level,
    // Deduplicate so a glitchy double-purchase can't make the arsenal look
    // like one power on repeat.
    powers: [...new Set(args.powers.filter((id) => PET_POWERS.some((p) => p.id === id)))],
  };
}
