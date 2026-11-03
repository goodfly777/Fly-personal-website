import { useEffect, useState } from 'react';
import { starfieldConfig as config } from './starfieldConfig';

function readEnvironment() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hidden = document.hidden;
  const mobile = window.innerWidth < config.mobileBreakpoint;
  const cap = mobile ? config.mobilePixelRatio : config.desktopPixelRatio;
  return { reduced, hidden, mobile, pixelRatio: Math.min(window.devicePixelRatio || 1, cap) };
}

export function useStarfieldEnvironment() {
  const [environment, setEnvironment] = useState(readEnvironment);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setEnvironment(previous => {
      const next = readEnvironment();
      return previous.reduced === next.reduced && previous.hidden === next.hidden
        && previous.mobile === next.mobile && previous.pixelRatio === next.pixelRatio ? previous : next;
    });
    preference.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    window.addEventListener('resize', update);
    update();
    return () => {
      preference.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
      window.removeEventListener('resize', update);
    };
  }, []);
  // Keep Canvas configuration authoritative across resize and preference changes.
  const active = !environment.hidden && !environment.reduced;
  return {
    active,
    frameloop: environment.hidden ? 'never' as const : active ? 'always' as const : 'demand' as const,
    pixelRatio: environment.pixelRatio,
  };
}
