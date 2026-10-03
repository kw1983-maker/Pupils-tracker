"""Free voices for "The Great Go-Kart Race" (edge-tts Microsoft neural voices, 0 credits).

    python tts.py            # make any missing clips
    python tts.py --force    # remake all
    python tts.py d01 m03    # remake only these
    python tts.py --post     # re-process raw/ clips without downloading again

raw/<id>.mp3 = straight from edge-tts; audio/<id>.mp3 = robot filter (Robot only) +
loudness-normalised to -17 LUFS, which is what build.mjs reads.
"""
import asyncio, subprocess, sys
from pathlib import Path
import edge_tts

HERE = Path(__file__).parent
RAW, OUT = HERE / "raw", HERE / "audio"

# speaker -> (voice, rate, pitch)
VOICES = {
    "D": ("en-GB-RyanNeural", "-4%", "+0Hz"),        # narrator, warm storyteller
    "R": ("en-US-RogerNeural", "+4%", "+6Hz"),       # Dragon, lively
    "A": ("en-GB-MaisieNeural", "+0%", "+0Hz"),      # Rabbit, young girl
    "O": ("en-GB-ThomasNeural", "-6%", "-4Hz"),      # Owl, calm and wise
    "P": ("en-US-EmmaNeural", "+2%", "+4Hz"),        # Panda, cheerful
    "F": ("en-IE-ConnorNeural", "+6%", "+2Hz"),      # Fox, quick and clever
    "B": ("en-US-AnaNeural", "+0%", "+0Hz"),         # Robot (+ robot filter)
    "M": ("en-US-BrianNeural", "+8%", "+14Hz"),      # Monkey, cheeky show-off
}

# id: (text, optional (rate, pitch) override for the emotion)
LINES = {
    "d01": ("Pet Adventures! The Great Go-Kart Race.", ("+0%", "+4Hz")),
    "d02": ("Today there is a go-kart race in Pet Town!",),
    "r01": ("Hooray! My favourite toy is my go-kart!", ("+8%", "+10Hz")),
    "a01": ("I want to race too. But I don't have a go-kart.", ("-10%", "-6Hz")),
    "o01": ("Don't worry, Rabbit. Let's make one together!",),
    "b01": ("Beep boop! First, we need wheels. To the toy shop!",),
    "d03": ("The toy shop was full of toys.",),
    "p01": ("Look! A kite, a doll, a train and a plane!",),
    "f01": ("A ball, a bike, a car and a computer game!",),
    "r02": ("And a big ugly monster! Rarr!",),
    "b02": ("The old wheels are on one toy. Which toy is a go-kart?",),
    "a02": ("That's the go-kart! Four wheels for me!", ("+6%", "+6Hz")),
    "b03": ("Now we need a sticker. What's this toy? Type it!",),
    "p02": ("Kite! A kite sticker for the go-kart!",),
    "d04": ("Next door was the Toy Fair. Owl had a guessing game.",),
    "o02": ("Look at this photo. What's his name?",),
    "r03": ("His name's Dragon! That's me!",),
    "o03": ("How old is he?",),
    "f02": ("He's seven!",),
    "o04": ("What's his favourite toy?",),
    "p03": ("His favourite toy's his go-kart!",),
    "o05": ("Now this photo. Her name's Panda. What's her favourite toy?",),
    "p04": ("Yes! My favourite toy's my doll!",),
    "o06": ("Last photo! Pick the right word.",),
    "f03": ("That's me! His name's Fox, and he's eight!",),
    "d05": ("At the Tangram Lab, Robot made the go-kart with shapes.",),
    "b04": ("Beep! A square, a triangle, a rectangle, a parallelogram!",),
    "a03": ("And the wheels are circles!",),
    "b05": ("Oh no! One piece is missing. Which shape is it?",),
    "b06": ("A triangle! Click! The go-kart is ready.",),
    "f04": ("Hmm... it's a small old go-kart.", ("-4%", "+0Hz")),
    "a04": ("It's small and old. But it's MY go-kart!", ("+4%", "+6Hz")),
    "d06": ("Then they went to Ken's Paint Shed.",),
    "p05": ("Look! Ken the hen and his ten red pens!",),
    "o07": ("Red, ten, pen, hen. They all have the e sound!",),
    "d07": ("The red paint is locked. Tap all the e words to open it!",),
    "r04": ("Splash! A red go-kart for Rabbit!",),
    "d08": ("It was race day! Then a new pet arrived. It was Monkey.",),
    "m01": ("Ha ha ha! What an ugly old go-kart!",),
    "m02": ("My go-kart is big and new. I'm going to win!",),
    "a05": ("My go-kart is small and old... but it's fast!", ("-6%", "-2Hz")),
    "o08": ("Help us! Look at Rabbit's go-kart. Pick the right word.",),
    "o09": ("Yes! It's an old go-kart. And Monkey's is a new go-kart.",),
    "b07": ("Ready... One, two, three... Go!",),
    "d09": ("Rabbit was first! Monkey was behind.", ("+4%", "+2Hz")),
    "m03": ("She's first? Hee hee... banana!", ("+0%", "+10Hz")),
    "d10": ("Monkey threw a banana. Rabbit's go-kart spun round and round!", ("+6%", "+4Hz")),
    "a06": ("Help!", ("+10%", "+14Hz")),
    "m04": ("Ha ha! Now I'm first!",),
    "p06": ("That isn't fair!", ("+4%", "-4Hz")),
    "r05": ("Let's throw bananas at Monkey too!", ("+6%", "+0Hz")),
    "o10": ("Wait, Dragon. What should we do?",),
    "o11": ("Yes. Cheating is wrong. We play fair!",),
    "b08": ("Just a minute... Beep! Fixed! Hold on, Rabbit!",),
    "d11": ("Rabbit raced on. Zoom, zoom!", ("+6%", "+4Hz")),
    "d12": ("Monkey looked back to laugh... and SPLAT! Into the mud!",),
    "a07": ("Woah! I'm first!", ("+8%", "+12Hz")),
    "o12": ("Congratulations, Rabbit! You're first!",),
    "a08": ("Thank you! Thank you, friends!", ("+4%", "+6Hz")),
    "m05": ("I'm sorry, Rabbit. Cheating is wrong.", ("-12%", "+4Hz")),
    "a09": ("It's okay, Monkey. Next time, let's play fair together!",),
    "f05": ("Hey, Monkey! What's your favourite toy?",),
    "m06": ("My favourite toy's my ball. Let's all play!",),
    "r06": ("Toy shop, toy shop, let's go to the toy shop!", ("+6%", "+8Hz")),
    "p07": ("Hooray!", ("+6%", "+10Hz")),
    "d13": ("Remember: play fair! Bye bye! See you next time!",),
    # wrong-answer lines (re-voiced so they match these voices)
    "x01": ("Oops! Try again!",),
    "x02": ("Hmm... think again!",),
    "x03": ("So close! Try again!",),
}
SPEAKER_OF = {"x01": "P", "x02": "O", "x03": "F"}

