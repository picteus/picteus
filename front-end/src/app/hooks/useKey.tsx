import { useEffect } from "react";


export default function useKey(key: "Enter" | "Escape", callback: () => void) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === key) {
        event.preventDefault();
        callback();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [callback]);
}
