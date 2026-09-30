/* Dragon's Super Suit — Pet Stories, Dragon episode 2 (English, Year 1–2: clothes words)
   Cast = the app's pet sprites (images/*.png via img()); the suit is drawn on the sprite. */
const META={title:"Dragon's Super Suit · Pet Stories",h1:"Pet Stories · Dragon's Super Suit",lang:'en'};
const STYLE='watercolour';
const HOST='none';
const SOUND='elevenlabs';
const LINES={
 d01:['D','One morning, a big snowstorm hit the mountain.'],
 f01:['F','Help! My door is frozen!'],
 r01:['R',"I'm coming, Fox! Brrr… it's too cold to fly!"],
 o01:['O','Wait, Dragon! You need your super suit!'],
 r02:['R','I put on my boots. Stomp, stomp!'],
 r03:['R','I put on my gloves. Nice and warm!'],
 r04:['R','I put on my scarf. Cosy!'],
 r05:['R','I put on my goggles. Now I can see!'],
 r06:['R','And I put on my cape. Whoosh!'],
 o02:['O','Now you are Super Dragon!'],
 r07:['R','Dragon Flame!'],
 f02:['F','You did it! Thank you, Super Dragon!'],
 r08:['R','Anytime, friend!'],
 d02:['D','Super suits are great. Kind friends are even better!'],
};
const SPK={D:['Narrator','#7a6a5a'],R:['Dragon','#2e9b74'],F:['Fox','#d9731a'],O:['Owl','#8a6440']};
const PLAN=[
 {id:'storm', pre:2.8, seq:['d01',0.4,'f01',0.4,'r01'], post:0.4},
 {id:'suit',  pre:0.3, seq:['o01',0.6,'r02',0.4,'r03',0.4,'r04',0.4,'r05',0.4,'r06',1.0,'o02'], post:0.8},
 {id:'fly',   pre:1.4, seq:['r07',2.0,'f02',0.3,'r08'], post:0.6},
 {id:'end',   pre:0.4, seq:['d02'], post:3.0},
];
const GAP=0.18;
const TRANS={suit:'style',fly:'whip',end:'iris'};

const endOf=(S,id)=>S.cues[id]+CLIP[id].eff;
const pieceT=(S,id,w)=>at(S,id,w)-.05;          // a suit piece pops on as its word is said
const flameT=S=>S.cues.r07+.15, meltT=S=>flameT(S)+1.2;

