import React, { type ReactElement, type ReactNode, useCallback } from "react";
import { Alert, Box, Button, Flex, Text } from "@mantine/core";
import { IconCircleX, IconInfoCircle, IconQuestionMark } from "@tabler/icons-react";

import { IntentDialog } from "@picteus/shared-core";
import { SearchOriginNature } from "@picteus/ws-client";

import { useModalContext } from "app/context";
import { useKey } from "app/hooks";
import { Iframe, ImagesCollection, Markdown, ModalActions } from "app/components";


export type DialogFormPropsType =
  {
    readonly dialog: IntentDialog;
    readonly imageIds?: string[];
    readonly onSend: (isYes: boolean) => void;
  };

type AlertPropsType =
  {
    readonly color: string;
    readonly icon: ReactNode;
  };

export default function DialogForm({ dialog, imageIds, onSend }: DialogFormPropsType): ReactElement
{
  const modalContext = useModalContext();

  const handleSend = useCallback((isYes: boolean): void =>
    {
      onSend(isYes);
      if (modalContext !== null)
      {
        modalContext.closeModal(true);
      }
    },
    [ onSend, modalContext ]
  );

  useKey("Enter", () =>
  {
    handleSend(true);
  });

  function computeAlertProps(): AlertPropsType
  {
    switch (dialog.type)
    {
      case "error":
      {
        return {
          color: "red",
          icon: <IconCircleX/>
        };
      }
      case "warning":
      {
        return {
          color: "orange",
          icon: <IconCircleX/>
        };
      }
      case "question":
      {
        return {
          color: "teal",
          icon: <IconQuestionMark/>
        };
      }
      case "info":
      default:
      {
        return {
          color: "blue",
          icon: <IconInfoCircle/>
        };
      }
    }
  }

  const alertProps = computeAlertProps();
  const document = dialog.document;
  const buttons = dialog.buttons;

  return (
    <Flex direction="column" gap="sm" h="100%">
      <Alert color={alertProps.color} icon={alertProps.icon}>
        <Markdown content={dialog.description}/>
      </Alert>

      {dialog.details !== undefined && (
        <Text size="sm" mt="xs" c="dimmed">
          <Markdown content={dialog.details}/>
        </Text>
      )}

      {imageIds !== undefined && imageIds.length > 0 && (
        <ImagesCollection
          searchParameters={{
            filter: {
              origin: {
                kind: SearchOriginNature.Images,
                ids: imageIds
              }
            }
          }}
        />
      )}

      {document !== undefined && (
        <Box flex={1} mih={0} w="100%">
          <Iframe content={document}/>
        </Box>
      )}

      <ModalActions withCancelButton={false}>
        {buttons.no !== undefined && (
          <Button
            variant="default"
            onClick={() =>
            {
              handleSend(false);
            }}
          >
            {buttons.no}
          </Button>
        )}
        <Button
          color={dialog.type === "error" ? "red" : undefined}
          onClick={() =>
          {
            handleSend(true);
          }}
        >
          {buttons.yes}
        </Button>
      </ModalActions>
    </Flex>
  );
}
