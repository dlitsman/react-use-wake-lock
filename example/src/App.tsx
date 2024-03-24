import { useCallback, useEffect, useState } from "react";
import "./App.css";
import useWakeLock from "react-use-wake-lock";

type Log = {
  type: "error" | "lock" | "release";
  message: string;
  time: string;
};

function App() {
  const queryParameters = new URLSearchParams(window.location.search);

  return queryParameters.get("min") ? (
    <MinimalExampleComponent />
  ) : (
    <FullApiExample />
  );
}

function FullApiExample() {
  const [log, setLog] = useState<Log[]>([]);

  const addLogMessage = useCallback(
    (message: string, messageType: "lock" | "release" | "error") => {
      const date = new Date();
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");

      setLog((log) => [
        ...log,
        { type: messageType, message, time: `${hours}:${minutes}:${seconds}` },
      ]);

      if (messageType === "error") {
        console.error(message);
      }
    },
    [],
  );

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
    onError(e, type) {
      addLogMessage(`ERROR (${type}) ${e.message}`, "error");
      console.error("Wake Lock Error: REQUEST: ", e);
    },
    onLock(lock) {
      console.info("Wake Lock Acquired: ", lock);
      addLogMessage(`Locked`, "lock");
    },
    onRelease(lock) {
      addLogMessage(`Released`, "release");
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
                  {v.time} - {v.message}
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

export default App;
