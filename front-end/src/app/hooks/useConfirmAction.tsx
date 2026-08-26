import React, { useCallback } from "react";
import { Alert, Button, Flex, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import i18n from "i18next";

import { useActionModalContext } from "app/context";
import { ExtensionIcon } from "app/components";


export interface ConfirmOptions
{
  title: string;
  message: string;
  question?: string;
}

interface ConfirmActionType
{
  onConfirm: () => void;
  onCancel?: () => void;
  options: ConfirmOptions;
  extensionId?: string;
}

export default function useConfirmAction(): (confirmActionType: ConfirmActionType) => void
{
  const [ , addModal, removeModal ] = useActionModalContext();

  return useCallback(({ onConfirm, onCancel, options, extensionId }: ConfirmActionType): void =>
  {
    const modalId = addModal({
      title: options.title,
      size: "s",
      icon: extensionId === undefined ? undefined : { icon: <ExtensionIcon idOrExtension={extensionId} size="md"/> },
      component: <>
        <Alert icon={<IconAlertTriangle/>} color="orange">
          {options.message}
        </Alert>
        {options.question && <Text mt="xs">
          {options.question}
        </Text>}
        <Flex justify="flex-end" gap="md" mt="md">
          <Button
            variant="subtle"
            onClick={() =>
            {
              if (onCancel)
              {
                onCancel();
              }
              removeModal(modalId);
            }}
          >
            {i18n.t("button.cancel")}
          </Button>
          <Button
            color="red"
            onClick={() =>
            {
              onConfirm();
              removeModal(modalId);
            }}
          >
            {i18n.t("button.confirm")}
          </Button>
        </Flex>
      </>
    });
  }, [ addModal, removeModal ]);
}
