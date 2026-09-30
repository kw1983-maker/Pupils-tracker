/* Dragon's Home — Pet Stories, Dragon episode 1 (English, Year 1–2: home words)
   Cast = the app's pet sprites (images/*.png via img()); narrator only, no host. */
const META={title:"Dragon's Home · Pet Stories",h1:"Pet Stories · Dragon's Home",lang:'en'};
const STYLE='watercolour';
const HOST='none';
const SOUND='elevenlabs';
const LINES={
 d01:['D','Dragon lives in a cosy cave on the mountain.'],
 f01:['F','Knock, knock! Hello, Dragon!'],
 r01:['R','Hi, Fox! Come in! Welcome to my home!'],
 r02:['R',"This is my bed. It's big and soft!"],
 f02:['F','Wow! Can I jump on it?'],
 r03:['R','This is my table, and this is my chair.'],
 r04:['R','And this is my window. Look at the stars!'],
 d02:['D','Whoosh! The wind blew out the lamp.'],
 f03:['F',"Oh no! It's so dark!"],
 r05:['R',"Don't worry. A tiny flame… gently."],
 f04:['F','Your home is the best!'],
 d03:['D','A home is warm when friends are there.'],
};
const SPK={D:['Narrator','#7a6a5a'],R:['Dragon','#2e9b74'],F:['Fox','#d9731a']};
const PLAN=[
 {id:'outside',pre:2.8, seq:['d01',0.4,'f01',0.3,'r01'], post:0.8},
 {id:'bed',    pre:0.5, seq:['r02',0.3,'f02',1.6], post:0.2},
 {id:'room',   pre:0.4, seq:['r03',0.4,'r04'], post:1.0},
 {id:'dark',   pre:0.2, seq:['d02',0.4,'f03',0.4,'r05',1.4,'f04'], post:0.6},
 {id:'end',    pre:0.4, seq:['d03'], post:3.0},
];
const GAP=0.18;
const TRANS={bed:'style',end:'iris'};

const endOf=(S,id)=>S.cues[id]+CLIP[id].eff;
const doorT=S=>S.cues.r01+.3;                  // cave door opens
const outT=S=>S.cues.d02+.25;                  // lamp blown out
const litT=S=>at(S,'r05','flame')+.2;          // lamp relit

function chapterSFX(){const S=shot,C=cue,len=slen;const o=S('outside'),dk=S('dark');return[
  {t:o.start+.6,name:'sfx_sparkle',gain:.5},
  {t:o.start,name:'sfx_crickets',loop:true,dur:len('outside'),gain:.18},
  {t:C('outside','f01')-.5,name:'sfx_knock',gain:1},
  {t:doorT(o),name:'sfx_whoosh',dur:.9,gain:.35},
  {t:C('bed','r02')+.6,name:'sfx_pop',dur:.5,gain:.4},
  {t:endOf(S('bed'),'f02')+.15,name:'sfx_boing',dur:1.5,gain:.8},
  {t:at(S('room'),'r04','stars'),name:'sfx_sparkle',gain:.5},
  {t:outT(dk)-.3,name:'sfx_wind',gain:.9},
  {t:litT(dk),name:'sfx_fire',dur:.8,gain:.5},
  {t:litT(dk)+.1,name:'sfx_sparkle',gain:.5},
  {t:S('end').start,name:'sfx_crickets',loop:true,dur:len('end'),gain:.15},
];}

/* =====================================================================
   PETS + props (shared pattern with runaway-egg)
   ===================================================================== */
