import { useEffect } from "react";


type UseKeyOptionsType = {
  modifier?: "metaOrCtrl";
  withShift?: boolean;
  isEnabled?: boolean;
  shouldIgnoreRepeat?: boolean;
};

export default function useKey(key: string, callback: () => void, options?: UseKeyOptionsType): void
{
  useEffect(() =>
  {
    const mountTime = performance.now();

    function handleKeyDown(event: KeyboardEvent): void
    {
      // We ignore events that originated prior to or at the moment the hook mounted.
      if (
        event.timeStamp <= mountTime ||
        event.key.toLowerCase() !== key.toLowerCase() ||
        options?.isEnabled === false ||
        (options?.shouldIgnoreRepeat === true && event.repeat) ||
        (options?.modifier === "metaOrCtrl" && (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey !== (options?.withShift === true)))
      )
      {
        return;
      }

      event.preventDefault();
      callback();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () =>
    {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [ callback, key, options ]);
}
