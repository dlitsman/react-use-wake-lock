import { useCallback, useEffect, useState } from "react";

// Check visibility of the document to re-acquire the lock once browser is active/visible again
export default function useVisibilityObserver(): boolean {
  const [isVisible, setIsVisible] = useState<boolean>(
    document.visibilityState === "visible",
  );

  const handleVisiblilityChange = useCallback(() => {
    setIsVisible(document.visibilityState === "visible");
  }, []);

  useEffect(() => {
    document.addEventListener("visibilitychange", handleVisiblilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisiblilityChange);
    };
  }, [handleVisiblilityChange]);

  return isVisible;
}
