import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useVisibilityObserver from "./useVisibilityObserver";

type Options = {
  onRequestError?: (err: Error, retry: () => void) => void;
  onReleaseError?: (err: Error) => void;
  onLock?: (lock: WakeLockSentinel) => void;
  onRelease?: (lock: WakeLockSentinel) => void;
};

type NonNullable<T> = Exclude<T, null | undefined>; // Remove null and undefined from T

export default function useWakeLock(enabled: boolean, options?: Options) {
  const isVisible = useVisibilityObserver();
  const [isLocked, setIsLocked] = useState(false);
  const [retryNumber, setRetryNumber] = useState(0);
  const retry = useCallback(() => {
    setRetryNumber((retryNumber) => retryNumber + 1);
  }, [setRetryNumber]);

  const wakeLockInFlight = useRef(false);
  const wakeLock = useRef<WakeLockSentinel>();

  const isSupported = "wakeLock" in navigator;

  const optionsRef = useRef(options);
  const onRequestError = useCallback<(err: Error) => void>(
    (err) => {
      if (optionsRef.current?.onRequestError != null) {
        optionsRef.current.onRequestError(err, retry);
      }
    },
    [retry],
  );
  const onReleaseError = useCallback<(err: Error) => void>((err) => {
    if (optionsRef.current?.onReleaseError != null) {
      optionsRef.current.onReleaseError(err);
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
          onRequestError(e);
        })
        .finally(() => {
          wakeLockInFlight.current = false;
        });
    }

    return () => {
      if (wakeLock.current != null && wakeLock.current.released !== true) {
        wakeLock.current.release().catch((e: Error) => {
          onReleaseError(e);
        });
      }
    };
  }, [
    enabled,
    isSupported,
    isVisible,
    setIsLocked,
    onLock,
    onRelease,
    retryNumber, // force retry logic
    onRequestError,
    onReleaseError,
  ]);

  return useMemo(
    () => ({
      isSupported,
      isLocked,
    }),
    [isLocked, isSupported],
  );
}
