/* The Great Go-Kart Race — Pet Adventures in a live three.js world (English, Year 1 · Super Minds 1 Unit 2 "Let's play!")
   Interactive: the video STOPS at 8 challenges (GATES) and continues only after a correct answer.
   Teaches: toys (kite doll monster plane computer game train car ball bike go-kart); What's his/her name? How old is he/she?
   What's his/her favourite toy?; adjectives + a/an (an old go-kart, a new go-kart, small/big); tangram shapes;
   letter sound e; value — fair play, cheating is wrong.
   Cast = the app's own pet sprites (images/*.png) as 3D cut-outs; narrator only, no host. Voices: free edge-tts (tts.py). */
const META={title:'The Great Go-Kart Race · Pet Adventures',h1:"Pet Adventures · The Great Go-Kart Race (Unit 2 · Let's play!)",lang:'en'};
const WORLD='3d';
const STYLE='watercolour';
const HOST='none';
const SOUND='webaudio';
const LINES={
 d01:['D','Pet Adventures! The Great Go-Kart Race.'],
 d02:['D','Today there is a go-kart race in Pet Town!'],
 r01:['R','Hooray! My favourite toy is my go-kart!'],
 a01:['A',"I want to race too. But I don't have a go-kart."],
 o01:['O',"Don't worry, Rabbit. Let's make one together!"],
 b01:['B','Beep boop! First, we need wheels. To the toy shop!'],
 d03:['D','The toy shop was full of toys.'],
 p01:['P','Look! A kite, a doll, a train and a plane!'],
 f01:['F','A ball, a bike, a car and a computer game!'],
 r02:['R','And a big ugly monster! Rarr!'],
 b02:['B','The old wheels are on one toy. Which toy is a go-kart?'],
 a02:['A',"That's the go-kart! Four wheels for me!"],
 b03:['B',"Now we need a sticker. What's this toy? Type it!"],
 p02:['P','Kite! A kite sticker for the go-kart!'],
 d04:['D','Next door was the Toy Fair. Owl had a guessing game.'],
 o02:['O',"Look at this photo. What's his name?"],
 r03:['R',"His name's Dragon! That's me!"],
 o03:['O','How old is he?'],
 f02:['F',"He's seven!"],
 o04:['O',"What's his favourite toy?"],
 p03:['P',"His favourite toy's his go-kart!"],
 o05:['O',"Now this photo. Her name's Panda. What's her favourite toy?"],
 p04:['P',"Yes! My favourite toy's my doll!"],
 o06:['O','Last photo! Pick the right word.'],
 f03:['F',"That's me! His name's Fox, and he's eight!"],
 d05:['D','At the Tangram Lab, Robot made the go-kart with shapes.'],
 b04:['B','Beep! A square, a triangle, a rectangle, a parallelogram!'],
 a03:['A','And the wheels are circles!'],
 b05:['B','Oh no! One piece is missing. Which shape is it?'],
 b06:['B','A triangle! Click! The go-kart is ready.'],
 f04:['F',"Hmm… it's a small old go-kart."],
 a04:['A',"It's small and old. But it's MY go-kart!"],
 d06:['D',"Then they went to Ken's Paint Shed."],
 p05:['P','Look! Ken the hen and his ten red pens!'],
 o07:['O','Red, ten, pen, hen. They all have the e sound!'],
 d07:['D','The red paint is locked. Tap all the e words to open it!'],
 r04:['R','Splash! A red go-kart for Rabbit!'],
 d08:['D','It was race day! Then a new pet arrived. It was Monkey.'],
 m01:['M','Ha ha ha! What an ugly old go-kart!'],
 m02:['M',"My go-kart is big and new. I'm going to win!"],
 a05:['A',"My go-kart is small and old… but it's fast!"],
 o08:['O',"Help us! Look at Rabbit's go-kart. Pick the right word."],
 o09:['O',"Yes! It's an old go-kart. And Monkey's is a new go-kart."],
 b07:['B','Ready… One, two, three… Go!'],
 d09:['D','Rabbit was first! Monkey was behind.'],
 m03:['M',"She's first? Hee hee… banana!"],
 d10:['D',"Monkey threw a banana. Rabbit's go-kart spun round and round!"],
 a06:['A','Help!'],
 m04:['M',"Ha ha! Now I'm first!"],
 p06:['P',"That isn't fair!"],
 r05:['R',"Let's throw bananas at Monkey too!"],
 o10:['O','Wait, Dragon. What should we do?'],
 o11:['O','Yes. Cheating is wrong. We play fair!'],
 b08:['B','Just a minute… Beep! Fixed! Hold on, Rabbit!'],
 d11:['D','Rabbit raced on. Zoom, zoom!'],
 d12:['D','Monkey looked back to laugh… and SPLAT! Into the mud!'],
 a07:['A',"Woah! I'm first!"],
 o12:['O',"Congratulations, Rabbit! You're first!"],
 a08:['A','Thank you! Thank you, friends!'],
 m05:['M',"I'm sorry, Rabbit. Cheating is wrong."],
 a09:['A',"It's okay, Monkey. Next time, let's play fair together!"],
 f05:['F',"Hey, Monkey! What's your favourite toy?"],
 m06:['M',"My favourite toy's my ball. Let's all play!"],
 r06:['R',"Toy shop, toy shop, let's go to the toy shop!"],
 p07:['P','Hooray!'],
 d13:['D','Remember: play fair! Bye bye! See you next time!'],
 // played by the gate engine on a wrong answer (not on the timeline)
 x01:['P','Oops! Try again!'],
 x02:['O','Hmm… think again!'],
 x03:['F','So close! Try again!'],
};
const SPK={D:['Narrator','#7a6a5a'],R:['Dragon','#2e9b74'],F:['Fox','#d9731a'],O:['Owl','#8a6440'],P:['Panda','#4b4b58'],A:['Rabbit','#c0567a'],B:['Robot','#6a4fc9'],M:['Monkey','#a0522d']};

// numbers after a challenge's ask line = the pause the video stops in (gate opens .25 s after the line)
const PLAN=[
 {id:'title',  pre:1.2, seq:['d01'], post:1.4},
 {id:'square', pre:0.8, seq:['d02',0.3,'r01',0.3,'a01',0.4,'o01',0.3,'b01'], post:0.7},
 {id:'shop',   pre:0.6, seq:['d03',0.3,'p01',0.3,'f01',0.3,'r02',0.4,'b02',1.0,'a02',0.4,'b03',1.0,'p02'], post:0.8},
 {id:'fair',   pre:0.6, seq:['d04',0.3,'o02',0.3,'r03',0.3,'o03',0.2,'f02',0.3,'o04',0.2,'p03',0.4,'o05',1.0,'p04',0.4,'o06',1.0,'f03'], post:0.8},
 {id:'lab',    pre:0.6, seq:['d05',0.3,'b04',0.4,'a03',0.4,'b05',1.0,'b06',0.4,'f04',0.3,'a04'], post:0.8},
 {id:'paint',  pre:0.6, seq:['d06',0.3,'p05',0.3,'o07',0.3,'d07',1.0,'r04'], post:1.0},
 {id:'race',   pre:0.8, seq:['d08',0.4,'m01',0.3,'m02',0.3,'a05',0.4,'o08',1.0,'o09',0.4,'b07'], post:1.0},
 {id:'bend',   pre:0.8, seq:['d09',0.3,'m03',0.6,'d10',0.2,'a06',0.3,'m04',0.3,'p06',0.3,'r05',0.3,'o10',1.0,'o11',0.3,'b08'], post:0.9},
 {id:'line',   pre:0.8, seq:['d11',0.5,'d12',0.4,'a07'], post:1.2},
 {id:'podium', pre:0.6, seq:['o12',0.3,'a08',0.4,'m05',0.4,'a09'], post:0.9},
 {id:'finale', pre:0.6, seq:['f05',0.3,'m06',0.3,'r06',0.2,'p07',0.6,'d13'], post:3.4},
];
const GAP=0.18;
const TRANS={};  // 3D: camera flights across Pet Town replace the 2D wipes

/* =====================================================================
   CHALLENGES (engine gates) — the video stops after line `after`
   ===================================================================== */
/* Every challenge has a POOL of variants; one is picked at random each time the page opens, so the class
   gets a fresh set of questions on every reopen. The narration around a gate is recorded audio ("A triangle! Click!"),
   so every variant of a gate keeps the SAME correct answer — only the clue, type, wording and distractors change.
   Variant 0 = the original question (its 🔊 replays the recorded line); a variant with a different prompt gets
   say:true so 🔊 reads the on-screen question with the browser voice instead. */
const GATE_POOL=[
 {id:'q1',after:'b02',v:[
  {type:'picture',prompt:'Which toy is a go-kart?',options:[{label:'go-kart',icon:'🏎️'},{label:'bike',icon:'🚲'},{label:'car',icon:'🚗'}],answer:0,hint:'A go-kart is low. It has a seat and four wheels.'},
  {type:'picture',prompt:'Which toy is a go-kart?',options:[{label:'go-kart',icon:'🏎️'},{label:'plane',icon:'✈️'},{label:'train',icon:'🚂'}],answer:0,hint:'A go-kart is low. It has a seat and four wheels.'},
  {type:'picture',prompt:'Rabbit needs four wheels. Which toy is a go-kart?',options:[{label:'go-kart',icon:'🏎️'},{label:'kite',icon:'🪁'},{label:'ball',icon:'⚽'},{label:'doll',icon:'🪆'}],answer:0,hint:'Find the toy with four wheels!'},
  {type:'picture',prompt:'It is small. It has four wheels and a seat. You can race in it! Which toy is it?',options:[{label:'go-kart',icon:'🏎️'},{label:'bike',icon:'🚲'},{label:'plane',icon:'✈️'}],answer:0,hint:'A bike has two wheels. Find four!'},
  {type:'picture',prompt:'Point to the go-kart!',options:[{label:'go-kart',icon:'🏎️'},{label:'car',icon:'🚗'},{label:'train',icon:'🚂'},{label:'computer game',icon:'🎮'}],answer:0,hint:'A go-kart is low and fast. Vroom!'},
 ]},
 {id:'q2',after:'b03',v:[
  {type:'type',prompt:"What's this toy? Type it!",answer:'kite',hint:'k _ t e — it flies in the sky!'},
  {type:'type',prompt:"It flies in the sky. It has a long tail. What's this toy? Type it!",answer:'kite',hint:'k _ t e — use the letter tiles!'},
  {type:'type',prompt:'k _ t e — Type the toy!',answer:'kite',hint:'The missing letter is i: k-i-t-e.'},
  {type:'picture',prompt:'We need a kite sticker. Which one is the kite?',options:[{label:'kite',icon:'🪁'},{label:'plane',icon:'✈️'},{label:'ball',icon:'⚽'}],answer:0,hint:'A kite flies in the sky on a string.'},
  {type:'picture',prompt:"It's windy! Which toy flies in the sky on a string?",options:[{label:'kite',icon:'🪁'},{label:'train',icon:'🚂'},{label:'doll',icon:'🪆'},{label:'bike',icon:'🚲'}],answer:0,hint:'It has a long tail and a string.'},
 ]},
 {id:'q3',after:'o05',v:[
  {type:'choice',prompt:"Her name's Panda. What's her favourite toy?",options:["Her favourite toy's her doll.","His favourite toy's his doll.","Her favourite toy's her plane."],answer:0,hint:'Panda is a girl → her. Look at the photo!'},
  {type:'choice',prompt:"Her name's Panda. What's her favourite toy?",options:["Her favourite toy's her doll.","Her favourite toy's her ball.","His favourite toy's his train."],answer:0,hint:'Panda is a girl → her. Look at the photo!'},
  {type:'picture',prompt:"Look at the photo. What's Panda's favourite toy?",options:[{label:'doll',icon:'🪆'},{label:'train',icon:'🚂'},{label:'monster',icon:'👾'}],answer:0,hint:'Panda is holding it in the photo!'},
  {type:'choice',prompt:"Panda is a girl. \"___ favourite toy's her doll.\" Pick the word!",options:['Her','His','He'],answer:0,hint:'A girl → her.'},
  {type:'type',prompt:"Her name's Panda. Her favourite toy's her ____. Type it!",answer:'doll',hint:'d-o-l-l. Look at the photo!'},
 ]},
 {id:'q4',after:'o06',v:[
  {type:'choice',prompt:"___ name's Fox. He's eight.",options:['His','Her'],answer:0,hint:'Fox is a boy → his.'},
  {type:'choice',prompt:"Look at Fox's photo. Pick the right sentence!",options:["His name's Fox.","Her name's Fox.","He name's Fox."],answer:0,hint:'Fox is a boy → his name.'},
  {type:'choice',prompt:"His name's Fox. How old is he?",options:["He's eight.","She's eight.","He's seven."],answer:0,hint:'Fox is a boy → he. Fox is eight!'},
  {type:'choice',prompt:"His name's Fox. ___'s eight.",options:['He','She','His'],answer:0,hint:'Fox is a boy → he.'},
  {type:'type',prompt:"Look at the photo. What's his name? Type it!",answer:'Fox',hint:'F-o-x. He is orange!'},
 ]},
 {id:'q5',after:'b05',v:[
  {type:'picture',prompt:'One piece is missing. Which shape is it?',options:[{label:'triangle',img:'q_triangle'},{label:'square',img:'q_square'},{label:'circle',img:'q_circle'}],answer:0,hint:'Look at the gap. It has 3 sides.'},
  {type:'picture',prompt:'The missing piece has 3 sides. Which shape is it?',options:[{label:'triangle',img:'q_triangle'},{label:'square',img:'q_square'},{label:'circle',img:'q_circle'}],answer:0,hint:'Count the sides: 1, 2, 3!'},
  {type:'type',prompt:'The missing piece has 3 sides and 3 corners. What shape is it? Type it!',answer:'triangle',hint:'t-r-i… Use the letter tiles!'},
  {type:'choice',prompt:'One piece is missing. It has 3 sides. Which shape is it?',options:['triangle','square','circle','rectangle'],answer:0,hint:'A square has 4 sides. A circle has no corners.'},
  {type:'picture',prompt:'Find the shape with 3 corners to fill the gap!',options:[{label:'triangle',img:'q_triangle'},{label:'square',img:'q_square'},{label:'circle',img:'q_circle'}],answer:0,hint:'A circle has no corners. A square has 4.'},
 ]},
 {id:'q6',after:'d07',v:[
  {type:'tapAll',prompt:'Tap ALL the words with the e sound, like red!',options:['red','cat','ten','dog','pen','hen','sun','bed'],answers:[0,2,4,5,7],hint:'Say them: r-e-d, t-e-n … Find 5!'},
  {type:'tapAll',prompt:'Tap ALL the words with the e sound, like red!',options:['bed','bus','web','hat','leg','pig','net','egg'],answers:[0,2,4,6,7],hint:'Say them: b-e-d, w-e-b … Find 5!'},
  {type:'tapAll',prompt:'Tap ALL the words with the e sound, like red!',options:['ten','top','jet','cup','pet','map','wet','men'],answers:[0,2,4,6,7],hint:'Say them: j-e-t, p-e-t … Find 5!'},
  {type:'tapAll',prompt:'Tap ALL the words with the e sound, like red!',options:['hen','fish','red','box','vet','bag','peg','tent'],answers:[0,2,4,6,7],hint:'Say them: h-e-n, v-e-t … Find 5!'},
  {type:'tapAll',prompt:'Tap ALL the words with the e sound, like red!',options:['pen','sit','bell','fan','nest','log','yes','bed'],answers:[0,2,4,6,7],hint:'Say them: b-e-ll, n-e-st … Find 5!'},
 ]},
 {id:'q7',after:'o08',v:[
  {type:'choice',prompt:"Rabbit's go-kart: It's ___ old go-kart.",options:['a','an'],answer:1,hint:'old starts with o → an.'},
  {type:'choice',prompt:"Pick the right sentence for Rabbit's go-kart!",options:["It's an old go-kart.","It's a old go-kart.","It's an new go-kart."],answer:0,hint:'old starts with o → an old.'},
  {type:'choice',prompt:"Rabbit's go-kart is small and old. It's ___ old go-kart.",options:['an','a','the'],answer:0,hint:'old starts with o → an.'},
  {type:'choice',prompt:"Rabbit's go-kart isn't new. It's ___ go-kart.",options:['an old','a new','a old'],answer:0,hint:'Not new → old. old starts with o → an.'},
  {type:'type',prompt:"Monkey's go-kart is new. Rabbit's go-kart is an ___ go-kart. Type it!",answer:'old',hint:'The opposite of new: o-l-d.'},
 ]},
 {id:'q8',after:'o10',v:[
  {type:'choice',prompt:'Monkey cheated. What should we do?',options:['Throw a banana at Monkey','Help Rabbit and keep racing fairly','Stop and go home'],answer:1,hint:'Cheating is wrong. We play fair!'},
  {type:'choice',prompt:"Monkey threw a banana. That isn't fair! What should we do?",options:['Play fair and help Rabbit','Throw bananas at Monkey','Laugh at Rabbit'],answer:0,hint:'Cheating is wrong. We play fair!'},
  {type:'choice',prompt:'Dragon wants to throw bananas at Monkey. Is that a good idea?',options:['No! Cheating is wrong. We play fair.','Yes! Throw lots of bananas!','Yes! Push Monkey into the mud!'],answer:0,hint:'Cheating is wrong. We play fair!'},
  {type:'choice',prompt:"Rabbit's go-kart spun round and round. What can good friends do?",options:['Help Rabbit and race on fairly','Cheat like Monkey','Cry and go home'],answer:0,hint:'Good friends help. We play fair!'},
  {type:'picture',prompt:'Which one is FAIR play?',options:[{label:'Help a friend',icon:'🤝'},{label:'Throw a banana',icon:'🍌'},{label:'Push other go-karts',icon:'💥'}],answer:0,hint:'Fair play = be kind and follow the rules.'},
 ]},
];
const gRand=n=>Math.floor(Math.random()*n);
const gMix=a=>{const o=a.slice();for(let i=o.length-1;i>0;i--){const j=gRand(i+1);[o[i],o[j]]=[o[j],o[i]]}return o};
// shuffle a variant's options and remap its answer index(es), so the order changes on every reopen too
function gateMixOpts(q){if(!q.options)return q;const idx=gMix(q.options.map((_,i)=>i));
  const r={...q,options:idx.map(i=>q.options[i])};if('answer'in q)r.answer=idx.indexOf(q.answer);if(q.answers)r.answers=q.answers.map(a=>idx.indexOf(a));return r}
