import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Sculptural interpretation of the supplied disassembled figure, in the existing slot coordinates.
// Fine relief is real geometry; surfaces share small deterministic textures, generated once.
let textures;
function surfaces() {
  if (textures) return textures;
  const size=256, make=()=>{const c=document.createElement('canvas');c.width=c.height=size;return c;};
  const color=make(),height=make(),rough=make();
  const data=[color,height,rough].map(c=>c.getContext('2d').createImageData(size,size));
  let seed=813;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const noise=random(),broad=(Math.sin(x*.093+Math.cos(y*.075)*2)+Math.sin(y*.15-x*.043))*.5;
    const pit=noise>.965, tone=pit?100:217+broad*14+noise*20;
    const values=[tone,pit?30:115+noise*30+broad*12,pit?240:155+noise*65+broad*12];
    for(let j=0;j<3;j++){const p=(y*size+x)*4;data[j].data[p]=data[j].data[p+1]=data[j].data[p+2]=values[j];data[j].data[p+3]=255;}
  }
  [color,height,rough].forEach((c,i)=>c.getContext('2d').putImageData(data[i],0,0));
  for(let i=0;i<90;i++){
    const x=random()*size,y=random()*size,length=2+random()*17;
    for(const [c,stroke] of [[color,'rgba(253,250,238,.13)'],[height,'rgba(35,35,35,.25)'],[rough,'rgba(245,245,245,.25)']]){
      const ctx=c.getContext('2d');ctx.strokeStyle=stroke;ctx.lineWidth=.55;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+length,y+length*.17);ctx.stroke();
    }
  }
  textures=[color,height,rough].map(c=>{const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(2,2);return t;});
  textures[0].colorSpace=T.SRGBColorSpace;return textures;
}
function materials(finish) {
  const [map,bumpMap,roughnessMap]=surfaces();
  const colors={bronze:['#9c7950','#9a9e93','#b99a60','#8d4937'],silver:['#8e9b9e','#c4c9c1','#999d8c','#736b61'],iron:['#49514e','#9b967e','#a08a58','#644b3b']}[finish]||['#9c7950','#9a9e93','#b99a60','#8d4937'];
  const metal=(color,roughness=.57,bumpScale=.012)=>new T.MeshStandardMaterial({color,metalness:.92,roughness,map,bumpMap,roughnessMap,bumpScale});
  return { bronze:metal(colors[0]),silver:metal(colors[1],.48),gold:metal(colors[2],.43),copper:metal(colors[3],.64),edge:metal('#bbc0b3',.40,.006),recess:metal('#282d29',.86,.025),hair:metal('#242722',.83,.014),hairEdge:metal('#4d5147',.76,.008),leather:new T.MeshStandardMaterial({color:'#432c20',roughness:.95,map,bumpMap,bumpScale:.02}),eye:new T.MeshStandardMaterial({color:'#c7b98e',roughness:.65,metalness:.3}) };
}
const v=p=>new T.Vector3(...p);
function mesh(g,geo,mat,pos=[0,0,0],rot=[0,0,0],scale=[1,1,1]){
  const o=new T.Mesh(geo,mat);o.position.set(...pos);o.rotation.set(...rot);o.scale.set(...scale);g.add(o);return o;
}
function box(g,m,w,h,d,p,r=[0,0,0],bevel=.035){return mesh(g,new RoundedBoxGeometry(w,h,d,2,bevel),m,p,r);}
function ball(g,m,p,s){return mesh(g,new T.SphereGeometry(1,16,12),m,p,[0,0,0],s);}
function cyl(g,m,a,b,h,p,r=[0,0,0],segments=24){return mesh(g,new T.CylinderGeometry(a,b,h,segments),m,p,r);}
function ring(g,m,r,t,p,rotation=[0,0,0],arc=Math.PI*2){return mesh(g,new T.TorusGeometry(r,t,6,40,arc),m,p,rotation);}
function group(g,p=[0,0,0],rot=[0,0,0]){const o=new T.Group();o.position.set(...p);o.rotation.set(...rot);g.add(o);return o;}
function stroke(g,m,points,r=.016,steps=16){return mesh(g,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(v)),steps,r,6,false),m);}
function strand(g,m,points,r=.08,end=.004,steps=18,sides=8,flutes=0){
  const curve=new T.CatmullRomCurve3(points.map(v)), frames=curve.computeFrenetFrames(steps,false),vertices=[],uv=[],indices=[];
  for(let i=0;i<=steps;i++){
    const t=i/steps,center=curve.getPointAt(t),radius=(r*(1-t)+end*t)*(1+.13*Math.sin(t*Math.PI));
    for(let j=0;j<=sides;j++){
      const a=j/sides*Math.PI*2,rr=radius*(1+flutes*Math.cos(a*4+t*4));
      const p=center.clone().addScaledVector(frames.normals[i],Math.cos(a)*rr).addScaledVector(frames.binormals[i],Math.sin(a)*rr);
      vertices.push(p.x,p.y,p.z);uv.push(j/sides,t);
      if(i<steps&&j<sides){const k=i*(sides+1)+j;indices.push(k,k+1,k+sides+1,k+1,k+sides+2,k+sides+1);}
    }
  }
  // Close both ends; horns and hair must remain solid in the exploded and rear views.
  for(const i of [0,steps]){const p=curve.getPointAt(i/steps),c=vertices.length/3;vertices.push(p.x,p.y,p.z);uv.push(.5,i/steps);for(let j=0;j<sides;j++){const k=i*(sides+1)+j;indices.push(...(i===0?[c,k+1,k]:[c,k,k+1]));}}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();return mesh(g,geo,m);
}
function plate(g,m,points,depth=.04,p=[0,0,0],r=[0,0,0],bevel=.016){
  const shape=new T.Shape();shape.moveTo(...points[0]);points.slice(1).forEach(x=>shape.lineTo(...x));shape.closePath();
  return mesh(g,new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:2,steps:1}),m,p,r);
}
function relief(g,m,outline,center,height=.10){
  const pos=[],uv=[],indices=[],rings=5,n=outline.length;
  for(let k=0;k<=rings;k++){const t=k/rings;for(const [x,y,z] of outline){pos.push(center[0]+(x-center[0])*t,center[1]+(y-center[1])*t,(z??center[2])+height*Math.cos(t*Math.PI/2));uv.push(x,y);}}
  for(let k=0;k<rings;k++)for(let j=0;j<n;j++){const a=k*n+j,b=k*n+(j+1)%n;indices.push(a,a+n,b,b,a+n,b+n);}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
  // Outlines can be mirrored; correct winding for the front-facing relief.
  const normal=geo.attributes.normal;if(normal.getZ(n*2)<0){for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];geo.setIndex(indices);geo.computeVertexNormals();}
  return mesh(g,geo,m);
}
function loft(g,m,sections,steps=40,power=.78){
  const pos=[],uv=[],indices=[];
  sections.forEach(([y,w,d,z=0],row)=>{for(let i=0;i<=steps;i++){const a=i/steps*Math.PI*2,s=Math.sin(a),c=Math.cos(a);pos.push(Math.sign(s)*Math.abs(s)**power*w,y,z+Math.sign(c)*Math.abs(c)**power*d);uv.push(i/steps,row/(sections.length-1));if(row<sections.length-1&&i<steps){const q=row*(steps+1)+i;indices.push(q,q+1,q+steps+1,q+1,q+steps+2,q+steps+1);}}});
  // Separate cap vertices keep the attachment faces flat when parts are disassembled.
  for(const row of [0,sections.length-1]){
    const [y,w,d,z=0]=sections[row],center=pos.length/3;pos.push(0,y,z);uv.push(.5,.5);
    for(let i=0;i<=steps;i++){const q=(row*(steps+1)+i)*3;pos.push(...pos.slice(q,q+3));uv.push(.5+pos[q]/(2*w),.5+(pos[q+2]-z)/(2*d));}
    for(let i=0;i<steps;i++){const a=center+1+i,b=a+1;indices.push(...(row===0?[center,b,a]:[center,a,b]));}
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();return mesh(g,geo,m);
}
function rivet(g,m,p,r=.025){ball(g,m,p,[r,r,r*.58]);}
function border(g,m,points,r=.016){stroke(g,m,[...points,points[0]],r,Math.max(16,points.length*3));}
function knot(g,m,p=[0,0,0],radius=.20){
  const o=group(g,p);cyl(o,m.recess,radius,radius,.045,[0,0,0],[Math.PI/2,0,0]);ring(o,m.silver,radius,.023,[0,0,.034]);ring(o,m.edge,radius*.83,.009,[0,0,.043]);
  for(let arm=0;arm<3;arm++){
    const points=[];for(let j=0;j<=36;j++){const t=j/36*Math.PI*2,a=t+arm*Math.PI*2/3,r=radius*(.49+.23*Math.cos(t*2));points.push([Math.sin(a)*r,Math.cos(a)*r,.05+.012*Math.sin(t*3)]);}stroke(o,m.silver,points,.021,36);
  }
  rivet(o,m.gold,[0,0,.075],.032);return o;
}
function fur(g,m,center,width,height,count=12,front=true){
  for(let i=0;i<count;i++){
    const t=count===1?.5:i/(count-1),x=center[0]+(t-.5)*width,y=center[1]-.045*Math.cos(t*9),z=center[2];
    const sway=.04*Math.sin(i*2.7),length=height*(.75+.25*Math.sin(i*2.1)**2);
    const points=[[x,y,z],[x+sway,y-length*.33,z+(front?.06:-.06)],[x+sway*.4,y-length*.78,z+(front?.03:-.03)],[x+.035*Math.sin(i),y-length,z]];
    strand(g,m.silver,points,.045,.002,10,6,.1);
    stroke(g,m.recess,points.slice(0,3).map(p=>[p[0]-.009,p[1],p[2]+(front?.039:-.039)]),.006,10);
  }
}

function head(g,m){
  loft(g,m.bronze,[[-.32,.29,.29],[-.24,.38,.34],[-.06,.44,.37],[.16,.45,.36],[.30,.39,.32],[.38,.26,.25],[.40,.001,.001]],32,.65);
  for(const s of [-1,1]){
    ball(g,m.bronze,[s*.445,-.015,-.01],[.07,.13,.09]);
    plate(g,m.recess,[[s*.07,.075],[s*.37,.18],[s*.34,.04],[s*.17,-.005]],.016,[0,0,.361]);
    ball(g,m.eye,[s*.227,.075,.393],[.092,.033,.034]);ball(g,m.recess,[s*.205,.074,.425],[.026,.030,.014]);
    stroke(g,m.bronze,[[s*.07,.09,.421],[s*.20,.165,.43],[s*.37,.20,.37]],.052,12);
    stroke(g,m.recess,[[s*.095,.16,.41],[s*.22,.23,.39],[s*.34,.25,.35]],.010,12);
    relief(g,m.bronze,[[s*.10,-.09,.40],[s*.23,-.03,.40],[s*.39,-.025,.35],[s*.35,-.18,.35],[s*.20,-.25,.38]],[s*.25,-.12,.40],.065);
    stroke(g,m.recess,[[s*.12,-.15,.46],[s*.20,-.22,.45],[s*.31,-.24,.41]],.011);
    stroke(g,m.bronze,[[s*.09,.19,.39],[s*.18,.27,.35]],.018);
  }
  relief(g,m.bronze,[[-.045,.19,.40],[.045,.19,.40],[.075,-.06,.49],[.13,-.12,.46],[0,-.15,.52],[-.13,-.12,.46],[-.075,-.06,.49]],[0,-.02,.49],.08);
  for(const s of [-1,1])ball(g,m.recess,[s*.07,-.12,.51],[.033,.018,.014]);
  // Layered, tapered locks with braided sideburns; no smooth sausage-shaped beard.
  ball(g,m.hair,[0,-.31,.35],[.37,.32,.16]);
  for(let row=0;row<3;row++)for(let i=-3;i<=3;i++){
    const x=i*(.091-row*.013),y=-.16-row*.155,z=.46+row*.011;
    const points=[[x,y,z],[x+.03*Math.sin(i+row),y-.105,z+.065],[x*.82,y-.24,z+.028],[x*.68,y-.32,z-.015]];
    strand(g,m.hair,points,.072-row*.007,.006,13,8,.13);
    for(const dx of [-.025,.012])stroke(g,m.hairEdge,points.slice(0,3).map((p,j)=>[p[0]+dx,p[1],p[2]+.045-j*.008]),.005,12);
  }
  for(const s of [-1,1]){
    const mustache=[[s*.015,-.16,.57],[s*.12,-.14,.59],[s*.27,-.22,.58],[s*.34,-.15,.48]];
    strand(g,m.hair,mustache,.065,.013,18,8,.1);
    stroke(g,m.hairEdge,mustache.map(p=>[p[0],p[1]+.018,p[2]+.035]),.006,16);
    for(let j=0;j<2;j++){
      const points=[];for(let i=0;i<=18;i++){const t=i/18;points.push([s*(.31-.09*t)+Math.sin(t*Math.PI*5+j*Math.PI)*.025,-.30-t*.43,.40+Math.cos(t*Math.PI*5+j*Math.PI)*.027]);}strand(g,m.hair,points,.031,.015,24,6);
    }
    cyl(g,m.gold,.046,.043,.065,[s*.235,-.68,.4]);strand(g,m.hair,[[s*.235,-.71,.4],[s*.22,-.78,.42],[s*.15,-.83,.39]],.045,.003,10,6);
  }
  cyl(g,m.gold,.047,.04,.07,[0,-.81,.46]);strand(g,m.hair,[[0,-.83,.46],[.025,-.91,.44],[0,-.96,.39]],.055,.003,10,7);
  // Rear hair cap and sculpted nape are visible when the headgear is removed.
  ball(g,m.hair,[0,.04,-.27],[.36,.30,.13]);
  for(let i=-5;i<=5;i++)strand(g,m.hair,[[i*.063,.31,-.23],[i*.073,.03,-.38],[i*.067,-.31,-.33]],.055,.014,12,7,.1);
}

function helmet(g,m){
  loft(g,m.silver,[[-.18,.50,.40],[-.08,.52,.43],[.12,.47,.40],[.29,.36,.32],[.43,.16,.18],[.48,.003,.008]],40,.83);
  // Dark inlaid seams and raised forged ridges follow the steel dome.
  for(const a of [-1.25,-.65,0,.65,1.25,Math.PI]){
    const path=[[-.17,.51,.42],[.08,.49,.40],[.29,.36,.32],[.46,.09,.10]].map(([y,w,d])=>[Math.sin(a)*w,y,Math.cos(a)*d]);
    stroke(g,m.recess,path,.027,18);stroke(g,m.edge,path.map(p=>[p[0]+.012,p[1],p[2]+.012]),.013,18);
  }
  for(const s of [-1,1]){
    plate(g,m.silver,[[s*.04,-.07],[s*.17,-.10],[s*.36,.005],[s*.49,-.05],[s*.44,-.20],[s*.21,-.16],[s*.07,-.24]],.055,[0,0,.40],[0,0,0],.014);
    stroke(g,m.edge,[[s*.045,-.07,.47],[s*.17,-.10,.47],[s*.35,0,.43],[s*.48,-.05,.40]],.015);
    const cheek=group(g,[s*.46,-.19,.03],[0,s*.19,s*-.08]);
    plate(cheek,m.silver,[[-.105,.12],[.105,.12],[.11,-.28],[-.10,-.31]],.11,[-.03,0,0],[0,0,0],.025);
    stroke(cheek,m.edge,[[-.10,.09,.13],[-.08,-.24,.14],[.05,-.25,.14]],.016);
    for(let j=0;j<3;j++)rivet(cheek,m.gold,[.07,.02-j*.10,.14],.018);
    const horn=group(g,[s*.40,.22,-.035],[0,0,-s*.23]);
    cyl(horn,m.recess,.17,.18,.10,[s*.035,.015,0],[0,0,-s*.85]);
    const end=s===1?.57:.75;
    strand(horn,m.bronze,[[0,0,0],[s*.22,.10,.01],[s*.31,.29,.015],[s*.27,end,0]],.19,s===1?.105:.06,24,12,.025);
    const band=group(horn,[s*.13,.065,.004],[0,0,-s*.85]);cyl(band,m.gold,.187,.19,.07,[0,0,0]);
    for(let j=0;j<8;j++){const a=j/8*Math.PI*2;rivet(band,m.recess,[Math.sin(a)*.187,.01,Math.cos(a)*.187],.018);}
    if(s===1){
      // Broad broken end, an inset dark core and irregular chips.
      cyl(horn,m.recess,.069,.075,.008,[s*.27,end+.004,0],[0,0,s*.08],11);
      for(let j=0;j<5;j++){const a=j/5*Math.PI*2;plate(horn,m.gold,[[-.025,0],[.02,0],[.01,.05+j*.004]],.018,[s*.27+Math.cos(a)*.08,end-.014,Math.sin(a)*.08],[0,a,0],.003);}
    }
    stroke(horn,m.recess,[[s*.23,.19,.16],[s*.29,.26,.14],[s*.30,.32,.10]],.010,10);
    for(let j=0;j<5;j++)rivet(horn,m.recess,[s*(.16+.02*j),.11+j*.08,.15-j*.017],.011);
  }
  plate(g,m.recess,[[-.066,.45],[.066,.45],[.085,-.33],[0,-.46],[-.085,-.33]],.028,[0,0,.44]);
  plate(g,m.silver,[[-.039,.44],[.039,.44],[.055,-.31],[0,-.41],[-.055,-.31]],.038,[0,0,.474]);
  stroke(g,m.edge,[[0,-.39,.535],[0,.03,.535],[0,.40,.51]],.014,18);
  for(let j=0;j<5;j++)rivet(g,m.gold,[-.035,.30-j*.12,.522],.013);
}

function torso(g,m){
  loft(g,m.bronze,[[-.59,.56,.32],[-.48,.62,.37],[-.24,.69,.40],[.02,.72,.42],[.32,.77,.39],[.52,.73,.32],[.61,.40,.24],[.64,.15,.17]],40,.62);
  cyl(g,m.recess,.20,.20,.14,[0,.68,0]);
  for(const s of [-1,1]){
    relief(g,m.bronze,[[s*.04,.40,.41],[s*.31,.48,.39],[s*.64,.37,.37],[s*.67,.05,.40],[s*.35,-.04,.43],[s*.06,.06,.44]],[s*.34,.21,.43],.10);
    stroke(g,m.recess,[[s*.08,.035,.45],[s*.32,-.06,.44],[s*.58,.01,.43]],.009);
    stroke(g,m.gold,[[s*.07,.43,.43],[s*.33,.47,.43],[s*.60,.36,.40]],.013);
    relief(g,m.bronze,[[s*.07,-.1,.42],[s*.35,-.12,.43],[s*.38,-.37,.39],[s*.12,-.42,.39]],[s*.22,-.24,.42],.028);
    stroke(g,m.recess,[[s*.61,-.04,.40],[s*.53,-.22,.42],[s*.49,-.36,.40]],.009);
  }
  // Broad diagonal copper leather strap; its edging and fasteners sit on the torso surface.
  const strap=[[-.65,-.28,.43],[-.32,-.01,.54],[.13,.27,.54],[.64,.56,.33]];
  const strip=group(g);for(let i=0;i<strap.length-1;i++){
    const a=v(strap[i]),b=v(strap[i+1]),mid=a.clone().add(b).multiplyScalar(.5);const o=box(strip,m.copper,.15,a.distanceTo(b)+.025,.055,mid.toArray());o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.sub(a).normalize());
  }
  for(const side of [-1,1])stroke(g,m.gold,strap.map(p=>[p[0]-side*.038,p[1]+side*.053,p[2]+.036]),.011,24);
  for(let i=0;i<7;i++){const t=i/6;rivet(g,m.recess,[-.54+t*1.07,-.18+t*.64,.59-Math.abs(t-.5)*.20],.016);}
  ring(g,m.gold,.12,.024,[-.25,-.015,.61]);ball(g,m.copper,[-.25,-.015,.60],[.105,.105,.035]);
  const belt=loft(g,m.copper,[[-.61,.68,.41],[-.44,.68,.41]],40,.66);belt.material.side=T.DoubleSide;
  for(const y of [-.44,-.59]){const points=[];for(let i=0;i<=48;i++){const a=i/48*Math.PI*2;points.push([Math.sign(Math.sin(a))*Math.abs(Math.sin(a))**.66*.69,y,Math.sign(Math.cos(a))*Math.abs(Math.cos(a))**.66*.42]);}stroke(g,m.gold,points,.013,48);}
  knot(g,m,[0,-.52,.48],.27);
  for(const s of [-1,1]){
    for(let i=0;i<2;i++)box(g,m.gold,.10,.15,.06,[s*(.38+i*.16),-.52,.425]);
    const skirt=group(g,[s*.48,-.85,.0],[0,0,s*.12]);
    plate(skirt,m.bronze,[[-.24,.22],[.24,.23],[.31,-.35],[-.26,-.36]],.065,[0,0,.32],[0,s*.14,0],.025);
    border(skirt,m.gold,[[-.23,.22,.41],[.24,.22,.41],[.31,-.35,.41],[-.26,-.36,.41]],.022);
    for(let k=-2;k<=2;k++){
      stroke(skirt,m.recess,[[-.20+k*.06,.18,.403],[.14+k*.06,-.31,.415]],.009,10);
      stroke(skirt,m.recess,[[.18-k*.06,.18,.405],[-.15-k*.06,-.31,.415]],.009,10);
    }
    fur(skirt,m,[0,-.34,.37],.62,.13,11);
    const sidePanel=group(g,[s*.62,-.84,-.12],[0,s*Math.PI/2,0]);
    plate(sidePanel,m.bronze,[[-.22,.22],[.22,.22],[.26,-.27],[-.24,-.29]],.04,[0,0,0]);fur(sidePanel,m,[0,-.26,.05],.50,.14,9);
  }
  // Overlapping convex scales down the front, with black recesses and worn silver edges.
  for(let row=0;row<5;row++)for(let col=0;col<3;col++){
    const x=(col-1)*.15+(row%2?.035:0),y=-.71-row*.145,z=.46+row*.018;
    const shape=[[-.082,.08],[.082,.08],[.075,-.035],[0,-.115],[-.075,-.035]];
    plate(g,m.recess,shape,.025,[x,y,z]);
    relief(g,m.silver,shape.map(([a,b])=>[x+a*.86,y+b*.86,z+.035]),[x,y,z+.035],.038);
    stroke(g,m.edge,[[x-.065,y-.025,z+.045],[x,y-.098,z+.047],[x+.065,y-.025,z+.045]],.008,10);
  }
  for(const [x,y,z] of [[-.44,-.70,.47],[.61,-.70,.37]]){
    box(g,m.copper,.12,.22,.045,[x,y+.05,z]);ring(g,m.gold,.072,.018,[x,y-.075,z+.04]);
    ring(g,m.recess,.10,.022,[x+.025,y-.22,z+.04],[0,.5,.2]);
  }
  // Rear pouch, cross strap, and hanging horn remain visible in a full turn.
  box(g,m.copper,.40,.35,.13,[-.37,-.70,-.44],[0,0,.09],.055);
  box(g,m.leather,.37,.10,.07,[-.37,-.59,-.53]);box(g,m.gold,.10,.13,.03,[-.37,-.65,-.57]);
  stroke(g,m.copper,[[-.60,-.43,-.32],[0,.03,-.46],[.56,.53,-.27]],.063,20);
  const horn=group(g,[.62,-.79,.34],[0,.2,-.38]);strand(horn,m.bronze,[[0,0,0],[.08,-.17,0],[.06,-.34,0],[-.09,-.43,.03]],.09,.009,18,10);ring(horn,m.gold,.093,.015,[0,0,0],[Math.PI/2,0,0]);cyl(horn,m.recess,.068,.068,.005,[0,.008,0]);
  ring(g,m.silver,.10,.024,[0,-.82,.58],[0,0,-.2],Math.PI*1.8);
}

