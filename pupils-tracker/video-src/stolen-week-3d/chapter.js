/* The Stolen Week 3D — Pet Adventures, episode 1 in a live three.js world (English, Year 2 · Super Minds 1 Unit 5 "Free time")
   Interactive: the video STOPS at 8 challenges (GATES) and continues only after a correct answer.
   Teaches: days of the week; I (go swimming) on (Mondays); Do you…? Yes, I do / No, I don't; letter sound u;
   healthy habits; value — ask for help when you need it.
   Cast = the app's own pet sprites (images/*.png, drawn with img()); narrator only, no host. */
const META={title:'The Stolen Week 3D · Pet Adventures',h1:'Pet Adventures · The Stolen Week 3D (Unit 5 · Free time)',lang:'en'};
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
const TRANS={};  // 3D: camera flights across the town replace the 2D wipes

/* =====================================================================
   CHALLENGES (engine gates) — the video stops after line `after`
   ===================================================================== */
const GATES=[
 {id:'q1',after:'o03',type:'choice',prompt:'I am the first school day of the week. Who am I?',options:['Monday','Friday','Sunday'],answer:0,hint:'School starts on M…'},
 {id:'q2',after:'d05',type:'picture',prompt:'What does Panda do on Mondays?',options:[{label:'go swimming',icon:'🏊'},{label:'watch TV',icon:'📺'},{label:'play football',icon:'⚽'}],answer:0,hint:'Look where Panda is — at the swimming pool!'},
 {id:'q3',after:'f03',type:'type',prompt:'Monday, ______, Wednesday. Type the missing day!',answer:'Tuesday',accept:['tues day'],hint:'It starts with T. Use the letter tiles!'},
 {id:'q4',after:'d10',ask:'b02',type:'yesno',keepOrder:true,prompt:'"Fox, do you play computer games on Wednesdays?" What does Fox say?',options:['Yes, I do.',"No, I don't.",'Yes, I am.'],answer:0,hint:"Look at Fox's week: Wednesday = computer games."},
 {id:'q5',after:'o05',type:'tapAll',prompt:'Tap ALL the words with the u sound, like mud!',options:['duck','cat','sun','pen','jump','dog','bus'],answers:[0,2,4,6],hint:'Say them out loud: d-u-ck, s-u-n … Find 4!'},
 {id:'q6',after:'o06',type:'order',prompt:'Tap the days in order. Start with Monday!',items:['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],hint:'Sing it: Monday, Tuesday, Wednesday…'},
 {id:'q7',after:'f06',type:'type',prompt:'I come after Saturday. I am a weekend day. Who am I?',answer:'Sunday',hint:'It starts with S and ends with …day.'},
 {id:'q8',after:'o09',type:'sort',prompt:'Healthy or unhealthy? Sort them all!',bins:['😊 Healthy','😟 Unhealthy'],
  items:[{label:'apple',icon:'🍎',bin:0},{label:'sweets',icon:'🍬',bin:1},{label:'play football',icon:'⚽',bin:0},{label:'carrot',icon:'🥕',bin:0},{label:'TV all night',icon:'📺',bin:1},{label:'sleep early',icon:'😴',bin:0}],
  hint:'Healthy = good food, sport and sleep.'},
];
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
   3D WORLD — one low-poly toy Pet Town in three.js (vendor/three.min.js r149, injected by build3d.mjs).
   Every frame is posed from t alone (seek / gates / snap / export stay exact): each SC.* calls begin3,
   poses pets + props, then end3 renders offscreen and draws onto the engine canvas; the 2D cards, HUD and
   subtitles still draw on top. Units: metres, y up. Each place is a group at LOC[place]; pets stand
   on local z≈0 and cameras look toward -z. Camera flights between places replace the 2D wipes.
   ===================================================================== */
const LOC={sq:[0,0],pool:[-30,-22],field:[30,-24],arc:[48,10],mud:[62,-54],stg:[-46,16],for:[-26,52],lake:[22,48],play:[38,58]};
const Xp=px=>(px-640)/80;                              // old 2D screen x → local metres
const PET_H={dragon:2.0,fox:1.75,owl:1.6,panda:1.85,rabbit:1.35,rabbit_mum:1.85,robot:1.9};
const wb=(t,on,seed=0)=>on?Math.abs(Math.sin(t*9+seed))*.15:0;   // walk bob (m)
const hop3=(t,t0,h=.3,d=.45)=>{const u=(t-t0)/d;return u>0&&u<1?Math.sin(u*Math.PI)*h:0};
let R3=null,O=[0,0];const setO=k=>{O=LOC[k]};
const lerp3=(a,b,k)=>[lerp(a[0],b[0],k),lerp(a[1],b[1],k),lerp(a[2],b[2],k)];

/* ---------- textures */
function tex(w,h,draw){const c=mk(w,h),x=c.getContext('2d');draw(x,w,h);const t=new THREE.CanvasTexture(c);t.anisotropy=4;return t}
function radialTex(inner,outer){return tex(128,128,x=>{const gr=x.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,inner);gr.addColorStop(1,outer);x.fillStyle=gr;x.fillRect(0,0,128,128)})}
function checkerTex(a,b,n=8,line=null){const t=tex(256,256,x=>{const s=256/n;for(let i=0;i<n;i++)for(let j=0;j<n;j++){x.fillStyle=(i+j)%2?a:b;x.fillRect(i*s,j*s,s,s)}
  if(line){x.strokeStyle=line;x.lineWidth=2;for(let i=0;i<=n;i++){x.beginPath();x.moveTo(i*s,0);x.lineTo(i*s,256);x.moveTo(0,i*s);x.lineTo(256,i*s);x.stroke()}}});t.wrapS=t.wrapT=THREE.RepeatWrapping;return t}
function textTex(w,h,bg,draw){return tex(w,h,(x,W2,H2)=>{if(bg){x.fillStyle=bg;x.fillRect(0,0,W2,H2)}draw(x,W2,H2)})}

/* ---------- materials + mesh helpers */
const MATS=new Map();
function tm(col,o={}){const k=col+(o.flat?'f':'')+(o.op??'')+(o.map?o.map.uuid:'');let m=MATS.get(k);if(m)return m;
  m=new THREE.MeshToonMaterial({color:col,gradientMap:R3.grad,flatShading:!!o.flat,map:o.map||null});if(o.op!=null){m.transparent=true;m.opacity=o.op;m.depthWrite=false}MATS.set(k,m);return m}
function bm(col,o={}){return new THREE.MeshBasicMaterial({color:col,...o})}
function ink(m,w=.045){const g=m.geometry;g.computeBoundingBox();const s=new THREE.Vector3();g.boundingBox.getSize(s);if(Math.min(s.x,s.y,s.z)<1e-3)return m;
  const c=new THREE.Mesh(g,R3.inkM);c.scale.set((s.x+2*w)/s.x,(s.y+2*w)/s.y,(s.z+2*w)/s.z);c.castShadow=false;c.receiveShadow=false;m.add(c);return m}
// add(parent, geometry, colour|material, {p,r,s,ink,cast,recv,flat})
function add(P,geo,col,o={}){const mat=typeof col==='string'?tm(col,{flat:o.flat,map:o.map,op:o.op}):col;const m=new THREE.Mesh(geo,mat);
  if(o.p)m.position.set(...o.p);if(o.r)m.rotation.set(...o.r);if(o.s)typeof o.s==='number'?m.scale.setScalar(o.s):m.scale.set(...o.s);
  m.castShadow=o.cast!==false;m.receiveShadow=o.recv!==false;if(o.ink!==false&&typeof col==='string'&&o.op==null)ink(m,o.inkW);P.add(m);return m}
function grp(P,p=[0,0,0],ry=0,s=1){const g=new THREE.Group();g.position.set(...p);g.rotation.y=ry;g.scale.setScalar(s);P.add(g);return g}
const BOX=(w,h,d)=>new THREE.BoxGeometry(w,h,d),CYL=(a,b,h,n=10)=>new THREE.CylinderGeometry(a,b,h,n),SPH=(r,d=1)=>new THREE.IcosahedronGeometry(r,d),
  CONE=(r,h,n=8)=>new THREE.ConeGeometry(r,h,n),TOR=(R,r,n=8,m=24,arc)=>new THREE.TorusGeometry(R,r,n,m,arc),PLANE=(w,h,a=1,b=1)=>new THREE.PlaneGeometry(w,h,a,b);
function flatPlane(P,w,d,col,p,o={}){return add(P,PLANE(w,d),col,{p,r:[-Math.PI/2,0,0],ink:false,cast:false,...o})}

/* ---------- reusable props */
function house(P,x,z,wall,roof,ry=0,s=1){const g=grp(P,[x,0,z],ry,s);add(g,BOX(3.2,2.4,2.8),wall,{p:[0,1.2,0]});
  const rf=add(g,CONE(2.55,1.7,4),roof,{p:[0,3.25,0],r:[0,Math.PI/4,0],flat:true});rf.scale.set(1,1,.9);
  add(g,BOX(.4,1,.4),'#9a6b4a',{p:[.9,3.5,-.4]});add(g,BOX(.72,1.25,.1),'#8a5a2b',{p:[0,.62,1.42],inkW:.03});
  for(const sx of[-.95,.95])add(g,BOX(.62,.56,.08),'#bfe3f7',{p:[sx,1.55,1.42],inkW:.03});return g}
function tree(P,x,z,s=1,col='#3f8a3a',seed=1){const g=grp(P,[x,0,z],hash2(seed,1,77)*6,s);add(g,CYL(.17,.26,1.7,7),'#6b4526',{p:[0,.85,0]});
  add(g,SPH(1.1,0),col,{p:[0,2.35,0],flat:true});add(g,SPH(.72,0),col,{p:[-.6,1.95,.25],flat:true});add(g,SPH(.75,0),col,{p:[.6,2.0,-.2],flat:true});return g}
function pine(P,x,z,s=1,col='#2f5a4a',seed=1){const g=grp(P,[x,0,z],hash2(seed,2,77)*6,s);add(g,CYL(.14,.2,1,6),'#5a3a22',{p:[0,.5,0]});
  for(let i=0;i<3;i++)add(g,CONE(1.2-i*.3,1.4,7),col,{p:[0,1.5+i*.8,0],flat:true});return g}
function bush(P,x,z,s=1,col='#5e9a45'){const g=grp(P,[x,0,z],0,s);add(g,SPH(.6,0),col,{p:[-.45,.42,0],flat:true});add(g,SPH(.7,0),col,{p:[.35,.5,-.1],flat:true});add(g,SPH(.5,0),col,{p:[0,.85,.1],flat:true});return g}
function cloud(P,x,y,z,s=1){const g=grp(P,[x,y,z],0,s),w=bm('#ffffff');for(const[a,b,c,r]of[[0,0,0,1.6],[1.6,-.3,0,1.2],[-1.6,-.3,0,1.1],[.6,.8,0,1.1]]){const m=new THREE.Mesh(SPH(r,1),w);m.position.set(a,b,c);g.add(m)}return g}
function goal(P,x,z,w=3,h=2.1){const g=grp(P,[x,0,z]);for(const sx of[-w/2,w/2])add(g,CYL(.07,.07,h,8),'#ffffff',{p:[sx,h/2,0]});
  add(g,CYL(.07,.07,w+.14,8),'#ffffff',{p:[0,h,0],r:[0,0,Math.PI/2]});
  const net=checkerTex('rgba(255,255,255,.0)','rgba(255,255,255,.0)',8,'rgba(255,255,255,.75)');net.repeat.set(3,2);
  for(const[pp,rr,ww,hh]of[[[0,h/2,-.9],[0,0,0],w,h],[[0,h,-.45],[-Math.PI/2,0,0],w,.9]]){const m=new THREE.Mesh(PLANE(ww,hh),new THREE.MeshBasicMaterial({map:net,transparent:true,side:THREE.DoubleSide,depthWrite:false}));m.position.set(...pp);m.rotation.set(...rr);g.add(m)}return g}
function duck3(P,x,z,s=.5){const g=grp(P,[x,0,z],0,s);add(g,SPH(.5,1),'#ffd23f',{p:[0,.35,0],s:[1.25,.8,.9]});add(g,SPH(.32,1),'#ffd23f',{p:[.5,.85,0]});
  add(g,CONE(.11,.32,6),'#f28c28',{p:[.85,.83,0],r:[0,0,-Math.PI/2]});const e=new THREE.Mesh(SPH(.05,0),bm(INK));e.position.set(.68,.95,.2);g.add(e);const e2=e.clone();e2.position.z=-.2;g.add(e2);
  g.userData.wing=add(g,SPH(.3,0),'#f6c445',{p:[-.1,.5,.42],s:[1.3,.5,.4],flat:true});return g}
function bench(P,x,z,w=4,ry=0){const g=grp(P,[x,0,z],ry);add(g,BOX(w,.14,.55),'#a5713f',{p:[0,.5,0]});for(const sx of[-w/2+.3,w/2-.3])add(g,BOX(.14,.5,.5),'#6b4526',{p:[sx,.25,0]});return g}
function lamp(P,x,z){const g=grp(P,[x,0,z]);add(g,CYL(.07,.1,3,8),'#3e4a5c',{p:[0,1.5,0]});const b=new THREE.Mesh(SPH(.22,1),bm('#ffe7a0'));b.position.y=3.1;g.add(b);return g}
function flowers(P,x,z,n,seed){for(let i=0;i<n;i++){const a=hash2(i,1,seed)*6.28,r=hash2(i,2,seed)*1.4,px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r;
  add(P,CYL(.02,.02,.35,4),'#4f8a3a',{p:[px,.17,pz],ink:false,cast:false});add(P,SPH(.1,0),['#e85d9a','#f6c445','#ffffff','#e2382c','#7b5bd6'][i%5],{p:[px,.38,pz],ink:false,cast:false})}}

/* ---------- day pages: drawn once with the 2D dayPage(), shown as two-sided paper cards */
function buildPages(){R3.pageTex=[];for(let i=0;i<7;i++)R3.pageTex.push([false,true].map(bl=>tex(256,340,x=>dayPage(x,128,170,190,i,{blank:bl}))));
  const backT=tex(256,340,x=>{blob(x,rrectP(33,44,190,251,14),'#f3ead6',{seed:4000,w:2})});R3.halo=radialTex('rgba(255,236,140,1)','rgba(255,236,140,0)');
  R3.pages=[];for(let k=0;k<18;k++){const g=new THREE.Group(),f=new THREE.Mesh(PLANE(1,1.328),bm('#ffffff',{map:R3.pageTex[0][0],transparent:true,alphaTest:.25})),b=new THREE.Mesh(PLANE(1,1.328),bm('#ffffff',{map:backT,transparent:true,alphaTest:.25}));
    b.rotation.y=Math.PI;const h=new THREE.Sprite(new THREE.SpriteMaterial({map:R3.halo,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));h.scale.set(2.2,2.2,1);h.position.z=-.05;
    g.add(f,b,h);g.userData={f,b,h};g.visible=false;R3.scene.add(g);R3.pages.push(g)}}
// page3(day, {x,y,z (local to O), rx,ry,rz, s = page width in m, blank, glow, alpha})
function page3(i,o={}){const g=R3.pages[R3.np++];if(!g)return null;const{x=0,y=0,z=0,rx=0,ry=0,rz=0,s=.95,blank=false,glow=0,alpha=1}=o;if(alpha<=0)return g;
  const{f,b,h}=g.userData;f.material.map=R3.pageTex[i][blank?1:0];
  f.material.opacity=b.material.opacity=alpha;g.visible=true;g.position.set(O[0]+x,y,O[1]+z);g.rotation.set(rx,ry,rz);g.scale.setScalar(s/.742);
  h.visible=glow>0;h.material.opacity=clamp(glow);return g}
// the calendar board's seven slots (square). f(i) → null (gone) or {dx,dy,dz,rx,rz,alpha,glow,s}
const SLOT=i=>[-3.6+i*1.2,3.3,-3.72];
function boardPages(f){for(let i=0;i<7;i++){const p=f(i);if(!p)continue;const[x,y,z]=SLOT(i);page3(i,{x:x+(p.dx||0),y:y+(p.dy||0),z:z+(p.dz||0),rx:p.rx||0,ry:p.ry||0,rz:p.rz||0,s:p.s||.95,alpha:p.alpha??1,glow:p.glow||0})}}

/* ---------- pets: the app's own sprites as camera-facing cut-outs (Paper Mario style) */
function buildPets(){R3.pets={};const sh=radialTex('rgba(40,28,16,.9)','rgba(40,28,16,0)');
  for(const n of Object.keys(PET_H)){const im=img(n);if(!im)continue;const t=new THREE.Texture(im),tf=new THREE.Texture(im);tf.repeat.x=-1;tf.offset.x=1;
    const mk2=map=>new THREE.SpriteMaterial({map,transparent:true,alphaTest:.3});const s=new THREE.Sprite(mk2(t));s.center.set(.5,.03);
    const d=new THREE.Mesh(PLANE(1,1),new THREE.MeshBasicMaterial({map:sh,transparent:true,depthWrite:false}));d.rotation.x=-Math.PI/2;d.renderOrder=1;
    R3.scene.add(s,d);R3.pets[n]={s,d,mn:s.material,mf:mk2(tf),t,tf,im,ok:false}}}
// pet(name, x, z (local), {y, face, talk, hop, tilt, alpha, sq, shadow, h}) → world foot position
function pet(n,x,z,o={}){const P=R3.pets[n];if(!P)return;const{face=0,talk=0,hop=0,tilt=0,alpha=1,sq=0,shadow=true,y=0,h=PET_H[n]}=o;if(alpha<=0)return;
  if(!P.ok&&P.im.complete&&P.im.naturalWidth){P.t.needsUpdate=P.tf.needsUpdate=true;P.ok=true}
  const br=Math.sin(TT*2.3+x*1.04)*.012,sy=1+br+talk*.08-sq*.16,sx=1-talk*.03+sq*.14,s=P.s;
  s.material=face?P.mf:P.mn;s.material.rotation=face?tilt:-tilt;s.material.opacity=alpha;
  s.visible=true;s.position.set(O[0]+x,y+hop,O[1]+z);s.scale.set(h*sx,h*sy,1);
  P.d.visible=shadow;P.d.position.set(O[0]+x,y+.035,O[1]+z+.05);P.d.scale.setScalar(h*.62*(1-clamp(hop/3)*.5));P.d.material.opacity=.32*alpha*clamp(1-hop/2.5)}

/* ---------- particles (instanced) */
function buildBits(){R3.bits={};const m=new THREE.Matrix4();
  for(const[k,col,n,geo]of[['drop','#cfeeff',60,SPH(1,0)],['mud','#7a5532',60,SPH(1,0)],['leaf','#5e9a45',60,BOX(1,.25,1.4)],['spark','#fff1a8',40,SPH(1,0)]]){
    const im=new THREE.InstancedMesh(geo,k==='spark'?bm(col):tm(col,{flat:true}),n);im.count=0;im.frustumCulled=false;im.castShadow=false;R3.scene.add(im);R3.bits[k]={im,n:0,max:n}}
  // rain: line streaks, rebuilt each frame in the mud scene
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(900*6),3));
  R3.rain=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:'#e8eef5',transparent:true,opacity:.7}));R3.rain.frustumCulled=false;R3.scene.add(R3.rain)}
