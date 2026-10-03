/* The Stolen Week — Pet Adventures, episode 1 (English, Year 2 · Super Minds 1 Unit 5 "Free time")
   Interactive: the video STOPS at 8 challenges (GATES) and continues only after a correct answer.
   Teaches: days of the week; I (go swimming) on (Mondays); Do you…? Yes, I do / No, I don't; letter sound u;
   healthy habits; value — ask for help when you need it.
   Cast = the app's own pet sprites (images/*.png, drawn with img()); narrator only, no host. */
const META={title:'The Stolen Week · Pet Adventures',h1:'Pet Adventures · The Stolen Week (Unit 5 · Free time)',lang:'en'};
const STYLE='watercolour';
const HOST='none';
const SOUND='elevenlabs';
const LINES={
 d01:['D','Pet Adventures! The Stolen Week.'],
 d02:['D','In Pet Town, there is a giant calendar. It shows the whole week.'],
 p01:['P','I go swimming on Mondays!'],
 r01:['R','I play football on Fridays!'],
 f01:['F','And I play computer games on Wednesdays and Thursdays!'],
 o01:['O','Hoo! What a busy, busy week!'],
 d03:['D','Then… WHOOSH! A wild whirlwind blew into town!'],
 f02:['F','Oh no! The days are flying away!'],
 o02:['O',"Without the days, we can't play! Friends, will you help us?"],
 d04:['D','The pages flew everywhere. To find the first one, solve the riddle!'],
 o03:['O','I am the first school day of the week. Who am I?'],
 o04:['O','Yes! Monday! The page landed in the swimming pool!'],
 p02:['P','Monday? I know this one!'],
 d05:['D','What does Panda do on Mondays? Pick the picture!'],
 p03:['P','Yes! I go swimming on Mondays! Splash!'],
 d06:['D','Panda dived in and got the Monday page.'],
 d07:['D','The wind carried the next page to the big field.'],
 r02:['R','Look! The page is stuck on the scoreboard. Monday… something… Wednesday!'],
 f03:['F',"What's the missing day? Type it to unlock the scoreboard!"],
 r03:['R','Tuesday! On Tuesdays, we play ball! Catch!'],
 d08:['D','Bounce, bounce! Dragon got the Tuesday page.'],
 d09:['D','Next, the pets ran into the Game Arcade.'],
 b01:['B','Beep boop! Two pages are inside my game. Answer my question!'],
 b02:['B','Fox, do you play computer games on Wednesdays?'],
 d10:['D',"Look at Fox's week. What does Fox say?"],
 f04:['F','Yes, I do! I play computer games on Wednesdays and Thursdays!'],
 b03:['B','Beep! Correct! Here are Wednesday and Thursday!'],
 d11:['D',"On Friday's football pitch, it was raining. Mud everywhere!"],
 r04:['R','The Friday page is under the mud! Only u words can dig it out.'],
 o05:['O','Tap all the words with the u sound, like… mud!'],
 r05:['R','Mud, duck, sun, jump, bus! Up comes the Friday page!'],
 d12:['D','Then Dragon played football in the mud. Splat!'],
 d13:['D','On Saturday, the pets found a big stage. But the curtain was locked.'],
 p04:['P','The day cards are all mixed up!'],
 o06:['O','Put the days in order to open the curtain. Start with Monday!'],
 p05:['P','On Saturdays, we sing! La la la!'],
 d14:['D','The curtain opened, and there was the Saturday page.'],
 d15:['D','Only one page was missing. The pets followed the wind into the dark forest.'],
 f05:['F','Shh… Someone is crying.'],
 d16:['D','Behind a tree sat a tiny rabbit. She was holding the Sunday page!'],
 r06:['R','Hey! You took our week!'],
 o07:['O',"Wait, Dragon. Look at her. She's scared."],
 a01:['A',"I'm sorry. The wind blew me far from home. I'm lost."],
 a02:['A',"My family has a picnic by the lake on Sunday. But I don't know which day is Sunday!"],
 p06:['P',"Why didn't you ask for help?"],
 a03:['A','I was too shy.'],
 o08:['O',"It's okay to ask for help. That's what friends are for!"],
 a04:['A','Then… can you help me, please?'],
 f06:['F','Friends, solve the riddle! I come after Saturday. I am a weekend day. Who am I?'],
 a05:['A','Sunday! Today is Sunday! Thank you!'],
 d17:['D','The pets put all seven pages back on the calendar. Then they took Rabbit home to the lake.'],
 a06:['A',"Mum! I'm back! I asked for help!"],
 d18:['D',"Rabbit's family had a big Sunday picnic. But some things were not very healthy…"],
 o09:['O',"Help Rabbit's family! Sort the things into healthy and unhealthy."],
 p07:['P','Brilliant! Eat healthy food, keep fit, and have fun!'],
 d19:['D','Then everyone played hide-and-seek. On Sundays, we play hide-and-seek!'],
 a07:['A','One, two, three… ready or not!'],
 r07:['R','Rabbit is our new friend!'],
 o10:['O','Remember: when you need help, just ask!'],
 f07:['F',"It's a busy, busy, busy week!"],
 p08:['P','Hooray!'],
 d20:['D','Bye bye! See you next week!'],
 // played by the gate engine on a wrong answer (not on the timeline)
 x01:['P','Oops! Try again!'],
 x02:['O','Hmm… think again!'],
 x03:['F','So close! Try again!'],
};
const SPK={D:['Narrator','#7a6a5a'],R:['Dragon','#2e9b74'],F:['Fox','#d9731a'],O:['Owl','#8a6440'],P:['Panda','#4b4b58'],A:['Rabbit','#c0567a'],B:['Robot','#6a4fc9']};

// numbers after a challenge's ask line = the pause the video stops in (gate opens .25 s after the line)
const PLAN=[
 {id:'title',  pre:1.2, seq:['d01'], post:1.4},
 {id:'square', pre:0.8, seq:['d02',0.3,'p01',0.2,'r01',0.2,'f01',0.2,'o01',0.5,'d03',2.4,'f02',0.6,'o02',0.4,'d04',0.3,'o03',1.0], post:0},
 {id:'pool',   pre:0.6, seq:['o04',0.3,'p02',0.3,'d05',1.1,'p03',0.6,'d06'], post:0.8},
 {id:'field',  pre:0.6, seq:['d07',0.3,'r02',0.3,'f03',1.1,'r03',0.6,'d08'], post:0.8},
 {id:'arcade', pre:0.6, seq:['d09',0.3,'b01',0.3,'b02',0.4,'d10',1.1,'f04',0.4,'b03'], post:0.9},
 {id:'mud',    pre:0.6, seq:['d11',0.3,'r04',0.3,'o05',1.1,'r05',0.6,'d12'], post:1.0},
 {id:'stage',  pre:0.6, seq:['d13',0.3,'p04',0.3,'o06',1.1,'p05',0.6,'d14'], post:0.8},
 {id:'forest', pre:1.0, seq:['d15',0.5,'f05',0.5,'d16',0.5,'r06',0.3,'o07',0.4,'a01',0.3,'a02',0.3,'p06',0.3,'a03',0.4,'o08',0.4,'a04',0.4,'f06',1.1,'a05'], post:0.9},
 {id:'lake',   pre:0.6, seq:['d17',0.3,'a06',0.4,'d18',0.3,'o09',1.1,'p07'], post:0.9},
 {id:'play',   pre:0.6, seq:['d19',0.3,'a07',1.4,'r07',0.3,'o10',0.4,'f07',0.2,'p08',0.8,'d20'], post:3.2},
];
const GAP=0.18;
const TRANS={square:'paper',pool:'whip',field:'whip',arcade:'whip',mud:'whip',stage:'whip',forest:'ink',lake:'iris',play:'paper'};

/* =====================================================================
   CHALLENGES (engine gates) — the video stops after line `after`
   ===================================================================== */
/* Every challenge has a POOL of variants; one is picked at random each time the page opens, so the class
   gets a fresh set of questions on every reopen. The narration around a gate is recorded audio ("Yes! Monday!"),
   so every variant of a gate keeps the SAME correct answer — only the clue, type, wording and distractors change.
   Variant 0 = the original question (its 🔊 replays the recorded line); a variant with a different prompt gets
   say:true so 🔊 reads the on-screen question with the browser voice instead. */
