import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { categories, catalog, createPart, mounts, separation, presets } from './parts.js';
import { currentTheme, themePreference, setTheme } from './theme.js';
import './icons.css';
import './style.css';
import './themes.css';

const icon=(name)=>`<i class="ph ph-${name}" aria-hidden="true"></i>`;
let state={...presets.viking},active='head',history=[],future=[],exploded=false,rotating=false,sound=false;
let saved=[];try{saved=JSON.parse(localStorage.getItem('zhuojiang-works')||'[]');if(!Array.isArray(saved))saved=[];}catch{}
const thumbs={};const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
document.querySelector('#app').innerHTML=`
  <header class="header">
    <a class="brand" href="/" aria-label="琢匠首页"><span class="brand-mark">${icon('nut')}</span><strong>琢匠</strong><span class="brand-en">ZHUOJIANG</span></a>
    <div class="header-divider"></div><span class="studio-name">小人装配工坊</span>
    <div class="header-actions"><label class="theme-control" title="页面主题"><i id="theme-icon" class="ph ph-${currentTheme()==='light'?'sun':'moon'}" aria-hidden="true"></i><select id="theme-select" aria-label="页面主题"><option value="auto">跟随系统</option><option value="light">亮色</option><option value="dark">暗色</option></select></label><a class="text-button model-lab-link" href="/model-lab.html" title="乐高人偶模型实验室">${icon('cube')}<span>模型实验室</span></a><button class="text-button" id="reference">${icon('images')}<span>灵感图鉴</span></button><button class="text-button" id="collection">${icon('folders')}<span>我的作品</span><b id="saved-count">${saved.length}</b></button><button class="primary" id="save">${icon('floppy-disk')} 保存作品</button></div>
  </header>
  <main class="workspace">
    <nav class="category-rail" aria-label="部件类别">${categories.map(c=>`<button class="category ${c.id===active?'active':''}" data-category="${c.id}" title="${c.name}" aria-pressed="${c.id===active}">${icon(c.icon)}<span>${c.name}</span></button>`).join('')}<div class="rail-bottom">${icon('magnet')}</div></nav>
    <aside class="library">
      <div class="panel-heading"><div><span class="eyebrow">PARTS LIBRARY</span><h2 id="category-title">头部<span>03</span></h2></div>${icon('squares-four')}</div>
      <div class="series-filters" aria-label="部件系列"><button class="active" data-filter="all">全部</button><button data-filter="0">北境</button><button data-filter="1">东方</button><button data-filter="2">骑士</button></div>
      <div class="parts-grid" id="parts-grid"></div>
      <div class="library-note">${icon('cursor-click')}<span>点击部件即可装配<br><small>也可以拖入中央装配台</small></span></div>
      <div class="reference-teaser"><img src="/assets/640-5.jpg" alt="真实金属磁吸小人系列" /><div><span>每一个组合，都有故事</span><button id="reference-inline">探索实物图鉴 ${icon('arrow-up-right')}</button></div></div>
    </aside>
    <section class="stage" aria-label="三维装配台">
      <div class="stage-heading"><span class="eyebrow">YOUR IMAGINATION. CAST IN METAL.</span><h1>拼出你的<span>英雄。</span></h1><p>从一枚部件开始，让想象成形。</p></div>
      <div class="view-tag">${icon('cube')}<span>3D 装配台</span><span class="status-dot"></span></div>
      <div id="viewport"><div class="loading">正在准备装配台…</div></div>
      <div class="stage-side"><button class="icon-button" id="undo" title="撤销" aria-label="撤销" disabled>${icon('arrow-u-up-left')}</button><button class="icon-button" id="redo" title="重做" aria-label="重做" disabled>${icon('arrow-u-up-right')}</button><span></span><button class="icon-button" id="sound" title="开关装配音效" aria-label="开关装配音效" aria-pressed="false">${icon('speaker-slash')}</button></div>
      <div class="stage-caption"><span class="small-line"></span><span id="figure-label">北境守卫</span><small>自由装配 / 金属系列</small></div>
      <div class="stage-tools"><button id="front" title="恢复正面视角">${icon('corners-out')}<span>正面</span></button><button id="rotate" aria-pressed="false">${icon('arrows-clockwise')}<span>自动旋转</span></button><button id="explode" aria-pressed="false">${icon('cube-transparent')}<span>拆解查看</span></button><span></span><button id="export">${icon('camera')}<span>导出图片</span></button></div>
      <div class="stage-help">${icon('hand')} 拖动旋转 <span>·</span> 滚轮缩放 <span>·</span> 点击小人选择部位</div>
      <div class="drop-hint">${icon('magnet')} 松手，吸附到对应部位</div>
    </section>
    <aside class="inspector">
      <span class="eyebrow">THE BUILD</span><h2>你的搭配</h2>
      <label class="name-label" for="figure-name">作品名称</label><div class="name-input"><input id="figure-name" value="北境守卫" maxlength="24" aria-label="作品名称" />${icon('pencil-simple')}</div>
      <div class="section-title">金属质感<span>FINISH</span></div>
      <div class="finishes">${[['bronze','古铜'],['silver','白银'],['iron','黑铁']].map(([id,n])=>`<button data-finish="${id}" class="finish ${id==='bronze'?'active':''}" aria-pressed="${id==='bronze'}"><span class="swatch ${id}"></span>${n}</button>`).join('')}</div>
      <div class="section-title">装配清单<span id="part-count">8 个部位</span></div><div id="build-list" class="build-list"></div>
      <div class="inspector-bottom"><button class="random-button" id="random">${icon('shuffle')} 随机灵感 ${icon('arrow-right')}</button><button class="reset-button" id="reset">${icon('arrow-counter-clockwise')} 恢复初始搭配</button><p>${icon('magnet')} 每一处连接，都有无限可能。</p></div>
    </aside>
  </main>
  <footer class="footer"><span>为想象而铸</span><div class="presets"><span>从经典开始</span><button data-preset="viking" class="active">北境守卫</button><button data-preset="general">东方战将</button><button data-preset="knight">铁誓骑士</button></div><span class="prototype-note" title="当前为程序生成的概念造型，后续可接入实物部件模型">造型示意 · 非实物复刻</span></footer>
  <div class="toast" role="status" aria-live="polite"></div><dialog id="dialog"><div id="dialog-content"></div></dialog>
`;

