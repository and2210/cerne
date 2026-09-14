const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const listeners={};
const gradient={addColorStop(){}};
const ctx=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(o,k)=>o[k]??(()=>{})});
const elements=new Map();
const element=id=>{if(!elements.has(id))elements.set(id,{id,textContent:'',classList:{add(){},remove(){}},addEventListener(){},setAttribute(){},focus(){},getContext:()=>ctx});return elements.get(id);};
const sandbox={console,Math,Set,Object,HTMLButtonElement:class{},document:{querySelector:s=>element(s),getElementById:id=>element('#'+id),querySelectorAll:()=>[],createElement:()=>element('offscreen'),addEventListener(){}},matchMedia:()=>({matches:false}),innerWidth:1440,innerHeight:900,devicePixelRatio:1,addEventListener:(n,f)=>listeners[n]=f,requestAnimationFrame(){},performance:{now:()=>0},window:{}};
vm.createContext(sandbox);
let source=fs.readFileSync(require('node:path').join(__dirname,'..','game.js'),'utf8');source=source.replace(/\}\)\(\);\s*$/,`globalThis.test={player,tree,keys,update,draw,beginCharge,releaseCharge,setPaused,ui,resize,get count(){return count;}};})();`);
vm.runInContext(source,sandbox);const g=sandbox.test;
const advance=seconds=>{for(let i=0;i<Math.ceil(seconds*120);i++)g.update(1/120);};
const swing=duration=>{g.beginCharge();advance(duration);g.releaseCharge();advance(.8);};
g.draw();swing(.1);assert.equal(g.tree.hp,10,'Out-of-range attack must miss');
g.player.x=745;g.player.y=600;swing(.02);assert.equal(g.tree.hp,9,'Tap must finish anticipation and hit exactly once');
swing(.6);assert.equal(g.tree.hp,6,'Golden timing must deal three damage');
swing(.85);assert.equal(g.tree.hp,4,'Overheld strike must deal two damage');
// Walk closer after physical recoil, then finish the tree.
g.player.x=750;g.player.y=602;swing(.6);assert.equal(g.tree.hp,1);swing(.02);assert.equal(g.tree.state,'falling');
advance(.8);assert.equal(g.count,1,'Count once, on landing');g.draw();advance(1);assert.equal(g.tree.state,'cooldown');
const hp=g.tree.hp;swing(.6);assert.equal(g.tree.hp,hp,'No damage while tree is absent');
advance(3);assert.equal(g.tree.state,'alive');assert.equal(g.tree.hp,10);assert.equal(g.count,1);g.draw();
for(let cycle=0;cycle<4;cycle++){g.player.x=754;g.player.y=610;for(let j=0;j<4;j++)swing(.6);advance(5.5);assert.equal(g.tree.state,'alive');assert.equal(g.tree.hp,10);assert.equal(g.count,cycle+2);g.draw();}
g.player.x=600;g.player.y=650;g.keys.add('KeyD');advance(.5);assert(g.player.x>695,'Responsive movement');g.keys.clear();advance(.2);assert(Math.abs(g.player.vx)<3,'Movement brakes promptly');
g.keys.add('KeyD');g.beginCharge();g.setPaused(true);assert.equal(g.keys.size,0);assert.equal(g.player.state,'idle');assert.equal(g.ui.overlay.hidden,false);g.setPaused(false);assert.equal(g.ui.overlay.hidden,true);
sandbox.innerWidth=410;sandbox.innerHeight=538;g.resize();g.keys.add('KeyD');advance(8);assert(g.player.x<1120,'Portrait movement remains in the viewport');g.keys.clear();g.draw();
console.log('PASS: range, quick/charged/perfect damage, one hit per swing, five fall/regrowth cycles, no damage during cooldown, movement/braking, pause reset, portrait bounds, render smoke test.');