const _m4=new THREE.Matrix4(),_q=new THREE.Quaternion(),_e=new THREE.Euler(),_v=new THREE.Vector3(),_s=new THREE.Vector3();
function bit(k,x,y,z,s,rot=0){const B=R3.bits[k];if(B.n>=B.max)return;_e.set(rot,rot*1.3,rot*.7);_q.setFromEuler(_e);_v.set(O[0]+x,y,O[1]+z);_s.setScalar(s);_m4.compose(_v,_q,_s);B.im.setMatrixAt(B.n++,_m4)}
// a burst of n ballistic bits from (x,y,z) launched at t0, lasting dur
function burst(k,t,t0,x,y,z,n,seed,{v=2.6,up=3,s=.09,dur=.9,g=7}={}){const u=t-t0;if(u<0||u>dur)return;const fade=1-u/dur;
  for(let i=0;i<n;i++){const a=hash2(i,1,seed)*6.283,sp=v*(.4+hash2(i,2,seed)*.6),vy=up*(.5+hash2(i,3,seed)*.7);
    const py=y+vy*u-g*u*u*.5;if(py<0)continue;bit(k,x+Math.cos(a)*sp*u,py,z+Math.sin(a)*sp*u*.6,s*(.6+fade*.6),u*8+i)}}

/* ---------- environment (sky dome, fog, lights) — blended across camera flights */
const ENVS={
  day:  {top:'#86c3ea',bot:'#fbf1d8',fog:'#eef0e0',near:45,far:115,hs:'#ffffff',hg:'#c9b48a',hi:.62,sc:'#fff3dc',si:.78,tint:'#ffffff'},
  dawn: {top:'#9fd0ee',bot:'#ffe2b8',fog:'#f6ead2',near:50,far:120,hs:'#fff4e0',hg:'#c9a27a',hi:.62,sc:'#ffe2b0',si:.8,tint:'#ffffff'},
  pool: {top:'#9fd8f5',bot:'#f1fbff',fog:'#eaf6fb',near:45,far:115,hs:'#ffffff',hg:'#bcd6e0',hi:.66,sc:'#fffaf0',si:.78,tint:'#ffffff'},
  rain: {top:'#7f8c9b',bot:'#cfd6dd',fog:'#b3bcc5',near:12,far:60,hs:'#dfe6ee',hg:'#6f7f6a',hi:.72,sc:'#e6ecf2',si:.28,tint:'#e8ecf2'},
  arc:  {top:'#2b2140',bot:'#4b3b72',fog:'#2b2140',near:18,far:70,hs:'#c9b8ff',hg:'#3e3060',hi:.5,sc:'#ffffff',si:.12,tint:'#f4ecff'},
  dusk: {top:'#3a2350',bot:'#f0a47a',fog:'#8a5a78',near:26,far:95,hs:'#ffd6c2',hg:'#4a3050',hi:.55,sc:'#ffb38a',si:.48,tint:'#f6e8ec'},
  night:{top:'#1c2050',bot:'#7a6a9e',fog:'#363a68',near:7,far:38,hs:'#9aa6ff',hg:'#26263c',hi:.5,sc:'#c8d4ff',si:.32,tint:'#b4b8d8'},
};
const ENV_OF={title:'dawn',square:'day',pool:'pool',field:'day',arcade:'arc',mud:'rain',stage:'dusk',forest:'night',lake:'day',play:'day'};
const _c1=new THREE.Color(),_c2=new THREE.Color();
function envMix(a,b,k){const r={};for(const key in a){if(typeof a[key]==='number')r[key]=lerp(a[key],b[key],k);else r[key]='#'+_c1.set(a[key]).lerp(_c2.set(b[key]),k).getHexString()}return r}
function applyEnv(E){const R=R3;R.sky.material.uniforms.top.value.set(E.top);R.sky.material.uniforms.bot.value.set(E.bot);R.scene.fog.color.set(E.fog);R.scene.fog.near=E.near;R.scene.fog.far=E.far;
  R.hemi.color.set(E.hs);R.hemi.groundColor.set(E.hg);R.hemi.intensity=E.hi;R.sun.color.set(E.sc);R.sun.intensity=E.si;R.tint.set(E.tint)}

