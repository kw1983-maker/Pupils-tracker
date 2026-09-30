/* The Runaway Egg — Pet Stories, episode 1 (English, Year 1–2: prepositions)
   Cast = the app's own pet sprites (images/*.png, drawn with img()); narrator only, no host. */
const META={title:'The Runaway Egg · Pet Stories',h1:'Pet Stories · The Runaway Egg',lang:'en'};
const STYLE='watercolour';
const HOST='none';
const SOUND='elevenlabs';
const LINES={
 d01:['D','The Runaway Egg.'],
 d02:['D','One sunny morning, four friends played in the park.'],
 f01:['F','Look! A shiny egg!'],
 o01:['O',"Careful, Fox. Don't touch it!"],
 f02:['F','Just one little poke…'],
 p01:['P',"Oh no! It's rolling away!"],
 r01:['R',"Come on, team! Let's find it!"],
 d03:['D','They ran all the way to the beach.'],
 r02:['R','Where is the egg?'],
 o02:['O',"Look! It's under the umbrella!"],
 f03:['F','Oops! A wave took it again!'],
 d04:['D','Next, they climbed a cold, snowy hill.'],
 f04:['F','Look, tracks! Behind the rock!'],
 p02:['P',"Brrr… I'm cold. But let's keep going."],
 p03:['P','There it is! On the ice bridge!'],
 o03:['O',"The ice is thin. Let's think first."],
 r03:['R','No time! Fire power!'],
 d05:['D','Oh no! The fire melted the bridge!'],
 f05:['F','The egg is floating away!'],
 o04:['O',"I'll fly above and look!"],
 o05:['O',"It's stuck next to the big tree!"],
 p04:['P',"I'll push this log across the river!"],
 f06:['F','I can reach under the branch… Got it!'],
 r04:['R',"I won't use fire. I'll keep it warm, gently."],
 d06:['D','Then… the egg began to glow!'],
 b01:['B','Beep boop! Hello, friends!'],
 r05:['R',"I'm sorry, everyone. I didn't think first."],
 o06:['O',"That's okay. We did it together!"],
 p05:['P','Welcome to the team, little Robot!'],
 b02:['B','Beep! Team!'],
 d07:['D','Remember: think first, and work together.'],
 d13:['D','Bye bye! See you next time!'],
 f07:['F','Bye!'],
 d14:['D','The egg rolled off the beach and into the woods.'],
 p06:['P','Listen! Something is rolling in there.'],
 o07:['O',"It's in the hollow log!"],
 r06:['R',"I'll pull it out!"],
 f08:['F',"Wait, I'm small. I can go in!"],
 f09:['F','Whoa! It rolled out the other side!'],
 d15:['D','The sun was going down. Fox felt very sad.'],
 f10:['F',"It's all my fault. I poked the egg."],
 p07:['P',"Don't be sad, Fox. We can still save it."],
 o08:['O',"Let's stop and think together."],
 d16:['D','The next day, the five friends played in the park.'],
 b03:['B',"Beep! Let's play hide and seek!"],
 r07:['R','One, two, three… ready or not!'],
 b04:['B',"Beep… I'm behind the tree."],
 f11:['F',"I'm under the slide!"],
 p08:['P',"I'm in the bush!"],
 o09:['O',"And I'm above you, in the tree!"],
 r08:['R','Found you all!'],
 b05:['B','Beep beep! Again, again!'],
};
const SPK={D:['Narrator','#7a6a5a'],R:['Dragon','#2e9b74'],F:['Fox','#d9731a'],O:['Owl','#8a6440'],P:['Panda','#4b4b58'],B:['Robot','#6a4fc9']};

const PLAN=[
 {id:'title',  pre:1.2, seq:['d01'], post:1.4},
 {id:'park',   pre:0.8, seq:['d02',0.3,'f01',0.2,'o01',0.2,'f02',1.5,'p01',0.2,'r01'], post:1.0},
 {id:'beach',  pre:0.8, seq:['d03',0.3,'r02',0.4,'o02',1.4,'f03'], post:0.7},
 {id:'woods',  pre:0.8, seq:['d14',0.3,'p06',0.3,'o07',0.3,'r06',1.0,'f08',1.8,'f09'], post:0.8},
 {id:'hill',   pre:0.6, seq:['d04',0.5,'f04',0.4,'p02'], post:0.6},
 {id:'bridge', pre:0.8, seq:['p03',0.3,'o03'], post:0.2},
 {id:'melt',   pre:0.2, seq:['r03',1.6,'d05',0.4,'f05'], post:1.0},
 {id:'sad',    pre:1.0, seq:['d15',0.6,'f10',0.5,'p07',0.4,'o08'], post:1.0},
 {id:'rescue', pre:0.6, seq:['o04',0.8,'o05',0.4,'p04',1.0,'f06',0.6,'r04'], post:0.8},
 {id:'hatch',  pre:0.8, seq:['d06',1.6,'b01',0.5,'r05',0.3,'o06',0.3,'p05',0.3,'b02',0.6,'d07'], post:1.4},
 {id:'play',   pre:0.8, seq:['d16',0.3,'b03',0.3,'r07',1.4,'b04',0.5,'f11',0.5,'p08',0.5,'o09',0.8,'r08',0.4,'b05'], post:1.0},
 {id:'bye',    pre:0.6, seq:['d13',0.2,'f07'], post:3.0},
];
const GAP=0.18;
const TRANS={beach:'whip',woods:'whip',hill:'style',sad:'ink',hatch:'iris',play:'paper'};

/* ---------- story moments (absolute times), shared by scenes and SFX */
const endOf=(S,id)=>S.cues[id]+CLIP[id].eff;
const pokeT=S=>endOf(S,'f02')+.15;             // park: fox pokes, egg rolls
const waveT=S=>endOf(S,'o02')+.2;              // beach: wave sweeps the egg away
const fireT=S=>at(S,'r03','Fire')+.1;          // melt: fire breath starts
const meltT=S=>fireT(S)+1.6;                   // bridge gives way
const hatchT=S=>S.cues.b01-.45;                // hatch flash

function chapterSFX(){const S=shot,C=cue,len=slen;const pk=S('park'),be=S('beach'),hi=S('hill'),br=S('bridge'),me=S('melt'),re=S('rescue'),ha=S('hatch');return[
  {t:S('title').start+.8,name:'sfx_sparkle',gain:.6},
  {t:pk.start,name:'sfx_birds',loop:true,dur:len('park'),gain:.28},
  {t:C('park','f01')-.2,name:'sfx_sparkle',gain:.5},
  {t:pokeT(pk),name:'sfx_pop',dur:.8,gain:.8},
  {t:pokeT(pk)+.25,name:'sfx_whoosh',dur:1.4,gain:.6},
  {t:be.start,name:'sfx_waves',loop:true,dur:len('beach'),gain:.35},
  {t:waveT(be)+.35,name:'sfx_splash',gain:.9},
  {t:S('woods').start,name:'sfx_birds',loop:true,dur:len('woods'),gain:.25},
  {t:popT(S('woods')),name:'sfx_pop',dur:.8,gain:.9},
  {t:popT(S('woods'))+.2,name:'sfx_whoosh',dur:1.2,gain:.55},
  {t:S('sad').start,name:'sfx_waves',loop:true,dur:len('sad'),gain:.15},
  {t:hi.start,name:'sfx_whoosh',dur:1.2,gain:.35},
  {t:at(hi,'f04','tracks'),name:'sfx_pop',dur:.6,gain:.5},
  {t:C('bridge','p03')-.1,name:'sfx_sparkle',gain:.5},
  {t:fireT(me),name:'sfx_firebreath',gain:1},
  {t:fireT(me)+.35,name:'sfx_fire',dur:1.2,gain:.7},
  {t:meltT(me)-.2,name:'sfx_icecrack',gain:1},
  {t:meltT(me)+.7,name:'sfx_splash',gain:.9},
  {t:re.start,name:'sfx_waves',loop:true,dur:len('rescue'),gain:.2},
  {t:C('rescue','o04')+.2,name:'sfx_whoosh',dur:1.2,gain:.5},
  {t:at(re,'p04','push'),name:'sfx_whoosh',dur:1,gain:.45},
  {t:at(re,'f06','Got it'),name:'sfx_ding',gain:.7},
  {t:C('rescue','r04')+.4,name:'sfx_sparkle',gain:.4},
  {t:ha.start,name:'sfx_crickets',loop:true,dur:len('hatch'),gain:.22},
  {t:C('hatch','d06')+.4,name:'sfx_sparkle',gain:.6},
  {t:hatchT(ha)-.5,name:'sfx_hatch',gain:1},
  {t:C('hatch','b02')-.1,name:'sfx_pop',dur:.6,gain:.6},
  {t:S('play').start,name:'sfx_birds',loop:true,dur:len('play'),gain:.25},
  {t:C('play','b04'),name:'sfx_pop',dur:.5,gain:.5},
  {t:C('play','f11'),name:'sfx_pop',dur:.5,gain:.5},
  {t:C('play','p08'),name:'sfx_pop',dur:.5,gain:.5},
  {t:C('play','o09'),name:'sfx_pop',dur:.5,gain:.5},
  {t:C('play','r08'),name:'sfx_sparkle',gain:.6},
  {t:S('bye').start,name:'sfx_birds',loop:true,dur:len('bye')-1,gain:.25},
  {t:C('bye','f07'),name:'sfx_pop',dur:.6,gain:.6},
];}

