import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createVikingPart } from './viking.js';

export const categories = [
  { id: 'head', name: '头部', icon: 'user-circle', en: 'HEAD' },
  { id: 'body', name: '身体', icon: 't-shirt', en: 'TORSO' },
  { id: 'arms', name: '手臂', icon: 'hand-fist', en: 'ARMS' },
  { id: 'legs', name: '腿部', icon: 'boot', en: 'LEGS' },
  { id: 'hat', name: '头饰', icon: 'crown', en: 'HEADGEAR' },
  { id: 'armor', name: '护甲', icon: 'shield-chevron', en: 'ARMOR' },
  { id: 'weapon', name: '武器', icon: 'sword', en: 'WEAPONS' },
  { id: 'shield', name: '盾牌', icon: 'shield', en: 'SHIELDS' },
];
export const catalog = {
  head: [ ['北境战士', '编织长须'], ['东方武将', '髯须怒目'], ['铁面骑士', '全覆式面甲'] ],
  body: [ ['兽皮胸甲', '北境 · 斜襟鳞裙'], ['将军战甲', '东方 · 层叠甲片'], ['重装板甲', '骑士 · 胸前纹章'] ],
  arms: [ ['符文护臂', '雕纹 · 肌肉塑形'], ['龙鳞臂甲', '层叠鳞甲'], ['骑士臂甲', '重装护手'] ],
  legs: [ ['北境战靴', '兽毛 · 铜扣'], ['武将裙甲', '鳞甲 · 护膝'], ['重装护腿', '板甲 · 战靴'] ],
  hat: [ ['断角战盔', '北境 · 双角'], ['将军冠冕', '东方 · 红缨'], ['骑士头盔', '骑士 · 羽饰'], ['不佩戴', '展示头部造型'] ],
  armor: [ ['符文肩甲', '雕纹肩甲 · 兽毛'], ['猛兽肩甲', '东方 · 兽面'], ['重装肩甲', '骑士 · 铆钉'], ['不佩戴', '轻装上阵'] ],
  weapon: [ ['维京战斧', '单刃战斧 · 浮雕'], ['长柄战戟', '东方 · 月牙刃'], ['骑士长剑', '十字剑格'], ['不装备', '空手姿态'] ],
  shield: [ ['符文圆盾', '北境 · 金属盾脐'], ['龙纹方盾', '东方 · 浮雕'], ['纹章鸢盾', '骑士 · 尖底'], ['不装备', '空手姿态'] ],
};
export const palettes = { bronze: ['#89604a', '#a8aca3', '#342f2a'], silver: ['#879398', '#c2c8c3', '#30383b'], iron: ['#414c4e', '#96794f', '#242729'] };
export const mounts = { head: [0,3.47,0], body: [0,2.40,0], arms: [0,2.40,0], legs: [0,1.04,0], hat: [0,3.83,0], armor: [0,2.91,0], weapon: [-1.37,1.90,.25], shield: [1.38,1.93,.43] };
export const separation = { head: [0,.65,0], body: [0,0,0], arms: [0,0,.85], legs: [0,-.4,0], hat: [0,1.3,0], armor: [0,.4,-.7], weapon: [-.8,0,0], shield: [.8,0,0] };

