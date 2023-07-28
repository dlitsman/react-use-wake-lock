import { useState } from "react";
import "./App.css";
import useWakeLock from "react-use-wake-lock";

function App() {
  const [shouldLock, setShouldLock] = useState(false);

  const result = useWakeLock(shouldLock, {
    onError(e, type) {
      console.error("Wake Lock Error: ", type, e);
    },
    onLock(lock) {
      console.info("Wake Lock Acquired: ", lock);
    },
    onRelease(lock) {
      console.info("Wake Lock Released: ", lock);
    },
  });

  return (
    <>
      <h1>Locked: {result.isLocked ? "Yes" : "No"}</h1>
      <div>
        <button onClick={() => setShouldLock((value) => !value)}>
          {shouldLock ? "Locked" : "Lock"}
        </button>
      </div>

      <div className="card">
        Screen Wake Lock API supported: {result.isSupported ? "Yes" : "No"}
      </div>
    </>
  );
}

export default App;
