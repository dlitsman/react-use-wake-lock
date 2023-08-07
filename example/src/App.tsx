import { useState } from "react";
import "./App.css";
import useWakeLock from "react-use-wake-lock";

type Log = {
  type: "error" | "lock" | "release";
  message: string;
};

function App() {
  const [shouldLock, setShouldLock] = useState(false);
  const [log, setLog] = useState<Log[]>([]);

  const result = useWakeLock(shouldLock, {
    onError(e, type) {
      setLog((log) => [
        ...log,
        { type: "error", message: `ERROR (${type}): ${e.message}` },
      ]);
      console.error("Wake Lock Error: ", type, e);
    },
    onLock(lock) {
      setLog((log) => [...log, { type: "lock", message: "Locked" }]);
      console.info("Wake Lock Acquired: ", lock);
    },
    onRelease(lock) {
      setLog((log) => [...log, { type: "release", message: "Released" }]);
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

      <div className="log-wrap">
        Log:
        <div className="log">
          {log.map((v, i) => {
            return (
              <div className={v.type} key={i}>
                {i} - {v.message}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        Screen Wake Lock API supported: {result.isSupported ? "Yes" : "No"}
      </div>
    </>
  );
}

export default App;
