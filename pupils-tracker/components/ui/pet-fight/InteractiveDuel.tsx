"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Shield, Swords, Trophy } from "lucide-react";
import {
  attackerAt,
  battleOptions,
  drawOpener,
  guardsFor,
  guardsLeft,
  hpStatus,
  needsHandover,
  petElement,
  resolveTurn,
  MAX_HP,
  type GuardChoice,
  type GuardOutcome,
  type MoveOption,
  type PkFighter,
  type PkRound,
} from "@/lib/pet-pk";
import { ELEMENTS, advantageLine } from "@/lib/pet-elements";
import { chooseAiGuard, chooseAiMove } from "@/lib/pet-ai";
import type { Difficulty } from "@/lib/pet-boss";
import { sceneSrc } from "@/lib/pets";
import { BEAT } from "@/lib/pet-fight/storyboard";
import {
  clipFor,
  endingClip,
  finisherAlreadySpent,
} from "@/lib/pet-fight/clips";
import { pickFinale, type FinaleId } from "@/lib/pet-fight/finales";
import { pickPowerUp, type PowerUpId } from "@/lib/pet-fight/powerups";
import { duelAudio } from "@/lib/pet-fight/pk-audio";
import { schedulePkDuelAudio } from "@/lib/sound";
import type { FightSpeechLine } from "@/lib/pet-fight/poses";
import { Button } from "@/components/ui/Button";
import { PetFightPlayer } from "@/components/ui/pet-fight/PetFightPlayer";
import { castFromMove, sideOf } from "@/components/ui/pet-fight/fight-cast";
import { MoveChooser } from "@/components/ui/pet-fight/MoveChooser";
import { GuardChooser } from "@/components/ui/pet-fight/GuardChooser";

/**
 * A turn is two hidden choices, so it is two phases.
 *
 * "choosing" is the attacker picking a blow; "guarding" is the pet about to take
 * it picking how — WITHOUT the attack having been drawn or named. Resolving both
 * at once, the way this used to, is what made the duel a race the opener always
 * won (see GuardChoice in lib/pet-pk.ts).
 */
type Phase =
  | "choosing"
  | "handoff"
  | "guarding"
  | "clash"
  | "finale"
  | "over";

/**
 * A duel where somebody actually chooses.
 *
 * The loop is: one pet swings and the other guards, the exchange plays as a
 * SEGMENT of the cinematic, the life bars update, repeat — until hpStatus says
 * it is settled, at which point that deciding round runs on through the
 * power-up, the finisher and the K.O. So the last round IS the cinematic the
 * class already knows, rather than a trimmed version of it.
 *
 * Scored in LIFE, not in the best-of-three pips Watch mode uses: duelStatus and
 * resolveRound belong to that other half of the game and are not used here.
 *
 * `ai` decides who fills the right-hand seat: given, the computer plays; omitted,
 * a second pupil does. Nothing else differs between the two modes, which is why
 * this is one component and not two.
 */
