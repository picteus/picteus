import { useCallback, useEffect, useRef } from "react";

export default function useDebouncedCallback(callback, delay) {
  const timeoutHandler = useRef(null);

  useEffect(
    () => () => {
      clearTimeout(timeoutHandler.current);
    },
    [],
  );

  return useCallback(
    (...args) => {
      clearTimeout(timeoutHandler.current);
      timeoutHandler.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [delay, callback],
  );
}