// feet at (x,y), h = drawn height. face:1 = face right (the sprites look left).
// under/over(g) draw in the sprite's own 320×320 pixel space (costumes, props held).
function drawPet(g,name,x,y,h,o={}){const{face=0,talk=0,hop=0,tilt=0,alpha=1,sq=0,shadow=true,glowCol=null,glowA=0,under=null,over=null}=o;const im=img(name);if(!im||alpha<=0)return;
  const br=Math.sin(TT*2.3+x*.013)*.012;
  g.save();g.translate(x,y);
  if(shadow){g.save();g.globalAlpha=.2*alpha*clamp(1-hop/220);g.fillStyle='#3a2a1a';g.beginPath();g.ellipse(0,0,h*.3,h*.055,0,0,7);g.fill();g.restore()}
  g.translate(0,-hop);if(glowCol)glow(g,0,-h*.45,h*.8,glowCol,glowA);
  g.rotate(tilt);const sy=1+br+talk*.08-sq*.16,sx=1-talk*.03+sq*.14;g.scale((face?-1:1)*sx,sy);g.globalAlpha*=alpha;
  g.translate(-h/2,-h*.97);g.scale(h/320,h/320);if(under)under(g);g.drawImage(im,0,0,320,320);if(over)over(g);g.restore()}
const talkOf=(k,t)=>amp(k,t);
const hopOf=(t,t0,hgt=40,dur=.45)=>{const u=(t-t0)/dur;return u>0&&u<1?Math.sin(u*Math.PI)*hgt:0};
const walkBob=(t,on,seed=0)=>on?Math.abs(Math.sin(t*9+seed))*12:0;
function sky(g,top,bot){const s=g.createLinearGradient(0,-200,0,600);s.addColorStop(0,top);s.addColorStop(1,bot);g.fillStyle=s;g.fillRect(-500,-400,2400,1500)}
function stars(g,t,seed,n=60,x0=-60,w=1400,y0=-40,h=380){for(let i=0;i<n;i++){const x=x0+hash2(i,1,seed)*w,y=y0+hash2(i,2,seed)*h,tw=.5+.5*Math.sin(t*2+i*1.7);g.fillStyle=`rgba(255,250,210,${.35+.6*tw})`;g.beginPath();g.arc(x,y,1.4+hash2(i,3,seed)*1.8,0,7);g.fill()}}
function wordCard(g,word,x,y,k,col='#1d6fa5',wsh='#bfe3f7'){card(g,x,y,300,96,k,{seed:800+word.length,fill:'#fffaf0',wash:wsh,draw:g=>inkText(g,word,0,20,60,{col})})}
function pointAt(g,x1,y1,x2,y2,k,col='#e2382c'){if(k<=0)return;arrow(g,x1,y1,x2,y2,k,{w:6,col})}

/* ---- the cave interior: bed (left), table + chair + lamp (middle), window (right) */
function caveRoom(g,t,starsA=1){
  blob(g,rectP(-400,-300,2200,1300),'#8f7a66',{seed:2000,w:2,flat:true,ink:false});
  wash(g,640,300,700,'#b59a7e',1,2001,.6);wash(g,200,200,300,'#a58a70',1,2002,.4);
  for(let i=0;i<14;i++){const x=hash2(i,1,2003)*1400-60,y=hash2(i,2,2003)*480;blob(g,ell(x,y,30+hash2(i,3,2003)*30,18,12),'#7d6957',{seed:2004+i,w:1.4,alpha:.7})}
  // window with a night sky
  const win=[...ell(1070,250,110,120,24,Math.PI,Math.PI*2),[1180,420],[960,420]];
  fillPath(g,win);g.fillStyle='#1f2a4f';g.fill();g.save();fillPath(g,win);g.clip();g.globalAlpha=starsA;stars(g,t,2010,26,960,220,130,290);blob(g,ell(1130,190,18,18,14),'#fff6d0',{seed:2011,w:1});g.restore();
  inkPoly(g,win,{w:5,closed:true,seed:2012,col:'#5a3d28'});inkPoly(g,[[1070,130],[1070,420]],{w:5,seed:2013,col:'#5a3d28'});inkPoly(g,[[960,300],[1180,300]],{w:5,seed:2014,col:'#5a3d28'});
  blob(g,rectP(940,418,260,18),'#a8703f',{seed:2015,w:2});
  // floor + rug
  blob(g,subdiv([[-400,590],[1800,590],[1800,900],[-400,900]],20),'#6f5a48',{seed:2020,w:2.2});
  blob(g,ell(700,640,300,36,24),'#c0504a',{seed:2021,w:2,alpha:.9});
  // bed
  blob(g,rrectP(110,450,380,150,20),'#a8703f',{seed:2030,w:2.6});blob(g,rrectP(90,380,40,220,12),'#8a5a2b',{seed:2031,w:2.4});
  blob(g,rrectP(140,440,340,70,24),'#e2665a',{seed:2032,w:2.4});blob(g,rrectP(140,418,110,48,22),'#fffaf0',{seed:2033,w:2});
  hatch(g,rrectP(260,448,210,56,20),{ang:.9,sp:16,seed:2034,col:'rgba(255,255,255,.4)'});
  // table + chair
  blob(g,rrectP(600,470,220,26,8),'#a8703f',{seed:2040,w:2.4});for(const x of[620,796])blob(g,rectP(x,494,16,100),'#8a5a2b',{seed:2041+x,w:2});
  blob(g,rrectP(860,420,20,176,6),'#8a5a2b',{seed:2044,w:2});blob(g,rrectP(860,510,90,20,6),'#a8703f',{seed:2045,w:2});blob(g,rectP(930,528,14,68),'#8a5a2b',{seed:2046,w:2});
  blob(g,ell(660,462,26,10,14),'#fffaf0',{seed:2047,w:1.6});blob(g,ell(660,452,16,10,12),'#f2a31a',{seed:2048,w:1.4})}