/* =====================================================================
   PETS (real app sprites) + props
   ===================================================================== */
// feet at (x,y), h = drawn height. face:1 = face right (the sprites look left).
// talk (0..1, from amp) squashes and bobs the whole sprite since there is no mouth rig.
function drawPet(g,name,x,y,h,o={}){const{face=0,talk=0,hop=0,tilt=0,alpha=1,sq=0,shadow=true,glowCol=null,glowA=0}=o;const im=img(name);if(!im||alpha<=0)return;
  const br=Math.sin(TT*2.3+x*.013)*.012;
  g.save();g.translate(x,y);
  if(shadow){g.save();g.globalAlpha=.2*alpha*clamp(1-hop/220);g.fillStyle='#3a2a1a';g.beginPath();g.ellipse(0,0,h*.3,h*.055,0,0,7);g.fill();g.restore()}
  g.translate(0,-hop);if(glowCol)glow(g,0,-h*.45,h*.8,glowCol,glowA);
  g.rotate(tilt);const sy=1+br+talk*.08-sq*.16,sx=1-talk*.03+sq*.14;g.scale((face?-1:1)*sx,sy);g.globalAlpha*=alpha;
  g.drawImage(im,-h/2,-h*.97,h,h);g.restore()}
const talkOf=(k,t)=>amp(k,t);
const hopOf=(t,t0,hgt=40,dur=.45)=>{const u=(t-t0)/dur;return u>0&&u<1?Math.sin(u*Math.PI)*hgt:0};
// a looping walk bounce while moving
const walkBob=(t,on,seed=0)=>on?Math.abs(Math.sin(t*9+seed))*12:0;

function sky(g,top,bot){const s=g.createLinearGradient(0,-200,0,600);s.addColorStop(0,top);s.addColorStop(1,bot);g.fillStyle=s;g.fillRect(-500,-400,2400,1500)}
function tree(g,x,y,s,seed,col='#3f8a3a'){g.save();g.translate(x,y);g.scale(s,s);blob(g,rectP(-14,-190,28,190),'#6b4526',{seed,w:2.2});
  blob(g,ell(0,-230,95,80,24),col,{seed:seed+1,w:2.4});blob(g,ell(-55,-190,55,45,18),col,{seed:seed+2,w:2});blob(g,ell(55,-195,58,45,18),col,{seed:seed+3,w:2});g.restore()}
function cloud(g,x,y,s,seed){blob(g,ell(x,y,90*s,34*s,18),'#ffffff',{seed,w:1.6,alpha:.9});blob(g,ell(x+40*s,y-20*s,50*s,30*s,14),'#ffffff',{seed:seed+1,w:1.6,alpha:.9})}
function umbrella(g,x,y,s){g.save();g.translate(x,y);g.scale(s,s);inkPoly(g,[[0,0],[0,-230]],{w:7,seed:701,col:'#6b4526'});
  const cols=['#e2382c','#fffaf0','#e2382c','#fffaf0','#e2382c','#fffaf0'];for(let i=0;i<6;i++){const a0=Math.PI+i*Math.PI/6,a1=a0+Math.PI/6;
    blob(g,[[0,-230],...ell(0,-230,190,95,6,a0,a1)],cols[i],{seed:710+i,w:2})}g.restore()}
function rock(g,x,y,s,seed){g.save();g.translate(x,y);g.scale(s,s);blob(g,subdiv([[-150,0],[-120,-150],[-20,-210],[110,-170],[160,0]],10),'#8a8f99',{seed,w:2.6});
  blob(g,subdiv([[-110,-150],[-20,-205],[100,-168],[40,-150],[-40,-160]],8),'#ffffff',{seed:seed+1,w:1.6});hatch(g,subdiv([[-40,-20],[-10,-120],[80,-110],[120,-10]],6),{ang:.7,sp:12,seed:seed+2,col:'rgba(60,60,70,.25)'});g.restore()}
function snowfall(g,t,seed,n=70,a=1){g.save();g.globalAlpha=a;g.fillStyle='#ffffff';for(let i=0;i<n;i++){const x=(hash2(i,1,seed)*1600+Math.sin(t*.8+i)*30)%1600-160,y=((hash2(i,2,seed)*900+t*(40+hash2(i,3,seed)*50))%900)-100;g.beginPath();g.arc(x,y,2+hash2(i,4,seed)*3,0,7);g.fill()}g.restore()}
function stars(g,t,seed,n=60){for(let i=0;i<n;i++){const x=hash2(i,1,seed)*1400-60,y=hash2(i,2,seed)*380-40,tw=.5+.5*Math.sin(t*2+i*1.7);g.fillStyle=`rgba(255,250,210,${.35+.6*tw})`;g.beginPath();g.arc(x,y,1.4+hash2(i,3,seed)*1.8,0,7);g.fill()}}
function log(g,x1,y1,x2,y2){const a=Math.atan2(y2-y1,x2-x1),L=Math.hypot(x2-x1,y2-y1);g.save();g.translate(x1,y1);g.rotate(a);
  blob(g,rrectP(0,-18,L,36,16),'#8a5a2b',{seed:760,w:2.4});hatch(g,rrectP(8,-12,L-16,24,10),{ang:0,sp:8,seed:761,col:'rgba(60,35,15,.35)'});blob(g,ell(L,0,12,18,12),'#c9985a',{seed:762,w:2});g.restore()}
// the big preposition card, e.g. wordCard(g,'under',…)
function wordCard(g,word,x,y,k,col='#1d6fa5',wsh='#bfe3f7'){card(g,x,y,300,96,k,{seed:800+word.length,fill:'#fffaf0',wash:wsh,draw:g=>inkText(g,word,0,20,60,{col})})}
// a pointing arrow drawn in ink
function pointAt(g,x1,y1,x2,y2,k,col='#e2382c'){if(k<=0)return;arrow(g,x1,y1,x2,y2,k,{w:6,col})}

/* =====================================================================
   SCENES
   ===================================================================== */

/* 1. Title — the egg pod wobbles, the pets peek in */
SC.title=(g,t,S)=>{const lt=t-S.start,T=S.end-S.start;
  g.save();camApply(g,{x:640,y:360+8*seg(lt,0,T),z:1.02+.06*ease(seg(lt,0,T)),r:0});
  sky(g,'#bfe3f7','#fbf1d8');wash(g,300,180,380,'#f6d27a',seg(lt,0,1.4),1,.55);wash(g,1000,420,360,'#cde8b5',seg(lt,.3,1.8),2,.5);
  blob(g,subdiv([[-400,560],[1700,560],[1700,900],[-400,900]],20),'#9fcf7a',{seed:900,w:2.4});
  const wob=Math.sin(lt*6)*.08*(1-seg(lt,T-1,T));glow(g,640,470,220,'rgba(160,200,255,A)',.5+.2*Math.sin(lt*3));
  drawPet(g,'egg',640,590,230,{tilt:wob,sq:land(lt*1.2-.2)*.5});
  const pets=[['dragon',190,1,.5],['fox',380,1,.7],['owl',900,0,.9],['panda',1090,0,1.1]];
  for(const[n,x,f,d]of pets){const k=spring(clamp((lt-d)*1.4));drawPet(g,n,x,lerp(760,600,clamp(k)),150,{face:f,hop:hopOf(lt,d+.9,18)})}
  inkText(g,'The Runaway Egg',640,200,104,{reveal:seg(lt,.2,1.6),stroke:'#fffaf0',sw:14,col:'#b35a00'});
  inkText(g,'Pet Stories · Episode 1',640,268,36,{alpha:seg(lt,1.4,2.2),col:'#5a3d28'});
  sparkles(g,640,440,(lt-.8)%1.4,910,12,160);
  g.restore();if(lt<.6){g.fillStyle=`rgba(243,234,214,${1-lt/.6})`;g.fillRect(0,0,W,H)}};

