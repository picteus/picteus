import React, { type ReactElement, type ReactNode, useCallback } from "react";
import { Alert, Box, Button, Flex, Text } from "@mantine/core";
import { IconCircleX, IconInfoCircle, IconQuestionMark } from "@tabler/icons-react";

import { SearchOriginNature } from "@picteus/ws-client";

import { DialogType } from "types";
import { useModalContext } from "app/context";
import { useKey } from "app/hooks";
import { CopyText, Iframe, ImagesCollection, Markdown, ModalActions } from "app/components";


export type DialogFormPropsType =
  {
    readonly dialog: DialogType;
    readonly imageIds?: string[];
    readonly onSend: (isYes: boolean) => void;
  };

type AlertPropsType =
  {
    readonly color: string;
    readonly icon: ReactNode;
  };

export default function DialogForm(props: DialogFormPropsType): ReactElement
{
  const { dialog, imageIds, onSend } = props;
  const modalContext = useModalContext();

  const handleSend = useCallback(
    (isYes: boolean): void =>
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
  const frame = dialog.frame;
  const buttons = dialog.buttons;

  return (
    <Flex direction="column" gap="sm">
      <Alert color={alertProps.color} icon={alertProps.icon}>
        <Markdown content={dialog.description}/>
      </Alert>

      {dialog.details !== undefined && (
        <CopyText value={dialog.details}>
          <Text size="sm" mt="xs" c="dimmed">
            <Markdown content={dialog.details}/>
          </Text>
        </CopyText>
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

      {frame !== undefined && (
        <Box h={`${frame.height}vh`} w="100%">
          <Iframe content={frame.content}/>
        </Box>
      )}

      <ModalActions>
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
