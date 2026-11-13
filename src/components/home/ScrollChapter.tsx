import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useAnimationControls, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import placeholder from '../../assets/night-placeholder.svg';
const MotionEnabled = createContext(false);
const StageContext = createContext<{ enabled: boolean; current: number; previous: number | null; direction: number; busy: boolean; go: (index: number, keyboard?: boolean) => void } | null>(null);
const chapterLabels = ['个人介绍', '精选博客', '生活与摄影', '保持联系'];
export function ChapterStage({ children, current, onChange }: { children: ReactNode; current: number; onChange: (index: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [previous, setPrevious] = useState<number | null>(null);
  const [direction, setDirection] = useState(1);
  const [busy, setBusy] = useState(false);
  const state = useRef({ current, busy, reduced });
  state.current = { current, busy, reduced };
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const lastWheel = useRef(0);
  const needsQuiet = useRef(false);
  const goRef = useRef<(index: number, keyboard?: boolean) => void>(() => {});
  const go = (index: number, keyboard = false) => {
    const stage = ref.current;
    if (!stage || state.current.busy || index < 0 || index >= chapterLabels.length || index === state.current.current) return;
    const chapters = stage.querySelectorAll<HTMLElement>('.cosmic-chapter');
    const scroller = chapters[index]?.querySelector<HTMLElement>('.cosmic-chapter-scroll');
    if (scroller) scroller.scrollTop = 0;
    state.current.busy = true; needsQuiet.current = true;
    setBusy(true); setDirection(index > state.current.current ? 1 : -1);
    setPrevious(state.current.current); onChange(index);
    const finish = () => {
      setPrevious(null); setBusy(false); state.current.busy = false;
      if (keyboard) {
        const target = chapters[index]?.querySelector<HTMLElement>('h1,h2') || chapters[index];
        target?.setAttribute('tabindex', '-1'); target?.focus({ preventScroll: true });
      }
    };
    timer.current = setTimeout(finish, reduced ? 0 : 800);
  };
  goRef.current = go;
  useEffect(() => {
    const stage = ref.current;
    if (!stage) return;
    let total = 0;
    let touch: { x: number; y: number; top: number; max: number; nested: boolean; consumed: boolean } | null = null;
    let scrollGesture = false;
    const blocked = (target: EventTarget | null, keyboard = false) => {
      if (document.hidden || stage.closest('.cosmic-layout')?.querySelector('[role="dialog"], nav button[aria-expanded="true"]')) return true;
      if (!(target instanceof Element)) return true;
      if (target.closest('input,textarea,select,[contenteditable="true"],[role="dialog"]')) return true;
      return keyboard ? !!target.closest('a,button,nav') : !!target.closest('nav');
    };
    const scroller = () => stage.querySelectorAll('.cosmic-chapter')[state.current.current]?.querySelector<HTMLElement>('.cosmic-chapter-scroll');
    const canScroll = (el: HTMLElement, delta: number) => delta > 0 ? el.scrollTop < el.scrollHeight - el.clientHeight - 2 : el.scrollTop > 2;
    const nestedScroll = (target: EventTarget | null, delta: number) => {
      for (let el = target instanceof Element ? target : null; el && el !== stage; el = el.parentElement) {
        if (el instanceof HTMLElement && !el.classList.contains('cosmic-chapter-scroll') && /(auto|scroll)/.test(getComputedStyle(el).overflowY) && canScroll(el, delta)) return true;
      }
      return false;
    };
    const wheel = (event: WheelEvent) => {
      if (!stage.contains(event.target as Node) || blocked(event.target) || event.ctrlKey || !event.deltaY || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      const now = performance.now(), gap = now - lastWheel.current;
      lastWheel.current = now;
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stage.clientHeight : 1);
      const el = scroller();
      if (state.current.busy) { event.preventDefault(); total = 0; needsQuiet.current = true; return; }
      if (gap > 180) { scrollGesture = false; total = 0; }
      if (nestedScroll(event.target, delta)) return;
      if (el && canScroll(el, delta)) { scrollGesture = true; total = 0; return; }
      event.preventDefault();
      // A gesture used for reading cannot immediately turn into a chapter switch.
      if (scrollGesture) return;
      if (needsQuiet.current && gap <= 180) return;
      needsQuiet.current = false;
      if (Math.sign(total) !== Math.sign(delta)) total = 0;
      total += delta;
      if (Math.abs(total) >= 80) { total = 0; goRef.current(state.current.current + Math.sign(delta)); }
    };
    const key = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || blocked(event.target, true)) return;
      const delta = ['ArrowDown','PageDown',' '].includes(event.key) ? (event.shiftKey ? -1 : 1) : ['ArrowUp','PageUp'].includes(event.key) ? -1 : 0;
      if (!delta) return;
      event.preventDefault();
      if (state.current.busy) return;
      const el = scroller();
      if (el && canScroll(el, delta)) {
        el.scrollBy({ top: delta * (event.key.startsWith('Arrow') ? 48 : el.clientHeight * 0.8), behavior: state.current.reduced ? 'instant' : 'smooth' });
      } else goRef.current(state.current.current + delta, true);
    };
    const start = (event: TouchEvent) => {
      if (event.touches.length !== 1 || blocked(event.target) || !stage.contains(event.target as Node)) { touch = null; return; }
      const el = scroller(), point = event.touches[0];
      touch = { x: point.clientX, y: point.clientY, top: el?.scrollTop || 0, max: el ? el.scrollHeight - el.clientHeight : 0, nested: nestedScroll(event.target, 1) || nestedScroll(event.target, -1), consumed: false };
    };
    const move = (event: TouchEvent) => {
      if (!touch || event.touches.length !== 1 || blocked(event.target)) return;
      const dy = touch.y - event.touches[0].clientY, dx = touch.x - event.touches[0].clientX;
      if (Math.abs(dy) <= Math.abs(dx) * 1.5) return;
      if (touch.nested || (dy > 0 ? touch.top < touch.max - 2 : touch.top > 2)) return;
      if (window.getSelection()?.toString()) return;
      event.preventDefault();
      if (state.current.busy || touch.consumed || Math.abs(dy) < 80) return;
      touch.consumed = true;
      goRef.current(state.current.current + Math.sign(dy));
    };
    const end = () => { touch = null; };
    window.addEventListener('wheel', wheel, { passive: false }); window.addEventListener('keydown', key);
    stage.addEventListener('touchstart', start, { passive: true }); stage.addEventListener('touchmove', move, { passive: false });
    stage.addEventListener('touchend', end); stage.addEventListener('touchcancel', end);
    return () => {
      window.removeEventListener('wheel', wheel); window.removeEventListener('keydown', key);
      stage.removeEventListener('touchstart', start); stage.removeEventListener('touchmove', move);
      stage.removeEventListener('touchend', end); stage.removeEventListener('touchcancel', end); clearTimeout(timer.current);
    };
  }, []);
  return <StageContext.Provider value={{ enabled: true, current, previous, direction, busy, go }}><MotionEnabled.Provider value={!reduced}>
    <div ref={ref} className="cosmic-stage is-fullscreen" data-current-chapter={current}>
      <nav className="cosmic-chapter-nav" aria-label="首页章节">{chapterLabels.map((label, i) => <button className="chapter-tab" key={label} type="button" aria-label={'切换至' + label} aria-current={i === current ? 'step' : undefined} disabled={busy} onClick={() => go(i, true)}><span>{i === 0 ? '首页' : i === chapterLabels.length - 1 ? 'END' : '0' + i}</span><span className="cosmic-chapter-label">{label}</span></button>)}</nav>
      {children}

    </div>
  </MotionEnabled.Provider></StageContext.Provider>;
}
export function ScrollChapter({ children, index, id, label }: { children: ReactNode; index: number; id: string; label: string }) {
  const stage = useContext(StageContext);
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const hidden = !!stage?.enabled && stage.current !== index;
  useEffect(() => { if (ref.current) ref.current.inert = hidden; }, [hidden]);
  const visible = !stage?.enabled || stage.current === index || stage.previous === index;
  const entering = stage?.current === index;
  const direction = stage?.direction || 1;
  const controls = useAnimationControls();
  useEffect(() => {
    if (!stage?.enabled) { controls.set({ y: '0%', opacity: 1 }); return; }
    if (entering) {
      if (stage.busy && stage.previous !== null && stage.previous !== index) controls.set({ y: `${direction * 100}%`, opacity: 1 });
      void controls.start({ y: '0%', opacity: 1, transition: { duration: stage.busy && !reduced ? 0.8 : 0, ease: [0.22, 1, 0.36, 1] } });
    } else if (stage.previous === index) {
      void controls.start({ y: `${direction * -12}%`, opacity: 0, transition: { duration: reduced ? 0 : 0.8, ease: [0.22, 1, 0.36, 1] } });
    } else controls.set({ y: `${direction * 100}%`, opacity: 0 });
  }, [stage?.enabled, stage?.busy, stage?.previous, entering, direction, index, controls, reduced]);
  return <motion.section ref={ref} id={id} aria-label={label} aria-hidden={hidden || undefined} className="cosmic-chapter"
    initial={false} animate={controls}
    transition={{ duration: stage?.enabled ? 0.8 : 0, ease: [0.22, 1, 0.36, 1] }} style={{ visibility: visible ? 'visible' : 'hidden', zIndex: entering ? 2 : 1 }}>
    <div className="cosmic-chapter-surface"><div className="cosmic-chapter-scroll"><div className="cosmic-container">{children}</div></div></div>
  </motion.section>;
}
export function ExploreNext() {
  const stage = useContext(StageContext);
  return <button type="button" className="cosmic-scroll-hint" onClick={() => stage?.go(1)}>↓ 向下探索 <span>SCROLL TO EXPLORE</span></button>;
}
export function ChapterPhoto({ src, alt, lazy = false }: { src: string; alt: string; lazy?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const enabled = useContext(MotionEnabled);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [20, -20]);
  return <div className="cosmic-photo" ref={ref}><motion.img src={src} alt={alt} loading={lazy ? 'lazy' : 'eager'} style={{ y: enabled ? y : 0 }} onError={event => { event.currentTarget.onerror = null; if (event.currentTarget.src !== new URL(placeholder, window.location.href).href) event.currentTarget.src = placeholder; }} /></div>;
}