const GATE_POOL=[
 {id:'q1',after:'o03',v:[
  {type:'choice',prompt:'I am the first school day of the week. Who am I?',options:['Monday','Friday','Sunday'],answer:0,hint:'School starts on M…'},
  {type:'choice',prompt:'I come after Sunday. Who am I?',options:['Monday','Wednesday','Saturday'],answer:0,hint:'Sunday, M…'},
  {type:'type',prompt:'I come before Tuesday. I start with M. Who am I? Type it!',answer:'Monday',hint:'M-o-n… Use the letter tiles!'},
  {type:'choice',prompt:'Panda goes swimming on this day. Who am I?',options:['Monday','Tuesday','Sunday'],answer:0,hint:'"I go swimming on M…days!"'},
  {type:'choice',prompt:'Which day starts with the letter M?',options:['Monday','Wednesday','Friday','Saturday'],answer:0,hint:'Say them: M-M-Monday…'},
 ]},
 {id:'q2',after:'d05',v:[
  {type:'picture',prompt:'What does Panda do on Mondays?',options:[{label:'go swimming',icon:'🏊'},{label:'watch TV',icon:'📺'},{label:'play football',icon:'⚽'}],answer:0,hint:'Look where Panda is — at the swimming pool!'},
  {type:'picture',prompt:'What does Panda do on Mondays?',options:[{label:'go swimming',icon:'🏊'},{label:'ride a bike',icon:'🚲'},{label:'sing',icon:'🎤'}],answer:0,hint:'Look where Panda is — at the swimming pool!'},
  {type:'picture',prompt:'Panda is at the pool. What does Panda do on Mondays?',options:[{label:'go swimming',icon:'🏊'},{label:'play computer games',icon:'🎮'},{label:'play hide-and-seek',icon:'🙈'},{label:'play football',icon:'⚽'}],answer:0,hint:'Splash! Panda loves the water.'},
  {type:'choice',prompt:'Which sentence is right for Panda?',options:['I go swimming on Mondays.','I play football on Mondays.','I watch TV on Mondays.'],answer:0,hint:'Panda is at the swimming pool!'},
  {type:'type',prompt:'Panda says: "I go s_______ on Mondays." Type the missing word!',answer:'swimming',hint:'Splash! s-w-i-m… Use the letter tiles!'},
 ]},
 {id:'q3',after:'f03',v:[
  {type:'type',prompt:'Monday, ______, Wednesday. Type the missing day!',answer:'Tuesday',accept:['tues day'],hint:'It starts with T. Use the letter tiles!'},
  {type:'type',prompt:'Sunday, Monday, ______. Type the next day!',answer:'Tuesday',accept:['tues day'],hint:'It starts with T. Use the letter tiles!'},
  {type:'type',prompt:'Which day comes after Monday? Type it!',answer:'Tuesday',accept:['tues day'],hint:'It starts with T. Use the letter tiles!'},
  {type:'type',prompt:'______ comes before Wednesday. Type the day!',answer:'Tuesday',accept:['tues day'],hint:'Monday, T…, Wednesday'},
  {type:'type',prompt:'T _ _ _ _ _ _ — I come after Monday. Type me!',answer:'Tuesday',accept:['tues day'],hint:'T-u-e-s… Use the letter tiles!'},
 ]},
 {id:'q4',after:'d10',ask:'b02',v:[
  {type:'yesno',prompt:'"Fox, do you play computer games on Wednesdays?" What does Fox say?',options:['Yes, I do.',"No, I don't.",'Yes, I am.'],answer:0,hint:"Look at Fox's week: Wednesday = computer games."},
  {type:'yesno',prompt:'"Fox, do you play computer games on Thursdays?" What does Fox say?',options:['Yes, I do.',"No, I don't.",'Yes, I am.'],answer:0,hint:'Fox plays computer games on Wednesdays AND Thursdays.'},
  {type:'yesno',prompt:'"Do you play computer games on Wednesdays?" Pick Fox\'s answer!',options:['Yes, I do.',"No, I don't.",'Yes, you do.'],answer:0,hint:'Fox talks about Fox: "Yes, I …"'},
  {type:'yesno',prompt:'Fox plays computer games on Wednesdays. "Do you play computer games on Wednesdays?" Fox says…',options:['Yes, I do.','Yes, I can.',"No, I don't."],answer:0,hint:'"Do you…?" → "Yes, I do."'},
  {type:'picture',prompt:'What does Fox do on Wednesdays?',options:[{label:'play computer games',icon:'🎮'},{label:'go swimming',icon:'🏊'},{label:'sing',icon:'🎤'}],answer:0,hint:'Fox is in the Game Arcade!'},
 ]},
 {id:'q5',after:'o05',v:[
  {type:'tapAll',prompt:'Tap ALL the words with the u sound, like mud!',options:['duck','cat','sun','pen','jump','dog','bus'],answers:[0,2,4,6],hint:'Say them out loud: d-u-ck, s-u-n … Find 4!'},
  {type:'tapAll',prompt:'Tap ALL the words with the u sound, like mud!',options:['cup','hat','bug','run','bed','fun','pig'],answers:[0,2,3,5],hint:'Say them out loud: c-u-p, b-u-g … Find 4!'},
  {type:'tapAll',prompt:'Tap ALL the words with the u sound, like mud!',options:['sun','bus','ten','nut','map','gum','fox'],answers:[0,1,3,5],hint:'Say them out loud: s-u-n, n-u-t … Find 4!'},
  {type:'tapAll',prompt:'Tap ALL the words with the u sound, like mud!',options:['duck','rug','cat','hut','dog','bun','pen'],answers:[0,1,3,5],hint:'Say them out loud: r-u-g, h-u-t … Find 4!'},
  {type:'tapAll',prompt:'Tap ALL the words with the u sound, like mud!',options:['jump','up','sit','mud','top','cut','egg'],answers:[0,1,3,5],hint:'Say them out loud: j-u-mp, c-u-t … Find 4!'},
 ]},
 {id:'q6',after:'o06',v:[
  {type:'order',prompt:'Tap the days in order. Start with Monday!',items:['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],hint:'Sing it: Monday, Tuesday, Wednesday…'},
  {type:'order',prompt:'Put the five school days in order. Start with Monday!',items:['Monday','Tuesday','Wednesday','Thursday','Friday'],hint:'Sing it: Monday, Tuesday, Wednesday…'},
  {type:'order',prompt:'Put ALL seven days in order. Start with Monday!',items:['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],hint:'Sing it: Monday, Tuesday, Wednesday…'},
  {type:'order',prompt:'Tap the first four days in order. Start with Monday!',items:['Monday','Tuesday','Wednesday','Thursday'],hint:'Sing it: Monday, Tuesday, Wednesday…'},
 ]},
 {id:'q7',after:'f06',v:[
  {type:'type',prompt:'I come after Saturday. I am a weekend day. Who am I?',answer:'Sunday',hint:'It starts with S and ends with …day.'},
  {type:'type',prompt:'I come before Monday. I am a weekend day. Who am I?',answer:'Sunday',hint:'It starts with S and ends with …day.'},
  {type:'type',prompt:'The weekend is Saturday and ______. Type the day!',answer:'Sunday',hint:'S-u-n… Use the letter tiles!'},
  {type:'choice',prompt:'Which day starts with S-U?',options:['Sunday','Saturday','Thursday'],answer:0,hint:'S-u… like the sun!'},
  {type:'choice',prompt:'Start with Monday. Which is the LAST day of the week?',options:['Sunday','Saturday','Friday'],answer:0,hint:'It comes after Saturday.'},
 ]},
 {id:'q8',after:'o09',sortPick:true,v:[
  {type:'sort',prompt:'Healthy or unhealthy? Sort them all!',bins:['😊 Healthy','😟 Unhealthy'],
   items:[{label:'apple',icon:'🍎',bin:0},{label:'sweets',icon:'🍬',bin:1},{label:'play football',icon:'⚽',bin:0},{label:'carrot',icon:'🥕',bin:0},{label:'TV all night',icon:'📺',bin:1},{label:'sleep early',icon:'😴',bin:0}],
   hint:'Healthy = good food, sport and sleep.'},
 ]},
];
// the big pool the sort challenge draws 6 cards from (3–4 healthy + the rest unhealthy) on every reopen
const SORT_POOL=[
 [{label:'apple',icon:'🍎'},{label:'carrot',icon:'🥕'},{label:'banana',icon:'🍌'},{label:'water',icon:'💧'},{label:'milk',icon:'🥛'},{label:'fish',icon:'🐟'},
  {label:'salad',icon:'🥗'},{label:'play football',icon:'⚽'},{label:'ride a bike',icon:'🚲'},{label:'go swimming',icon:'🏊'},{label:'sleep early',icon:'😴'},{label:'brush your teeth',icon:'🪥'}],
 [{label:'sweets',icon:'🍬'},{label:'chips',icon:'🍟'},{label:'fizzy drinks',icon:'🥤'},{label:'cake every day',icon:'🍰'},{label:'burger every day',icon:'🍔'},
  {label:'TV all night',icon:'📺'},{label:'games all night',icon:'🎮'},{label:'ice cream every day',icon:'🍦'}],
];
const gRand=n=>Math.floor(Math.random()*n);
const gMix=a=>{const o=a.slice();for(let i=o.length-1;i>0;i--){const j=gRand(i+1);[o[i],o[j]]=[o[j],o[i]]}return o};
// shuffle a variant's options and remap its answer index(es), so the order changes on every reopen too
function gateMixOpts(q){if(!q.options)return q;const idx=gMix(q.options.map((_,i)=>i));
  const r={...q,options:idx.map(i=>q.options[i])};if('answer'in q)r.answer=idx.indexOf(q.answer);if(q.answers)r.answers=q.answers.map(a=>idx.indexOf(a));return r}
function gateSortItems(){const nh=3+gRand(2);return gMix([...gMix(SORT_POOL[0]).slice(0,nh).map(o=>({...o,bin:0})),...gMix(SORT_POOL[1]).slice(0,6-nh).map(o=>({...o,bin:1}))])}
const GATES=GATE_POOL.map(({v,sortPick,...base})=>{const k=gRand(v.length);let q={...base,...v[k],say:v[k].prompt!==v[0].prompt};
  if(sortPick)q.items=gateSortItems();
  return gateMixOpts(q)});
// 🔊 on a new variant: read the on-screen question (the recorded clip asks the original one)
document.addEventListener('click',e=>{if(!e.target.closest||!e.target.closest('#gsay'))return;const q=typeof GOPEN!=='undefined'&&GOPEN;
  if(!q||!q.say||!('speechSynthesis'in window))return;e.stopImmediatePropagation();e.preventDefault();
  speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(q.prompt.replace(/_[_ ]*/g,'blank ')),vs=speechSynthesis.getVoices();
  u.lang='en-GB';u.rate=.85;u.voice=vs.find(v=>/^en-GB/i.test(v.lang))||vs.find(v=>/^en/i.test(v.lang))||null;speechSynthesis.speak(u)},true);
const GATE_RETRY=['x01','x02','x03'];

/* ---------- story moments (absolute times), shared by scenes and SFX */
const endOf=(S,id)=>S.cues[id]+CLIP[id].eff;
const gateT=id=>{const q=GATES.find(q=>q.id===id),c=CUES.find(c=>c.id===q.after);return c.t+c.eff+.25};
const windT=S=>at(S,'d03','WHOOSH')-.1;          // square: the 3D whirlwind cutaway starts
const WIND_LEN=5;
// when each day-page is won back (index 0 = Monday)
function gotT(i){switch(i){case 0:return at(shot('pool'),'d06','got');case 1:return at(shot('field'),'d08','got');case 2:case 3:return at(shot('arcade'),'b03','Here');
  case 4:return at(shot('mud'),'r05','Up comes');case 5:return shot('stage').cues.d14+1;default:return shot('forest').cues.a05+.6}}

function chapterSFX(){const S=shot,C=cue,len=slen;const sq=S('square'),po=S('pool'),fi=S('field'),ar=S('arcade'),mu=S('mud'),st=S('stage'),fo=S('forest'),la=S('lake'),pl=S('play');return[
  {t:S('title').start+.8,name:'sfx_sparkle',gain:.6},
  {t:sq.start,name:'sfx_birds',loop:true,dur:windT(sq)-sq.start,gain:.25},
  {t:at(sq,'p01','swimming'),name:'sfx_pop',dur:.5,gain:.5},{t:at(sq,'r01','football'),name:'sfx_pop',dur:.5,gain:.5},{t:at(sq,'f01','computer'),name:'sfx_pop',dur:.5,gain:.5},
  {t:windT(sq)-.3,name:'sfx_whoosh',dur:1.6,gain:.9},{t:windT(sq),name:'sfx_wind',dur:WIND_LEN+.5,gain:.8},{t:windT(sq)+1.2,name:'sfx_whoosh',dur:1.2,gain:.5},{t:windT(sq)+2.6,name:'sfx_whoosh',dur:1.2,gain:.45},
  {t:C('square','o03')-.2,name:'sfx_sparkle',gain:.4},
  {t:po.start,name:'sfx_waves',loop:true,dur:len('pool'),gain:.18},
  {t:at(po,'p03','Splash')-.1,name:'sfx_splash',gain:1},{t:gotT(0),name:'sfx_ding',gain:.7},
  {t:fi.start,name:'sfx_birds',loop:true,dur:len('field'),gain:.2},{t:fi.start+.4,name:'sfx_whistle',gain:.6},
  {t:at(fi,'r03','Catch')-.1,name:'sfx_boing',gain:.6},{t:at(fi,'d08','Bounce'),name:'sfx_boing',gain:.5},{t:at(fi,'d08','bounce!'),name:'sfx_boing',gain:.5},{t:gotT(1),name:'sfx_ding',gain:.7},
  {t:ar.start+.2,name:'sfx_arcade',gain:.55},{t:C('arcade','b01')-.15,name:'sfx_pop',dur:.4,gain:.5},{t:at(ar,'b03','Beep'),name:'sfx_arcade',gain:.6},{t:gotT(2)+.1,name:'sfx_ding',gain:.7},
  {t:mu.start,name:'sfx_rain',loop:true,dur:len('mud'),gain:.3},{t:at(mu,'r05','Up comes'),name:'sfx_squelch',gain:.9},{t:gotT(4)+.3,name:'sfx_ding',gain:.7},
  {t:at(mu,'d12','Splat')-.1,name:'sfx_squelch',gain:1},
  {t:st.start+.3,name:'sfx_drumroll',dur:1.6,gain:.4},{t:C('stage','p05')-.3,name:'sfx_tada',gain:.6},{t:C('stage','d14'),name:'sfx_applause',dur:3,gain:.35},{t:gotT(5),name:'sfx_ding',gain:.7},
  {t:fo.start,name:'sfx_crickets',loop:true,dur:len('forest'),gain:.25},{t:fo.start+.2,name:'sfx_wind',dur:3,gain:.35},{t:at(fo,'d16','Behind'),name:'sfx_sparkle',gain:.35},
  {t:C('forest','a05')+.3,name:'sfx_magic',gain:.6},{t:gotT(6),name:'sfx_ding',gain:.7},
  {t:la.start+.2,name:'sfx_magic',gain:.6},{t:la.start,name:'sfx_waves',loop:true,dur:len('lake'),gain:.15},{t:la.start+2,name:'sfx_birds',loop:true,dur:len('lake')-2,gain:.2},
  {t:C('lake','p07')-.2,name:'sfx_pop',dur:.5,gain:.6},{t:C('lake','p07')+.1,name:'sfx_pop',dur:.5,gain:.6},
  {t:pl.start,name:'sfx_birds',loop:true,dur:len('play')-1,gain:.22},
  {t:endOf(pl,'a07')+.35,name:'sfx_pop',dur:.4,gain:.5},{t:endOf(pl,'a07')+.7,name:'sfx_pop',dur:.4,gain:.5},{t:endOf(pl,'a07')+1.05,name:'sfx_pop',dur:.4,gain:.5},
  {t:C('play','p08'),name:'sfx_applause',dur:2.5,gain:.4},
];}

/* =====================================================================
   PETS (real app sprites) + props
   ===================================================================== */
// feet at (x,y), h = drawn height. face:1 = face right (the sprites look left).
function drawPet(g,name,x,y,h,o={}){const{face=0,talk=0,hop=0,tilt=0,alpha=1,sq=0,shadow=true,glowCol=null,glowA=0}=o;const im=img(name);if(!im||alpha<=0)return;
  const br=Math.sin(TT*2.3+x*.013)*.012;
  g.save();g.translate(x,y);
  if(shadow){g.save();g.globalAlpha=.2*alpha*clamp(1-hop/220);g.fillStyle='#3a2a1a';g.beginPath();g.ellipse(0,0,h*.3,h*.055,0,0,7);g.fill();g.restore()}
  g.translate(0,-hop);if(glowCol)glow(g,0,-h*.45,h*.8,glowCol,glowA);
  g.rotate(tilt);const sy=1+br+talk*.08-sq*.16,sx=1-talk*.03+sq*.14;g.scale((face?-1:1)*sx,sy);g.globalAlpha*=alpha;
  g.drawImage(im,-h/2,-h*.97,h,h);g.restore()}
const talkOf=(k,t)=>amp(k,t);
const hopOf=(t,t0,hgt=40,dur=.45)=>{const u=(t-t0)/dur;return u>0&&u<1?Math.sin(u*Math.PI)*hgt:0};
const walkBob=(t,on,seed=0)=>on?Math.abs(Math.sin(t*9+seed))*12:0;

function sky(g,top,bot){const s=g.createLinearGradient(0,-200,0,600);s.addColorStop(0,top);s.addColorStop(1,bot);g.fillStyle=s;g.fillRect(-500,-400,2400,1500)}
function tree(g,x,y,s,seed,col='#3f8a3a'){g.save();g.translate(x,y);g.scale(s,s);blob(g,rectP(-14,-190,28,190),'#6b4526',{seed,w:2.2});
  blob(g,ell(0,-230,95,80,24),col,{seed:seed+1,w:2.4});blob(g,ell(-55,-190,55,45,18),col,{seed:seed+2,w:2});blob(g,ell(55,-195,58,45,18),col,{seed:seed+3,w:2});g.restore()}
function cloud(g,x,y,s,seed){blob(g,ell(x,y,90*s,34*s,18),'#ffffff',{seed,w:1.6,alpha:.9});blob(g,ell(x+40*s,y-20*s,50*s,30*s,14),'#ffffff',{seed:seed+1,w:1.6,alpha:.9})}
function ground(g,y,col,seed){blob(g,subdiv([[-400,y],[1800,y],[1800,900],[-400,900]],24),col,{seed,w:2.4})}
function house(g,x,y,s,col,roof,seed){g.save();g.translate(x,y);g.scale(s,s);blob(g,rectP(-70,-120,140,120),col,{seed,w:2.2});
  blob(g,[[-90,-115],[0,-190],[90,-115]],roof,{seed:seed+1,w:2.2});blob(g,rrectP(-18,-60,36,60,8),'#8a5a2b',{seed:seed+2,w:1.8});
  blob(g,rectP(-55,-95,30,28),'#bfe3f7',{seed:seed+3,w:1.6});blob(g,rectP(25,-95,30,28),'#bfe3f7',{seed:seed+4,w:1.6});g.restore()}
function bush(g,x,y,s,seed,col='#5e9a45'){g.save();g.translate(x,y);g.scale(s,s);blob(g,ell(-40,-30,55,40,18),col,{seed,w:2});blob(g,ell(30,-38,60,48,18),col,{seed:seed+1,w:2});blob(g,ell(0,-60,45,38,16),col,{seed:seed+2,w:2});g.restore()}
// a sentence card along the top, e.g. sayCard(g,'I go swimming on Mondays.',k)
function sayCard(g,text,k,y=112,col='#1d6fa5',wsh='#bfe3f7'){const w=Math.min(1080,120+text.length*21);card(g,640,y,w,86,k,{seed:800+text.length,fill:'#fffaf0',wash:wsh,draw:g=>inkText(g,text,0,13,40,{col})})}
function wordCard(g,word,x,y,k,col='#1d6fa5',wsh='#bfe3f7'){card(g,x,y,300,96,k,{seed:800+word.length,fill:'#fffaf0',wash:wsh,draw:g=>inkText(g,word,0,20,60,{col})})}
function pointAt(g,x1,y1,x2,y2,k,col='#e2382c'){if(k<=0)return;arrow(g,x1,y1,x2,y2,k,{w:6,col})}
const cardK=(t,a,b,fade=.4)=>seg(t,a,a+.35)*(1-seg(t,b-fade,b));
function riddleCard(g,line,k,seed){card(g,640,138,880,150,k,{seed,fill:'#fffaf0',wash:'#f6d27a',draw:g=>{inkText(g,'★ Riddle! ★',0,-38,30,{col:'#e2382c'});inkText(g,line,0,8,36,{col:'#5a3d28'});inkText(g,'Who am I?',0,52,38,{col:'#b35a00'})}})}
// a word with its u in red, centred at x (phonics)
function uWord(g,w,x,y,size,col='#5a3d28'){const i=w.indexOf('u'),pre=w.slice(0,i),post=w.slice(i+1);g.font=`800 ${size}px ${FONT}`;
  const wp=g.measureText(pre).width,wm=g.measureText('u').width,wq=g.measureText(post).width,x0=x-(wp+wm+wq)/2;
  inkText(g,pre,x0,y,size,{align:'left',col});inkText(g,'u',x0+wp,y,size,{align:'left',col:'#e2382c'});inkText(g,post,x0+wp+wm,y,size,{align:'left',col})}

/* ---------- the days */
const DAY=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const DCOL=['#e2382c','#f28c28','#e8b020','#4fa84f','#1d9ae0','#7b5bd6','#e85d9a'];
// one calendar page (centre x,y; w wide). blank:true = coloured top but "?" instead of the name
function dayPage(g,x,y,w,i,o={}){const{rot=0,alpha=1,blank=false,glowA=0}=o;if(alpha<=0)return;const h=w*1.32;
  g.save();g.translate(x,y);g.rotate(rot);g.globalAlpha*=alpha;if(glowA>0)glow(g,0,0,w*1.3,'rgba(255,230,120,A)',glowA);
  blob(g,rrectP(-w/2,-h/2,w,h,w*.08),'#fffaf0',{seed:2000+i,w:Math.max(1.2,w/40)});blob(g,rrectP(-w/2,-h/2,w,h*.3,w*.08),DCOL[i],{seed:2010+i,w:Math.max(1.2,w/40)});
  inkText(g,blank?'?':DAY[i].slice(0,3).toUpperCase(),0,-h/2+h*.21,w*.27,{col:'#fffaf0'});
  if(!blank)inkText(g,DAY[i],0,h*.12,w*(DAY[i].length>7?.15:.18),{col:DCOL[i]});
  inkText(g,blank?'?':String(i+1),0,h*.38,w*.2,{col:'#9a8f80'});g.restore()}
// the giant calendar: frame at x,y (top-left), pages via pageAt(i) -> {x,y,rot,alpha} offsets or null (gone)
function calendar(g,x,y,s,pageAt){g.save();g.translate(x,y);g.scale(s,s);
  for(const px of[60,700])blob(g,rectP(px-12,300,24,230),'#6b4526',{seed:2100+px,w:2});
  blob(g,rrectP(0,0,760,330,18),'#8a5a2b',{seed:2110,w:2.6});blob(g,rrectP(18,18,724,294,12),'#fbf1d8',{seed:2111,w:1.8});
  blob(g,rrectP(10,-46,740,62,14),'#e2382c',{seed:2112,w:2.4});inkText(g,'THIS WEEK',380,-4,40,{col:'#fffaf0'});
  for(let i=0;i<7;i++){const bx=78+i*101,by=170;g.save();g.globalAlpha=.35;g.setLineDash([8,8]);g.strokeStyle='#b9a27a';g.lineWidth=3;g.strokeRect(bx-42,by-56,84,112);g.restore();
    const p=pageAt(i);if(p)dayPage(g,bx+(p.x||0),by+(p.y||0),84,i,{rot:p.rot||0,alpha:p.alpha??1,glowA:p.glowA||0})}
  g.restore()}
// top-right tracker: the pages already won back
function pageHUD(g,t,k=1){if(k<=0)return;g.save();g.globalAlpha=clamp(k);g.translate(1250-7*48,24);blob(g,rrectP(-12,-6,7*48+16,74,14),'#fffaf0',{seed:2200,w:1.6,alpha:.85});
  for(let i=0;i<7;i++){const gt=gotT(i),x=i*48+20,y=31;if(t>=gt){const pop=back(seg(t,gt,gt+.5));g.save();g.translate(x,y);g.scale(pop,pop);dayPage(g,0,0,34,i);g.restore();if(t<gt+1.1)sparkles(g,x,y,t-gt,2210+i,8,50)}
    else{g.save();g.globalAlpha*=.5;g.setLineDash([5,5]);g.strokeStyle='#9a8f80';g.lineWidth=2;g.strokeRect(x-17,y-22,34,44);g.restore();inkText(g,DAY[i][0],x,y+9,22,{col:'#b9ad97'})}}
  g.restore()}
function football(g,x,y,r,rot){g.save();g.translate(x,y);g.rotate(rot);blob(g,ell(0,0,r,r,20),'#ffffff',{seed:2300,w:Math.max(1.4,r/12)});
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5;blob(g,ell(Math.cos(a)*r*.62,Math.sin(a)*r*.62,r*.2,r*.2,5),'#3a2a1a',{seed:2301+i,w:1,ink:false})}blob(g,ell(0,0,r*.26,r*.26,5),'#3a2a1a',{seed:2306,w:1,ink:false});g.restore()}
function duck(g,x,y,s,seed,flap=0){g.save();g.translate(x,y);g.scale(s,s);blob(g,ell(0,0,46,30,18),'#ffd23f',{seed,w:2});blob(g,ell(32,-34,22,20,14),'#ffd23f',{seed:seed+1,w:2});
  blob(g,[[50,-36],[72,-30],[50,-26]],'#f28c28',{seed:seed+2,w:1.6});g.fillStyle=INK;g.beginPath();g.arc(38,-40,3,0,7);g.fill();
  g.save();g.rotate(-.3-flap*.6);blob(g,ell(-6,-6,26,14,12),'#f6c445',{seed:seed+3,w:1.6});g.restore();g.restore()}
function note(g,x,y,s,col){g.save();g.translate(x,y);g.scale(s,s);blob(g,ell(0,0,12,9,10),col,{seed:2320,w:1.4});inkPoly(g,[[10,-2],[10,-40],[26,-32]],{w:3,col,seed:2321});g.restore()}
function mudSplat(g,x,y,s,seed,k){if(k<=0)return;g.save();g.translate(x,y);g.scale(s*back(k),s*back(k));for(let i=0;i<7;i++){const a=i*.9+seed,r=30+hash2(i,1,seed)*30;blob(g,ell(Math.cos(a)*r,Math.sin(a)*r*.6,10+hash2(i,2,seed)*10,8+hash2(i,3,seed)*8,8),'#7a5532',{seed:seed+i,w:1.2})}blob(g,ell(0,0,32,20,14),'#7a5532',{seed:seed+9,w:1.6});g.restore()}

/* =====================================================================
   SCENES
   ===================================================================== */

/* 1. Title — Pet Town at sunrise; the full calendar; the pets bounce in */
function townBG(g,t){sky(g,'#9fd0ee','#fbf1d8');wash(g,1080,110,170,'#ffe08a',1,11,.75);cloud(g,240,110,1,12);cloud(g,880,80,.8,14);
  blob(g,subdiv([[-400,470],[200,400],[700,440],[1300,380],[1800,470],[1800,700],[-400,700]],24),'#b9dc8f',{seed:920,w:2});
  house(g,110,520,.9,'#f7d7a6','#c0563a',1600);house(g,1170,510,.85,'#cfe3f7','#5a4fb0',1610);tree(g,300,520,.6,930);tree(g,1010,515,.55,934,'#4f9a45');
  ground(g,590,'#a8d37f',940);for(let i=0;i<26;i++){const x=hash2(i,1,941)*1500-100,y=600+hash2(i,2,941)*60;inkPoly(g,[[x,y],[x+4,y-14]],{w:2,seed:942+i,col:'#4f8a3a'})}}
SC.title=(g,t,S)=>{const lt=t-S.start,T=S.end-S.start;
  g.save();camApply(g,{x:640,y:360+8*seg(lt,0,T),z:1.02+.05*ease(seg(lt,0,T)),r:0});townBG(g,t);
  calendar(g,330,260,.82,i=>({y:-(1-back(seg(lt,.3+i*.12,.7+i*.12)))*60,alpha:seg(lt,.3+i*.12,.5+i*.12)}));
  const pets=[['dragon',170,1,.6,160],['fox',390,1,.8,140],['owl',900,0,1.0,130],['panda',1110,0,1.2,150]];
  for(const[n,x,f,d,h]of pets){const k=spring(clamp((lt-d)*1.4));drawPet(g,n,x,lerp(800,630,clamp(k)),h,{face:f,hop:hopOf(lt,d+1,22)})}
  g.restore();
  card(g,640,120,760,150,seg(lt,.2,.8),{seed:2400,fill:'#fffaf0',wash:'#f6d27a',draw:g=>{inkText(g,'The Stolen Week',0,10,82,{reveal:seg(lt,.3,1.6),col:'#b35a00'});inkText(g,'Pet Adventures · Free time',0,56,30,{alpha:seg(lt,1.3,2),col:'#5a3d28'})}});
  if(lt<.6){g.fillStyle=`rgba(243,234,214,${1-lt/.6})`;g.fillRect(0,0,W,H)}};

/* 2. Square — the pets plan their week; the 3D whirlwind steals the pages; the first riddle */
SC.square=(g,t,S)=>{const lt=t-S.start,C=S.cues,wt=windT(S),we=wt+WIND_LEN,gone=t>=wt+.4;
  const hl=i=>{const a=[['p01',0],['r01',4],['f01',2],['f01',3]].filter(([id,d])=>d===i).map(([id])=>[C[id],endOf(S,id)+.3]);return a.some(([a,b])=>t>a&&t<b)?.6:0};
  const cz=t<wt?rig(lt,[[0,{x:640,y:380,z:1.0}],[C.p01-S.start,{x:640,y:390,z:1.05},'io'],[C.o01-S.start,{x:640,y:380,z:1.0},'io']]):rig(t-we,[[0,{x:640,y:390,z:1.15}],[1.2,{x:640,y:380,z:1.0},'out']]);
  g.save();camApply(g,shake(cz,'impact',t,{t0:wt-.3,amp:10}));townBG(g,t);
  calendar(g,330,190,.82,i=>gone?null:{glowA:hl(i),x:t>wt-.4?Math.sin(t*40+i)*4:0,rot:t>wt-.4?Math.sin(t*30+i)*.08:0});
  const dizzy=t>we&&t<C.o02;const P=[['dragon',230,1,'R',165],['fox',430,1,'F',145],['owl',860,0,'O',135],['panda',1060,0,'P',152]];
  P.forEach(([n,x,f,k,h],i)=>drawPet(g,n,x,632,h,{face:f,talk:talkOf(k,t),hop:hopOf(t,C[{R:'r01',F:'f01',O:'o01',P:'p01'}[k]],22)+(t>C.o03?Math.abs(Math.sin(t*3+i))*6:0),tilt:dizzy?Math.sin(t*6+i)*.18:0}));
  if(dizzy)for(let i=0;i<4;i++){const x=[230,430,860,1060][i];for(let j=0;j<3;j++){const a=t*4+j*2.1+i;star(g,x+Math.cos(a)*40,470+Math.sin(a)*10,9,YEL,2500+i*3+j)}}
  g.restore();
  chip(g,'Pet Town',seg(lt,.1,.7));
  sayCard(g,'I go swimming on Mondays.',cardK(t,C.p01,C.r01),112,DCOL[0],'#ffd5cf');
  sayCard(g,'I play football on Fridays.',cardK(t,C.r01,C.f01),112,'#136a9c','#bfe3f7');
  sayCard(g,'I play computer games on Wednesdays and Thursdays.',cardK(t,C.f01,C.o01),112,'#2e7d4f','#cde8b5');
  // the 3D cutaway: Blender whirlwind over the town sky
  if(t>=wt&&t<we){const k=seg(t,wt,wt+.25)*(1-seg(t,we-.3,we));g.save();g.globalAlpha=k;sky(g,'#9fd0ee','#e7f2f7');wash(g,1000,140,200,'#ffe08a',1,11,.5);
    for(let i=0;i<14;i++){const y=60+i*48,o=((t*900+i*190)%1700)-200;g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=3;g.beginPath();g.moveTo(1400-o,y);g.lineTo(1400-o-120-hash2(i,1,2600)*120,y+8);g.stroke()}
    clip3d(g,'whirlwind',wt,t);g.restore();
    if(t>C.f02-.1)bubble(g,330,150,420,90,'The days are flying away!',seg(t,C.f02,C.f02+.3)*(1-seg(t,we-.4,we)),260,230,32)}
  if(t>C.o02-.2&&t<C.d04+.2){card(g,640,112,640,86,cardK(t,C.o02,C.d04+.2),{seed:2610,fill:'#fffaf0',wash:'#f7d7a6',draw:g=>inkText(g,'Friends, will you help us?',0,13,40,{col:'#b35a00'})})}
  if(t>C.o03-.2){riddleCard(g,'I am the first school day of the week.',seg(t,C.o03-.1,C.o03+.3),2620)}};

/* 3. Monday Pool — the page floats; Panda dives */
SC.pool=(g,t,S)=>{const lt=t-S.start,C=S.cues,dv=at(S,'p03','Splash')-.25,up=C.d06+.3,got=gotT(0);
  const c=rig(lt,[[0,{x:560,y:380,z:1.05}],[C.d05-S.start,{x:640,y:390,z:1.0},'io'],[dv-S.start,{x:700,y:420,z:1.18},'io'],[S.end-S.start,{x:680,y:400,z:1.08},'io']]);
  g.save();camApply(g,shake(c,'impact',t,{t0:dv+.35,amp:7}));
  sky(g,'#a9dcf3','#f1fbff');wash(g,200,100,160,'#ffe08a',1,21,.7);cloud(g,700,90,.9,22);
  blob(g,rectP(-400,330,2200,240),'#e9f2f5',{seed:2700,w:2});for(let i=0;i<22;i++)blob(g,rectP(-400+i*100,340,96,96),i%2?'#ffffff':'#dcecf3',{seed:2701+i,w:1,ink:false});
  ground(g,560,'#e7dcc6',2730);
  // the pool
  blob(g,rrectP(300,470,720,150,26),'#3fa8d8',{seed:2740,w:2.6});
  for(let i=0;i<4;i++){const y=490+i*30,o=(t*30+i*40)%90,p=[];for(let x=320;x<1000;x+=30)p.push([x+o*.3,y+Math.sin(x*.05+t*2+i)*3]);inkPoly(g,p,{w:1.4,seed:2741+i,col:'rgba(255,255,255,.6)'})}
  for(const lx of[960]){inkPoly(g,[[lx,470],[lx,400],[lx+30,380]],{w:6,col:'#9aa9b8',seed:2750});inkPoly(g,[[lx+30,470],[lx+30,400],[lx+60,380]],{w:6,col:'#9aa9b8',seed:2751})}
  // the Monday page bobbing; Panda brings it out
  const bob=Math.sin(t*2)*6;if(t<up)dayPage(g,700,520+bob,74,0,{rot:Math.sin(t*1.3)*.15,glowA:.35+.15*Math.sin(t*4)});
  // Panda: waits on the edge, leaps, splashes, pops up with the page
  const leap=seg(t,dv,dv+.6);let px=lerp(380,560,ease(seg(lt,.2,1.6))),py=470,ph=150,pal=1;
  if(t>dv){px=lerp(560,690,leap);py=470-Math.sin(leap*Math.PI)*120+leap*80;pal=1-seg(leap,.85,1)}
  if(t>up){px=700;py=lerp(600,545,ease(seg(t,up,up+.5)));pal=1}
  if(t<=up)drawPet(g,'panda',px,py,ph,{face:1,talk:talkOf('P',t),alpha:pal,tilt:t>dv?leap*1.2:0,hop:t<dv?hopOf(t,C.p02,24):0});
  else{drawPet(g,'panda',px,py,ph,{face:1,talk:talkOf('P',t),shadow:false});dayPage(g,px+70,py-120,64,0,{rot:-.2+Math.sin(t*3)*.08});
    blob(g,rrectP(300,560,720,60,20),'#3fa8d8',{seed:2760,w:1.4,alpha:.85})}
  if(t>dv+.5&&t<dv+1.4){const k=seg(t,dv+.5,dv+1.4);for(let i=0;i<12;i++){const a=-Math.PI*(.1+.8*hash2(i,1,2770)),r=60+k*140*hash2(i,2,2770);g.fillStyle=`rgba(200,235,255,${1-k})`;g.beginPath();g.arc(690+Math.cos(a)*r,560+Math.sin(a)*r*.9+k*k*90,8,0,7);g.fill()}}
  drawPet(g,'owl',230,560,128,{face:1,talk:talkOf('O',t),hop:hopOf(t,C.o04,24)});drawPet(g,'dragon',1120,560,150,{talk:0,hop:hopOf(t,dv+.6,30)});drawPet(g,'fox',1240,560,130,{hop:hopOf(t,dv+.7,26)});
  if(t>C.p02+.3&&t<dv)thought(g,560,300,150,100,seg(t,C.p02+.3,C.p02+.7)*(1-seg(t,dv-.3,dv)),g=>inkText(g,'?',0,20,70,{col:'#e2382c'}));
  g.restore();
  chip(g,'Monday · the swimming pool',seg(lt,.1,.7));pageHUD(g,t,seg(lt,.2,.8));
  if(t>C.d05-.1&&t<C.p03)card(g,640,190,700,80,seg(t,C.d05,C.d05+.3),{seed:2780,fill:'#fffaf0',wash:'#f6d27a',draw:g=>inkText(g,'What does Panda do on Mondays?',0,12,36,{col:'#b35a00'})});
  sayCard(g,'I go swimming on Mondays.',cardK(t,C.p03,S.end),190,DCOL[0],'#ffd5cf')};

/* 4. Tuesday Field — MONDAY · ____ · WEDNESDAY scoreboard; a ball for Dragon */
SC.field=(g,t,S)=>{const lt=t-S.start,C=S.cues,open=gateT('q3')+.05,ct=at(S,'r03','Catch'),got=gotT(1);
  const c=rig(lt,[[0,{x:560,y:380,z:1.05}],[C.r02-S.start,{x:720,y:350,z:1.12},'io'],[C.r03-S.start,{x:720,y:350,z:1.12}],[ct-S.start,{x:640,y:380,z:1.0},'io']]);
  g.save();camApply(g,c);sky(g,'#9fd0ee','#eef8fb');cloud(g,300,100,1,31);cloud(g,1000,120,.7,33);
  blob(g,subdiv([[-400,430],[1800,410],[1800,700],[-400,700]],24),'#b9dc8f',{seed:2800,w:2});ground(g,560,'#86c063',2801);
  for(let i=0;i<5;i++)inkPoly(g,[[-400,580+i*30],[1800,575+i*30]],{w:2,col:'rgba(255,255,255,.35)',seed:2802+i});
  // goal
  inkPoly(g,[[160,560],[160,390],[400,390],[400,560]],{w:7,col:'#ffffff',seed:2810,closed:false});hatch(g,rectP(165,395,230,160),{ang:.8,sp:16,cross:true,col:'rgba(255,255,255,.4)',seed:2811});
  // scoreboard
  blob(g,rectP(750,330,20,230),'#6b4526',{seed:2820,w:2});blob(g,rrectP(540,150,440,190,16),'#2e3b4e',{seed:2821,w:2.6});
  const words=['MONDAY',t>=open?'TUESDAY':'_ _ _ _','WEDNESDAY'];words.forEach((w,i)=>{const lit=i===1&&t>=open;inkText(g,w,760,205+i*52,i===1?40:30,{col:lit?'#ffcf33':i===1?'#9aa9b8':'#bfe3f7'});if(lit&&t<open+1.5)sparkles(g,760,195+i*52,t-open,2830,12,140)});
  // the Tuesday page stuck on the board, drops when unlocked
  const drop=seg(t,open+.2,open+1);if(t<ct+.2){const py=lerp(205,520,easeIn(drop));dayPage(g,935,py,60,1,{blank:t<open,rot:.2+drop*2,glowA:.3})}
  // the ball + Dragon's catch
  const bx=lerp(1100,520,seg(t,ct-.3,ct+.5)),by=520-Math.sin(seg(t,ct-.3,ct+.5)*Math.PI)*160,bb=Math.abs(Math.sin((t-C.d08)*7))*80*(t>C.d08?1-seg(t,C.d08,endOf(S,'d08')):0);
  if(t>ct-.3)football(g,t<ct+.5?bx:520,(t<ct+.5?by:500-bb),26,t*6);
  drawPet(g,'dragon',lerp(240,520,ease(seg(lt,.3,2))),600,160,{face:1,talk:talkOf('R',t),hop:hopOf(t,ct+.4,40)+walkBob(t,lt<2,4)});
  drawPet(g,'fox',lerp(60,330,ease(seg(lt,.4,2.2))),600,140,{face:1,talk:talkOf('F',t),hop:walkBob(t,lt<2.2,1)});
  drawPet(g,'owl',1080,590,128,{talk:0,hop:hopOf(t,open,24)});drawPet(g,'panda',1220,600,145,{hop:hopOf(t,open+.1,24)});
  if(t>got)dayPage(g,600,420,52,1,{rot:-.2});
  pointAt(g,600,200,700,250,seg(t,at(S,'r02','something'),at(S,'r02','something')+.4)*(1-seg(t,open-.2,open)));
  g.restore();
  chip(g,'Tuesday · the big field',seg(lt,.1,.7));pageHUD(g,t,seg(lt,.2,.8));
  sayCard(g,'On Tuesdays, we play ball!',cardK(t,C.r03,S.end),112,DCOL[1],'#f7d7a6')};

/* 5. Wednesday/Thursday — the Game Arcade; Robot asks about Fox's week */
function cabinet(g,x,y,s,col,seed,t){g.save();g.translate(x,y);g.scale(s,s);blob(g,[[-60,0],[-60,-230],[-40,-260],[60,-260],[60,0]],col,{seed,w:2.4});
  blob(g,rrectP(-45,-220,90,80,8),'#16213a',{seed:seed+1,w:1.8});for(let i=0;i<4;i++){const f=Math.sin(t*3+i+seed)>.2;blob(g,rectP(-35+i*20,-200+((i*17+Math.floor(t*4))%40),12,12),f?'#ffcf33':'#5ce0ff',{seed:seed+2+i,w:.8,ink:false})}
  blob(g,rectP(-50,-130,100,30),'#2e3b4e',{seed:seed+8,w:1.6});blob(g,ell(-20,-115,8,8,8),'#e2382c',{seed:seed+9,w:1});blob(g,ell(10,-115,8,8,8),'#ffcf33',{seed:seed+10,w:1});g.restore()}
SC.arcade=(g,t,S)=>{const lt=t-S.start,C=S.cues,win=at(S,'b03','Here'),scr=seg(t,C.d10-.2,C.d10+.3);
  const c=rig(lt,[[0,{x:640,y:380,z:1.05}],[C.b02-S.start,{x:640,y:340,z:1.12},'io'],[C.f04-S.start,{x:640,y:380,z:1.0},'io']]);
  g.save();camApply(g,c);g.fillStyle='#2b2140';g.fillRect(-500,-400,2400,1500);wash(g,640,250,520,'#6a4fc9',1,41,.35);
  for(let i=0;i<9;i++){const x=-60+i*170;g.fillStyle=`rgba(255,${180+i*8},90,${.35+.25*Math.sin(t*3+i)})`;g.beginPath();g.arc(x,40,10,0,7);g.fill()}
  blob(g,rectP(-400,560,2200,400),'#3e3060',{seed:2900,w:2});for(let i=0;i<14;i++)for(let j=0;j<3;j++)blob(g,rectP(-400+i*160+(j%2)*80,570+j*40,78,38),(i+j)%2?'#4b3b72':'#3e3060',{seed:2901+i*3+j,w:.6,ink:false});
  cabinet(g,120,570,1,'#e2382c',2950,t);cabinet(g,1160,570,1,'#1d9ae0',2960,t);
  // the big screen: Fox's week
  blob(g,rrectP(370,90,540,330,20),'#16213a',{seed:2970,w:3});blob(g,rrectP(390,110,500,290,12),'#1f2f52',{seed:2971,w:1.6});
  if(scr>0){g.save();g.globalAlpha=scr;inkText(g,"Fox's week",640,150,34,{col:'#ffcf33'});
    DAY.forEach((d,i)=>{const y=184+i*31,on=i===2||i===3;inkText(g,d,470,y+8,22,{col:on?'#ffffff':'#7f8db0',align:'left'});inkText(g,on?'computer games':i<5?'school':'-',820,y+8,22,{col:on?'#5ce0ff':'#7f8db0',align:'right'});
      if(on){g.strokeStyle='#5ce0ff';g.lineWidth=2;g.strokeRect(460,y-12,380,28)}});g.restore()}
  else{inkText(g,'GAME',640,230,70,{col:'#ff5ca8'});inkText(g,'ARCADE',640,300,56,{col:'#5ce0ff'})}
  // two pages pop out of the screen
  const pop=seg(t,win,win+.8);if(pop>0)for(const[i,dx]of[[2,-90],[3,90]]){const k=back(pop);dayPage(g,640+dx*k,360-140*k,70,i,{rot:dx>0?.15:-.15,glowA:.4*(1-pop)})}
  drawPet(g,'robot',640,590,150,{talk:talkOf('B',t),hop:hopOf(t,C.b01,20)+hopOf(t,win,30),tilt:Math.sin(t*2)*.04});
  drawPet(g,'fox',lerp(-80,400,ease(seg(lt,.2,1.8))),600,145,{face:1,talk:talkOf('F',t),hop:walkBob(t,lt<1.8,1)+hopOf(t,C.f04,26)});
  drawPet(g,'dragon',lerp(-260,250,ease(seg(lt,.3,2))),600,155,{face:1,hop:walkBob(t,lt<2,4)});
  drawPet(g,'owl',lerp(1500,900,ease(seg(lt,.3,2))),595,128,{talk:talkOf('O',t),hop:walkBob(t,lt<2,2)});drawPet(g,'panda',lerp(1600,1030,ease(seg(lt,.4,2.2))),600,145,{hop:walkBob(t,lt<2.2,3)});
  g.restore();
  chip(g,'Wednesday & Thursday · the Game Arcade',seg(lt,.1,.7));pageHUD(g,t,seg(lt,.2,.8));
  if(t>C.b02-.1&&t<C.f04)card(g,640,455,760,64,seg(t,C.b02,C.b02+.3),{seed:2980,fill:'#fffaf0',wash:'#dcd6f5',draw:g=>inkText(g,'Do you play computer games on Wednesdays?',0,11,32,{col:'#5a4fb0'})});
  card(g,330,420,280,76,cardK(t,C.f04,S.end),{seed:2985,fill:'#fffaf0',wash:'#cde8b5',draw:g=>inkText(g,'Yes, I do!',0,13,40,{col:'#1b6e2c'})})};

/* 6. Friday — the muddy pitch in the rain; u-words dig out the page; Dragon's splat */
SC.mud=(g,t,S)=>{const lt=t-S.start,C=S.cues,open=gateT('q5'),up=at(S,'r05','Up comes'),sp=at(S,'d12','Splat')-.15;
  const c=shake(rig(lt,[[0,{x:640,y:380,z:1.05}],[C.r04-S.start,{x:760,y:430,z:1.2},'io'],[C.r05-S.start,{x:680,y:400,z:1.05},'io']]),'impact',t,{t0:sp,amp:8});
  g.save();camApply(g,c);sky(g,'#9aa7b4','#d9dfe4');for(const[x,y,s]of[[200,90,1.2],[700,70,1.4],[1100,110,1.1]])blob(g,ell(x,y,140*s,50*s,18),'#b8c1ca',{seed:3000+x,w:1.6});
  blob(g,subdiv([[-400,440],[1800,420],[1800,700],[-400,700]],24),'#8fb07a',{seed:3010,w:2});ground(g,560,'#7aa363',3011);
  blob(g,subdiv([[200,600],[500,570],[900,580],[1150,610],[1000,660],[400,665]],24),'#7a5532',{seed:3020,w:2.4});
  for(let i=0;i<8;i++){const x=300+i*100+Math.sin(i*2.1)*30;blob(g,ell(x,612+Math.sin(i)*14,26,8,10),'#5e3f24',{seed:3021+i,w:1,ink:false})}
  inkPoly(g,[[1150,560],[1150,400],[1350,400],[1350,560]],{w:7,col:'#ffffff',seed:3030,closed:false});
  // ducks splashing in the mud (Mum jumps in the mud with the ducks!)
  for(let i=0;i<3;i++)duck(g,380+i*230,620+Math.sin(t*3+i)*4,.7,3040+i*5,Math.abs(Math.sin(t*5+i)));
  // the page: a corner in the mud, then it rises
  const rise=seg(t,up,up+1);if(t<gotT(4)+.6){dayPage(g,700,lerp(640,470,ease(rise)),66,4,{rot:lerp(.6,-.1,rise),alpha:t<up?1:1,glowA:.5*rise,blank:false});if(t<up)blob(g,subdiv([[640,628],[760,624],[770,660],[630,660]],10),'#7a5532',{seed:3050,w:1.6})}
  // u-words pop up as Dragon says them
  if(t>C.r05)['mud','duck','sun','jump','bus'].forEach((w,i)=>{const k=seg(t,at(S,'r05',w),at(S,'r05',w)+.3)*(1-seg(t,C.d12,C.d12+.4));if(k<=0)return;const x=260+i*190,y=210+Math.sin(i*1.7)*30;
    card(g,x,y,160,70,k,{seed:3060+i,fill:'#fffaf0',wash:'#f7d7a6',draw:g=>uWord(g,w,0,13,40)})});
  // Dragon: points, then kicks the ball into the mud — splat!
  const kick=seg(t,C.d12,sp);football(g,lerp(560,880,easeIn(kick)),600-Math.sin(kick*Math.PI)*120,22,t*8);
  drawPet(g,'dragon',lerp(-100,470,ease(seg(lt,.2,1.8))),600,160,{face:1,talk:talkOf('R',t),hop:walkBob(t,lt<1.8,4)+hopOf(t,C.d12+.1,24),sq:t>sp&&t<sp+.4?.4:0});
  if(t>sp){mudSplat(g,880,610,1.2,3070,seg(t,sp,sp+.25));for(const[dx,dy]of[[-20,-60],[30,-110],[-10,-140]])mudSplat(g,470+dx,600+dy,.25,3080+dx,seg(t,sp+.1,sp+.3))}
  drawPet(g,'owl',lerp(-260,250,ease(seg(lt,.3,2))),600,128,{face:1,talk:talkOf('O',t),hop:walkBob(t,lt<2,2)});
  drawPet(g,'fox',1040,600,138,{hop:hopOf(t,up+.2,28)});drawPet(g,'panda',1220,606,148,{hop:hopOf(t,up+.3,28)});
  // rain
  g.save();g.strokeStyle='rgba(225,235,245,.7)';g.lineWidth=2;for(let i=0;i<90;i++){const x=(hash2(i,1,3090)*1600+t*120)%1600-160,y=((hash2(i,2,3090)*900+t*(520+hash2(i,3,3090)*200))%900)-100;g.beginPath();g.moveTo(x,y);g.lineTo(x-8,y+22);g.stroke()}g.restore();
  g.restore();
  chip(g,'Friday · the football pitch',seg(lt,.1,.7));pageHUD(g,t,seg(lt,.2,.8));
  if(t>C.o05-.1&&t<C.r05)card(g,640,190,560,80,seg(t,C.o05,C.o05+.3),{seed:3095,fill:'#fffaf0',wash:'#f7d7a6',draw:g=>{inkText(g,'u',-150,13,44,{col:'#e2382c'});inkText(g,'as in',-50,13,36,{col:'#5a3d28'});uWord(g,'mud',90,13,44)}})};

/* 7. Saturday — the locked stage; days in order open the curtain; Panda sings */
SC.stage=(g,t,S)=>{const lt=t-S.start,C=S.cues,open=gateT('q6')+.1,op=ease(seg(t,open,open+1.4));
  const c=rig(lt,[[0,{x:640,y:360,z:1.0}],[C.o06-S.start,{x:640,y:330,z:1.1},'io'],[C.p05-S.start,{x:640,y:370,z:1.05},'io']]);
  g.save();camApply(g,c);g.fillStyle='#3a2340';g.fillRect(-500,-400,2400,1500);
  blob(g,rectP(-400,520,2200,400),'#8a5a2b',{seed:3100,w:2.4});for(let i=0;i<16;i++)inkPoly(g,[[-400+i*150,520],[-430+i*150,900]],{w:1.4,col:'rgba(60,35,15,.35)',seed:3101+i});
  blob(g,rectP(-400,-100,2200,90),'#9e1f2a',{seed:3120,w:2});for(let i=0;i<14;i++)blob(g,ell(-300+i*160,-10,80,30,14,0,Math.PI),'#b8303c',{seed:3121+i,w:1.6});
  // Saturday page on a music stand behind the curtain
  inkPoly(g,[[640,520],[640,380]],{w:5,col:'#3a2a1a',seed:3140});dayPage(g,640,330,90,5,{glowA:.4*op});
  // curtains
  for(const sd of[-1,1]){const x0=640+sd*(4+op*520);g.save();blob(g,sd<0?rectP(-400,0,x0+400,525):rectP(x0,0,1800-x0,525),'#c2343f',{seed:3150+sd,w:2.6});
    for(let i=0;i<8;i++){const x=sd<0?x0-30-i*70:x0+30+i*70;inkPoly(g,[[x,0],[x+Math.sin(t+i)*6,520]],{w:2.4,col:'rgba(90,15,25,.45)',seed:3160+i+sd*10})}g.restore()}
  // the lock: six jumbled day cards (sorted once the curtain is open)
  if(op<1){g.save();g.globalAlpha=1-op;blob(g,ell(640,250,42,46,16),'#f6c445',{seed:3170,w:2.4});inkPoly(g,[[612,220],[612,190],[668,190],[668,220]],{w:7,col:'#9aa9b8',seed:3171,closed:false});
    const order=[3,0,5,1,4,2];order.forEach((d,k)=>{const x=640+(k-2.5)*120,y=380+Math.sin(k*1.9)*30;dayPage(g,x,y,62,d,{rot:Math.sin(k*2.3)*.35})});g.restore()}
  // spotlights
  if(op>0){for(const x of[420,860]){g.save();g.globalAlpha=.18*op;g.fillStyle='#fff4c2';g.beginPath();g.moveTo(x,-60);g.lineTo(x-160,560);g.lineTo(x+160,560);g.fill();g.restore()}}
  const sing=t>C.p05&&t<endOf(S,'p05')+.6;
  drawPet(g,'panda',lerp(300,520,op),600,155,{face:1,talk:talkOf('P',t),hop:sing?Math.abs(Math.sin(t*6))*18:hopOf(t,C.p04,20),tilt:sing?Math.sin(t*6)*.08:0});
  if(sing)for(let i=0;i<4;i++){const k=((t-C.p05)*.8+i*.25)%1;note(g,520+Math.sin(k*6+i)*40+i*20,470-k*200,1,['#e2382c','#1d9ae0','#7b5bd6','#2e9b74'][i])}
  drawPet(g,'owl',150,600,128,{face:1,talk:talkOf('O',t)});drawPet(g,'dragon',1030,600,155,{hop:hopOf(t,open+.4,30)});drawPet(g,'fox',1200,600,138,{hop:hopOf(t,open+.5,30)});
  g.restore();
  chip(g,'Saturday · the big stage',seg(lt,.1,.7));pageHUD(g,t,seg(lt,.2,.8));
  sayCard(g,'On Saturdays, we sing!',cardK(t,C.p05,S.end),112,DCOL[5],'#dcd6f5')};

/* 8. Sunday forest — TWIST: a lost little rabbit has the last page; the help question */
SC.forest=(g,t,S)=>{const lt=t-S.start,C=S.cues,seen=at(S,'d16','Behind'),joy=C.a05;
  const c=rig(lt,[[0,{x:520,y:380,z:1.05}],[seen-S.start,{x:760,y:420,z:1.2},'io'],[C.r06-S.start,{x:640,y:400,z:1.05},'io'],[C.a01-S.start,{x:820,y:430,z:1.28},'io'],[C.p06-S.start,{x:640,y:400,z:1.05},'io'],[C.a04-S.start,{x:800,y:430,z:1.25},'io'],[C.f06-S.start,{x:640,y:390,z:1.0},'io']]);
  g.save();camApply(g,c);sky(g,'#3b3f6e','#8a6f9e');wash(g,1100,120,90,'#fff4c2',1,51,.8);
  layer(g,c,.5,g=>{for(let i=0;i<9;i++)tree(g,-100+i*190,560,.85+hash2(i,1,3200)*.4,3201+i*4,i%2?'#2f5a4a':'#28503f')});
  ground(g,590,'#3f6a45',3240);
  tree(g,960,620,1.15,3250,'#2f6248');
  // the rabbit: hidden behind the tree, steps out once seen; sobs, then jumps for joy
  const out=ease(seg(t,seen,seen+1)),sob=t<joy?Math.sin(t*9)*.04:0;
  drawPet(g,'rabbit',lerp(1010,880,out),622,110,{talk:talkOf('A',t),tilt:sob,hop:hopOf(t,joy,50)+hopOf(t,joy+.5,40),alpha:seg(t,seen-.4,seen)});
  if(t>seen-.4&&t<joy+1.2)dayPage(g,lerp(1010,880,out)-58,560,48,6,{rot:-.3,blank:t<joy,glowA:t>joy?.6:0});
  if(t>C.f05&&t<joy)for(let i=0;i<2;i++){const k=((t*1.3)+i*.5)%1;g.fillStyle=`rgba(150,210,255,${1-k})`;g.beginPath();g.arc(lerp(1010,880,out)+(i?14:-14),540+k*40,4,0,7);g.fill()}
  const walk=ease(seg(lt,.3,3));
  drawPet(g,'dragon',lerp(-200,420,walk),622,155,{face:1,talk:talkOf('R',t),hop:walkBob(t,walk<1,4)+hopOf(t,C.r06,30)});
  drawPet(g,'fox',lerp(-60,560,walk),618,138,{face:1,talk:talkOf('F',t),hop:walkBob(t,walk<1,1)+hopOf(t,joy+.2,30)});
  drawPet(g,'owl',lerp(-340,280,walk),620,128,{face:1,talk:talkOf('O',t),hop:walkBob(t,walk<1,2)});
  drawPet(g,'panda',lerp(-480,150,walk),626,148,{face:1,talk:talkOf('P',t),hop:walkBob(t,walk<1,3)});
  for(let i=0;i<14;i++){const x=(hash2(i,1,3260)*1400+Math.sin(t*.7+i)*40),y=200+hash2(i,2,3260)*380+Math.sin(t*1.3+i*2)*20;glow(g,x,y,14,'rgba(255,240,140,A)',.6+.4*Math.sin(t*4+i))}
  const rs=toScreen(g,880,560);g.restore();
  darkness(g,.45*(1-seg(t,joy,joy+1)),[[rs.x,rs.y,220,1],[640,420,420,.8]]);
  chip(g,'Sunday · the dark forest',seg(lt,.1,.7));pageHUD(g,t,seg(lt,.2,.8));
  card(g,640,112,620,86,cardK(t,C.o08,C.a04),{seed:3270,fill:'#fffaf0',wash:'#cde8b5',draw:g=>inkText(g,"It's okay to ask for help!",0,13,40,{col:'#2e7d4f'})});
  if(t>C.f06-.1&&t<C.a05)riddleCard(g,'I come after Saturday. I am a weekend day.',seg(t,C.f06,C.f06+.3),3280)};

/* 9. Lake — the pages fly home; Rabbit's family picnic; healthy or not */
SC.lake=(g,t,S)=>{const lt=t-S.start,C=S.cues,pan=ease(seg(t,C.a06-.8,C.a06+.2)),sorted=gateT('q8')+.1;
  g.save();camApply(g,{x:lerp(640,1940,pan),y:380,z:1,r:0});
  // left half: the calendar in town, pages flying back
  townBG(g,t);calendar(g,330,190,.82,i=>{const k=ease(seg(lt,.4+i*.22,1.1+i*.22));return{x:(1-k)*(hash2(i,1,3300)*900-450),y:(1-k)*(-400-hash2(i,2,3300)*200),rot:(1-k)*4,alpha:seg(lt,.4+i*.22,.5+i*.22),glowA:k<1?.5:0}});
  for(const[n,x,f,h,k]of[['dragon',200,1,155,'R'],['fox',430,1,135,'F'],['rabbit',600,1,105,'A'],['owl',880,0,125,'O'],['panda',1080,0,148,'P']])drawPet(g,n,x,640,h,{face:f,talk:talkOf(k,t),hop:Math.abs(Math.sin(t*4+x))*10*seg(lt,1.8,2.2)});
  // right half: the lake picnic (world x 1300..2600)
  g.save();g.beginPath();g.rect(1300,-600,3000,2000);g.clip();g.translate(1300,-70);sky(g,'#9fd0ee','#fbf1d8');
  blob(g,subdiv([[-200,470],[1500,460],[1500,560],[-200,560]],20),'#4fa3d1',{seed:3310,w:2});for(let i=0;i<3;i++){const p=[];for(let x=-200;x<1500;x+=40)p.push([x+(t*20%40),490+i*22+Math.sin(x*.04+t*2+i)*3]);inkPoly(g,p,{w:1.4,seed:3311+i,col:'rgba(255,255,255,.55)'})}
  ground(g,560,'#9fcf7a',3320);tree(g,1140,560,.9,3330);bush(g,120,580,.9,3340);
  blob(g,subdiv([[360,600],[880,590],[920,660],[320,670]],12),'#f6d6d6',{seed:3350,w:2});for(let i=0;i<6;i++)inkPoly(g,[[380+i*90,598],[350+i*95,668]],{w:2,col:'rgba(226,56,44,.35)',seed:3351+i});
  // picnic things (the unhealthy ones vanish once sorted)
  const gone=seg(t,sorted,sorted+.4);blob(g,ell(470,615,22,20,14),'#e2382c',{seed:3360,w:1.8});inkPoly(g,[[470,596],[476,584]],{w:3,col:'#6b4526',seed:3361});
  blob(g,[[560,606],[640,616],[560,626]],'#f28c28',{seed:3362,w:1.8});
  if(gone<1){g.save();g.globalAlpha=1-gone;for(let i=0;i<4;i++)blob(g,ell(720+i*26,612+(i%2)*10,12,9,10),['#e85d9a','#1d9ae0','#f6c445','#7b5bd6'][i],{seed:3363+i,w:1.4});
    blob(g,rrectP(800,560,110,74,8),'#2e3b4e',{seed:3370,w:2});blob(g,rrectP(810,568,90,54,6),'#5ce0ff',{seed:3371,w:1,alpha:.6+.3*Math.sin(t*9)});g.restore()}
  if(gone>0&&gone<1)sparkles(g,800,600,gone*1.1,3380,14,120);
  drawPet(g,'rabbit_mum',1000,600,150,{talk:0,hop:hopOf(t,C.a06+.6,30)});drawPet(g,'rabbit',lerp(400,1100,ease(seg(t,C.a06-.4,C.a06+.6))),610,108,{face:1,talk:talkOf('A',t),hop:hopOf(t,C.a06,40)});
  drawPet(g,'panda',260,600,148,{face:1,talk:talkOf('P',t),hop:hopOf(t,C.p07,30)});drawPet(g,'owl',150,470,120,{face:1,talk:talkOf('O',t),shadow:false,hop:Math.sin(t*3)*6});
  drawPet(g,'dragon',90,612,150,{face:1});drawPet(g,'fox',1250,612,130,{face:0});
  g.restore();g.restore();
  chip(g,pan<.5?'Back in Pet Town':'Sunday · the lake',seg(lt,.1,.7));
  sayCard(g,'Eat healthy food, keep fit, and have fun!',cardK(t,C.p07,S.end),112,'#2e7d4f','#cde8b5')};

/* 10. Play — hide-and-seek by the lake; chant; the end */
SC.play=(g,t,S)=>{const lt=t-S.start,C=S.cues,T=S.end-S.start,found=endOf(S,'a07')+.3,fin=C.f07;
  const c={x:640,y:lerp(400,370,ease(seg(lt,0,T-1))),z:lerp(1.12,1.0,ease(seg(lt,0,T-1))),r:0};
  g.save();camApply(g,c);sky(g,'#9fd0ee','#fbf1d8');wash(g,640,200,420,'#f6d27a',1,61,.45);cloud(g,240,120,1,62);cloud(g,1020,90,.9,64);
  blob(g,subdiv([[-400,470],[1800,460],[1800,560],[-400,560]],20),'#4fa3d1',{seed:3400,w:2});ground(g,560,'#9fcf7a',3401);
  tree(g,200,600,.95,3410);bush(g,640,610,1,3420);blob(g,subdiv([[960,610],[990,520],[1080,500],[1150,540],[1170,610]],10),'#9aa3ad',{seed:3430,w:2.2});
  // hide: before `found` the hiders are tucked away; they pop out one by one
  const po=i=>back(seg(t,found+i*.35,found+i*.35+.4));
  const all=t>fin-.3;
  drawPet(g,'rabbit',all?520:260,610,110,{face:1,talk:talkOf('A',t),hop:all?Math.abs(Math.sin(t*5))*20:0,tilt:t<found?0:0});
  if(t<found)blob(g,ell(240,540,30,16,10),'#c9a27a',{seed:3440,w:1.4});
  drawPet(g,'panda',all?640:640,lerp(660,610,po(0)),148,{talk:talkOf('P',t),alpha:all||po(0)>0?1:0,hop:all?Math.abs(Math.sin(t*5+1))*20:0});
  drawPet(g,'fox',all?780:1060,lerp(640,560,po(1)),130,{talk:talkOf('F',t),alpha:all||po(1)>0?1:0,hop:all?Math.abs(Math.sin(t*5+2))*20:0});
  drawPet(g,'owl',all?900:330,all?600:lerp(420,380,po(2)),120,{talk:talkOf('O',t),alpha:all||po(2)>0?1:0,shadow:all,hop:all?Math.abs(Math.sin(t*5+3))*20:0});
  drawPet(g,'dragon',all?380:lerp(-120,380,ease(seg(t,C.r07-.6,C.r07))),610,155,{face:1,talk:talkOf('R',t),hop:all?Math.abs(Math.sin(t*5+4))*20:0});
  if(t<found)bush(g,640,630,.6,3450,'#4f8a3a');
  g.restore();
  chip(g,'Sunday · hide-and-seek',seg(lt,.1,.7));
  sayCard(g,'On Sundays, we play hide-and-seek!',cardK(t,at(S,'d19','On Sundays'),C.a07),112,DCOL[6],'#f6d6e6');
  sayCard(g,'When you need help, just ask!',cardK(t,C.o10,C.f07),112,'#2e7d4f','#cde8b5');
  card(g,640,112,720,90,cardK(t,C.f07,C.d20),{seed:3460,fill:'#fffaf0',wash:'#f6d27a',draw:g=>inkText(g,"It's a busy, busy, busy week!",0,14,42,{col:'#b35a00'})});
  if(t>C.d20-.2)calendarMini(g,t,seg(t,C.d20-.2,C.d20+.4));
  const e=seg(t,S.end-1.9,S.end-.2);if(e>0){g.fillStyle=`rgba(243,234,214,${ease(e)})`;g.fillRect(0,0,W,H);
    inkText(g,'The End',640,330,110,{alpha:e,col:'#b35a00',stroke:'#fffaf0',sw:12});inkText(g,'Pet Adventures · The Stolen Week',640,410,38,{alpha:e,col:'#5a3d28'})}};
function calendarMini(g,t,k){card(g,640,120,700,110,k,{seed:3470,fill:'#fffaf0',wash:'#f6d27a',draw:g=>{for(let i=0;i<7;i++)dayPage(g,-270+i*90,-4,54,i,{rot:Math.sin(t*3+i)*.08});}})}

/* ---------- score */
function scoreShot(K,S){const{ev,pad,bass,theme,arp,drums}=K,s=S.start,e=S.end;switch(S.id){
  case'title':theme(s,e,'musicbox',72,'maj',.32);pad(s,e,'strings',48,'maj',.1);break;
  case'square':{const w=snapB(windT(S)),we=snapB(w+WIND_LEN);theme(s,w,'flute',72,'maj',.22);arp(s,w,'pizz',72,'maj',.18,.5,[0,2,4,2]);bass(s,w,60,'maj',.26,'pulse');drums(s,w,'soft',.3);
    ev(w-BAR,'riser',0,BAR,.3);ev(w,'crash',0,0,.45);drums(w,we,'toms',.5);pad(w,we,'strings',45,'min',.16);bass(w,we,45,'min',.3,'pulse');
    pad(we,e,'strings',45,'min',.12);arp(we,e,'musicbox',81,'min',.14,1,[0,3,7,3]);break}
  case'pool':case'field':case'mud':arp(s,e,'pizz',72,'maj',.2,.5,[0,2,4,7]);bass(s,e,60,'maj',.26,'pulse');drums(s,e,'bouncy',.38);theme(s,e,'flute',72,'maj',.16);break;
  case'arcade':arp(s,e,'musicbox',84,'maj',.18,.25,[0,4,7,12]);bass(s,e,57,'min',.28,'eighth');drums(s,e,'quiz',.4);break;
  case'stage':{const o=snapB(gateT('q6'));drums(s,o,'tick',.3);pad(s,o,'strings',45,'min',.12);ev(o,'crash',0,0,.4);theme(o,e,'flute',72,'maj',.26);arp(o,e,'pizz',72,'maj',.2,.5,[0,4,2,4]);bass(o,e,60,'maj',.28);break}
  case'forest':{const j=snapB(S.cues.a05);pad(s,j,'strings',45,'min',.14,.12);theme(s,j,'piano',69,'min',.18,1.5);bass(s,j,45,'min',.18);
    ev(j,'swell',0,1.2,.2);theme(j,e,'strings',72,'maj',.24);pad(j,e,'strings',48,'maj',.12);break}
  case'lake':theme(s,e,'strings',72,'maj',.22);arp(s,e,'musicbox',84,'maj',.14,.5,[0,4,7,4]);bass(s,e,60,'maj',.24);break;
  case'play':{theme(s,e-BAR,'flute',72,'maj',.26);arp(s,e-BAR,'pizz',72,'maj',.18,.5,[0,4,2,4]);bass(s,e-BAR,60,'maj',.28,'pulse');drums(s,e-BAR,'bouncy',.4);
    const f=e-BAR;for(const m of[48,55,60,64,67,72])ev(f,'strings',m,BAR*1.2,.14);ev(f,'musicbox',84,BAR,.3);break}}
}