/* 2. Park — Fox pokes the egg and it rolls away */
SC.park=(g,t,S)=>{const lt=t-S.start,pk=pokeT(S),f1=S.cues.f01,rl=seg(t,pk,pk+1.6),run=seg(t,S.cues.r01+.8,S.end);
  const c=rig(lt,[[0,{x:640,y:380,z:1.0}],[f1-S.start,{x:640,y:380,z:1.0}],[f1-S.start+.8,{x:820,y:420,z:1.25},'io'],[pk-S.start,{x:840,y:420,z:1.3}],[pk-S.start+1.2,{x:900,y:400,z:1.05},'out'],[S.cues.p01-S.start+.2,{x:640,y:380,z:1.0},'io']]);
  g.save();camApply(g,shake(c,'impact',t,{t0:pk,amp:8}));
  sky(g,'#9fd0ee','#eef8fb');wash(g,1120,90,140,'#f6d27a',1,11,.7);cloud(g,280,110,1,12);cloud(g,820,70,.8,14);
  layer(g,c,.6,g=>{blob(g,subdiv([[-400,470],[200,380],[700,430],[1300,370],[1800,470],[1800,700],[-400,700]],24),'#b9dc8f',{seed:920,w:2});tree(g,120,470,.8,930);tree(g,1180,430,.7,934,'#4f9a45')});
  // grass with a slope down to the right after x≈1060
  blob(g,subdiv([[-400,600],[1060,600],[1500,720],[1900,760],[1900,900],[-400,900]],24),'#8bc36a',{seed:940,w:2.4});
  for(let i=0;i<30;i++){const x=hash2(i,1,941)*1500-100,y=610+hash2(i,2,941)*60;inkPoly(g,[[x,y],[x+4,y-14]],{w:2,seed:942+i,col:'#4f8a3a'})}
  // egg: glows, rolls down the slope after the poke
  const ex=lerp(1000,1560,easeIn(rl)),ey=600+(ex>1060?(ex-1060)*.27:0),er=rl*9;
  if(rl<1){glow(g,ex,ey-50,140,'rgba(170,210,255,A)',.55*(1-rl));drawPet(g,'egg',ex,ey,110,{tilt:t<pk?Math.sin(lt*4)*.05:er,shadow:rl<.1})}
  // pets
  const talkF=talkOf('F',t),leanF=seg(t,S.cues.f02,pk)*.25;
  const fx=lerp(lerp(560,900,ease(seg(t,f1,f1+1))),1500,easeIn(run));
  drawPet(g,'fox',fx,605,150,{face:1,talk:talkF,tilt:leanF-(t>pk&&t<pk+.5?.2:0),hop:hopOf(t,pk,30)+walkBob(t,run>0&&run<1,1)});
  const ox=lerp(760,1500,easeIn(seg(run,.05,1)));drawPet(g,'owl',ox,600,140,{talk:talkOf('O',t),hop:hopOf(t,S.cues.o01,14)+walkBob(t,run>0&&run<1,2)});
  const px=lerp(420,1500,easeIn(seg(run,.12,1)));drawPet(g,'panda',px,610,150,{face:t>pk?1:0,talk:talkOf('P',t),hop:hopOf(t,S.cues.p01,26)+walkBob(t,run>0&&run<1,3)});
  const dx=lerp(260,1500,easeIn(seg(run,.0,1)));drawPet(g,'dragon',dx,605,165,{face:1,talk:talkOf('R',t),hop:hopOf(lt,.6,30)+hopOf(lt,1.6,30)+hopOf(t,S.cues.r01,50,.6)+walkBob(t,run>0&&run<1,4)});
  if(t>pk&&t<pk+1.4)for(let i=0;i<3;i++)inkText(g,'!',[fx-10,px,ox][i],470-i*6,56,{col:'#e2382c',alpha:seg(t,pk+.1*i,pk+.1*i+.2)*(1-seg(t,pk+1,pk+1.4))});
  g.restore();
  chip(g,'In the park',seg(lt,.1,.7));
  const q=seg(t,S.cues.r01,S.cues.r01+.4)*(1-seg(t,S.end-.5,S.end));card(g,1040,110,340,80,q,{seed:950,fill:'#fffaf0',wash:'#f6d27a',draw:g=>inkText(g,'Where did it go?',0,12,34,{col:'#b35a00'})})};

/* 3. Beach — UNDER the umbrella, then a wave */
SC.beach=(g,t,S)=>{const lt=t-S.start,wv=waveT(S),arrive=seg(lt,.1,1.8),wk=seg(t,wv,wv+1.2);
  const c=rig(lt,[[0,{x:560,y:380,z:1.05}],[S.cues.o02-S.start,{x:640,y:380,z:1.0}],[S.cues.o02-S.start+.6,{x:760,y:420,z:1.22},'io'],[wv-S.start,{x:760,y:420,z:1.22}],[wv-S.start+.8,{x:700,y:390,z:1.05},'out']]);
  g.save();camApply(g,shake(c,'impact',t,{t0:wv+.35,amp:6}));
  sky(g,'#8fcbee','#f4fbfd');wash(g,1080,120,160,'#fff2b0',1,21,.7);cloud(g,360,90,.9,22);
  blob(g,rectP(-400,330,2200,150),'#3f9fd0',{seed:960,w:2});
  for(let i=0;i<4;i++){const y=350+i*30,o=(t*30+i*40)%90,p=[];for(let x=-400;x<1800;x+=40)p.push([x+o,y+Math.sin(x*.04+t*2+i)*4]);inkPoly(g,p,{w:1.6,seed:961+i,col:'rgba(255,255,255,.6)'})}
  blob(g,subdiv([[-400,470],[1800,470],[1800,900],[-400,900]],24),'#f1dca5',{seed:970,w:2.4});
  for(let i=0;i<14;i++){const x=hash2(i,1,971)*1400,y=520+hash2(i,2,971)*120;blob(g,ell(x,y,6,3,8),'#d8b97a',{seed:972+i,w:1,ink:false})}
  // the wave that sweeps up the sand
  if(wk>0&&wk<1){const r=Math.sin(wk*Math.PI),edge=lerp(470,640,r);blob(g,subdiv([[-400,460],[1800,460],[1800,edge],[1100,edge+20],[600,edge-10],[-400,edge]],24),'#6fbde3',{seed:975,w:2,alpha:.85});
    for(let i=0;i<8;i++){const x=500+i*70,y=edge-10;g.fillStyle='rgba(255,255,255,.85)';g.beginPath();g.arc(x+Math.sin(t*8+i)*6,y,10,0,7);g.fill()}}
  umbrella(g,820,600,1);
  // egg under the umbrella; the wave carries it off to the right
  const ex=lerp(830,1600,easeIn(seg(wk,.35,1))),ey=598-Math.sin(seg(wk,.35,1)*Math.PI)*120;
  drawPet(g,'egg',ex,ey,92,{tilt:seg(wk,.35,1)*6,shadow:wk<.35});
  const splashF=wk>.3?1:0;
  drawPet(g,'dragon',lerp(-100,380,ease(arrive)),605,160,{face:1,talk:talkOf('R',t),hop:walkBob(t,arrive<1,4)+hopOf(t,S.cues.r02,16),tilt:t>S.cues.r02&&t<S.cues.o02?Math.sin(t*3)*.08:0});
  drawPet(g,'owl',lerp(-260,560,ease(seg(lt,.3,2))),600,138,{talk:talkOf('O',t),hop:walkBob(t,lt<2,2)+hopOf(t,S.cues.o02,24)});
  drawPet(g,'fox',lerp(-420,660,ease(seg(lt,.5,2.2))),605,145,{face:1,talk:talkOf('F',t),hop:walkBob(t,lt<2.2,1)+hopOf(t,wv+.4,40),tilt:splashF?-.12:0});
  drawPet(g,'panda',lerp(-560,200,ease(seg(lt,.6,2.4))),610,150,{face:1,talk:talkOf('P',t),hop:walkBob(t,lt<2.4,3)});
  pointAt(g,600,420,760,540,seg(t,at(S,'o02','under'),at(S,'o02','under')+.4)*(1-wk));
  g.restore();
  chip(g,'At the beach',seg(lt,.1,.7));
  wordCard(g,'under',1060,120,seg(t,at(S,'o02','under')-.05,at(S,'o02','under')+.35))};

