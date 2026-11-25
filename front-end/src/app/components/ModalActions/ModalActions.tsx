import React, { type ReactElement, type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button, Flex } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { useModalContext } from "app/context";


type ModalActionsPropsType =
  {
    readonly children: ReactNode;
    readonly leftSection?: ReactNode;
    readonly status?: ReactNode;
    readonly withCancelButton?: boolean;
    readonly isBusy?: boolean;
  };

export default function ModalActions({
  children,
  leftSection,
  status,
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
    modalContext?.requestClose();
  }

  const gap = "sm";
  const rightContent = (
    <Flex justify="flex-end" gap={gap} align="center" wrap="wrap">
      {status}
      {withCancelButton && (
        <Button
          variant="subtle"
          disabled={isBusy === true || modalContext?.isOverlayActive === true}
          onClick={handleCancel}
        >
          {t("button.cancel")}
        </Button>
      )}
      {children}
    </Flex>
  );

  const footerRow = leftSection !== undefined ? (
    <Flex justify="space-between" gap={gap} align="center" wrap="wrap" w="100%">
      {leftSection}
      {rightContent}
    </Flex>
  ) : (
    <Flex justify="flex-end" gap={gap} align="center" wrap="wrap" w="100%">
      {rightContent}
    </Flex>
  );

  if (!modalContext?.footerElement)
  {
    return (
      <Flex mt="md" w="100%">
        {footerRow}
      </Flex>
    );
  }

  return createPortal(
    footerRow,
    modalContext.footerElement
  );
}

