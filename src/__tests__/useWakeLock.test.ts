const useVisibilityObserverMockFn = jest.fn();
jest.mock("../useVisibilityObserver", () => {
  return useVisibilityObserverMockFn;
});

const recoverableError = jest.fn();
jest.mock("../recoverableError", () => {
  return recoverableError;
});

import { act, renderHook } from "@testing-library/react";
import useWakeLock from "../useWakeLock";

const releaseMockFn = jest.fn<Promise<boolean>, []>();
class RequestResponseMock {
  callback: (() => void) | null = null;
  released: boolean = false;

  public addEventListener(name: string, callback: () => void) {
    this.callback = callback;
  }

  public release(): Promise<boolean> {
    if (this.callback != null) {
      this.callback();
    }
    this.released = true;
    return releaseMockFn();
  }
}
const requestMockFn = jest.fn<Promise<RequestResponseMock>, []>();

describe("useWakeLock", () => {
  jest.useFakeTimers();

  let wakeLockInternal: Promise<RequestResponseMock> | null = null;

  beforeEach(() => {
    wakeLockInternal = null;
    recoverableError.mockClear();
    requestMockFn.mockClear();
    releaseMockFn.mockClear();
    useVisibilityObserverMockFn.mockClear();

    useVisibilityObserverMockFn.mockImplementation(() => {
      return true;
    });
    releaseMockFn.mockImplementation(() => {
      return Promise.resolve(true);
    });

    requestMockFn.mockImplementation(() => {
      wakeLockInternal = Promise.resolve(new RequestResponseMock());
      return wakeLockInternal;
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    (global.navigator as any).wakeLock = {
      request: requestMockFn,
    };
  });

  it("Acquires lock when requested and feature is supported", async () => {
    const { result } = renderHook(() => useWakeLock());
    expect(result.current).toMatchObject({
      isSupported: true,
      isLocked: false,
    });

    await act(async () => {
      result.current.request();
      await jest.runAllTimersAsync();
    });
    expect(requestMockFn).toBeCalledTimes(1);

    expect(result.current).toMatchObject({
      isSupported: true,
      isLocked: true,
    });
  });

  it("Ignores second request when already got lock", async () => {
    const { result } = renderHook(() => useWakeLock());
    expect(result.current).toMatchObject({
      isSupported: true,
      isLocked: false,
    });

    await act(async () => {
      result.current.request();
      await jest.runAllTimersAsync();
    });
    expect(requestMockFn).toBeCalledTimes(1);

    // requesting it again
    await act(async () => {
      result.current.request();
      await jest.runAllTimersAsync();
    });
    // still requested 1 time
    expect(requestMockFn).toBeCalledTimes(1);
    // produces warning
    expect(recoverableError).toBeCalledWith("Already have a lock. noop");

    expect(result.current).toMatchObject({
      isSupported: true,
      isLocked: true,
    });
  });

  it("Ignores request when wakeLock is in progress", async () => {
    requestMockFn.mockImplementation(() => {
      return new Promise<RequestResponseMock>(() => {});
    });

    const { result } = renderHook(() => useWakeLock());
    expect(result.current).toMatchObject({
      isSupported: true,
      isLocked: false,
    });

    await act(async () => {
      result.current.request();
      await jest.runAllTimersAsync();
    });
    expect(requestMockFn).toBeCalledTimes(1);

    // requesting it again
    await act(async () => {
      result.current.request();
      await jest.runAllTimersAsync();
    });
    // still requested 1 time
    expect(requestMockFn).toBeCalledTimes(1);
    // produces warning
    expect(recoverableError).toBeCalledWith(
      "WakeLock request is in progress. noop",
    );
  });

  it("Ignores request when feature is not supported", async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    delete (global.navigator as any).wakeLock;

    const { result } = renderHook(() => useWakeLock());
    expect(result.current).toMatchObject({
      isSupported: false,
      isLocked: false,
    });

    await act(async () => {
      result.current.request();
      await jest.runAllTimersAsync();
    });

    // produces warning
    expect(recoverableError).toBeCalledWith(
      "WakeLock is not supported by the browser",
    );

    expect(result.current).toMatchObject({
      isSupported: false,
      isLocked: false,
    });
  });

  it("Not requesting lock if feature is not supported", async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    delete (global.navigator as any).wakeLock;

    const { result } = renderHook(() => useWakeLock());
    expect(result.current).toMatchObject({
      isSupported: false,
      isLocked: false,
    });
    expect(requestMockFn).toBeCalledTimes(0);

    await act(async () => {
      result.current.request();
      await jest.runAllTimersAsync();
    });

    expect(requestMockFn).toBeCalledTimes(0);

    expect(result.current).toMatchObject({
      isSupported: false,
      isLocked: false,
    });
  });

  it("Calls onLock option when acquired a lock", async () => {
    const onLock = jest.fn();

    const { result } = renderHook(() =>
      useWakeLock({
        onLock,
      }),
    );

    act(() => {
      result.current.request();
    });

    expect(onLock).toBeCalledTimes(0);
    expect(requestMockFn).toBeCalledTimes(1);

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    expect(result.current).toMatchObject({
      isSupported: true,
      isLocked: true,
    });
    expect(onLock).toBeCalledTimes(1);
    expect(onLock).toMatchSnapshot();
  });

  it("Calls onRelease when lock is released", async () => {
    const onRelease = jest.fn();

    const { result, rerender } = renderHook(() =>
      useWakeLock({
        onRelease,
      }),
    );

    act(() => {
      result.current.request();
    });

    expect(onRelease).toBeCalledTimes(0);
    expect(requestMockFn).toBeCalledTimes(1);

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    expect(result.current).toMatchObject({
      isSupported: true,
      isLocked: true,
    });

    await act(async () => {
      const lock = await wakeLockInternal;
      await lock?.release();
    });

    act(() => {
      rerender();
    });

    expect(result.current).toMatchObject({
      isSupported: true,
      isLocked: false,
    });
    expect(onRelease).toBeCalledTimes(1);
  });

  it("Calls onRelease when lock is released", async () => {
    const onRelease = jest.fn();

    const { result, rerender } = renderHook(() =>
      useWakeLock({
        onRelease,
      }),
    );

    act(() => {
      result.current.request();
    });

    expect(onRelease).toBeCalledTimes(0);
    expect(requestMockFn).toBeCalledTimes(1);

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    expect(result.current).toMatchObject({
      isSupported: true,
      isLocked: true,
    });

    await act(async () => {
      const lock = await wakeLockInternal;
      await lock?.release();
    });

    act(() => {
      rerender();
    });

    expect(result.current).toMatchObject({
      isSupported: true,
      isLocked: false,
    });
    expect(onRelease).toBeCalledTimes(1);
  });

  describe("request", () => {
    it("Calls onError when errored during request", async () => {
      const onError = jest.fn();

      requestMockFn.mockImplementation(() => {
        return Promise.reject(new Error("Fake error during request"));
      });

      const { result } = renderHook(() =>
        useWakeLock({
          onError,
        }),
      );

      expect(onError).toBeCalledTimes(0);
      expect(requestMockFn).toBeCalledTimes(0);

      act(() => {
        result.current.request();
      });

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(requestMockFn).toBeCalledTimes(1);

      expect(result.current).toMatchObject({
        isSupported: true,
        isLocked: false,
      });

      expect(onError).toBeCalledWith(
        new Error("Fake error during request"),
        "request",
      );
    });

    it("Calls onError for unknown types of errors", async () => {
      const onError = jest.fn();

      requestMockFn.mockImplementation(() => {
        return Promise.reject("test string");
      });

      const { result } = renderHook(() =>
        useWakeLock({
          onError,
        }),
      );

      expect(onError).toBeCalledTimes(0);
      expect(requestMockFn).toBeCalledTimes(0);

      act(() => {
        result.current.request();
      });

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(requestMockFn).toBeCalledTimes(1);

      expect(result.current).toMatchObject({
        isSupported: true,
        isLocked: false,
      });

      expect(onError).toBeCalledTimes(1);
      expect(onError).toBeCalledWith(
        new Error("Unknown error type on request"),
        "request",
      );
    });

    it("Works as expected in case if no onError handled provided but hit error", async () => {
      requestMockFn.mockImplementation(() => {
        return Promise.reject(new Error("Fake error during request"));
      });

      const { result, rerender } = renderHook(() => useWakeLock());

      act(() => {
        result.current.request();
      });

      expect(requestMockFn).toBeCalledTimes(1);

      act(() => {
        rerender();
      });

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(result.current).toMatchObject({
        isSupported: true,
        isLocked: false,
      });
    });
  });

  describe("release", () => {
    it("Calls onReleaseError when errored during release", async () => {
      const onError = jest.fn();
      releaseMockFn.mockImplementation(() => {
        return Promise.reject(new Error("Fake error during release"));
      });

      const { result } = renderHook(() =>
        useWakeLock({
          onError,
        }),
      );

      act(() => {
        result.current.request();
      });

      expect(onError).toBeCalledTimes(0);
      expect(requestMockFn).toBeCalledTimes(1);

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(result.current).toMatchObject({
        isSupported: true,
        isLocked: true,
      });

      act(() => {
        result.current.release();
      });

      expect(result.current).toMatchObject({
        isSupported: true,
        isLocked: false,
      });

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(onError).toBeCalledTimes(1);
      expect(onError).toBeCalledWith(
        new Error("Fake error during release"),
        "release",
      );
    });

    it("Handles unknown type of release error", async () => {
      const onError = jest.fn();
      releaseMockFn.mockImplementation(() => {
        return Promise.reject("test string");
      });

      const { result } = renderHook(() =>
        useWakeLock({
          onError,
        }),
      );

      act(() => {
        result.current.request();
      });

      expect(onError).toBeCalledTimes(0);
      expect(requestMockFn).toBeCalledTimes(1);

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(result.current).toMatchObject({
        isSupported: true,
        isLocked: true,
      });

      act(() => {
        result.current.release();
      });

      expect(result.current).toMatchObject({
        isSupported: true,
        isLocked: false,
      });

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(onError).toBeCalledTimes(1);
      expect(onError).toBeCalledWith(
        new Error("Unknown error type on release"),
        "release",
      );
    });

    it("Works as expected in case if no onReleaseError handled provided but hit error", async () => {
      releaseMockFn.mockImplementation(() => {
        return Promise.reject(new Error("Fake error during release"));
      });

      const { result } = renderHook(() => useWakeLock());

      act(() => {
        result.current.request();
      });

      expect(requestMockFn).toBeCalledTimes(1);

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(result.current).toMatchObject({
        isSupported: true,
        isLocked: true,
      });

      act(() => {
        result.current.release();
      });

      expect(result.current).toMatchObject({
        isSupported: true,
        isLocked: false,
      });
    });
  });

  it("Ignores release when feature is not supported", async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    delete (global.navigator as any).wakeLock;

    const { result } = renderHook(() => useWakeLock());
    expect(result.current).toMatchObject({
      isSupported: false,
      isLocked: false,
    });

    await act(async () => {
      result.current.release();
      await jest.runAllTimersAsync();
    });

    // produces warning
    expect(recoverableError).toBeCalledWith(
      "WakeLock is not supported by the browser",
    );

    expect(result.current).toMatchObject({
      isSupported: false,
      isLocked: false,
    });
  });

  it("Ignores release when no lock avaialble", async () => {
    const { result } = renderHook(() => useWakeLock());
    expect(result.current).toMatchObject({
      isSupported: true,
      isLocked: false,
    });

    await act(async () => {
      result.current.release();
      await jest.runAllTimersAsync();
    });

    // produces warning
    expect(recoverableError).toBeCalledWith(
      "Trying to release lock without having one: noop",
    );

    expect(result.current).toMatchObject({
      isSupported: true,
      isLocked: false,
    });
  });

  describe("auto-renew", () => {
    it("auto-renews lock when visibility changes", async () => {
      const onLock = jest.fn();
      const onRelease = jest.fn();

      const { result, rerender } = renderHook(() =>
        useWakeLock({
          onLock,
          onRelease,
        }),
      );

      act(() => {
        result.current.request();
      });

      expect(onLock).toBeCalledTimes(0);
      expect(onRelease).toBeCalledTimes(0);
      expect(requestMockFn).toBeCalledTimes(1);

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(result.current).toMatchObject({
        isSupported: true,
        isLocked: true,
      });
      expect(onLock).toBeCalledTimes(1);

      // mimic going off-screen
      await act(async () => {
        useVisibilityObserverMockFn.mockReturnValue(false);
        const lock = await wakeLockInternal;
        await lock?.release();

        await jest.runAllTimersAsync();
      });

      expect(onRelease).toBeCalledTimes(1);

      // mimic going back online
      await act(async () => {
        useVisibilityObserverMockFn.mockReturnValue(true);

        rerender();
        await jest.runAllTimersAsync();
      });

      expect(onLock).toBeCalledTimes(2);
    });

    it("Doesn't auto-renew when released manually", async () => {
      const onLock = jest.fn();
      const onRelease = jest.fn();

      const { result, rerender } = renderHook(() =>
        useWakeLock({
          onLock,
          onRelease,
        }),
      );

      act(() => {
        result.current.request();
      });

      expect(onLock).toBeCalledTimes(0);
      expect(onRelease).toBeCalledTimes(0);
      expect(requestMockFn).toBeCalledTimes(1);

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(result.current).toMatchObject({
        isSupported: true,
        isLocked: true,
      });
      expect(onLock).toBeCalledTimes(1);

      // mimic going off-screen but release manually
      await act(async () => {
        useVisibilityObserverMockFn.mockReturnValue(false);
        result.current.release();

        await jest.runAllTimersAsync();
      });

      expect(onRelease).toBeCalledTimes(1);

      // mimic going back online
      await act(async () => {
        useVisibilityObserverMockFn.mockReturnValue(true);

        rerender();
        await jest.runAllTimersAsync();
      });

      expect(onLock).toBeCalledTimes(1);
    });
  });
});