export function InteractiveDuel({
  a,
  b,
  ai,
  scene,
  muted,
  onRestart,
  onExit,
}: {
  a: PkFighter;
  b: PkFighter;
  /** Difficulty when the right-hand pet is the computer; omit for 2 players. */
  ai?: Difficulty;
  scene: string;
  muted: boolean;
  onRestart: () => void;
  onExit: () => void;
}) {
  const [rounds, setRounds] = useState<PkRound[]>([]);
  /**
   * Who swings first, drawn once per duel.
   *
   * Held in state rather than recomputed, because it has to survive every render
   * of the duel it belongs to. A fresh one is drawn on the next duel because
   * PetBattle remounts this component on its runKey.
   *
   * It was fixed at "a" before, which meant the pupil always opened against the
   * computer and the computer always carried the compensating fourth shield —
   * fair on the numbers, and permanently drawn on the wrong side of the screen.
   * See drawOpener in lib/pet-pk.ts.
   */
  const [opener] = useState<"a" | "b">(drawOpener);
  const [phase, setPhase] = useState<Phase>("choosing");
  const [clashKey, setClashKey] = useState(0);
  // The pair drawn for whichever scene is playing, so the knockout that follows
  // a blow uses the same finisher the blow set up.
  const finaleRef = useRef({ finale: "beam" as FinaleId, powerUp: "gold" as PowerUpId });
  /**
   * One blow per turn, however many times the trigger fires.
   *
   * Two calls landing in the same tick both read the state from before either of
   * them — which let the computer take two turns at once, and spend a super on
   * each, because neither had seen the other mark it as used.
   */
  const committingRef = useRef(false);
  /**
   * The attack that has been locked in and is waiting on a guard.
   *
   * Held rather than resolved because the pet taking it has not chosen yet — and
   * deliberately not rendered anywhere while it waits, or the guess the guard is
   * supposed to be would be made with the answer on screen. `null` is a real
   * value here (a pet with nothing throws a Tackle), so the phase, not this, is
   * what says whether a blow is pending.
   */
  const [pending, setPending] = useState<MoveOption | null>(null);
  /**
   * The AI step already taken, as `<step>:<turn>`.
   *
   * A turn now asks the computer for two separate decisions, and each fires from
   * its own effect. Keying on the phase alone re-ran them whenever anything else
   * in the closure changed — the same class of bug the committing flag above was
   * added for, one step further along.
   */
  const aiStepRef = useRef("");
  // One super each per duel. Tracked per side rather than as a count so the
  // chooser can drop the button the moment it has been spent.
  const [superUsed, setSuperUsed] = useState({ a: false, b: false });
  const [speech, setSpeech] = useState<FightSpeechLine[]>([]);
  // One finisher and one transformation per duel, drawn when it starts, so the
  // ending is a surprise but does not change between the rounds leading to it.
  const [finale, setFinale] = useState<FinaleId>(() => pickFinale());
  const [powerUp, setPowerUp] = useState<PowerUpId>(() => pickPowerUp());

  // The interactive modes run a real life bar: a punch takes 10, a power 20 and
  // a super 60, and the duel ends when one pet is out rather than after three
  // rounds. Watch mode keeps the pips its cinematic is cut to.
  const status = hpStatus(rounds);
  const played = rounds.length;
  // Rebuilt each round: the punch flavour cycles, and the super disappears once
  // it has been thrown.
  const poolA = useMemo(
    () => battleOptions(a, { roundIndex: played, superUsed: superUsed.a }),
    [a, played, superUsed.a]
  );
  const poolB = useMemo(
    () => battleOptions(b, { roundIndex: played, superUsed: superUsed.b }),
    [b, played, superUsed.b]
  );
  const last = rounds[played - 1];
  /**
   * Whose turn it is. The sides alternate from whoever was drawn to open, so
   * exactly one pet swings per clip and the other takes it.
   */
  const turn = attackerAt(played, opener);
  const attacker = turn === "a" ? a : b;
  const defender = turn === "a" ? b : a;
  const defending: "a" | "b" = turn === "a" ? "b" : "a";
  // Shields are derived from the rounds, like the life bars, so there is one
  // account of the duel rather than a second one kept in state beside it.
  const guards = useMemo(
    () => ({
      a: guardsLeft(rounds, "a", opener),
      b: guardsLeft(rounds, "b", opener),
    }),
    [rounds, opener]
  );
  const defenderGuards = guards[defending];
  /**
   * The 2-player look-away, taken BEFORE the attack is chosen.
   *
   * Asking the defender to look away after the button was pressed hid nothing —
   * they had already watched it pressed. So each such turn opens on a prompt,
   * and the chooser only appears once the attacker says the coast is clear.
   * Keyed by round rather than kept as a phase, so a new turn is concealed again
   * without every path into "choosing" having to remember to ask.
   */
  const [lookedAwayFor, setLookedAwayFor] = useState(-1);
  const hiding = needsHandover(!ai, defenderGuards);
  const concealing = phase === "choosing" && hiding && lookedAwayFor !== played;
  // The last move THIS side threw, so it cannot be repeated — two rounds back,
  // since the turns alternate.
  const ownLast = rounds[played - 2];
  const ownLastLabel = (turn === "a" ? ownLast?.a.label : ownLast?.b.label) ?? null;
  // What a move is strong against: the pet in front of you, not a move it is
  // about to throw. Public information — you can see it is a penguin.
  const defenderElement = petElement(defender);

  /**
   * The round the stage is showing: always the one most recently resolved.
   *
   * Deliberately NOT blanked while the next move is being chosen. The player is
   * not remounted between a clash and the choosing phase that follows, so it
   * holds the last frame of that exchange — and if the HUD stopped reporting the
   * round at the same moment, the life bars would refill in front of the class
   * and then empty again when the next clip started.
   */
  const shown = last;
  // The finisher plays on the round that settles it, and only then.
  const finishing = status.settled;
  /**
   * Has a finisher already fired in this duel?
   *
   * A super plays the finisher as its own scene, and SEGMENT.knockout plays it
   * again on the way to the knockdown — so a pet that supered early and then
   * won with an ordinary punch fired the same beam twice, which the class reads
   * as the computer spending a second superpower. Once it has been spent the
   * ending resumes where the super scene stopped and delivers only the
   * knockdown.
   */
  const finisherSpent = useMemo(() => finisherAlreadySpent(rounds), [rounds]);
  const ending = endingClip(finisherSpent);
  /**
   * A super does not throw a projectile on the attack beat — it plays the
   * power-up scene and the finisher, which is what the class already reads as
   * "the final power". The side that spent it is the one that transforms.
   */
  const superSide: "a" | "b" | null =
    shown?.winner === "a" && shown.a.kind === "super"
      ? "a"
      : shown?.winner === "b" && shown.b.kind === "super"
        ? "b"
        : null;
  const superScene = superSide !== null;
  const clip =
    phase === "finale"
      ? { ...ending, endsDuel: true }
      : clipFor(superScene, finishing, shown?.winner === "b" ? "b" : "a");
  const segment = clip;

  // HP carried in from earlier rounds, so each clip opens where the last one
  // left the bars instead of resetting the score in front of the class.
  const priorLosses = useMemo(() => {
    const before = hpStatus(rounds.slice(0, -1));
    return { a: before.lostA, b: before.lostB };
  }, [rounds]);

  /** What the blow being watched takes off the pet receiving it. */
  const roundDamage = useMemo(() => {
    if (!shown?.damage) return { a: 0, b: 0 };
    return shown.winner === "a"
      ? { a: 0, b: shown.damage }
      : { a: shown.damage, b: 0 };
  }, [shown]);

  const commit = (option: MoveOption | null, guard: GuardChoice) => {
    if (committingRef.current) return;
    committingRef.current = true;
    const round = resolveTurn(
      played,
      turn,
      attacker,
      defender,
      option,
      Math.random,
      guard
    );
    if (option?.kind === "super") {
      setSuperUsed((u) => ({ ...u, [turn]: true }));
    }
    const next = [...rounds, round];
    const after = hpStatus(next);
    const big = option?.kind === "super" ? turn : null;
    const scene = big !== null;
    const seg = clipFor(scene, after.settled, turn);

    // Draw a fresh transformation and finisher whenever one is about to play, so
    // two supers in a duel neither level up nor land the same way.
    const thisFinale = scene || after.settled ? pickFinale() : finale;
    const thisPowerUp = scene || after.settled ? pickPowerUp() : powerUp;
    if (scene || after.settled) {
      setFinale(thisFinale);
      setPowerUp(thisPowerUp);
    }
    finaleRef.current = { finale: thisFinale, powerUp: thisPowerUp };

    const { lines, cues } = duelAudio(a, b, round, {
      offset: seg.from,
      until: seg.to,
      announce: next.length === 1 && !scene,
      superScene: scene
        ? {
            finale: thisFinale,
            powerUp: thisPowerUp,
            side: big,
            // When it also ends the duel this clip carries the knockdown too,
            // so there is no second ending to schedule.
            knockout: seg.endsDuel,
            winner: after.winner,
          }
        : undefined,
    });

    setRounds(next);
    setSpeech(lines);
    setPhase("clash");
    setClashKey((k) => k + 1);
    if (!muted && cues.length) schedulePkDuelAudio(cues);
  };

  /**
   * The attacking player locks their blow in. Nothing plays yet — the pet on the
   * receiving end has to choose how to take it first, and must do that without
   * seeing this.
   */
  const lockIn = (option: MoveOption | null) => {
    if (phase !== "choosing" || concealing || committingRef.current) return;
    // Nothing left to decide: with no shields, "take it" is the only legal
    // guard. Asking for it anyway put a button with one answer in front of a
    // child on every remaining turn of the duel, which reads as the game
    // stalling rather than as a choice.
    if (defenderGuards <= 0) {
      commit(option, "take");
      return;
    }
    setPending(option);
    // Two pupils share one screen, so the guess has to be hidden from the ROOM,
    // not just from the DOM — see Handoff below.
    setPhase(hiding ? "handoff" : "guarding");
  };

  /** The defender has looked away, so the attacker may now choose. */
  const lookedAway = () => {
    if (concealing) setLookedAwayFor(played);
  };

  /** Player 2 has taken over and Player 1 has looked away. */
  const ready = () => {
    if (phase === "handoff") setPhase("guarding");
  };

  /** The defending player commits their guess and the blow plays. */
  const guard = (choice: GuardChoice) => {
    if (phase !== "guarding") return;
    commit(pending, choice);
  };

  /** How the player took the PC's last blow — all the PC is allowed to know. */
  const playerLastGuard = useMemo(() => {
    const hit = [...rounds].reverse().find((r) => r.winner === "b");
    return hit?.guard ?? null;
  }, [rounds]);
  /** The last kind of blow the player threw, for the PC's own guarding. */
  const playerLastKind = useMemo(() => {
    const swing = [...rounds].reverse().find((r) => r.winner === "a");
    return swing?.a.kind ?? null;
  }, [rounds]);

  /**
   * The computer's two decisions, each taken once per turn.
   *
   * Attacking used to sit behind a "See their move" button, which was one tap of
   * nothing to read between every pair of turns — and tapping it twice quickly
   * was what let the computer move twice. Guarding never had a button at all,
   * because until there was a guard the computer simply stood there.
   */
  const aiAttacks = !!ai && phase === "choosing" && turn === "b";
  const aiGuards = !!ai && phase === "guarding" && defending === "b";
  const aiStep = aiAttacks ? `attack:${played}` : aiGuards ? `guard:${played}` : "";
  useEffect(() => {
    if (!aiStep || aiStepRef.current === aiStep) return;
    aiStepRef.current = aiStep;
    // Off the effect's own tick: committing state from inside an effect is both
    // a lint error and the thing that let two turns run at once.
    const id = setTimeout(() => {
      if (aiAttacks) {
        lockIn(
          chooseAiMove(b, ai!, defenderElement, ownLastLabel, Math.random, {
            roundIndex: played,
            superUsed: superUsed.b,
            hpSelf: status.hpB,
            hpOpponent: status.hpA,
            opponentLastGuard: playerLastGuard,
            opponentGuards: guards.a,
          })
        );
      } else {
        commit(
          pending,
          chooseAiGuard(ai!, {
            guardsLeft: guards.b,
            opponentLastKind: playerLastKind,
          })
        );
      }
    }, 0);
    return () => clearTimeout(id);
    // Both closures are pinned to this turn by the step key above; re-running on
    // anything else would take a second turn or guard the same blow twice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiStep]);

  /** The clash finished playing: either the duel is over or the next round opens. */
  const onClashDone = () => {
    // Either the ending has just played, or this clip carried it itself.
    if (phase === "finale" || clip.endsDuel) {
      setPhase("over");
      return;
    }
    if (!finishing) {
      committingRef.current = false;
      setPending(null);
      setPhase("choosing");
      return;
    }
    // Somebody is out: run the ending as its own clip.
    const { finale: f, powerUp: pu } = finaleRef.current;
    const { cues } = duelAudio(a, b, last, {
      offset: ending.from,
      until: ending.to,
      finish: { finale: f, powerUp: pu, winner: status.winner },
    });
    setSpeech([]);
    setPhase("finale");
    setClashKey((k) => k + 1);
    if (!muted && cues.length) schedulePkDuelAudio(cues);
  };

  const bracing = phase === "guarding" || phase === "handoff";
  const choosing = phase === "choosing" || bracing;
  const roundNo = choosing ? played + 1 : played;
  // Whose decision the bar is waiting on, and whether it is one a hand makes.
  const actorName = bracing ? defender.name : attacker.name;
  const actorIsPc = phase === "guarding" ? aiGuards : aiAttacks;
  const actorVerb =
    concealing
      ? `is up — Player ${defending === "a" ? 1 : 2}, look away`
      : phase === "handoff"
      ? "braces — swap over"
      : phase === "guarding"
        ? actorIsPc
          ? "is bracing"
          : "braces — pick your guard"
        : actorIsPc
          ? "is thinking"
          : "attacks";

  return (
    <>
      <PetFightPlayer
        key={clashKey}
        // The stage is 16:9 off its width, so at the modal's full 6xl width it
        // stands ~650px tall and pushes the move chooser off the bottom of a
        // laptop screen — which looks exactly like the fight having frozen,
        // because there is then nothing on screen to click. Capping the width
        // caps the height with it, and 104vh of width is ~58vh of height: the
        // largest the stage can be while still leaving the turn bar and one
        // chooser on screen. It was 68vh while BOTH players' choosers sat side
        // by side; taking turns needs room for only one.
        className="mx-auto w-full max-w-[min(100%,104vh)]"
        from={segment.from}
        to={segment.to}
        left={castFromMove(a, shown?.a ?? {}, "left")}
        right={castFromMove(b, shown?.b ?? {}, "right")}
        winner={sideOf(
          phase === "finale" ? status.winner : (shown?.winner ?? "draw")
        )}
        sceneSrc={sceneSrc(scene)}
        finale={finale}
        powerUp={powerUp}
        // Only a super transforms. The ending's own clip starts past XFORM_OUT,
        // so there is nothing to power up there either.
        transform={superScene}
        sound={false}
        loop={false}
        autoPlay={!choosing}
        speech={speech}
        hud={{
          leftName: a.name,
          rightName: b.name,
          // The ending opens with the damage already done, so it has no blow of
          // its own to deal.
          roundWinners: phase === "finale" || !shown ? [] : [shown.winner],
          priorLosses:
            phase === "finale" ? { a: status.lostA, b: status.lostB } : priorLosses,
          roundDamage: phase === "finale" ? { a: 0, b: 0 } : roundDamage,
          maxHp: MAX_HP,
          // The super scene opens long after the 4.5 / 8.85 attack beats, so the
          // pip has to wait for the finisher rather than coming off at once.
          damageAt: superScene ? BEAT.impact : undefined,
          duelWinner:
            phase === "finale" || clip.endsDuel ? sideOf(status.winner) : undefined,
        }}
        onComplete={onClashDone}
      />

      {choosing ? (
        <>
          <RoundBar
            roundNo={roundNo}
            hpA={status.hpA}
            hpB={status.hpB}
            nameA={a.name}
            nameB={b.name}
            guardsA={guards.a}
            guardsB={guards.b}
            totalA={guardsFor("a", opener)}
            totalB={guardsFor("b", opener)}
            actorName={actorName}
            actorVerb={actorVerb}
          />
          {concealing ? (
            <LookAway
              attackerLabel={`Player ${turn === "a" ? 1 : 2}`}
              defenderLabel={`Player ${defending === "a" ? 1 : 2}`}
              onReady={lookedAway}
            />
          ) : phase === "choosing" ? (
            aiAttacks ? null : (
              <MoveChooser
                fighter={attacker}
                options={turn === "a" ? poolA : poolB}
                lastLabel={ownLastLabel}
                defenderName={defender.name}
                defenderElement={defenderElement}
                defenderHp={turn === "a" ? status.hpB : status.hpA}
                defenderGuards={defenderGuards}
                title={ai ? "Your turn" : `Player ${turn === "a" ? 1 : 2}'s turn`}
                side={turn === "a" ? "left" : "right"}
                onChoose={lockIn}
              />
            )
          ) : phase === "handoff" ? (
            <Handoff
              attackerLabel={`Player ${turn === "a" ? 1 : 2}`}
              defenderLabel={`Player ${defending === "a" ? 1 : 2}`}
              defenderName={defender.name}
              onReady={ready}
            />
          ) : aiGuards ? null : (
            <GuardChooser
              fighter={defender}
              guardsLeft={defenderGuards}
              guardsTotal={guardsFor(defending, opener)}
              attackerName={attacker.name}
              title={
                ai ? "Brace yourself" : `Player ${defending === "a" ? 1 : 2}, brace!`
              }
              side={defending === "a" ? "left" : "right"}
              onChoose={guard}
            />
          )}
        </>
      ) : (
        <ClashBar
          round={shown}
          nameA={a.name}
          nameB={b.name}
          // As soon as the deciding blow has landed, rather than when the
          // cinematic runs out ~10 seconds later. For all of that knockout a
          // pet on 0% was still swinging with nothing on screen saying it was
          // over, so the class could not tell a finished duel from one still
          // being played — and nobody could hit Fight again until it stopped.
          //
          // Not on `finishing` alone: that is true the instant the round is
          // committed, which is BEFORE the blow connects on screen. Naming the
          // winner over a life bar that has not dropped yet is its own kind of
          // wrong.
          decided={phase === "finale" || phase === "over"}
          winner={status.winner}
          hpA={status.hpA}
          hpB={status.hpB}
          onRestart={onRestart}
          onExit={onExit}
        />
      )}
    </>
  );
}

/**
 * Shields a pet has left, as pips — the same account the chooser shows.
 *
 * `total` per side, not one constant: the pet going second carries an extra one
 * (SECOND_STRIKE_SHIELD), and that fourth pip is the whole explanation of why
 * the seats are fair. It has to be visible.
 */
function Shields({
  left,
  total,
  label,
}: {
  left: number;
  total: number;
  label: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-0.5 align-middle"
      aria-label={`${label}: ${left} of ${total} shields left`}
    >
      {Array.from({ length: total }, (_, i) => (
        <Shield
          key={i}
          aria-hidden="true"
          className={`h-3 w-3 ${
            i < left ? "fill-brand-300 text-brand-300" : "text-paper-400/50"
          }`}
        />
      ))}
    </span>
  );
}

/**
 * The 2-player look-away, BEFORE the attacker chooses.
 *
 * The guard only works as a game because it is a GUESS — the whole reason the
 * duel stopped being won by whoever swung first (see GuardChoice in
 * lib/pet-pk.ts). InteractiveDuel keeps the pending move out of the DOM to
 * protect that, which is enough against the computer.
 *
 * It is not enough against a classmate. Both children are at one screen — the
 * modal is badged "Big screen" — so the defender can watch the attacker press
 * the button. With the attack known, a defender evades every power and blocks
 * every punch, damage collapses, and the bout drifts to the round cap and ends
 * on points.
 *
 * Nothing in software can stop someone looking, so this asks — and asks first.
 * A prompt shown after the button was pressed (the first version of this) came
 * too late to hide anything.
 */
function LookAway({
  attackerLabel,
  defenderLabel,
  onReady,
}: {
  attackerLabel: string;
  defenderLabel: string;
  onReady: () => void;
}) {
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-2 rounded-card border-2 border-paper-200 bg-surface p-4 text-center"
    >
      <span className="text-2xl leading-none" aria-hidden="true">
        🙈
      </span>
      <p className="font-display text-sm font-extrabold text-paper-900">
        {defenderLabel}, look away!
      </p>
      <p className="max-w-prose text-2xs font-bold text-paper-400">
        {attackerLabel} is about to choose an attack. No peeking — guessing it is
        the whole game.
      </p>
      <Button onClick={onReady} autoFocus>
        <Swords className="h-4 w-4" />
        {attackerLabel}: they are not looking
      </Button>
    </div>
  );
}

/**
 * The 2-player hand-over, between the attack being locked in and the guard: a
 * beat long enough to swap places, so the attacker is off the controls before
 * the defender's guard comes up.
 */
function Handoff({
  attackerLabel,
  defenderLabel,
  defenderName,
  onReady,
}: {
  attackerLabel: string;
  defenderLabel: string;
  defenderName: string;
  onReady: () => void;
}) {
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-2 rounded-card border-2 border-paper-200 bg-surface p-4 text-center"
    >
      <span className="text-2xl leading-none" aria-hidden="true">
        🤫
      </span>
      <p className="font-display text-sm font-extrabold text-paper-900">
        {attackerLabel} has chosen — swap over!
      </p>
      <p className="max-w-prose text-2xs font-bold text-paper-400">
        {defenderLabel}, it is {defenderName}&rsquo;s turn to brace. Pick your
        guard without knowing what is coming — that is the whole game.
      </p>
      <Button onClick={onReady} autoFocus>
        <Shield className="h-4 w-4" />
        {defenderLabel} ready
      </Button>
    </div>
  );
}