function arms(g,m){
  for(const s of [-1,1]){
    const upper=group(g,[s*.96,.20,0],[0,0,s*.20]);
    loft(upper,m.bronze,[[-.39,.17,.19],[-.30,.22,.25],[-.11,.28,.29],[.10,.28,.28],[.28,.18,.19],[.31,.02,.02]],24,.84);
    relief(upper,m.bronze,[[-.16,.12,.23],[.13,.13,.23],[.19,-.14,.25],[.05,-.29,.23],[-.16,-.22,.24]],[0,-.07,.27],.06);
    stroke(upper,m.recess,[[-.15,-.22,.25],[0,-.30,.26],[.15,-.22,.25]],.010);
    ball(g,m.bronze,[s*1.10,-.25,.015],[.22,.21,.25]);
    const fore=group(g,[s*1.18,-.47,.015],[0,0,s*.16]);
    loft(fore,m.bronze,[[-.35,.17,.18],[-.20,.23,.23],[.12,.25,.25],[.20,.20,.21]],24,.85);
    cyl(fore,m.recess,.25,.265,.33,[0,-.045,0]);
    for(const y of [-.205,.12]){cyl(fore,m.silver,.263,.263,.045,[0,y,0]);ring(fore,m.edge,.262,.010,[0,y+.022,0],[Math.PI/2,0,0]);}
    plate(fore,m.recess,[[-.22,.12],[.22,.12],[.18,-.21],[-.18,-.21]],.025,[0,0,.23]);
    const rune=[[-.20,.09,.285],[-.11,-.14,.29],[.12,-.14,.29],[.19,.07,.285],[-.08,.03,.29],[.07,-.12,.30]];
    stroke(fore,m.silver,rune,.026,24);stroke(fore,m.edge,[[-.19,.11,.29],[.20,.11,.29]],.012);
    for(const x of [-.17,.17])rivet(fore,m.gold,[x,-.12,.29],.021);
    const hand=group(g,[s*1.30,-.86,.10],[0,0,s*-.12]);
    ring(hand,m.bronze,.14,.075,[0,0,.02],[0,0,Math.PI*.2],Math.PI*1.62);
    ring(hand,m.gold,.145,.014,[0,0,.084],[0,0,Math.PI*.2],Math.PI*1.62);
    box(hand,m.bronze,.22,.11,.20,[0,.14,-.045],[0,0,0],.04);
  }
}