/* ---------- the world */
function init3(){if(R3)return;const cv=mk(W,H),R={};R3=R;
  R.r=new THREE.WebGLRenderer({canvas:cv,antialias:true,preserveDrawingBuffer:true});R.r.setPixelRatio(1);R.r.setSize(W,H,false);
  R.r.shadowMap.enabled=true;R.r.shadowMap.type=THREE.PCFSoftShadowMap;
  const d=new Uint8Array([150,150,150,255,205,205,205,255,255,255,255,255]);R.grad=new THREE.DataTexture(d,3,1,THREE.RGBAFormat);R.grad.minFilter=R.grad.magFilter=THREE.NearestFilter;R.grad.generateMipmaps=false;R.grad.needsUpdate=true;
  R.inkM=new THREE.MeshBasicMaterial({color:INK,side:THREE.BackSide});R.tint=new THREE.Color('#ffffff');
  const S=R.scene=new THREE.Scene();S.fog=new THREE.Fog('#eef0e0',45,115);
  R.cam=new THREE.PerspectiveCamera(42,W/H,.1,240);
  R.sky=new THREE.Mesh(new THREE.SphereGeometry(110,24,12),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,
    uniforms:{top:{value:new THREE.Color()},bot:{value:new THREE.Color()}},
    vertexShader:'varying float h;void main(){h=normalize(position).y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform vec3 top;uniform vec3 bot;varying float h;void main(){gl_FragColor=vec4(mix(bot,top,smoothstep(-.02,.55,h)),1.);}'}));
  R.sky.renderOrder=-10;R.sky.frustumCulled=false;S.add(R.sky);
  R.hemi=new THREE.HemisphereLight('#ffffff','#c9b48a',.62);S.add(R.hemi);
  R.sun=new THREE.DirectionalLight('#fff3dc',.78);R.sun.castShadow=true;R.sun.shadow.mapSize.set(2048,2048);const sc=R.sun.shadow.camera;sc.left=sc.bottom=-20;sc.right=sc.top=20;sc.near=1;sc.far=80;R.sun.shadow.bias=-.0006;R.sun.shadow.normalBias=.02;
  S.add(R.sun,R.sun.target);
  R.dyn=[];const dyn=o=>{R.dyn.push(o);return o};
  // ground, the square, and paths out to every place
  flatPlane(S,300,300,'#a8d37f',[0,0,0],{recv:true});
  add(S,CYL(13,13,.06,40),'#e7dcc6',{p:[0,.03,0],ink:false,cast:false});add(S,TOR(13,.12,4,48),'#cbb994',{p:[0,.04,0],r:[Math.PI/2,0,0],ink:false,cast:false});
  let pi=0;for(const k of['pool','field','arc','mud','stg','for','lake','play']){const[x,z]=LOC[k],len=Math.hypot(x,z);const m=flatPlane(S,2.8,len,'#e9d9b4',[x/2,.015+pi*.001,z/2]);m.rotation.z=Math.atan2(x,z);pi++}
  {const[x,z]=LOC.lake,[x2,z2]=LOC.play,m=flatPlane(S,2.4,Math.hypot(x2-x,z2-z),'#e9d9b4',[(x+x2)/2,.024,(z+z2)/2]);m.rotation.z=Math.atan2(x2-x,z2-z)}
  // town: houses, lamps, flowers, benches round the square
  const HC=[['#f7d7a6','#c0563a'],['#cfe3f7','#5a4fb0'],['#f6d6e6','#2e9b74'],['#fff1c2','#e2382c'],['#d8efc8','#8a5a2b'],['#e8dcf7','#d9731a']];
  [[-11,-10,.3],[10.5,-10.5,-.3],[-15.5,-1,1.2],[15.5,-2,-1.2],[-13,8,2.2],[13.5,8.5,-2.2],[-5,-15,.1],[5.5,-15.5,-.1],[-20,-12,.6],[20,-13,-.6]].forEach(([x,z,r],i)=>house(S,x,z,HC[i%6][0],HC[i%6][1],r,1+hash2(i,3,90)*.25));
  for(const[x,z]of[[-8,4],[8,4],[-9,-5],[9,-5]])lamp(S,x,z);for(const[x,z,s]of[[-6,6,11],[6,6,12],[-10,1,13],[10,1,14]])flowers(S,x,z,9,s);
  bench(S,-5.5,8,3,.2);bench(S,5.5,8,3,-.2);
  // the giant calendar board (pages are dynamic page3s in SLOT positions)
  {const g=grp(S,[0,0,0]);add(g,BOX(9.2,3.4,.3),'#8a5a2b',{p:[0,3.3,-4]});add(g,BOX(8.8,3,.1),'#fbf1d8',{p:[0,3.3,-3.82],ink:false});
    add(g,BOX(9.4,.8,.36),'#e2382c',{p:[0,5.3,-3.95]});for(const x of[-3.6,3.6])add(g,CYL(.16,.2,1.7,8),'#6b4526',{p:[x,.85,-4]});
    const tt=textTex(512,64,null,x=>inkText(x,'THIS WEEK',256,46,46,{col:'#fffaf0'}));const lab=new THREE.Mesh(PLANE(5,.62),bm('#ffffff',{map:tt,transparent:true}));lab.position.set(0,5.3,-3.76);g.add(lab);
    const dash=tex(128,170,x=>{x.setLineDash([10,10]);x.strokeStyle='#b9a27a';x.lineWidth=5;x.strokeRect(8,8,112,154)});
    for(let i=0;i<7;i++){const[sx,sy,sz]=SLOT(i),m=new THREE.Mesh(PLANE(.98,1.3),bm('#ffffff',{map:dash,transparent:true,opacity:.6}));m.position.set(sx,sy,sz-.04);g.add(m)}}
  buildPages();buildPets();buildBits();
  // whirlwind (square): stacked rings, wide at the top (ported from blender/whirlwind.py)
  {const w=R.whirl=dyn(grp(S,[0,0,0]));w.userData.rings=[];for(let j=0;j<12;j++){const Rr=.35+Math.pow(j/11,1.4)*2.9,m=add(w,TOR(Rr,.12+.07*j/11,6,28),j%2?'#d6e8f2':'#b3d0e2',{p:[0,.4+j*.62,0],r:[Math.PI/2,0,0],ink:false,cast:true,op:.82});w.userData.rings.push(m)}}
  // POOL
  {setO('pool');const g=grp(S,[O[0],0,O[1]]);R.poolG=g;
    add(g,BOX(24,.1,14),'#ffffff',{p:[0,.05,-1],map:checkerTex('#ffffff','#dcecf3',8),ink:false,cast:false}).material.map.repeat.set(6,3.5);
    add(g,BOX(24,2.4,.3),'#e9f2f5',{p:[0,1.2,-7.8]});add(g,BOX(24,.5,.34),'#3fa8d8',{p:[0,1.7,-7.78],ink:false});
    add(g,BOX(9.6,.5,.3),'#ffffff',{p:[.5,.3,.35]});add(g,BOX(9.6,.5,.3),'#ffffff',{p:[.5,.3,-3.35]});add(g,BOX(.3,.5,3.7),'#ffffff',{p:[-4.15,.3,-1.5]});add(g,BOX(.3,.5,3.7),'#ffffff',{p:[5.15,.3,-1.5]});
    const wg=PLANE(9,3.4,30,12);R.poolW={m:add(g,wg,'#3fa8d8',{p:[.5,.44,-1.5],r:[-Math.PI/2,0,0],flat:true,ink:false,cast:false}),base:wg.attributes.position.array.slice()};
    for(let i=0;i<18;i++)add(g,SPH(.09,0),i%2?'#e2382c':'#ffffff',{p:[-3.9+i*.52,.5,-2.6],ink:false,cast:false});
    for(const x of[4.3,4.8])add(g,CYL(.05,.05,1.3,6),'#9aa9b8',{p:[x,.75,.2]});for(let k=0;k<3;k++)add(g,CYL(.03,.03,.5,5),'#9aa9b8',{p:[4.55,.5+k*.3,.2],r:[0,0,Math.PI/2],ink:false});
    const u=grp(g,[-8,0,-5]);add(u,CYL(.06,.06,3,6),'#e9e3d8',{p:[0,1.5,0]});add(u,CONE(1.8,.8,8),'#e2382c',{p:[0,3.1,0],flat:true});
    add(g,BOX(.9,.2,2),'#f28c28',{p:[-6.2,.45,-4.6],r:[.25,.4,0]});add(g,BOX(.9,.2,2),'#1d9ae0',{p:[7.4,.45,-4.8],r:[.25,-.4,0]});
    tree(g,-11,-6,1.1,'#4f9a45',3);tree(g,11,-6.5,1,'#3f8a3a',4);bush(g,9.5,-3,1)}
  // FIELD
  {setO('field');const g=grp(S,[O[0],0,O[1]]);const st=tex(256,256,x=>{for(let i=0;i<8;i++){x.fillStyle=i%2?'#86c063':'#7ab457';x.fillRect(i*32,0,32,256)}});st.wrapS=st.wrapT=THREE.RepeatWrapping;st.repeat.set(3,1);
    flatPlane(g,40,24,'#ffffff',[0,.03,-2],{map:st});flatPlane(g,30,.12,'#ffffff',[0,.04,2.6]);flatPlane(g,.12,12,'#ffffff',[0,.041,-3.4]);
    goal(g,-4.5,-3);
    add(g,CYL(.15,.18,3.2,8),'#6b4526',{p:[1.5,1.6,-4.7]});add(g,BOX(5.6,2.7,.3),'#2e3b4e',{p:[1.5,4.4,-4.6]});
    const sbt=(mid,lit)=>textTex(560,270,'#2e3b4e',x=>{inkText(x,'MONDAY',280,70,46,{col:'#bfe3f7'});inkText(x,mid,280,152,lit?62:52,{col:lit?'#ffcf33':'#9aa9b8'});inkText(x,'WEDNESDAY',280,234,46,{col:'#bfe3f7'})});
    R.sbA=new THREE.Mesh(PLANE(5.3,2.45),bm('#ffffff',{map:sbt('_ _ _ _',0)}));R.sbB=new THREE.Mesh(PLANE(5.3,2.45),bm('#ffffff',{map:sbt('TUESDAY',1)}));
    for(const m of[R.sbA,R.sbB]){m.position.set(1.5,4.4,-4.43);g.add(m)}
    for(let r=0;r<3;r++)add(g,BOX(14,.4,1),r%2?'#e2382c':'#1d9ae0',{p:[0,.2+r*.4,-9-r*1]});
    for(const[x,c]of[[-9,'#e2382c'],[9,'#1d9ae0']]){add(g,CYL(.05,.05,3,6),'#e9e3d8',{p:[x,1.5,-6]});add(g,BOX(1,.6,.04),c,{p:[x+.5,2.7,-6],ink:false})}
    tree(g,-13,-5,1.2,'#3f8a3a',5);tree(g,13,-4,1.1,'#4f9a45',6);
    R.ball=dyn(add(S,SPH(.3,2),'#ffffff',{map:tex(256,128,x=>{x.fillStyle='#ffffff';x.fillRect(0,0,256,128);x.fillStyle='#2a1f17';for(let i=0;i<6;i++)for(let j=0;j<3;j++){x.beginPath();x.arc(i*44+(j%2)*22+10,j*44+20,11,0,7);x.fill()}}),inkW:.03}))}
  // ARCADE
  {setO('arc');const g=grp(S,[O[0],0,O[1]]);const P='#6a4fc9';
    flatPlane(g,15.6,11.6,'#ffffff',[0,.03,-2],{map:checkerTex('#4b3b72','#3e3060',8)});
    add(g,BOX(16,7,.3),P,{p:[0,3.5,-8]});add(g,BOX(.3,7,12),P,{p:[-8,3.5,-2]});add(g,BOX(.3,7,12),P,{p:[8,3.5,-2]});
    add(g,BOX(6.4,7,.3),P,{p:[-4.8,3.5,4]});add(g,BOX(6.4,7,.3),P,{p:[4.8,3.5,4]});add(g,BOX(3.2,3.6,.3),P,{p:[0,5.2,4]});add(g,BOX(16.4,.3,12.4),'#4b3b72',{p:[0,7.1,-2]});
    for(const x of[-5.5,5.5])add(g,BOX(3.6,.24,.5),'#ff5ca8',{p:[x,6.8,4.2],ink:false});
    const sign=textTex(600,160,'#16213a',x=>{inkText(x,'GAME',150,108,84,{col:'#ff5ca8'});inkText(x,'ARCADE',420,108,72,{col:'#5ce0ff'})});
    add(g,PLANE(6,1.6),bm('#ffffff',{map:sign}),{p:[0,5.3,4.17],ink:false,cast:false});
    R.bulbs=[];for(let i=0;i<14;i++){const m=new THREE.Mesh(SPH(.09,0),bm('#ffcf33'));const a=i/14;m.position.set(-3.1+a*6.2,6.2,4.2);g.add(m);R.bulbs.push(m);const m2=m.clone();m2.material=bm('#ffcf33');m2.position.y=4.4;g.add(m2);R.bulbs.push(m2)}
    add(g,BOX(7.4,4.6,.2),'#16213a',{p:[0,3.8,-7.75]});
    const scA=textTex(700,420,'#1f2f52',x=>{inkText(x,'GAME',350,190,120,{col:'#ff5ca8'});inkText(x,'ARCADE',350,320,96,{col:'#5ce0ff'})});
    const scB=textTex(700,420,'#1f2f52',x=>{inkText(x,"Fox's week",350,58,44,{col:'#ffcf33'});DAY.forEach((d,i)=>{const y=100+i*44,on=i===2||i===3;
      inkText(x,d,90,y+12,30,{col:on?'#ffffff':'#7f8db0',align:'left'});inkText(x,on?'computer games':i<5?'school':'-',610,y+12,30,{col:on?'#5ce0ff':'#7f8db0',align:'right'});if(on){x.strokeStyle='#5ce0ff';x.lineWidth=3;x.strokeRect(78,y-18,544,40)}})});
    R.scA=new THREE.Mesh(PLANE(7,4.2),bm('#ffffff',{map:scA}));R.scB=new THREE.Mesh(PLANE(7,4.2),bm('#ffffff',{map:scB,transparent:true}));
    R.scA.position.set(0,3.8,-7.63);R.scB.position.set(0,3.8,-7.62);g.add(R.scA,R.scB);
    R.cabs=[];for(const[x,z,ry,c]of[[-6.6,-5,Math.PI/2,'#e2382c'],[-6.6,-1.6,Math.PI/2,'#f6c445'],[6.6,-5,-Math.PI/2,'#1d9ae0'],[6.6,-1.6,-Math.PI/2,'#2e9b74']]){
      const k=grp(g,[x,0,z],ry);add(k,BOX(1.2,2.6,1.1),c,{p:[0,1.3,0]});add(k,BOX(1.25,.3,.7),'#2e3b4e',{p:[0,1.3,.55]});
      const sm=new THREE.Mesh(PLANE(.9,.7),bm('#5ce0ff'));sm.position.set(0,2.05,.56);k.add(sm);R.cabs.push(sm)}
    R.plights=[];for(const[x,c]of[[-4.5,'#ff5ca8'],[4.5,'#5ce0ff']]){const l=new THREE.PointLight(c,.9,16,1.5);l.position.set(x,5.5,-2);g.add(l);R.plights.push(l)}
    flatPlane(g,10,5,'#cbb994',[0,.02,7])}
  // MUD
  {setO('mud');const g=grp(S,[O[0],0,O[1]]);flatPlane(g,44,26,'#7aa363',[0,.03,-2]);
    add(g,CYL(1,1,.06,28),'#7a5532',{p:[.5,.06,1.0],s:[6.5,1,1.7],ink:false,cast:false,flat:true});
    for(let i=0;i<9;i++)add(g,SPH(.3,0),'#5e3f24',{p:[-4.5+i*1.1,.06,.7+Math.sin(i*2.1)*.6],s:[1,.15,.6],ink:false,cast:false});
    goal(g,7.6,-3);R.ducks=[duck3(g,-3.25,1.5,.55),duck3(g,-.4,1.8,.5),duck3(g,2.4,1.45,.55)];
    tree(g,-12,-5,1.2,'#4a7a45',7);tree(g,12,-6,1.1,'#3f6f3f',8);for(let r=0;r<2;r++)add(g,BOX(12,.4,1),'#9aa9b8',{p:[-1,.2+r*.4,-8.5-r]})}
  // STAGE
  {setO('stg');const g=grp(S,[O[0],0,O[1]]);add(g,CYL(11,11,.06,36),'#d9c9a8',{p:[0,.03,0],ink:false,cast:false});
    add(g,BOX(14,1,6.5),'#8a5a2b',{p:[0,.5,-2.75]});add(g,BOX(4,.5,.8),'#6b4526',{p:[0,.25,.85]});
    add(g,BOX(14.6,7.5,.4),'#4a2a50',{p:[0,3.75,-6.2]});for(const x of[-7.3,7.3])add(g,BOX(.8,7.6,.8),'#9e1f2a',{p:[x,3.8,-1.8]});
    add(g,BOX(15.4,1.2,.6),'#9e1f2a',{p:[0,7.4,-1.8]});for(let i=0;i<14;i++)add(g,SPH(.5,1),'#b8303c',{p:[-6.5+i*1,6.75,-1.75],s:[1,.6,.5],ink:false});
    R.curt=[];for(const sd of[-1,1])for(let k=0;k<10;k++){const m=add(g,CYL(.4,.4,5.8,8),'#c2343f',{p:[0,3.9,-2.1-(k%2)*.12],inkW:.03});R.curt.push({m,sd,k})}
    add(g,CYL(.05,.05,1.7,6),'#3a2a1a',{p:[0,1.85,-4]});
    R.lock=dyn(grp(g,[0,3.7,-1.45]));add(R.lock,BOX(.8,.7,.3),'#f6c445',{});add(R.lock,TOR(.28,.07,6,16,Math.PI),'#9aa9b8',{p:[0,.35,0]});
    R.spots=[];for(const sx of[-4.5,4.5]){const L=new THREE.SpotLight('#fff4c2',0,30,.38,.5,1);L.position.set(sx,9.5,4);L.target.position.set(sx*.15,1,-2);g.add(L,L.target);
      const len=new THREE.Vector3(sx*.85,-8.5,-6).length(),cn=new THREE.Mesh(new THREE.ConeGeometry(1.7,len,20,1,true),bm('#fff4c2',{transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
      cn.position.set(sx*.575,5.25,1);cn.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(sx*.85,8.5,6).normalize());g.add(cn);R.spots.push({L,cn})}
    for(let r=0;r<2;r++)for(const sx of[-3.8,3.8])bench(g,sx,4.4+r*1.6,5.4);
    R.sbulbs=[];for(let i=0;i<16;i++){const m=new THREE.Mesh(SPH(.1,0),bm('#ffe7a0'));m.position.set(-7+i*.93,8.15,-1.5);g.add(m);R.sbulbs.push(m)}
    tree(g,-11,-3,1.2,'#3f8a3a',9);tree(g,11,-3,1.2,'#4f9a45',10);lamp(g,-8.5,3);lamp(g,8.5,3)}
  // FOREST
  {setO('for');const g=grp(S,[O[0],0,O[1]]);add(g,CYL(24,24,.06,36),'#3f6a45',{p:[0,.035,-4],ink:false,cast:false});
    for(let i=0,n=0;i<140&&n<64;i++){const x=hash2(i,1,500)*44-22,z=hash2(i,2,500)*26-19;if(z>-3.5&&Math.abs(x)<10)continue;if(z>3)continue;n++;
      (i%3?pine:tree)(g,x,z,.9+hash2(i,3,500)*.7,['#2f5a4a','#28503f','#335f45'][i%3],i)}
    for(const x of[-9.5,9.5,-12,12])pine(g,x,1.5,1.1,'#28503f',x);
    tree(g,4,.5,1.5,'#2f6248',11).children[0].scale.set(2.4,1,2.4);bush(g,4.4,1.1,.9,'#2f6248');
    for(let i=0;i<10;i++){const x=hash2(i,4,501)*16-8,z=hash2(i,5,501)*4-2;add(g,CYL(.05,.06,.22,6),'#f3ead6',{p:[x,.11,z],ink:false});add(g,SPH(.15,0),'#e2382c',{p:[x,.26,z],s:[1,.55,1],ink:false})}
    const moon=new THREE.Mesh(SPH(3,2),bm('#fff4c2',{fog:false}));moon.position.set(O[0]+18,26,O[1]-60);S.add(moon)}
  // LAKE
  {setO('lake');const g=grp(S,[O[0],0,O[1]]);const wg=PLANE(46,14,46,14);R.lakeW={m:add(g,wg,'#4fa3d1',{p:[0,.14,-10],r:[-Math.PI/2,0,0],flat:true,ink:false,cast:false}),base:wg.attributes.position.array.slice()};
    flatPlane(g,46,1.6,'#efe0b8',[0,.05,-2.6]);for(let i=0;i<22;i++)add(g,CYL(.03,.04,.9,4),'#5e8a3a',{p:[-14+i*1.3+Math.sin(i)*.4,.45,-3.2],ink:false,cast:false});
    const bl=tex(256,128,x=>{for(let i=0;i<8;i++)for(let j=0;j<4;j++){x.fillStyle=(i+j)%2?'#f6d6d6':'#e85d6a';x.fillRect(i*32,j*32,32,32)}});
    flatPlane(g,6.6,2,'#ffffff',[0,.05,1],{map:bl});
    add(g,SPH(.22,1),'#e2382c',{p:[-2.2,.27,1.0]});add(g,CYL(.025,.025,.18,4),'#6b4526',{p:[-2.2,.55,1.0],ink:false});
    add(g,CONE(.12,.62,8),'#f28c28',{p:[-1.1,.17,1.1],r:[0,0,Math.PI/2]});add(g,CONE(.1,.25,5),'#2e9b74',{p:[-.7,.17,1.1],r:[0,0,-Math.PI/2],ink:false});
    R.sweets=dyn(grp(g,[0,0,0]));['#e85d9a','#1d9ae0','#f6c445','#7b5bd6'].forEach((c,i)=>add(R.sweets,SPH(.13,1),c,{p:[.2+i*.26,.18,1.0+(i%2)*.18],inkW:.025}));
    R.tv=dyn(grp(g,[2.2,0,.8]));add(R.tv,BOX(1.1,.78,.22),'#2e3b4e',{p:[0,.45,0]});R.tvS=new THREE.Mesh(PLANE(.92,.6),bm('#5ce0ff'));R.tvS.position.set(0,.47,.12);R.tv.add(R.tvS);
    for(let i=0;i<5;i++)add(g,BOX(.9,.12,2.6),'#a5713f',{p:[-9+i*.92,.32,-3.8],ink:false});
    tree(g,7.5,-1,1.2,'#3f8a3a',12);tree(g,-11,-.5,1.1,'#4f9a45',13);bush(g,-8,1.5,1);bush(g,9.5,1.6,.9);R.lduck=[duck3(g,-4,-8,.6),duck3(g,5,-11,.6)]}
  // PLAY (hide-and-seek, by the lake)
  {setO('play');const g=grp(S,[O[0],0,O[1]]);R.ptree=tree(g,-4,-.8,1.35,'#3f8a3a',14);R.pbush=bush(g,0,-.2,1.25,'#4f8a3a');
    add(g,new THREE.DodecahedronGeometry(1,0),'#9aa3ad',{p:[5.25,.6,-.4],s:[1.3,.9,1],flat:true});bush(g,8,-2,1);tree(g,10,-3,1.1,'#4f9a45',15);flowers(g,-1,2.5,10,16)}
  // the rest of Pet Town: trees + clouds scattered off the places
  for(let i=0,n=0;i<600&&n<90;i++){const x=hash2(i,1,600)*150-75,z=hash2(i,2,600)*150-70;if(Math.hypot(x,z)<17)continue;
    if(Object.values(LOC).some(([lx,lz])=>Math.hypot(x-lx,z-lz)<15))continue;n++;tree(S,x,z,.9+hash2(i,3,600)*.6,['#3f8a3a','#4f9a45','#5e9a45'][i%3],i)}
  for(let i=0;i<16;i++)cloud(S,hash2(i,1,700)*160-80,16+hash2(i,2,700)*10,hash2(i,3,700)*160-90,1.2+hash2(i,4,700)*1.2);
  mergeStatic([R.sky,...R.dyn,...R.curt.map(c=>c.m),...R.pages,R.poolW.m,R.lakeW.m,...R.ducks,...R.lduck,R.sbA,R.sbB,R.scA,R.scB,...R.bulbs,...R.cabs,...R.sbulbs,...R.spots.map(o=>o.cn),R.tvS,...Object.values(R.pets).map(P=>P.d)]);
  // compile shaders for every light set up front (arcade lamps / stage spots on or off), so scene changes never stall
  for(const[a,b]of[[0,0],[1,0],[0,1]]){for(const l of R.plights)l.visible=!!a;for(const{L}of R.spots)L.visible=!!b;R.r.compile(S,R.cam)}}
// bake every static mesh into one geometry per (material, 32 m map cell): ~1200 draw calls → ~150, culling kept per cell
function mergeStatic(keep){const S=R3.scene;S.updateMatrixWorld(true);for(const k of keep)k.traverse(o=>{o.userData.keep=true});
  const B=new Map(),dead=[];S.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||o.userData.keep||!o.material.isMaterial||o.material.isShaderMaterial)return;
    o.getWorldPosition(_v);const key=o.material.uuid+(o.castShadow?1:0)+(o.receiveShadow?1:0)+'@'+Math.floor(_v.x/32)+','+Math.floor(_v.z/32);
    const g=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(o.matrixWorld);let b=B.get(key);if(!b)B.set(key,b={m:o.material,cast:o.castShadow,recv:o.receiveShadow,gs:[]});b.gs.push(g);dead.push(o)});
  for(const o of dead)o.parent&&o.parent.remove(o);
  for(const b of B.values()){const geo=new THREE.BufferGeometry();for(const name of['position','normal','uv']){if(!b.gs.every(g=>g.attributes[name]))continue;const n=b.gs[0].attributes[name].itemSize;
      const arr=new Float32Array(b.gs.reduce((a,g)=>a+g.attributes[name].count*n,0));let off=0;for(const g of b.gs){arr.set(g.attributes[name].array,off);off+=g.attributes[name].array.length}geo.setAttribute(name,new THREE.BufferAttribute(arr,n))}
    geo.computeBoundingSphere();const m=new THREE.Mesh(geo,b.m);m.castShadow=b.cast;m.receiveShadow=b.recv;m.matrixAutoUpdate=false;S.add(m)}}

