import { RefObject, useEffect, useRef } from "react";


interface ElementAndCallback {
  elementRef: RefObject<HTMLElement>;
  callback: () => void;
}

const elementAndCallbacks: ElementAndCallback[] = [];

function onKeyDown(event: KeyboardEvent) {
  if (event.key !== "Escape") {
    return;
  }
  for (let index = elementAndCallbacks.length - 1; index >= 0; index--) {
    const elementAndCallback = elementAndCallbacks[index];
    if (elementAndCallback.elementRef.current !== null) {
      event.preventDefault();
      elementAndCallback.callback();
      break;
    }
  }
}

const event = "keydown";
const options = { capture: true };

function register(){
  document.addEventListener(event, onKeyDown, options);
}

function unregister() {
  document.removeEventListener(event, onKeyDown, options);
}

export default function useEscapeKey(elementRef: RefObject<HTMLElement>, callback: () => void) {
  const callbackRef = useRef<() => void>(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (elementAndCallbacks.length === 0) {
      register();
    }
    elementAndCallbacks.push({ elementRef, callback: () => callbackRef.current() });

    return () => {
      for (let index = 0; index < elementAndCallbacks.length; index++) {
        const elementAndCallback = elementAndCallbacks[index];
        if (elementAndCallback.elementRef == elementRef) {
          elementAndCallbacks.splice(index, 1);
          break;
        }
      }
      if (elementAndCallbacks.length === 0) {
        unregister();
      }
    }
  }, [elementRef]);
}
