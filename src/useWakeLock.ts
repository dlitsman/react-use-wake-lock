import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useVisibilityObserver from "./useVisibilityObserver";

type Options = {
  onError?: (err: Error, flow: "request" | "release") => void;
  onLock?: (lock: WakeLockSentinel) => void;
  onRelease?: (lock: WakeLockSentinel) => void;
};

type NonNullable<T> = Exclude<T, null | undefined>; // Remove null and undefined from T

export default function useWakeLock(enabled: boolean, options?: Options) {
  const isVisible = useVisibilityObserver();
  const [isLocked, setIsLocked] = useState(false);

  const wakeLockInFlight = useRef(false);
  const wakeLock = useRef<WakeLockSentinel>();

  const isSupported = "wakeLock" in navigator;

  const optionsRef = useRef(options);
  const onError = useCallback<NonNullable<Options["onError"]>>((err, flow) => {
    if (optionsRef.current?.onError != null) {
      optionsRef.current.onError(err, flow);
    }
  }, []);
  const onLock = useCallback<NonNullable<Options["onLock"]>>((lock) => {
    if (optionsRef.current?.onLock != null) {
      optionsRef.current.onLock(lock);
    }
  }, []);
  const onRelease = useCallback<NonNullable<Options["onRelease"]>>((lock) => {
    if (optionsRef.current?.onRelease != null) {
      optionsRef.current.onRelease(lock);
    }
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
