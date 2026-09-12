"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Swords, Trophy } from "lucide-react";
import {
  attackerAt,
  battleOptions,
  hpStatus,
  petElement,
  resolveTurn,
  MAX_HP,
  type MoveOption,
  type PkFighter,
  type PkRound,
} from "@/lib/pet-pk";
import { ELEMENTS, advantageLine } from "@/lib/pet-elements";
import { chooseAiMove } from "@/lib/pet-ai";
import type { Difficulty } from "@/lib/pet-boss";
import { sceneSrc } from "@/lib/pets";
import { BEAT, SEGMENT } from "@/lib/pet-fight/storyboard";
import { pickFinale, type FinaleId } from "@/lib/pet-fight/finales";
import { pickPowerUp, type PowerUpId } from "@/lib/pet-fight/powerups";
import { duelAudio } from "@/lib/pet-fight/pk-audio";
import { schedulePkDuelAudio } from "@/lib/sound";
import type { FightSpeechLine } from "@/lib/pet-fight/poses";
import { Button } from "@/components/ui/Button";
import { PetFightPlayer } from "@/components/ui/pet-fight/PetFightPlayer";
import { castFromMove, sideOf } from "@/components/ui/pet-fight/fight-cast";
import { MoveChooser } from "@/components/ui/pet-fight/MoveChooser";

type Phase = "choosing" | "clash" | "finale" | "over";

/**
 * Which window of the cinematic a blow plays in.
 *
 * Deliberately the only place this is decided. It used to be worked out twice —
 * once when scheduling the soundtrack and once when rendering the stage — and
 * the two disagreed about a super that finished the duel: the audio played the
 * whole power-up and finisher while the picture played a three-second turn, and
 * then the knockout clip fired a SECOND finisher. It looked and sounded like
 * the computer using two supers in a row.
 */
function clipFor(
  superThrown: boolean,
  finishes: boolean,
  attacker: "a" | "b"
): { from: number; to: number; endsDuel: boolean } {
  // A super that finishes a pet runs straight through as one ending: break
  // through, fire, knock them down, name the winner. Nothing follows it.
  if (superThrown && finishes) {
    return { from: SEGMENT.super.from, to: SEGMENT.finish.to, endsDuel: true };
  }
  if (superThrown) return { ...SEGMENT.super, endsDuel: false };
  return { ...(attacker === "b" ? SEGMENT.turnB : SEGMENT.turnA), endsDuel: false };
}

/**
 * A duel where somebody actually chooses.
 *
 * The loop is: both sides commit a move, the exchange plays as a SEGMENT of the
 * cinematic, the pips update, repeat — until duelStatus says it is settled, at
 * which point that deciding round runs on through the power-up, the finisher and
 * the K.O. So the last round IS the cinematic the class already knows, rather
 * than a trimmed version of it.
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
   * Whose turn it is. The sides alternate, the left pet opening, so exactly one
   * pet swings per clip and the other takes it.
   */
  const turn = attackerAt(played);
  const attacker = turn === "a" ? a : b;
  const defender = turn === "a" ? b : a;
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
  const finisherSpent = useMemo(
    () =>
      rounds.some(
        (r) =>
          (r.winner === "a" ? r.a : r.winner === "b" ? r.b : null)?.kind ===
          "super"
      ),
    [rounds]
  );
  const ending = finisherSpent ? SEGMENT.knockdown : SEGMENT.knockout;
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

  const commit = (option: MoveOption | null) => {
    if (committingRef.current) return;
    committingRef.current = true;
    const round = resolveTurn(played, turn, attacker, defender, option);
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

  /** The attacking player locks their move in and the blow plays. */
  const choose = (option: MoveOption) => {
    if (phase !== "choosing") return;
    commit(option);
  };

  /**
   * The computer's turn plays itself.
   *
   * It used to sit behind a "See their move" button, which was one tap of
   * nothing to read between every pair of turns — and tapping it twice quickly
   * was what let the computer move twice.
   */
  const aiTurn = !!ai && turn === "b";
  useEffect(() => {
    if (phase !== "choosing" || !aiTurn) return;
    // Off the effect's own tick: committing state from inside an effect is both
    // a lint error and the thing that let two turns run at once.
    const id = setTimeout(() => {
      commit(
        chooseAiMove(b, ai!, defenderElement, ownLastLabel, Math.random, {
          roundIndex: played,
          superUsed: superUsed.b,
          hpSelf: status.hpB,
          hpOpponent: status.hpA,
        })
      );
    }, 0);
    return () => clearTimeout(id);
    // commit closes over this turn's state, which the guard above pins to one
    // call; re-running on anything else would take a second turn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, aiTurn, played]);

  /** The clash finished playing: either the duel is over or the next round opens. */
  const onClashDone = () => {
    // Either the ending has just played, or this clip carried it itself.
    if (phase === "finale" || clip.endsDuel) {
      setPhase("over");
      return;
    }
    if (!finishing) {
      committingRef.current = false;
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

  const roundNo = phase === "choosing" ? played + 1 : played;

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
        autoPlay={phase !== "choosing"}
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

      {phase === "choosing" ? (
        <>
          <RoundBar
            roundNo={roundNo}
            hpA={status.hpA}
            hpB={status.hpB}
            nameA={a.name}
            nameB={b.name}
            turnName={ai && turn === "b" ? b.name : attacker.name}
            yours={!ai || turn === "a"}
          />
          {aiTurn ? null : (
            <MoveChooser
              fighter={attacker}
              options={turn === "a" ? poolA : poolB}
              lastLabel={ownLastLabel}
              defenderName={defender.name}
              defenderElement={defenderElement}
              title={ai ? "Your turn" : `Player ${turn === "a" ? 1 : 2}'s turn`}
              side={turn === "a" ? "left" : "right"}
              onChoose={choose}
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

function RoundBar({
  roundNo,
  hpA,
  hpB,
  nameA,
  nameB,
  turnName,
  yours,
}: {
  roundNo: number;
  hpA: number;
  hpB: number;
  nameA: string;
  nameB: string;
  turnName: string;
  yours: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-card bg-surface/10 px-4 py-2">
      <p className="flex items-center gap-2 font-display text-sm font-extrabold text-surface">
        <Swords className="h-4 w-4 text-brand-300" />
        {`Turn ${roundNo}`}
        <span className="font-sans text-2xs font-bold uppercase tracking-wider text-brand-300">
          {yours ? `${turnName} attacks` : `${turnName} is thinking`}
        </span>
      </p>
      <p className="text-xs font-extrabold text-paper-200">
        {nameA} {hpA}% – {hpB}% {nameB}
      </p>
      <p className="w-full text-2xs font-bold text-paper-400 sm:w-auto">
        🔥 melts ❄️ · ❄️ freezes 🌪️ · 🌪️ blows out 🔥
      </p>
    </div>
  );
}

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