/* ---------- camera: key poses {p,l (local),f} per scene; flights blend between places */
// krig(lt,[[t, pose, dur=1.2], …]) — from each key time the camera eases to that pose over dur
function mixC(a,b,k){return{p:lerp3(a.p,b.p,k),l:lerp3(a.l,b.l,k),f:lerp(a.f||42,b.f||42,k)}}
function krig(lt,K){let c=K[0][1];for(let i=1;i<K.length;i++){const[t0,pose,d=1.2]=K[i];if(lt<=t0)break;c=mixC(c,pose,ease(clamp((lt-t0)/d)))}return c}
const W3=(L,c)=>({p:[c.p[0]+LOC[L][0],c.p[1],c.p[2]+LOC[L][1]],l:[c.l[0]+LOC[L][0],c.l[1],c.l[2]+LOC[L][1]],f:c.f||42});
function shk(c,t,t0,amp=.12,dur=.7){const u=(t-t0)/dur;if(u<0||u>1)return c;const a=amp*(1-u)*(1-u);return{...c,p:[c.p[0]+n1(t*31,3)*a,c.p[1]+n1(t*27,4)*a,c.p[2]],l:[c.l[0]+n1(t*29,5)*a,c.l[1]+n1(t*33,6)*a,c.l[2]]}}
function hh(c,t,a=.06){return{...c,p:[c.p[0]+n1(t*.7,21)*a,c.p[1]+n1(t*.6,22)*a,c.p[2]],l:[c.l[0]+n1(t*.5,23)*a*.6,c.l[1]+n1(t*.55,24)*a*.6,c.l[2]]}}
function flyMix(a,b,k){const d=Math.hypot(a.p[0]-b.p[0],a.p[2]-b.p[2]),H=Math.min(16,d*.28),s=Math.sin(k*Math.PI);const c=mixC(a,b,k);c.p[1]+=s*H;c.l[1]+=s*H*.45;return c}
const CAMS={},FLY={lake:2.2,pool:1.8,field:2.0,arcade:2.0,mud:1.8,stage:2.2,forest:2.2,play:1.3};
const camOf=(S,lt)=>CAMS[S.id](lt,S,S.start+lt);
function camFinal(S,t){const lt=t-S.start;let c=camOf(S,lt);const i=SHOTS.indexOf(S),f=FLY[S.id];
  if(f&&i>0&&lt<f){const P=SHOTS[i-1];c=flyMix(camOf(P,P.end-P.start),c,ease(lt/f))}return c}
