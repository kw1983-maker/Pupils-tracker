"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Film, Sparkles, X } from "lucide-react";
import { Overlay } from "@/components/ui/Modal";
import { PetSprite } from "@/components/ui/PetSprite";
import { PET_STORIES } from "@/lib/pet-stories";

/**
 * Full-screen player for the animated pet stories (lib/pet-stories.ts). Each
 * story is a self-contained HTML video with its own controls, so this only
 * frames it: pick a story, watch it in an iframe, close. The stories carry
 * their own sound, so the Pets-page mute toggle doesn't apply here.
 */
const GROUPS = [
  { label: "Stories", items: PET_STORIES.filter((s) => s.kind !== "adventure") },
  { label: "Adventures", items: PET_STORIES.filter((s) => s.kind === "adventure") },
];

// The player page's own fullscreen layout (#player:fullscreen in the lesson-video
// shell), applied while *our* stage is the fullscreen element instead.
const HOST_FS_CSS = `
html.host-fs,html.host-fs body{height:100%;overflow:hidden}
html.host-fs #wrap{max-width:none;height:100%;padding:0;box-sizing:border-box}
html.host-fs h1{display:none}
html.host-fs #player{height:100%;display:flex;flex-direction:column;justify-content:center;border-radius:0;box-shadow:none}
html.host-fs #cv{width:auto;max-width:100vw;max-height:calc(100vh - 56px);margin:0 auto}`;

export function PetStoriesPlayer({ onClose }: { onClose: () => void }) {
  const [storyId, setStoryId] = useState(PET_STORIES[0]?.id);
  const story = PET_STORIES.find((s) => s.id === storyId) ?? PET_STORIES[0];
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [full, setFull] = useState(false);

  // Fullscreen must go on our stage, not on the player inside the iframe: the
  // mark celebrations portal into document.fullscreenElement, and anything put
  // inside an <iframe> element is never drawn — so in the player's own
  // fullscreen pupils only heard the mark sound. The stories are same-origin,
  // so the player's ⛶ button is redirected here.
  const mirror = useCallback((on: boolean) => {
    try {
      frameRef.current?.contentDocument?.documentElement.classList.toggle("host-fs", on);
    } catch {
      /* not same-origin — nothing to mirror */
    }
  }, []);

  useEffect(() => {
    const onChange = () => {
      const on = !!stageRef.current && document.fullscreenElement === stageRef.current;
      setFull(on);
      mirror(on);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [mirror]);

  const wirePlayer = useCallback(() => {
    let doc: Document | null = null;
    try {
      doc = frameRef.current?.contentDocument ?? null;
    } catch {
      return;
    }
    if (!doc) return;
    const style = doc.createElement("style");
    style.textContent = HOST_FS_CSS;
    doc.head.appendChild(style);
    // capture phase on the document runs before the player's own onclick
    doc.addEventListener(
      "click",
      (e) => {
        if (!(e.target as Element | null)?.closest?.("#fs")) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        if (document.fullscreenElement) void document.exitFullscreen();
        else void stageRef.current?.requestFullscreen();
      },
      true,
    );
    mirror(document.fullscreenElement === stageRef.current);
  }, [mirror]);

  return (
    <Overlay
      label="Pet stories"
      onEscape={onClose}
      onBackdrop={onClose}
      className="z-[70] bg-paper-900/85 p-3 backdrop-blur-sm sm:p-6"
    >
      <div className="thin-scroll flex max-h-full w-full max-w-6xl flex-col gap-3 overflow-y-auto">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-xl font-extrabold text-surface sm:text-2xl">
            <Film className="h-5 w-5 text-brand-300" aria-hidden />
            Pet stories
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-2 text-paper-300 outline-none transition-colors hover:bg-surface/10 hover:text-surface focus-visible:shadow-ring"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {PET_STORIES.length > 1 &&
          GROUPS.map(({ label, items }) =>
            items.length ? (
              <div key={label} className="flex flex-wrap items-center gap-2">
                <span className="w-24 font-sans text-[11px] font-extrabold uppercase tracking-wider text-paper-400">
                  {label}
                </span>
                {items.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStoryId(s.id)}
                    aria-pressed={s.id === story?.id}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-extrabold uppercase tracking-wider outline-none transition-colors focus-visible:shadow-ring ${
                      s.id === story?.id
                        ? "border-brand-300/40 bg-brand-500/25 text-brand-200"
                        : "border-paper-200/25 bg-surface/10 text-paper-400 hover:text-surface"
                    }`}
                  >
                    <PetSprite species={s.cover.species} stageId={s.cover.stageId} px={28} />
                    {s.title}
                    {s.kind === "adventure" && (
                      <span className="flex items-center gap-1 rounded-full bg-mark-amber px-2 py-0.5 text-[10px] text-mark-amber-ink">
                        <Sparkles className="h-3 w-3" aria-hidden />
                        Interactive
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : null,
          )}

        {story ? (
          <>
            <p className="font-sans text-sm font-semibold text-paper-300">
              <span className="font-extrabold text-surface">{story.title}</span>
              {story.unit && <>{" · "}{story.unit}</>}
              {" · "}about {story.minutes} min · {story.blurb}
              {story.kind === "adventure" && (
                <span className="text-mark-amber">
                  {" "}The video stops at each challenge — the class must answer correctly to carry on.
                </span>
              )}
            </p>
            <div ref={stageRef} className={full ? "bg-paper-900" : undefined}>
              <iframe
                ref={frameRef}
                key={story.id}
                src={story.path}
                title={story.title}
                allow="autoplay; fullscreen"
                allowFullScreen
                onLoad={wirePlayer}
                className={
                  full
                    ? "block h-screen w-screen border-0 bg-paper-900"
                    : "h-[calc(100vh-11rem)] min-h-[24rem] w-full rounded-card border border-paper-200/25 bg-paper-900"
                }
              />
            </div>
          </>
        ) : (
          <p className="font-sans text-sm font-semibold text-paper-300">No stories yet.</p>
        )}
      </div>
    </Overlay>
  );
}