const GATES=GATE_POOL.map(({v,...base})=>{const k=gRand(v.length);return gateMixOpts({...base,...v[k],say:v[k].prompt!==v[0].prompt})});
// 🔊 on a new variant: read the on-screen question (the recorded clip asks the original one)
document.addEventListener('click',e=>{if(!e.target.closest||!e.target.closest('#gsay'))return;const q=typeof GOPEN!=='undefined'&&GOPEN;
  if(!q||!q.say||!('speechSynthesis'in window))return;e.stopImmediatePropagation();e.preventDefault();
  speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(q.prompt.replace(/_[_ ]*/g,'blank ')),vs=speechSynthesis.getVoices();
  u.lang='en-GB';u.rate=.85;u.voice=vs.find(v=>/^en-GB/i.test(v.lang))||vs.find(v=>/^en/i.test(v.lang))||null;speechSynthesis.speak(u)},true);
const GATE_RETRY=['x01','x02','x03'];

/* ---------- story moments (absolute times), shared by scenes, props and SFX */
const endOf=(S,id)=>S.cues[id]+CLIP[id].eff;
const gateT=id=>{const q=GATES.find(q=>q.id===id),c=CUES.find(c=>c.id===q.after);return c.t+c.eff+.25};
const T_WHEELS=()=>gateT('q1')+.35, T_STICKER=()=>gateT('q2')+.35;
const T_BUILT=()=>at(shot('lab'),'b06','ready'), T_PAINT=()=>at(shot('paint'),'r04','Splash');
const T_GO=()=>at(shot('race'),'b07','Go');
const bendBanana=()=>at(shot('bend'),'m03','banana'), bendSpin=()=>bendBanana()+.75;
const bendGo=()=>at(shot('bend'),'b08','Hold on');
const lineSplat=()=>at(shot('line'),'d12','SPLAT'), lineCross=()=>shot('line').cues.a07-.35;

/* ---------- sound effects (Web Audio; the go-kart sounds are recipes written here) */
SYNTH_SFX.sfx_engine={len:3,amb:1,f:(A,o,t,d)=>{const g=sxBed(A,o,t,d,.42),lp=sxFilt(A,'lowpass',1100,1,g);
  for(const[f,v]of[[58,.55],[87,.3],[116,.15]]){const x=osc(A,'sawtooth',f,t,t+d+.1),h=A.createGain();h.gain.value=v;x.connect(h);h.connect(lp);
    x.frequency.setValueAtTime(f,t);x.frequency.linearRampToValueAtTime(f*1.55,t+Math.min(1.4,d*.5));sxLfo(A,x.frequency,13,f*.08,t,t+d+.1)}}};
SYNTH_SFX.sfx_skid={len:1.6,f:(A,o,t,d)=>{const b=sxNoise(A,o,t,.7,.02,d*.45,d*.5,'bandpass',2400,7);sxLfo(A,b.frequency,6,600,t,t+d);
  const x=sxTone(A,o,'square',900,t,.05,.03,d*.45,d*.45,520);sxLfo(A,x.frequency,9,60,t,t+d)}};
SYNTH_SFX.sfx_cluck={len:.8,f:(A,o,t,d,R)=>{for(let i=0;i<3;i++){const tt=t+i*.16+R()*.03,bp=sxFilt(A,'bandpass',950+R()*300,2.5,o);sxTone(A,bp,'sawtooth',430+R()*90,tt,.6,.004,.03,.06,290)}}};
SYNTH_SFX.sfx_squelch={len:.8,f:(A,o,t,d,R)=>{const b=sxNoise(A,o,t,.9,.01,.08,.4,'lowpass',400,5);b.frequency.setValueAtTime(260,t);b.frequency.exponentialRampToValueAtTime(1500,t+.14);b.frequency.exponentialRampToValueAtTime(220,t+.5);
  sxTone(A,o,'sine',170,t,.6,.004,.05,.25,60);for(let i=0;i<5;i++)sxTone(A,o,'sine',280+R()*320,t+.18+R()*.35,.14,.002,0,.05,800)}};
SYNTH_SFX.sfx_whistle={len:1.2,f:(A,o,t)=>{const x=sxTone(A,o,'sine',2850,t,.32,.01,.22,.08);sxLfo(A,x.frequency,36,150,t,t+.35);
  const y=sxTone(A,o,'sine',2850,t+.45,.38,.01,.45,.15);sxLfo(A,y.frequency,36,150,t+.45,t+1.1)}};

function chapterSFX(){const S=shot,C=cue,len=slen;const sq=S('square'),sh=S('shop'),fa=S('fair'),la=S('lab'),pa=S('paint'),ra=S('race'),be=S('bend'),li=S('line'),po=S('podium'),fi=S('finale');
  const pops=(Sx,id,ws,g=.45)=>ws.map(w=>({t:at(Sx,id,w),name:'sfx_pop',gain:g}));return[
  {t:S('title').start+.8,name:'sfx_sparkle',gain:.6},{t:S('title').start+.2,name:'sfx_birds',dur:len('title'),gain:.2},
  {t:sq.start,name:'sfx_birds',dur:len('square'),gain:.22},{t:sq.start,name:'sfx_crowd',dur:len('square'),gain:.12},
  {t:at(sq,'r01','Hooray'),name:'sfx_pop',gain:.5},{t:C('square','b01'),name:'sfx_ting',gain:.4},{t:at(sq,'b01','To the'),name:'sfx_whoosh',dur:.9,gain:.4},
  {t:sh.start+1.6,name:'sfx_bell',dur:.9,gain:.35},
  ...pops(sh,'p01',['kite','doll','train','plane']),...pops(sh,'f01',['ball','bike','car','computer']),
  {t:at(sh,'r02','monster'),name:'sfx_boing',gain:.5},{t:C('shop','b02'),name:'sfx_ting',gain:.35},
  {t:C('shop','a02')+.1,name:'sfx_sparkle',gain:.5},{t:T_WHEELS(),name:'sfx_ding',gain:.6},{t:at(sh,'p02','sticker'),name:'sfx_pop',gain:.6},{t:T_STICKER()+.2,name:'sfx_ding',gain:.55},
  {t:fa.start,name:'sfx_crowd',dur:len('fair'),gain:.14},{t:fa.start+.5,name:'sfx_birds',dur:len('fair')-.5,gain:.15},
  {t:C('fair','o02')+.1,name:'sfx_ting',gain:.4},{t:C('fair','o05')+.1,name:'sfx_ting',gain:.4},{t:C('fair','o06')+.1,name:'sfx_ting',gain:.4},
  {t:C('fair','r03'),name:'sfx_pop',gain:.4},{t:C('fair','f02'),name:'sfx_pop',gain:.4},{t:C('fair','p03'),name:'sfx_pop',gain:.4},
  {t:C('lab','b04'),name:'sfx_ting',gain:.4},...['square','triangle','rectangle','parallelogram'].map(w=>({t:at(la,'b04',w)-.05,name:'sfx_whoosh',dur:.6,gain:.35})),
  ...['square','triangle','rectangle','parallelogram'].map(w=>({t:at(la,'b04',w)+.6,name:'sfx_click',gain:.5})),
  {t:at(la,'a03','circles'),name:'sfx_sparkle',gain:.35},{t:at(la,'b06','Click'),name:'sfx_click',gain:.8},{t:T_BUILT(),name:'sfx_magic',gain:.55},
  {t:pa.start+.9,name:'sfx_cluck',gain:.5},{t:at(pa,'p05','hen'),name:'sfx_cluck',gain:.55},{t:at(pa,'o07','hen'),name:'sfx_cluck',gain:.4},
  {t:gateT('q6')+.2,name:'sfx_click',gain:.7},{t:gateT('q6')+.25,name:'sfx_sparkle',gain:.4},{t:T_PAINT()-.1,name:'sfx_splash',gain:1},{t:T_PAINT()+.5,name:'sfx_magic',gain:.4},
  {t:ra.start,name:'sfx_crowd',dur:len('race'),gain:.32},{t:ra.start,name:'sfx_engine',dur:len('race'),gain:.12},
  {t:at(ra,'d08','Then a new')-.2,name:'sfx_engine',dur:2.6,gain:.35},{t:at(ra,'m01','ugly'),name:'sfx_boing',gain:.3},
  {t:C('race','b07'),name:'sfx_drumroll',dur:T_GO()-C('race','b07'),gain:.4},{t:T_GO()-.05,name:'sfx_whistle',gain:.55},{t:T_GO(),name:'sfx_engine',dur:2.8,gain:.6},{t:T_GO()+.5,name:'sfx_whoosh',dur:1,gain:.5},
  {t:be.start,name:'sfx_birds',dur:len('bend'),gain:.16},{t:be.start,name:'sfx_engine',dur:bendSpin()-be.start+.4,gain:.4},
  {t:bendBanana()-.05,name:'sfx_whoosh',dur:.7,gain:.5},{t:bendSpin()-.05,name:'sfx_skid',dur:1.8,gain:.7},{t:bendSpin()+1.2,name:'sfx_thud',gain:.5},
  {t:at(be,'m04','Now')-.6,name:'sfx_engine',dur:2.2,gain:.3},{t:at(be,'b08','Fixed'),name:'sfx_sparkle',gain:.5},{t:at(be,'b08','Beep'),name:'sfx_ting',gain:.4},
  {t:bendGo(),name:'sfx_engine',dur:2.6,gain:.55},{t:bendGo()+.3,name:'sfx_whoosh',dur:.9,gain:.4},
  {t:li.start,name:'sfx_crowd',dur:len('line'),gain:.3},{t:li.start,name:'sfx_engine',dur:len('line')-.4,gain:.42},
  {t:lineSplat()-.05,name:'sfx_squelch',gain:1},{t:lineCross()-.1,name:'sfx_whistle',gain:.5},{t:lineCross()+.1,name:'sfx_tada',gain:.55},{t:lineCross()+.2,name:'sfx_applause',dur:3,gain:.45},
  {t:po.start,name:'sfx_applause',dur:3,gain:.35},{t:at(po,'o12','Congratulations'),name:'sfx_tada',gain:.55},{t:at(po,'o12','Congratulations')+.1,name:'sfx_sparkle',gain:.5},
  {t:C('podium','m05')-.2,name:'sfx_squelch',gain:.35},
  {t:fi.start,name:'sfx_engine',dur:len('finale')-1,gain:.25},{t:fi.start,name:'sfx_birds',dur:len('finale'),gain:.2},
  {t:C('finale','p07'),name:'sfx_pop',gain:.6},{t:C('finale','p07')+.15,name:'sfx_pop',gain:.5},{t:C('finale','d13'),name:'sfx_applause',dur:3,gain:.35},
];}

/* =====================================================================
   2D OVERLAY HELPERS (cards on top of the 3D frame)
   ===================================================================== */
const cardK=(t,a,b,fade=.4)=>seg(t,a,a+.35)*(1-seg(t,b-fade,b));
function sayCard(g,text,k,y=112,col='#1d6fa5',wsh='#bfe3f7'){const w=Math.min(1100,120+text.length*21);card(g,640,y,w,86,k,{seed:800+text.length,fill:'#fffaf0',wash:wsh,draw:g=>inkText(g,text,0,13,40,{col})})}
function tag(g,word,x,y,k,col='#1d6fa5',wsh='#fff1c2'){if(k<=0)return;const w=60+word.length*21;card(g,x,y,w,58,k,{seed:900+word.length*7,fill:'#fffaf0',wash:wsh,draw:g=>inkText(g,word,0,11,32,{col})})}
// question + answer card (Owl's guessing game)
function qaCard(g,q,a,kq,ka,y=118){if(kq<=0)return;card(g,640,y,860,ka>0?136:86,kq,{seed:1200+q.length,fill:'#fffaf0',wash:'#cde8b5',draw:g=>{
  inkText(g,q,0,ka>0?-18:13,38,{col:'#2e5a8a'});if(ka>0)inkText(g,a,0,40,38,{col:'#1b6e2c',alpha:clamp(ka)})}})}
