import { useCallback, useEffect, useRef, useState } from "react";


type ThrottledAsyncActionResultType = {

  readonly trigger: () => void;
  readonly isRunning: boolean;

};

export default function useThrottledAsyncAction(
  action: () => Promise<void>,
  cooldownInMilliseconds = 1_000
): ThrottledAsyncActionResultType
{
  const [ isRunning, setIsRunning ] = useState<boolean>(false);
  const actionRef = useRef<() => Promise<void>>(action);
  const isRunningRef = useRef<boolean>(false);
  const hasPendingExecutionRef = useRef<boolean>(false);
  const lastExecutionTimestampRef = useRef<number>(0);
  const timeoutIdentifierRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<() => void>(() => {});

  useEffect((): void =>
  {
    actionRef.current = action;
  }, [ action ]);

  useEffect((): (() => void) =>
  {
    return (): void =>
    {
      if (timeoutIdentifierRef.current !== null)
      {
        clearTimeout(timeoutIdentifierRef.current);
      }
    };
  }, []);

  const trigger = useCallback((): void =>
  {
    // We queue execution if an operation is currently in-flight
    if (isRunningRef.current)
    {
      hasPendingExecutionRef.current = true;
      return;
    }

    const currentTimestamp = Date.now();
    const elapsedMilliseconds = currentTimestamp - lastExecutionTimestampRef.current;

    if (elapsedMilliseconds >= cooldownInMilliseconds)
    {
      if (timeoutIdentifierRef.current !== null)
      {
        clearTimeout(timeoutIdentifierRef.current);
        timeoutIdentifierRef.current = null;
      }

      hasPendingExecutionRef.current = false;
      lastExecutionTimestampRef.current = currentTimestamp;
      isRunningRef.current = true;
      setIsRunning(true);

      void actionRef.current().finally((): void =>
      {
        isRunningRef.current = false;
        setIsRunning(false);

        // We execute any pending execution that arrived while in-flight
        if (hasPendingExecutionRef.current)
        {
          triggerRef.current();
        }
      });
    }
    else
    {
      hasPendingExecutionRef.current = true;
      if (timeoutIdentifierRef.current === null)
      {
        const remainingDelayInMilliseconds = cooldownInMilliseconds - elapsedMilliseconds;
        timeoutIdentifierRef.current = setTimeout((): void =>
        {
          timeoutIdentifierRef.current = null;
          if (hasPendingExecutionRef.current)
          {
            triggerRef.current();
          }
        }, remainingDelayInMilliseconds);
      }
    }
  }, [ cooldownInMilliseconds ]);

  useEffect((): void =>
  {
    triggerRef.current = trigger;
  }, [ trigger ]);

  return {
    trigger,
    isRunning
  };
}
