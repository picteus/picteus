import React, { type ReactElement, type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button, Flex } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { useModalContext } from "app/context";


export type ModalActionsPropsType =
  {
    readonly children: ReactNode;
    readonly withCancelButton?: boolean;
    readonly isBusy?: boolean;
  };

export default function ModalActions({
  children,
  withCancelButton = true,
  isBusy = false
}: ModalActionsPropsType): ReactElement
{
  const [ t ] = useTranslation();
  const modalContext = useModalContext();

  useEffect(() =>
  {
    if (modalContext)
    {
      modalContext.setHasPortaledActions(true);
      return () =>
      {
        modalContext.setHasPortaledActions(false);
      };
    }
  }, [ modalContext ]);

  function handleCancel(): void
  {
    modalContext?.closeModal(false);
  }

  const justify = "flex-end";
  const gap = "sm";
  const content = (
    <>
      {withCancelButton && (
        <Button
          variant="subtle"
          disabled={isBusy}
          onClick={handleCancel}
        >
          {t("button.cancel")}
        </Button>
      )}
      {children}
    </>
  );

  if (!modalContext?.footerElement)
  {
    return (
      <Flex justify={justify} gap={gap} mt="md">
        {content}
      </Flex>
    );
  }

  return createPortal(
    <Flex justify={justify} gap={gap} align="center" w="100%">
      {content}
    </Flex>,
    modalContext.footerElement
  );
}