// a word with its e in red (phonics)
function eWord(g,w,x,y,size,col='#5a3d28'){const i=w.toLowerCase().indexOf('e'),pre=w.slice(0,i),post=w.slice(i+1);g.font=`800 ${size}px ${FONT}`;
  const wp=g.measureText(pre).width,wm=g.measureText(w[i]).width,wq=g.measureText(post).width,x0=x-(wp+wm+wq)/2;
  inkText(g,pre,x0,y,size,{align:'left',col});inkText(g,w[i],x0+wp,y,size,{align:'left',col:'#e2382c'});inkText(g,post,x0+wp+wm,y,size,{align:'left',col})}
// top-right tracker: what Rabbit's go-kart has so far (wheels, kite sticker, shapes, red paint)
function kartHUD(g,t,k=1){if(k<=0)return;const T=[T_WHEELS(),T_STICKER(),T_BUILT(),T_PAINT()],x0=1250-4*62;g.save();g.globalAlpha=clamp(k);
  blob(g,rrectP(x0-14,18,4*62+18,96,14),'#fffaf0',{seed:2200,w:1.6,alpha:.88});inkText(g,"Rabbit's go-kart",x0+120,44,20,{col:'#8a6440'});
  for(let i=0;i<4;i++){const x=x0+i*62+26,y=80,got=t>=T[i];g.save();g.translate(x,y);
    if(got){const p=back(seg(t,T[i],T[i]+.5));g.scale(p,p);hudIcon(g,i,1);if(t<T[i]+1.1){g.restore();sparkles(g,x,y,t-T[i],2210+i,8,50);continue}}
    else{g.globalAlpha*=.55;g.setLineDash([5,5]);g.strokeStyle='#9a8f80';g.lineWidth=2;g.strokeRect(-20,-20,40,40);g.setLineDash([]);hudIcon(g,i,.25)}g.restore()}
  g.restore()}
function hudIcon(g,i,a){g.save();g.globalAlpha*=a;
  if(i===0){blob(g,ell(0,0,17,17,16),'#2a2a2e',{seed:2230,w:1.6});blob(g,ell(0,0,7,7,10),'#d8d8d8',{seed:2231,w:1})}
  else if(i===1){blob(g,[[0,-19],[13,0],[0,19],[-13,0]],'#4fa84f',{seed:2232,w:1.4});blob(g,[[0,-19],[13,0],[0,19]],'#f28c28',{seed:2233,w:1.4})}
  else if(i===2){blob(g,[[-18,14],[18,14],[0,-16]],'#f28c28',{seed:2234,w:1.4});blob(g,rectP(-8,0,16,14),'#4fa84f',{seed:2235,w:1.2})}
  else{blob(g,[[0,-19],[12,2],[8,14],[0,18],[-8,14],[-12,2]],'#e2382c',{seed:2236,w:1.4})}g.restore()}
function mudSplat(g,x,y,s,seed,k){if(k<=0)return;g.save();g.translate(x,y);g.scale(s*back(k),s*back(k));for(let i=0;i<7;i++){const a=i*.9+seed,r=30+hash2(i,1,seed)*30;blob(g,ell(Math.cos(a)*r,Math.sin(a)*r*.6,10+hash2(i,2,seed)*10,8+hash2(i,3,seed)*8,8),'#7a5532',{seed:seed+i,w:1.2})}blob(g,ell(0,0,32,20,14),'#7a5532',{seed:seed+9,w:1.6});g.restore()}
function confetti(g,t,t0,dur=3,n=60,seed=5100){const u=t-t0;if(u<0||u>dur)return;const fade=1-seg(u,dur-.6,dur),C=['#e2382c','#f6c445','#1d9ae0','#4fa84f','#e85d9a','#7b5bd6'];
  g.save();g.globalAlpha=fade;for(let i=0;i<n;i++){const x=hash2(i,1,seed)*1280+Math.sin(u*2+i)*30,y=-30+u*(160+hash2(i,2,seed)*160)+hash2(i,3,seed)*80;g.save();g.translate(x,y);g.rotate(u*4+i);g.fillStyle=C[i%6];g.fillRect(-7,-4,14,8);g.restore()}g.restore()}

/* =====================================================================
   3D WORLD — one low-poly toy Pet Town (the world3d kit draws it; see references/world-3d.md)
   Each place is a group at LOC[place]; pets stand on local z≈0..2, cameras look toward -z.
   The race track is a stadium oval: straights at z=-4 and z=-30 (x 24…56) joined by half-circles (r 13).
   ===================================================================== */
const LOC={sq:[0,0],shop:[-30,-20],fair:[-50,6],lab:[-34,34],paint:[-6,44],race:[40,-4],bend:[40,-30],pod:[22,12],world:[0,0]};
const CAST3D={dragon:{img:'dragon',h:2.0,spk:'R'},fox:{img:'fox',h:1.75,spk:'F'},owl:{img:'owl',h:1.6,spk:'O'},panda:{img:'panda',h:1.85,spk:'P'},
  rabbit:{img:'rabbit',h:1.35,spk:'A'},robot:{img:'robot',h:1.9,spk:'B'},monkey:{img:'monkey',h:1.8,spk:'M'}};
const ENV_OF={title:'dawn',square:'day',shop:'shop',fair:'bright',lab:'bright',paint:'day',race:'bright',bend:'forest',line:'bright',podium:'dawn',finale:'day'};
ENVS.shop={top:'#9fd0ee',bot:'#fff4e2',fog:'#f6e6cc',near:34,far:105,hs:'#fff6e8',hg:'#d8b48a',hi:.68,sc:'#fff0d8',si:.72,tint:'#ffffff'};
ENVS.forest={top:'#8fb8c9',bot:'#e6eed8',fog:'#b2c8ae',near:22,far:80,hs:'#eef6e8',hg:'#4f6a45',hi:.64,sc:'#fff2d0',si:.62,tint:'#f6f9f2'};
const FLY={shop:2.0,fair:2.0,lab:2.0,paint:2.0,race:2.4,bend:2.0,line:1.8,podium:1.6,finale:1.4};
function envOf3(S,lt){if(S.id==='title')return envMix(ENVS.dawn,ENVS.day,seg(lt,0,S.end-S.start));
  if(S.id==='finale'){const E=ENVS.day,k=ease(seg(lt,S.cues.d13-S.start,S.end-S.start-.4));return{...E,near:lerp(E.near,110,k),far:lerp(E.far,230,k)}}return null}

/* ---------- shapes + helpers */
function shapeGeo(pts,depth){let cx=0,cy=0;for(const[x,y]of pts){cx+=x;cy+=y}cx/=pts.length;cy/=pts.length;const s=new THREE.Shape();
  pts.forEach(([x,y],i)=>i?s.lineTo(x-cx,y-cy):s.moveTo(x-cx,y-cy));s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false});g.translate(0,0,-depth/2);g.userData.c=[cx,cy];return g}
// a flat shape standing in the x-y plane (side view), extruded `depth` along z
function shp(P,pts,depth,col,o={}){const g=shapeGeo(pts,depth),[cx,cy]=g.userData.c,p=o.p||[0,0,0];const m=add(P,g,col,{...o,p:[p[0]+cx,p[1]+cy,p[2]]});
  if(typeof col!=='string')ink(m,.03);m.userData.base=m.position.clone();return m}
function bar3(P,a,b,r,col){const d=new THREE.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]),L=d.length(),m=add(P,CYL(r,r,L,6),col,{p:[(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2],inkW:.02});
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return m}
const toonM=c=>new THREE.MeshToonMaterial({color:c,gradientMap:R3.grad});

/* ---------- go-karts: a body of tangram-shaped side pieces (x = forward) on a chassis with four wheels */
const KART_PTS={rect:[[[-.9,.25],[.6,.25],[.6,.55],[-.9,.55]],1.0],nose:[[[.6,.25],[1.25,.25],[.6,.55]],1.0],sq:[[[-.9,.55],[-.4,.55],[-.4,1.05],[-.9,1.05]],.9],
  tri:[[[0,.55],[.5,.55],[0,.85]],.8],par:[[[-1.15,1.05],[-.75,1.05],[-.55,1.25],[-.95,1.25]],1.1]};
function kart3(P,cols,o={}){const g=grp(P,o.p||[0,0,0],o.ry||0,o.s||1);if(!o.fixed)dyn(g);const K={g,P:{},M:{},W:[]};
  add(g,BOX(2.1,.1,.9),'#3a3a40',{p:[0,.24,0]});
  for(const k in KART_PTS){const[pts,d]=KART_PTS[k];let c=cols[k];if(o.own){K.M[k]=toonM(c);c=K.M[k]}K.P[k]=shp(g,pts,d,c)}
  for(const[x,z]of[[.72,.6],[.72,-.6],[-.68,.6],[-.68,-.6]]){const w=grp(g,[x,.3,z]);add(w,CYL(.3,.3,.22,14),'#2a2a2e',{r:[Math.PI/2,0,0],inkW:.03});add(w,BOX(.42,.07,.25),'#d8d8d8',{ink:false});K.W.push(w)}
  return K}
// pose a kart at local (x,z) of the current place, heading ang (0 = +x), wheels turned for distance `dist`
function poseKart(K,x,z,ang=0,dist=0,o={}){const g=K.g;g.visible=true;g.position.set(O[0]+x,(o.y||0)+(o.bump||0),O[1]+z);g.rotation.set(0,ang,o.roll||0);for(const w of K.W)w.rotation.z=-dist/.3}
// kart + its driver (sprite sits in the seat; the near side panels hide the legs)
function drive(K,key,x,z,ang,dist,o={}){const bump=o.still?0:Math.abs(Math.sin(dist*2.7))*.035;poseKart(K,x,z,ang,dist,{...o,bump});const c=Math.cos(ang),s=Math.sin(ang),dx=-.22*(K.g.scale.x);
  actor(key,x+dx*c,z-dx*s,{y:.4*K.g.scale.x+(o.y||0)+bump,h:o.h,face:o.face??(c>0?1:0),tilt:o.tilt||0,hop:o.hop||0,shadow:false,talk:o.talk})}
const TANGRAM={rect:'#1d6fa5',nose:'#f28c28',sq:'#4fa84f',tri:'#7b5bd6',par:'#f6c445'},PAINTED={rect:'#e2382c',nose:'#c92a20',sq:'#d83a2e',tri:'#ffd2c8',par:'#b8241c'};
// Rabbit's kart for story time t: pieces fly in at the lab, the nose after challenge 5, red paint at the shed, kite sticker
const _ca=new THREE.Color(),_cb=new THREE.Color();
function rkPose(t){const K=R3.RK,L=shot('lab'),arr={sq:at(L,'b04','square'),tri:at(L,'b04','triangle'),rect:at(L,'b04','rectangle'),par:at(L,'b04','parallelogram'),nose:at(L,'b06','Click')};
  const pt=seg(t,T_PAINT(),T_PAINT()+.45);
  for(const k in K.P){const m=K.P[k],a=arr[k],b=m.userData.base,off=K.bench[k];let u;
    if(k==='nose'){const g0=gateT('q5')+.1;m.visible=t>g0;u=seg(t,g0,a)}else{m.visible=true;u=seg(t,a-.6,a)}
    const e=ease(u);m.position.set(b.x+off[0]*(1-e),b.y+off[1]*(1-e)+Math.sin(u*Math.PI)*1.1,b.z+off[2]*(1-e));m.rotation.set(0,(1-e)*2.4,(1-e)*(k==='nose'?0:1.57));
    K.M[k].color.copy(_ca.set(TANGRAM[k])).lerp(_cb.set(PAINTED[k]),pt)}
  for(const s of K.stick)s.visible=t>T_STICKER()}

/* ---------- toys (shop) */
function kite3(P,x,y,z,s=1){const g=grp(P,[x,y,z],0,s);shp(g,[[0,.7],[0,-.9],[-.48,0]],.05,'#4fa84f');shp(g,[[0,.7],[.48,0],[0,-.9]],.05,'#f28c28');
  bar3(g,[0,.7,.04],[0,-.9,.04],.02,'#6b4526');bar3(g,[-.48,0,.04],[.48,0,.04],.02,'#6b4526');
  for(let i=0;i<4;i++){const yy=-1.05-i*.32,xx=Math.sin(i*1.4)*.14;add(g,BOX(.16,.08,.03),['#e2382c','#f6c445','#1d9ae0','#e85d9a'][i],{p:[xx,yy,0],r:[0,0,.5],inkW:.02})}return g}
function doll3(P,x,y,z,s=1){const g=grp(P,[x,y,z],0,s);add(g,CONE(.28,.62,10),'#f39cc6',{p:[0,.31,0]});add(g,SPH(.15,1),'#f6d6b8',{p:[0,.75,0]});
  add(g,SPH(.16,1),'#f6c445',{p:[0,.8,-.04],s:[1,.75,1]});add(g,CONE(.07,.12,5),'#f6c445',{p:[0,.97,0]});for(const sx of[-1,1])bar3(g,[sx*.1,.55,0],[sx*.28,.38,0],.03,'#f6d6b8');return g}
function monster3(P,x,y,z,s=1){const g=grp(P,[x,y,z],0,s);add(g,SPH(.48,1),'#4a78d8',{p:[0,.5,0],flat:true});
  for(let i=0;i<9;i++){const a=i/9*6.28;add(g,CONE(.08,.22,5),'#3a62b8',{p:[Math.cos(a)*.44,.5+Math.sin(a)*.44,-.05],r:[0,0,a-Math.PI/2],ink:false})}
  for(const sx of[-.16,.16]){add(g,SPH(.11,1),'#ffffff',{p:[sx,.66,.4]});add(g,SPH(.05,0),'#2a1f17',{p:[sx,.66,.5],ink:false})}
  add(g,BOX(.4,.12,.06),'#2a1f17',{p:[0,.36,.44],ink:false});for(const sx of[-.12,0,.12])add(g,BOX(.06,.07,.04),'#ffffff',{p:[sx,.4,.47],ink:false});return g}
function plane3(P,x,y,z,s=1){const g=grp(P,[x,y,z],0,s);add(g,CYL(.12,.08,1.3,8),'#9aa3ad',{p:[0,.2,0],r:[0,0,Math.PI/2]});add(g,CONE(.12,.3,8),'#7a838d',{p:[.8,.2,0],r:[0,0,-Math.PI/2]});
  add(g,BOX(.4,.03,1.4),'#b8c0c8',{p:[.05,.2,0]});add(g,BOX(.25,.32,.03),'#7a838d',{p:[-.55,.38,0]});add(g,BOX(.2,.03,.5),'#b8c0c8',{p:[-.55,.22,0]});add(g,SPH(.08,0),'#5ce0ff',{p:[.45,.3,0],s:[1.6,.7,1]});return g}
function game3(P,x,y,z,s=1){const g=grp(P,[x,y,z],0,s);add(g,BOX(.52,.66,.1),'#e2382c',{p:[0,.33,0]});
  const tx=textTex(256,320,'#2a1f17',(c,w,h)=>{c.fillStyle='#f6c445';c.fillRect(14,14,w-28,h-28);inkText(c,'ZOOM',w/2,130,72,{col:'#e2382c'});inkText(c,'GAME',w/2,230,52,{col:'#1d6fa5'})});
  add(g,PLANE(.46,.6),bm('#ffffff',{map:tx}),{p:[0,.33,.055],ink:false,cast:false});return g}
