import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Check visibility of the document to re-acquire the lock once browser is active/visible again
function useVisibilityObserver() {
  const [isVisible, setIsVisible] = useState<boolean>(
    document.visibilityState === "visible",
  );

  const handleVisiblilityChange = useCallback(() => {
    setIsVisible(document.visibilityState === "visible");
  }, [  ]);

  useEffect(() => {
    document.addEventListener("visibilitychange", handleVisiblilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisiblilityChange);
    };
  }, [handleVisiblilityChange]);

  return isVisible;
}

type Options = {
  onError: (err: Error, flow: "request" | "release") => void;
  onLock: (lock: WakeLockSentinel) => void;
  onRelease: (lock: WakeLockSentinel) => void;
};

export default function useWakeLock(enabled: boolean, options?: Options) {
  const isVisible = useVisibilityObserver();
  const [isLocked, setIsLocked] = useState(false);

  const wakeLockInFlight = useRef(false);
  const wakeLock = useRef<WakeLockSentinel>();

  const isSupported = "wakeLock" in navigator;

  const optionsRef = useRef(options);
  const onError = useCallback<Options["onError"]>((err, flow) => {
    optionsRef.current?.onError(err, flow);
  }, []);
  const onLock = useCallback<Options["onLock"]>((lock) => {
    optionsRef.current?.onLock(lock);
  }, []);
  const onRelease = useCallback<Options["onRelease"]>((lock) => {
    optionsRef.current?.onRelease(lock);
  }, []);

  useEffect(() => {
    // WakeLock is not supported by the browser
    if (!isSupported) {
      return;
    }

    const hasLockOrInFlight =
      wakeLockInFlight.current === true ||
      (wakeLock.current != null && wakeLock.current.released !== true);

    if (enabled && isVisible && !hasLockOrInFlight) {
      wakeLockInFlight.current = true;

      navigator.wakeLock
        .request("screen")
        .then((lock) => {
          lock.addEventListener("release", () => {
            setIsLocked(false);
            onRelease(lock);
          });
          wakeLock.current = lock;
          setIsLocked(true);
          onLock(lock);
        })
        .catch((e: Error) => {
          onError(e, "request");
        })
        .finally(() => {
          wakeLockInFlight.current = false;
        });
    }

    return () => {
      if (wakeLock.current != null && wakeLock.current.released !== true) {
        wakeLock.current.release().catch((e: Error) => {
          onError(e, "release");
        });
      }
    };
  }, [
    enabled,
    isSupported,
    isVisible,
    setIsLocked,
    onError,
    onLock,
    onRelease,
  ]);

  return useMemo(
    () => ({
      isSupported,
      isLocked,
    }),
    [isLocked, isSupported],
  );
}
