import { DialogType } from "types";
import { Alert, Button, Flex } from "@mantine/core";
import { IconCircleX, IconInfoCircle, IconQuestionMark } from "@tabler/icons-react";
import { useKey } from "app/hooks";
import { CopyText, ImageCollection } from "app/components";

import style from "./DialogForm.module.scss";

type DialogFormType = { dialog: DialogType; imageIds?: string[]; onSend(isYes: boolean): void };

export default function DialogForm({ dialog, imageIds, onSend }: DialogFormType)
{
  useKey("Enter", () => onSend(true));

  const Buttons = () =>
  {
    return Object.entries(dialog.buttons).map(([key, label]) =>
    {
      const isYes = key === "yes";
      return (
        <Button
          {...(!isYes ? { variant: "default" } : {})}
          key={key}
          onClick={() => onSend(isYes)}
        >
          {label}
        </Button>
      );
    });
  };

  function computeAlertProps()
  {
    switch (dialog.type)
    {
      case "error":
        return { color: "red", icon: <IconCircleX /> };
      case "info":
        return { color: "blue", icon: <IconInfoCircle /> };
      case "question":
        return { color: "teal", icon: <IconQuestionMark /> };
    }
  }

  const content = dialog.frame?.content;
  return (
    <Flex direction="column" gap="xs">
      <Alert {...computeAlertProps()}><span dangerouslySetInnerHTML={{ __html: dialog.description }} /></Alert>
      {dialog.details && <CopyText size="md" style={style.text} text={dialog.details} />}
      {imageIds && <ImageCollection imageIds={imageIds} />}
      {dialog.frame && <iframe className={style.iframe} style={{ height: `${dialog.frame.height}vh` }} {...{
        src: "url" in content ? content.url : undefined,
        srcDoc: "html" in content ? content.html : undefined
      }} />}
      <Flex mt="md" align="center" justify="flex-end" gap={10}>
        <Buttons />
      </Flex>
    </Flex>
  );
}