/* 3b. Woods — IN the hollow log; Fox goes in, the egg pops out */
const popT=S=>endOf(S,'f08')+.9;               // woods: egg shoots out of the far end
function hollowLog(g,x1,x2,y,hgt){blob(g,rrectP(x1,y-hgt,x2-x1,hgt,hgt/2),'#8a5a2b',{seed:1500,w:2.6});hatch(g,rrectP(x1+30,y-hgt+14,x2-x1-60,hgt-28,20),{ang:0,sp:14,seed:1501,col:'rgba(60,35,15,.35)'});
  for(const x of[x1,x2]){blob(g,ell(x,y-hgt/2,hgt*.32,hgt/2,20),'#c9985a',{seed:1502+x,w:2.2});blob(g,ell(x,y-hgt/2,hgt*.22,hgt*.36,18),'#2e1d10',{seed:1504+x,w:1.4,ink:false})}}
SC.woods=(g,t,S)=>{const lt=t-S.start,C=S.cues,pt=popT(S),rollIn=seg(lt,0,1.6),fin=seg(t,at(S,'f08','go in'),at(S,'f08','go in')+1),out=seg(t,pt,pt+1.3);
  const tug=t>C.r06&&t<endOf(S,'r06')+.6,wig=(tug?Math.sin(t*28)*3:0)+(t>endOf(S,'f08')&&t<pt?Math.sin(t*40)*4:0)+(t>C.p06&&t<C.o07?Math.sin(t*12)*1.5:0);
  const c=rig(lt,[[0,{x:560,y:390,z:1.05}],[C.o07-S.start,{x:640,y:390,z:1.05}],[C.o07-S.start+.5,{x:620,y:430,z:1.2},'io'],[pt-S.start-.2,{x:680,y:420,z:1.15}],[pt-S.start+.8,{x:780,y:390,z:1.0},'out']]);
  g.save();camApply(g,shake(c,'impact',t,{t0:pt,amp:7}));
  sky(g,'#bfe0c8','#f3f6e8');
  layer(g,c,.5,g=>{for(let i=0;i<9;i++)tree(g,-100+i*190,560,.8+hash2(i,1,1510)*.4,1511+i*4,i%2?'#4f8a4a':'#3e7a45')});
  blob(g,subdiv([[-400,600],[1800,600],[1800,900],[-400,900]],20),'#7fa85a',{seed:1520,w:2.4});
  for(let i=0;i<14;i++){const x=hash2(i,1,1521)*1500-100;blob(g,ell(x,612+hash2(i,2,1521)*20,24,10,10),'#5e8a3e',{seed:1522+i,w:1.2})}
  // egg rolls in from the left and into the log (the log body covers it)
  if(t<pt)drawPet(g,'egg',lerp(-80,720,easeOut(rollIn)),598,84,{tilt:rollIn*10,shadow:rollIn<.8,alpha:1-seg(rollIn,.85,1)});
  // fox squeezes in (hidden by the log) and pops out of the far end after the egg
  const foxX=fin<1?lerp(420,640,ease(fin)):lerp(1000,1090,ease(seg(t,pt+.5,pt+1.1)));
  if(t<pt+.5)drawPet(g,'fox',foxX,604,138,{face:1,talk:talkOf('F',t),tilt:fin>0?.25*fin:0});
  g.save();g.translate(0,wig*.3);hollowLog(g,580,1000,610,130);g.restore();
  if(t>C.p06-.2&&t<pt)glow(g,592,545,110,'rgba(170,210,255,A)',.45+.2*Math.sin(t*6));
  if(t>=pt+.5)drawPet(g,'fox',foxX,604,138,{face:1,talk:talkOf('F',t),hop:hopOf(t,C.f09,26)});
  // the egg shoots out and rolls away uphill to the right
  if(t>=pt){const ex=lerp(1000,1560,easeIn(out)),ey=598-Math.sin(seg(out,0,.5)*Math.PI)*90;drawPet(g,'egg',ex,ey,84,{tilt:out*9,shadow:false})}
  const walk=seg(lt,.4,2.6);
  drawPet(g,'panda',lerp(-300,300,ease(walk)),612,150,{face:1,talk:talkOf('P',t),hop:walkBob(t,walk<1,3),tilt:t>C.p06&&t<C.o07?.1:0});
  drawPet(g,'owl',lerp(-420,170,ease(walk)),606,130,{face:1,talk:talkOf('O',t),hop:walkBob(t,walk<1,2)+hopOf(t,C.o07,20)});
  const dx=tug?520:lerp(-200,440,ease(walk));drawPet(g,'dragon',dx,608,160,{face:1,talk:talkOf('R',t),hop:walkBob(t,walk<1,4),tilt:tug?-.18+Math.sin(t*20)*.04:0,sq:tug?.15:0});
  pointAt(g,420,420,560,520,seg(t,at(S,'o07','in the'),at(S,'o07','in the')+.4)*(1-seg(t,C.r06,C.r06+.3)));
  if(t>pt&&t<pt+1.4)for(let i=0;i<3;i++)inkText(g,'!',[300,170,dx][i],440-i*6,54,{col:'#e2382c',alpha:seg(t,pt+.1*i,pt+.1*i+.2)*(1-seg(t,pt+1,pt+1.4))});
  g.restore();
  chip(g,'Into the woods',seg(lt,.1,.7));
  wordCard(g,'in',1040,120,seg(t,at(S,'o07','in the')-.05,at(S,'o07','in the')+.35),'#b3471f','#f7d7a6')};