function train3(P,x,y,z,s=1){const g=grp(P,[x,y,z],0,s);for(let i=0;i<3;i++){const cx=-.6+i*.6;add(g,BOX(.52,.26,.28),'#3fae4a',{p:[cx,.2,0]});add(g,BOX(.4,.08,.29),'#bfe3f7',{p:[cx,.24,0],ink:false});
    for(const wx of[-.15,.15])add(g,CYL(.06,.06,.3,8),'#2a2a2e',{p:[cx+wx,.06,0],r:[Math.PI/2,0,0],ink:false})}add(g,BOX(1.9,.03,.12),'#8a8f99',{p:[0,.0,0],ink:false});add(g,CONE(.14,.2,6),'#3fae4a',{p:[1.0,.2,0],r:[0,0,-Math.PI/2]});return g}
function car3(P,x,y,z,s=1){const g=grp(P,[x,y,z],0,s);add(g,BOX(1.3,.34,.7),'#2a2a2e',{p:[0,.38,0]});add(g,BOX(.65,.3,.6),'#3e4a5c',{p:[-.12,.7,0]});add(g,BOX(.6,.22,.62),'#bfe3f7',{p:[-.12,.72,0],ink:false});
  add(g,BOX(.5,.06,.72),'#e2382c',{p:[.3,.5,0],ink:false});for(const[wx,wz]of[[.42,.36],[.42,-.36],[-.42,.36],[-.42,-.36]])add(g,CYL(.18,.18,.14,12),'#1a1a1e',{p:[wx,.18,wz],r:[Math.PI/2,0,0],inkW:.02});return g}
function ball3(P,x,y,z,s=1){const st=stripeTex('#e2382c','#ffffff',6);return add(P,SPH(.34,2),'#ffffff',{p:[x,y+.34*s,z],s,map:st,inkW:.03})}
function bike3(P,x,y,z,s=1){const g=grp(P,[x,y,z],0,s);for(const wx of[-.55,.55])add(g,TOR(.36,.04,6,20),'#2a2a2e',{p:[wx,.4,0],inkW:.02});
  bar3(g,[-.55,.4,0],[-.05,.4,0],.035,'#e2382c');bar3(g,[-.05,.4,0],[.3,.85,0],.035,'#e2382c');bar3(g,[-.55,.4,0],[-.25,.85,0],.035,'#e2382c');bar3(g,[-.25,.85,0],[.3,.85,0],.035,'#e2382c');
  bar3(g,[.3,.85,0],[.55,.4,0],.035,'#e2382c');bar3(g,[.3,.85,0],[.38,1.05,0],.03,'#3e4a5c');bar3(g,[.38,1.05,-.22],[.38,1.05,.22],.025,'#3e4a5c');add(g,BOX(.26,.06,.12),'#2a2a2e',{p:[-.28,.92,0]});return g}
function hen3(P){const g=dyn(grp(P,[0,0,0]));add(g,SPH(.33,1),'#ffffff',{p:[0,.42,0],s:[1.25,1,1]});add(g,CONE(.2,.36,6),'#f3ead6',{p:[-.42,.6,0],r:[0,0,1.1]});
  const h=grp(g,[.32,.72,0]);add(h,SPH(.17,1),'#ffffff',{});add(h,CONE(.06,.16,5),'#f28c28',{p:[.2,-.02,0],r:[0,0,-Math.PI/2]});for(const[cx,cy]of[[-.04,.18],[.04,.2],[.1,.16]])add(h,SPH(.05,0),'#e2382c',{p:[cx,cy,0],ink:false});
  for(const sz of[-.07,.07])add(h,SPH(.03,0),'#2a1f17',{p:[.1,.04,sz*1.6],ink:false});add(h,SPH(.05,0),'#e2382c',{p:[.15,-.12,0],ink:false});
  for(const sz of[-.1,.1])bar3(g,[0,.12,sz],[0,0,sz],.025,'#f28c28');g.userData.head=h;return g}
function pot3(P,x,y,z,col,s=1){const g=grp(P,[x,y,z],0,s);add(g,CYL(.22,.22,.32,12),'#c9ced6',{p:[0,.16,0],inkW:.02});add(g,CYL(.23,.23,.06,12),col,{p:[0,.33,0],inkW:.02});add(g,BOX(.3,.14,.02),col,{p:[0,.16,.22],ink:false});return g}

/* ---------- signs and photos */
const signTex=(w,h,bg,txt,size,col,sub)=>textTex(w,h,bg,(c,W2,H2)=>{inkText(c,txt,W2/2,sub?H2*.48:H2*.62,size,{col});if(sub)inkText(c,sub,W2/2,H2*.84,size*.42,{col})});
function photoTex(name,bg,extra){return cardTex(300,370,(x,w,h)=>{x.fillStyle='#fffaf0';x.fillRect(0,0,w,h);x.fillStyle=bg;x.fillRect(18,18,w-36,h-36);
  const im=img(name);if(im)x.drawImage(im,24,40,w-48,w-48);extra&&extra(x,w,h);x.strokeStyle='#8a6440';x.lineWidth=6;x.strokeRect(3,3,w-6,h-6)})}
const badge=(x,n,cx,cy,col)=>{blob(x,ell(cx,cy,34,34,16),col,{seed:3300+n,w:1.6});inkText(x,String(n),cx,cy+15,44,{col:'#fffaf0'})};
function miniDoll(x,cx,cy){blob(x,[[cx-30,cy+50],[cx+30,cy+50],[cx,cy-10]],'#f39cc6',{seed:3310,w:1.5});blob(x,ell(cx,cy-20,16,16,12),'#f6d6b8',{seed:3311,w:1.4});blob(x,ell(cx,cy-30,17,10,12),'#f6c445',{seed:3312,w:1.2})}
function miniKart(x,cx,cy){blob(x,rectP(cx-50,cy-14,80,24),'#2e9b74',{seed:3320,w:1.5});blob(x,[[cx+30,cy-14],[cx+56,cy+10],[cx+30,cy+10]],'#f6c445',{seed:3321,w:1.4});
  for(const wx of[-34,26])blob(x,ell(cx+wx,cy+16,14,14,12),'#2a2a2e',{seed:3322+wx,w:1.4})}