function boots(g,m){
  for(const s of [-1,1]){
    box(g,m.leather,.52,.66,.50,[s*.36,.27,-.025],[0,0,0],.07);
    const o=group(g,[s*.39,-.16,.015]);
    loft(o,m.bronze,[[-.35,.28,.30,.08],[-.20,.28,.26],[.05,.27,.25],[.28,.30,.28],[.36,.27,.26]],28,.75);
    const toe=box(o,m.bronze,.59,.29,.80,[0,-.34,.15],[0,0,0],.10);toe.rotation.x=.025;
    box(o,m.recess,.62,.08,.82,[0,-.46,.15],[0,0,0],.035);
    box(o,m.gold,.61,.035,.80,[0,-.405,.15],[0,0,0],.014);
    plate(o,m.bronze,[[-.24,.29],[-.11,.32],[0,.24],[.11,.32],[.24,.29],[.18,-.01],[-.18,-.01]],.04,[0,0,.25]);
    stroke(o,m.gold,[[-.25,.29,.31],[-.12,.32,.32],[0,.24,.33],[.12,.32,.32],[.25,.29,.31]],.019);
    for(let i=-1;i<=1;i++){
      const x=i*.145;ring(o,m.gold,.046,.012,[x,.09,.32],[0,0,Math.PI/4],Math.PI*2);rivet(o,m.recess,[x,.09,.324],.015);
    }
    fur(o,m,[0,-.08,.28],.52,.15,10);
    stroke(o,m.gold,[[-.24,-.31,.45],[-.17,-.25,.52],[.17,-.25,.52],[.24,-.31,.45]],.018);
    for(let i=-2;i<=2;i++)stroke(o,m.recess,[[i*.09,-.32,.55],[i*.09,-.39,.56]],.006,6);
    box(o,m.copper,.13,.27,.035,[0,.03,-.29]);rivet(o,m.gold,[0,-.02,-.32],.023);
  }
}