// the oil lamp on the table; lit 0..1
function lamp(g,lit,t){g.save();g.translate(760,470);blob(g,ell(0,-10,26,14,16),'#d4b24a',{seed:2050,w:2});blob(g,rrectP(-10,-44,20,32,6),'#e8f4ff',{seed:2051,w:1.6,alpha:.8});
  if(lit>0){const f=1+.12*Math.sin(t*14);g.save();g.globalAlpha=lit;blob(g,ell(0,-30,7*f,13*f,12),'#ffb02e',{seed:2052,w:1,ink:false});blob(g,ell(0,-28,3.5,7,10),'#fff3b0',{seed:2053,w:1,ink:false});g.restore();glow(g,0,-30,220,'rgba(255,190,90,A)',.55*lit)}
  g.restore()}

/* =====================================================================
   SCENES
   ===================================================================== */

/* 1. Outside — title, the cave on the mountain, Fox knocks */
SC.outside=(g,t,S)=>{const lt=t-S.start,C=S.cues,dt=doorT(S),op=ease(seg(t,dt,dt+.8)),inK=ease(seg(t,endOf(S,'r01')-.2,S.end));
  const c=rig(lt,[[0,{x:640,y:330,z:1.0}],[C.d01-S.start+.2,{x:640,y:330,z:1.0}],[C.f01-S.start,{x:760,y:420,z:1.35},'io'],[S.end-S.start,{x:760,y:440,z:1.7},'in']]);
  g.save();camApply(g,c);
  sky(g,'#27335e','#8a7fb0');stars(g,t,2100,70);blob(g,ell(1100,110,36,36,20),'#fff6d0',{seed:2101,w:1.6});
  blob(g,subdiv([[-400,720],[100,360],[380,180],[640,120],[900,190],[1200,380],[1700,720]],20),'#8d8fb0',{seed:2110,w:2.4});
  blob(g,subdiv([[380,190],[640,120],[900,195],[800,230],[640,190],[500,240]],10),'#ffffff',{seed:2111,w:2});
  blob(g,subdiv([[-400,610],[1800,600],[1800,900],[-400,900]],18),'#6b7d5a',{seed:2112,w:2.4});
  // cave mouth + round wooden door
  blob(g,ell(760,540,150,140,28,Math.PI,Math.PI*2).concat([[910,600],[610,600]]),'#3a3040',{seed:2120,w:2.6});
  const warm=op;if(warm>0){g.save();fillPath(g,ell(760,540,120,120,24,Math.PI,Math.PI*2).concat([[880,600],[640,600]]));g.fillStyle=`rgba(255,200,110,${.85*warm})`;g.fill();g.restore()}
  g.save();g.translate(640,0);g.scale(lerp(1,.12,op),1);g.translate(-640,0);
  blob(g,ell(760,540,120,120,24,Math.PI,Math.PI*2).concat([[880,600],[640,600]]),'#a8703f',{seed:2121,w:2.4});
  for(let i=0;i<4;i++)inkPoly(g,[[680+i*50,450],[680+i*50,600]],{w:2,seed:2122+i,col:'rgba(80,50,20,.5)'});blob(g,ell(850,540,9,9,10),'#d4b24a',{seed:2126,w:1.4});g.restore();
  glow(g,760,520,240,'rgba(255,190,90,A)',.5*warm);
  drawPet(g,'fox',lerp(-120,560,ease(seg(lt,.5,2.6)))+lerp(0,200,inK),602,138,{face:1,talk:talkOf('F',t),hop:walkBob(t,lt>.5&&lt<2.6,1)+hopOf(t,C.f01-.5,10,.2)+hopOf(t,C.f01-.25,10,.2),alpha:1-seg(inK,.6,1)});
  if(op>0)drawPet(g,'dragon',760,602,160,{talk:talkOf('R',t),alpha:op,hop:hopOf(t,dt+.4,22)});
  if(t>C.f01-.6&&t<C.f01+.4)inkText(g,'knock knock!',900,430,34,{col:'#fff6c8',stroke:'#3a3040',sw:6,alpha:seg(t,C.f01-.6,C.f01-.4)});
  g.restore();
  // title card
  const tk=seg(lt,.2,.8)*(1-seg(lt,2.3,2.8));if(tk>0){card(g,640,300,720,190,tk,{seed:2130,fill:'#fffaf0',wash:'#f6d27a',draw:g=>{inkText(g,"Dragon's Home",0,0,80,{col:'#b35a00'});inkText(g,'Pet Stories · Dragon',0,56,32,{col:'#5a3d28'})}})}
  if(lt>.3)chip(g,'On the mountain',seg(lt,2.6,3.2));
  if(lt<.6){g.fillStyle=`rgba(243,234,214,${1-lt/.6})`;g.fillRect(0,0,W,H)}};

