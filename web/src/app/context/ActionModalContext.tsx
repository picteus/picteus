import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { randomId } from "@mantine/hooks";

import { ActionModalValue } from "types";


type ListenerType = (value: ActionModalValue, isAdded: boolean) => void;

type ActionModalContextType = [
  ActionModalValue[],
  (value: ActionModalValue) => string,
  (id: string) => void,
  subscribe: (listener: ListenerType) => (() => void)
];
const ActionModalContext = createContext<ActionModalContextType>(undefined);

export function useActionModalContext() {
  const context = useContext(ActionModalContext);
  if (!context) {
    throw new Error(
      "useActionModalContext must be used within an ActionModalProvider",
    );
  }
  return context;
}

export function ActionModalProvider({ children }) {
  const [modals, setModals] = useState<ActionModalValue[]>([]);
  const listenersRef = useRef<ListenerType[]>([]);

  const add = useCallback((modal: ActionModalValue): string => {
    if (!modal.id) {
      modal.id = randomId();
    }
    setModals((previousModals) => [...previousModals, modal]);
    for (const listener of listenersRef.current) {
      listener(modal, true);
    }
    return modal.id;
  }, []);


  const remove = useCallback((id: string): void => {
    setModals((previousModals) => {
      const index = previousModals.findIndex((modal) => modal.id === id);
      if (index !== -1) {
        const modal = previousModals[index];
        for (const listener of listenersRef.current) {
          listener(modal, false);
        }
        previousModals.splice(index, 1);
        return [...previousModals];
      }
      return previousModals;
    });
  }, []);

  const subscribe = useCallback((listener: ListenerType): (() => void) => {
    listenersRef.current = [...listenersRef.current, listener];
    return () => {
      listenersRef.current.splice(listenersRef.current.indexOf(listener), 1);
    };
  }, []);

  return (
    <ActionModalContext.Provider value={[modals, add, remove, subscribe]}>
      {children}
    </ActionModalContext.Provider>
  );
}
