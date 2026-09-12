import { useCallback, useEffect, useRef } from "react";


export default function useDebouncedCallback<CallbackType extends (...args: unknown[]) => void>(
  callback: CallbackType,
  millisecond: number
): (...args: Parameters<CallbackType>) => void
{
  const callbackRef = useRef<CallbackType>(callback);
  const timeoutHandlerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() =>
  {
    callbackRef.current = callback;
  }, [ callback ]);

  useEffect(() =>
  {
    return () =>
    {
      if (timeoutHandlerRef.current !== null)
      {
        clearTimeout(timeoutHandlerRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<CallbackType>): void =>
    {
      if (timeoutHandlerRef.current !== null)
      {
        clearTimeout(timeoutHandlerRef.current);
      }
      timeoutHandlerRef.current = setTimeout(() =>
      {
        callbackRef.current(...args);
      }, millisecond);
    },
    [ millisecond ]
  );
}