function RoundBar({
  roundNo,
  hpA,
  hpB,
  nameA,
  nameB,
  guardsA,
  guardsB,
  totalA,
  totalB,
  actorName,
  actorVerb,
}: {
  roundNo: number;
  hpA: number;
  hpB: number;
  nameA: string;
  nameB: string;
  guardsA: number;
  guardsB: number;
  /**
   * Shields each side STARTED with. Passed in rather than read from guardsFor
   * here, because the answer depends on which seat opened this duel and that is
   * drawn per duel — a bar that assumed "a" opened drew the extra pip on the
   * wrong pet half the time.
   */
  totalA: number;
  totalB: number;
  /** Whose decision the duel is waiting on, and what kind of decision it is. */
  actorName: string;
  actorVerb: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-card bg-surface/10 px-4 py-2">
      <p className="flex items-center gap-2 font-display text-sm font-extrabold text-surface">
        <Swords className="h-4 w-4 text-brand-300" />
        {`Turn ${roundNo}`}
        <span className="font-sans text-2xs font-bold uppercase tracking-wider text-brand-300">
          {actorName} {actorVerb}
        </span>
      </p>
      <p className="flex items-center gap-1.5 text-xs font-extrabold text-paper-200">
        {nameA} <Shields left={guardsA} total={totalA} label={nameA} />{" "}
        {hpA}% – {hpB}%{" "}
        <Shields left={guardsB} total={totalB} label={nameB} /> {nameB}
      </p>
      <p className="w-full text-2xs font-bold text-paper-400 sm:w-auto">
        🔥 melts ❄️ · ❄️ freezes 🌪️ · 🌪️ blows out 🔥 · 🛡️ halves · 💨 slips a
        power, but a 👊 punch catches it ·{" "}
        <span className="text-paper-500">
          whoever goes second gets an extra 🛡️
        </span>
      </p>
    </div>
  );
}