/* ---------- the world */
function buildWorld(R){const S=R.scene;
  flatPlane(S,320,320,'#a8d37f',[0,0,0],{recv:true});
  // the square + paths out to every place
  add(S,CYL(12,12,.06,40),'#e7dcc6',{p:[0,.03,0],ink:false,cast:false});add(S,TOR(12,.12,4,48),'#cbb994',{p:[0,.04,0],r:[Math.PI/2,0,0],ink:false,cast:false});
  let pi=0;for(const[a,b]of[[[0,0],LOC.shop],[LOC.shop,LOC.fair],[LOC.fair,LOC.lab],[LOC.lab,LOC.paint],[[0,0],LOC.paint],[[0,0],[24,-4]],[[0,0],LOC.pod],[LOC.pod,[30,-4]]])path3D(S,a,b,2.6,'#e9d9b4',.015+(pi++)*.001);
  const HC=[['#f7d7a6','#c0563a'],['#cfe3f7','#5a4fb0'],['#f6d6e6','#2e9b74'],['#fff1c2','#e2382c'],['#d8efc8','#8a5a2b'],['#e8dcf7','#d9731a']];
  [[-11,-9,.3],[-13,-17,.4],[-15,0,1.2],[-12,9,2.2],[11,10.5,-2.2],[-5,-15,.1],[3,15,-.2],[-20,-11,.6],[-19,7,1.6],[-22,18,-2.6]].forEach(([x,z,r],i)=>house(S,x,z,HC[i%6][0],HC[i%6][1],r,1+hash2(i,3,90)*.25));
  for(const[x,z]of[[-10,5],[10,5],[-8,-4],[8,-4]])lamp(S,x,z);for(const[x,z,s]of[[-6,6,11],[6,6,12],[-9,1,13],[9,1,14]])flowers(S,x,z,9,s);bench(S,-5,8,3,.2);bench(S,5,8,3,-.2);
  // race poster on the square
  {const g=grp(S,[0,0,-4]);for(const x of[-2.9,2.9])add(g,CYL(.14,.18,2.2,8),'#6b4526',{p:[x,1.1,0]});add(g,BOX(6.4,3.6,.25),'#8a5a2b',{p:[0,3.6,0]});
    const tx=textTex(640,360,'#fff1c2',(c,w,h)=>{inkText(c,'GO-KART RACE!',w/2,90,74,{col:'#e2382c'});miniKart(c,w/2-10,190);inkText(c,'Today · Pet Town track',w/2,280,40,{col:'#1d6fa5'});inkText(c,'1 pet – 1 go-kart',w/2,334,36,{col:'#5a3d28'})});
    add(g,PLANE(6,3.2),bm('#ffffff',{map:tx}),{p:[0,3.6,.14],ink:false,cast:false})}
  R.DK=kart3(S,{rect:'#2e9b74',nose:'#f6c445',sq:'#1b6e4c',tri:'#bfe3f7',par:'#f6c445'});
  R.MK=kart3(S,{rect:'#f6c445',nose:'#e2382c',sq:'#1d6fa5',tri:'#bfe3f7',par:'#e2382c'},{s:1.2});
  {const im=new THREE.InstancedMesh(SPH(1,0),tm('#e2382c',{flat:true}),90);im.count=0;im.frustumCulled=false;im.castShadow=false;S.add(im);R.bits.paint={im,n:0,max:90}}
  R.RK=kart3(S,TANGRAM,{own:true});R.RK.bench={rect:[5,1,-2.6],nose:[3.4,1.2,-.8],sq:[5.4,.8,-2.4],tri:[4.6,.9,-2.8],par:[5.8,.7,-2.2]};
  {const kt=textTex(128,128,null,(c)=>{c.save();c.translate(64,64);blob(c,[[0,-50],[34,0],[0,50],[-34,0]],'#4fa84f',{seed:3400,w:2});blob(c,[[0,-50],[34,0],[0,50]],'#f28c28',{seed:3401,w:2});c.restore()});
    R.RK.stick=[1,-1].map(sd=>{const m=new THREE.Mesh(PLANE(.34,.34),bm('#ffffff',{map:kt,transparent:true,alphaTest:.3}));m.position.set(-.2,.4,.505*sd);m.rotation.y=sd>0?0:Math.PI;R.RK.g.add(m);return m})}
  // TOY SHOP (an open-front room, no roof: a doll's-house shop)
  {setO('shop');const g=grp(S,[O[0],0,O[1]]);add(g,BOX(16,.1,9),'#ffffff',{p:[0,.05,-.6],map:checkerTex('#f3e2c4','#e7cfa6',8),ink:false,cast:false}).material.map.repeat.set(4,2.2);
    add(g,BOX(16,4.4,.3),'#f6d6e6',{p:[0,2.2,-5]});for(const sx of[-8,8])add(g,BOX(.3,4.4,9),'#f6d6e6',{p:[sx,2.2,-.6]});
    const aw=stripeTex('#e2382c','#f6c445',10);for(const sx of[-1,1])add(g,BOX(.5,.5,9.2),'#ffffff',{p:[sx*8,4.6,-.6],map:aw});add(g,BOX(16.6,.6,.5),'#ffffff',{p:[0,4.7,-5],map:aw});
    add(g,PLANE(5.4,1),bm('#ffffff',{map:signTex(600,110,'#1d6fa5','TOY SHOP',80,'#fff1c2')}),{p:[4.7,3.85,-4.83],ink:false,cast:false});
    for(const y of[1.3,2.3,3.3])add(g,BOX(7.4,.1,.8),'#a5713f',{p:[-3.6,y,-4.5]});add(g,BOX(4.4,.1,.8),'#a5713f',{p:[4.8,2.3,-4.5]});
    kite3(g,-6.2,3.0,-4.75,.9);doll3(g,-4.6,2.35,-4.5,1);train3(g,-3.2,1.35,-4.5,.9);plane3(g,-2.0,3.35,-4.5,.9);monster3(g,.4,3.35,-4.4,1.25);game3(g,5.4,2.35,-4.45,1);
    for(const[x,c]of[[-6.2,'#e85d9a'],[-1.3,'#5ce0ff'],[3.6,'#f6c445']])add(g,BOX(.5,.4,.4),c,{p:[x,1.55,-4.5]});
    add(g,BOX(7.6,.32,3.2),'#cfe3f7',{p:[4.2,.16,-2.2]});bike3(g,1.6,.32,-2.2,1.05);
    R.oldKart=kart3(g,{rect:'#8e6ad8',nose:'#6a4fc9',sq:'#5a4fb0',tri:'#bfe3f7',par:'#8e6ad8'},{p:[4.3,.32,-2.2],fixed:true});car3(g,6.8,.32,-2.2,1);ball3(g,7.1,0,.4,1);
    flatPlane(g,5,3,'#e85d9a',[-3,.11,1.4],{op:.6})}
  // TOY FAIR — Owl's "Who is it?" booth with three photos
  {setO('fair');const g=grp(S,[O[0],0,O[1]]);add(g,CYL(13,13,.06,36),'#f0e2c4',{p:[0,.03,-1],ink:false,cast:false});
    add(g,BOX(5.6,1.1,1.1),'#a5713f',{p:[0,.55,-1.4]});add(g,BOX(5.6,.12,1.2),'#f6c445',{p:[0,1.15,-1.4]});
    for(const sx of[-2.8,2.8])add(g,CYL(.1,.1,4.6,8),'#e9e3d8',{p:[sx,2.3,-2.2]});add(g,BOX(6.4,.5,1.8),'#ffffff',{p:[0,4.7,-1.8],map:stripeTex('#1d9ae0','#ffffff',12)});
    add(g,BOX(5.4,2.4,.15),'#8a5a2b',{p:[0,2.7,-2.4]});add(g,PLANE(4.4,.7),bm('#ffffff',{map:signTex(600,96,'#e2382c','WHO IS IT?',68,'#fffaf0')}),{p:[0,4.15,-2.3],ink:false,cast:false});
    R.photos=[photoTex('dragon','#cfe3f7',x=>{badge(x,7,252,62,'#e2382c');miniKart(x,150,318)}),photoTex('panda','#f6d6e6',x=>miniDoll(x,226,290)),photoTex('fox','#fff1c2',x=>badge(x,8,252,62,'#1d6fa5'))];
    for(const[x,c1,c2]of[[-10,'#e85d9a','#ffffff'],[10,'#4fa84f','#fff1c2']]){add(g,BOX(3.4,1,1),'#a5713f',{p:[x,.5,-3.5]});for(const sx of[-1.6,1.6])add(g,CYL(.08,.08,3,6),'#e9e3d8',{p:[x+sx,1.5,-3.5]});
      add(g,BOX(3.8,.4,1.4),'#ffffff',{p:[x,3.1,-3.5],map:stripeTex(c1,c2,10)})}
    for(let i=0;i<14;i++){const x=-12+i*1.85;add(g,CONE(.22,.4,3),['#e2382c','#f6c445','#1d9ae0','#4fa84f'][i%4],{p:[x,4.1-Math.sin(i/13*Math.PI)*.5,-5.6],r:[Math.PI,0,0],ink:false})}
    for(const[x,z,c]of[[-6.6,-4.2,'#e2382c'],[-6.1,-4.6,'#f6c445'],[6.4,-4.4,'#1d9ae0'],[6.9,-4,'#e85d9a']]){add(g,CYL(.01,.01,2.4,3),'#ffffff',{p:[x,1.2,z],ink:false});add(g,SPH(.32,1),c,{p:[x,2.6,z],s:[1,1.15,1]})}
    tree(g,-14,-5,1.2,'#3f8a3a',21);tree(g,14,-6,1.1,'#4f9a45',22)}
  // TANGRAM LAB — workshop: tangram poster, workbench (the pieces wait there)
  {setO('lab');const g=grp(S,[O[0],0,O[1]]);add(g,BOX(16,.1,9),'#ffffff',{p:[0,.05,-.6],map:stripeTex('#d9b98a','#cfa978',12),ink:false,cast:false});
    add(g,BOX(16,4.6,.3),'#d8efc8',{p:[0,2.3,-5]});for(const sx of[-8,8])add(g,BOX(.3,4.6,9),'#d8efc8',{p:[sx,2.3,-.6]});
    const pt=textTex(700,420,'#fffaf0',(c,w,h)=>{const T=[[[40,40],[240,40],[140,140]],[[40,40],[140,140],[40,240]],[[240,40],[240,140],[190,90]],[[140,140],[190,90],[240,140],[190,190]],[[40,240],[140,140],[90,240]]];
        const CC=['#e2382c','#1d9ae0','#f6c445','#4fa84f','#7b5bd6'];T.forEach((p,i)=>blob(c,p,CC[i],{seed:3500+i,w:2}));blob(c,[[140,140],[240,140],[240,240],[90,240]],'#f28c28',{seed:3506,w:2});
        inkText(c,'Shapes',480,70,56,{col:'#1d6fa5'});[['triangle','#e2382c'],['square','#4fa84f'],['circle','#f6c445'],['rectangle','#1d9ae0'],['parallelogram','#7b5bd6']].forEach(([s,cc],i)=>inkText(c,s,480,140+i*58,38,{col:cc}))});
    add(g,PLANE(5.6,3.36),bm('#ffffff',{map:pt}),{p:[-2.2,2.6,-4.83],ink:false,cast:false});add(g,PLANE(4,.8),bm('#ffffff',{map:signTex(500,100,'#4fa84f','TANGRAM LAB',64,'#fffaf0')}),{p:[4.4,3.8,-4.83],ink:false,cast:false});
    add(g,BOX(3.2,.12,1.6),'#a5713f',{p:[4.5,1.0,-2.6]});for(const[x,z]of[[3.1,-3.2],[5.9,-3.2],[3.1,-2],[5.9,-2]])add(g,BOX(.12,1,.12),'#6b4526',{p:[x,.5,z]});
    for(let i=0;i<5;i++)add(g,BOX(.08,.5,.08),['#9aa3ad','#e2382c','#6b4526','#f6c445','#1d9ae0'][i],{p:[3.4+i*.4,3.0,-4.75]});add(g,BOX(2.6,.08,.3),'#6b4526',{p:[4.2,2.75,-4.75]})}
  // KEN'S PAINT SHED
  {setO('paint');const g=grp(S,[O[0],0,O[1]]);add(g,BOX(16,.1,9),'#ffffff',{p:[0,.05,-.6],map:stripeTex('#c9a27a','#bb9268',10),ink:false,cast:false});
    add(g,BOX(16,4.2,.3),'#e8c79a',{p:[0,2.1,-4.6]});for(const sx of[-8,8])add(g,BOX(.3,4.2,8.4),'#e8c79a',{p:[sx,2.1,-.4]});
    add(g,PLANE(6.4,1),bm('#ffffff',{map:signTex(640,100,'#8a5a2b',"KEN'S PAINT SHED",62,'#fff1c2')}),{p:[0,3.75,-4.43],ink:false,cast:false});
    const PC=['#e2382c','#f28c28','#f6c445','#4fa84f','#1d9ae0','#7b5bd6','#e85d9a','#ffffff'];for(const y of[1.2,2.3])add(g,BOX(9,.1,.6),'#a5713f',{p:[-2.5,y,-4.2]});
    for(let r=0;r<2;r++)for(let i=0;i<9;i++)pot3(g,-6.4+i*.95,r?2.35:1.25,-4.2,PC[(i+r*3)%8],.8);
    add(g,BOX(3.4,.12,1.5),'#a5713f',{p:[2.9,1.0,-2.2]});for(const[x,z]of[[1.4,-2.8],[4.4,-2.8],[1.4,-1.6],[4.4,-1.6]])add(g,BOX(.12,1,.12),'#6b4526',{p:[x,.5,z]});
    pot3(g,2.3,1.06,-2.2,'#e2382c',1.9);add(g,CYL(.26,.26,.6,12),'#cfeeff',{p:[3.7,1.36,-2.2],op:.35});
    for(let i=0;i<10;i++){const a=i/10*6.28,r=.12;add(g,CYL(.03,.03,.75,6),'#e2382c',{p:[3.7+Math.cos(a)*r,1.45,-2.2+Math.sin(a)*r],r:[Math.sin(a)*.12,0,Math.cos(a)*.12],inkW:.015})}
    add(g,BOX(1.2,.8,1),'#c9a27a',{p:[5.2,.4,-2.4]});
    R.lock=dyn(grp(g,[2.3,1.3,-1.6]));add(R.lock,BOX(.36,.32,.14),'#f6c445',{});add(R.lock,TOR(.13,.04,6,14,Math.PI),'#9aa3ad',{p:[0,.16,0]});R.hen=hen3(g)}
  // RACE TRACK (oval) + start/finish gantry + grandstand with crowd; forest round the far bend
  {const asp='#8a8f99';for(const z of[-4,-30])add(S,PLANE(32,4),asp,{p:[40,.03,z],r:[-Math.PI/2,0,0],ink:false,cast:false});
    for(const[cx,a0]of[[24,Math.PI/2],[56,-Math.PI/2]])add(S,new THREE.RingGeometry(11,15,40,1,a0,Math.PI),asp,{p:[cx,.031,-17],r:[-Math.PI/2,0,0],ink:false,cast:false});
    for(const z of[-4,-30])for(const sd of[-1,1])for(let i=0;i<16;i++)add(S,BOX(2,.12,.35),i%2?'#ffffff':'#e2382c',{p:[25+i*2,.06,z+sd*2.15],ink:false});
    for(const[cx,sd]of[[24,-1],[56,1]])for(const rr of[10.8,15.2])add(S,TOR(rr,.1,4,40,Math.PI),'#ffffff',{p:[cx,.07,-17],r:[Math.PI/2,0,sd>0?Math.PI/2:-Math.PI/2],ink:false,cast:false});
    flatPlane(S,32,22,'#9cc873',[40,.025,-17]);
    setO('race');const g=grp(S,[O[0],0,O[1]]);flatPlane(g,4.1,.9,'#ffffff',[0,.04,0],{map:checkerTex('#2a2a2e','#ffffff',8)});
    for(const sx of[-1,1])add(g,BOX(.3,4.2,.3),'#3e4a5c',{p:[0,2.1,sx*2.6]});add(g,BOX(.4,1,5.6),'#e2382c',{p:[0,4.4,0]});
    const bn=signTex(700,120,'#e2382c','GO-KART RACE',80,'#fffaf0');for(const sd of[-1,1]){const m=new THREE.Mesh(PLANE(5.4,.9),bm('#ffffff',{map:bn}));m.position.set(sd*.21,4.4,0);m.rotation.y=sd*Math.PI/2;g.add(m)}
    for(let r=0;r<4;r++)add(g,BOX(16,.5,1.2),r%2?'#cfe3f7':'#1d6fa5',{p:[0,.25+r*.5,-6.5-r*1.1]});add(g,BOX(16.4,.3,4.6),'#e2382c',{p:[0,4.0,-7.8]});
    for(const sx of[-8,8])add(g,BOX(.25,4,.25),'#3e4a5c',{p:[sx,2,-6]});
    const N=44,cm=new THREE.InstancedMesh(SPH(.3,1),toonM('#ffffff'),N);const CC=['#e2382c','#f6c445','#1d9ae0','#4fa84f','#e85d9a','#7b5bd6','#f28c28','#ffffff'];
    for(let i=0;i<N;i++)cm.setColorAt(i,_ca.set(CC[i%8]));cm.instanceColor.needsUpdate=true;S.add(cm);keep(cm);R.crowd=cm;
    for(const x of[-10,-6.5])fence(g,x-1.5,3.1,x+1.5,3.1,'#ffffff');
    R.flag=dyn(grp(S,[0,0,0]));add(R.flag,CYL(.04,.04,1.6,6),'#3e4a5c',{p:[0,.8,0]});R.flagM=add(R.flag,PLANE(.7,.5),bm('#ffffff',{map:checkerTex('#2a2a2e','#ffffff',4),side:THREE.DoubleSide}),{p:[.36,1.35,0],ink:false});
    setO('bend');const b=grp(S,[O[0],0,O[1]]);
    for(let i=0,n=0;i<160&&n<56;i++){const x=hash2(i,1,520)*60-30,z=-4-hash2(i,2,520)*16;if(z>-5.5&&Math.abs(x)<9)continue;n++;(i%3?pine:tree)(b,x,z,.9+hash2(i,3,520)*.7,['#2f5a4a','#28503f','#335f45'][i%3],i)}
    for(const x of[-7.5,9])for(let k=0;k<3;k++)add(b,TOR(.32,.14,6,12),'#2a2a2e',{p:[x,.14+k*.26,-2.9],r:[Math.PI/2,0,0],inkW:.02});
    flatPlane(b,3.4,1.8,'#e9d9b4',[3,.04,-3.6]);R.banana=dyn(grp(S,[0,0,0]));add(R.banana,TOR(.17,.06,6,12,Math.PI*.85),'#f6d23f',{r:[0,0,.3],inkW:.025});
    add(g,CYL(1,1,.05,24),'#7a5532',{p:[3.8,.05,3],s:[1.8,1,.9],ink:false,cast:false,flat:true});for(let i=0;i<6;i++)add(g,SPH(.25,0),'#5e3f24',{p:[2.6+i*.5,.06,2.7+Math.sin(i*2.1)*.4],s:[1,.2,.6],ink:false,cast:false})}
  // PODIUM
  {setO('pod');const g=grp(S,[O[0],0,O[1]]);add(g,CYL(8,8,.06,32),'#e7dcc6',{p:[0,.03,-1],ink:false,cast:false});
    add(g,BOX(1.6,1.2,1.4),'#f6c445',{p:[0,.6,-1]});add(g,BOX(1.6,.75,1.4),'#cfd6dd',{p:[-1.6,.375,-1]});
    add(g,PLANE(.9,.9),bm('#ffffff',{map:signTex(128,128,null,'1',100,'#b35a00'),transparent:true}),{p:[0,.62,-.29],ink:false,cast:false});add(g,PLANE(.7,.7),bm('#ffffff',{map:signTex(128,128,null,'2',100,'#5a6470'),transparent:true}),{p:[-1.6,.4,-.29],ink:false,cast:false});
    for(const sx of[-3.6,3.6])add(g,CYL(.1,.1,4.4,8),'#e9e3d8',{p:[sx,2.2,-3]});add(g,PLANE(7,1.1),bm('#ffffff',{map:signTex(700,110,'#e2382c','WINNER!',84,'#fffaf0')}),{p:[0,3.9,-3],ink:false,cast:false});
    flowers(g,-5,1,9,31);flowers(g,5,1,9,32);bush(g,-6.5,-2,1);bush(g,6.5,-2,1);
    R.cup=dyn(grp(S,[0,0,0]));add(R.cup,CYL(.22,.12,.34,12),'#f6c445',{p:[0,.36,0]});add(R.cup,CYL(.06,.06,.16,8),'#f6c445',{p:[0,.12,0]});add(R.cup,BOX(.3,.06,.3),'#b35a00',{p:[0,.03,0]});
    for(const sx of[-1,1])add(R.cup,TOR(.09,.025,5,10),'#f6c445',{p:[sx*.25,.4,0],r:[0,0,Math.PI/2]})}
  // the rest of Pet Town: trees + clouds off the places and the track
  for(let i=0,n=0;i<700&&n<95;i++){const x=hash2(i,1,600)*170-85,z=hash2(i,2,600)*170-80;if(Math.hypot(x,z)<16)continue;if(x>-2&&x<78&&z>-44&&z<10)continue;
    if(Object.values(LOC).some(([lx,lz])=>Math.hypot(x-lx,z-lz)<14))continue;n++;tree(S,x,z,.9+hash2(i,3,600)*.6,['#3f8a3a','#4f9a45','#5e9a45'][i%3],i)}
  for(let i=0;i<16;i++)cloud(S,hash2(i,1,700)*170-80,16+hash2(i,2,700)*10,hash2(i,3,700)*170-90,1.2+hash2(i,4,700)*1.2)}

// story state other scenes can see: crowd bounce (cheers harder during the race)
function poseDefaults3(t){if(!R3.crowd)return;const C=R3.crowd,hot=t>shot('race').start&&t<shot('podium').end?1:.25;const[ox,oz]=LOC.race;
  for(let i=0;i<44;i++){const r=i%4,x=-7.2+((i/4)|0)*1.42+(r%2)*.5,y=.85+r*.5+Math.abs(Math.sin(t*(5+i%3)+i))*.22*hot,z=-6.5-r*1.1;_v.set(ox+x,y,oz+z);_s.setScalar(1);_q.identity();_m4.compose(_v,_q,_s);C.setMatrixAt(i,_m4)}
  C.instanceMatrix.needsUpdate=true}

/* ---------- the oval: distance d (m) from the start line, heading -x first; lane = offset outward (m) */
const OV_L=32*2+Math.PI*13*2;
function ovalAt(d,lane=0){d=((d%OV_L)+OV_L)%OV_L;const sR=Math.PI*13;let x,z,dx,dz;
  if(d<16){x=40-d;z=-4;dx=-1;dz=0}
  else if(d<16+sR){const a=(d-16)/13;x=24-13*Math.sin(a);z=-17+13*Math.cos(a);dx=-Math.cos(a);dz=-Math.sin(a)}
  else if(d<48+sR){x=24+(d-16-sR);z=-30;dx=1;dz=0}
  else if(d<48+2*sR){const a=(d-48-sR)/13;x=56+13*Math.sin(a);z=-17-13*Math.cos(a);dx=Math.cos(a);dz=Math.sin(a)}
  else{x=56-(d-48-2*sR);z=-4;dx=-1;dz=0}
  const nx=-dz,nz=dx,cx=x<40?24:56;const out=((x-cx)*nx+(z+17)*nz)>=0?1:-1;   // normal pointing out of the oval
  return{x:x+nx*out*lane,z:z+nz*out*lane,dx,dz,ang:Math.atan2(-dz,dx),nx:nx*out,nz:nz*out}}

/* =====================================================================
   SCENES (3D)
   ===================================================================== */

