import { useEffect, useRef } from "react";


export default function useAsyncInitialize<T>(initialValue: T, initializer: (value: T, signal: AbortSignal) => Promise<void>) {
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (hasRunRef.current === true) {
      return;
    }
    const controller = new AbortController();
    const execute = async () => {
      try {
        await initializer(initialValue, controller.signal);
        hasRunRef.current = true;
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error(`An unexpected error occurred during the initialization. Reason '${error.message}`);
        }
      }
    };

    void execute();
    return () => {
      controller.abort();
    };
  }, []);
}
