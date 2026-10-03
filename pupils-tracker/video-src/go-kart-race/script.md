> **As built (2026-10-03):** to save credits the voices are free edge-tts neural voices (`tts.py`, 0 credits) and the sound
> effects are Web Audio (`SOUND='webaudio'`), not ElevenLabs as planned below. The x01–x03 retry lines were re-voiced to match.
> Only ~140 ElevenLabs credits were spent (3 test lines, unused).

# Pet Adventure — Year 1 Unit 2 "Let's play!" → "The Great Go-Kart Race" (3D)

## Context
This is the next video in the Pet Adventures series: one interactive, quiz-gated pet video per Super Minds 1 unit. The pilot was Y2 Unit 5, "The Stolen Week", plus its 3D version.
The source is Super Minds 1 SB pp. 22–33 (`docs/References/Books/super_minds_1_student_s_book.pdf`, PDF pages 22–33, scanned; I read them as rendered images).
Unit content:
- **Toys:** kite, doll, monster, plane, computer game, train, car, ball, bike, go-kart. The chant is "Toy shop, toy shop…".
- **Grammar:** What's his/her name? His/Her name's… · How old is he/she? He's/She's… · What's his/her favourite toy?
- **Adjectives:** long/short, big/small, new/old, ugly/beautiful, with a/an ("It's a new kite. It's an ugly monster.").
- **Story and value:** "The go-kart race". Fair play: cheating is wrong. Key lines: "What an ugly old go-kart!", "That isn't fair!", "Just a minute", "Hold on!", "Congratulations… You're first!"
- **Phonics:** the letter sound *e* ("Ken and his ten red pens").
- **Maths:** tangram shapes (triangle, square, circle, parallelogram, rectangle).

**Choices you made:** 3D world · pets + narrator · watercolour finish · ElevenLabs SFX · story "The Great Go-Kart Race".
Delivery is **HTML only** (the default; say if you also want an MP4). Blender shots don't apply to a 3D world.

## Script: 66 lines, 8 challenges, about 5 min
Speakers and voices (from `lib/pet-voice-lines.json` and the pilot):
- D: Narrator (George)
- R: Dragon (Liam)
- A: Rabbit (Laura)
- O: Owl (Charlie)
- P: Panda (Juniper)
- F: Fox (Harry)
- B: Robot (kuon + robot filter)
- **M: Monkey (Callum)**, new to the series and the cheeky rival. His sprite is `public/pets/monkey/adult.png`.

⏸ = the video stops, and pupils must answer correctly to go on.

### 1 title: crane down over Pet Town, race banner  [sfx_sparkle, sfx_whoosh]
d01 D  Pet Adventures! The Great Go-Kart Race.

### 2 square: Town Square, big poster "Go-Kart Race! 1 pet – 1 go-kart"  [sfx_birds, sfx_crowd]
d02 D  Today there is a go-kart race in Pet Town!
r01 R  Hooray! My favourite toy is my go-kart!
a01 A  [sadly] I want to race too. But I don't have a go-kart.
o01 O  Don't worry, Rabbit. Let's make one together!
b01 B  Beep boop! First, we need wheels. To the toy shop!

### 3 toyshop: shelves with all 10 toys as 3D models; the camera tracks past them  [sfx_bell, sfx_pop]
d03 D  The toy shop was full of toys.
p01 P  Look! A kite, a doll, a train and a plane!
f01 F  A ball, a bike, a car and a computer game!
r02 R  And a big ugly monster! Rarr!
b02 B  The old wheels are on one toy. Which toy is a go-kart?
⏸ Q1 PICK THE PICTURE: go-kart ✔ / bike / car
a02 A  That's the go-kart! Four wheels for me!
b03 B  Now we need a sticker. What's this toy? Type it!
⏸ Q2 TYPE THE WORD (letter tiles; a kite is on screen): kite
p02 P  Kite! A kite sticker for the go-kart!

### 4 fair: Toy Fair, Owl's "Who is it?" booth with photo cards  [sfx_crowd, sfx_ding]
d04 D  Next door was the Toy Fair. Owl had a guessing game.
o02 O  Look at this photo. What's his name?
r03 R  His name's Dragon! That's me!
o03 O  How old is he?
f02 F  He's seven!
o04 O  What's his favourite toy?
p03 P  His favourite toy's his go-kart!
o05 O  Now this photo. Her name's Panda. What's her favourite toy?
⏸ Q3 MULTIPLE CHOICE (photo: Panda hugging a doll): "Her favourite toy's her doll." ✔ / "His favourite toy's his doll." / "Her favourite toy's her plane."
p04 P  Yes! My favourite toy's my doll!
o06 O  Last photo! Pick the right word.
⏸ Q4 CHOOSE THE WORD: "___ name's Fox. He's eight." → His ✔ / Her
f03 F  That's me! His name's Fox, and he's eight!

