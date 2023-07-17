import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function useVisibilityObserver() {
  const [isVisible, setIsVisible] = useState<boolean>(
    document.visibilityState === "visible"
  );

  const handleVisiblilityChange = useCallback(() => {
    setIsVisible(document.visibilityState === "visible");
  }, [])

  useEffect(() => {
    document.addEventListener("visibilitychange", handleVisiblilityChange);

    return () => {
        document.removeEventListener("visibilitychange", handleVisiblilityChange);
    }
  }, []);

  return isVisible;
}


type Options = {
    onError: (err: Error, flow: 'request' | 'release') => void,
    onLock: (lock: WakeLockSentinel) => void,
    onRelease: (lock: WakeLockSentinel) => void,
}

export function useWakeLock(enabled: boolean, options?: Options) {
    const isVisible = useVisibilityObserver();
    const [locked, setIsLocked] = useState(false);

    const wakeLockInFlight = useRef(false);
    const wakeLock = useRef<WakeLockSentinel>();

    useEffect(() => {
        // WakeLock is not supported by the browser
        if (!('wakeLock' in navigator)) {
            return;
        }

        if (enabled && isVisible && wakeLockInFlight.current === false) {
            wakeLockInFlight.current = true;

            navigator.wakeLock.request('screen').then((lock) => {
                lock.addEventListener('release', () => {
                    setIsLocked(false);
                    options?.onRelease(lock);
                });
                wakeLock.current = lock;
                setIsLocked(true);
                options?.onLock(lock);
            }).catch(e => {
                options?.onError(e, 'request')
            }).finally(() => {
                wakeLockInFlight.current = false;
            })
        }

        return () => {
            if (wakeLock.current != null && wakeLock.current.released !== true) {
                wakeLock.current.release().catch((e) => {
                    options?.onError(e, 'release');
                })
            }
        }

    }, [enabled, isVisible, setIsLocked]);

    return useMemo(() => ({
        locked,
    }), [wakeLock, locked])

}