let surface;
function metalSurface() {
  if (surface) return surface;
  const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');const d=ctx.createImageData(256,256);
  let seed=92731;
  for(let i=0;i<d.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;let n=100+(seed%95);d.data[i]=d.data[i+1]=d.data[i+2]=n;d.data[i+3]=255;}
  ctx.putImageData(d,0,0);surface=new T.CanvasTexture(c);surface.wrapS=surface.wrapT=T.RepeatWrapping;surface.repeat.set(3,3);return surface;
}
function mats(palette) {
  const p=palettes[palette]||palettes.bronze;
  const metal=(color,roughness=.45)=>new T.MeshStandardMaterial({color,metalness:.88,roughness,bumpMap:metalSurface(),bumpScale:.035});
  return { main:metal(p[0]), trim:metal(p[1],.28), dark:metal(p[2],.65), leather:new T.MeshStandardMaterial({color:'#352d28',roughness:.85,bumpMap:metalSurface(),bumpScale:.02}), red:new T.MeshStandardMaterial({color:'#752d25',metalness:.35,roughness:.6}), eye:new T.MeshStandardMaterial({color:'#e0c998',metalness:.3,roughness:.25}) };
}
function mesh(g,geo,mat,p=[0,0,0],r=[0,0,0],s=[1,1,1]) { const o=new T.Mesh(geo,mat);o.position.set(...p);o.rotation.set(...r);o.scale.set(...s);o.castShadow=o.receiveShadow=true;g.add(o);return o; }
function box(g,m,w,h,d,p,r=[0,0,0],radius=.06) {return mesh(g,new RoundedBoxGeometry(w,h,d,2,radius),m,p,r);}
function ball(g,m,p,s) {return mesh(g,new T.SphereGeometry(1,24,16),m,p,[0,0,0],s);}
function cylinder(g,m,rt,rb,h,p,r=[0,0,0],n=32) {return mesh(g,new T.CylinderGeometry(rt,rb,h,n),m,p,r);}
function ring(g,m,r,t,p,rotation=[0,0,0],arc=Math.PI*2){return mesh(g,new T.TorusGeometry(r,t,8,48,arc),m,p,rotation);}
function line(g,m,points,r=.025){const c=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));return mesh(g,new T.TubeGeometry(c,32,r,8,false),m);}
function plate(g,m,points,d,p=[0,0,0],r=[0,0,0]) {const shape=new T.Shape();shape.moveTo(...points[0]);points.slice(1).forEach(v=>shape.lineTo(...v));shape.closePath();return mesh(g,new T.ExtrudeGeometry(shape,{depth:d,bevelEnabled:true,bevelSize:.035,bevelThickness:.025,bevelSegments:2,steps:1}),m,p,r);}
function studs(g,m,points,r=.038){points.forEach(p=>ball(g,m,p,[r,r,r]));}
function emblem(g,m,x,y,z,size=.27) {
  ring(g,m.trim,size,.035,[x,y,z]);ring(g,m.trim,size*.69,.018,[x,y,z+.015]);
  for(let i=0;i<6;i++){let a=i*Math.PI/3;line(g,m.trim,[[x+Math.sin(a)*size*.2,y+Math.cos(a)*size*.2,z+.03],[x+Math.sin(a+.7)*size*.55,y+Math.cos(a+.7)*size*.55,z+.045],[x+Math.sin(a)*size*.85,y+Math.cos(a)*size*.85,z+.03]],.018);}
  ball(g,m.main,[x,y,z],[size*.22,size*.22,.06]);
}
export function createPart(slot,index=0,palette='bronze') {
  if(index===0)return createVikingPart(slot,palette);
  const g=new T.Group();g.userData.slot=slot;
  if(index===3)return g;
  const m=mats(palette);
  if(slot==='head') {
    cylinder(g,m.main,.43,.42,.58,[0,0,0]);ball(g,m.main,[0,.18,0],[.44,.32,.4]);
    box(g,m.main,.26,.15,.17,[0,-.02,.4]);ball(g,m.main,[0,.02,.46],[.09,.13,.09]);
    for(const side of [-1,1]){box(g,m.dark,.21,.095,.08,[side*.19,.13,.367],[0,0,side*-.17]);box(g,m.eye,.095,.035,.035,[side*.17,.12,.414]);ball(g,m.main,[side*.45,0,0],[.075,.14,.10]);}
    if(index<2) {
      ball(g,m.dark,[0,-.29,.35],[.4,.33,.22]);
      for(let i=-3;i<=3;i++){let x=i*.105;line(g,m.dark,[[x,-.13,.46],[x*1.16,-.38,.55],[x*.62,-.65+(Math.abs(i)*.065),.41]],.065);line(g,m.trim,[[x-.02,-.2,.511],[x*1.1-.02,-.38,.603],[x*.7,-.53+Math.abs(i)*.035,.50]],.009);}
      for(const s of [-1,1])line(g,m.dark,[[0,-.03,.51],[s*.22,-.10,.57],[s*.36,-.03,.46]],.065);
      if(index===0){for(const s of [-1,1]){line(g,m.dark,[[s*.32,-.3,.38],[s*.35,-.65,.38],[s*.24,-.77,.35]],.06);cylinder(g,m.trim,.07,.07,.08,[s*.3,-.61,.39]);}}
      else {ball(g,m.dark,[0,.36,-.05],[.46,.22,.4]);line(g,m.red,[[-.43,.3,.08],[0,.33,.4],[.43,.3,.08]],.05);}
    } else {
      box(g,m.dark,.62,.32,.13,[0,-.15,.39]);for(let i=-2;i<=2;i++)box(g,m.trim,.035,.26,.045,[i*.105,-.16,.48]);box(g,m.trim,.075,.42,.075,[0,.11,.43]);
    }
  }
  if(slot==='body') {
    box(g,m.main,1.47,1.24,.82,[0,0,0],[0,0,0],.16);cylinder(g,m.dark,.22,.22,.16,[0,.69,0]);
    if(index===0) {
      for(const s of [-1,1]){ball(g,m.main,[s*.36,.2,.39],[.34,.24,.11]);box(g,m.leather,.105,1.36,.065,[s*.04,.06,.49],[0,0,s*.82]);box(g,m.red,.032,1.3,.022,[s*.04,.06,.53],[0,0,s*.82]);}
      for(let i=0;i<13;i++){let x=(i-6)*.10;ball(g,m.dark,[x,.55,-.05],[.08,.075,.42]);}
    } else if(index===1){for(let row=0;row<5;row++)for(let col=0;col<8;col++){box(g,row%2?m.main:m.trim,.155,.17,.065,[(col-3.5)*.168,.38-row*.18,.44]);}box(g,m.red,.12,1.1,.06,[0,0,.5]);}
    else{plate(g,m.trim,[[-.62,.47],[.62,.47],[.54,-.28],[0,-.48],[-.54,-.28]],.07,[0,0,.41]);emblem(g,m,0,.08,.54,.25);}
    box(g,m.leather,1.55,.21,.88,[0,-.46,0]);emblem(g,m,0,-.46,.51,.23);
    for(const s of [-1,1]){box(g,m.trim,.14,.16,.055,[s*.48,-.47,.46]);cylinder(g,m.trim,.16,.16,.1,[s*.61,.22,-.46],[Math.PI/2,0,0]);}
    for(let i=-3;i<=3;i++){const x=i*.18;plate(g,m.main,[[-.095,.15],[.095,.15],[.08,-.15],[0,-.24],[-.08,-.15]],.055,[x,-.7,.4],[0,0,-i*.075]);line(g,m.trim,[[x-.065,-.64,.485],[x,-.87,.49],[x+.065,-.64,.485]],.012);}
    box(g,m.leather,.34,.32,.16,[-.48,-.63,-.5]);box(g,m.trim,.1,.15,.03,[-.48,-.63,-.6]);
  }
  if(slot==='arms') {
    for(const s of [-1,1]){
      ball(g,m.main,[s*.94,.23,0],[.30,.37,.31]);cylinder(g,m.main,.24,.22,.5,[s*1.08,-.19,0],[0,0,s*.18]);ball(g,m.dark,[s*1.15,-.4,0],[.2,.2,.21]);
      cylinder(g,index===1?m.main:m.dark,.27,.29,.38,[s*1.21,-.56,.01],[0,0,s*.16]);
      for(let j=0;j<3;j++)cylinder(g,m.trim,.278,.278,.045,[s*1.21,-.43-j*.115,.01],[0,0,s*.16]);
      ring(g,m.main,.16,.09,[s*1.32,-.86,.14],[0,0,Math.PI*.25],Math.PI*1.62);
      if(index===1){for(let j=0;j<3;j++)plate(g,m.main,[[-.18,.12],[.18,.12],[0,-.13]],.04,[s*1.2,-.43-j*.12,.28]);}
      if(index===2)box(g,m.trim,.37,.44,.09,[s*1.18,-.52,.26]);
    }
  }
  if(slot==='legs') {
    for(const s of [-1,1]){
      box(g,m.dark,.57,.68,.57,[s*.38,.20,0]);box(g,m.main,.58,.52,.60,[s*.40,-.16,.04]);box(g,m.main,.65,.3,.83,[s*.4,-.49,.16]);box(g,m.dark,.67,.07,.84,[s*.4,-.65,.16]);
      if(index===0){for(let j=0;j<7;j++)ball(g,m.dark,[s*.40+(j-3)*.074,-.06,.34],[.055,.10,.06]);box(g,m.leather,.56,.10,.66,[s*.40,-.28,.06]);box(g,m.trim,.15,.14,.04,[s*.4,-.28,.405]);}
      else {ball(g,m.trim,[s*.4,.06,.33],[.23,.20,.09]);for(let j=0;j<3;j++)box(g,m.trim,.48,.045,.06,[s*.4,-.21-j*.11,.36]);}
    }
    if(index===1)for(let i=-2;i<=2;i++)plate(g,m.main,[[-.15,.28],[.15,.28],[.12,-.27],[0,-.34],[-.12,-.27]],.06,[i*.28,.42,.39]);
  }
  if(slot==='hat') {
    ball(g,m.dark,[0,.09,0],[.50,.43,.45]);
    if(index===0){
      for(let i=-2;i<=2;i++)line(g,m.trim,[[i*.13,-.17,.405],[i*.1,.12,.43],[i*.04,.47,.01]],.03);
      box(g,m.trim,.10,.64,.10,[0,.05,.45]);
      for(const s of [-1,1]){
        box(g,m.main,.19,.40,.29,[s*.46,-.12,.08],[0,0,s*-.1]);
        const curve=new T.CatmullRomCurve3([[s*.4,.25,0],[s*.66,.4,0],[s*.85,.65,-.01],[s*.80,.89,-.03]].map(p=>new T.Vector3(...p)));
        const geom=new T.TubeGeometry(curve,24,.14,12,false);const pos=geom.attributes.position;
        for(let i=0;i<pos.count;i++){const t=Math.floor(i/13)/24;const center=curve.getPointAt(t);const v=new T.Vector3().fromBufferAttribute(pos,i).sub(center).multiplyScalar(1-t*.7).add(center);pos.setXYZ(i,v.x,v.y,v.z);}geom.computeVertexNormals();mesh(g,geom,m.main);
        cylinder(g,m.trim,.15,.15,.07,[s*.57,.36,0],[0,0,-s*.9]);
      }
    } else if(index===1){cylinder(g,m.main,.34,.47,.13,[0,.22,0]);emblem(g,m,0,.2,.47,.15);line(g,m.red,[[0,.28,0],[0,.75,0],[.11,1,-.1],[.32,1.01,-.25]],.13);for(const s of [-1,1])line(g,m.dark,[[s*.35,.03,.04],[s*.77,.23,.08],[s*.87,.63,.08]],.055);}
    else{box(g,m.trim,.07,.72,.48,[0,.12,.08]);for(let i=0;i<7;i++)ball(g,m.red,[0,.51+i*.04,-.10-i*.075],[.075,.2,.07]);for(const s of [-1,1])box(g,m.main,.22,.49,.31,[s*.43,-.18,.08]);}
  }
  if(slot==='armor') {
    for(const s of [-1,1]){
      const shoulder=new T.Group();g.add(shoulder);shoulder.position.set(s*.89,0,0);shoulder.rotation.z=s*-.3;
      ball(shoulder,m.dark,[s*.07,-.1,0],[.46,.33,.43]);
      for(let j=0;j<3;j++){box(shoulder,m.trim,.65+j*.045,.12,.73,[s*j*.05,-j*.15,.01],[0,0,s*-.06]);}
      if(index===0){emblem(shoulder,m,0,-.09,.42,.24);for(let j=0;j<5;j++){let a=j*Math.PI/4;studs(shoulder,m.main,[[Math.cos(a)*.3,Math.sin(a)*.24-.1,.43]]);}}
      if(index===1){ball(shoulder,m.main,[0,-.08,.40],[.29,.28,.13]);for(const q of [-1,1]){ball(shoulder,m.dark,[q*.13,.01,.51],[.07,.05,.045]);line(shoulder,m.trim,[[q*.19,-.12,.53],[q*.21,-.31,.53],[q*.10,-.26,.56]],.033);}ball(shoulder,m.trim,[0,-.1,.54],[.075,.055,.035]);}
      if(index===2){for(let j=-1;j<=1;j++)cylinder(shoulder,m.trim,.015,.09,.25,[j*.19,.23,0]);studs(shoulder,m.main,[[-.22,-.12,.4],[0,-.12,.4],[.22,-.12,.4]]);}
    }
  }
  if(slot==='weapon') {
    cylinder(g,m.leather,.055,.06,2.70,[0,.04,0]);cylinder(g,m.trim,.085,.085,.13,[0,-1.26,0]);
    for(let i=0;i<9;i++)cylinder(g,m.main,.072,.072,.037,[0,-.26+i*.065,0]);
    if(index===0){
      for(const s of [-1,1]){plate(g,m.trim,[[0,.27],[s*.25,.40],[s*.63,.47],[s*.50,.18],[s*.46,-.18],[s*.66,-.38],[s*.24,-.34],[0,-.21]],.13,[0,1.07,-.07]);line(g,m.dark,[[s*.12,1.28,.09],[s*.38,1.35,.09],[s*.35,1.08,.09],[s*.40,.84,.09],[s*.16,.88,.09]],.025);}
      cylinder(g,m.main,.10,.10,.62,[0,1.11,0]);
    } else if(index===1){plate(g,m.trim,[[-.075,-.2],[.075,-.2],[.16,.78],[.03,1.10],[-.06,.7]],.07,[0,1,-.035]);plate(g,m.main,[[.08,.07],[.47,.22],[.38,.51],[.47,.69],[.1,.56]],.08,[0,1,0]);}
    else {cylinder(g,m.leather,.06,.06,.43,[0,0,0]);box(g,m.trim,.67,.11,.18,[0,.24,0]);plate(g,m.trim,[[-.095,0],[.095,0],[.095,1.62],[0,1.9],[-.095,1.62]],.06,[0,.29,-.03]);line(g,m.main,[[0,.39,.065],[0,1.85,.065]],.012);ball(g,m.main,[0,-.28,0],[.115,.115,.08]);}
  }
  if(slot==='shield') {
    if(index===0){
      cylinder(g,m.leather,.62,.62,.12,[0,0,0],[Math.PI/2,0,0]);ring(g,m.trim,.61,.045,[0,0,.085]);ring(g,m.main,.51,.025,[0,0,.087]);ball(g,m.trim,[0,0,.13],[.19,.19,.13]);ring(g,m.dark,.24,.022,[0,0,.08]);
      for(let i=0;i<16;i++){let a=i*Math.PI/8;studs(g,m.trim,[[Math.sin(a)*.57,Math.cos(a)*.57,.11]],.025);let x=Math.sin(a)*.38,y=Math.cos(a)*.38;const o=box(g,m.main,.025,.16,.025,[x,y,.084],[0,0,-a]);line(g,m.trim,[[x,y,.095],[x+Math.cos(a)*.075,y-Math.sin(a)*.075,.095]],.016);}
      for(let i=-2;i<=2;i++)line(g,m.main,[[i*.17,-Math.sqrt(.49**2-(i*.17)**2),.072],[i*.17,Math.sqrt(.49**2-(i*.17)**2),.072]],.008);
    }else if(index===1){box(g,m.red,.87,1.32,.12,[0,0,0]);box(g,m.trim,.93,.07,.15,[0,.64,.01]);box(g,m.trim,.93,.07,.15,[0,-.64,.01]);for(const s of [-1,1])box(g,m.trim,.055,1.32,.15,[s*.43,0,.01]);emblem(g,m,0,0,.12,.31);for(let i=0;i<4;i++)line(g,m.main,[[-.32,.51-i*.33,.1],[0,.43-i*.30,.1],[.32,.51-i*.33,.1]],.015);}
    else {plate(g,m.trim,[[-.48,.57],[.48,.57],[.39,-.22],[0,-.70],[-.39,-.22]],.10,[0,0,-.05]);plate(g,m.dark,[[-.39,.48],[.39,.48],[.30,-.18],[0,-.55],[-.30,-.18]],.03,[0,0,.08]);box(g,m.main,.07,.83,.06,[0,.06,.14]);box(g,m.main,.62,.07,.06,[0,.16,.14]);emblem(g,m,0,.16,.19,.13);}
    box(g,m.leather,.30,.15,.10,[0,0,-.13]);
  }
  g.traverse(o=>{o.userData.slot=slot;});return g;
}
export const presets = {
  viking: { name: '北境守卫', head:0,body:0,arms:0,legs:0,hat:0,armor:0,weapon:0,shield:0,finish:'bronze' },
  general: { name: '东方战将',head:1,body:1,arms:1,legs:1,hat:1,armor:1,weapon:1,shield:1,finish:'bronze' },
  knight: { name: '铁誓骑士',head:2,body:2,arms:2,legs:2,hat:2,armor:2,weapon:2,shield:2,finish:'iron' },
};
