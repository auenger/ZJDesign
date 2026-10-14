import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
const chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser=await chromium.launch({headless:true,...(existsSync(chrome)?{executablePath:chrome}:{})});
try {
  const page=await browser.newPage();
  await page.goto(process.env.MODEL_TEST_URL||'http://localhost:5173');
  await page.waitForSelector('body.ready');
  const modelStats=await page.evaluate(async()=>{
    const {createPart}=await import('/src/parts.js');
    let triangles=0,meshes=0;
    for(const slot of ['head','body','arms','legs','hat','armor','weapon','shield']){
      const part=createPart(slot,0,'bronze');
      part.traverse(o=>{
        if(!o.isMesh)return;
        if(o.userData.slot!==slot)throw new Error(`Missing selection slot: ${slot}`);
        for(const name of ['position','normal','uv']){
          if(!o.geometry.attributes[name].array.every(Number.isFinite))throw new Error(`Invalid ${name}: ${slot}`);
        }
        triangles+=o.geometry.attributes.position.count/3;meshes++;
        o.geometry.dispose();o.material.dispose();
      });
    }
    return {triangles,meshes};
  });
  assert.ok(modelStats.triangles<180000,'Detailed figure stays within geometry budget');
  assert.ok(modelStats.meshes<=56,'Small decorations are batched by material');
  console.log('Detailed figure geometry:',modelStats);
} finally {await browser.close();}