/* 1. Title — crane down from the sky into Pet Town at sunrise; the pets bounce in round the race poster */
CAMS.title=(lt,S)=>{const k=ease(clamp(lt/(S.end-S.start)));return W3('sq',{p:[lerp(-12,0,k),lerp(32,3.4,k),lerp(44,13,k)],l:[0,lerp(0,2.4,k),lerp(-10,-2,k)],f:42})};
SC.title=(g,t,S)=>{const lt=t-S.start;begin3();setO('sq');poseKart(R3.DK,-6.4,.6,0,0);
  for(const[n,x,f,d]of[['dragon',-4.6,1,.8],['rabbit',-2.5,1,1.0],['owl',-.5,0,1.2],['panda',1.6,0,1.4],['fox',3.6,0,1.6],['robot',5.6,0,1.8]]){const k=spring(clamp((lt-d)*1.2));
    actor(n,x,1.3,{face:f,hop:Math.max(0,(1-k)*4)+hop3(lt,d+1.2,.28),alpha:seg(lt,d-.1,d)})}
  end3(g,S,t);
  card(g,640,120,820,150,seg(lt,.2,.8),{seed:2400,fill:'#fffaf0',wash:'#f6d27a',draw:g=>{inkText(g,'The Great Go-Kart Race',0,10,76,{reveal:seg(lt,.3,1.6),col:'#b35a00'});inkText(g,"Pet Adventures · Let's play!",0,56,30,{alpha:seg(lt,1.3,2),col:'#5a3d28'})}});
  if(lt<.6){g.fillStyle=`rgba(243,234,214,${1-lt/.6})`;g.fillRect(0,0,W,H)}};

/* 2. Square — Dragon's go-kart, Rabbit has none; Robot leads them off to the toy shop */
CAMS.square=(lt,S)=>{const C=S.cues,s=S.start;
  return W3('sq',krig(lt,[[0,{p:[0,3.4,13],l:[0,2.4,-2]}],[C.r01-s-.2,{p:[-4.4,2.3,8.2],l:[-5,1.3,0]},1.2],[C.a01-s-.1,{p:[-2,1.9,7.2],l:[-2.2,1.1,.6]},1.1],
    [C.o01-s,{p:[.4,2.8,10.5],l:[0,1.6,0]},1.2],[C.b01-s,{p:[2.6,2.5,8.8],l:[3,1.6,0]},1.1]]))};
SC.square=(g,t,S)=>{const lt=t-S.start,C=S.cues,go=at(S,'b01','To the');begin3();setO('sq');
  poseKart(R3.DK,-6.4,.6,0,0);const w=ease(seg(t,go,go+2.4)),wk=t>go;
  const P=[['dragon',-4.6,'R',1.4],['rabbit',-2.3,'A',1.6],['owl',.2,'O',1.3],['panda',1.9,'P',1.7],['robot',3.6,'B',1.4],['fox',5.4,'F',1.6]];
  P.forEach(([n,x,k,z],i)=>{const sad=n==='rabbit'&&t>C.a01-.2&&t<C.o01+.6;actor(n,x-w*(9+i),z-w*3,{face:wk?0:x<0?1:0,hop:hop3(t,C[{R:'r01',A:'a01',O:'o01',P:'d02',B:'b01',F:'d02'}[k]],.28)+wb3(t,wk&&w<1,i),tilt:sad?.1+Math.sin(t*2)*.03:0,
    alpha:1-seg(w,.8,1)})});
  end3(g,S,t);
  if(t>C.a01&&t<C.o01+.5){const h=headOf('rabbit',-2.3,1.6,0,-.45);for(let i=0;i<2;i++){const k=((t*1.3)+i*.5)%1;g.fillStyle=`rgba(150,210,255,${1-k})`;g.beginPath();g.arc(h.x+(i?12:-12),h.y+k*36,4,0,7);g.fill()}}
  chip(g,'Pet Town Square',seg(lt,.1,.7));
  sayCard(g,'My favourite toy is my go-kart.',cardK(t,C.r01,C.a01),112,'#2e7d4f','#cde8b5');
  sayCard(g,"Let's make one together!",cardK(t,C.o01,C.b01+.4),112,'#b35a00','#f7d7a6')};

/* 3. Toy shop — the camera tracks past the shelves as the toys are named; challenge 1 (go-kart) + 2 (kite) */
const SHOP_TOY={kite:[-6.2,3.0,-4.75],doll:[-4.6,2.85,-4.5],train:[-3.2,1.55,-4.5],plane:[-2.0,3.6,-4.5],ball:[7.1,.7,.4],bike:[1.6,1.0,-2.2],car:[6.8,.9,-2.2],'computer game':[5.4,2.7,-4.45],monster:[.4,4.0,-4.4],'go-kart':[4.3,1.1,-2.2]};
CAMS.shop=(lt,S,t)=>{const C=S.cues,s=S.start,mo=at(S,'r02','monster');
  const c=krig(lt,[[0,{p:[-2,3.2,11.5],l:[-1,2,-3]}],[C.p01-s,{p:[-4.2,2.7,7.6],l:[-4.2,2.4,-4.5]},1.4],[C.f01-s,{p:[4.2,2.5,7.6],l:[4.4,1.5,-3]},1.6],
    [mo-s-.3,{p:[.4,3.3,4.8],l:[.4,3.7,-4.5],f:44},.6],[C.b02-s,{p:[3.4,2.7,8.6],l:[3.8,1.1,-2.2]},1.2],[C.a02-s,{p:[0,3.1,11],l:[0,1.7,-1.5]},1.1],
    [C.b03-s,{p:[-5.4,3,6],l:[-6.2,3,-4.7],f:40},1.2],[C.p02-s+.4,{p:[-1.5,3,10.5],l:[-1.5,1.9,-1.5]},1.2]]);
  return W3('shop',c)};
SC.shop=(g,t,S)=>{const lt=t-S.start,C=S.cues,g1=gateT('q1'),g2=gateT('q2');begin3();setO('shop');
  const wk=ease(seg(lt,flyK(S)-.6,flyK(S)+1.2));
  actor('panda',lerp(-11,-6.4,wk),1.2,{face:1,hop:wb3(t,wk<1,1)+hop3(t,C.p01,.28)});actor('dragon',lerp(-12,-4.8,wk),1.9,{face:1,hop:wb3(t,wk<1,2)+hop3(t,at(S,'r02','Rarr'),.4)});
  actor('rabbit',lerp(-10.5,-2.7,wk),1.6,{face:1,hop:wb3(t,wk<1,3)+hop3(t,C.a02,.4)+hop3(t,C.a02+.45,.3)});actor('fox',lerp(-13,-1.0,wk),2.3,{face:1,hop:wb3(t,wk<1,4)+hop3(t,C.f01,.28)});
  actor('robot',lerp(-12,.6,wk),1.0,{face:1,hop:wb3(t,wk<1,5)+hop3(t,C.b02,.25)+hop3(t,C.b03,.25)});
  end3(g,S,t);
  const OFF={kite:[-60,10],doll:[30,-10]};const word=(id,w)=>{const a=at(S,id,w),P3=SHOP_TOY[w],p=scr(P3[0],P3[1]+.55,P3[2]),o=OFF[w]||[0,0];tag(g,w,p.x+o[0],p.y-26+o[1],seg(t,a,a+.3)*(1-seg(t,C.b02-.3,C.b02)))};
  ['kite','doll','train','plane'].forEach(w=>word('p01',w));['ball','bike','car','computer game'].forEach(w=>word('f01',w));word('r02','monster');
  if(t>C.b02-.1&&t<C.a02+1.5){const a=C.b02;for(const w of['go-kart','bike','car']){const P3=SHOP_TOY[w],p=scr(P3[0],P3[1]+.5,P3[2]),win=t>g1&&w==='go-kart';
    if(win)sparkles(g,p.x,p.y,t-g1,2700,12,120);else if(t<g1)tag(g,'?',p.x,p.y-40,seg(t,a,a+.3),'#e2382c','#ffd5cf')}
    if(t>g1){const P3=SHOP_TOY['go-kart'],p=scr(P3[0],P3[1]+.6,P3[2]);tag(g,'go-kart',p.x,p.y-40,seg(t,g1,g1+.3)*(1-seg(t,C.a02+1.1,C.a02+1.5)),'#1b6e2c','#cde8b5')}}
  if(t>C.b03-.2&&t<C.p02+2){const P3=SHOP_TOY.kite,p=scr(P3[0],P3[1],P3[2]+.1);glow(g,p.x,p.y,150,'rgba(255,230,120,A)',.5+.2*Math.sin(t*5));
    if(t>g2)tag(g,'kite',p.x+120,p.y-60,seg(t,g2,g2+.3),'#b35a00','#f7d7a6')}
  chip(g,'The Toy Shop',chipK3(S,lt));kartHUD(g,t,chipK3(S,lt));
  if(t>C.b02-.1&&t<g1)card(g,640,190,600,76,seg(t,C.b02,C.b02+.3),{seed:2780,fill:'#fffaf0',wash:'#f6d27a',draw:g=>inkText(g,'Which toy is a go-kart?',0,12,38,{col:'#b35a00'})})};

/* 4. Toy fair — Owl's "Who is it?" photo game: his/her, he/she; challenges 3 + 4 */
const PHOTO_X=[-1.7,0,1.7];
CAMS.fair=(lt,S)=>{const C=S.cues,s=S.start,ph=i=>({p:[PHOTO_X[i]*.9,2.75,4.4],l:[PHOTO_X[i],2.6,-2.3],f:40});
  return W3('fair',krig(lt,[[0,{p:[0,3.4,13.5],l:[0,2.2,-2]}],[C.o02-s,ph(0),1.3],[C.f02-s+.2,{p:[-1.6,2.6,9],l:[-1.2,1.9,-1]},1.1],[C.o04-s,ph(0),1],
    [C.o05-s,ph(1),1.2],[C.p04-s,{p:[1.5,2.4,8.4],l:[1.8,1.8,0]},1],[C.o06-s,ph(2),1.2],[C.f03-s,{p:[-1.2,2.6,9.5],l:[-1.6,1.8,0]},1.1]]))};
SC.fair=(g,t,S)=>{const lt=t-S.start,C=S.cues,g3=gateT('q3'),g4=gateT('q4');begin3();setO('fair');
  const act=t<C.o05?0:t<C.o06?1:2,on=t>C.o02-.2;
  PHOTO_X.forEach((x,i)=>{const hi=on&&i===act;card3(R3.photos[i],{x,y:2.65+(hi?Math.sin(t*3)*.03:0),z:hi?-2.2:-2.3,s:1.35,aspect:370/300,glow:hi?.45:0})});
  const wk=ease(seg(lt,flyK(S)-.6,flyK(S)+1));
  actor('owl',3.6,-.6,{talk:undefined,hop:hop3(t,C.o02,.25)+hop3(t,C.o05,.25)+hop3(t,C.o06,.25)});
  actor('dragon',lerp(-12,-5.4,wk),.6,{face:1,hop:wb3(t,wk<1,1)+hop3(t,C.r03,.45)});actor('fox',lerp(-13,-3.8,wk),1.0,{face:1,hop:wb3(t,wk<1,2)+hop3(t,C.f02,.3)+hop3(t,C.f03,.45)});
  actor('panda',lerp(-11,5.4,wk),.7,{face:0,hop:wb3(t,wk<1,3)+hop3(t,C.p04,.4)});actor('rabbit',lerp(-12,6.9,wk),1.1,{face:0,hop:wb3(t,wk<1,4)});
  actor('robot',lerp(-14,-7.0,wk),1.2,{face:1,hop:wb3(t,wk<1,5)});
  end3(g,S,t);
  if(on){const x=PHOTO_X[act],a=scr(x-.72,3.5,-2.15),b=scr(x+.72,1.8,-2.15),k=.6+.4*Math.sin(t*5);g.save();g.globalAlpha=k;g.setLineDash([12,8]);g.strokeStyle='#e2382c';g.lineWidth=6;
    g.strokeRect(a.x,a.y,b.x-a.x,b.y-a.y);g.restore()}
  chip(g,'The Toy Fair',chipK3(S,lt));kartHUD(g,t,chipK3(S,lt));
  qaCard(g,"What's his name?","His name's Dragon.",cardK(t,C.o02,C.o03),seg(t,C.r03,C.r03+.3));
  qaCard(g,'How old is he?',"He's seven.",cardK(t,C.o03,C.o04),seg(t,C.f02,C.f02+.3));
  qaCard(g,"What's his favourite toy?","His favourite toy's his go-kart.",cardK(t,C.o04,C.o05),seg(t,C.p03,C.p03+.3));
  qaCard(g,"What's her favourite toy?","Her favourite toy's her doll.",cardK(t,at(S,'o05','What'),C.o06),seg(t,g3,g3+.3));
  qaCard(g,"___ name's Fox. He's eight.","His name's Fox. He's eight.",cardK(t,C.o06,S.end),seg(t,g4,g4+.3))};

/* 5. Tangram Lab — Robot builds the go-kart body from shapes; the missing triangle (challenge 5) */
const LABK=[-.6,0];
CAMS.lab=(lt,S)=>{const C=S.cues,s=S.start;
  return W3('lab',krig(lt,[[0,{p:[0,3.3,11.5],l:[0,1.6,-1.5]}],[C.b04-s,{p:[1.2,2.6,7.2],l:[1.4,1,-1]},1.4],[C.a03-s,{p:[-.6,1.7,5.6],l:[-.6,.6,0],f:40},1.1],
    [C.b05-s,{p:[.9,1.6,4.6],l:[.5,.55,0],f:40},1.1],[C.b06-s+.3,{p:[0,2.4,7.6],l:[-.3,1,0]},1.1],[C.f04-s,{p:[-1.6,2.8,10],l:[-1.4,1.4,0]},1.1]]))};