### 5 lab: Tangram Lab (Robot's workshop); coloured tangram pieces fly together into a kart body  [sfx_whoosh, sfx_pop]
d05 D  At the Tangram Lab, Robot made the go-kart with shapes.
b04 B  Beep! A square, a triangle, a rectangle, a parallelogram!
a03 A  And the wheels are circles!
b05 B  Oh no! One piece is missing. Which shape is it?
⏸ Q5 PICK THE SHAPE (the kart has a triangle-shaped gap): triangle ✔ / square / circle
b06 B  A triangle! Click! The go-kart is ready.
f04 F  Hmm… it's a small old go-kart.
a04 A  [happily] It's small and old. But it's MY go-kart!

### 6 paint: Ken's Paint Shed; Ken the hen (a non-speaking 3D hen) and ten red pens in a jar; the red paint pot is locked  [sfx_cluck, sfx_splash]
d06 D  Then they went to Ken's Paint Shed.
p05 P  Look! Ken the hen and his ten red pens!
o07 O  Red, ten, pen, hen. They all have the e sound!
d07 D  The red paint is locked. Tap all the e words to open it!
⏸ Q6 TAP ALL THE e-WORDS: red ✔ ten ✔ pen ✔ hen ✔ bed ✔ / cat / dog / sun
r04 R  Splash! A red go-kart for Rabbit!

### 7 track: race day at the start line; Monkey rolls up in a shiny big new kart  [sfx_engine, sfx_crowd, sfx_whistle]
d08 D  It was race day! Then a new pet arrived. It was Monkey.
m01 M  Ha ha ha! What an ugly old go-kart!
m02 M  My go-kart is big and new. I'm going to win!
a05 A  [shyly] My go-kart is small and old… but it's fast!
o08 O  Help us! Look at Rabbit's go-kart. Pick the right word.
⏸ Q7 CHOOSE: "It's ___ old go-kart." → a / an ✔
o09 O  Yes! It's an old go-kart. And Monkey's is a new go-kart.
b07 B  Ready… One, two, three… Go!

### 8 bend (TWIST): forest bend, low tracking camera; Rabbit leads; Monkey throws a banana; Rabbit spins out  [sfx_engine, sfx_skid, sfx_whoosh]
d09 D  Rabbit was first! Monkey was behind.
m03 M  [sneaky] She's first? Hee hee… banana!
d10 D  Monkey threw a banana. Rabbit's go-kart spun round and round!
a06 A  [scared] Help!
m04 M  Ha ha! Now I'm first!
p06 P  [angry] That isn't fair!
r05 R  [angry] Let's throw bananas at Monkey too!
o10 O  Wait, Dragon. What should we do?
⏸ Q8 MULTIPLE CHOICE (fair play): Throw a banana at Monkey / Help Rabbit and keep racing fairly ✔ / Stop and go home
o11 O  Yes. Cheating is wrong. We play fair!
b08 B  Just a minute… Beep! Fixed! Hold on, Rabbit!

### 9 finish: home straight; Monkey looks back laughing and hits the mud; Rabbit zooms past to the line  [sfx_engine, sfx_squelch, sfx_crowd]
d11 D  Rabbit raced on. Zoom, zoom!
d12 D  Monkey looked back to laugh… and SPLAT! Into the mud!
a07 A  [excited] Woah! I'm first!

### 10 podium: trophy, confetti; a muddy Monkey says sorry  [sfx_crowd, sfx_sparkle]
o12 O  Congratulations, Rabbit! You're first!
a08 A  Thank you! Thank you, friends!
m05 M  [sheepishly] I'm sorry, Rabbit. Cheating is wrong.
a09 A  It's okay, Monkey. Next time, let's play fair together!

### 11 finale: everyone does a lap together; the camera cranes up over the whole Pet Town map  [sfx_engine, sfx_birds, sfx_pop]
f05 F  Hey, Monkey! What's your favourite toy?
m06 M  My favourite toy's my ball. Let's all play!
r06 R  Toy shop, toy shop, let's go to the toy shop!
p07 P  Hooray!
d13 D  Remember: play fair! Bye bye! See you next time!