/**
 * What each guard outcome is called on screen.
 *
 * Named from the DEFENDER's point of view, because the guard was their decision
 * and the class needs to see it pay off or not: a dodge that works is the loudest
 * moment in the duel, and one that walks into a fist is the lesson.
 */
const GUARD_NOTE: Record<
  GuardOutcome,
  { emoji: string; text: string; tone: string } | null
> = {
  taken: null,
  blocked: { emoji: "🛡️", text: "blocked it — half damage", tone: "text-brand-300" },
  evaded: { emoji: "💨", text: "slipped it completely!", tone: "text-brand-300" },
  punished: {
    emoji: "💥",
    text: "dodged into the punch — double damage!",
    tone: "text-mark-amber",
  },
};

function ClashBar({
  round,
  nameA,
  nameB,
  decided,
  winner,
  hpA,
  hpB,
  onRestart,
  onExit,
}: {
  round?: PkRound;
  nameA: string;
  nameB: string;
  /** The duel is settled — say so now, even while the knockout is still playing. */
  decided: boolean;
  winner: "a" | "b" | "draw";
  hpA: number;
  hpB: number;
  onRestart: () => void;
  onExit: () => void;
}) {
  // Call out an element read the moment it lands — it is the whole reason the
  // pick mattered, and without saying so the +4 is invisible.
  // One pet swings per turn, so the commentary is about that blow: who threw
  // what, whether the type told, and what it cost.
  const attacker = round?.winner === "b" ? nameB : nameA;
  const receiver = round?.winner === "b" ? nameA : nameB;
  const blow = round ? (round.winner === "b" ? round.b : round.a) : undefined;
  const effective = (blow?.elementBonus ?? 0) > 0;
  // What the guard was worth, said in the same breath as the blow — otherwise a
  // power that took 0% reads as the game having lost count.
  const guarded = GUARD_NOTE[round?.guardOutcome ?? "taken"];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        {blow && (
          <p className="truncate text-xs font-bold text-paper-200">
            <span className="text-surface">{attacker}</span> used{" "}
            <span aria-hidden="true">{blow.emoji}</span>{" "}
            <span className="text-surface">{blow.label}</span>
            {blow.element && (
              <span className="text-paper-400"> {ELEMENTS[blow.element].emoji}</span>
            )}
            <span className="px-1.5 text-paper-400">→</span>
            <span className="text-surface">−{round?.damage}%</span>{" "}
            <span className="text-paper-400">off {receiver}</span>
          </p>
        )}
        {blow?.kind === "super" && (
          <p className="text-2xs font-extrabold uppercase tracking-wider text-mark-amber">
            ⭐ {attacker} broke through!
          </p>
        )}
        {guarded && (
          <p
            className={`text-2xs font-extrabold uppercase tracking-wider ${guarded.tone}`}
          >
            {guarded.emoji} {receiver} {guarded.text}
          </p>
        )}
        {effective && blow?.element && (
          <p className="text-2xs font-extrabold uppercase tracking-wider text-brand-300">
            {/* If the blow was effective, the pet it hit is by definition the
                type that blow's element beats. */}
            Super effective — {advantageLine(blow.element, ELEMENTS[blow.element].beats)}
          </p>
        )}
        {blow?.critical && (
          <p className="text-2xs font-extrabold uppercase tracking-wider text-mark-amber">
            Critical hit!
          </p>
        )}
        {decided && (
          <p className="flex items-center gap-1.5 font-display text-sm font-extrabold text-surface">
            <Trophy className="h-4 w-4 text-mark-amber" />
            {winner === "draw"
              ? "Honours even — a perfect draw!"
              : `${winner === "a" ? nameA : nameB} wins with ${Math.max(hpA, hpB)}% life left.`}
          </p>
        )}
      </div>
      {decided && (
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={onExit}
            className="flex items-center gap-1.5 rounded-md border border-paper-200/30 bg-surface/10 px-4 py-2 text-sm font-extrabold text-paper-200 outline-none transition-colors hover:bg-surface/20 focus-visible:shadow-ring"
          >
            New match
          </button>
          <Button onClick={onRestart}>
            <Play className="h-4 w-4" />
            Fight again
          </Button>
        </div>
      )}
    </div>
  );
}
