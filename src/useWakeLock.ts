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
        onRequestError(err);
      } else {
        onRequestError(new Error(`Unknown error type on request`));
      }
    } finally {
      wakeLockInFlight.current = false;
    }
  }, [isSupported, lock, onLock, onRelease, onRequestError]);

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
      await lock.release();
    } catch (err: unknown) {
      if (err instanceof Error) {
        onReleaseError(err);
      } else {
        onReleaseError(new Error(`Unknown error type on release`));
      }
    }
  }, [isSupported, lock, onReleaseError]);

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
      request().catch((e: unknown) => {
        const err = (e as Error).message;
        recoverableError(`Unknown error during auto-renewal: ${err} `);
      });
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
