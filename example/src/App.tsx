import { useEffect, useState } from "react";
import "./App.css";
import useWakeLock from "react-use-wake-lock";

type Log = {
  type: "error" | "lock" | "release";
  message: string;
};

function App() {
  const [log, setLog] = useState<Log[]>([]);

  const [counter, setCounter] = useState(0);

  // Make sure there are no extra calls to wake lock
  useEffect(() => {
    const interval = setInterval(() => {
      setCounter((counter) => counter + 1);
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const { request, release, isLocked, isSupported } = useWakeLock({
    onRequestError(e) {
      setLog((log) => [
        ...log,
        { type: "error", message: `ERROR (REQUEST): ${e.message}` },
      ]);
      console.error("Wake Lock Error: REQUEST: ", e);
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

  const clickHandler = isLocked ? release : request;
  const buttonLabel = isLocked ? "Unlock" : "Lock";

  return (
    <div className="wrapper">
      <div data-fake-re-render={counter}>
        <h1>Locked: {isLocked ? "Yes" : "No"}</h1>
        <div>
          <button onClick={clickHandler}>{buttonLabel}</button>
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
          <button onClick={() => setLog([])}>Clear log</button>
        </div>

        <div className="card">
          Screen Wake Lock API supported: {isSupported ? "Yes" : "No"}
        </div>
      </div>
    </div>
  );
}

export default App;
