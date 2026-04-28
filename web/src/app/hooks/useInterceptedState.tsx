import { Dispatch, SetStateAction, useCallback, useState } from "react";


export default function useInterceptedState<T>(initialValue: T, onStateChange?: (previousState: T, nextState: T) => T):  [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(initialValue);

  const wrappedSetState: Dispatch<SetStateAction<T>> = useCallback((newValueOrUpdater: SetStateAction<T>): void => {
      setState((previousState: T): T => {
        const nextState: T = newValueOrUpdater instanceof Function ? newValueOrUpdater(previousState) : newValueOrUpdater;
        // noinspection UnnecessaryLocalVariableJS
        const interceptedState: T = onStateChange !== undefined ? onStateChange(previousState, nextState) : (JSON.stringify(previousState) !== JSON.stringify(nextState) === true ? nextState : previousState);
        return interceptedState;
      });
    },
    [onStateChange]
  );

  return [state, wrappedSetState];
}