/* 4. Snowy hill — tracks BEHIND the rock */
SC.hill=(g,t,S)=>{const lt=t-S.start,T=S.end-S.start,f4=S.cues.f04,peek=ease(seg(t,at(S,'f04','Behind'),at(S,'f04','Behind')+.8));
  const c={x:lerp(560,760,ease(seg(lt,0,T))),y:lerp(400,380,ease(seg(lt,0,T))),z:lerp(1.1,1.15,peek),r:.01*Math.sin(lt*.7)};
  g.save();camApply(g,c);
  sky(g,'#c9dcef','#f4f7fb');
  layer(g,c,.5,g=>{blob(g,subdiv([[-400,480],[100,300],[420,420],[800,260],[1200,400],[1800,330],[1800,700],[-400,700]],24),'#e8eff6',{seed:980,w:2});for(const x of[160,1260])tree(g,x,470,.6,981+x,'#3e6e58')});
  blob(g,subdiv([[-400,650],[400,600],[1000,575],[1800,560],[1800,900],[-400,900]],24),'#ffffff',{seed:985,w:2.4});
  // roll tracks leading behind the rock
  const tk=seg(t,f4-.4,f4+.6);g.save();g.globalAlpha=.55*tk;g.strokeStyle='#9aa9b8';g.lineWidth=6;g.setLineDash([10,12]);for(const o of[-10,10]){g.beginPath();g.moveTo(80,640+o);g.quadraticCurveTo(600,600+o,920,578+o);g.stroke()}g.restore();
  // the egg peeks out from behind the rock
  drawPet(g,'egg',lerp(1000,1078,peek),588,86,{tilt:.2*peek,shadow:false,alpha:seg(t,at(S,'f04','Behind'),at(S,'f04','Behind')+.3)});
  rock(g,900,600,1,990);
  const walk=seg(lt,0,2.8),cold=seg(t,S.cues.p02,endOf(S,'p02'));
  drawPet(g,'dragon',lerp(120,520,ease(walk)),618,155,{face:1,talk:talkOf('R',t),hop:walkBob(t,walk<1,4)});
  drawPet(g,'fox',lerp(260,700,ease(walk)),612,142,{face:1,talk:talkOf('F',t),hop:walkBob(t,walk<1,1)+hopOf(t,f4,28)});
  drawPet(g,'owl',lerp(20,400,ease(walk)),622,130,{talk:talkOf('O',t),hop:walkBob(t,walk<1,2)});
  drawPet(g,'panda',lerp(-120,260,ease(walk)),628,150,{face:1,talk:talkOf('P',t),hop:walkBob(t,walk<1,3),tilt:cold*Math.sin(t*40)*.03});
  if(cold>0)for(let i=0;i<5;i++){const a=t*2+i;blob(g,ell(lerp(-120,260,ease(walk))+Math.cos(a)*70,470+Math.sin(a)*14,8,8,8),'#cfe8ff',{seed:995+i,w:1,alpha:.8*cold})}
  pointAt(g,700,450,860,520,seg(t,at(S,'f04','Behind'),at(S,'f04','Behind')+.4));
  snowfall(g,t,996,70);
  g.restore();
  chip(g,'Up the snowy hill',seg(lt,.1,.7));
  wordCard(g,'behind',1040,120,seg(t,at(S,'f04','Behind')-.05,at(S,'f04','Behind')+.35),'#5a4fb0','#dcd6f5')};

/* ---- river gorge used by bridge + melt: cliffs, water, ice bridge */
function gorge(g,t,melt){sky(g,'#f2b98a','#fbe6cf');wash(g,640,120,260,'#ffd9a0',1,31,.6);
  layer(g,{x:640,y:360,z:1},1,g=>{blob(g,subdiv([[-400,420],[300,330],[640,380],[1000,300],[1800,400],[1800,700],[-400,700]],24),'#e7d8e8',{seed:1000,w:2})});
  // water
  blob(g,rectP(380,560,520,300),'#3f86b8',{seed:1010,w:2.2});
  for(let i=0;i<4;i++){const y=580+i*26,o=(t*40+i*30)%80,p=[];for(let x=380;x<900;x+=30)p.push([x+o*.4,y+Math.sin(x*.05+t*2+i)*3]);inkPoly(g,p,{w:1.4,seed:1011+i,col:'rgba(255,255,255,.55)'})}
  // cliffs
  blob(g,subdiv([[-400,520],[440,520],[420,900],[-400,900]],18),'#ffffff',{seed:1020,w:2.6});blob(g,subdiv([[430,540],[440,900],[400,900]],6),'#b9c6d6',{seed:1021,w:1.6});
  blob(g,subdiv([[850,520],[1800,520],[1800,900],[860,900]],18),'#ffffff',{seed:1022,w:2.6});
  // ice bridge (an arc), melting away from the middle
  const m=clamp(melt);if(m<1){g.save();g.globalAlpha=1-m*.9;const top=ell(640,560,230,70,24,Math.PI,Math.PI*2),bot=ell(640,560,210,48,24,Math.PI*2,Math.PI).reverse();
    blob(g,[...top,...bot.reverse()],'#cfeeff',{seed:1030,w:2.4});hatch(g,ell(640,530,150,20,10),{ang:.3,sp:14,seed:1031,col:'rgba(255,255,255,.7)'});g.restore()}
  // drips while melting
  if(m>0&&m<1)for(let i=0;i<10;i++){const x=480+i*32,p=((t*1.6+hash2(i,1,1032))%1);g.fillStyle='rgba(160,210,240,.9)';g.beginPath();g.arc(x,500+p*80,4,0,7);g.fill()}}

/* 5. Ice bridge — egg ON the bridge; Owl says think first */
SC.bridge=(g,t,S)=>{const lt=t-S.start,T=S.end-S.start;
  const c={x:lerp(620,600,ease(seg(lt,0,T))),y:lerp(360,400,ease(seg(lt,0,T))),z:lerp(1.0,1.12,ease(seg(lt,0,T))),r:0};
  g.save();camApply(g,c);gorge(g,t,0);
  // thin-ice cracks appear when Owl warns
  const ck=seg(t,at(S,'o03','thin'),at(S,'o03','thin')+.6);if(ck>0)inkPoly(g,[[560,500],[590,512],[600,505],[640,520],[660,508]].slice(0,2+Math.floor(ck*3)),{w:2,seed:1040,col:'#5d7fa0'});
  glow(g,640,450,120,'rgba(170,210,255,A)',.5);drawPet(g,'egg',640,500,90,{tilt:Math.sin(lt*3)*.05,shadow:false});
  drawPet(g,'dragon',330,522,160,{face:1,talk:talkOf('R',t),tilt:.05*Math.sin(lt*5)});
  drawPet(g,'panda',200,528,150,{face:1,talk:talkOf('P',t),hop:hopOf(t,S.cues.p03,22)});
  drawPet(g,'fox',80,524,140,{face:1,talk:talkOf('F',t)});
  drawPet(g,'owl',1000,522,136,{talk:talkOf('O',t),hop:hopOf(t,S.cues.o03,12)});
  pointAt(g,470,360,610,440,seg(t,at(S,'p03','On'),at(S,'p03','On')+.4));
  g.restore();
  chip(g,'The frozen river',seg(lt,.1,.7));
  wordCard(g,'on',1040,120,seg(t,at(S,'p03','On')-.05,at(S,'p03','On')+.35),'#1b8a36','#cde8b5');
  card(g,300,120,420,70,seg(t,at(S,'o03','think'),at(S,'o03','think')+.4),{seed:1045,fill:'#fffaf0',wash:'#f7d7a6',draw:g=>inkText(g,'Think first!',0,12,36,{col:'#b3471f'})})};

/* 6. The twist — Dragon's fire melts the bridge */
SC.melt=(g,t,S)=>{const lt=t-S.start,ft=fireT(S),mt=meltT(S),fire=seg(t,ft,ft+.25)*(1-seg(t,mt-.1,mt+.3)),mk=seg(t,ft+.4,mt+.6),fall=seg(t,mt,mt+.7),drift=seg(t,mt+.7,S.end);
  let c=rig(lt,[[0,{x:520,y:420,z:1.2}],[ft-S.start-.3,{x:560,y:420,z:1.25}],[ft-S.start+.2,{x:620,y:400,z:1.05},'expo'],[S.cues.f05-S.start,{x:700,y:420,z:1.05}],[S.end-S.start,{x:820,y:440,z:1.1},'io']]);
  c=punch(c,t,ft,.08);c=shake(c,'impact',t,{t0:mt,amp:14});
  g.save();camApply(g,c);gorge(g,t,mk);
  // egg: sits, falls with the broken chunk, drifts away on a floe
  const ex=lerp(640,1500,easeIn(drift)),ey=fall<1?lerp(500,600,easeIn(fall)):600+Math.sin(t*3)*4;
  if(fall>0){blob(g,ell(ex,ey+6,70,16,16),'#e3f4ff',{seed:1050,w:2})}
  drawPet(g,'egg',ex,ey,90,{tilt:fall*.4+Math.sin(t*2)*.08*drift,shadow:false});
  if(fall>0&&fall<1)for(let i=0;i<12;i++){const a=-Math.PI*hash2(i,1,1051),p=fall;g.fillStyle='rgba(220,240,255,.9)';g.beginPath();g.arc(640+Math.cos(a)*90*p,600+Math.sin(a)*80*p+p*p*60,6,0,7);g.fill()}
  // dragon rushes to the edge, breathes fire
  const rush=ease(seg(t,S.cues.r03,ft));drawPet(g,'dragon',lerp(300,400,rush),522,165,{face:1,talk:talkOf('R',t),tilt:-.08*fire,sq:fire*.2});
  if(fire>0){const im=img('fx_fire');g.save();g.translate(460,420);g.rotate(.35);g.globalAlpha=fire;for(let i=0;i<3;i++){const s=180+60*i+30*Math.sin(t*20+i);g.drawImage(im,i*70,-s/2,s,s)}g.restore();glow(g,560,470,240,'rgba(255,150,40,A)',.6*fire)}
  drawPet(g,'panda',200,528,150,{face:1,talk:talkOf('P',t),hop:hopOf(t,mt,30)});
  drawPet(g,'fox',90,524,140,{face:1,talk:talkOf('F',t),hop:hopOf(t,S.cues.f05,36)});
  drawPet(g,'owl',1000,522,136,{talk:talkOf('O',t),hop:hopOf(t,mt+.1,30)});
  g.restore();
  whipStreaks(g,0);
  chip(g,'Uh-oh!',seg(lt,.1,.7));
  if(t>mt)card(g,640,110,560,80,seg(t,S.cues.d05,S.cues.d05+.4),{seed:1060,fill:'#fffaf0',wash:'#f7b8b0',draw:g=>inkText(g,'Fire melts ice!',0,13,40,{col:'#c0392b'})})};