/* 2. The bed — Fox bounces */
SC.bed=(g,t,S)=>{const lt=t-S.start,C=S.cues,jump=t>endOf(S,'f02')?t-endOf(S,'f02'):-1;
  const c=rig(lt,[[0,{x:560,y:400,z:1.1}],[C.r02-S.start+.2,{x:420,y:430,z:1.35},'io'],[S.end-S.start,{x:400,y:420,z:1.4}]]);
  g.save();camApply(g,c);caveRoom(g,t);lamp(g,1,t);
  const bnc=jump>0?Math.abs(Math.sin(jump*6))*90*Math.exp(-jump*.6):0;
  drawPet(g,'fox',jump>0?lerp(560,330,ease(seg(jump,0,.4))):560,jump>0?lerp(602,470,ease(seg(jump,0,.4))):602,138,{face:jump>0?1:0,talk:talkOf('F',t),hop:bnc,sq:jump>0?Math.max(0,Math.cos(jump*6))*.25*Math.exp(-jump*.6):0});
  drawPet(g,'dragon',610,604,165,{talk:talkOf('R',t),tilt:t>C.f02?Math.sin(t*3)*.05:0});
  pointAt(g,470,330,340,430,seg(t,at(S,'r02','bed'),at(S,'r02','bed')+.4));
  g.restore();
  chip(g,"Dragon's cave",seg(lt,.1,.7));
  wordCard(g,'bed',1040,120,seg(t,at(S,'r02','bed')-.05,at(S,'r02','bed')+.35),'#c0392b','#f7b8b0')};

