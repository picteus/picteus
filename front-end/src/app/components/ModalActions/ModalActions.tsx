import React, { type ReactElement, type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { Flex } from "@mantine/core";

import { useModalContext } from "app/context";


export type ModalActionsPropsType =
  {
    readonly children: ReactNode;
  };

export default function ModalActions(props: ModalActionsPropsType): ReactElement
{
  const { children } = props;
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

  const justify = "flex-end";
  const gap = "sm";
  if (!modalContext?.footerElement)
  {
    return (
      <Flex justify={justify} gap={gap} mt="md">
        {children}
      </Flex>
    );
  }

  return createPortal(
    <Flex justify={justify} gap={gap} align="center" w="100%">
      {children}
    </Flex>,
    modalContext.footerElement
  );
}