/* ---- rescue river (wide, dusk): far bank + big tree + branch, river band, near bank */
function riverBG(g,t){sky(g,'#9a8fc7','#f3c7a6');wash(g,1000,140,200,'#ffd9a0',1,41,.5);
  blob(g,subdiv([[-400,420],[1800,420],[1800,200],[1300,300],[900,250],[400,320],[-400,280]],24),'#e3e0f0',{seed:1100,w:2});
  blob(g,rectP(-400,420,2200,150),'#3f7fb0',{seed:1110,w:2.2});
  for(let i=0;i<4;i++){const y=440+i*30,o=(t*50+i*30)%90,p=[];for(let x=-400;x<1800;x+=36)p.push([x+o,y+Math.sin(x*.04+t*2+i)*3]);inkPoly(g,p,{w:1.4,seed:1111+i,col:'rgba(255,255,255,.5)'})}
  blob(g,subdiv([[-400,400],[1800,390],[1800,430],[-400,440]],18),'#ffffff',{seed:1120,w:2});
  tree(g,1060,420,1.1,1130,'#3e6e58');
  inkPoly(g,[[1040,250],[960,300],[880,330]],{w:14,seed:1135,col:'#6b4526'});blob(g,ell(880,330,40,24,12),'#3e6e58',{seed:1136,w:2});
  blob(g,subdiv([[-400,556],[1800,562],[1800,900],[-400,900]],18),'#ffffff',{seed:1140,w:2.6})}

/* 6b. Sad Fox — quiet held moment at sunset before the rescue */
SC.sad=(g,t,S)=>{const lt=t-S.start,T=S.end-S.start,C=S.cues,hug=ease(seg(t,C.p07,C.p07+1)),owlIn=ease(seg(t,C.o08-.4,C.o08+.6));
  const c={x:lerp(620,560,ease(seg(lt,0,T))),y:lerp(420,470,ease(seg(lt,0,T))),z:lerp(1.2,1.6,ease(seg(lt,0,T))),r:0};
  g.save();camApply(g,c);riverBG(g,t);
  const sob=t>C.f10&&t<endOf(S,'f10')+1.5;
  drawPet(g,'dragon',300,602,160,{face:1,tilt:.12});
  drawPet(g,'panda',lerp(380,470,hug),604,150,{face:1,talk:talkOf('P',t),tilt:.08*hug});
  drawPet(g,'fox',600,602,138,{talk:talkOf('F',t),tilt:-.1-(sob?Math.sin(t*9)*.03:0),sq:.12});
  if(t<C.p07+1.5)for(let i=0;i<3;i++){const p=((t*.9+i/3)%1);g.fillStyle=`rgba(120,190,255,${.9*(1-p)})`;g.beginPath();g.ellipse(575+(i%2)*14,500+p*70,4,6,0,0,7);g.fill()}
  drawPet(g,'owl',lerp(900,720,owlIn),606,128,{talk:talkOf('O',t)});
  if(hug>0)for(let i=0;i<3;i++){const a=t*1.2+i*2.1;heart(g,540+Math.cos(a)*50,440-seg(t,C.p07,S.end)*40+Math.sin(a)*14,.6,'#f07a8a')}
  g.restore();darkness(g,.28,[]);
  chip(g,'Sunset',seg(lt,.1,.7));
  card(g,640,110,560,76,seg(t,at(S,'o08','think'),at(S,'o08','think')+.4),{seed:1530,fill:'#fffaf0',wash:'#f7d7a6',draw:g=>inkText(g,'Stop and think together',0,13,34,{col:'#b3471f'})})};


/* 7. Climax — ABOVE, NEXT TO, ACROSS, UNDER, gently */
SC.rescue=(g,t,S)=>{const lt=t-S.start,C=S.cues,o4=C.o04,o5=C.o05,p4=C.p04,f6=C.f06,r4=C.r04;
  const fly=ease(seg(t,o4+.2,o4+1.4)),logK=ease(seg(t,at(S,'p04','push'),at(S,'p04','push')+1.2)),cross=ease(seg(t,f6-.2,at(S,'f06','Got')-.1)),grab=t>at(S,'f06','Got')-.1;
  const home=seg(t,r4-.4,r4+.2);   // cut to the warm close-up on Dragon
  let c=rig(lt,[[0,{x:640,y:380,z:1.0}],[o4-S.start+.3,{x:640,y:300,z:1.0}],[o5-S.start,{x:760,y:360,z:1.1},'io'],[p4-S.start,{x:600,y:400,z:1.05},'io'],[f6-S.start,{x:760,y:420,z:1.15},'io'],[r4-S.start-.4,{x:800,y:420,z:1.2}],[r4-S.start-.39,{x:360,y:470,z:1.7},'cut'],[S.end-S.start,{x:380,y:460,z:1.85},'lin']]);
  g.save();camApply(g,c);riverBG(g,t);
  // egg floe drifts in and gets stuck next to the tree / under the branch
  const drift=ease(seg(lt,0,2.4)),egx=grab?lerp(930,820,ease(seg(t,at(S,'f06','Got'),r4-.4))):lerp(1400,930,drift),egy=grab?lerp(470,420,seg(t,at(S,'f06','Got'),r4)):486+Math.sin(t*2.4)*4;
  if(home<1){if(!grab)blob(g,ell(egx,egy+6,66,15,14),'#e3f4ff',{seed:1150,w:2});drawPet(g,'egg',egx,egy,80,{tilt:grab?0:Math.sin(t*2)*.08,shadow:false});
    pointAt(g,1040,560,960,500,seg(t,at(S,'o05','next'),at(S,'o05','next')+.4)*(1-seg(t,p4,p4+.4)))}
  // the log: lying on the bank → pushed across the river
  log(g,lerp(420,700,logK),600,lerp(660,870,logK),lerp(600,425,logK));
  if(home<1){
    // owl flies above
    const perch=ease(seg(t,o5+1.2,o5+2.4)),ox=lerp(lerp(260,760,fly),1210,perch),oy=lerp(lerp(600,215,fly)+Math.sin(t*6)*8*fly*(1-perch),425,perch);drawPet(g,'owl',ox,oy,128,{talk:talkOf('O',t),shadow:fly<.1,tilt:Math.sin(t*9)*.08*fly});
    if(fly>0)pointAt(g,ox,oy+10,ox,oy+120,seg(t,at(S,'o04','above'),at(S,'o04','above')+.4)*(1-seg(t,o5+1,o5+1.4)),'#1d6fa5');
    // panda pushes the log
    drawPet(g,'panda',lerp(300,560,logK),602,150,{face:1,talk:talkOf('P',t),sq:logK>0&&logK<1?.25:0,tilt:logK>0&&logK<1?-.12:0});
    // fox walks along the log and reaches under the branch
    const fxp=[lerp(700,850,cross),lerp(602,445,cross)];drawPet(g,'fox',fxp[0],fxp[1],132,{face:1,talk:talkOf('F',t),tilt:cross>0?-.35+.3*seg(cross,.9,1):0,hop:grab?hopOf(t,at(S,'f06','Got'),20):0});
    drawPet(g,'dragon',160,602,158,{face:1,talk:talkOf('R',t),tilt:.05*Math.sin(t*2)})}
  else{ // warm close-up: Dragon keeps the egg warm, gently (no fire)
    blob(g,subdiv([[-400,520],[1000,510],[1000,900],[-400,900]],18),'#ffffff',{seed:1141,w:2.4});const gw=.35+.25*Math.sin(t*3);glow(g,360,450,260,'rgba(255,190,110,A)',gw*home);
    drawPet(g,'egg',360,560,110,{tilt:Math.sin(t*1.5)*.04});
    drawPet(g,'dragon',230,580,170,{face:1,talk:talkOf('R',t),tilt:.1});
    drawPet(g,'fox',500,585,140,{face:0,hop:hopOf(t,r4+.2,10)});drawPet(g,'panda',120,600,150,{face:1});drawPet(g,'owl',600,600,130,{});
    for(let i=0;i<4;i++){const a=t*1.5+i*1.6;heart(g,360+Math.cos(a)*120,420+Math.sin(a*1.3)*50-seg(t,r4,S.end)*40,.9,'#f07a8a')}}
  g.restore();
  chip(g,'Teamwork!',seg(lt,.1,.7));
  // the preposition cards stack along the top as each pet says its word
  const ws=[['above',at(S,'o04','above'),'#1d6fa5','#bfe3f7'],['next to',at(S,'o05','next'),'#b35a00','#f6d27a'],['across',at(S,'p04','across'),'#1b8a36','#cde8b5'],['under',at(S,'f06','under'),'#5a4fb0','#dcd6f5']];
  ws.forEach(([w,tt,col,wsh],i)=>{const k=seg(t,tt-.05,tt+.35)*(1-seg(t,r4-.4,r4));if(k<=0)return;g.save();g.translate(0,0);card(g,480+i*210,86,196,70,k,{seed:1210+i,fill:'#fffaf0',wash:wsh,draw:g=>inkText(g,w,0,14,40,{col})});g.restore()});
  card(g,900,110,380,76,seg(t,at(S,'r04','gently'),at(S,'r04','gently')+.4),{seed:1220,fill:'#fffaf0',wash:'#f7d7a6',draw:g=>inkText(g,'Warm it gently',0,13,38,{col:'#b3471f'})})};