/* 3. Table, chair, window */
SC.room=(g,t,S)=>{const lt=t-S.start,C=S.cues,tb=at(S,'r03','table'),ch=at(S,'r03','chair'),wn=at(S,'r04','window');
  const c=rig(lt,[[0,{x:700,y:430,z:1.3}],[ch-S.start,{x:760,y:440,z:1.35}],[C.r04-S.start+.3,{x:960,y:400,z:1.15},'io'],[S.end-S.start,{x:980,y:390,z:1.22},'in']]);
  g.save();camApply(g,c);caveRoom(g,t);lamp(g,1,t);
  const dx=lerp(560,880,ease(seg(t,C.r04-.3,C.r04+1)));drawPet(g,'dragon',dx,604,165,{face:t>C.r04?1:0,talk:talkOf('R',t),hop:walkBob(t,t>C.r04-.3&&t<C.r04+1,4)});
  drawPet(g,'fox',lerp(420,760,ease(seg(t,C.r04,C.r04+1.4))),604,138,{face:1,talk:talkOf('F',t),hop:walkBob(t,t>C.r04&&t<C.r04+1.4,1)});
  pointAt(g,640,360,700,460,seg(t,tb,tb+.4)*(1-seg(t,ch,ch+.3)));pointAt(g,960,380,905,500,seg(t,ch,ch+.4)*(1-seg(t,C.r04,C.r04+.3)));
  if(t>wn)sparkles(g,1070,250,(t-wn)%1.2,2200,10,110,'#fff6a0');
  g.restore();
  chip(g,"Dragon's cave",seg(lt,.1,.7));
  const ws=[['table',tb,'#8a5a2b','#f7d7a6'],['chair',ch,'#1b8a36','#cde8b5'],['window',wn,'#1d6fa5','#bfe3f7']];
  ws.forEach(([w,tt,col,wsh],i)=>{const k=seg(t,tt-.05,tt+.35);if(k<=0)return;card(g,560+i*230,86,210,70,k,{seed:2210+i,fill:'#fffaf0',wash:wsh,draw:g=>inkText(g,w,0,14,40,{col})})})};

/* 4. The wind blows out the lamp; Dragon relights it gently */
SC.dark=(g,t,S)=>{const lt=t-S.start,C=S.cues,ot=outT(S),lt2=litT(S),lit=t<ot?1:ease(seg(t,lt2,lt2+.6)),flame=seg(t,lt2-.5,lt2-.2)*(1-seg(t,lt2+.2,lt2+.6));
  const c=rig(lt,[[0,{x:760,y:420,z:1.2}],[ot-S.start,{x:760,y:420,z:1.2}],[ot-S.start+.4,{x:760,y:430,z:1.3},'expo'],[C.r05-S.start,{x:720,y:440,z:1.4}],[S.end-S.start,{x:700,y:430,z:1.3}]]);
  g.save();camApply(g,shake(c,'impact',t,{t0:ot,amp:6}));caveRoom(g,t);lamp(g,lit,t);
  if(t>ot-.4&&t<ot+.8)for(let i=0;i<8;i++){const p=seg(t,ot-.4+i*.04,ot+.4+i*.04);inkPoly(g,[[1180-p*700,300+i*24],[1260-p*700,300+i*24]],{w:3,seed:2300+i,col:`rgba(255,255,255,${.7*(1-p)})`})}
  const scared=t>C.f03&&t<lt2;
  drawPet(g,'fox',560,604,138,{face:1,talk:talkOf('F',t),tilt:scared?Math.sin(t*30)*.04:0,hop:hopOf(t,C.f04,26)});
  drawPet(g,'dragon',880,604,165,{talk:talkOf('R',t),tilt:flame>0?-.1:0});
  if(flame>0){const im=img('fx_fire');g.save();g.translate(800,500);g.rotate(Math.PI*.95);g.globalAlpha=flame;g.drawImage(im,-10,-22,44,44);g.restore()}
  const L=toScreen(g,760,440),Wn=toScreen(g,1070,260);g.restore();
  const dark=t<ot?0:(1-lit)*.8+.0;darkness(g,dark,[[Wn.x,Wn.y,180,.5],[L.x,L.y,60+200*lit,lit]]);
  if(t>lt2)glow(g,L.x,L.y,420,'rgba(255,190,90,A)',.25*lit);
  chip(g,"Dragon's cave",seg(lt,.1,.7));
  wordCard(g,'lamp',1040,120,seg(t,at(S,'d02','lamp')-.05,at(S,'d02','lamp')+.35),'#b35a00','#f6d27a');
  card(g,640,110,380,70,seg(t,at(S,'r05','gently'),at(S,'r05','gently')+.4)*(1-seg(t,C.f04,C.f04+.3)),{seed:2310,fill:'#fffaf0',wash:'#f7d7a6',draw:g=>inkText(g,'gently',0,13,40,{col:'#b3471f'})})};