function envFinal(S,t){const lt=t-S.start;let E=envOf(S,lt);const i=SHOTS.indexOf(S),f=FLY[S.id];
  if(f&&i>0&&lt<f){const P=SHOTS[i-1];E=envMix(envOf(P,P.end-P.start),E,ease(lt/f))}return E}
function envOf(S,lt){const E=ENVS[ENV_OF[S.id]];if(S.id==='square')return envMix(ENVS.dawn,E,seg(lt,0,2.5));
  if(S.id==='play'){const k=ease(seg(lt,S.cues.d20-S.start+.4,S.end-S.start-.4));return{...E,near:lerp(E.near,110,k),far:lerp(E.far,230,k)}}
  if(S.id==='arcade')return envMix(ENVS.day,E,seg(lt,1.0,2.3));
  if(S.id==='forest'){const j=S.cues.a05-S.start;return envMix(E,ENVS.dusk,.55*seg(lt,j,j+1.2))}return E}
const flyK=S=>FLY[S.id]||0;
const chipK=(S,lt)=>seg(lt,flyK(S)+.1,flyK(S)+.7);

/* ---------- per-frame */
// stage curtains + spotlights for opening k (also posed every frame in begin3, so no state leaks between scenes)
function stageSet(op,t){for(const{m,sd,k}of R3.curt){m.position.x=sd*lerp(.4+k*.7,5.0+k*.2,op);m.position.z=-2.1-(k%2)*.12;m.rotation.z=Math.sin(t+k)*.01}
  for(const{L,cn}of R3.spots){L.intensity=1.6*op;L.visible=false;cn.material.opacity=.13*op}}
function begin3(){init3();const R=R3;R.np=0;for(const g of R.pages)g.visible=false;for(const k in R.pets){R.pets[k].s.visible=false;R.pets[k].d.visible=false}
  for(const o of R.dyn)o.visible=false;
  // story-state defaults for props other scenes can see (each scene overrides its own)
  const t0=TT;stageSet(ease(seg(t0,gateT('q6')+.1,gateT('q6')+1.5)),t0);R.sbA.visible=t0<gateT('q3')+.05;R.sbB.visible=!R.sbA.visible;R.scB.material.opacity=0;for(const l of R.plights)l.visible=false;for(const k in R.bits)R.bits[k].n=0;R.rain.visible=false;
  // ambient motion everywhere (pure in TT)
  const t=TT;for(const W2 of[R.poolW,R.lakeW]){const a=W2.m.geometry.attributes.position,b=W2.base;for(let i=0;i<a.count;i++){const x=b[i*3],y=b[i*3+1];a.array[i*3+2]=Math.sin(x*.9+t*1.6)*.05+Math.cos(y*1.3+t*1.2)*.04}a.needsUpdate=true}
  R.bulbs.forEach((m,i)=>m.material.color.set(Math.sin(t*6+i*.9)>0?'#ffcf33':'#ff5ca8'));R.cabs.forEach((m,i)=>m.material.color.setHSL(((t*.15+i*.27)%1),.8,.6));
  R.sbulbs.forEach((m,i)=>m.material.color.set(Math.sin(t*3+i*1.3)>-.2?'#ffe7a0':'#c08a50'));
  R.ducks.forEach((d,i)=>{d.position.y=Math.sin(t*3+i)*.04;d.userData.wing.rotation.z=-Math.abs(Math.sin(t*5+i))*.6});
  R.lduck.forEach((d,i)=>{const a=t*.25+i*3;d.position.x=(i?5:-4)+Math.cos(a)*2.5;d.position.z=(i?-11:-8)+Math.sin(a)*1.2;d.rotation.y=-a-Math.PI/2;d.position.y=Math.sin(t*2+i)*.03})}
function end3(g,S,t){const R=R3,c=camFinal(S,t),E=envFinal(S,t);applyEnv(E);for(const k in R.pets){const P=R.pets[k];if(P.s.visible)P.s.material.color.copy(R.tint)}
  R.cam.position.set(...c.p);R.cam.fov=c.f||42;R.cam.updateProjectionMatrix();R.cam.lookAt(...c.l);R.cam.updateMatrixWorld();R.sky.position.copy(R.cam.position);
  R.sun.target.position.set(c.l[0],0,c.l[2]);R.sun.position.set(c.l[0]+14,26,c.l[2]+12);R.sun.target.updateMatrixWorld();
  for(const k in R.bits){const B=R.bits[k];B.im.count=B.n;B.im.instanceMatrix.needsUpdate=true}
  R.r.render(R.scene,R.cam);g.save();g.setTransform(1,0,0,1,0,0);g.drawImage(R.r.domElement,0,0,W,H);
  g.globalCompositeOperation='multiply';g.globalAlpha=.5;g.drawImage(PAPER,0,0);g.restore()}
