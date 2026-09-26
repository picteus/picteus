import React, { type ReactNode, useCallback } from "react";
import { Alert, Button, Flex, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import i18n from "i18next";

import { ContentIconType, SizeType } from "types";
import { useActionModalContext } from "app/context";
import { ExtensionIcon } from "app/components";


export interface ConfirmOptions
{
  title: string;
  message: string;
  question?: string;
  content?: ReactNode;
  icon?: ContentIconType | ReactNode;
  size?: SizeType;
}

interface ConfirmActionType
{
  onConfirm: () => void;
  onCancel?: () => void;
  options: ConfirmOptions;
  content?: ReactNode;
  icon?: ContentIconType | ReactNode;
  extensionId?: string;
}

function computeIcon(icon: ContentIconType | ReactNode | undefined, extensionId?: string): ContentIconType | undefined
{
  if (icon !== undefined)
  {
    if (React.isValidElement(icon))
    {
      return { icon };
    }
    return icon as ContentIconType;
  }
  if (extensionId !== undefined)
  {
    return { icon: <ExtensionIcon idOrExtension={extensionId} size="md"/> };
  }
  return undefined;
}

export default function useConfirmAction(): (confirmActionType: ConfirmActionType) => void
{
  const [ , addModal, removeModal ] = useActionModalContext();

  return useCallback(({ onConfirm, onCancel, options, content, icon, extensionId }: ConfirmActionType): void =>
  {
    const contentNode = content ?? options.content;
    const computedIcon = computeIcon(icon ?? options.icon, extensionId);

    const modalId = addModal({
      title: options.title,
      size: options.size ?? "s",
      icon: computedIcon,
      component: (
        <>
          <Alert icon={<IconAlertTriangle/>} color="orange">
            {options.message}
          </Alert>
          {contentNode !== undefined && (
            <Flex mt="md">
              {contentNode}
            </Flex>
          )}
          {options.question && (
            <Text mt="xs">
              {options.question}
            </Text>
          )}
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
      )
    });
  }, [ addModal, removeModal ]);
}