const viewport=document.querySelector('#viewport');let renderer,scene,camera,controls,figure,parts={},hoverStart,plinth,floor,grid;
let ready=false,frame=0,lastFrame=0;
function requestRender(){if(renderer&&!frame&&!document.hidden)frame=requestAnimationFrame(draw);}
function draw(time){
  frame=0;
  if(document.hidden)return;
  const dt=lastFrame?Math.min((time-lastFrame)/1000,.05):1/60;lastFrame=time;
  controls.update(dt);let moving=false;
  for(const part of Object.values(parts)){
    const {base,offset,target}=part.userData;target.copy(base).addScaledVector(offset,exploded?1:0);
    if(part.position.distanceToSquared(target)>.000001){part.position.lerp(target,reduce?1:1-Math.exp(-dt*9));moving=true;}else part.position.copy(target);
    if(part.userData.scaleProgress<1){part.userData.scaleProgress=reduce?1:Math.min(1,part.userData.scaleProgress+dt*4);part.scale.setScalar(1+Math.sin(part.userData.scaleProgress*Math.PI)*.055);moving=true;}
  }
  if(moving)renderer.shadowMap.needsUpdate=true;
  renderer.render(scene,camera);
  if(moving||controls.autoRotate)requestRender();
}
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else{lastFrame=0;requestRender();}});
function applySceneTheme(){
  if(!renderer)return;const light=currentTheme()==='light';
  plinth.material.color.set(light?'#c9cfc3':'#272c29');plinth.material.roughness=light?.65:.49;
  floor.material.opacity=light?.18:.4;
  grid.material.opacity=light?.12:.16;
  grid.material.color.set(light?'#71806b':'#383e37');
  renderer.shadowMap.needsUpdate=true;requestRender();
}
const themeSelect=document.querySelector('#theme-select');themeSelect.value=themePreference;
themeSelect.addEventListener('change',e=>setTheme(e.target.value));
window.addEventListener('zhuojiang-theme-change',()=>{document.querySelector('#theme-icon').className=`ph ph-${currentTheme()==='light'?'sun':'moon'}`;applySceneTheme();});
function lighting(s,r){
  const pmrem=new T.PMREMGenerator(r);const room=new RoomEnvironment();const env=pmrem.fromScene(room,.04);s.environment=env.texture;room.dispose();pmrem.dispose();
  s.add(new T.AmbientLight('#d7dcca',.5));
  const key=new T.DirectionalLight('#ffe1b5',4);key.position.set(-3,7,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=7;key.shadow.camera.bottom=-4;key.shadow.bias=-.001;key.shadow.normalBias=.03;s.add(key);
  const rim=new T.DirectionalLight('#b8d0d5',3);rim.position.set(4,5,-4);s.add(rim);const fill=new T.DirectionalLight('#f3efe3',2);fill.position.set(2,3,4);s.add(fill);return env;
}
function initScene(){
  renderer=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;viewport.replaceChildren(renderer.domElement);
  scene=new T.Scene();camera=new T.PerspectiveCamera(34,1,.1,60);camera.position.set(6.7,5.2,11.3);
  controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,2.42,0);controls.enableDamping=true;controls.enablePan=false;controls.minDistance=7;controls.maxDistance=19;controls.maxPolarAngle=Math.PI*.69;controls.minPolarAngle=.35;controls.autoRotateSpeed=1.1;
  controls.addEventListener('change',requestRender);
  lighting(scene,renderer);figure=new T.Group();scene.add(figure);
  plinth=new T.Mesh(new T.CylinderGeometry(2.12,2.18,.22,96),new T.MeshStandardMaterial({color:'#272c29',metalness:.65,roughness:.49}));plinth.position.y=.24;plinth.receiveShadow=true;scene.add(plinth);
  const edge=new T.Mesh(new T.TorusGeometry(2.12,.018,8,100),new T.MeshStandardMaterial({color:'#89724d',metalness:.8,roughness:.4}));edge.rotation.x=Math.PI/2;edge.position.y=.355;scene.add(edge);
  floor=new T.Mesh(new T.PlaneGeometry(200,200),new T.ShadowMaterial({color:'#000000',opacity:.4}));floor.rotation.x=-Math.PI/2;floor.position.y=.10;floor.receiveShadow=true;scene.add(floor);
  grid=new T.GridHelper(30,60,'#383e37','#292e29');grid.position.y=.11;grid.material.transparent=true;grid.material.opacity=.16;scene.add(grid);
  new ResizeObserver(()=>{const w=viewport.clientWidth,h=viewport.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);requestRender();}).observe(viewport);
  buildModel();
  const raycaster=new T.Raycaster();const pointer=new T.Vector2();
  renderer.domElement.addEventListener('pointerdown',e=>hoverStart=[e.clientX,e.clientY]);
  renderer.domElement.addEventListener('pointerup',e=>{if(!hoverStart||Math.hypot(e.clientX-hoverStart[0],e.clientY-hoverStart[1])>5)return;const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(figure.children,true)[0];if(hit)selectCategory(hit.object.userData.slot);});
  applySceneTheme();ready=true;requestRender();
}
function disposePart(part){part.traverse(o=>{o.geometry?.dispose();});const materials=new Set();part.traverse(o=>{if(o.material)materials.add(o.material);});materials.forEach(m=>m.dispose());}
function replacePart(slot,animated=true){if(parts[slot]){figure.remove(parts[slot]);disposePart(parts[slot]);}const p=createPart(slot,state[slot],state.finish);const base=mounts[slot];p.position.set(...base);if(animated&&!reduce)p.position.y+=.23;Object.assign(p.userData,{base:new T.Vector3(...base),offset:new T.Vector3(...separation[slot]),target:new T.Vector3(),scaleProgress:animated?0:1});parts[slot]=p;figure.add(p);renderer.shadowMap.needsUpdate=true;requestRender();}
function buildModel(){categories.forEach(c=>replacePart(c.id,false));}
function renderThumbs(){
  const r=new T.WebGLRenderer({antialias:true,alpha:true});r.setSize(220,180);r.setPixelRatio(1);r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=1.18;
  const s=new T.Scene();const env=lighting(s,r);const c=new T.PerspectiveCamera(35,220/180,.01,100);
  for(const category of categories){catalog[category.id].forEach((_,index)=>{
    if(index===3)return;const g=createPart(category.id,index,'bronze');s.add(g);const b=new T.Box3().setFromObject(g),center=b.getCenter(new T.Vector3()),size=b.getSize(new T.Vector3());g.position.sub(center);const distance=Math.max(size.y,size.x/1.22)*1.95+size.z*.5;c.position.set(distance*.45,distance*.24,distance);c.lookAt(0,0,0);r.render(s,c);thumbs[`${category.id}-${index}`]=r.domElement.toDataURL();s.remove(g);disposePart(g);
  });}env.dispose();r.dispose();r.forceContextLoss();
}
function renderCards(){
  const filter=document.querySelector('.series-filters .active')?.dataset.filter||'all';
  document.querySelector('#category-title').innerHTML=`${categories.find(c=>c.id===active).name}<span>${String(catalog[active].length).padStart(2,'0')}</span>`;
  document.querySelector('#parts-grid').innerHTML=catalog[active].map(([name,sub],index)=>({name,sub,index})).filter(p=>filter==='all'||p.index===+filter||p.index===3).map(p=>`<button class="part-card ${state[active]===p.index?'selected':''}" data-part="${p.index}" draggable="true" aria-pressed="${state[active]===p.index}"><div class="part-visual">${p.index===3?icon('minus-circle'):`<img src="${thumbs[`${active}-${p.index}`]}" alt="${p.name}三维预览" />`}<span class="part-selected">${icon('check')}</span></div><strong>${p.name}</strong><small>${p.sub}</small></button>`).join('');
  document.querySelectorAll('.part-card').forEach(button=>{button.addEventListener('click',()=>equip(active,+button.dataset.part));button.addEventListener('dragstart',e=>{e.dataTransfer.setData('application/zhuojiang-part',JSON.stringify({slot:active,index:+button.dataset.part}));e.dataTransfer.effectAllowed='copy';document.querySelector('.stage').classList.add('dragging');});button.addEventListener('dragend',()=>document.querySelector('.stage').classList.remove('dragging'));});
}
function renderBuild(){
  document.querySelector('#figure-label').textContent=state.name;
  document.querySelector('#figure-name').value=state.name;
  document.querySelector('#build-list').innerHTML=categories.map(c=>`<button class="build-row ${active===c.id?'active':''}" data-build="${c.id}"><span class="build-icon">${icon(c.icon)}</span><span><small>${c.name}</small><strong>${catalog[c.id][state[c.id]][0]}</strong></span>${icon('caret-right')}</button>`).join('');
  document.querySelectorAll('[data-build]').forEach(b=>b.onclick=()=>selectCategory(b.dataset.build));
  document.querySelector('#part-count').textContent=`${categories.filter(c=>state[c.id]!==3).length} 个部位`;
  document.querySelectorAll('[data-finish]').forEach(b=>{b.classList.toggle('active',b.dataset.finish===state.finish);b.setAttribute('aria-pressed',b.dataset.finish===state.finish);});
  document.querySelector('#undo').disabled=!history.length;document.querySelector('#redo').disabled=!future.length;
  document.querySelectorAll('[data-preset]').forEach(b=>b.classList.toggle('active',categories.every(c=>state[c.id]===presets[b.dataset.preset][c.id])&&state.finish===presets[b.dataset.preset].finish));
}
function selectCategory(slot){if(!catalog[slot])return;active=slot;document.querySelectorAll('[data-category]').forEach(b=>{b.classList.toggle('active',b.dataset.category===slot);b.setAttribute('aria-pressed',b.dataset.category===slot);});document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b.dataset.filter==='all'));renderCards();renderBuild();}
function remember(){history.push({...state});if(history.length>40)history.shift();future=[];}
function equip(slot,index){if(state[slot]===index)return;remember();state[slot]=index;replacePart(slot);renderCards();renderBuild();clickSound();toast(`${catalog[slot][index][0]}${index===3?'':' · 已装配'}`);}
let toastTimer;
function toast(msg){const el=document.querySelector('.toast');el.textContent=msg;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),2300);}
let audio;
function clickSound(){if(!sound)return;try{audio||=new AudioContext();audio.resume();const o=audio.createOscillator(),gain=audio.createGain();o.type='triangle';o.frequency.setValueAtTime(780,audio.currentTime);o.frequency.exponentialRampToValueAtTime(140,audio.currentTime+.06);gain.gain.setValueAtTime(.055,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.09);o.connect(gain).connect(audio.destination);o.start();o.stop(audio.currentTime+.1);}catch{}}
function apply(next,message){remember();state={...next};buildModel();renderCards();renderBuild();if(message)toast(message);}
const dialog=document.querySelector('#dialog');
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function openDialog(title,body){document.querySelector('#dialog-content').innerHTML=`<div class="dialog-heading"><div><span class="eyebrow">ZHUOJIANG STUDIO</span><h2>${title}</h2></div><button class="icon-button" id="close-dialog" aria-label="关闭">${icon('x')}</button></div>${body}`;dialog.showModal();document.querySelector('#close-dialog').onclick=()=>dialog.close();}
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
function references(){openDialog('从实物中，寻找灵感',`<p class="dialog-intro">金属雕纹、古铜包浆与角色故事。当前装配台为概念造型，以下为实物参考。</p><div class="reference-grid"><figure><img src="/assets/640.jpg" alt="北境金属战士设计图"/><figcaption>北境战士 / 维京系列</figcaption></figure><figure><img src="/assets/640-3.jpg" alt="张飞金属小人设计图"/><figcaption>东方武将 / 三国系列</figcaption></figure><figure class="wide"><img src="/assets/640-2.jpg" alt="金属武器与盾牌"/><figcaption>武器与盾牌 / 自由搭配</figcaption></figure></div>`);}
document.querySelector('#reference').onclick=references;document.querySelector('#reference-inline').onclick=references;
document.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>selectCategory(b.dataset.category));
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));renderCards();});
document.querySelectorAll('[data-finish]').forEach(b=>b.onclick=()=>{if(state.finish===b.dataset.finish)return;apply({...state,finish:b.dataset.finish},'金属质感已更新');});
document.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>apply(presets[b.dataset.preset],'已载入经典搭配'));
document.querySelector('#figure-name').addEventListener('change',e=>{const name=e.target.value.trim()||'未命名作品';if(state.name!==name){remember();state.name=name;renderBuild();}});
document.querySelector('#undo').onclick=()=>{if(!history.length)return;future.push({...state});state=history.pop();buildModel();renderCards();renderBuild();toast('已撤销');};
document.querySelector('#redo').onclick=()=>{if(!future.length)return;history.push({...state});state=future.pop();buildModel();renderCards();renderBuild();toast('已重做');};
document.querySelector('#reset').onclick=()=>{apply(presets.viking,'已恢复初始搭配');exploded=false;document.querySelector('#explode').classList.remove('active');document.querySelector('#explode').setAttribute('aria-pressed','false');};
document.querySelector('#random').onclick=()=>{const next={...state,name:'无名旅人'};categories.forEach(c=>next[c.id]=Math.floor(Math.random()*3));apply(next,'新的灵感，已就位');};
document.querySelector('#front').onclick=()=>{camera.position.set(0,4.5,13);controls.target.set(0,2.42,0);controls.update();};
document.querySelector('#rotate').onclick=e=>{rotating=!rotating;controls.autoRotate=rotating;e.currentTarget.classList.toggle('active',rotating);e.currentTarget.setAttribute('aria-pressed',rotating);requestRender();};
document.querySelector('#explode').onclick=e=>{exploded=!exploded;e.currentTarget.classList.toggle('active',exploded);e.currentTarget.setAttribute('aria-pressed',exploded);requestRender();toast(exploded?'拆解视图 · 仍可自由更换部件':'已重新组装');};
document.querySelector('#sound').onclick=e=>{sound=!sound;e.currentTarget.innerHTML=icon(sound?'speaker-high':'speaker-slash');e.currentTarget.setAttribute('aria-pressed',sound);toast(sound?'装配音效已开启':'装配音效已关闭');clickSound();};
const stage=document.querySelector('.stage');stage.addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('application/zhuojiang-part')){e.preventDefault();e.dataTransfer.dropEffect='copy';}});stage.addEventListener('drop',e=>{e.preventDefault();stage.classList.remove('dragging');try{const p=JSON.parse(e.dataTransfer.getData('application/zhuojiang-part'));if(catalog[p.slot]&&Number.isInteger(p.index)&&p.index>=0&&p.index<catalog[p.slot].length)equip(p.slot,p.index);}catch{}});
function snapshot(thumbnail=false){renderer.render(scene,camera);const light=currentTheme()==='light';const c=document.createElement('canvas');c.width=thumbnail?360:1200;c.height=thumbnail?420:1400;const ctx=c.getContext('2d');if(thumbnail)ctx.scale(.3,.3);ctx.fillStyle=light?'#eef1e8':'#1d211e';ctx.fillRect(0,0,1200,1400);const source=renderer.domElement;const ratio=Math.min(1120/source.width,1170/source.height);ctx.drawImage(source,(1200-source.width*ratio)/2,40,source.width*ratio,source.height*ratio);ctx.fillStyle=light?'#79551c':'#d3b785';ctx.font='600 26px sans-serif';ctx.fillText('琢匠 / ZHUOJIANG',70,80);ctx.fillStyle=light?'#293125':'#f0eee7';ctx.font='600 44px sans-serif';ctx.fillText(state.name,70,1270);ctx.fillStyle=light?'#5f6d55':'#9c9f96';ctx.font='21px sans-serif';ctx.fillText('自由装配 · 金属系列 / 概念造型',70,1315);return c.toDataURL(thumbnail?'image/jpeg':'image/png',.85);}
document.querySelector('#export').onclick=()=>{if(!ready)return;const a=document.createElement('a');a.download=`琢匠-${state.name.replace(/[\\/:*?"<>|]/g,'')}.png`;a.href=snapshot();a.click();toast('作品图片已导出');};
document.querySelector('#save').onclick=()=>{
  if(!ready)return;const work={id:globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`,state:{...state},date:new Date().toLocaleDateString('zh-CN'),image:snapshot(true)};
  const next=[work,...saved].slice(0,12);try{localStorage.setItem('zhuojiang-works',JSON.stringify(next));saved=next;document.querySelector('#saved-count').textContent=saved.length;toast('已保存到我的作品 · 当前浏览器');}catch{toast('浏览器存储空间不足，请先导出图片或删除旧作品');}
};
function collection(){openDialog('我的作品',`<p class="dialog-intro">保存你喜欢的组合，随时继续装配。作品保存在当前浏览器中，最多保留最近 12 件。</p>${saved.length?`<div class="works-grid">${saved.map(w=>`<article class="work-card"><img src="${w.image}" alt="${escape(w.state.name)}"/><div><h3>${escape(w.state.name)}</h3><small>${escape(w.date)}</small></div><div class="work-actions"><button data-load="${w.id}">继续装配 ${icon('arrow-right')}</button><button data-delete="${w.id}" aria-label="删除 ${escape(w.state.name)}">${icon('trash')}</button></div></article>`).join('')}</div>`:`<div class="empty-state">${icon('cube')}<h3>你的第一位英雄，等待入藏。</h3><p>完成搭配后，点击「保存作品」。</p></div>`}`);
  document.querySelectorAll('[data-load]').forEach(b=>b.onclick=()=>{apply(saved.find(w=>w.id===b.dataset.load).state,'作品已载入');dialog.close();});
  document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>{const next=saved.filter(w=>w.id!==b.dataset.delete);try{localStorage.setItem('zhuojiang-works',JSON.stringify(next));saved=next;document.querySelector('#saved-count').textContent=saved.length;dialog.close();collection();}catch{toast('暂时无法更新浏览器存储');}});
}
document.querySelector('#collection').onclick=collection;
try{initScene();renderThumbs();renderCards();renderBuild();document.body.classList.add('ready');}catch(error){console.error(error);viewport.innerHTML=`<div class="webgl-error">${icon('cube')}<h2>装配台暂时无法启动</h2><p>请开启浏览器硬件加速，或使用支持 WebGL 的浏览器。</p><button onclick="location.reload()">重新加载</button></div>`;document.querySelectorAll('button').forEach(b=>{if(!['reference','reference-inline','close-dialog'].includes(b.id))b.disabled=true;});}
window.addEventListener('keydown',e=>{if(e.target instanceof HTMLInputElement||dialog.open)return;if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){e.preventDefault();document.querySelector(e.shiftKey?'#redo':'#undo').click();}});
