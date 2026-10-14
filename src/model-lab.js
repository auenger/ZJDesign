import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { currentTheme,themePreference,setTheme } from './theme.js';
import './icons.css';
import './style.css';
import './themes.css';
import './model-lab.css';

const icon=n=>`<i class="ph ph-${n}" aria-hidden="true"></i>`;
document.body.classList.add('lab');
document.querySelector('#app').innerHTML=`
<header class="header"><a class="brand" href="/" aria-label="返回琢匠装配工坊"><span class="brand-mark">${icon('nut')}</span><strong>琢匠</strong><span class="brand-en">ZHUOJIANG</span></a><div class="header-divider"></div><span class="studio-name">模型实验室</span><div class="header-actions"><label class="theme-control"><i id="lab-theme-icon" class="ph ph-${currentTheme()==='light'?'sun':'moon'}" aria-hidden="true"></i><select id="theme-select" aria-label="页面主题"><option value="auto">跟随系统</option><option value="light">亮色</option><option value="dark">暗色</option></select></label><a class="lab-back" href="/">返回装配台 ${icon('arrow-right')}</a></div></header>
<main class="lab-layout"><section class="lab-view" aria-label="乐高人偶三维预览"><div class="lab-title"><span class="eyebrow">MODEL STUDY / 001</span><h1>一个小人，真实的细节。</h1><p>转动、靠近，看看帽檐、手掌与脚底的结构。<br>来自 Rioforce 的独立建模作品。</p></div><div id="lab-viewport"></div><div class="lab-status">可旋转的真实三维模型</div><div class="lab-caption"><span>LEGO Minifigure — Cycles</span><small>拖动旋转 · 滚轮 / 双指缩放</small></div><div class="lab-tools"><button id="lab-front">${icon('corners-out')} 正面</button><button id="lab-rotate" aria-pressed="false">${icon('arrows-clockwise')} 旋转</button><button id="lab-explode" aria-pressed="false">${icon('cube-transparent')} 拆解</button><button id="lab-export">${icon('camera')} 导出</button></div><div id="lab-loading" class="lab-loading" role="status"><span>正在载入人偶…</span><progress></progress><small>模型仅在进入本页时下载</small></div></section>
<aside class="lab-sidebar"><span class="eyebrow">THE MODEL</span><h2>乐高人偶 · 细节体验</h2>
<section class="lab-control"><h3>模型精度 <span>DETAIL</span></h3><div class="lab-segment"><button data-quality="high" aria-pressed="true">高精细</button><button data-quality="standard" aria-pressed="false">轻量版</button></div><p>同一个源模型的两档曲面细分。放大观察弧面边缘，比较精度与资源占用。</p><label class="lab-check"><input type="checkbox" id="lab-wireframe"/> 查看三角网格</label></section>
<section class="lab-control"><h3>表面质感 <span>MATERIAL</span></h3><div class="lab-segment"><button data-material="original" aria-pressed="true">原色塑料</button><button data-material="metal" aria-pressed="false">金属试色</button></div><p>保留原作的笑脸与背带裤印花，试着比较不同材质下的光泽。</p></section>
<section class="lab-control"><h3><label for="lab-separation">拆解距离</label> <span>ASSEMBLY</span></h3><input id="lab-separation" type="range" min="0" max="100" value="0"/><div class="lab-range-label"><span>完整组装</span><span>分件展示</span></div></section>
<section class="lab-control"><dl class="lab-stats"><div><dt>三角面</dt><dd id="stat-triangles">—</dd></div><div><dt>模型文件</dt><dd id="stat-size">—</dd></div><div><dt>独立部件</dt><dd id="stat-parts">—</dd></div><div><dt>当前精度</dt><dd id="stat-quality">—</dd></div></dl></section>
<div class="lab-credit"><strong>作者：Rioforce</strong> · <a href="https://rioforce.wordpress.com/2013/07/30/download-a-lego-minifigure/" target="_blank" rel="noopener noreferrer">原作与下载</a><br><a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener noreferrer">CC BY 3.0</a> · <a href="/models/rioforce/NOTICE.txt" target="_blank" rel="noopener">完整来源及修改说明</a><p>原始下载包另注明 Fan Art、禁止商业使用。本页仅用于非商业模型技术测试，不作为琢匠商品素材；与 LEGO 集团无隶属或背书关系。</p><p>已转换为 GLB、整理部件并适配网页材质。原始许可文件随资源保留。</p></div>
</aside></main>`;
const $=s=>document.querySelector(s), viewport=$('#lab-viewport'), loading=$('#lab-loading');
$('#theme-select').value=themePreference;$('#theme-select').onchange=e=>setTheme(e.target.value);
let renderer,scene,camera,controls,plinth,model=null,metadata,quality='high',materialMode='original',separation=0,frame=0,token=0;
const draco=new DRACOLoader().setDecoderPath('/decoders/draco/').setDecoderConfig({type:'wasm'}).setWorkerLimit(2);
const cache=new Map(),baseColors=new WeakMap(),partTransforms=new WeakMap();
function invalidate(){if(renderer&&!frame&&!document.hidden)frame=requestAnimationFrame(draw);}
function draw(){frame=0;if(document.hidden)return;controls.update();renderer.render(scene,camera);if(controls.autoRotate)invalidate();}
function updateTheme(){$('#lab-theme-icon').className=`ph ph-${currentTheme()==='light'?'sun':'moon'}`;if(!scene)return;const light=currentTheme()==='light';plinth.material.color.set(light?'#dadccd':'#30372e');renderer.shadowMap.needsUpdate=true;invalidate();}
function applySurface(){if(!model)return;model.traverse(o=>{if(!o.isMesh)return;const m=o.material,original=baseColors.get(m);m.wireframe=$('#lab-wireframe').checked;m.metalness=materialMode==='metal'?.88:0;m.roughness=materialMode==='metal'?.30:.28;m.color.copy(original);if(materialMode==='metal')m.color.multiply(new T.Color('#d8bd8b'));m.needsUpdate=true;});invalidate();}
function fitView(front=false){if(!model)return;const box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());const direction=front?new T.Vector3(0,.07,1):camera.position.clone().sub(controls.target).normalize();const distance=Math.max(size.y/(2*Math.tan(T.MathUtils.degToRad(camera.fov/2)))*1.70,Math.max(size.x*1.4,4.3*1.1)/(2*Math.tan(T.MathUtils.degToRad(camera.fov/2))*camera.aspect),8);controls.target.copy(center).add(new T.Vector3(0,.03,0));camera.position.copy(controls.target).addScaledVector(direction,distance);controls.update();invalidate();}
function applySeparation(){if(!model)return;for(const part of model.children){const t=partTransforms.get(part);if(t)part.position.copy(t.base).addScaledVector(t.offset,separation);}fitView();renderer.shadowMap.needsUpdate=true;$('#lab-explode').setAttribute('aria-pressed',separation>0);invalidate();}
function countModel(root){let triangles=0;root.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});return triangles;}
function disposeScene(root){const materials=new Set(),geometries=new Set(),textures=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}
async function getModel(level){
  if(cache.has(level))return cache.get(level);
  const promise=(async()=>{
    const asset=metadata.variants[level],gltf=await new GLTFLoader().setDRACOLoader(draco).loadAsync(asset.url,e=>{if(quality===level&&e.lengthComputable){const p=loading.querySelector('progress');p.max=e.total;p.value=e.loaded;}});
    const root=gltf.scene;root.updateMatrixWorld(true);
    const box=new T.Box3().setFromObject(root),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
    const scale=4.5/size.y;root.scale.setScalar(scale);root.position.set(-center.x*scale,.37-box.min.y*scale,-center.z*scale);root.updateMatrixWorld(true);
    // Store independent mesh transforms. The conversion exports one root node per loose component.
    for(const part of root.children){const b=new T.Box3().setFromObject(part),c=b.getCenter(new T.Vector3());const name=part.name,side=c.x<0?-1:1;const delta=name.includes('cap')?[0,1.9,0]:name.includes('head')?[0,1.15,0]:name.includes('torso')?[0,.55,0]:name.includes('hips')?[0,.15,0]:name.includes('hand')?[side*.95,.15,.15]:name.includes('arm')?[side*.65,.5,0]:[side*.38,0,0];const offset=new T.Vector3(...delta).divideScalar(scale);partTransforms.set(part,{base:part.position.clone(),offset});}
    root.traverse(o=>{if(!o.isMesh)return;o.castShadow=o.receiveShadow=true;const materials=Array.isArray(o.material)?o.material:[o.material];for(const m of materials){baseColors.set(m,m.color.clone());if(m.map)m.map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());}});
    return root;
  })();cache.set(level,promise);try{return await promise;}catch(e){cache.delete(level);throw e;}
}
async function selectQuality(level){
  const id=++token;quality=level;document.body.dataset.modelReady='false';loading.hidden=false;loading.innerHTML='<span>正在载入人偶…</span><progress></progress><small>模型仅在进入本页时下载</small>';
  document.querySelectorAll('[data-quality]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.quality===level));
  try{
    const next=await getModel(level);if(id!==token)return;if(model)scene.remove(model);model=next;scene.add(model);applySurface();applySeparation();
    const triangles=countModel(model),bytes=metadata.variants[level].bytes;$('#stat-triangles').textContent=triangles.toLocaleString('en-US');$('#stat-size').innerHTML=`${(bytes/1024/1024).toFixed(2)} <small>MB</small>`;$('#stat-parts').textContent=model.children.length;$('#stat-quality').textContent=level==='high'?'高精细':'轻量';
    document.body.dataset.modelReady='true';document.body.dataset.quality=level;loading.hidden=true;renderer.shadowMap.needsUpdate=true;invalidate();
  }catch(e){if(id!==token)return;console.error(e);loading.innerHTML='<span>模型暂时未能载入</span><small>请检查网络后重试。</small><button id="lab-retry">重新加载</button>';$('#lab-retry').onclick=()=>selectQuality(level);}
}
function init(){
  renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;viewport.append(renderer.domElement);
  scene=new T.Scene();camera=new T.PerspectiveCamera(35,1,.1,50);camera.position.set(5.5,4.4,10.5);controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,2.5,0);controls.enableDamping=true;controls.enablePan=false;controls.minDistance=4;controls.maxDistance=18;controls.maxPolarAngle=Math.PI*.85;controls.autoRotateSpeed=1;controls.addEventListener('change',invalidate);
  const generator=new T.PMREMGenerator(renderer),room=new RoomEnvironment(),env=generator.fromScene(room,.05);scene.environment=env.texture;room.dispose();generator.dispose();scene.environmentIntensity=.75;
  scene.add(new T.AmbientLight('#fff9e9',.6));const key=new T.DirectionalLight('#fff1d9',3);key.position.set(-4,8,6);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-5,right:5,top:8,bottom:-5});key.shadow.normalBias=.025;key.shadow.bias=-.0001;scene.add(key);const rim=new T.DirectionalLight('#d9e9ff',2);rim.position.set(4,5,-4);scene.add(rim);
  plinth=new T.Mesh(new T.CylinderGeometry(2.1,2.17,.20,96),new T.MeshStandardMaterial({roughness:.6,metalness:.25}));plinth.position.y=.26;plinth.receiveShadow=true;scene.add(plinth);const edge=new T.Mesh(new T.TorusGeometry(2.1,.014,8,96),new T.MeshStandardMaterial({color:'#b69a61',metalness:.7,roughness:.4}));edge.rotation.x=-Math.PI/2;edge.position.y=.365;scene.add(edge);
  const floor=new T.Mesh(new T.PlaneGeometry(200,200),new T.ShadowMaterial({opacity:.16}));floor.rotation.x=-Math.PI/2;floor.position.y=.15;floor.receiveShadow=true;scene.add(floor);
  new ResizeObserver(()=>{const w=viewport.clientWidth,h=viewport.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);fitView();invalidate();}).observe(viewport);updateTheme();
}
window.addEventListener('zhuojiang-theme-change',updateTheme);
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else invalidate();});
document.querySelectorAll('[data-quality]').forEach(b=>b.onclick=()=>selectQuality(b.dataset.quality));
document.querySelectorAll('[data-material]').forEach(b=>b.onclick=()=>{materialMode=b.dataset.material;document.querySelectorAll('[data-material]').forEach(x=>x.setAttribute('aria-pressed',x===b));applySurface();});
$('#lab-wireframe').onchange=applySurface;
$('#lab-separation').oninput=e=>{separation=Number(e.target.value)/100;applySeparation();};
$('#lab-explode').onclick=()=>{separation=separation>0?0:1;$('#lab-separation').value=separation*100;applySeparation();};
$('#lab-rotate').onclick=e=>{if(!controls)return;controls.autoRotate=!controls.autoRotate;e.currentTarget.setAttribute('aria-pressed',controls.autoRotate);invalidate();};
$('#lab-front').onclick=()=>{if(!controls)return;fitView(true);};
$('#lab-export').onclick=()=>{if(!model)return;renderer.render(scene,camera);const c=document.createElement('canvas');c.width=1200;c.height=1400;const ctx=c.getContext('2d');ctx.fillStyle=currentTheme()==='light'?'#edf0e5':'#252c23';ctx.fillRect(0,0,c.width,c.height);const src=renderer.domElement,scale=Math.min(1160/src.width,1200/src.height);ctx.drawImage(src,(1200-src.width*scale)/2,30,src.width*scale,src.height*scale);ctx.fillStyle=currentTheme()==='light'?'#283025':'#e5e7df';ctx.font='28px sans-serif';ctx.fillText('LEGO Minifigure — Rioforce',55,1290);ctx.font='18px sans-serif';ctx.fillText('CC BY 3.0 · Modified for web · Non-commercial Fan Art study',55,1335);ctx.font='14px sans-serif';ctx.fillText('Source: rioforce.wordpress.com/2013/07/30/download-a-lego-minifigure/ · creativecommons.org/licenses/by/3.0/',55,1370);const a=document.createElement('a');a.download='琢匠-乐高人偶-模型测试.png';a.href=c.toDataURL();a.click();};
try{init();const r=await fetch('/models/rioforce/manifest.json');if(!r.ok)throw new Error('Model manifest unavailable');metadata=await r.json();await selectQuality('high');}catch(e){console.error(e);loading.innerHTML='<span>模型实验室暂时无法启动</span><small>请检查网络与浏览器 WebGL 支持。</small><button onclick="location.reload()">重新加载</button>';}
window.addEventListener('pagehide',e=>{if(e.persisted)return;cancelAnimationFrame(frame);for(const promise of cache.values())promise.then(disposeScene).catch(()=>{});controls?.dispose();draco.dispose();renderer?.dispose();});