// project a local point (current O) to canvas px
function scr(x,y,z){_v.set(O[0]+x,y,O[1]+z).project(R3.cam);return{x:(_v.x+1)/2*W,y:(1-_v.y)/2*H,on:_v.z<1}}
const head=(n,x,z,y=0,up=.15)=>scr(x,y+PET_H[n]+up,z);

/* =====================================================================
   SCENES (3D)
   ===================================================================== */

/* 1. Title — crane down from the sky into Pet Town at sunrise; pets bounce in */
CAMS.title=(lt,S)=>{const k=ease(clamp(lt/(S.end-S.start)));return W3('sq',{p:[lerp(-9,0,k),lerp(30,3.2,k),lerp(40,12.8,k)],l:[0,lerp(0,2.5,k),lerp(-8,-1.2,k)],f:42})};
SC.title=(g,t,S)=>{const lt=t-S.start;begin3();setO('sq');
  boardPages(i=>{const k=seg(lt,.6+i*.14,1.0+i*.14);return k>0?{dy:(1-back(k))*.8,alpha:k}:null});
  for(const[n,x,f,d]of[['dragon',-5.6,1,.9],['fox',-3.0,1,1.1],['owl',3.1,0,1.3],['panda',5.6,0,1.5]]){const k=spring(clamp((lt-d)*1.2));
    pet(n,x,1.4,{face:f,hop:Math.max(0,(1-k)*4)+hop3(lt,d+1.2,.28),alpha:seg(lt,d-.1,d)})}
  end3(g,S,t);
  card(g,640,120,760,150,seg(lt,.2,.8),{seed:2400,fill:'#fffaf0',wash:'#f6d27a',draw:g=>{inkText(g,'The Stolen Week',0,10,82,{reveal:seg(lt,.3,1.6),col:'#b35a00'});inkText(g,'Pet Adventures · Free time',0,56,30,{alpha:seg(lt,1.3,2),col:'#5a3d28'})}});
  if(lt<.6){g.fillStyle=`rgba(243,234,214,${1-lt/.6})`;g.fillRect(0,0,W,H)}};

/* 2. Square — the week plan; the live 3D whirlwind rips the pages away; the first riddle */
const TX=6.4;
CAMS.square=(lt,S,t)=>{const C=S.cues,s=S.start,wt=windT(S)-s,we=wt+WIND_LEN;
  let c=krig(lt,[[0,{p:[0,3.2,12.8],l:[0,2.5,-1.2]}],[C.p01-s,{p:[-2.2,2.7,10.8],l:[-.8,2.7,-2]},2.2],[C.o01-s,{p:[1.2,2.9,11.6],l:[.3,2.6,-1.5]},1.4],
    [wt-.5,{p:[9,3.6,13.5],l:[3.6,4.0,-2.2],f:47},.7],[we,{p:[0,2.5,10.8],l:[0,2.1,-1]},1.2],[C.o03-s-.3,{p:[0,3.3,11.2],l:[0,3.0,-2.5],f:40},1.2]]);
  if(lt>wt-.3&&lt<we)c=hh(c,t*3,.12);return W3('sq',shk(c,t,s+wt-.3,.25,.9))};
function whirlPose(t,S){const wt=windT(S),u=t-wt,R=R3.whirl;if(u<-.9||u>WIND_LEN+1.8)return;R.visible=true;
  const x=u<0?lerp(26,TX+.6,ease(seg(u,-.9,0))):u<1.4?lerp(TX+.6,TX,u/1.4):u<3.2?lerp(TX,TX-.25,(u-1.4)/1.8):u<WIND_LEN?lerp(TX-.25,TX+.15,(u-3.2)/1.8):lerp(TX+.15,40,easeIn(seg(u,WIND_LEN,WIND_LEN+1.8)));
  R.position.set(O[0]+x,0,O[1]-2.2);R.rotation.y=-t*6;const gr=clamp(.35+u*1.3);R.scale.set(1,gr,1);
  R.userData.rings.forEach((m,j)=>{m.position.x=Math.sin(j*1.3+t*3)*.22;m.position.z=Math.cos(j*1.7+t*2.6)*.18});
  for(let k=0;k<50;k++){const a=t*(5+k%4)+k*1.7,r=.5+(k%6)*.45*(.4+((k*.37+t*.5)%1)),y=((k*.53+t*2.2)%7.5);bit('leaf',x+Math.cos(a)*r,y,-2.2+Math.sin(a)*r,.14,t*6+k)}
  return x}
SC.square=(g,t,S)=>{const lt=t-S.start,C=S.cues,wt=windT(S),we=wt+WIND_LEN;begin3();setO('sq');
  const wx=whirlPose(t,S)??TX;
  const hl=i=>{const a=[['p01',0],['r01',4],['f01',2],['f01',3]].filter(([id,d])=>d===i).map(([id])=>[C[id],endOf(S,id)+.3]);return a.some(([a,b])=>t>a&&t<b)?.8:0};
  for(let i=0;i<7;i++){const[x0,y0,z0]=SLOT(i),t0=wt+.9+(6-i)*.33,u=t-t0;
    if(u<0){const sh=t>wt-.4?1:0;page3(i,{x:x0+Math.sin(t*40+i)*.05*sh,y:y0,z:z0,rz:Math.sin(t*30+i)*.09*sh,glow:hl(i)});continue}
    const j=u/.24;if(j>13)continue;const a=j*.95+i,r=1.1+.17*j,sx=wx+r*Math.cos(a),sy=1.2+j*.68,sz=-2.2+r*Math.sin(a),k=clamp(j);
    page3(i,{x:lerp(x0,sx,ease(k)),y:lerp(y0,sy,ease(k)),z:lerp(z0,sz,ease(k)),rx:j*.7,ry:j*.45,rz:-j*1.05})}
  const dizzy=t>we&&t<C.o02,P=[['dragon',-5.1,1,'R',165],['fox',-2.6,1,'F',145],['owl',2.75,0,'O',135],['panda',5.25,0,'P',152]];
  const windy=t>wt&&t<we;
  P.forEach(([n,x,f,k],i)=>pet(n,x,1.3,{face:f,talk:talkOf(k,t),hop:hop3(t,C[{R:'r01',F:'f01',O:'o01',P:'p01'}[k]],.28)+(t>C.o03?Math.abs(Math.sin(t*3+i))*.08:0),
    tilt:dizzy?Math.sin(t*6+i)*.18:windy?.12+Math.sin(t*9+i)*.08:0}));
  end3(g,S,t);
  if(dizzy)P.forEach(([n,x],i)=>{const h=head(n,x,1.3);for(let j=0;j<3;j++){const a=t*4+j*2.1+i;star(g,h.x+Math.cos(a)*40,h.y+Math.sin(a)*10,9,YEL,2500+i*3+j)}});
  chip(g,'Pet Town',seg(lt,.1,.7));
  sayCard(g,'I go swimming on Mondays.',cardK(t,C.p01,C.r01),112,DCOL[0],'#ffd5cf');
  sayCard(g,'I play football on Fridays.',cardK(t,C.r01,C.f01),112,'#136a9c','#bfe3f7');
  sayCard(g,'I play computer games on Wednesdays and Thursdays.',cardK(t,C.f01,C.o01),112,'#2e7d4f','#cde8b5');
  if(windy){const k=seg(t,wt,wt+.25)*(1-seg(t,we-.3,we));g.save();g.globalAlpha=k;for(let i=0;i<14;i++){const y=60+i*48,o=((t*900+i*190)%1700)-200;g.strokeStyle='rgba(255,255,255,.6)';g.lineWidth=3;g.beginPath();g.moveTo(1400-o,y);g.lineTo(1400-o-120-hash2(i,1,2600)*120,y+8);g.stroke()}g.restore();
    if(t>C.f02-.1){const h=head('fox',-2.6,1.3);bubble(g,clamp(h.x+60,250,1030),150,420,90,'The days are flying away!',seg(t,C.f02,C.f02+.3)*(1-seg(t,we-.4,we)),h.x,h.y,32)}}
  if(t>C.o02-.2&&t<C.d04+.2)card(g,640,112,640,86,cardK(t,C.o02,C.d04+.2),{seed:2610,fill:'#fffaf0',wash:'#f7d7a6',draw:g=>inkText(g,'Friends, will you help us?',0,13,40,{col:'#b35a00'})});
  if(t>C.o03-.2)riddleCard(g,'I am the first school day of the week.',seg(t,C.o03-.1,C.o03+.3),2620)};

/* 3. Monday Pool — fly over town to the pool; the page floats; Panda dives in */
CAMS.pool=(lt,S,t)=>{const C=S.cues,s=S.start,dv=at(S,'p03','Splash')-.25;
  const c=krig(lt,[[0,{p:[-3.5,3.8,12.5],l:[-1.2,1.0,-1]}],[C.d05-s,{p:[0,4.4,11],l:[.4,.9,-1.3]},1.4],[dv-s-.25,{p:[1.4,2.5,7.4],l:[.7,.9,-1.3],f:45},.7],[C.d06-s,{p:[.4,3.3,10],l:[.5,1.2,-1.2]},1.5]]);
  return W3('pool',shk(c,t,dv+.35,.16))};
SC.pool=(g,t,S)=>{const lt=t-S.start,C=S.cues,dv=at(S,'p03','Splash')-.25,up=C.d06+.3;begin3();setO('pool');
  if(t<up)page3(0,{x:.75,y:.62+Math.sin(t*2)*.05,z:-1.4,rx:-1.0,rz:Math.sin(t*1.3)*.15,s:.85,glow:.45+.2*Math.sin(t*4)});
  const leap=seg(t,dv,dv+.6);let px=lerp(-3.4,-1,ease(seg(lt,flyK(S)-.6,flyK(S)+.8))),pz=1.2,py=0,pal=1;
  if(t>dv){px=lerp(-1,.75,leap);pz=lerp(1.2,-1.3,leap);py=Math.sin(leap*Math.PI)*1.6+leap*.3;pal=1-seg(leap,.85,1)}
  if(t>up){px=.75;pz=-1.3;py=lerp(-1.3,-.5,ease(seg(t,up,up+.5)));pal=1}
  pet('panda',px,pz,{y:py,face:1,talk:talkOf('P',t),alpha:pal,tilt:t>dv&&t<=up?leap*1.2:0,hop:t<dv?hop3(t,C.p02,.3):0,shadow:t<dv});
  if(t>up)page3(0,{x:1.55,y:py+1.7,z:-1.1,rz:-.2+Math.sin(t*3)*.08,s:.7});
  burst('drop',t,dv+.5,.75,.5,-1.3,30,2770,{v:2.2,up:4,s:.1,dur:1.1});
  pet('owl',-5.1,1.7,{face:1,talk:talkOf('O',t),hop:hop3(t,C.o04,.3)});pet('dragon',6.0,1.7,{hop:hop3(t,dv+.6,.38)});pet('fox',7.6,2.0,{hop:hop3(t,dv+.7,.32)});
  end3(g,S,t);
  if(t>C.p02+.3&&t<dv){const h=head('panda',px,pz);thought(g,h.x,h.y-70,150,100,seg(t,C.p02+.3,C.p02+.7)*(1-seg(t,dv-.3,dv)),g=>inkText(g,'?',0,20,70,{col:'#e2382c'}))}
  chip(g,'Monday · the swimming pool',chipK(S,lt));pageHUD(g,t,chipK(S,lt));
  if(t>C.d05-.1&&t<C.p03)card(g,640,190,700,80,seg(t,C.d05,C.d05+.3),{seed:2780,fill:'#fffaf0',wash:'#f6d27a',draw:g=>inkText(g,'What does Panda do on Mondays?',0,12,36,{col:'#b35a00'})});
  sayCard(g,'I go swimming on Mondays.',cardK(t,C.p03,S.end),190,DCOL[0],'#ffd5cf')};

