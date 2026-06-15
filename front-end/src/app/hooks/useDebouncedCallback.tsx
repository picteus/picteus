import { useCallback, useEffect, useRef } from "react";


export default function useDebouncedCallback(callback: (...args: unknown[]) => void, millisecond: number) {
  const timeoutHandler = useRef(null);

  useEffect(() => () => {
    clearTimeout(timeoutHandler.current);
  }, []);

  return useCallback((...args: unknown[]) => {
      clearTimeout(timeoutHandler.current);
      timeoutHandler.current = setTimeout(() => {
        callback(...args);
      }, millisecond);
    },
    [millisecond, callback]
  );
}
