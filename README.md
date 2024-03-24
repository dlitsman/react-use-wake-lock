
[![npm](https://img.shields.io/npm/v/react-use-wake-lock.svg)](https://www.npmjs.com/package/react-use-wake-lock) [![Build Status](https://github.com/dlitsman/react-wake-lock/actions/workflows/tests.yaml/badge.svg?branch=main)](https://github.com/dlitsman/react-use-wake-lock/actions?query=branch%3Amain) [![Coverage Status](https://coveralls.io/repos/github/dlitsman/react-use-wake-lock/badge.svg?branch=main)](https://coveralls.io/github/dlitsman/react-use-wake-lock?branch=main)
[![gzip size](https://img.badgesize.io/https:/unpkg.com/react-use-wake-lock@latest/dist/react-use-wake-lock.js?compression=gzip)](https://unpkg.com/react-use-wake-lock@latest/dist/react-use-wake-lock.js)



# React Use Wake Lock

Easily integrate [Screen Wake Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API) in your app

- Zero-dependencies
- Tiny size ([less than 1Kb](https://bundlephobia.com/package/react-use-wake-lock))
- Typescript support
- Auto reacquiring a wake lock out of the box
- 100% test coverage

### Demo

- [Live Demo](https://dlitsman.github.io/react-use-wake-lock/)

### Installation

```
npm install react-use-wake-lock --save
```

or

```
yarn add react-use-wake-lock
```

### [Minimal example](https://dlitsman.github.io/react-use-wake-lock/?min=1)

```ts
import useWakeLock from "react-use-wake-lock";

function MinimalExampleComponent() {
  const { isSupported, isLocked, request, release } = useWakeLock();

  return (
    <div>
      <h3>Screen Wake Lock API supported: {isSupported ? "Yes" : "No"}</h3>
      <h3>Locked: {`${isLocked ? "Yes" : "No"}`}</h3>
      <button type="button" onClick={() => (isLocked ? release() : request())}>
        {isLocked ? "Release" : "Request"}
      </button>
    </div>
  );
}
```

## useWakeLock API

### Params

- `onError(error: Error, errorType: "request" | "release")` - callback called in case of any error during acuqiring lock or releasing it
- `onLock(lock: WakeLockSentinel)` - callback for successful acquiring of a lock
- `onRelease(lock: WakeLockSentinel)` - callback called on releasing the lock

### Returns

- `isSupported: boolean` - is Screen Wake Lock API supported by a browser
- `isLocked: boolean` - current state of a lock
- `request: () => void` - request a lock
- `release: () => void` - release the lock