import { Generator, inSphere } from 'maath/random';
import { starfieldConfig as config } from './starfieldConfig';

export function createStarPositions() {
  return inSphere(new Float32Array(15003), { radius: config.radius }, new Generator(config.seed)) as Float32Array;
}

export type RotationState = { angle: number; skipFrame: boolean };

export function advanceRotation(state: RotationState, delta: number) {
  if (state.skipFrame) {
    state.skipFrame = false;
    return state.angle;
  }
  const elapsed = Number.isFinite(delta) ? Math.max(0, Math.min(delta, config.maxDelta)) : 0;
  state.angle += config.rotationSpeed * elapsed;
  return state.angle;
}