function shoulderArmor(g,m){
  // Silver pelt, asymmetrical: plate on the left and long layered fur on the right.
  const back=group(g,[0,-.13,-.09]);
  for(let row=0;row<3;row++)fur(back,m,[0,.14-row*.15,-.31-row*.015],1.42-row*.18,.32,17-row*2,false);
  for(const s of [-1,1]){
    const shoulder=group(g,[s*.87,-.05,0],[0,0,s*-.28]);
    ball(shoulder,m.silver,[s*.03,-.02,0],[.34,.22,.33]);
    for(let layer=0;layer<2;layer++){
      for(let i=0;i<18;i++){
        const a=(i+layer*.5)/18*Math.PI*2,x=Math.sin(a),z=Math.cos(a),drop=layer*.15;
        const points=[[x*.09,.22-drop,z*.09],[x*.27,.15-drop,z*.27],[x*.37,-.08-drop,z*.37],[x*.34,-.32-drop,z*.34]];
        strand(shoulder,m.silver,points,.058,.004,12,7,.12);
        stroke(shoulder,m.recess,points.slice(1).map(p=>[p[0]+x*.035,p[1]+.01,p[2]+z*.035]),.006,12);
      }
    }
    if(s===-1){
      const shield=group(shoulder,[-.02,-.06,.32],[0,-.12,.13]);
      const outline=[[-.29,.28],[.24,.24],[.33,-.06],[.12,-.38],[-.24,-.24],[-.34,.03]];
      plate(shield,m.silver,outline,.09,[0,0,0],[0,0,0],.028);
      plate(shield,m.recess,outline.map(([x,y])=>[x*.84,y*.83]),.017,[0,0,.108],[0,0,0],.014);
      border(shield,m.edge,outline.map(([x,y])=>[x*.95,y*.95,.132]),.022);
      stroke(shield,m.silver,[[-.22,.18,.15],[-.13,-.13,.15],[.10,-.27,.15],[.23,-.04,.15],[.05,.17,.15],[-.08,.07,.15],[.12,-.10,.15]],.037,30);
      stroke(shield,m.edge,[[-.19,.15,.18],[-.10,-.10,.18],[.08,-.23,.18]],.009);
      for(const [x,y] of [[-.26,.13],[.20,.16],[.07,-.31]])rivet(shield,m.gold,[x,y,.15],.022);
    }
  }
}

