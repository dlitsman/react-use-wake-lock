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

  beforeEach(() => {
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
      return Promise.resolve(new RequestResponseMock());
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    (global.navigator as any).wakeLock = {
      request: requestMockFn,
    };
  });

  it("Acquires lock when requested and feature is supported", async () => {
    const { result } = renderHook(() => useWakeLock(true));
    expect(result.current).toMatchObject({
      isSupported: true,
      isLocked: false,
    });
    expect(requestMockFn).toBeCalledTimes(1);

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    expect(result.current).toMatchObject({
      isSupported: true,
      isLocked: true,
    });
  });

  it("Not requesting lock if feature is not supported", async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    delete (global.navigator as any).wakeLock;

    const { result } = renderHook(() => useWakeLock(true));
    expect(result.current).toMatchObject({
      isSupported: false,
      isLocked: false,
    });
    expect(requestMockFn).toBeCalledTimes(0);

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    expect(result.current).toMatchObject({
      isSupported: false,
      isLocked: false,
    });
  });
});
