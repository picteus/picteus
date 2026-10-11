import { createContext, useContext } from "react";


export type ModalContextType = {
  modalId: string;
  closeModal: (viaOnSuccess?: boolean) => void;
  footerElement: HTMLDivElement | null;
  hasPortaledActions: boolean;
  setHasPortaledActions: (hasActions: boolean) => void;
};

export const ModalContext = createContext<ModalContextType | null>(null);

export function useModalContext(): ModalContextType | null
{
  return useContext(ModalContext);
}