function chapterSFX(){const S=shot,C=cue,len=slen;const st=S('storm'),su=S('suit'),fl=S('fly');return[
  {t:st.start+.6,name:'sfx_sparkle',gain:.5},
  {t:st.start+2.4,name:'sfx_wind',loop:true,dur:len('storm')-2.4,gain:.6},
  {t:C('storm','f01')-.2,name:'sfx_icecrack',gain:.35},
  {t:su.start,name:'sfx_wind',loop:true,dur:1.5,gain:.25},
  {t:C('suit','o01')-.1,name:'sfx_whoosh',dur:1,gain:.45},
  {t:pieceT(su,'r02','boots'),name:'sfx_pop',dur:.5,gain:.7},
  {t:pieceT(su,'r03','gloves'),name:'sfx_pop',dur:.5,gain:.7},
  {t:pieceT(su,'r04','scarf'),name:'sfx_pop',dur:.5,gain:.7},
  {t:pieceT(su,'r05','goggles'),name:'sfx_pop',dur:.5,gain:.7},
  {t:pieceT(su,'r06','cape'),name:'sfx_whoosh',dur:1,gain:.6},
  {t:C('suit','o02')-.2,name:'sfx_sparkle',gain:.8},
  {t:fl.start,name:'sfx_wind',loop:true,dur:len('fly'),gain:.4},
  {t:fl.start+.2,name:'sfx_whoosh',dur:1.2,gain:.6},
  {t:flameT(fl),name:'sfx_firebreath',gain:1},
  {t:flameT(fl)+.3,name:'sfx_fire',dur:1,gain:.7},
  {t:meltT(fl),name:'sfx_icecrack',gain:.8},
  {t:meltT(fl)+.4,name:'sfx_ding',gain:.6},
  {t:S('end').start+.4,name:'sfx_sparkle',gain:.6},
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


/* ---- the super suit, drawn in the dragon sprite's own 320×320 pixel space.
   k = {boots,gloves,scarf,goggles,cape} each 0..1 (pop-in); stream = cape blowing back (flying) */
function popIn(g,k,cx,cy,draw){if(k<=0)return;const s=back(clamp(k));g.save();g.translate(cx,cy);g.scale(s,s);g.translate(-cx,-cy);draw(g);g.restore()}
function capeUnder(k,t,stream=0){return g=>popIn(g,k,160,200,g=>{const w=Math.sin(t*6)*8;
  const rest=[[112,192],[196,184],[306,238+w],[282,292],[176,290]],fly=[[118,196],[192,188],[330,140+w],[340,230+w],[160,290]];
  const P=rest.map((p,i)=>[lerp(p[0],fly[i][0],stream),lerp(p[1],fly[i][1],stream)]);
  blob(g,subdiv(P,8),'#d8322a',{seed:3000,w:3});hatch(g,subdiv(P,6),{ang:1.1,sp:18,seed:3001,col:'rgba(120,20,20,.25)'})})}
function suitOver(k){return g=>{
  if(k.boots>0)for(const[x,y]of[[106,292],[141,296],[200,294]])popIn(g,k.boots,x,y,g=>{blob(g,rrectP(x-19,y-26,38,30,9),'#d8322a',{seed:3010+x,w:2.4});blob(g,rrectP(x-21,y-2,42,9,4),'#5a3d28',{seed:3011+x,w:1.6})});
  if(k.gloves>0)for(const[x,y]of[[100,250],[172,248]])popIn(g,k.gloves,x,y,g=>{blob(g,ell(x,y,17,15,14),'#f4c20d',{seed:3020+x,w:2.2});blob(g,rrectP(x-15,y+10,30,8,4),'#ffffff',{seed:3021+x,w:1.4})});
  if(k.scarf>0)popIn(g,k.scarf,145,200,g=>{blob(g,ell(145,200,60,14,20),'#1d6fa5',{seed:3030,w:2.4});for(let i=0;i<5;i++)inkPoly(g,[[100+i*22,190],[104+i*22,210]],{w:4,seed:3031+i,col:'rgba(255,255,255,.8)'});
    blob(g,subdiv([[168,204],[186,206],[192,250],[174,252]],6),'#1d6fa5',{seed:3036,w:2})});
  if(k.goggles>0)popIn(g,k.goggles,113,138,g=>{blob(g,subdiv([[52,124],[180,114],[182,128],[54,138]],8),'#3a3040',{seed:3040,w:1.6});
    for(const[x,y]of[[84,142],[142,140]]){blob(g,ell(x,y,25,24,20),'#f2a31a',{seed:3041+x,w:2.4});g.save();fillPath(g,ell(x,y,18,17,18));g.fillStyle='rgba(170,225,255,.55)';g.fill();g.restore();inkPoly(g,[[x-9,y-8],[x-2,y-12]],{w:3,seed:3043+x,col:'rgba(255,255,255,.9)'})}})}}
const FULL={boots:1,gloves:1,scarf:1,goggles:1,cape:1};
function superDragon(g,x,y,h,t,o={}){const k=o.k||FULL;drawPet(g,'dragon',x,y,h,{...o,under:capeUnder(k.cape,t,o.stream||0),over:suitOver(k)})}

/* ---- snowy mountain with Fox's little house */
function foxHouse(g,x,y,ice,t){g.save();g.translate(x,y);
  blob(g,rectP(-110,-150,220,150),'#c9985a',{seed:3100,w:2.6});blob(g,subdiv([[-140,-140],[0,-250],[140,-140]],8),'#b3471f',{seed:3101,w:2.6});
  blob(g,subdiv([[-140,-142],[0,-252],[140,-142],[110,-130],[0,-222],[-110,-130]],8),'#ffffff',{seed:3102,w:2});
  blob(g,rrectP(-36,-100,72,100,30),'#8a5a2b',{seed:3103,w:2.2});blob(g,ell(22,-50,6,6,8),'#d4b24a',{seed:3104,w:1});
  blob(g,rrectP(60,-120,38,38,4),'#fff2b0',{seed:3105,w:2});
  if(ice>0){g.save();g.globalAlpha=ice;blob(g,rrectP(-50,-112,100,114,30),'#cfeeff',{seed:3110,w:2.4,alpha:.85});hatch(g,rrectP(-40,-104,80,98,24),{ang:.6,sp:12,seed:3111,col:'rgba(255,255,255,.8)'});
    for(let i=0;i<7;i++){const ix=-120+i*40;blob(g,subdiv([[ix-8,-150],[ix+8,-150],[ix,-150+18+hash2(i,1,3112)*20]],3),'#dff4ff',{seed:3113+i,w:1.4})}g.restore()}
  g.restore()}
function snowStorm(g,t,seed,n=110,wind=1,a=1){g.save();g.globalAlpha=a;g.fillStyle='#ffffff';for(let i=0;i<n;i++){const sp=60+hash2(i,3,seed)*80,x=((hash2(i,1,seed)*1700-t*sp*2.2*wind)%1700+1700)%1700-200,y=((hash2(i,2,seed)*900+t*sp)%900)-100;g.beginPath();g.ellipse(x,y,2+hash2(i,4,seed)*3,1.6+hash2(i,4,seed)*2,-.4*wind,0,7);g.fill()}g.restore()}
function mountainBG(g,t,skyA='#b9c8dc',skyB='#eef3f8'){sky(g,skyA,skyB);
  blob(g,subdiv([[-400,720],[0,330],[300,200],[560,300],[900,180],[1300,340],[1700,720]],20),'#e3e8f1',{seed:3120,w:2.2});
  blob(g,subdiv([[-400,600],[1800,590],[1800,900],[-400,900]],18),'#ffffff',{seed:3121,w:2.4})}
function caveMouth(g){blob(g,ell(250,600,170,190,28,Math.PI,Math.PI*2).concat([[420,600],[80,600]]),'#6d6272',{seed:3130,w:2.6});blob(g,ell(250,600,130,150,24,Math.PI,Math.PI*2).concat([[380,600],[120,600]]),'#2e2833',{seed:3131,w:2})}

/* =====================================================================
   SCENES
   ===================================================================== */

/* 1. Snowstorm — Fox's door is frozen; Dragon is too cold */
SC.storm=(g,t,S)=>{const lt=t-S.start,C=S.cues;
  const c=rig(lt,[[0,{x:640,y:360,z:1.0}],[C.d01-S.start+.4,{x:640,y:360,z:1.0}],[C.f01-S.start,{x:1000,y:420,z:1.45},'io'],[C.r01-S.start-.1,{x:1000,y:420,z:1.45}],[C.r01-S.start,{x:300,y:450,z:1.5},'cut'],[S.end-S.start,{x:300,y:460,z:1.6},'lin']]);
  g.save();camApply(g,shake(c,'handheld',t,{amp:3}));mountainBG(g,t);caveMouth(g);foxHouse(g,1000,598,1,t);
  const inside=[1000-10,598-60];if(t>C.f01-.3)drawPet(g,'fox',1060,598,80,{shadow:false,talk:talkOf('F',t),alpha:.9,tilt:Math.sin(t*20)*.03});
  const shiver=t>C.r01?Math.sin(t*45)*.035:0;drawPet(g,'dragon',260,604,165,{face:1,talk:talkOf('R',t),tilt:shiver,sq:t>at(S,'r01','Brrr')?.12:0});
  if(t>at(S,'r01','Brrr'))for(let i=0;i<5;i++){const a=t*2+i;blob(g,ell(260+Math.cos(a)*80,470+Math.sin(a)*14,7,7,8),'#cfe8ff',{seed:3140+i,w:1,alpha:.8})}
  snowStorm(g,t,3141,120,1.2);
  g.restore();
  const tk=seg(lt,.2,.8)*(1-seg(lt,2.3,2.8));if(tk>0)card(g,640,300,760,190,tk,{seed:3150,fill:'#fffaf0',wash:'#bfe3f7',draw:g=>{inkText(g,"Dragon's Super Suit",0,0,74,{col:'#c0392b'});inkText(g,'Pet Stories · Dragon',0,56,32,{col:'#5a3d28'})}});
  if(lt>2.6)chip(g,'Snowstorm!',seg(lt,2.6,3.2));
  if(lt<.6){g.fillStyle=`rgba(243,234,214,${1-lt/.6})`;g.fillRect(0,0,W,H)}};

/* 2. The super suit — piece by piece */
SC.suit=(g,t,S)=>{const lt=t-S.start,C=S.cues;
  const K={boots:seg(t,pieceT(S,'r02','boots'),pieceT(S,'r02','boots')+.5),gloves:seg(t,pieceT(S,'r03','gloves'),pieceT(S,'r03','gloves')+.5),scarf:seg(t,pieceT(S,'r04','scarf'),pieceT(S,'r04','scarf')+.5),
    goggles:seg(t,pieceT(S,'r05','goggles'),pieceT(S,'r05','goggles')+.5),cape:seg(t,pieceT(S,'r06','cape'),pieceT(S,'r06','cape')+.6)};
  const hero=seg(t,C.o02-.2,C.o02+.6);
  // camera: frames the body part being dressed, then pulls back for the hero reveal
  const foc=t>=pieceT(S,'r06','cape')?[700,470,1.25]:t>=pieceT(S,'r05','goggles')?[600,450,1.55]:t>=pieceT(S,'r04','scarf')?[640,490,1.5]:t>=pieceT(S,'r03','gloves')?[640,520,1.45]:t>=pieceT(S,'r02','boots')?[640,540,1.4]:[640,400,1.05];
  let c={x:foc[0],y:foc[1],z:foc[2],r:0};c=camMix(c,{x:640,y:390,z:1.05,r:0},ease(hero));c=punch(c,t,C.o02,.06);
  g.save();camApply(g,c);
  blob(g,rectP(-400,-300,2200,1300),'#8f7a66',{seed:3200,w:2,flat:true,ink:false});wash(g,640,300,700,'#b59a7e',1,3201,.6);
  for(let i=0;i<12;i++){const x=hash2(i,1,3202)*1400-60,y=hash2(i,2,3202)*480;blob(g,ell(x,y,30+hash2(i,3,3202)*30,18,12),'#7d6957',{seed:3203+i,w:1.4,alpha:.7})}
  blob(g,subdiv([[-400,610],[1800,610],[1800,900],[-400,900]],20),'#6f5a48',{seed:3215,w:2.2});
  // owl flies in with the suit box
  const oIn=ease(seg(t,C.o01-.3,C.o01+.6));drawPet(g,'owl',lerp(1400,1010,oIn),lerp(300,612,oIn),126,{talk:talkOf('O',t),shadow:oIn>.9,hop:hopOf(t,C.o02,20)});
  if(oIn>.9){const bx=900,by=612;blob(g,rrectP(bx-60,by-70,120,70,8),'#e2665a',{seed:3220,w:2.4});blob(g,rectP(bx-8,by-70,16,70),'#f4c20d',{seed:3221,w:1.6})}
  if(hero>0)glow(g,640,420,360,'rgba(255,220,120,A)',.5*hero*(1-seg(t,C.o02+1,S.end)));
  superDragon(g,640,616,300,t,{k:K,talk:talkOf('R',t),hop:hopOf(t,pieceT(S,'r02','boots')+.3,14,.3)+hopOf(t,pieceT(S,'r02','boots')+.7,14,.3)+hopOf(t,C.o02,40,.6),tilt:hero>0&&hero<1?Math.sin(hero*Math.PI*2)*.08:0});
  for(const[id,w,x,y]of[['r02','boots',640,600],['r03','gloves',640,480],['r04','scarf',650,430],['r05','goggles',600,340],['r06','cape',760,470]]){const tt=pieceT(S,id,w);sparkles(g,x,y,t-tt,3230+x,10,90)}
  if(hero>0)sparkles(g,640,400,(t-C.o02)*.8,3240,18,260,'#fff6a0');
  g.restore();
  chip(g,'Suit up!',seg(lt,.1,.7));
  const ws=[['boots','r02','#c0392b','#f7b8b0'],['gloves','r03','#b35a00','#f6d27a'],['scarf','r04','#1d6fa5','#bfe3f7'],['goggles','r05','#5a4fb0','#dcd6f5'],['cape','r06','#c0392b','#f7b8b0']];
  ws.forEach(([w,id,col,wsh],i)=>{const tt=pieceT(S,id,w),k=seg(t,tt,tt+.35);if(k<=0)return;card(g,380+i*170,86,158,62,k,{seed:3250+i,fill:'#fffaf0',wash:wsh,draw:g=>inkText(g,w,0,12,34,{col})})});
  if(t>C.o02+.1)inkText(g,'SUPER DRAGON!',640,190,70,{col:'#c0392b',stroke:'#fffaf0',sw:12,alpha:seg(t,C.o02+.1,C.o02+.4)})};

/* 3. Fly through the storm, Dragon Flame melts the ice */
SC.fly=(g,t,S)=>{const lt=t-S.start,C=S.cues,ft=flameT(S),mt=meltT(S),fire=seg(t,ft,ft+.2)*(1-seg(t,mt,mt+.4)),ice=1-seg(t,ft+.3,mt),open=ease(seg(t,mt+.3,mt+1));
  const fx=lerp(-200,700,ease(seg(lt,0,ft-S.start))),fy=lerp(220,380,ease(seg(lt,0,ft-S.start)))+Math.sin(t*4)*10,landK=ease(seg(t,C.f02-.4,C.f02+.4));
  let c=rig(lt,[[0,{x:500,y:360,z:1.0}],[ft-S.start-.3,{x:820,y:420,z:1.15},'io'],[mt-S.start,{x:880,y:440,z:1.25}],[S.end-S.start,{x:860,y:440,z:1.2}]]);c=punch(c,t,ft,.07);
  g.save();camApply(g,c);mountainBG(g,t,mixCol('#b9c8dc','#9fd0ee',open),'#eef3f8');caveMouth(g);foxHouse(g,1000,598,ice,t);
  if(ice<1&&ice>0)for(let i=0;i<8;i++){const p=((t*1.5+hash2(i,1,3300))%1);g.fillStyle='rgba(160,210,240,.9)';g.beginPath();g.arc(960+i*10,500+p*90,3.5,0,7);g.fill()}
  if(open>0)drawPet(g,'fox',lerp(1000,900,open),600,138,{talk:talkOf('F',t),hop:hopOf(t,C.f02,30),alpha:open});
  const dx=lerp(fx,780,landK),dy=lerp(fy,604,landK);superDragon(g,dx,dy,landK>.5?165:190,t,{face:1,talk:talkOf('R',t),tilt:lerp(-.18,0,landK),stream:1-landK,shadow:landK>.8});
  if(fire>0){const im=img('fx_fire');g.save();g.translate(dx+60,dy-110);g.rotate(Math.atan2(540-(dy-110),1000-(dx+60)));g.globalAlpha=fire;for(let i=0;i<3;i++){const s=120+40*i+20*Math.sin(t*20+i);g.drawImage(im,20+i*60,-s/2,s,s)}g.restore();glow(g,960,520,220,'rgba(255,150,40,A)',.6*fire)}
  if(open>0)sparkles(g,960,480,(t-mt-.3)%1.2,3310,14,160,'#fff6a0');
  snowStorm(g,t,3320,110*(1-open*.8),1.4);
  g.restore();
  chip(g,'To the rescue!',seg(lt,.1,.7));
  if(t>ft-.1)inkText(g,'DRAGON FLAME!',640,160,72,{col:'#e2382c',stroke:'#fff6c8',sw:12,alpha:seg(t,ft-.1,ft+.2)*(1-seg(t,mt+.4,mt+.9))})};

/* 4. Sun comes out — clothes recap */
SC.end=(g,t,S)=>{const lt=t-S.start,T=S.end-S.start;
  g.save();camApply(g,{x:760,y:lerp(440,390,ease(seg(lt,0,T))),z:lerp(1.2,1.0,ease(seg(lt,0,T))),r:0});mountainBG(g,t,'#9fd0ee','#fbf1d8');wash(g,1100,120,200,'#f6d27a',1,3401,.7);foxHouse(g,1000,598,0,t);
  drawPet(g,'fox',860,604,140,{hop:Math.max(0,Math.sin(t*5))*10});superDragon(g,640,606,170,t,{face:1,hop:Math.max(0,Math.sin(t*5+1))*10});drawPet(g,'owl',470,606,124,{face:1,hop:Math.max(0,Math.sin(t*5+2))*10});
  for(let i=0;i<4;i++)heart(g,620+i*70,400-seg(lt,0,T)*60+Math.sin(t*3+i)*10,.7,'#f07a8a');sparkles(g,700,420,(lt*.6)%1.1,3402,14,300,'#ffffff');
  g.restore();
  const words=['boots','gloves','scarf','goggles','cape'];words.forEach((w,i)=>{const k=seg(lt,.6+i*.15,1+i*.15);if(k>0)card(g,240+i*200,90,180,62,k,{seed:3410+i,fill:'#fffaf0',wash:'#f7b8b0',draw:g=>inkText(g,w,0,12,34,{col:'#c0392b'})})});
  const e=seg(t,S.end-1.8,S.end-.2);if(e>0){g.fillStyle=`rgba(243,234,214,${ease(e)})`;g.fillRect(0,0,W,H);
    inkText(g,'The End',640,340,110,{alpha:e,col:'#b35a00',stroke:'#fffaf0',sw:12});inkText(g,"Pet Stories · Dragon's Super Suit",640,420,38,{alpha:e,col:'#5a3d28'})}};

/* ---------- score */
function scoreShot(K,S){const{ev,pad,bass,theme,arp,drums}=K,s=S.start,e=S.end;switch(S.id){
  case'storm':pad(s,e,'strings',45,'min',.16,.12);arp(s,e,'musicbox',81,'min',.12,1,[0,3,7,3]);bass(s,e,45,'min',.22,'pulse');drums(s,e,'toms',.3);break;
  case'suit':{const h=snapB(S.cues.o02-.2);arp(s,h,'pizz',72,'maj',.24,.5,[0,2,4,7]);bass(s,h,60,'maj',.3,'pulse');drums(s,h,'bouncy',.45);
    ev(h-BAR,'riser',0,BAR,.25);ev(h,'crash',0,0,.45);theme(h,e,'strings',72,'maj',.3);bass(h,e,60,'maj',.3,'eighth');break}
  case'fly':{const f=snapB(flameT(S));drums(s,e,'bouncy',.5);bass(s,e,60,'maj',.34,'eighth');arp(s,f,'pizz',74,'maj',.24,.25,[0,2,4,7]);ev(f,'crash',0,0,.5);theme(f,e,'strings',72,'maj',.3);break}
  case'end':{theme(s,e-BAR,'musicbox',72,'maj',.32);pad(s,e-BAR,'strings',48,'maj',.12);const f=e-BAR;for(const m of[48,55,60,64,67,72])ev(f,'strings',m,BAR*1.2,.14);ev(f,'musicbox',84,BAR,.3);break}}
}