/* 8. The hatch — slow push-in, glow, Robot appears */
SC.hatch=(g,t,S)=>{const lt=t-S.start,T=S.end-S.start,ht=hatchT(S),glowK=seg(t,S.cues.d06,ht),born=seg(t,ht,ht+.9),d7=S.cues.d07;
  const c={x:640,y:lerp(420,440,ease(seg(lt,0,ht-S.start))),z:lerp(1.0,1.28,ease(seg(lt,0,ht-S.start)))*(1-.2*ease(seg(t,ht+.6,ht+2)))+.2*ease(seg(t,ht+.6,ht+2))*1.0,r:0};
  g.save();camApply(g,shake(c,'rumble',t,{t0:ht-1.2,amp:glowK>0&&born<=0?4:0}));
  sky(g,'#1f2a4f','#4a4a78');stars(g,t,1300,70);blob(g,ell(1080,110,40,40,20),'#fff6d0',{seed:1301,w:1.6});
  blob(g,subdiv([[-400,600],[1800,600],[1800,900],[-400,900]],18),'#dfe6f2',{seed:1310,w:2.4});
  const eg=glowK*(1-born);glow(g,640,480,340,'rgba(170,200,255,A)',.25+.6*eg+.8*seg(born,0,.2)*(1-seg(born,.2,1)));
  if(born<.35)drawPet(g,'egg',640,610,200,{tilt:Math.sin(t*(10+30*glowK))*.1*glowK,alpha:1-seg(born,.15,.35)});
  if(born>.15){const k=spring(seg(born,.15,1));drawPet(g,'robot',640,610,lerp(60,210,clamp(k)),{talk:talkOf('B',t),hop:hopOf(t,S.cues.b02,40,.5)+hopOf(t,S.cues.b01,14),alpha:seg(born,.15,.3)})}
  sparkles(g,640,450,(t-ht)*.9,1320,20,260,'#fff6a0');
  const react=t>ht?1:0;
  drawPet(g,'dragon',360,612,160,{face:1,talk:talkOf('R',t),hop:react*hopOf(t,ht+.3,24),tilt:t>S.cues.r05&&t<endOf(S,'r05')?.12:0});
  drawPet(g,'owl',200,612,130,{face:1,talk:talkOf('O',t),hop:react*hopOf(t,ht+.4,20)});
  drawPet(g,'panda',930,616,150,{talk:talkOf('P',t),hop:react*hopOf(t,ht+.35,24)});
  drawPet(g,'fox',1090,612,140,{talk:talkOf('F',t),hop:react*hopOf(t,ht+.45,30)});
  g.restore();
  if(t<ht)darkness(g,.25*(1-glowK),[]);
  const fk=seg(t,ht-.05,ht+.08)*(1-seg(t,ht+.1,ht+.7));if(fk>0){g.fillStyle=`rgba(255,255,255,${fk*.9})`;g.fillRect(0,0,W,H)}
  chip(g,'A new friend',seg(lt,.1,.7));
  card(g,640,110,700,120,seg(t,at(S,'d07','think'),at(S,'d07','think')+.4),{seed:1330,fill:'#fffaf0',wash:'#f6d27a',draw:g=>{star(g,-290,-4,24,YEL,1331);star(g,290,-4,24,YEL,1332);inkText(g,'Think first,',0,-6,42,{col:'#b35a00'});inkText(g,'and work together!',0,40,34)}})};

/* 9. Hide and seek — the words come back in play (next day, park) */
function slide(g,x,y){inkPoly(g,[[x,y],[x,y-210]],{w:8,seed:1540,col:'#c0392b'});inkPoly(g,[[x+40,y],[x+40,y-210]],{w:8,seed:1541,col:'#c0392b'});
  for(let i=1;i<6;i++)inkPoly(g,[[x,y-i*35],[x+40,y-i*35]],{w:5,seed:1542+i,col:'#c0392b'});
  blob(g,[[x+30,y-214],[x+60,y-214],[x+280,y-14],[x+250,y+2]],'#f4c20d',{seed:1549,w:2.4})}
