// Development-only browser fixture; not imported by the application or production build.
import React, { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { _roots } from '@react-three/fiber';
import { Starfield } from '../src/components/background/Starfield';
import '../src/styles/background.css';

let reduced = false, hidden = false, blockWebgl = false;
const preference = new EventTarget();
const originalMatchMedia = window.matchMedia.bind(window);
window.matchMedia = query => query === '(prefers-reduced-motion: reduce)'
  ? preference as MediaQueryList
  : originalMatchMedia(query);
// Simulations stay inside this fixture and never affect application tabs.
Object.defineProperty(preference, 'matches', { get: () => reduced, configurable: true });
Object.defineProperty(document, 'hidden', { get: () => hidden, configurable: true });
const originalContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (type, ...args) {
  if (blockWebgl && String(type).startsWith('webgl')) return null;
  return originalContext.call(this, type, ...args);
} as typeof originalContext;

const rootIds = new WeakMap();
const watched = new WeakSet();
let nextRoot = 0, materialDisposals = 0, geometryDisposals = 0;
function observe() {
  const canvas = document.querySelector('.site-starfield canvas') as HTMLCanvasElement | null;
  const root = canvas && _roots.get(canvas);
  const state = root?.store.getState();
  const clouds: any[] = [];
  state?.scene.traverse(node => { if (node.type === 'Points') clouds.push(node); });
  if (state && !rootIds.has(state.gl)) rootIds.set(state.gl, ++nextRoot);
  const layers = clouds.map(cloud => {
    if (!watched.has(cloud)) {
      watched.add(cloud);
      cloud.material.addEventListener('dispose', () => materialDisposals++);
      cloud.geometry.addEventListener('dispose', () => geometryDisposals++);
    }
    let hash = 0;
    for (const value of cloud.geometry.attributes.position.array) hash = Math.imul(hash ^ Math.round(value * 1e6), 31);
    return { name: cloud.name, angle: cloud.rotation.y, hash,
      count: cloud.geometry.attributes.position.count,
      size: cloud.material.size, sizeAttenuation: cloud.material.sizeAttenuation,
      opacity: cloud.material.opacity };
  });
  return {
    canvases: document.querySelectorAll('.site-starfield canvas').length,
    root: state ? rootIds.get(state.gl) : null,
    layers,
    frameloop: state?.frameloop ?? null, renderFrame: state?.gl.info.render.frame ?? null,
    dpr: state?.viewport.dpr ?? null, materialDisposals, geometryDisposals, reduced, hidden,
    dimensions: canvas ? [canvas.width, canvas.height] : null,
  };
}
function Fixture() {
  const [mounted, setMounted] = useState(true);
  const [home, setHome] = useState(true);
  const [snapshot, setSnapshot] = useState({});
  useEffect(() => {
    const timer = setInterval(() => setSnapshot(observe()), 250);
    return () => clearInterval(timer);
  }, []);
  const remount = (blocked: boolean) => {
    setMounted(false);
    blockWebgl = blocked;
    setTimeout(() => setMounted(true), 800);
  };
  return <div className="site-universe" data-background-density={home ? 'normal' : 'quiet'}>
    {mounted && <Starfield />}
    <main style={{ padding: 24, color: 'white', fontFamily: 'monospace' }}>
      <h1>Starfield browser checks</h1>
      <button onClick={() => setHome(value => !value)}>Toggle home</button>{' '}
      <button onClick={() => { reduced = !reduced; preference.dispatchEvent(new Event('change')); }}>Toggle reduced motion</button>{' '}
      <button onClick={() => { hidden = !hidden; document.dispatchEvent(new Event('visibilitychange')); }}>Toggle background</button>{' '}
      <button onClick={() => setMounted(false)}>Unmount</button>{' '}
      <button onClick={() => remount(false)}>Mount normally</button>{' '}
      <button onClick={() => remount(true)}>Mount without WebGL</button>{' '}
      <button onClick={() => {
        const canvas = document.querySelector('canvas');
        canvas?.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext();
      }}>Lose context</button>
      <pre id="snapshot">{JSON.stringify(snapshot, null, 2)}</pre>
      <a href="/">Return to application</a>
    </main>
  </div>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><Fixture /></StrictMode>);