SC.lab=(g,t,S)=>{const lt=t-S.start,C=S.cues,g5=gateT('q5'),click=at(S,'b06','Click');begin3();setO('lab');
  rkPose(t);poseKart(R3.RK,LABK[0],LABK[1],0,0);
  const wk=ease(seg(lt,flyK(S)-.6,flyK(S)+1));
  actor('robot',lerp(9,3.0,wk),-.7,{face:0,hop:wb3(t,wk<1,1)+hop3(t,C.b04,.25)+hop3(t,click,.4)});
  actor('rabbit',lerp(-11,-3.6,wk),1.4,{face:1,hop:wb3(t,wk<1,2)+hop3(t,C.a03,.35)+hop3(t,C.a04,.45)+hop3(t,C.a04+.45,.35)});
  actor('fox',lerp(-12,-5.2,wk),2.0,{face:1,hop:wb3(t,wk<1,3)});actor('dragon',lerp(-13,-6.8,wk),1.2,{face:1,hop:wb3(t,wk<1,4)+hop3(t,T_BUILT(),.4)});
  end3(g,S,t);
  const K=R3.RK.P,LOFF={sq:[-150,-40],tri:[40,-120],rect:[150,60],par:[-60,-150]},lab=(k,w,col)=>{const a=at(S,'b04',w),m=K[k],p=scr(LABK[0]+m.userData.base.x,m.userData.base.y,LABK[1]+.5),o=LOFF[k];
    tag(g,w,p.x+o[0],p.y+o[1],seg(t,a,a+.3)*(1-seg(t,a+1.6,a+1.9)),col)};
  lab('sq','square','#2e7d4f');lab('tri','triangle','#5a3d9a');lab('rect','rectangle','#1d6fa5');lab('par','parallelogram','#9a6a00');
  if(t>C.a03-.1&&t<C.b05){const k=seg(t,at(S,'a03','circles'),at(S,'a03','circles')+.3);for(const[wx,wz]of[[.72,.6],[-.68,.6]]){const p=scr(LABK[0]+wx,.3,LABK[1]+wz),q=scr(LABK[0]+wx,.6,LABK[1]+wz),r=Math.abs(q.y-p.y)+6;
    g.save();g.globalAlpha=k;g.setLineDash([8,6]);g.strokeStyle='#e2382c';g.lineWidth=4;g.beginPath();g.arc(p.x,p.y,r,0,7);g.stroke();g.restore()}
    const p=scr(LABK[0],.3,LABK[1]+.6);tag(g,'circles',p.x,p.y+70,k,'#b35a00')}
  if(t>C.b05-.1&&t<click){const pts=KART_PTS.nose[0].map(([x,y])=>scr(LABK[0]+x,y,LABK[1]+.5)),k=seg(t,C.b05,C.b05+.4);
    g.save();g.globalAlpha=k*(.7+.3*Math.sin(t*6));g.setLineDash([10,7]);g.strokeStyle='#e2382c';g.lineWidth=5;g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));g.closePath();g.stroke();g.restore();
    const c=scr(LABK[0]+.9,.9,LABK[1]+.5);tag(g,'?',c.x,c.y-30,k,'#e2382c','#ffd5cf')}
  if(t>click&&t<click+1.2){const c=scr(LABK[0]+.85,.4,LABK[1]+.5);sparkles(g,c.x,c.y,t-click,2900,12,110)}
  chip(g,'The Tangram Lab',chipK3(S,lt));kartHUD(g,t,chipK3(S,lt));
  if(t>C.b05-.1&&t<g5)card(g,640,190,640,76,seg(t,C.b05,C.b05+.3),{seed:2950,fill:'#fffaf0',wash:'#f6d27a',draw:g=>inkText(g,'Which shape is missing?',0,12,38,{col:'#b35a00'})});
  sayCard(g,"It's a small old go-kart.",cardK(t,C.f04,C.a04),112,'#8a6440','#f7d7a6');sayCard(g,"It's MY go-kart!",cardK(t,C.a04,S.end),112,'#c0567a','#f6d6e6')};

/* 6. Ken's Paint Shed — Ken the hen, ten red pens; the e-words unlock the red paint (challenge 6) */
const PAK=[-1.2,.3];
CAMS.paint=(lt,S,t)=>{const C=S.cues,s=S.start,sp=T_PAINT();
  const c=krig(lt,[[0,{p:[0,3.3,11.5],l:[0,1.8,-2]}],[C.p05-s,{p:[2.0,2.6,4.6],l:[4.2,1.3,-2.2]},1.3],[C.o07-s,{p:[0,3,10],l:[0,2,-1.5]},1.1],
    [C.d07-s,{p:[2.4,2.1,4.2],l:[2.3,1.3,-2]},1.1],[sp-s-.5,{p:[-.6,2.6,8],l:[-1,.9,0]},.6]]);
  return W3('paint',shk3(c,t,sp,.14))};
SC.paint=(g,t,S)=>{const lt=t-S.start,C=S.cues,g6=gateT('q6'),sp=T_PAINT();begin3();setO('paint');
  rkPose(t);poseKart(R3.RK,PAK[0],PAK[1],0,0);
  const L=R3.lock,lk=seg(t,g6+.15,g6+.9);L.visible=lk<1;L.position.set(2.3,1.3+lk*1.6,-1.6+lk*.8);L.rotation.set(lk*3,0,lk*2);
  const H=R3.hen;H.visible=true;H.position.set(5.2,.8+hop3(t,at(S,'p05','hen'),.35)+hop3(t,at(S,'o07','hen'),.3),-2.4);H.rotation.y=-.5;H.userData.head.rotation.z=Math.max(0,Math.sin(t*3))*-.5;
  // the red paint flies out of the pot onto the kart
  if(t>sp-.5&&t<sp+1.2){const u=seg(t,sp-.5,sp),R=R3.bits.paint;for(let i=0;i<26;i++){const k=clamp(u*1.2-hash2(i,1,3600)*.2),x=lerp(2.3,PAK[0]+hash2(i,2,3600)*2-.9,k),y=1.6+Math.sin(k*Math.PI)*1.4-(t>sp?(t-sp)*2:0),z=lerp(-2.2,PAK[1]+hash2(i,3,3600)*.8-.4,k);if(y>0&&t<sp+.6)bit('paint',x,y,z,.11)}}
  burst('paint',t,sp,PAK[0],.8,PAK[1],30,3610,{v:2.2,up:3,s:.1,dur:.9});
  const wk=ease(seg(lt,flyK(S)-.6,flyK(S)+1));
  actor('owl',lerp(-12,-6.4,wk),1.4,{face:1,hop:wb3(t,wk<1,1)+hop3(t,C.o07,.25)});actor('panda',lerp(-11,-4.8,wk),2.0,{face:1,hop:wb3(t,wk<1,2)+hop3(t,C.p05,.3)});
  actor('rabbit',lerp(-10,-3.2,wk),1.2,{face:1,hop:wb3(t,wk<1,3)+hop3(t,sp+.4,.45)+hop3(t,sp+.9,.35)});actor('dragon',lerp(12,6.0,wk),1.8,{face:0,hop:wb3(t,wk<1,4)+hop3(t,C.r04,.4)});
  end3(g,S,t);
  if(t>C.p05&&t<C.d07){const j=scr(3.7,1.9,-2.2);glow(g,j.x,j.y,100,'rgba(255,120,110,A)',.35*seg(t,at(S,'p05','ten'),at(S,'p05','ten')+.3))}
  if(t>C.o07-.1){const ws=['Red','ten','pen','hen'];ws.forEach((w,i)=>{const a=at(S,'o07',w),k=seg(t,a,a+.3)*(1-seg(t,C.d07+.4,C.d07+.8));if(k<=0)return;card(g,310+i*220,200,180,76,k,{seed:3620+i,fill:'#fffaf0',wash:'#ffd5cf',draw:g=>eWord(g,w,0,14,44)})})}
  if(t>lk&&t<g6+1.6&&t>g6){const p=scr(2.3,1.6,-1.6);sparkles(g,p.x,p.y,t-g6,3630,12,120)}
  chip(g,"Ken's Paint Shed",chipK3(S,lt));kartHUD(g,t,chipK3(S,lt));
  if(t>C.d07-.1&&t<g6)card(g,640,112,700,80,seg(t,C.d07,C.d07+.3),{seed:3640,fill:'#fffaf0',wash:'#ffd5cf',draw:g=>{inkText(g,'e',-200,14,48,{col:'#e2382c'});inkText(g,'as in',-110,14,36,{col:'#5a3d28'});eWord(g,'red',10,14,46);inkText(g,'· ten · pen',160,14,36,{col:'#5a3d28'})}});
  sayCard(g,'A red go-kart for Rabbit!',cardK(t,C.r04,S.end),112,'#c92a20','#ffd5cf')};

/* 7. Race day — the start line; Monkey rolls in on a big new kart; a / an (challenge 7); 1, 2, 3 — Go! */
CAMS.race=(lt,S,t)=>{const C=S.cues,s=S.start,go=T_GO(),arr=at(S,'d08','Then a new');
  let c=krig(lt,[[0,{p:[-1,3.4,13],l:[0,1.5,-1.5]}],[arr-s,{p:[4.2,2.2,8],l:[3.4,1,-.5]},1.4],[C.m01-s,{p:[3.9,1.8,5.0],l:[3.3,1.1,-1]},1],[C.a05-s,{p:[.6,1.4,4.6],l:[.6,.9,1]},1],
    [C.o08-s,{p:[0,2.8,10.5],l:[0,1.3,-.5]},1.1],[C.b07-s,{p:[-6,1.3,6],l:[1.4,.9,0]},1.4],[go-s+.4,{p:[-7.5,1.6,7.5],l:[-12,1,0]},1.6]]);
  return W3('race',c)};
function raceGrid(t,S){const go=T_GO(),arr=at(S,'d08','Then a new'),u=Math.max(0,t-go),run=a=>a*u*u*.5;
  const mk=ease(seg(t,arr,arr+2.4));return{rx:.6-run(5),mx:lerp(15,3.4,mk)-run(5.4),dx:6.2-run(4.2),u,mk}}
SC.race=(g,t,S)=>{const lt=t-S.start,C=S.cues,go=T_GO(),g7=gateT('q7');begin3();setO('race');
  rkPose(t);const G=raceGrid(t,S);
  drive(R3.RK,'rabbit',G.rx,1.0,Math.PI,G.rx*-1,{h:1.1,hop:hop3(t,C.a05,.12),still:G.u<=0});
  drive(R3.MK,'monkey',G.mx,-1.1,Math.PI,G.mx*-1,{h:1.45,hop:hop3(t,C.m01,.12)+hop3(t,C.m02,.12),still:G.mk>=1&&G.u<=0});
  drive(R3.DK,'dragon',G.dx,.4,Math.PI,G.dx*-1,{h:1.4,still:G.u<=0});
  actor('robot',-1.6,-3.3,{hop:hop3(t,at(S,'b07','One'),.2)+hop3(t,at(S,'b07','two'),.2)+hop3(t,at(S,'b07','three'),.2)+hop3(t,go,.45)});
  const F=R3.flag;F.visible=true;F.position.set(O[0]-.9,0,O[1]-3.2);F.rotation.set(0,0,t>go?Math.sin((t-go)*10)*.5:0);
  actor('owl',4.8,-3.4,{hop:hop3(t,go+.2,.3)});actor('panda',6.4,-3.5,{hop:hop3(t,go+.3,.35)});actor('fox',8,-3.4,{hop:hop3(t,go+.4,.35)});
  end3(g,S,t);
  if(t>C.m01&&t<C.m02+.2){const h=headOf('monkey',G.mx,-1.1,.4);bubble(g,clamp(h.x+40,260,1020),170,440,90,'What an ugly old go-kart!',seg(t,C.m01,C.m01+.3),h.x,h.y,30)}
  chip(g,'Race day!',chipK3(S,lt));
  sayCard(g,'My go-kart is big and new.',cardK(t,C.m02,C.a05),112,'#a0522d','#f7d7a6');
  sayCard(g,"My go-kart is small and old…",cardK(t,C.a05,C.o08),112,'#c0567a','#f6d6e6');
  if(t>C.o08-.1&&t<g7)card(g,640,112,680,86,seg(t,C.o08,C.o08+.3),{seed:3700,fill:'#fffaf0',wash:'#f6d27a',draw:g=>inkText(g,"It's ___ old go-kart.",0,13,42,{col:'#b35a00'})});
  if(t>g7){const k=cardK(t,g7,C.b07+.3);if(k>0)card(g,640,128,720,128,k,{seed:3710,fill:'#fffaf0',wash:'#cde8b5',draw:g=>{inkText(g,"It's an old go-kart.",0,-14,40,{col:'#c0567a'});inkText(g,"It's a new go-kart.",0,40,40,{col:'#a0522d',alpha:seg(t,at(S,'o09',"And"),at(S,'o09',"And")+.3)})}})}
  if(t>go-.1&&t<go+1)inkText(g,'GO!',640,330,160*back(seg(t,go,go+.35)),{col:'#e2382c',stroke:'#fffaf0',sw:14,alpha:1-seg(t,go+.6,go+1)})};

/* 8. The forest bend (twist) — Monkey's banana; Rabbit spins out; "That isn't fair!"; fair play (challenge 8) */
function bendState(t,S){const ts=bendSpin(),gg=bendGo(),C=S.cues;let rx,rz=0,ra=0,rd;
  if(t<ts){rx=-1.5+2.1*(t-ts);rd=rx}else{const u=t-ts,k=1-Math.exp(-u*1.6);rx=-1.5+3.1*k;rz=1.7*ease(clamp(u/1.6));ra=-Math.PI*6*(1-Math.exp(-u*1.25));rd=-1.5+3.1*k}
  if(t>gg){const u=t-gg;rx=1.6+u*u*2.6;rz=1.7*(1-ease(clamp(u/1.2)));ra=0;rd=rx}
  const mx=t<ts?rx-2.6:-4.1+3.6*(t-ts),dstop=-1.8;let dx=t<ts?rx-5.2:dstop-(dstop-(-6.7))*Math.exp(-(t-ts)*1.4),dz=.2;if(t>gg){const u=t-gg-.4;if(u>0)dx=dstop+u*u*2.4}
  return{rx,rz,ra,rd,mx,dx,dz,ts,gg}}
CAMS.bend=(lt,S,t)=>{const C=S.cues,s=S.start,B=bendState(t,S),track=tt=>{const b=bendState(tt,S);return{p:[b.rx-2.4,1.35,6.4],l:[b.rx+2.2,.9,0],f:44}};
  if(t<B.ts)return W3('bend',hh3(track(t),t,.08));
  const c=krig(lt,[[0,track(B.ts)],[B.ts-s+.2,{p:[.4,2.3,9.2],l:[.6,1,0]},1.2],[C.p06-s,{p:[3.6,2.1,5.4],l:[4,1.5,-3.4]},.8],[C.r05-s,{p:[-.6,1.8,6.2],l:[0,1,.8]},1],
    [C.o10-s,{p:[1.2,2.6,9.6],l:[1.6,1.2,-1]},1.1],[C.b08-s,{p:[2.2,1.6,5.6],l:[1.8,.8,1.2]},1],[B.gg-s+.2,{p:[0,1.8,8],l:[6,1,0]},1.2]]);
  return W3('bend',shk3(c,t,B.ts,.22,.9))};
