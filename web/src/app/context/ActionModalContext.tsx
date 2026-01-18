import React, { createContext, useContext, useEffect, useState } from "react";
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
  const [stack, setStack] = useState<ActionModalValue[]>([]);

  function addToStack(modal: ActionModalValue) {
    if (!modal.id) {
      modal.id = randomId();
    }
    setStack((prev) => [...prev, modal]);
  }

  function removeFromStack(id: string) {
    setStack((prev) => prev.filter((item) => item.id !== id));
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (stack.length > 0) {
          const topModal = stack[stack.length - 1];
          if (topModal?.component?.props?.onClose) {
            topModal?.component?.props?.onClose();
          }
          removeFromStack(topModal.id);
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [stack]);

  return (
    <ActionModalContext.Provider value={[stack, addToStack, removeFromStack]}>
      {children}
    </ActionModalContext.Provider>
  );
}
