/* Cerne: procedural art and audio. No dependencies, network or build step. */
(() => {
'use strict';
const canvas = document.querySelector('#forest'), ctx = canvas.getContext('2d');
const ui = Object.fromEntries(['count','best','hint','event','overlay','sound','pause','resume'].map(id=>[id,document.getElementById(id)]));
const W=1440,H=900,TAU=Math.PI*2,treeX=814,treeY=573;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t;
let seed=4513;
const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const rand=(a,b)=>a+Math.random()*(b-a);
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let scale=1,ox=0,oy=0,elapsed=0,last=0,paused=false,muted=false,count=0,perfects=0;
let shake=0,freeze=0,flash=0,eventTime=0,stepTimer=0,chargeHeld=false;
const keys=new Set(),particles=[],rings=[],floaters=[];
const player={x:630,y:660,vx:0,vy:0,face:1,walk:0,moving:false,state:'idle',time:0,power:0,hit:false,release:false};
const tree={state:'alive',hp:10,maxHp:10,t:0,angle:0,vel:0,hit:0,dir:1,growth:1,cycle:1};
let audio=null,master=null,noiseBuffer=null;
function initAudio(){
  if(!audio){
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
    audio=new AC();master=audio.createGain();master.gain.value=muted?0:.55;master.connect(audio.destination);
    noiseBuffer=audio.createBuffer(1,audio.sampleRate*2,audio.sampleRate);const d=noiseBuffer.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  }
  if(audio.state==='suspended')audio.resume().catch(()=>{});
}
function noise(duration,volume,freq,type='lowpass',delay=0){
  if(!audio||muted)return;const t=audio.currentTime+delay,n=audio.createBufferSource(),f=audio.createBiquadFilter(),g=audio.createGain();n.buffer=noiseBuffer;n.playbackRate.value=rand(.85,1.18);f.type=type;f.frequency.value=freq;g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(Math.max(.002,volume),t+.007);g.gain.exponentialRampToValueAtTime(.001,t+duration);n.connect(f);f.connect(g);g.connect(master);n.start(t,rand(0,.5));n.stop(t+duration+.03);
}
function tone(freq,duration,volume,type='sine',end=40,delay=0){
  if(!audio||muted)return;const t=audio.currentTime+delay,o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(end,t+duration);g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(volume,t+.006);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g);g.connect(master);o.start(t);o.stop(t+duration+.02);
}
function sound(kind,p=1){
  if(kind==='hit'){noise(.085,.6,rand(1900,2800));noise(.24,.35,430);tone(rand(170,215),.19,.55,'triangle',55);if(p>=2)tone(80,.28,.36,'sine',32);}
  if(kind==='swing')noise(.16,.2,rand(800,1400),'bandpass');
  if(kind==='step')noise(.09,.045,rand(550,950));
  if(kind==='creak'){noise(.7,.25,530,'bandpass');tone(140,.6,.09,'sawtooth',55);}
  if(kind==='crash'){noise(.95,.65,750);tone(74,.85,.7,'sine',23);for(let i=0;i<5;i++)noise(.14,.22,rand(900,2300),'lowpass',i*.1);}
  if(kind==='grow'){tone(330,.4,.09,'sine',495);tone(495,.55,.08,'sine',660,.12);noise(.65,.12,1700);}
}
function announce(text){ui.event.textContent=text;ui.event.classList.add('show');eventTime=2;}
function resize(){const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(innerWidth*dpr);canvas.height=Math.round(innerHeight*dpr);scale=Math.min(innerWidth/W,innerHeight/H);if(innerWidth/innerHeight<1.15)scale=innerHeight/H;ox=(innerWidth-W*scale)/2;oy=(innerHeight-H*scale)/2;}
addEventListener('resize',resize);resize();
function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill();}
function poly(c,points,color){c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}
function line(c,x,y,x2,y2,color,width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke();}
function pine(c,x,y,s,color){c.save();c.translate(x,y);c.scale(s,s);poly(c,[[-9,0],[-6,-270],[5,-270],[11,0]],color);for(let i=0;i<7;i++){const h=-360+i*41,w=20+i*13;poly(c,[[0,h],[-w,h+79],[-w*.65,h+72],[-w*1.12,h+98],[w*.9,h+89],[w*.6,h+70],[w,h+77]],color);}c.restore();}
function fern(c,x,y,s){for(let i=-2;i<=2;i++){const dx=i*10*s,dy=(-22+Math.abs(i)*4)*s;line(c,x,y,x+dx,y+dy,'#67815a',1.2*s);for(let j=1;j<5;j++){const k=j/5,px=x+dx*k,py=y+dy*k;line(c,px,py,px-5*s*(1-k),py-5*s,'#65835c',1.5*s);line(c,px,py,px+5*s*(1-k),py-4*s,'#718a60',1.5*s);}}}
const ground=document.createElement('canvas');ground.width=W;ground.height=H;
function makeGround(){
 const c=ground.getContext('2d');const sky=c.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#1a3735');sky.addColorStop(.45,'#526a50');sky.addColorStop(.7,'#354c37');sky.addColorStop(1,'#20382c');c.fillStyle=sky;c.fillRect(0,0,W,H);
 const glow=c.createRadialGradient(880,230,20,880,230,530);glow.addColorStop(0,'#d1c78836');glow.addColorStop(1,'#d1c78800');c.fillStyle=glow;c.fillRect(0,0,W,H);
 for(let layer=0;layer<3;layer++){for(let i=0;i<25;i++)pine(c,i*69+rnd()*60-60,490+layer*30+rnd()*40,.8+layer*.3+rnd()*.5,['#466052','#344f43','#294537'][layer]);}
 poly(c,[[660,0],[765,0],[1110,670],[825,603]],'#e1d9980b');poly(c,[[854,0],[896,0],[1260,650],[1160,643]],'#e1d99809');poly(c,[[395,0],[442,0],[816,587],[731,581]],'#e1d99808');
 ellipse(c,812,635,500,175,'#466044');ellipse(c,798,669,373,149,'#4b6141');ellipse(c,805,656,293,99,'#697449');ellipse(c,802,657,258,80,'#747b4c');
 poly(c,[[1050,900],[840,900],[677,751],[705,664],[816,624],[886,650],[793,722]],'#737749');
 for(let i=0;i<2500;i++){let x=rnd()*W,y=500+rnd()*400;const near=((x-805)/310)**2+((y-656)/113)**2<1;if(near&&rnd()<.7)continue;ellipse(c,x,y,1+rnd()*3,.4+rnd(),['#b1ad6b22','#1c3a2633','#d0bf7021'][i%3]);}
 for(let i=0;i<480;i++){const x=rnd()*W,y=515+rnd()*370;const near=((x-805)/265)**2+((y-651)/94)**2<1;if(near)continue;const size=3+rnd()*9;for(let j=0;j<3;j++)line(c,x,y,x+(j-1)*4,y-size+rnd()*4,['#80945b55','#a1a57144','#1c3e3299'][i%3],1.4);}
 for(let i=0;i<30;i++){const x=rnd()*W,y=570+rnd()*280;if(Math.abs(x-800)<250&&y<760)continue;const s=.5+rnd();ellipse(c,x+3,y+4,18*s,7*s,'#142e2944');poly(c,[[x-16*s,y],[x-10*s,y-12*s],[x+4*s,y-16*s],[x+15*s,y-6*s],[x+17*s,y+2*s],[x,y+6*s]],'#647166');poly(c,[[x-16*s,y],[x-10*s,y-12*s],[x+4*s,y-16*s],[x+3*s,y-5*s]],'#899184');line(c,x-6*s,y-11*s,x+3*s,y-12*s,'#bdc0a277',1.4);}
 for(let i=0;i<35;i++){const x=rnd()*W,y=620+rnd()*270;if(Math.abs(x-800)<265&&y<760)continue;fern(c,x,y,.7+rnd()*.7);}
 for(let i=0;i<45;i++){const x=350+rnd()*810,y=570+rnd()*225;if(Math.abs(x-800)<190&&y<715)continue;line(c,x,y,x+2,y-7,'#9ca26c',1);ellipse(c,x+2,y-8,2.5,1.6,i%3?'#c7c09a':'#d6b56b');}
 // Foreground trunks frame the clearing without competing with the central tree.
 pine(c,52,900,2.8,'#142e27');pine(c,1395,900,2.6,'#19362a');
 for(const [x,y]of [[152,738],[1200,720],[290,806],[1142,824]]){ellipse(c,x,y,24,6,'#152f2666');line(c,x,y,x+25,y-7,'#564735',8);line(c,x+5,y-2,x+26,y-9,'#8d7c51',2);fern(c,x-15,y,1.5);}
}
makeGround();
// Fixed canopy geometry keeps the silhouette stable while the tree bends.
const branches=[];for(let tier=0;tier<7;tier++){const y=-398+tier*43,w=36+tier*17;let points=[[0,y-45]];for(let j=0;j<7;j++)points.push([-w*(j/6)+rnd()*10,y+10+j*5]);for(let j=0;j<11;j++)points.push([-w+j*w*2/10,y+48+rnd()*15]);for(let j=6;j>=0;j--)points.push([w*(j/6)+rnd()*9,y+10+j*5]);branches.push({points,y,w});}
function drawTree(c){
 if(tree.state==='cooldown')return;
 const fall=tree.state==='falling';const a=fall?tree.dir*Math.pow(clamp(tree.t/1.18,0,1),2)*1.46:tree.angle+Math.sin(elapsed*.7)*.004;
 c.save();c.translate(treeX,treeY);c.rotate(a);c.scale(tree.growth,tree.growth);if(fall&&tree.t>1.45)c.globalAlpha=clamp(1-(tree.t-1.45)/.6,0,1);
 poly(c,[[-30,3],[-21,-175],[-11,-344],[0,-426],[13,-315],[22,-151],[31,4]],'#715137');
 poly(c,[[-30,3],[-21,-175],[-11,-344],[-7,-214],[-13,-77],[-12,4]],'#493d2b');
 poly(c,[[5,-313],[13,-300],[22,-151],[31,4],[12,5],[8,-93]],'#977048');
 for(let i=0;i<11;i++){const x=-18+(i*13)%40,y=-24-i*25;line(c,x,y,x-3,y-34,'#b08b5155',2);line(c,x+5,y-5,x+3,y-28,'#352f2488',1.5);}
 for(let i=6;i>=0;i--){const b=branches[i];line(c,0,b.y+28,-b.w,b.y+50,'#493e2c',5);line(c,0,b.y+24,b.w,b.y+50,'#6e5438',4);poly(c,b.points,['#476b46','#416644','#3c6041','#385b3a','#365a39','#335436','#2c4a32'][i]);const p=b.points.map(([x,y])=>[x*.86,y-9]);poly(c,p,['#6f8750','#66814a','#5e7a48','#577445','#527041','#49673d','#456038'][i]);poly(c,[[-b.w*.65,b.y+35],[0,b.y-36],[b.w*.24,b.y+5],[b.w*.5,b.y+38],[0,b.y+27]],'#98a55c19');for(let j=0;j<7;j++){let x=-b.w*.75+j*b.w*.23;line(c,x,b.y+39+(j%3)*4,x+12,b.y+34,'#b1b97522',1.5);}}
 // Exposed base and fresh cuts.
 poly(c,[[-29,0],[-43,10],[-18,8],[0,-3],[23,8],[42,8],[29,-4]],'#735638');
 if(tree.hp<tree.maxHp){const n=(1-tree.hp/tree.maxHp)*23;poly(c,[[-24,-25],[-4+n*.4,-19],[-21+n,-9],[-25,-8]],'#e9bb76');line(c,-23,-25,-6+n*.4,-19,'#4a3024',2);line(c,-24,-7,-17+n,-10,'#f3d193',2);}
 if(tree.hit>0){c.globalAlpha=tree.hit*.65;poly(c,[[-29,0],[-21,-95],[21,-95],[31,4]],'#ffe2a0');}
 c.restore();
}
function burst(x,y,n,strength=1,leaves=false){for(let i=0;i<n;i++){const angle=rand(0,TAU),s=rand(45,210)*strength;particles.push({x,y,z:rand(10,28),vx:Math.cos(angle)*s,vy:Math.sin(angle)*s*.42,vz:rand(60,210)*strength,life:rand(.4,1.2)+(leaves?.7:0),max:1.5,size:rand(2,leaves?7:6),rot:rand(0,TAU),spin:rand(-9,9),leaf:leaves,color:leaves?['#a9b763','#83974e','#c8b96c'][i%3]:['#e5b777','#b98952','#f6d093','#8e613c'][i%4]});}}
function dust(x,y){particles.push({x,y,z:0,vx:rand(-8,8),vy:rand(-5,5),vz:8,life:.35,max:.35,size:rand(3,7),rot:0,spin:0,leaf:false,dust:true,color:'#c4ba8b'});}
function beginCharge(){initAudio();if(paused||player.state!=='idle')return;chargeHeld=true;player.state='charge';player.time=0;player.release=false;player.face=treeX>=player.x?1:-1;}
function releaseCharge(){chargeHeld=false;if(player.state==='charge')player.release=true;}
function strike(){
 player.state='swing';player.time=0;player.hit=false;sound('swing');
}
function impact(){
 const distance=Math.hypot(player.x-treeX,(player.y-treeY)*1.15);
 if(distance>111||tree.state!=='alive'){if(tree.state==='alive')floaters.push({x:player.x,y:player.y-92,text:'MAIS PERTO',life:.7,max:.7});return;}
 const p=player.power,perfect=p>=.48&&p<=.73,damage=perfect?3:p>=.4?2:1;
 tree.hp=Math.max(0,tree.hp-damage);tree.vel+=(player.x<treeX?1:-1)*(.75+damage*.35);tree.hit=1;
 shake=reduced?0:3+damage*2;freeze=reduced?0:.045+damage*.012;flash=.065;
 const dx=player.x-treeX,dy=player.y-treeY,n=Math.hypot(dx,dy)||1;player.x+=dx/n*5;player.y+=dy/n*4;
 burst(treeX+Math.sign(dx)*24,treeY-15,12+damage*8,1+damage*.15);burst(treeX,treeY-180,7,.6,true);
 rings.push({x:treeX,y:treeY-24,t:0,max:.3,size:62+damage*9});sound('hit',damage);
 floaters.push({x:treeX+Math.sign(dx)*65,y:treeY-86,text:perfect?'NO PONTO':damage===2?'FORTE':'−1',life:1,max:1,gold:perfect});
 if(perfect)perfects++;
 if(tree.hp===0){tree.state='falling';tree.t=0;tree.dir=player.x<treeX?1:-1;sound('creak');announce('Madeira!');}
}
function setPaused(value){paused=value;ui.overlay.hidden=!value;keys.clear();chargeHeld=false;player.state='idle';player.vx=player.vy=0;ui.pause.textContent=value?'▶':'Ⅱ';ui.pause.setAttribute('aria-label',value?'Continuar':'Pausar');if(audio){if(value)audio.suspend().catch(()=>{});else audio.resume().catch(()=>{});}last=performance.now();if(!value)canvas.focus();}
function toggleSound(){muted=!muted;initAudio();if(master)master.gain.setTargetAtTime(muted?0:.55,audio.currentTime,.03);ui.sound.innerHTML=muted?'♪ <span>SOM DESLIGADO</span>':'♫ <span>SOM ATIVO</span>';ui.sound.setAttribute('aria-label',muted?'Ativar som':'Desativar som');}
addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.repeat)return;if(e.code==='Escape'){setPaused(!paused);return;}if(e.code==='KeyM'){toggleSound();return;}if(e.target instanceof HTMLButtonElement)return;initAudio();if(paused)return;keys.add(e.code);if(e.code==='Space')beginCharge();});
addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='Space')releaseCharge();});
canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;canvas.focus();canvas.setPointerCapture(e.pointerId);beginCharge();});
addEventListener('pointerup',releaseCharge);addEventListener('pointercancel',releaseCharge);
addEventListener('blur',()=>setPaused(true));document.addEventListener('visibilitychange',()=>{if(document.hidden)setPaused(true);});
ui.sound.addEventListener('click',()=>{toggleSound();canvas.focus();});ui.pause.addEventListener('click',()=>setPaused(!paused));ui.resume.addEventListener('click',()=>{setPaused(false);canvas.focus();});
document.querySelectorAll('[data-key]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();initAudio();b.setPointerCapture(e.pointerId);if(!paused)keys.add(b.dataset.key);});for(const name of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(name,()=>keys.delete(b.dataset.key));});
document.querySelector('#chop').addEventListener('pointerdown',e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);beginCharge();});
function update(dt){
 elapsed+=dt;if(eventTime>0){eventTime-=dt;if(eventTime<=0)ui.event.classList.remove('show');}
 shake=Math.max(0,shake-dt*29);flash=Math.max(0,flash-dt);tree.hit=Math.max(0,tree.hit-dt*7);
 if(freeze>0){freeze-=dt;return;}
 let mx=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),my=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0);
 const len=Math.hypot(mx,my);if(len){mx/=len;my/=len;}
 const speed=player.state==='charge'?77:player.state==='swing'?35:player.state==='recover'?132:230;
 const response=1-Math.exp(-dt*24);player.vx=lerp(player.vx,mx*speed,response);player.vy=lerp(player.vy,my*speed,response);
 const left=Math.max(335,-ox/scale+32),right=Math.min(1165,(innerWidth-ox)/scale-32);
 player.x=clamp(player.x+player.vx*dt,left,right);player.y=clamp(player.y+player.vy*dt,518,780);
 const dx=player.x-treeX,dy=(player.y-treeY)*1.4,dist=Math.hypot(dx,dy);if(dist<49){const angle=dist>.01?Math.atan2(dy,dx):Math.PI;player.x=treeX+Math.cos(angle)*49;player.y=treeY+Math.sin(angle)*49/1.4;}
 player.moving=Math.hypot(player.vx,player.vy)>12;if(player.moving){player.walk+=dt*Math.hypot(player.vx,player.vy)*.065;if(player.state==='idle'&&Math.abs(player.vx)>8)player.face=Math.sign(player.vx);stepTimer-=dt;if(stepTimer<=0){stepTimer=.27;sound('step');dust(player.x,player.y);}}else stepTimer=0;
 player.time+=dt;
 if(player.state==='charge'){player.power=clamp(player.time,0,1);if(player.release&&player.time>=.17)strike();}
 else if(player.state==='swing'){if(player.time>=.085&&!player.hit){player.hit=true;impact();}if(player.time>.17){player.state='recover';player.time=0;}}
 else if(player.state==='recover'&&player.time>.23){player.state='idle';player.time=0;player.power=0;}
 tree.vel+=(-tree.angle*85-tree.vel*9)*dt;tree.angle+=tree.vel*dt;
 if(tree.state==='falling'){const prev=tree.t;tree.t+=dt;if(prev<1.18&&tree.t>=1.18){count++;ui.count.textContent=String(count).padStart(2,'0');ui.best.textContent=perfects?`${perfects} golpe${perfects>1?'s':''} no ponto.`:'Encontre o seu ritmo.';shake=reduced?0:17;sound('crash');burst(treeX+tree.dir*240,treeY,65,1.7);burst(treeX+tree.dir*160,treeY-15,35,1.5,true);rings.push({x:treeX+tree.dir*160,y:treeY,t:0,max:.7,size:220});announce(['Dê espaço ao novo.','O bosque recomeça.','Uma árvore de cada vez.'][count%3]);}if(tree.t>=2.05){tree.state='cooldown';tree.t=0;}}
 else if(tree.state==='cooldown'){tree.t+=dt;if(tree.t>=2.2){tree.state='growing';tree.t=0;tree.growth=.01;tree.hp=10;tree.angle=0;tree.vel=0;tree.cycle++;sound('grow');burst(treeX,treeY,17,.65,true);}}
 else if(tree.state==='growing'){tree.t+=dt;const t=clamp(tree.t/.9,0,1);tree.growth=1-Math.pow(1-t,3)+Math.sin(t*Math.PI)*.05;if(t===1){tree.state='alive';tree.growth=1;}}
 for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vz-=dt*(p.leaf?160:480);p.vx*=Math.exp(-dt*(p.leaf?1.2:2));p.vy*=Math.exp(-dt*2);p.rot+=p.spin*dt;if(p.z<0){p.z=0;p.vz=Math.abs(p.vz)*.22;p.vx*=.6;p.spin*=.6;}if(p.life<=0)particles.splice(i,1);}
 for(let i=rings.length-1;i>=0;i--){rings[i].t+=dt;if(rings[i].t>rings[i].max)rings.splice(i,1);}
 for(let i=floaters.length-1;i>=0;i--){floaters[i].life-=dt;floaters[i].y-=dt*24;if(floaters[i].life<=0)floaters.splice(i,1);}
 const close=Math.hypot(player.x-treeX,(player.y-treeY)*1.15)<=111;
 ui.hint.textContent=tree.state==='cooldown'?'Uma nova árvore vem aí…':tree.state==='falling'?'Abra espaço para a queda.':tree.state==='growing'?'Uma nova árvore, o mesmo ritual.':player.state==='charge'?(player.power>=.48&&player.power<=.73?'Agora. Solte o golpe.':player.power>.73?'Golpe carregado. Solte para cortar.':'Prepare o peso do machado…'):close?'Segure. Sinta o peso. Solte no dourado.':'Aproxime-se do tronco para começar.';
}
function drawPlayer(c){
 const p=player,bob=p.moving?Math.sin(p.walk*2)*2:Math.sin(elapsed*2.1)*.65;
 ellipse(c,p.x,p.y+3,23,8,'#142b2870');
 c.save();c.translate(p.x,p.y);c.scale(p.face,1);
 const step=p.moving?Math.sin(p.walk)*7:0;
 line(c,-7,-20,-8+step,0,'#263933',9);line(c,7,-20,8-step,0,'#34443b',9);line(c,-8+step,0,-2+step,0,'#1b2b29',8);line(c,8-step,0,14-step,0,'#23322c',8);
 c.translate(0,bob);
 let lean=p.state==='charge'?-5*Math.min(p.power/.5,1):p.state==='swing'?8*Math.sin(p.time/.17*Math.PI):p.state==='recover'?5*(1-p.time/.23):Math.sin(p.walk)*.8;
 c.translate(lean,-2);c.rotate(lean*.012);
 poly(c,[[-12,-48],[9,-49],[15,-22],[-12,-20],[-16,-33]],'#bb784c');poly(c,[[-12,-48],[-5,-48],[-5,-23],[-12,-20],[-16,-33]],'#855338');poly(c,[[1,-46],[9,-45],[13,-25],[2,-25]],'#d29960');
 line(c,-11,-25,12,-25,'#594932',4);ellipse(c,2,-25,2,2,'#d9b476');
 // Scarf and cap establish a readable character at small scale.
 poly(c,[[-10,-50],[-26-Math.sin(p.walk)*3,-43],[-22,-39],[-8,-45]],'#dbb867');
 ellipse(c,0,-59,10,12,'#e0b388');poly(c,[[-10,-62],[-8,-51],[0,-46],[8,-50],[10,-57],[4,-54],[-3,-55]],'#573b2c');
 ellipse(c,-1,-68,12,8,'#ca905a');poly(c,[[-13,-68],[12,-68],[15,-62],[-12,-63]],'#ddb27a');line(c,6,-58,8,-58,'#302f27',2);
 line(c,-9,-44,-13,-33,'#ad7047',8);
 // Axe rotates from low carry, through anticipation, into a broad follow-through.
 let axeAngle=.45;
 if(p.state==='charge')axeAngle=lerp(.45,-2.15,clamp(p.time/.23,0,1));
 if(p.state==='swing')axeAngle=lerp(-2.15,1.35,Math.pow(clamp(p.time/.14,0,1),.72));
 if(p.state==='recover')axeAngle=lerp(1.35,.45,clamp(p.time/.23,0,1));
 c.save();c.translate(7,-40);c.rotate(axeAngle);
 line(c,0,0,29,-8,'#e1b48a',7);line(c,15,4,47,-18,'#59422b',5);line(c,15,3,47,-19,'#c09762',2);
 poly(c,[[39,-22],[47,-25],[61,-20],[59,-6],[49,-8],[45,-16]],'#a1b5ad');poly(c,[[55,-22],[61,-20],[59,-6],[54,-7]],'#e7e9d1');line(c,41,-21,47,-19,'#314b43',3);c.restore();
 if(p.state==='swing'&&p.time<.145){c.save();c.globalAlpha=Math.sin(p.time/.145*Math.PI)*.65;c.strokeStyle='#ffdea0';c.lineWidth=5;c.beginPath();c.arc(8,-40,52,-2.1,-2.1+Math.min(3.5,p.time/.14*3.5));c.stroke();c.globalAlpha*=.4;c.lineWidth=13;c.stroke();c.restore();}
 c.restore();
 if(p.state==='charge'){
  const x=p.x-31,y=p.y-97,v=clamp(p.power,0,1);c.fillStyle='#17382cdd';c.fillRect(x-3,y-3,68,11);c.fillStyle='#536a4f';c.fillRect(x,y,62,5);c.fillStyle='#d9b16655';c.fillRect(x+62*.48,y-1,62*.25,7);c.fillStyle=v>=.48&&v<=.73?'#ffdc8a':'#cad3b1';c.fillRect(x,y,62*v,5);c.fillStyle='#fff1bf';c.fillRect(x+62*v-1,y-2,2,9);
 }
}
function draw(){
 const dpr=Math.min(devicePixelRatio||1,2);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#1c352c';ctx.fillRect(0,0,innerWidth,innerHeight);ctx.translate(ox,oy);ctx.scale(scale,scale);
 if(shake&&!reduced)ctx.translate(rand(-shake,shake)*.7,rand(-shake,shake)*.45);
 ctx.drawImage(ground,0,0);
 // Quiet floating pollen gives the still scene a little life.
 for(let i=0;i<38;i++){const x=(i*133.71+elapsed*(3+i%4))%1280+80,y=210+(i*67.3)%540+Math.sin(elapsed*.6+i)*15;ellipse(ctx,x,y,i%5===0?2:1,.8,`rgba(229,216,150,${.15+Math.sin(elapsed+i)*.12})`);}
 ellipse(ctx,treeX+22,treeY+7,110,28,'#23392848');
 // Stump persists between trees, so there is always a clear interaction anchor.
 if(tree.state!=='alive'&&tree.state!=='growing'){poly(ctx,[[treeX-27,treeY-8],[treeX+28,treeY-8],[treeX+29,treeY+7],[treeX-29,treeY+7]],'#795b38');ellipse(ctx,treeX,treeY-8,28,11,'#c79c61');ellipse(ctx,treeX,treeY-8,19,7,'#a27a46');ellipse(ctx,treeX,treeY-8,16,5,'#d9b179');ellipse(ctx,treeX,treeY-8,7,3,'#b18950');}
 const close=Math.hypot(player.x-treeX,(player.y-treeY)*1.15)<=111;
 if(tree.state==='alive'){
  ctx.save();ctx.strokeStyle=close?'#d9d19c44':'#d9d19c19';ctx.lineWidth=1;ctx.setLineDash([3,10]);ctx.beginPath();ctx.ellipse(treeX,treeY,92,35,0,0,TAU);ctx.stroke();ctx.restore();
 }
 if(player.y<treeY-3){drawPlayer(ctx);drawTree(ctx);}else{drawTree(ctx);drawPlayer(ctx);}
 for(const r of rings){const t=r.t/r.max;ctx.save();ctx.globalAlpha=(1-t)*.6;ctx.strokeStyle='#edce8d';ctx.lineWidth=2*(1-t)+.5;ctx.beginPath();ctx.ellipse(r.x,r.y,Math.max(1,r.size*t),Math.max(1,r.size*t*.38),0,0,TAU);ctx.stroke();ctx.restore();}
 for(const p of particles){ctx.save();ctx.globalAlpha=clamp(p.life/.35,0,1)*(p.dust?.2:1);ctx.translate(p.x,p.y-p.z);ctx.rotate(p.rot);ctx.fillStyle=p.color;if(p.dust)ellipse(ctx,0,0,p.size,p.size*.5,p.color);else if(p.leaf)ellipse(ctx,0,0,p.size,p.size*.38,p.color);else ctx.fillRect(-p.size/2,-p.size/3,p.size,p.size*.55);ctx.restore();}
 for(const f of floaters){ctx.save();ctx.globalAlpha=clamp(f.life*2,0,1);ctx.fillStyle=f.gold?'#ffe0a0':'#efdfb3';ctx.textAlign='center';ctx.font=f.gold?'bold 12px Segoe UI':'11px Segoe UI';ctx.fillText(f.text,f.x,f.y);ctx.restore();}
 if(tree.state==='alive'&&tree.hp<10){ctx.save();ctx.globalAlpha=.85;const x=treeX-34,y=treeY+36;for(let i=0;i<10;i++){ctx.fillStyle=i<tree.hp?'#d5bb7a':'#243d2e88';ctx.fillRect(x+i*7,y,5,3);}ctx.restore();}
 if(tree.state==='cooldown'){const t=tree.t/2.2;ctx.strokeStyle='#d9c68a66';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(treeX,treeY+3,43,17,0,-Math.PI/2,-Math.PI/2+TAU*t);ctx.stroke();ctx.font='10px Segoe UI';ctx.textAlign='center';ctx.fillStyle='#d7d0a8';ctx.fillText('O BOSQUE SE RENOVA',treeX,treeY+47);}
 if(flash>0&&!reduced){ctx.fillStyle=`rgba(255,222,159,${flash*.55})`;ctx.fillRect(0,0,W,H);}
}
function frame(now){const dt=Math.min((now-last)/1000||0,.033);last=now;if(!paused)update(dt);draw();requestAnimationFrame(frame);}
requestAnimationFrame(frame);
})();