SC.bend=(g,t,S)=>{const lt=t-S.start,C=S.cues,B=bendState(t,S),tb=bendBanana(),fixed=at(S,'b08','Fixed');begin3();setO('bend');rkPose(t);
  drive(R3.RK,'rabbit',B.rx,B.rz,B.ra,B.rd,{h:1.1,face:1,tilt:t>B.ts&&t<C.m04?Math.sin(t*14)*.15:0,hop:hop3(t,C.a06,.1),still:t>B.ts+2&&t<B.gg});
  drive(R3.MK,'monkey',B.mx,-.8,0,B.mx,{h:1.45,face:t>tb-.2&&t<C.m04+1.2?0:1,hop:hop3(t,tb,.15)+hop3(t,C.m04,.15)});
  drive(R3.DK,'dragon',B.dx,B.dz,0,B.dx,{h:1.4,face:1,hop:hop3(t,C.r05,.15),still:t>B.ts+2.5&&t<B.gg+.4});
  // the banana: thrown from Monkey's kart, lands ahead of Rabbit, then lies on the track
  if(t>tb){const u=seg(t,tb,B.ts),x0=B.mx,xl=-1.5,Bn=R3.banana;Bn.visible=t<B.gg;Bn.position.set(O[0]+lerp(bendState(tb,S).mx,xl,u),.1+Math.sin(u*Math.PI)*2.2,O[1]+lerp(-.8,.1,u));Bn.rotation.set(0,u*9,u*7)}
  const rwx=t<fixed?lerp(1.4,2.6,ease(seg(t,C.b08-.3,C.b08+.6))):2.6;
  actor('robot',t>C.b08-.3?rwx:1.4,t>C.b08-.3?lerp(-3.3,.5,ease(seg(t,C.b08-.3,C.b08+.6))):-3.3,{face:0,hop:hop3(t,fixed,.35)});
  actor('owl',3.6,-3.5,{hop:hop3(t,C.o11,.25)});actor('panda',5.0,-3.6,{hop:hop3(t,C.p06,.4)});actor('fox',6.4,-3.4,{hop:hop3(t,B.ts+.2,.3)});
  burst('spark',t,fixed,rwx-.4,.8,1.2,20,3800,{v:1.6,up:2.4,s:.06,dur:.8});burst('leaf',t,B.ts,B.rx,.3,B.rz,18,3810,{v:2,up:2,s:.12,dur:1});
  end3(g,S,t);
  if(t>C.m03-.1&&t<C.d10){const h=headOf('monkey',B.mx,-.8,.4);bubble(g,clamp(h.x+30,240,1040),170,300,84,'Banana!',seg(t,C.m03,C.m03+.3),h.x,h.y,34)}
  if(t>B.ts&&t<C.m04){const h=headOf('rabbit',B.rx,B.rz,.4,-.2);for(let j=0;j<3;j++){const a=t*5+j*2.1;star(g,h.x+Math.cos(a)*44,h.y+Math.sin(a)*12,10,YEL,3820+j)}}
  if(t>C.a06-.1&&t<C.m04+.3){const h=headOf('rabbit',B.rx,B.rz,.4);bubble(g,clamp(h.x-60,240,1040),200,220,80,'Help!',seg(t,C.a06,C.a06+.25),h.x,h.y,36)}
  if(t>C.m04-.1&&t<C.p06+.2){const h=headOf('monkey',B.mx,-.8,.4);if(h.on&&h.x<1240)bubble(g,clamp(h.x-80,260,1020),160,380,84,"Now I'm first!",seg(t,C.m04,C.m04+.25),h.x,h.y,32)}
  card(g,640,112,560,92,cardK(t,C.p06,C.o10),{seed:3830,fill:'#fffaf0',wash:'#ffd5cf',draw:g=>inkText(g,"That isn't fair!",0,15,50,{col:'#e2382c'})});
  if(t>C.o10-.1&&t<gateT('q8'))card(g,640,112,600,80,seg(t,C.o10,C.o10+.3),{seed:3840,fill:'#fffaf0',wash:'#f6d27a',draw:g=>inkText(g,'What should we do?',0,12,40,{col:'#b35a00'})});
  sayCard(g,'Cheating is wrong. We play fair!',cardK(t,C.o11,B.gg+1.2),112,'#2e7d4f','#cde8b5');
  if(t>C.b08){const h=headOf('robot',rwx,.5);bubble(g,clamp(h.x+40,260,1020),210,340,80,'Hold on, Rabbit!',seg(t,at(S,'b08','Hold on'),at(S,'b08','Hold on')+.25)*(1-seg(t,S.end-.4,S.end)),h.x,h.y,30)}
  chip(g,'The forest bend',chipK3(S,lt))};

/* 9. The finish line — Monkey looks back and lands in the mud; Rabbit wins */
function lineState(t,S){const sp=lineSplat(),tx=lineCross(),s=S.start,k=clamp((t-s)/(sp-s));
  const mx=t<sp?lerp(17,3.8,k):3.8,mz=t<sp?lerp(-.7,2.6,ease(seg(k,.55,1))):2.6;
  const rx=t<tx?6.2*(tx-t):-7*(1-Math.exp(-(t-tx)*6.2/7)),dxx=t<tx+.9?6.2*(tx+.9-t):-4.6*(1-Math.exp(-(t-tx-.9)*6.2/4.6));return{mx,mz,rx,dx:dxx,sp,tx}}
CAMS.line=(lt,S,t)=>{const C=S.cues,s=S.start,L=lineState(t,S);
  const c=krig(lt,[[0,{p:[1.6,1.5,7.6],l:[8,1,0]}],[C.d12-s,{p:[6.4,1.9,8.2],l:[4,.8,1.6]},1.2],[L.sp-s+.1,{p:[4.6,2,7.4],l:[3.6,.9,2]},.4],[L.tx-s,{p:[0,2.4,8.6],l:[-1.6,1,0]},1.1]]);
  return W3('race',shk3(c,t,L.sp,.2,.8))};
SC.line=(g,t,S)=>{const lt=t-S.start,C=S.cues,L=lineState(t,S);begin3();setO('race');rkPose(t);
  const stuck=t>L.sp;drive(R3.MK,'monkey',L.mx,L.mz,Math.PI+(t<L.sp?.25*seg(t,L.sp-1.2,L.sp):.25),-L.mx,{h:1.45,face:t>at(S,'d12','looked')-.2?1:0,y:stuck?-.12:0,tilt:stuck?Math.sin(t*3)*.1:0,still:stuck});
  drive(R3.RK,'rabbit',L.rx,.7,Math.PI,-L.rx,{h:1.1,hop:hop3(t,C.a07,.25)});drive(R3.DK,'dragon',L.dx,-.8,Math.PI,-L.dx,{h:1.4});
  const F=R3.flag;F.visible=true;F.position.set(O[0]-.9,0,O[1]-3.2);F.rotation.set(0,0,Math.sin(t*10)*.5*seg(t,L.tx-.6,L.tx));
  actor('robot',-1.6,-3.3,{hop:hop3(t,L.tx,.4)});actor('owl',4.8,-3.4,{hop:hop3(t,L.tx+.2,.35)});actor('panda',6.4,-3.5,{hop:hop3(t,L.tx+.3,.35)});actor('fox',8,-3.4,{hop:hop3(t,L.tx+.4,.35)});
  burst('mud',t,L.sp,3.8,.2,2.6,34,3900,{v:2.4,up:3.6,s:.13,dur:1});
  end3(g,S,t);
  if(stuck){const h=headOf('monkey',L.mx,L.mz,.3,-.6);for(const[ox,oy]of[[-24,-10],[22,-46],[-6,-74]])mudSplat(g,h.x+ox,h.y+oy,.26,3910+ox,seg(t,L.sp+.1,L.sp+.3))}
  if(t>L.sp-.1&&t<L.sp+1)inkText(g,'SPLAT!',780,250,110*back(seg(t,L.sp,L.sp+.3)),{col:'#7a5532',stroke:'#fffaf0',sw:12,alpha:1-seg(t,L.sp+.6,L.sp+1)});
  if(t>C.a07-.1){const h=headOf('rabbit',L.rx,.7,.4);bubble(g,clamp(h.x+40,260,1020),190,280,84,"I'm first!",seg(t,C.a07,C.a07+.25),h.x,h.y,36)}
  confetti(g,t,L.tx,3.2,70,3920);chip(g,'The finish line',chipK3(S,lt))};

/* 10. The podium — trophy for Rabbit; a muddy Monkey says sorry */
CAMS.podium=(lt,S)=>{const C=S.cues,s=S.start;
  return W3('pod',krig(lt,[[0,{p:[0,2.9,10.5],l:[0,1.9,-1]}],[C.m05-s,{p:[2.4,2.1,6.6],l:[2.6,1.3,.4]},1.1],[C.a09-s,{p:[.9,2.5,7.8],l:[.8,1.7,-.2]},1.1]]))};
SC.podium=(g,t,S)=>{const lt=t-S.start,C=S.cues,cg=at(S,'o12','Congratulations');begin3();setO('pod');
  actor('rabbit',0,-1,{y:1.2,hop:hop3(t,cg+.3,.4)+hop3(t,C.a08,.35)+hop3(t,C.a09+.6,.3)});actor('dragon',-1.6,-1,{y:.75,hop:hop3(t,cg+.5,.3)});
  const up=seg(t,cg,cg+.5),Cp=R3.cup;Cp.visible=t>cg-.2;Cp.position.set(O[0]+lerp(-3.2,.5,ease(up)),lerp(1.2,1.55,ease(up))+Math.sin(up*Math.PI)*1,O[1]-.55);Cp.rotation.y=t*.8;
  actor('owl',-3.6,.6,{face:1,hop:hop3(t,cg,.25)});actor('panda',-5.0,1.0,{face:1,hop:hop3(t,cg+.2,.35)});actor('fox',-6.4,1.4,{face:1,hop:hop3(t,cg+.3,.35)});actor('robot',5.8,1.0,{hop:hop3(t,cg+.25,.3)});
  const mk=ease(seg(t,C.m05-.4,C.m05+.6));const mx=lerp(4.4,2.4,mk);actor('monkey',mx,.9,{face:0,tilt:t>C.m05&&t<C.a09?-.08:0,hop:hop3(t,C.a09+.8,.3)});
  burst('spark',t,cg+.2,0,2.6,-.8,40,4000,{v:3,up:4,s:.08,dur:1.4});
  end3(g,S,t);
  const h=headOf('monkey',mx,.9,0,-.6);for(const[ox,oy]of[[-24,-10],[22,-46],[-6,-74]])mudSplat(g,h.x+ox,h.y+oy,.24,3910+ox,1);
  if(t>C.a09+.3){for(let i=0;i<2;i++){const hx=headOf('rabbit',0,-1,1.2),k=((t-C.a09)*.6+i*.5)%1;heart(g,lerp(hx.x,h.x,.5)+Math.sin(k*6+i)*20,hx.y-k*80,.9,'#e85d9a')}}
  confetti(g,t,cg,4,70,4010);chip(g,'The winners',seg(lt,.1,.7));
  card(g,640,112,720,90,cardK(t,C.o12,C.m05),{seed:4020,fill:'#fffaf0',wash:'#f6d27a',draw:g=>inkText(g,"Congratulations, Rabbit!",0,14,46,{col:'#b35a00'})});
  sayCard(g,"I'm sorry. Cheating is wrong.",cardK(t,C.m05,C.a09),112,'#a0522d','#f7d7a6');
  sayCard(g,"Let's play fair together!",cardK(t,C.a09,S.end),112,'#2e7d4f','#cde8b5')};

/* 11. Finale — everyone races a fair lap together; favourite toys; the chant; crane up over the whole of Pet Town */
const FIN_V=3.2,FIN_D0=-3;
CAMS.finale=(lt,S,t)=>{const C=S.cues,s=S.start,T=S.end-s,c0=C.d13-s,o=ovalAt(FIN_D0+FIN_V*lt,0);
  let c={p:[o.x+o.nx*7+o.dx*2.2,2.3,o.z+o.nz*7+o.dz*2.2],l:[o.x-o.dx*.6,1,o.z-o.dz*.6],f:44};
  const k=ease(seg(lt,c0,T-.4));if(k>0)c=mixC(c,{p:[-14,46,44],l:[18,0,-6],f:50},k);return c};
SC.finale=(g,t,S)=>{const lt=t-S.start,C=S.cues,d=FIN_D0+FIN_V*lt;begin3();setO('world');rkPose(t);
  for(const[K,key,lane,dd,h]of[[R3.RK,'rabbit',1.0,1.6,1.1],[R3.MK,'monkey',-1.0,0,1.45],[R3.DK,'dragon',0,-2.8,1.4]]){const o=ovalAt(d+dd,lane);
    drive(K,key,o.x,o.z,o.ang,d+dd,{h,face:0,hop:key==='monkey'?hop3(t,C.m06,.12):key==='dragon'?hop3(t,C.r06,.15):hop3(t,C.p07,.15)})}
  for(const[n,x,i]of[['fox',33.5,0],['panda',35,1],['owl',36.5,2],['robot',38,3]])actor(n,x,-8.6,{face:0,hop:Math.abs(Math.sin(t*4+i))*.25*seg(lt,.2,.6)+hop3(t,C.p07,.3)});
  end3(g,S,t);
  qaCard(g,"What's your favourite toy?","My favourite toy's my ball.",cardK(t,C.f05,C.r06),seg(t,C.m06,C.m06+.3));
  card(g,640,112,960,90,cardK(t,C.r06,C.d13),{seed:4200,fill:'#fffaf0',wash:'#f6d27a',draw:g=>inkText(g,"Toy shop, toy shop, let's go to the toy shop!",0,14,40,{col:'#b35a00'})});
  sayCard(g,'Play fair!',cardK(t,C.d13,S.end-1.9),112,'#2e7d4f','#cde8b5');
  chip(g,'Pet Town',seg(lt,.1,.7));
  const e=seg(t,S.end-1.9,S.end-.2);if(e>0){g.fillStyle=`rgba(243,234,214,${ease(e)})`;g.fillRect(0,0,W,H);
    inkText(g,'The End',640,330,110,{alpha:e,col:'#b35a00',stroke:'#fffaf0',sw:12});inkText(g,'Pet Adventures · The Great Go-Kart Race',640,410,38,{alpha:e,col:'#5a3d28'})}};

/* ---------- score */
function scoreShot(K,S){const{ev,pad,bass,theme,arp,drums}=K,s=S.start,e=S.end;switch(S.id){
  case'title':theme(s,e,'musicbox',72,'maj',.32);pad(s,e,'strings',48,'maj',.1);break;
  case'square':theme(s,e,'flute',72,'maj',.22);arp(s,e,'pizz',72,'maj',.18,.5,[0,2,4,2]);bass(s,e,60,'maj',.26,'pulse');drums(s,e,'soft',.3);break;
  case'shop':case'fair':case'lab':case'paint':arp(s,e,'pizz',72,'maj',.2,.5,[0,2,4,7]);bass(s,e,60,'maj',.26,'pulse');drums(s,e,'bouncy',.36);theme(s,e,'flute',72,'maj',.16);break;
  case'race':{const go=snapB(T_GO());arp(s,go,'musicbox',84,'maj',.16,.5,[0,4,7,4]);bass(s,go,57,'min',.26,'pulse');drums(s,go,'tick',.3);
    ev(go-BAR,'riser',0,BAR,.3);ev(go,'crash',0,0,.45);drums(go,e,'quiz',.45);bass(go,e,60,'maj',.3,'eighth');theme(go,e,'flute',72,'maj',.24);break}
  case'bend':{const sp=snapB(bendSpin()),gg=snapB(bendGo());drums(s,sp,'quiz',.4);bass(s,sp,60,'maj',.28,'eighth');arp(s,sp,'pizz',72,'maj',.18,.5,[0,4,7,4]);
    ev(sp,'crash',0,0,.4);pad(sp,gg,'strings',45,'min',.16);drums(sp,gg,'toms',.32);bass(sp,gg,45,'min',.24,'pulse');
    ev(gg,'swell',0,1.2,.2);theme(gg,e,'strings',72,'maj',.24);drums(gg,e,'bouncy',.4);break}
  case'line':{const tx=snapB(lineCross());drums(s,tx,'quiz',.45);bass(s,tx,60,'maj',.3,'eighth');theme(s,tx,'flute',72,'maj',.24);
    ev(tx,'crash',0,0,.5);theme(tx,e,'strings',72,'maj',.28);pad(tx,e,'strings',48,'maj',.14);break}
  case'podium':theme(s,e,'strings',72,'maj',.24);arp(s,e,'musicbox',84,'maj',.15,.5,[0,4,7,4]);bass(s,e,60,'maj',.24);break;
  case'finale':{theme(s,e-BAR,'flute',72,'maj',.26);arp(s,e-BAR,'pizz',72,'maj',.18,.5,[0,4,2,4]);bass(s,e-BAR,60,'maj',.28,'pulse');drums(s,e-BAR,'bouncy',.4);
    const f=e-BAR;for(const m of[48,55,60,64,67,72])ev(f,'strings',m,BAR*1.2,.14);ev(f,'musicbox',84,BAR,.3);break}}
}