function axe(g,m){
  cyl(g,m.bronze,.057,.07,2.70,[0,.04,0]);
  // Carved grain and twisted grip wrap run around the haft.
  for(let j=0;j<5;j++){const a=j*Math.PI*2/5;stroke(g,m.recess,[[Math.sin(a)*.064,-1.18,Math.cos(a)*.064],[Math.sin(a+.2)*.059,-.50,Math.cos(a+.2)*.059],[Math.sin(a-.12)*.059,.22,Math.cos(a-.12)*.059],[Math.sin(a)*.057,.82,Math.cos(a)*.057]],.006,24);}
  const wrap=[];for(let j=0;j<=100;j++){const t=j/100,a=t*Math.PI*18;wrap.push([Math.cos(a)*.079,.43+t*.48,Math.sin(a)*.079]);}stroke(g,m.leather,wrap,.021,100);
  for(const y of [-1.28,.41,.94]){cyl(g,m.gold,.083,.083,.07,[0,y,0]);ring(g,m.recess,.083,.009,[0,y,0],[Math.PI/2,0,0]);}
  cyl(g,m.copper,.095,.1,.19,[0,1.07,0]);cyl(g,m.gold,.075,.09,.20,[0,1.31,0]);
  // Broad single bearded blade, with separate dark recess, bright bevel and interlaced relief.
  const outline=[[.025,.38],[-.19,.35],[-.50,.44],[-.70,.36],[-.73,.04],[-.66,-.29],[-.46,-.50],[-.23,-.31],[-.11,-.07],[.025,-.10]];
  plate(g,m.silver,outline,.095,[0,1.04,-.045],[0,0,0],.026);
  const inner=[[-.12,.29],[-.32,.30],[-.52,.35],[-.61,.28],[-.62,.03],[-.56,-.22],[-.44,-.35],[-.31,-.23],[-.20,-.015],[-.12,.02]];
  for(const z of [.079,-.079]){
    plate(g,m.recess,inner,.010,[0,1.04,z],[0,0,0],.005);
    border(g,m.edge,inner.map(([x,y])=>[x,y+1.04,z+(z>0?.02:-.02)]),.017);
    const zz=z+(z>0?.035:-.035);
    stroke(g,m.silver,[[-.18,1.29,zz],[-.40,1.24,zz],[-.49,1.10,zz],[-.29,1.03,zz],[-.43,.83,zz],[-.54,.98,zz],[-.56,1.22,zz],[-.37,1.32,zz]],.024,32);
    stroke(g,m.silver,[[-.24,1.22,zz],[-.33,1.12,zz],[-.50,1.05,zz],[-.48,.94,zz]],.019,20);
  }
  for(let j=0;j<4;j++)rivet(g,m.gold,[-.10,1.29-j*.09,.11],.017);
  box(g,m.copper,.16,.43,.16,[0,1.13,0],[0,0,0],.02);
  stroke(g,m.gold,[[-.06,.94,.10],[.04,1.13,.11],[-.055,1.33,.10]],.018);
}

