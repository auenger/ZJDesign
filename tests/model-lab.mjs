import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { existsSync,mkdirSync } from 'node:fs';
const chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser=await chromium.launch({headless:true,...(existsSync(chrome)?{executablePath:chrome}:{})});
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[],requests=[],failures=[];
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));page.on('response',r=>{if(r.status()>=400)failures.push(r.url());});
await page.addInitScript(()=>{window.__draws=0;for(const type of [globalThis.WebGLRenderingContext,globalThis.WebGL2RenderingContext])if(type){const draw=type.prototype.drawElements;type.prototype.drawElements=function(...args){window.__draws++;return draw.apply(this,args);};}});
const base=process.env.PREVIEW_URL||'http://localhost:5173';mkdirSync('test-results',{recursive:true});
const ready=()=>page.waitForSelector('body[data-model-ready="true"]',{timeout:60000});
const image=()=>page.locator('canvas').evaluate(c=>c.toDataURL());
try{
 await page.goto(base);await page.waitForSelector('body.ready');assert.ok(!requests.some(u=>/minifigure-.*\.glb/.test(u)),'Main assembly page does not download demo assets');await page.locator('a.model-lab-link').click();await ready();
 assert.equal(await page.locator('#stat-triangles').innerText(),'263,376');assert.equal(await page.locator('#stat-parts').innerText(),'10');assert.ok(!requests.some(u=>u.endsWith('minifigure-standard.glb')),'Light model is lazy loaded');
 await page.locator('#theme-select').selectOption('light');await page.waitForTimeout(350);await page.screenshot({path:'test-results/model-lab-light.png'});
 const before=await image();await page.locator('#lab-explode').click();await page.waitForTimeout(200);assert.notEqual(await image(),before);assert.equal(await page.locator('#lab-explode').getAttribute('aria-pressed'),'true');await page.screenshot({path:'test-results/model-lab-exploded.png'});await page.locator('#lab-explode').click();
 await page.locator('[data-quality="standard"]').click();await ready();assert.equal(await page.locator('#stat-triangles').innerText(),'65,844');const lightModel=await image();await page.locator('#lab-wireframe').check();await page.waitForTimeout(100);assert.notEqual(await image(),lightModel);await page.locator('#lab-wireframe').uncheck();
 await page.locator('[data-quality="high"]').click();await ready();assert.equal(requests.filter(u=>u.endsWith('minifigure-high.glb')).length,1,'Previously loaded precision is cached');
 const original=await image();await page.locator('[data-material="metal"]').click();await page.waitForTimeout(100);assert.notEqual(await image(),original);await page.locator('#theme-select').selectOption('dark');await page.screenshot({path:'test-results/model-lab-metal.png'});
 await page.locator('[data-material="original"]').click();await page.waitForTimeout(350);await page.screenshot({path:'test-results/model-lab-dark.png'});
 const idle=await page.evaluate(()=>window.__draws);await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>window.__draws),idle,'Viewer stops drawing when idle');
 await page.locator('#lab-rotate').click();await page.waitForTimeout(250);assert.ok(await page.evaluate(()=>window.__draws)>idle);await page.locator('#lab-rotate').click();await page.locator('#lab-front').click();
 const dl=page.waitForEvent('download');await page.locator('#lab-export').click();const file=await dl;assert.match(file.suggestedFilename(),/模型测试\.png$/);await file.saveAs('test-results/model-lab-export.png');
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'test-results/model-lab-mobile.png',fullPage:true});
 assert.match(await page.locator('.lab-credit').innerText(),/Rioforce/);assert.match(await page.locator('.lab-credit').innerText(),/禁止商业使用/);assert.deepEqual(errors,[]);assert.deepEqual(failures.filter(u=>!u.endsWith('favicon.ico')),[]);
 // Recover from a real failed model request; the cache must not retain rejected loads.
 await page.route('**/minifigure-high.glb',r=>r.abort());await page.reload();await page.waitForSelector('#lab-retry');await page.unroute('**/minifigure-high.glb');await page.locator('#lab-retry').click();await ready();assert.equal(await page.locator('#stat-parts').innerText(),'10');
 console.log('PASS: source GLB/Draco, lazy loading, both detail levels, model cache, materials, wireframe, exploded view, themes, idle render, rotation, export, mobile and load failure retry.');
}finally{await browser.close();}