# the app's ROBOT_FILTER (scripts/generate-pet-voices.mjs) without its own loudnorm
ROBOT = ("aresample=44100,asetrate=47628,aresample=44100,atempo=0.92593,highpass=f=300,"
         "lowpass=f=5000,aecho=0.9:0.85:4:0.32,aphaser=type=t:speed=1.3:decay=0.45,"
         "acompressor=threshold=0.1:ratio=4:attack=5:release=120,")
TRIM = ("silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05,areverse,"
        "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.08,areverse,")
NORM = "loudnorm=I=-17:TP=-1.5:LRA=11,aresample=44100"


POST_ONLY = "--post" in sys.argv   # re-run ffmpeg on existing raw clips only


async def make(lid):
    spk = SPEAKER_OF.get(lid, lid[0].upper())
    voice, rate, pitch = VOICES[spk]
    text, *style = LINES[lid]
    if style:
        rate, pitch = style[0]
    raw = RAW / f"{lid}.mp3"
    if not (POST_ONLY and raw.exists()):
        await edge_tts.Communicate(text, voice, rate=rate, pitch=pitch).save(str(raw))
    af = TRIM + (ROBOT if spk == "B" else "") + NORM
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(raw), "-af", af,
                    "-ac", "1", "-b:a", "96k", str(OUT / f"{lid}.mp3")], check=True)
    print(lid, spk, voice)


async def main():
    RAW.mkdir(exist_ok=True); OUT.mkdir(exist_ok=True)
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    force = "--force" in sys.argv or POST_ONLY
    ids = args or [i for i in LINES if force or not (OUT / f"{i}.mp3").exists()]
    for lid in ids:          # sequential: polite to the free service
        await make(lid)

asyncio.run(main())
