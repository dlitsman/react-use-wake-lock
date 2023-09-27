import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useVisibilityObserver from "./useVisibilityObserver";

const recoverableError = (error: string) => {
  console.warn(`[react-use-wake-lock]: ${error}`);
};

type Options = {
  onRequestError?: (err: Error) => void;
  onReleaseError?: (err: Error) => void;
  onLock?: (lock: WakeLockSentinel) => void;
  onRelease?: (lock: WakeLockSentinel) => void;
};

type NonNullable<T> = Exclude<T, null | undefined>; // Remove null and undefined from T

export default function useWakeLock(enabled: boolean, options?: Options) {
  const isVisible = useVisibilityObserver();
  const [isLocked, setIsLocked] = useState(false);

  const wakeLockInFlight = useRef(false);
  const [lock, setLock] = useState<WakeLockSentinel | null>(null);

  const isSupported = "wakeLock" in navigator;

  const optionsRef = useRef(options);
  const onRequestError = useCallback<(err: Error) => void>((err) => {
    if (optionsRef.current?.onRequestError != null) {
      optionsRef.current.onRequestError(err);
    }
  }, []);
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

  const request = useCallback(async () => {
    if (isSupported) {
      recoverableError("WakeLock is not supported by the browser");
      return;
    }

    try {
      const wakeLock = await navigator.wakeLock.request("screen");

      wakeLock.addEventListener("release", () => {
        setIsLocked(false);
        setLock(null);
        onRelease(wakeLock);
      });

      setLock(wakeLock);
      setIsLocked(true);
      onLock(wakeLock);
    } catch (err: unknown) {
      if (err instanceof Error) {
        onRequestError(err);
      } else {
        onRequestError(new Error(`Unknown error type`));
      }
    }
  }, [isSupported, onLock, onRelease, onRequestError]);

  const release = useCallback(async () => {
    if (isSupported) {
      recoverableError("WakeLock is not supported by the browser");
      return;
    }

    if (lock == null) {
      recoverableError("Trying to release lock without having one: noop");
      return;
    }

    try {
      await lock.release();
    } catch (err: unknown) {
      if (err instanceof Error) {
        onRequestError(err);
      } else {
        onRequestError(new Error(`Unknown error type`));
      }
    }
  }, [isSupported, lock, onRequestError]);

  useEffect(() => {
    // WakeLock is not supported by the browser
    if (!isSupported) {
      return;
    }

    if (
      lock != null &&
      isVisible &&
      lock.released &&
      wakeLockInFlight.current !== true
    ) {
      request()
        .then(() => {
          wakeLockInFlight.current = false;
        })
        .catch(() => {});
    }
  }, [
    enabled,
    isSupported,
    isVisible,
    setIsLocked,
    onLock,
    onRelease,
    onRequestError,
    onReleaseError,
    lock,
    request,
  ]);

  return useMemo(
    () => ({
      isSupported,
      isLocked,
      request,
      release,
    }),
    [isLocked, isSupported, release, request],
  );
}
