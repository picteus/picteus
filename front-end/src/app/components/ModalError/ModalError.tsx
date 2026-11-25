import { type ReactElement } from "react";
import { createPortal } from "react-dom";

import { useModalContext } from "app/context";
import ErrorAlert from "../ErrorAlert/ErrorAlert.tsx";


type ModalErrorPropsType =
  {
    readonly error?: string;
    readonly title?: string;
    readonly onClose?: () => void;
    readonly onRetry?: () => void;
    readonly isRetrying?: boolean;
  };

export default function ModalError({
  error,
  title,
  onClose,
  onRetry,
  isRetrying
}: ModalErrorPropsType): ReactElement | null
{
  const modalContext = useModalContext();

  if (error === undefined)
  {
    return null;
  }

  const isInline = modalContext?.errorElement === null || modalContext?.errorElement === undefined;
  const alert = (
    <ErrorAlert
      title={title}
      message={error}
      onClose={onClose}
      onRetry={onRetry}
      isRetrying={isRetrying}
      mt={isInline === true ? "md" : undefined}
      mb={isInline === true ? "md" : undefined}
    />
  );

  if (modalContext?.errorElement)
  {
    return createPortal(alert, modalContext.errorElement);
  }

  return alert;
}