/* 4. Tuesday Field — low tracking shot; the scoreboard; Dragon's catch */
CAMS.field=(lt,S,t)=>{const C=S.cues,s=S.start,ct=at(S,'r03','Catch');
  const c=krig(lt,[[0,{p:[lerp(-7,-4,ease(seg(lt,0,3.5))),1.7,10],l:[-2.5,1.5,0]}],[C.r02-s,{p:[2.4,2.0,8.4],l:[1.8,3.9,-4.6],f:44},1.4],[ct-s-.4,{p:[0,2.1,11],l:[0,1.4,0]},1.0]]);
  return W3('field',c)};
SC.field=(g,t,S)=>{const lt=t-S.start,C=S.cues,open=gateT('q3')+.05,ct=at(S,'r03','Catch'),got=gotT(1);begin3();setO('field');
  R3.sbA.visible=t<open;R3.sbB.visible=t>=open;
  const drop=seg(t,open+.2,open+1);if(t<ct+.2)page3(1,{x:3.7,y:lerp(4.9,.1,easeIn(drop)),z:lerp(-4.2,-2.6,drop),rx:-drop*1.45,rz:.2+drop*2,blank:t<open,glow:.35,s:.7});
  const bk=seg(t,ct-.3,ct+.5),bb=Math.abs(Math.sin((t-C.d08)*7))*1.0*(t>C.d08?1-seg(t,C.d08,endOf(S,'d08')):0);
  if(t>ct-.3){const B=R3.ball;B.visible=true;B.position.set(O[0]+(t<ct+.5?lerp(5.8,-1.2,bk):-1.2),t<ct+.5?1+Math.sin(bk*Math.PI)*2.2:.3+bb,O[1]+1.5);B.rotation.set(t*6,t*4,0)}
  const dx=lerp(-5.2,-1.6,ease(seg(lt,.3,2.4)));
  pet('dragon',dx,1.1,{face:1,talk:talkOf('R',t),hop:hop3(t,ct+.4,.5)+wb(t,lt<2.4,4)});
  pet('fox',lerp(-7.6,-3.9,ease(seg(lt,.4,2.6))),1.4,{face:1,talk:talkOf('F',t),hop:wb(t,lt<2.6,1)});
  pet('owl',5.5,1.0,{hop:hop3(t,open,.3)});pet('panda',7.3,1.3,{hop:hop3(t,open+.1,.3)});
  if(t>got)page3(1,{x:-.7,y:2.4,z:1.3,rz:-.2,s:.6});
  end3(g,S,t);
  const w=scr(1.5,4.4,-4.4);if(t>=open&&t<open+1.5)sparkles(g,w.x,w.y,t-open,2830,12,140);
  pointAt(g,w.x-160,w.y-150,w.x-40,w.y-40,seg(t,at(S,'r02','something'),at(S,'r02','something')+.4)*(1-seg(t,open-.2,open)));
  chip(g,'Tuesday · the big field',chipK(S,lt));pageHUD(g,t,chipK(S,lt));
  sayCard(g,'On Tuesdays, we play ball!',cardK(t,C.r03,S.end),112,DCOL[1],'#f7d7a6')};

/* 5. Wed/Thu — fly to the Game Arcade, push in through the door; Robot asks about Fox's week */
CAMS.arcade=(lt,S,t)=>{const C=S.cues,s=S.start;
  const c=krig(lt,[[0,{p:[0,2.6,17],l:[0,2.6,0]}],[.5,{p:[0,2.6,6.6],l:[0,2.2,-3]},2.4],[C.b02-s,{p:[0,3.0,4.6],l:[0,3.6,-7.5],f:44},1.2],[C.f04-s,{p:[-.6,2.6,7],l:[-.6,1.7,-2]},1.2]]);
  return W3('arc',c)};
const path2=(k,P)=>{const n=P.length-1,u=clamp(k)*n,i=Math.min(n-1,Math.floor(u)),f=u-i;return[lerp(P[i][0],P[i+1][0],f),lerp(P[i][1],P[i+1][1],f)]};
SC.arcade=(g,t,S)=>{const lt=t-S.start,C=S.cues,win=at(S,'b03','Here'),sc=seg(t,C.d10-.2,C.d10+.3);begin3();setO('arc');
  R3.scB.material.opacity=sc;for(const l of R3.plights)l.visible=true;
  const pop=seg(t,win,win+.8);if(pop>0)for(const[i,dx]of[[2,-1.6],[3,1.6]]){const k=back(pop);page3(i,{x:dx*k,y:3.8-.6*k,z:-7.4+4.2*k,rz:dx>0?.15:-.15,s:.9,glow:.5*(1-pop)})}
  pet('robot',0,-3,{talk:talkOf('B',t),hop:hop3(t,C.b01,.25)+hop3(t,win,.38),tilt:Math.sin(t*2)*.04});
  const walk=(n,d,P,f,k)=>{const q=ease(seg(lt,d,d+2.2)),[x,z]=path2(q,P);pet(n,x,z,{face:f,talk:talkOf(k,t),hop:wb(t,q<1,d*7)+(n==='fox'?hop3(t,C.f04,.32):0)})};
  walk('fox',.2,[[-.6,9],[-.4,4],[-3,0]],1,'F');walk('dragon',.35,[[-1,11],[-.8,4],[-4.9,.6]],1,'R');
  walk('owl',.3,[[.6,10],[.5,4],[3.25,0]],0,'O');walk('panda',.45,[[1,12],[.8,4],[4.9,.6]],0,'P');
  end3(g,S,t);
  chip(g,'Wednesday & Thursday · the Game Arcade',chipK(S,lt));pageHUD(g,t,chipK(S,lt));
  if(t>C.b02-.1&&t<C.f04)card(g,640,455,760,64,seg(t,C.b02,C.b02+.3),{seed:2980,fill:'#fffaf0',wash:'#dcd6f5',draw:g=>inkText(g,'Do you play computer games on Wednesdays?',0,11,32,{col:'#5a4fb0'})});
  card(g,330,420,280,76,cardK(t,C.f04,S.end),{seed:2985,fill:'#fffaf0',wash:'#cde8b5',draw:g=>inkText(g,'Yes, I do!',0,13,40,{col:'#1b6e2c'})})};

/* 6. Friday — the muddy pitch in the rain (handheld); u-words dig out the page; Dragon's splat */
CAMS.mud=(lt,S,t)=>{const C=S.cues,s=S.start,sp=at(S,'d12','Splat')-.15;
  const c=krig(lt,[[0,{p:[-2.2,2.9,12],l:[-.4,1.3,0]}],[C.r04-s,{p:[1.2,2.2,7.4],l:[.8,.6,.8],f:44},1.3],[C.r05-s,{p:[0,2.9,11],l:[0,1.5,0]},1.2],[C.d12-s,{p:[1,2.4,9.6],l:[1.2,1.0,.6]},1.0]]);
  return W3('mud',shk(hh(c,t,.07),t,sp,.2))};
SC.mud=(g,t,S)=>{const lt=t-S.start,C=S.cues,up=at(S,'r05','Up comes'),sp=at(S,'d12','Splat')-.15;begin3();setO('mud');
  const rise=seg(t,up,up+1);if(t<gotT(4)+.6)page3(4,{x:.75,y:lerp(-.1,2.3,ease(rise)),z:.9,rx:-.3*(1-rise),rz:lerp(.6,-.1,rise),s:.85,glow:.55*rise});
  const kick=seg(t,C.d12,sp),B=R3.ball;B.visible=true;B.position.set(O[0]+lerp(-1,3.1,easeIn(kick)),t>sp?.12:.3+Math.sin(kick*Math.PI)*1.6,O[1]+lerp(1.4,1.1,kick));B.rotation.set(t*8,0,t*5);
  burst('mud',t,sp,3.1,.15,1.1,30,3070,{v:2.4,up:3.4,s:.12,dur:.9});
  if(t>sp)for(let i=0;i<7;i++){const a=i*.9,r=.45+hash2(i,1,3071)*.45,k=back(seg(t,sp,sp+.25));bit('mud',3.1+Math.cos(a)*r*k,.06,1.1+Math.sin(a)*r*.5*k,.22*k,0)}
  const dx=lerp(-8,-2.1,ease(seg(lt,.2,2.2)));
  pet('dragon',dx,1.3,{face:1,talk:talkOf('R',t),hop:wb(t,lt<2.2,4)+hop3(t,C.d12+.1,.3),sq:t>sp&&t<sp+.4?.4:0});
  pet('owl',lerp(-9.5,-4.9,ease(seg(lt,.3,2.4))),1.6,{face:1,talk:talkOf('O',t),hop:wb(t,lt<2.4,2)});
  pet('fox',5,1.6,{hop:hop3(t,up+.2,.35)});pet('panda',7.2,1.9,{hop:hop3(t,up+.3,.35)});
  // rain streaks round the camera's look point
  {const a=R3.rain.geometry.attributes.position.array;R3.rain.visible=true;for(let i=0;i<900;i++){const x=hash2(i,1,3090)*26-13+t*.8%26,z=hash2(i,4,3090)*18-9,y=9-((hash2(i,2,3090)*9+t*(8+hash2(i,3,3090)*3))%9);
    const X=O[0]+((x+13)%26)-13,Z=O[1]+z;a[i*6]=X;a[i*6+1]=y;a[i*6+2]=Z;a[i*6+3]=X-.06;a[i*6+4]=y-.38;a[i*6+5]=Z}R3.rain.geometry.attributes.position.needsUpdate=true}
  end3(g,S,t);
  if(t>sp){const h=head('dragon',dx,1.3,0,-.5);for(const[ox,oy]of[[-20,-10],[25,-50],[-5,-75]])mudSplat(g,h.x+ox,h.y+oy,.25,3080+ox,seg(t,sp+.1,sp+.3))}
  if(t>C.r05)['mud','duck','sun','jump','bus'].forEach((w,i)=>{const k=seg(t,at(S,'r05',w),at(S,'r05',w)+.3)*(1-seg(t,C.d12,C.d12+.4));if(k<=0)return;const x=260+i*190,y=210+Math.sin(i*1.7)*30;
    card(g,x,y,160,70,k,{seed:3060+i,fill:'#fffaf0',wash:'#f7d7a6',draw:g=>uWord(g,w,0,13,40)})});
  chip(g,'Friday · the football pitch',chipK(S,lt));pageHUD(g,t,chipK(S,lt));
  if(t>C.o05-.1&&t<C.r05)card(g,640,190,560,80,seg(t,C.o05,C.o05+.3),{seed:3095,fill:'#fffaf0',wash:'#f7d7a6',draw:g=>{inkText(g,'u',-150,13,44,{col:'#e2382c'});inkText(g,'as in',-50,13,36,{col:'#5a3d28'});uWord(g,'mud',90,13,44)}})};