SC.play=(g,t,S)=>{const lt=t-S.start,C=S.cues,hide=ease(seg(t,C.r07+.2,endOf(S,'r07'))),found=ease(seg(t,C.r08,C.r08+1));
  const said=id=>t>C[id]-.1,cur=['o09','p08','f11','b04'].find(said),spot={b04:[380,450],f11:[860,440],p08:[1000,420],o09:[380,330]};
  let c={x:640,y:370,z:1.0,r:0};if(cur){const k=ease(seg(t,C[cur]-.2,C[cur]+.4)),f=spot[cur];c=camMix(c,{x:lerp(640,f[0],.45),y:lerp(370,f[1],.35),z:1.12,r:0},k*(1-found))}
  g.save();camApply(g,c);
  sky(g,'#9fd0ee','#eef8fb');wash(g,1120,90,140,'#f6d27a',1,11,.7);cloud(g,600,90,1,12);
  layer(g,c,.6,g=>{blob(g,subdiv([[-400,470],[200,380],[700,430],[1300,370],[1800,470],[1800,700],[-400,700]],24),'#b9dc8f',{seed:920,w:2})});
  blob(g,subdiv([[-400,600],[1800,600],[1800,900],[-400,900]],20),'#8bc36a',{seed:1550,w:2.4});
  // start spots (playing) → hiding spots → everyone comes out when found
  const H=hide*(1-found);
  const rx=lerp(lerp(640,330,hide),560,found);drawPet(g,'robot',rx,606,120,{talk:talkOf('B',t),hop:hopOf(t,C.b03,26)+hopOf(t,C.b05,40)+hopOf(t,C.b05+.5,40),tilt:said('b04')&&found<1?-.12:0});
  tree(g,260,606,1.4,1560);
  const ox=lerp(lerp(820,300,hide),740,found),oy=lerp(606,330,H);drawPet(g,'owl',ox,oy,lerp(128,100,H),{talk:talkOf('O',t),shadow:H<.5,hop:hopOf(t,C.o09,16)});
  slide(g,700,606);
  const fx=lerp(lerp(460,850,hide),860,found);drawPet(g,'fox',fx,606,lerp(138,112,H),{face:1,talk:talkOf('F',t),hop:hopOf(t,C.f11,10)});
  const pp=said('p08')&&found<1?48*ease(seg(t,C.p08-.1,C.p08+.3)):0;
  drawPet(g,'panda',lerp(lerp(900,1100,hide),960,found),lerp(606,640,H),150,{talk:talkOf('P',t),hop:pp,shadow:H<.5});
  blob(g,ell(1100,570,130,72,24),'#4f9a45',{seed:1570,w:2.4});blob(g,ell(1040,590,70,48,18),'#5fae52',{seed:1571,w:2});blob(g,ell(1170,592,70,46,18),'#5fae52',{seed:1572,w:2});
  // dragon counts with eyes covered, then turns to each voice
  const counting=t>C.r07-.1&&t<endOf(S,'r07')+.2,look=said('p08')||said('f11')?1:0;
  drawPet(g,'dragon',lerp(560,600,found),606,160,{face:counting?0:look,talk:talkOf('R',t),tilt:counting?.25:0,hop:hopOf(t,C.r08,40)});
  if(counting)inkText(g,['1','2','3'][Math.min(2,Math.floor((t-C.r07)/(CLIP.r07.eff*.25)))],560,380,64,{col:'#b35a00',stroke:'#fffaf0',sw:8,alpha:seg(t,C.r07,C.r07+.2)*(1-seg(t,at(S,'r07','ready'),at(S,'r07','ready')+.2))});
  if(found>0){sparkles(g,640,450,(t-C.r08)*.9,1580,18,240,'#fff6a0');for(let i=0;i<4;i++)heart(g,420+i*140,400-found*40+Math.sin(t*3+i)*10,.7,'#f07a8a')}
  g.restore();
  chip(g,'The next day',seg(lt,.1,.7));
  const ws=[['behind',at(S,'b04','behind'),'#5a4fb0','#dcd6f5'],['under',at(S,'f11','under'),'#1d6fa5','#bfe3f7'],['in',at(S,'p08','in the'),'#b3471f','#f7d7a6'],['above',at(S,'o09','above'),'#1b8a36','#cde8b5']];
  ws.forEach(([w,tt,col,wsh],i)=>{const k=seg(t,tt-.05,tt+.35)*(1-seg(t,S.end-.6,S.end));if(k<=0)return;card(g,480+i*210,86,196,70,k,{seed:1590+i,fill:'#fffaf0',wash:wsh,draw:g=>inkText(g,w,0,14,40,{col})})})};

/* 10. Goodbye — all five wave */
SC.bye=(g,t,S)=>{const lt=t-S.start,T=S.end-S.start;
  const c={x:640,y:lerp(420,370,ease(seg(lt,0,T-1))),z:lerp(1.3,1.0,ease(seg(lt,0,T-1))),r:0};
  g.save();camApply(g,c);sky(g,'#9fd0ee','#fbf1d8');wash(g,640,200,420,'#f6d27a',1,51,.45);cloud(g,240,120,1,52);cloud(g,1020,90,.9,54);
  blob(g,subdiv([[-400,600],[1800,600],[1800,900],[-400,900]],20),'#9fcf7a',{seed:1400,w:2.4});
  const cast=[['panda',240,160,0],['dragon',440,170,1],['robot',640,150,0],['fox',840,150,0],['owl',1040,138,0]];
  cast.forEach(([n,x,h,f],i)=>drawPet(g,n,x,615,h,{face:f,talk:n==='fox'?talkOf('F',t):0,hop:Math.max(0,Math.sin(t*5+i*1.1))*18,tilt:Math.sin(t*4+i)*.06}));
  g.restore();
  card(g,640,120,640,110,seg(lt,.3,.8),{seed:1410,fill:'#fffaf0',wash:'#f6d27a',draw:g=>{star(g,-270,-4,26,YEL,1411);star(g,270,-4,26,YEL,1412);inkText(g,'See you next time!',0,14,48,{col:'#b35a00'})}});
  const e=seg(t,S.end-1.8,S.end-.2);if(e>0){g.fillStyle=`rgba(243,234,214,${ease(e)})`;g.fillRect(0,0,W,H);
    inkText(g,'The End',640,340,110,{alpha:e,col:'#b35a00',stroke:'#fffaf0',sw:12});inkText(g,'Pet Stories · The Runaway Egg',640,420,38,{alpha:e,col:'#5a3d28'})}};

/* ---------- score */
function scoreShot(K,S){const{ev,pad,bass,theme,arp,drums}=K,s=S.start,e=S.end;switch(S.id){
  case'title':theme(s,e,'musicbox',72,'maj',.32);pad(s,e,'strings',48,'maj',.1);break;
  case'park':{const pk=snapB(pokeT(S));theme(s,pk,'flute',72,'maj',.22);arp(s,pk,'pizz',72,'maj',.18,.5,[0,2,4,2]);bass(s,pk,60,'maj',.26,'pulse');drums(s,pk,'soft',.3);
    ev(pk,'crash',0,0,.3);arp(pk,e,'pizz',74,'maj',.24,.25,[0,2,4,7]);drums(pk,e,'bouncy',.45);bass(pk,e,62,'maj',.32,'eighth');break}
  case'beach':arp(s,e,'musicbox',84,'maj',.16,.5,[0,4,7,4]);bass(s,e,60,'maj',.26,'pulse');drums(s,e,'bouncy',.35);break;
  case'hill':pad(s,e,'strings',48,'maj',.12);theme(s,e,'flute',72,'maj',.2);bass(s,e,57,'min',.24);drums(s,e,'tick',.3);break;
  case'bridge':pad(s,e,'strings',45,'min',.14);arp(s,e,'musicbox',81,'min',.14,1,[0,3,7,3]);bass(s,e,45,'min',.22);break;
  case'melt':{const f=snapB(fireT(S));drums(s,f,'toms',.4);pad(s,e,'strings',45,'min',.16,.1);ev(f,'crash',0,0,.45);drums(f,e,'toms',.5);bass(s,e,45,'min',.3,'pulse');break}
  case'rescue':{const r=snapB(S.cues.r04-.4);arp(s,r,'pizz',69,'min',.22,.5,[0,3,7,3]);drums(s,r,'bouncy',.4);bass(s,r,57,'min',.3,'eighth');
    ev(r,'swell',0,1.2,.2);theme(r,e,'strings',72,'maj',.24);pad(r,e,'strings',48,'maj',.12);break}
  case'hatch':{const h=snapB(hatchT(S));pad(s,h,'strings',45,'min',.12,.2);ev(h-BAR,'riser',0,BAR,.3);ev(h,'crash',0,0,.4);
    theme(h,e,'strings',72,'maj',.3);theme(h,e,'musicbox',84,'maj',.16);pad(h,e,'strings',48,'maj',.14);bass(h,e,60,'maj',.28);break}
  case'woods':{const p=snapB(popT(S));pad(s,p,'strings',45,'min',.1);arp(s,p,'pizz',69,'min',.18,.5,[0,3,7,3]);bass(s,p,57,'min',.24,'pulse');
    ev(p,'crash',0,0,.3);arp(p,e,'pizz',74,'maj',.24,.25,[0,2,4,7]);drums(p,e,'bouncy',.45);bass(p,e,62,'maj',.3,'eighth');break}
  case'sad':pad(s,e,'strings',45,'min',.16,.12);theme(s,e,'piano',69,'min',.2,1.5);bass(s,e,45,'min',.18);break;
  case'play':theme(s,e,'flute',72,'maj',.24);arp(s,e,'pizz',72,'maj',.18,.5,[0,4,2,4]);bass(s,e,60,'maj',.28,'pulse');drums(s,e,'bouncy',.4);break;
  case'bye':{theme(s,e-BAR,'musicbox',72,'maj',.32);pad(s,e-BAR,'strings',48,'maj',.12);bass(s,e-BAR,60,'maj',.22);const f=e-BAR;for(const m of[48,55,60,64,67,72])ev(f,'strings',m,BAR*1.2,.14);ev(f,'musicbox',84,BAR,.3);break}}
}
