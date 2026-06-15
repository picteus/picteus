import { useCallback, useRef, useState } from "react";


export default function useReadyRef<T>(): [ref: (node: (T | null)) => void, readyRef: React.MutableRefObject<T>, isReady: boolean] {
  const [isReady, setIsReady] = useState<boolean>(false);
  const readyRef = useRef<T>(null);
  const ref = useCallback((node: T | null) => {
    readyRef.current = node;
    setIsReady(node !== null);
  }, []);
  return [ref, readyRef, isReady];
}
