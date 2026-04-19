import React, { createContext, useContext, useState } from "react";
import { randomId } from "@mantine/hooks";

import { ActionModalValue } from "types";

const ActionModalContext = createContext<
  | [ActionModalValue[], (val: ActionModalValue) => void, (id: string) => void]
  | undefined
>(undefined);

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

  function add(modal: ActionModalValue) {
    if (!modal.id) {
      modal.id = randomId();
    }
    setModals((previousValue) => [...previousValue, modal]);
  }

  function remove(id: string) {
    setModals((previousValue) => previousValue.filter((item) => item.id !== id));
  }

  return (
    <ActionModalContext.Provider value={[modals, add, remove]}>
      {children}
    </ActionModalContext.Provider>
  );
}