/* 5. Warm ending + word recap */
SC.end=(g,t,S)=>{const lt=t-S.start,T=S.end-S.start;
  g.save();camApply(g,{x:640,y:lerp(420,380,ease(seg(lt,0,T))),z:lerp(1.2,1.0,ease(seg(lt,0,T))),r:0});caveRoom(g,t);lamp(g,1,t);
  drawPet(g,'fox',560,604,138,{face:1,hop:Math.max(0,Math.sin(t*5))*10});drawPet(g,'dragon',720,604,165,{hop:Math.max(0,Math.sin(t*5+1))*10});
  for(let i=0;i<4;i++)heart(g,560+i*60,420-seg(lt,0,T)*60+Math.sin(t*3+i)*10,.7,'#f07a8a');
  g.restore();glow(g,640,400,500,'rgba(255,190,90,A)',.2);
  const words=['bed','table','chair','window','lamp'];words.forEach((w,i)=>{const k=seg(lt,.6+i*.15,1+i*.15);if(k>0)card(g,240+i*200,90,180,62,k,{seed:2400+i,fill:'#fffaf0',wash:'#f6d27a',draw:g=>inkText(g,w,0,12,34,{col:'#b35a00'})})});
  const e=seg(t,S.end-1.8,S.end-.2);if(e>0){g.fillStyle=`rgba(243,234,214,${ease(e)})`;g.fillRect(0,0,W,H);
    inkText(g,'The End',640,340,110,{alpha:e,col:'#b35a00',stroke:'#fffaf0',sw:12});inkText(g,"Pet Stories · Dragon's Home",640,420,38,{alpha:e,col:'#5a3d28'})}};

/* ---------- score */
function scoreShot(K,S){const{ev,pad,bass,theme,arp,drums}=K,s=S.start,e=S.end;switch(S.id){
  case'outside':theme(s,e,'musicbox',72,'maj',.3);pad(s,e,'strings',48,'maj',.1);bass(s,e,60,'maj',.18);break;
  case'bed':arp(s,e,'pizz',72,'maj',.22,.5,[0,2,4,7]);bass(s,e,60,'maj',.28,'pulse');drums(s,e,'bouncy',.4);break;
  case'room':theme(s,e,'flute',72,'maj',.22);bass(s,e,60,'maj',.26);drums(s,e,'soft',.3);break;
  case'dark':{const o=snapB(outT(S)),l=snapB(litT(S));arp(s,o,'pizz',72,'maj',.2,.5,[0,4,2,4]);ev(o,'crash',0,0,.3);pad(o,l,'strings',45,'min',.14);arp(o,l,'musicbox',81,'min',.12,1,[0,3,7,3]);
    ev(l,'swell',0,1.2,.2);theme(l,e,'strings',72,'maj',.24);bass(l,e,60,'maj',.24);break}
  case'end':{theme(s,e-BAR,'musicbox',72,'maj',.32);pad(s,e-BAR,'strings',48,'maj',.12);const f=e-BAR;for(const m of[48,55,60,64,67,72])ev(f,'strings',m,BAR*1.2,.14);ev(f,'musicbox',84,BAR,.3);break}}
}
