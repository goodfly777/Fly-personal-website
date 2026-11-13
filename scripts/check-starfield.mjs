// Checks actual particle math and environment behavior; GPU checks use the browser fixture.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { Euler, Vector3, PerspectiveCamera } from 'three';
const require = createRequire(import.meta.url);
const events = { window: new Map(), document: new Map(), media: new Map() };
const preference = { matches: false, addEventListener: (n,f) => events.media.set(n,f), removeEventListener: n => events.media.delete(n) };
const windowMock = { innerWidth: 1440, devicePixelRatio: 3, matchMedia: () => preference,
  addEventListener: (n,f) => events.window.set(n,f), removeEventListener: n => events.window.delete(n) };
const documentMock = { hidden: false, addEventListener: (n,f) => events.document.set(n,f), removeEventListener: n => events.document.delete(n) };
function load(file, mocks = {}) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/background/' + file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { module, exports: module.exports, Float32Array, window: windowMock, document: documentMock,
    require: name => name in mocks ? mocks[name] : require(name) }, { filename: file });
  return module.exports;
}
const configuration = load('starfieldConfig.ts');
const config = configuration.starfieldConfig;
const motion = load('starfieldMotion.ts', { './starfieldConfig': configuration });
const positions = motion.createStarPositions(), original = positions.slice();
assert.equal(positions.length, 15003);
assert.deepEqual(positions, motion.createStarPositions());
const tilt = new Euler(0, 0, config.tilt), spin = new Euler(0, -.01, 0);
for (let i=0;i<positions.length;i+=3) {
 const p = new Vector3().fromArray(positions,i), r=p.length();
 assert.ok(Number.isFinite(r) && r<=2.500001);
 assert.ok(Math.abs(p.applyEuler(spin).applyEuler(tilt).length()-r)<1e-10);
}
assert.deepEqual(positions, original);
const axis = new Vector3(0,1,0).applyEuler(tilt);
assert.ok(Math.abs(axis.x-Math.SQRT1_2)<1e-12 && Math.abs(axis.y-Math.SQRT1_2)<1e-12);
for (const aspect of [1440/900,390/844]) {
 const camera = new PerspectiveCamera(75,aspect,.1,1000);
 camera.position.set(0,0,1); camera.lookAt(0,0,0); camera.updateMatrixWorld();
 for (const z of [.5,-.5]) {
  const p=new Vector3(0,0,z), before=p.clone().project(camera);
  const world=p.clone().applyEuler(spin).applyEuler(tilt);
  assert.ok(world.distanceTo(p.clone().applyEuler(tilt).applyEuler(spin))>0.001);
  const after=world.project(camera);
  assert.ok((after.x-before.x)*z<0 && (after.y-before.y)*z>0);
 }
}
for (const fps of [30,60,120]) {
 const state={angle:0,skipFrame:true}; motion.advanceRotation(state,999);
 for(let i=0;i<fps*60;i++) motion.advanceRotation(state,1/fps);
 assert.ok(Math.abs(state.angle+4)<1e-11);
}
const paused={angle:-1,skipFrame:true};
assert.equal(motion.advanceRotation(paused,999),-1);
assert.ok(Math.abs(motion.advanceRotation(paused,999)+1+1/150)<1e-12);

// Hook replay keeps the same state cell across prop and environment changes.
let stateCell, effect;
const environment = load('useStarfieldEnvironment.ts', {
  './starfieldConfig': configuration,
  react: {
    useState: init => {
      if (!stateCell) stateCell = typeof init === 'function' ? init() : init;
      return [stateCell, next => { stateCell = typeof next === 'function' ? next(stateCell) : next; }];
    },
    useEffect: callback => { effect = callback; },
  },
});
const render = animate => environment.useStarfieldEnvironment(animate);
assert.equal(render().frameloop, 'always');
assert.equal(render(true).frameloop, 'always');
let cleanup = effect();
const cell = stateCell;
events.window.get('resize')(); assert.equal(stateCell, cell);
assert.equal(render(false).frameloop, 'always');
assert.equal(render(true).frameloop, 'always');
windowMock.innerWidth = 390; events.window.get('resize')();
assert.equal(render(true).frameloop, 'always'); assert.equal(render(true).pixelRatio, 1.5);
windowMock.innerWidth = 767; events.window.get('resize')(); assert.equal(render(true).active, true);
windowMock.innerWidth = 768; events.window.get('resize')(); assert.equal(render(true).active, true);
preference.matches = true; events.media.get('change')(); assert.equal(render(true).frameloop, 'demand');
documentMock.hidden = true; events.document.get('visibilitychange')(); assert.equal(render(true).frameloop, 'never');
documentMock.hidden = false; events.document.get('visibilitychange')(); assert.equal(render(true).frameloop, 'demand');
preference.matches = false; events.media.get('change')(); assert.equal(render(true).frameloop, 'always');
cleanup(); assert.ok(Object.values(events).every(map => map.size === 0));
cleanup = effect(); assert.ok(Object.values(events).every(map => map.size === 1)); cleanup();

console.log('PASS: seeded solid sphere, invariant radii, Rz × Ry, projected axis/directions, FPS independence, pause/resume, mobile, DPR and listener cleanup.');