function roundShield(g,m){
  cyl(g,m.leather,.64,.64,.11,[0,0,0],[Math.PI/2,0,0],64);
  cyl(g,m.recess,.59,.59,.028,[0,0,.075],[Math.PI/2,0,0],64);
  ring(g,m.bronze,.625,.034,[0,0,.063]);ring(g,m.gold,.595,.012,[0,0,.097]);ring(g,m.silver,.214,.029,[0,0,.115]);
  ball(g,m.silver,[0,0,.125],[.183,.183,.09]);ring(g,m.recess,.16,.009,[0,0,.173]);
  // Grain is recessed; the raised stave-and-branch motif is inspired by the reference compass.
  for(let j=-5;j<=5;j++){
    const x=j*.10,limit=Math.sqrt(.56**2-x*x);stroke(g,m.bronze,[[x,-limit,.10],[x+.007,-limit*.2,.102],[x-.006,limit*.5,.101],[x,limit,.10]],.004,18);
  }
  for(let i=0;i<8;i++){
    const arm=group(g,[0,0,.115],[0,0,i*Math.PI/4]);
    stroke(arm,m.gold,[[0,.24,0],[0,.55,0]],.015,12);
    const patterns=[[[[-.085,.51],[-.085,.44],[.085,.44],[.085,.51]],[[-.05,.35],[0,.31],[.05,.35]]],[[[-.07,.53],[0,.48],[.07,.53]],[[-.10,.42],[-.10,.36],[.10,.36],[.10,.42]]],[[[-.08,.52],[-.08,.45],[.08,.45],[.08,.52]],[[-.05,.39],[.05,.39]]],[[[-.09,.51],[-.09,.40],[.09,.40],[.09,.51]],[[-.05,.32],[.05,.32]]]];
    for(const shape of patterns[i%4])stroke(arm,m.gold,shape.map(([x,y])=>[x,y,.002]),.013,12);
    rivet(arm,m.silver,[0,.575,.004],.019);
  }
  for(let i=0;i<24;i++){const a=i/24*Math.PI*2;rivet(g,m.silver,[Math.sin(a)*.625,Math.cos(a)*.625,.09],.015);}
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2;rivet(g,m.gold,[Math.sin(a)*.215,Math.cos(a)*.215,.15],.024);}
  box(g,m.copper,.30,.12,.12,[0,0,-.13]);
  for(const x of [-.19,.19]){box(g,m.leather,.07,.63,.035,[x,0,-.085]);for(const y of [-.24,.24])rivet(g,m.gold,[x,y,-.11],.025);}
}

