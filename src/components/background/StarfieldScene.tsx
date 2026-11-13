import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Points } from '@react-three/drei/core/Points';
import { PointMaterial } from '@react-three/drei/core/PointMaterial';
import type { Points as ThreePoints, PointsMaterial } from 'three';
import { starfieldConfig as config } from './starfieldConfig';
import { advanceRotation, createStarPositions, type RotationState } from './starfieldMotion';
import { useStarfieldEnvironment } from './useStarfieldEnvironment';

function Layer({ positions, pointsRef }: {
  positions: Float32Array; pointsRef?: RefObject<ThreePoints>;
}) {
  const material = useRef<PointsMaterial>(null);
  useEffect(() => {
    // Drei's PointMaterial is a primitive, which Fiber does not auto-dispose.
    const instance = material.current;
    return () => instance?.dispose();
  }, []);
  return (
    <Points name="starfield-cloud" ref={pointsRef} positions={positions} stride={3} frustumCulled>
      <PointMaterial ref={material} transparent color={config.color} size={config.pointSize}
        sizeAttenuation depthWrite={false} />
    </Points>
  );
}

function StarCloud({ active, onFailure }: { active: boolean; onFailure: () => void }) {
  const [positions] = useState(createStarPositions);
  const points = useRef<ThreePoints>(null);
  const rotation = useRef<RotationState>({ angle: 0, skipFrame: true });
  const gl = useThree(state => state.gl);

  useEffect(() => {
    const contextLost = (event: Event) => {
      event.preventDefault();
      onFailure();
    };
    gl.domElement.addEventListener('webglcontextlost', contextLost);
    return () => gl.domElement.removeEventListener('webglcontextlost', contextLost);
  }, [gl, onFailure]);

  useLayoutEffect(() => { rotation.current.skipFrame = true; }, [active]);
  useFrame((_, delta) => {
    if (active && !document.hidden && points.current) {
      points.current.rotation.y = advanceRotation(rotation.current, delta);
    }
  });

  return (
      <group rotation={[0, 0, config.tilt]}>
        <Layer positions={positions} pointsRef={points} />
      </group>
  );
}

export default function StarfieldScene({ onFailure, paused = false }: {
  onFailure: () => void; paused?: boolean;
}) {
  const { frameloop, pixelRatio, active } = useStarfieldEnvironment();
  return (
    <Canvas camera={config.camera} frameloop={paused && frameloop !== 'never' ? 'demand' : frameloop} dpr={pixelRatio}
      gl={{ antialias: false }} fallback={null} style={{ pointerEvents: 'none' }}>
      <color attach="background" args={['#000000']} />
      <StarCloud active={active && !paused} onFailure={onFailure} />
    </Canvas>
  );
}