**Wrong-answer lines** (one plays at random while a challenge is open): reuse x01 "Oops! Try again!" (Panda), x02 "Hmm… think again!" (Owl) and x03 "So close! Try again!" (Fox) from `video-src/stolen-week/audio/`. They cost 0 credits.

**Where each part of the unit is taught:**
- Toys: shots 3 and 11, with challenges Q1 and Q2.
- his/her, he/she: shot 4, with Q3 and Q4.
- Tangram shapes: shot 5, with Q5.
- Adjectives and a/an: shots 5 and 7, with Q7.
- Phonics *e*: shot 6, with Q6.
- Fair play: shots 8–10, with Q8.

### Cost
- 66 new voice lines × ≈35 credits ≈ **2,300 credits**.
- 5 new SFX × 50 = **250 credits**: `sfx_engine` (go-kart engines), `sfx_crowd` (cheering crowd), `sfx_skid` (tyre skid and spin), `sfx_bell` (shop door bell), `sfx_cluck` (hen).
- Reused for free: whoosh, sparkle, birds, pop, ding, splash, squelch, whistle.
- **Total ≈ 2,550 credits.**

## Build plan (after you approve the script)
1. **Folder** `video-src/go-kart-race/`. It holds `script.md` (the script above), `audio/`, `images/` (the pilot's pet sprites plus `monkey.png` copied from `public/pets/monkey/adult.png`), `map.json` and `chapter.js`.
2. **Audio:** follow `~/.claude/skills/lesson-video/references/elevenlabs.md`.
   - One flow, at most 3 generations at once, and every session→line mapping recorded in `map.json`.
   - Collect with `scripts/collect_audio.py`, and regenerate any failures.
   - Normalise every voice line to −17 LUFS. You flagged quiet lines in the pilot.
   - Copy the reused SFX and the x01–x03 lines from `video-src/stolen-week/audio/`.
3. **chapter.js:** start from `video-src/stolen-week-3d/chapter.js`. It shows the pattern for pet sprite billboards, the `GATES`/`GATE_RETRY` challenge setup and the shot structure.
   - Set `WORLD='3d'`, `STYLE='watercolor'` and `SOUND='elevenlabs'`, and keep the narrator-only host setup.
   - `LOC` puts 8 places on one Pet Town map: square, toyshop, fair, lab, paint, track start/podium, forest bend and finish straight. A looping kart circuit joins the track places.
   - `CAST3D` uses `img:` sprites for dragon, fox, owl, panda, rabbit, robot and monkey.
   - `buildWorld` builds the scenery. The new props are:
     - low-poly toys: kite, doll, monster, plane, computer game, train, car, ball, bike and go-karts;
     - tangram pieces;
     - a hen, a pen jar and paint pots;
     - the race track, start banner, podium, trophy, banana and mud.
   - Karts, the banana, tangram pieces and the trophy are `dyn`/`keep`. Story-time state (kart painted, piece in place) is posed in `poseDefaults3` so frames come out the same every time.
   - Each shot gets one `CAMS[shot]` and a `FLY` arrival flight. The bend gets low tracking with `hh3`, there's a `shk3` jolt on the spin-out, and the ending cranes up with the fog widened.
   - Teaching text goes on 2D cards and in-world signs (`textTex`).
   - The 8 challenges are defined in `GATES` (chapter-api.md §8). They use the same challenge types as the pilot (pick-picture, type, multiple choice, tap-all).
4. **Build:** `node ~/.claude/skills/lesson-video/scripts/build.mjs video-src/go-kart-race public/pets/stories/go-kart-race.html`. With `WORLD='3d'` set, this inlines three.js automatically.
5. **Register in the app:** add an entry to `lib/pet-stories.ts` with `id: "go-kart-race"`, `kind: "adventure"` and path `/pets/stories/go-kart-race.html`, following the existing stolen-week entries. It will then show under "Adventures" in the Stories player.

## Verification
- Follow `references/qa-checklist.md`:
  1. Run snap to make contact sheets for every shot, and read them (framing, cards readable, no empty arrival places, no z-fighting).
  2. Fix what they show.
  3. Run `check.mjs` until it prints no `WARN SFX` lines and reports `deterministic: yes`.
- Time the 3D frames (world-3d.md §6): median ≤ 33 ms per frame.
- Play through all 8 challenges in Chrome. Check that a wrong answer plays a retry line and that the right answer moves the video on.
- Run `npm run lint`, then open the Pets → Stories player in `npm run dev` and confirm the new adventure appears and plays.
- **Report back:** file path, size, duration, credits used, and any changes from this script.
