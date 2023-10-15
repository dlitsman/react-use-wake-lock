const useVisibilityObserverMockFn = jest.fn();
jest.mock("../useVisibilityObserver", () => {
  return useVisibilityObserverMockFn;
});

import { act, renderHook } from "@testing-library/react";
import useWakeLock from "../useWakeLock";

const releaseMockFn = jest.fn<Promise<boolean>, []>();
class RequestResponseMock {
  callback: (() => void) | null = null;

  public addEventListener(name: string, callback: () => void) {
    this.callback = callback;
  }

  public release(): Promise<boolean> {
    if (this.callback != null) {
      this.callback();
    }
    return releaseMockFn();
  }
}
const requestMockFn = jest.fn<Promise<RequestResponseMock>, []>();

describe("useWakeLock", () => {
  jest.useFakeTimers();

  let wakeLockInternal: Promise<RequestResponseMock> | null = null;

  beforeEach(() => {
    wakeLockInternal = null;
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

  // it("Calls onRequestError when errored during request and allows to retry", async () => {
  //   let requestError;
  //   let retryFunction: null | (() => void) = null;

  //   const onRequestError = jest
  //     .fn<void, [Error, () => void]>()
  //     .mockImplementation((err, retry) => {
  //       requestError = err;
  //       retryFunction = retry;
  //     });
  //   requestMockFn.mockImplementation(() => {
  //     return Promise.reject(new Error("Fake error during request"));
  //   });

  //   const { result } = renderHook(() =>
  //     useWakeLock(true, {
  //       onRequestError,
  //     }),
  //   );

  //   expect(onRequestError).toBeCalledTimes(0);
  //   expect(requestMockFn).toBeCalledTimes(1);

  //   await act(async () => {
  //     await jest.runAllTimersAsync();
  //   });

  //   expect(result.current).toMatchObject({
  //     isSupported: true,
  //     isLocked: false,
  //   });

  //   expect(onRequestError).toBeCalledTimes(1);
  //   expect(requestError).toStrictEqual(new Error("Fake error during request"));
  //   expect(retryFunction).toBeDefined();

  //   await act(async () => {
  //     retryFunction != null && retryFunction();
  //     await jest.runAllTimersAsync();
  //   });

  //   // Calls request again
  //   expect(requestMockFn).toBeCalledTimes(2);
  // });

  // it("Works as expected in case if no onRequestError handled provided but hit error", async () => {
  //   requestMockFn.mockImplementation(() => {
  //     return Promise.reject(new Error("Fake error during request"));
  //   });

  //   const { result, rerender } = renderHook(
  //     (props: { shouldLock: boolean }) => useWakeLock(props.shouldLock),
  //     {
  //       initialProps: { shouldLock: true },
  //     },
  //   );

  //   expect(requestMockFn).toBeCalledTimes(1);

  //   act(() => {
  //     rerender({ shouldLock: false });
  //   });

  //   await act(async () => {
  //     await jest.runAllTimersAsync();
  //   });

  //   expect(result.current).toMatchObject({
  //     isSupported: true,
  //     isLocked: false,
  //   });
  // });

  // it("Calls onReleaseError when errored during release", async () => {
  //   const onReleaseError = jest.fn();
  //   releaseMockFn.mockImplementation(() => {
  //     return Promise.reject(new Error("Fake error during release"));
  //   });

  //   const { result, rerender } = renderHook(
  //     (props: { shouldLock: boolean }) =>
  //       useWakeLock(props.shouldLock, {
  //         onReleaseError,
  //       }),
  //     {
  //       initialProps: { shouldLock: true },
  //     },
  //   );

  //   expect(onReleaseError).toBeCalledTimes(0);
  //   expect(requestMockFn).toBeCalledTimes(1);

  //   await act(async () => {
  //     await jest.runAllTimersAsync();
  //   });

  //   expect(result.current).toMatchObject({
  //     isSupported: true,
  //     isLocked: true,
  //   });

  //   act(() => {
  //     rerender({ shouldLock: false });
  //   });

  //   expect(result.current).toMatchObject({
  //     isSupported: true,
  //     isLocked: false,
  //   });

  //   await act(async () => {
  //     await jest.runAllTimersAsync();
  //   });

  //   expect(onReleaseError).toBeCalledTimes(1);
  //   expect(onReleaseError).toBeCalledWith(
  //     new Error("Fake error during release"),
  //   );
  // });

  // it("Works as expected in case if no onReleaseError handled provided but hit error", async () => {
  //   releaseMockFn.mockImplementation(() => {
  //     return Promise.reject(new Error("Fake error during release"));
  //   });

  //   const { result, rerender } = renderHook(
  //     (props: { shouldLock: boolean }) => useWakeLock(props.shouldLock),
  //     {
  //       initialProps: { shouldLock: true },
  //     },
  //   );

  //   expect(requestMockFn).toBeCalledTimes(1);

  //   await act(async () => {
  //     await jest.runAllTimersAsync();
  //   });

  //   expect(result.current).toMatchObject({
  //     isSupported: true,
  //     isLocked: true,
  //   });

  //   act(() => {
  //     rerender({ shouldLock: false });
  //   });

  //   expect(result.current).toMatchObject({
  //     isSupported: true,
  //     isLocked: false,
  //   });
  // });
});
