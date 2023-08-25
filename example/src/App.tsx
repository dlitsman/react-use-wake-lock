import { useEffect, useState } from "react";
import "./App.css";
import useWakeLock from "react-use-wake-lock";

type Log = {
  type: "error" | "lock" | "release";
  message: string;
};

function App() {
  const [shouldLock, setShouldLock] = useState(false);
  const [log, setLog] = useState<Log[]>([]);
  const [state, setState] = useState<"error" | "success" | "passive">(
    "passive",
  );

  useEffect(() => {
    if (!shouldLock) {
      setState("passive");
    }
  }, [shouldLock]);

  const result = useWakeLock(shouldLock, {
    onRequestError(e) {
      setState("error");
      setLog((log) => [
        ...log,
        { type: "error", message: `ERROR (REQUEST): ${e.message}` },
      ]);
      console.error("Wake Lock Error: REQUEST: ", e);
      setShouldLock(false);
    },
    onLock(lock) {
      setLog((log) => [...log, { type: "lock", message: "Locked" }]);
      console.info("Wake Lock Acquired: ", lock);
      setState("success");
    },
    onRelease(lock) {
      setLog((log) => [...log, { type: "release", message: "Released" }]);
      console.info("Wake Lock Released: ", lock);
    },
  });

  const className =
    state === "success"
      ? "stateSuccess"
      : state === "error"
      ? "stateError"
      : shouldLock === true && result.isLocked !== true
      ? "statePending"
      : "";

  return (
    <div className={`wrapper ${className}`}>
      <div>
        <h1>Locked: {result.isLocked ? "Yes" : "No"}</h1>
        <div>
          <button onClick={() => setShouldLock((value) => !value)}>
            {shouldLock ? "Unlock" : "Lock"}
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
      </div>
    </div>
  );
}

export default App;
