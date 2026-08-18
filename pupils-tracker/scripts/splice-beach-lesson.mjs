// One-off script: edits the nested "Interactive Lesson" page embedded inside
// public/lessons/at-the-beach.html (base64-encoded in a `const LESSON_B64 =
// "...";` string in the outer file) so its word game plays the pre-generated
// Gemini voice clips from scripts/generate-beach-lesson-audio.mjs instead of
// (or before falling back to) the browser's built-in speechSynthesis voice.
//
// The nested lesson is too large (~1.9MB, minified) to hand-edit, so this
// decodes it, does three precise string replacements, re-encodes it, and
// splices the result back into the outer file in place.
//
// Usage: node scripts/splice-beach-lesson.mjs

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUTER_PATH = join(ROOT, "public", "lessons", "at-the-beach.html");

function replaceOnce(source, oldStr, newStr, label) {
  const count = source.split(oldStr).length - 1;
  if (count !== 1) {
    throw new Error(`Expected exactly 1 occurrence of "${label}", found ${count}`);
  }
  return source.replace(oldStr, newStr);
}

// The embedded component source stores line breaks as a literal two-character
// "\n" (backslash + n) rather than a real newline byte — so templates below
// are authored with normal newlines for readability, then converted here.
function esc(s) {
  return s.replace(/\n/g, "\\n");
}

const OLD_PICK_VOICE = `  pickVoice = () => {
    try{
      const vs = speechSynthesis.getVoices() || [];
      return vs.find(v => /en-GB/i.test(v.lang) && /female|zira|hazel|google uk english female/i.test(v.name))
        || vs.find(v => /en-GB/i.test(v.lang))
        || vs.find(v => /^en/i.test(v.lang)) || null;
    }catch(e){ return null; }
  };`;

const NEW_PICK_VOICE = `  // Pre-generated Gemini voice clips for each phrase (see
  // scripts/generate-beach-lesson-audio.mjs) — much better quality than the
  // browser's built-in voice. onFail runs (falls back to speechSynthesis) if
  // a clip is missing or fails to load.
  playClip = (label, onFail) => {
    const slugs = { 'catch a fish':'catch-a-fish', 'paint a picture':'paint-a-picture', 'eat ice cream':'eat-ice-cream', 'take a photo':'take-a-photo', 'listen to music':'listen-to-music', 'look for shells':'look-for-shells', 'read a book':'read-a-book', 'make a sandcastle':'make-a-sandcastle' };
    const slug = slugs[label];
    if(!slug) return false;
    try{
      const a = new Audio('/lessons/at-the-beach-audio/' + slug + '.mp3');
      a.onerror = onFail;
      a.play().catch(onFail);
      return true;
    }catch(e){ return false; }
  };

  pickVoice = () => {
    try{
      const vs = speechSynthesis.getVoices() || [];
      return vs.find(v => /en-GB/i.test(v.lang) && /natural|online|neural/i.test(v.name))
        || vs.find(v => /en-GB/i.test(v.lang) && /female|zira|hazel|google uk english female/i.test(v.name))
        || vs.find(v => /en-GB/i.test(v.lang))
        || vs.find(v => /^en/i.test(v.lang)) || null;
    }catch(e){ return null; }
  };`;

const OLD_SAY_WORD = `  sayWord = (label) => {
    if(!('speechSynthesis' in window)) return;
    try{
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(label);
      u.rate = .8; u.pitch = 1.06; u.lang = 'en-GB';
      const v = this.pickVoice(); if(v) u.voice = v;
      speechSynthesis.speak(u);
    }catch(e){}
  };`;

const NEW_SAY_WORD = `  sayWord = (label) => {
    const fallback = () => {
      if(!('speechSynthesis' in window)) return;
      try{
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(label);
        u.rate = .8; u.pitch = 1.06; u.lang = 'en-GB';
        const v = this.pickVoice(); if(v) u.voice = v;
        speechSynthesis.speak(u);
      }catch(e){}
    };
    if(!this.playClip(label, fallback)) fallback();
  };`;

const OLD_SAY = `  say = () => {
    const s = this.state.step;
    if(s < 1) return;
    if(!('speechSynthesis' in window)) return;
    const speak = () => {
      try{
        speechSynthesis.cancel();
        const a = this.activities[s-1];
        const u = new SpeechSynthesisUtterance(a.label);
        u.rate = .8; u.pitch = 1.06; u.lang = 'en-GB';
        const v = this.pickVoice(); if(v) u.voice = v;
        speechSynthesis.speak(u);
      }catch(e){}
    };
    // voices load lazily on some browsers; wait for them once
    if((speechSynthesis.getVoices() || []).length === 0){
      speechSynthesis.onvoiceschanged = () => { speechSynthesis.onvoiceschanged = null; speak(); };
      setTimeout(speak, 250);
    } else { speak(); }
  };`;

const NEW_SAY = `  say = () => {
    const s = this.state.step;
    if(s < 1) return;
    const a = this.activities[s-1];
    const fallback = () => {
      if(!('speechSynthesis' in window)) return;
      const speak = () => {
        try{
          speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(a.label);
          u.rate = .8; u.pitch = 1.06; u.lang = 'en-GB';
          const v = this.pickVoice(); if(v) u.voice = v;
          speechSynthesis.speak(u);
        }catch(e){}
      };
      // voices load lazily on some browsers; wait for them once
      if((speechSynthesis.getVoices() || []).length === 0){
        speechSynthesis.onvoiceschanged = () => { speechSynthesis.onvoiceschanged = null; speak(); };
        setTimeout(speak, 250);
      } else { speak(); }
    };
    if(!this.playClip(a.label, fallback)) fallback();
  };`;

async function main() {
  const outer = await readFile(OUTER_PATH, "utf8");

  const marker = 'const LESSON_B64 = "';
  const start = outer.indexOf(marker);
  if (start < 0) throw new Error("LESSON_B64 marker not found");
  const valueStart = start + marker.length;
  const valueEnd = outer.indexOf('";', valueStart);
  if (valueEnd < 0) throw new Error("LESSON_B64 closing not found");
  const b64 = outer.slice(valueStart, valueEnd);

  console.log(`Decoding nested lesson (${b64.length} base64 chars)…`);
  let nested = Buffer.from(b64, "base64").toString("utf8");
  if (!nested.startsWith("<!DOCTYPE")) {
    throw new Error(`Decoded content doesn't look like HTML (starts: ${JSON.stringify(nested.slice(0, 40))})`);
  }

  nested = replaceOnce(nested, esc(OLD_PICK_VOICE), esc(NEW_PICK_VOICE), "pickVoice");
  nested = replaceOnce(nested, esc(OLD_SAY_WORD), esc(NEW_SAY_WORD), "sayWord");
  nested = replaceOnce(nested, esc(OLD_SAY), esc(NEW_SAY), "say");
  console.log("All 3 edits applied.");

  const newB64 = Buffer.from(nested, "utf8").toString("base64");
  const newOuter = outer.slice(0, valueStart) + newB64 + outer.slice(valueEnd);
  await writeFile(OUTER_PATH, newOuter, "utf8");
  console.log(`Wrote ${OUTER_PATH} (${newOuter.length} chars, was ${outer.length}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
