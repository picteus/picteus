import { useCallback, useEffect } from "react";

import { useModalContext } from "app/context";
import useConfirmAction from "./useConfirmAction.tsx";


type UseModalDiscardGuardParamsType =
  {
    readonly isDirty: boolean;
    readonly discardTitle: string;
    readonly discardMessage: string;
  };

export default function useModalDiscardGuard({
  isDirty,
  discardTitle,
  discardMessage
}: UseModalDiscardGuardParamsType): (afterClose?: () => void) => void
{
  const modalContext = useModalContext();
  const confirmAction = useConfirmAction();

  const confirmDiscard = useCallback((onConfirmed: () => void): void =>
  {
    if (isDirty === false)
    {
      onConfirmed();
      return;
    }

    confirmAction({
      options: {
        title: discardTitle,
        message: discardMessage
      },
      onConfirm: onConfirmed
    });
  }, [ isDirty, confirmAction, discardTitle, discardMessage ]);

  useEffect(() =>
  {
    if (modalContext === null)
    {
      return;
    }
    modalContext.setCloseGuard(confirmDiscard);
    return () =>
    {
      modalContext.setCloseGuard(undefined);
    };
  }, [ modalContext, confirmDiscard ]);

  return useCallback((afterClose?: () => void): void =>
  {
    confirmDiscard(() =>
    {
      modalContext?.closeModal(false);
      afterClose?.();
    });
  }, [ confirmDiscard, modalContext ]);
}
