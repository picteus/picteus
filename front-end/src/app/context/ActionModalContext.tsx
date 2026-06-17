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

export function useActionModalContext()
{
  const context = useContext(ActionModalContext);
  if (!context)
  {
    throw new Error(
      "useActionModalContext must be used within an ActionModalProvider"
    );
  }
  return context;
}

export function ActionModalProvider({ children })
{
  const [modals, setModals] = useState<ActionModalValue[]>([]);
  const modalsRef = useRef<ActionModalValue[]>(modals);
  const listenersRef = useRef<ListenerType[]>([]);

  const add = useCallback((modal: ActionModalValue): string =>
  {
    if (!modal.id)
    {
      modal.id = randomId();
    }
    const newModals = [...modalsRef.current, modal];
    modalsRef.current = newModals;
    setModals(newModals);
    for (const listener of listenersRef.current)
    {
      listener(modal, true);
    }
    return modal.id;
  }, []);


  const remove = useCallback((id: string): void =>
  {
    const currentModals = modalsRef.current;
    const index = currentModals.findIndex((modal) => modal.id === id);
    if (index !== -1)
    {
      const modal = currentModals[index];
      const newModals = [...currentModals];
      newModals.splice(index, 1);
      modalsRef.current = newModals;
      setModals(newModals);
      for (const listener of listenersRef.current)
      {
        listener(modal, false);
      }
    }
  }, []);

  const subscribe = useCallback((listener: ListenerType): (() => void) =>
  {
    listenersRef.current = [...listenersRef.current, listener];
    return () =>
    {
      listenersRef.current.splice(listenersRef.current.indexOf(listener), 1);
    };
  }, []);

  return (
    <ActionModalContext.Provider value={[modals, add, remove, subscribe]}>
      {children}
    </ActionModalContext.Provider>
  );
}
