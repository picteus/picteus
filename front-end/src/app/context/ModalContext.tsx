import { createContext, type ReactNode, useContext } from "react";


export type ModalCloseGuardType = (proceed: () => void) => void;

export type ModalOverlayConfigType = {
  readonly title?: string;
  readonly content: ReactNode;
  readonly onCancel?: () => void;
};

export type ModalContextType = {
  modalId: string;
  closeModal: (viaOnSuccess?: boolean) => void;
  requestClose: () => void;
  setCloseGuard: (guard: ModalCloseGuardType | undefined) => void;
  errorElement: HTMLDivElement | null;
  footerElement: HTMLDivElement | null;
  hasPortaledActions: boolean;
  setHasPortaledActions: (hasActions: boolean) => void;
  isOverlayActive: boolean;
  openOverlay?: (overlay: ModalOverlayConfigType) => () => void;
};

export const ModalContext = createContext<ModalContextType | null>(null);

export function useModalContext(): ModalContextType | null
{
  return useContext(ModalContext);
}
