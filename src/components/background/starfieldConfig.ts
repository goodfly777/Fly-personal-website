export const starfieldConfig = {
  count: 5001, seed: 0x61c88647, radius: 2.5,
  rotationSpeed: -1 / 15, tilt: -Math.PI / 4,
  color: '#333338', pointSize: 0.005,
  camera: { position: [0, 0, 1] as [number, number, number], fov: 75, near: 0.1, far: 1000 },
  maxDelta: 0.1, desktopPixelRatio: 2, mobileBreakpoint: 768, mobilePixelRatio: 1.5,
};
