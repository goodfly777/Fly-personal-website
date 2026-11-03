import { Component, lazy, Suspense, useCallback, useState, type ReactNode } from 'react';

const StarfieldScene = lazy(() => import('./StarfieldScene'));

class StarfieldBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function Starfield({ paused = false }: { paused?: boolean }) {
  const [failed, setFailed] = useState(false);
  const onFailure = useCallback(() => setFailed(true), []);
  return (
    <div className="site-starfield" aria-hidden="true">
      <StarfieldBoundary>
        <Suspense fallback={null}>
          {!failed && <StarfieldScene onFailure={onFailure} paused={paused} />}
        </Suspense>
      </StarfieldBoundary>
    </div>
  );
}
