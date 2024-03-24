import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useVisibilityObserver from "./useVisibilityObserver";
import recoverableError from "./recoverableError";

type Options = {
  onError?: (err: Error, type: "request" | "release") => void;
  onLock?: (lock: WakeLockSentinel) => void;
  onRelease?: (lock: WakeLockSentinel) => void;
};

type NonNullable<T> = Exclude<T, null | undefined>; // Remove null and undefined from T

export type UseWakeLockResult = {
  isSupported: boolean;
  isLocked: boolean;
  request: () => void;
  release: () => void;
};

export default function useWakeLock(options?: Options): UseWakeLockResult {
  const isVisible = useVisibilityObserver();
  const [isLocked, setIsLocked] = useState(false);

  const wakeLockInFlight = useRef(false);
  const wakeLockReleasedManually = useRef(false);
  const [lock, setLock] = useState<WakeLockSentinel | null>(null);

  const isSupported = "wakeLock" in navigator;

  const optionsRef = useRef(options);
  const onError = useCallback<NonNullable<Options["onError"]>>((err, type) => {
    if (optionsRef.current?.onError != null) {
      optionsRef.current.onError(err, type);
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
    if (!isSupported) {
      recoverableError("WakeLock is not supported by the browser");
      return;
    }

    if (wakeLockInFlight.current === true) {
      recoverableError("WakeLock request is in progress. noop");
      return;
    }

    if (lock != null && lock.released === false) {
      recoverableError("Already have a lock. noop");
      return;
    }

    wakeLockReleasedManually.current = false;

    try {
      wakeLockInFlight.current = true;
      const wakeLock = await navigator.wakeLock.request("screen");

      wakeLock.addEventListener("release", () => {
        setIsLocked(false);
        onRelease(wakeLock);
      });

      setLock(wakeLock);
      setIsLocked(true);
      onLock(wakeLock);
    } catch (err: unknown) {
      if (err instanceof Error) {
        onError(err, "request");
      } else {
        onError(new Error(`Unknown error type on request`), "request");
      }
    } finally {
      wakeLockInFlight.current = false;
    }
  }, [isSupported, lock, onLock, onRelease, onError]);

  const release = useCallback(async () => {
    if (!isSupported) {
      recoverableError("WakeLock is not supported by the browser");
      return;
    }

    if (lock == null) {
      recoverableError("Trying to release lock without having one: noop");
      return;
    }

    try {
      wakeLockReleasedManually.current = true;
      await lock.release();
    } catch (err: unknown) {
      if (err instanceof Error) {
        onError(err, "release");
      } else {
        onError(new Error(`Unknown error type on release`), "release");
      }
    }
  }, [isSupported, lock, onError]);

  // Automatically re-aquire lock in case if it was lost by losing visibility
  useEffect(() => {
    // WakeLock is not supported by the browser
    if (!isSupported) {
      return;
    }

    if (
      lock != null &&
      isVisible &&
      lock.released &&
      wakeLockReleasedManually.current !== true
    ) {
      void request();
    }
  }, [isSupported, isVisible, lock, request]);

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