/* 7. Saturday — the open-air stage at dusk; days in order open the curtain; spotlights; Panda sings */
CAMS.stage=(lt,S)=>{const C=S.cues,s=S.start;
  return W3('stg',krig(lt,[[0,{p:[0,3.3,13.5],l:[0,2.7,-2]}],[C.o06-s,{p:[0,3.5,10.4],l:[0,3.0,-2],f:40},1.3],[C.p05-s,{p:[-1.2,2.8,10],l:[-.9,2.5,-1.5]},1.3]]))};
SC.stage=(g,t,S)=>{const lt=t-S.start,C=S.cues,open=gateT('q6')+.1,op=ease(seg(t,open,open+1.4));begin3();setO('stg');
  stageSet(op,t);for(const{L}of R3.spots)L.visible=op>0;
  page3(5,{x:0,y:3.2,z:-3.9,s:1.1,glow:.45*op});
  if(op<1){const L=R3.lock;L.visible=true;L.position.y=3.7+op*3;L.rotation.z=Math.sin(t*2)*.05;
    [3,0,5,1,4,2].forEach((d,k)=>page3(d,{x:(k-2.5)*1.45,y:2.2+Math.sin(k*1.9)*.35+op*3.5,z:-1.3,rz:Math.sin(k*2.3)*.35+op*k,s:.8,alpha:1-op}))}
  const sing=t>C.p05&&t<endOf(S,'p05')+.6,px=lerp(-4.2,-1.4,op);
  pet('panda',px,-.5,{y:1,face:1,talk:talkOf('P',t),hop:sing?Math.abs(Math.sin(t*6))*.22:hop3(t,C.p04,.25),tilt:sing?Math.sin(t*6)*.08:0});
  pet('owl',-6.1,1.9,{face:1,talk:talkOf('O',t)});pet('dragon',4.9,2.0,{hop:hop3(t,open+.4,.38)});pet('fox',7.0,2.3,{hop:hop3(t,open+.5,.38)});
  end3(g,S,t);
  if(sing){const h=head('panda',px,-.5,1);for(let i=0;i<4;i++){const k=((t-C.p05)*.8+i*.25)%1;note(g,h.x+Math.sin(k*6+i)*40+i*20,h.y-k*200+40,1,['#e2382c','#1d9ae0','#7b5bd6','#2e9b74'][i])}}
  chip(g,'Saturday · the big stage',chipK(S,lt));pageHUD(g,t,chipK(S,lt));
  sayCard(g,'On Saturdays, we sing!',cardK(t,C.p05,S.end),112,DCOL[5],'#dcd6f5')};

/* 8. Sunday forest — night fog; a lost little rabbit steps out from behind the big tree */
CAMS.forest=(lt,S)=>{const C=S.cues,s=S.start,seen=at(S,'d16','Behind')-s;
  const base={p:[-2,2.0,11],l:[-1.4,1.4,0]},close={p:[1.6,1.5,6.3],l:[3.2,1.0,.4],f:40};
  return W3('for',krig(lt,[[0,{p:[-6,2.4,13],l:[-3,1.5,0]}],[.2,base,3],[seen,close,1.2],[C.r06-s,base,1],[C.a01-s,close,1],[C.p06-s,base,1],[C.a04-s,close,1],[C.f06-s,{p:[0,2.6,12],l:[0,1.6,0]},1.2]]))};
SC.forest=(g,t,S)=>{const lt=t-S.start,C=S.cues,seen=at(S,'d16','Behind'),joy=C.a05;begin3();setO('for');
  const out=ease(seg(t,seen,seen+1)),sob=t<joy?Math.sin(t*9)*.04:0,rx=lerp(4.8,3,out),rz=lerp(-.7,.9,out);
  pet('rabbit',rx,rz,{talk:talkOf('A',t),tilt:sob,hop:hop3(t,joy,.6)+hop3(t,joy+.5,.5),alpha:seg(t,seen-.4,seen)});
  if(t>seen-.4&&t<joy+1.2)page3(6,{x:rx-.75,y:.95,z:rz+.15,rz:-.3,s:.6,blank:t<joy,glow:t>joy?.7:0});
  const walk=ease(seg(lt,.3,3.2)),wk=walk<1;
  pet('dragon',lerp(-11,-2.75,walk),1.2,{face:1,talk:talkOf('R',t),hop:wb(t,wk,4)+hop3(t,C.r06,.38)});
  pet('fox',lerp(-9.5,-1,walk),1.5,{face:1,talk:talkOf('F',t),hop:wb(t,wk,1)+hop3(t,joy+.2,.38)});
  pet('owl',lerp(-12.5,-4.5,walk),1.0,{face:1,talk:talkOf('O',t),hop:wb(t,wk,2)});
  pet('panda',lerp(-14,-6.3,walk),1.6,{face:1,talk:talkOf('P',t),hop:wb(t,wk,3)});
  end3(g,S,t);
  const rh=head('rabbit',rx,rz,0,-.55);
  if(t>C.f05&&t<joy)for(let i=0;i<2;i++){const k=((t*1.3)+i*.5)%1;g.fillStyle=`rgba(150,210,255,${1-k})`;g.beginPath();g.arc(rh.x+(i?14:-14),rh.y+k*40,4,0,7);g.fill()}
  for(let i=0;i<16;i++){const p=scr(hash2(i,1,3260)*18-9+Math.sin(t*.7+i)*.5,.6+hash2(i,2,3260)*3.5+Math.sin(t*1.3+i*2)*.25,hash2(i,3,3260)*6-4);if(p.on)glow(g,p.x,p.y,14,'rgba(255,240,140,A)',.6+.4*Math.sin(t*4+i))}
  darkness(g,.32*(1-seg(t,joy,joy+1)),[[rh.x,rh.y+40,230,1],[640,420,440,.8]]);
  chip(g,'Sunday · the dark forest',chipK(S,lt));pageHUD(g,t,chipK(S,lt));
  card(g,640,112,620,86,cardK(t,C.o08,C.a04),{seed:3270,fill:'#fffaf0',wash:'#cde8b5',draw:g=>inkText(g,"It's okay to ask for help!",0,13,40,{col:'#2e7d4f'})});
  if(t>C.f06-.1&&t<C.a05)riddleCard(g,'I come after Saturday. I am a weekend day.',seg(t,C.f06,C.f06+.3),3280)};

/* 9. Lake — back at the square the pages fly home, then a long flight across town to the lake picnic */
const lakeFly=S=>[at(S,'d17','Then')-.1,S.cues.a06+.1];
CAMS.lake=(lt,S,t)=>{const[f0,f1]=lakeFly(S),k=ease(seg(t,f0,f1));
  const a=W3('sq',{p:[0,3.4,13.8],l:[0,2.8,-2]}),b=W3('lake',hh({p:[0,3.7,13.2],l:[0,1.2,-1],f:44},t,.05));
  return k<=0?a:k>=1?b:flyMix(a,b,k)};
SC.lake=(g,t,S)=>{const lt=t-S.start,C=S.cues,[f0,f1]=lakeFly(S),fk=seg(t,f0,f1),sorted=gateT('q8')+.1;begin3();
  if(fk<.5){setO('sq');
    boardPages(i=>{const k=ease(seg(lt,.4+i*.22,1.2+i*.22));return{dx:(1-k)*(hash2(i,1,3300)*16-8),dy:(1-k)*(6+hash2(i,2,3300)*5),dz:(1-k)*(hash2(i,3,3300)*8),rx:(1-k)*3,rz:(1-k)*4,alpha:seg(lt,.4+i*.22,.5+i*.22),glow:k<1?.6:0}});
    for(const[n,x,f,k]of[['dragon',-5.5,1,'R'],['fox',-2.8,1,'F'],['rabbit',-.6,1,'A'],['owl',2.9,0,'O'],['panda',5.4,0,'P']])pet(n,x,1.5,{face:f,talk:talkOf(k,t),hop:Math.abs(Math.sin(t*4+x))*.12*seg(lt,1.9,2.3)})}
  else{setO('lake');const gone=seg(t,sorted,sorted+.4);
    if(gone<1){R3.sweets.visible=R3.tv.visible=true;R3.sweets.scale.setScalar(1-gone);R3.tv.scale.setScalar(1-gone);R3.tvS.material.color.setHSL(.52,.7,.55+.15*Math.sin(t*9))}
    pet('rabbit_mum',4,.3,{hop:hop3(t,C.a06+.6,.38)});pet('rabbit',lerp(-3,3,ease(seg(t,C.a06-.4,C.a06+.6))),1.5,{face:1,talk:talkOf('A',t),hop:hop3(t,C.a06,.5)});
    pet('panda',-4.5,1.8,{face:1,talk:talkOf('P',t),hop:hop3(t,C.p07,.38)});pet('owl',-5.9,2.3,{y:1.3+Math.sin(t*3)*.08,face:1,talk:talkOf('O',t),shadow:false});
    pet('dragon',-6.9,2.4,{face:1});pet('fox',6.5,2.2,{face:0})}
  end3(g,S,t);
  if(fk>=.5){const gone=seg(t,sorted,sorted+.4);if(gone>0&&gone<1){const p=scr(1.6,.5,.9);sparkles(g,p.x,p.y,gone*1.1,3380,14,120)}}
  chip(g,fk<.5?'Back in Pet Town':'Sunday · the lake',fk<.5?seg(lt,.1,.7):seg(t,f1,f1+.6));
  sayCard(g,'Eat healthy food, keep fit, and have fun!',cardK(t,C.p07,S.end),112,'#2e7d4f','#cde8b5')};

/* 10. Play — hide-and-seek by the lake; the chant; a final crane-up over the whole of Pet Town */
CAMS.play=(lt,S,t)=>{const C=S.cues,s=S.start,T=S.end-s,c0=C.d20-s;
  let c=krig(lt,[[0,{p:[0,2.6,10.5],l:[0,1.5,0]}],[.3,{p:[0,3.0,12.5],l:[0,1.6,0]},Math.max(1,c0-.3)]]);
  const k=ease(seg(lt,c0+.4,T-.4));if(k>0)c=mixC(c,{p:[-10,34,30],l:[-26,0,-34],f:50},k);return W3('play',c)};
SC.play=(g,t,S)=>{const lt=t-S.start,C=S.cues,found=endOf(S,'a07')+.3,fin=C.f07;begin3();
  setO('sq');boardPages(()=>({}));setO('play');
  const po=i=>back(seg(t,found+i*.35,found+i*.35+.4)),all=t>fin-.3,J=i=>all?Math.abs(Math.sin(t*5+i))*.25:0;
  pet('rabbit',all?-1.5:-4.6,all?1:.3,{face:all?1:0,talk:talkOf('A',t),hop:J(0),tilt:all?0:.12});
  pet('panda',0,all?1:-1.2,{talk:talkOf('P',t),y:all?0:lerp(-1,0,po(0)),alpha:all||po(0)>0?1:0,hop:J(1),shadow:all||po(0)>.5});
  pet('fox',all?1.75:5.3,all?1:-1.4,{talk:talkOf('F',t),y:all?0:lerp(-.9,.4,po(1)),alpha:all||po(1)>0?1:0,hop:J(2),shadow:all});
  pet('owl',all?3.25:-3.6,all?1:.5,{talk:talkOf('O',t),y:all?0:lerp(1.8,2.4,po(2)),alpha:all||po(2)>0?1:0,shadow:all,hop:J(3)});
  pet('dragon',all?-3.25:lerp(-11,-3.25,ease(seg(t,C.r07-.8,C.r07))),1.2,{face:1,talk:talkOf('R',t),hop:J(4)});
  end3(g,S,t);
  chip(g,'Sunday · hide-and-seek',chipK(S,lt));
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
