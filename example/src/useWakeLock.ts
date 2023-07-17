import { useCallback, useEffect, useRef, useState } from "react";

function useVisibilityObserver() {
  const [isVisible, setIsVisible] = useState<boolean>(
    document.visibilityState === "visible"
  );

  const handleVisiblilityChange = useCallback(() => {
    console.log('!!!visibility changed')
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

export function useWakeLock(enabled: true) {
    const isVisible = useVisibilityObserver();
    const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null)

    const wakeLockInFlight = useRef(false);

    useEffect(() => {
        // WakeLock is not supported by the browser
        if (!('wakeLock' in navigator)) {
            return;
        }

        // no-op as we don't want to take lock if condition is not met
        if (!enabled || !isVisible) {
            return;
        }

        // We already have requested access and waiting from the browser
        if (wakeLockInFlight.current === true) {
            return;
        }

        wakeLockInFlight.current = true;
        let effectWakeLock: WakeLockSentinel;

        navigator.wakeLock.request('screen').then((lock) => {
            console.log('!!!Got lock')
            effectWakeLock = lock;
            setWakeLock(lock);
        }).finally(() => {
            wakeLockInFlight.current = false;
        })

        return () => {
            if (effectWakeLock != null && effectWakeLock.released !== true) {
                effectWakeLock.release().catch((e) => {
                    console.error('!!!Error', e)
                })
            }
        }

    }, [enabled, isVisible]);

    return {
        wakeLock,
    }

}
