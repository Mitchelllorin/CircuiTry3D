import { chromium } from 'playwright';
import { CHROME } from './_harness.mjs';
import fs from 'fs';
const browser = await chromium.launch({ headless: true, executablePath: CHROME,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 600, height: 600 } })).newPage();
page.on('pageerror', e => console.log('PAGEERROR ' + e.message.slice(0,300)));
await page.goto('http://localhost:3000/#/app', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(8000);
const url = await page.evaluate(async () => {
  const THREE = await import('/node_modules/.vite/deps/three.js?import').catch(() => import('three'));
  const { ICON_MODELS } = await import('/src/components/icons3d/iconModels.ts');
  const { RoomEnvironment } = await import('/node_modules/three/examples/jsm/environments/RoomEnvironment.js');
  const PX = 512;
  const canvas = document.createElement('canvas'); canvas.width = PX; canvas.height = PX;
  const r = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
  r.setSize(PX, PX, false); r.setPixelRatio(1);
  const pmrem = new THREE.PMREMGenerator(r);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const scene = new THREE.Scene(); scene.environment = env;
  const key = new THREE.DirectionalLight(0xfff0dd, 2.2); key.position.set(2,3,4); scene.add(key);
  const rim = new THREE.DirectionalLight(0x66ddff, 1.6); rim.position.set(-3,-1,-2); scene.add(rim);
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const obj = ICON_MODELS.build(); scene.add(obj);
  const box = new THREE.Box3().setFromObject(obj); const sz = new THREE.Vector3(); box.getSize(sz);
  const cam = new THREE.OrthographicCamera(-1,1,1,-1,0.01,100);
  const m = Math.max(sz.x, sz.y) * 0.58; cam.left=-m; cam.right=m; cam.top=m; cam.bottom=-m; cam.updateProjectionMatrix();
  cam.position.set(0,0,10); cam.lookAt(0,0,0);
  r.render(scene, cam);
  return canvas.toDataURL('image/png');
});
if (url && url.startsWith('data:')) { fs.writeFileSync('tools/probe/wrench-big.png', Buffer.from(url.split(',')[1],'base64')); console.log('saved wrench-big.png'); }
else console.log('no image: ' + String(url).slice(0,200));
await browser.close();
