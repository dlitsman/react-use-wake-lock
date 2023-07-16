import { useCallback, useEffect, useState } from "react";

function useVisibilityObserver() {
  const [isVisible, setIsVisible] = useState<boolean>(
    document.visibilityState === "visible"
  );

  const handleVisiblilityChange = useCallback(() => {
    console.log('!!!visibility changed')
    setIsVisible(document.visibilityState === "visible");
  }, [])

  useEffect(() => {
    document.addEventListener("visibilitychange", handleVisiblilityChange);

    return () => {
        document.removeEventListener("visibilitychange", handleVisiblilityChange);
    }
  }, []);

  return isVisible;
}

export function useWakeLock(enabled: true) {
    return useVisibilityObserver();

}