function batch(g,slot){
  g.updateMatrixWorld(true);const buckets=new Map();
  g.traverse(o=>{if(!o.isMesh)return;const geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geo.applyMatrix4(o.matrixWorld);geo.clearGroups();if(!buckets.has(o.material))buckets.set(o.material,[]);buckets.get(o.material).push(geo);o.geometry.dispose();});
  const result=new T.Group();result.userData.slot=slot;let triangles=0;
  for(const [material,geometries] of buckets){const geo=mergeGeometries(geometries);geometries.forEach(x=>x.dispose());if(!geo)throw new Error(`Could not batch ${slot}`);geo.computeBoundingSphere();const o=new T.Mesh(geo,material);o.castShadow=o.receiveShadow=true;o.userData.slot=slot;result.add(o);triangles+=geo.attributes.position.count/3;}
  result.userData.triangles=triangles;return result;
}
export function createVikingPart(slot,finish='bronze'){
  const g=new T.Group(),m=materials(finish);
  const builders={head,hat:helmet,body:torso,arms,legs:boots,armor:shoulderArmor,weapon:axe,shield:roundShield};
  builders[slot](g,m);
  // Dispose unused material variants, while shared surface textures stay alive.
  const used=new Set();g.traverse(o=>{if(o.isMesh)used.add(o.material);});Object.values(m).forEach(material=>{if(!used.has(material))material.dispose();});
  return batch(g,slot);
}
