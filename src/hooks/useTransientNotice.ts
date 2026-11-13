import { useCallback, useEffect, useState } from 'react';

export const useTransientNotice = (duration = 3000) => {
  const [notice, setNotice] = useState({ message: '', revision: 0 });
  const notify = useCallback((message: string) => {
    // Repeated identical messages also restart their display time.
    setNotice(current => ({ message, revision: current.revision + 1 }));
  }, []);

  useEffect(() => {
    if (!notice.message) return;
    const timer = window.setTimeout(() => {
      setNotice(current => ({ ...current, message: '' }));
    }, duration);
    return () => window.clearTimeout(timer);
  }, [notice.revision, notice.message, duration]);

  return [notice.message, notify] as const;
};
