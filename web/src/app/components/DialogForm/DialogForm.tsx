import { DialogType } from "types";
import { Alert, Button, Flex } from "@mantine/core";
import { IconCircleX, IconInfoCircle, IconQuestionMark } from "@tabler/icons-react";
import { useEnterKey } from "app/hooks";
import { CopyText } from "app/components";

import style from "./DialogForm.module.scss";

type DialogFormType = { dialog: DialogType; onSend(isYes: boolean): void };

export default function DialogForm({ dialog, onSend }: DialogFormType) {
  useEnterKey(() => onSend(true));

  const Buttons = () => {
    return Object.entries(dialog.buttons).map(([key, label]) => {
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

  function computeAlertProps() {
    switch (dialog.type) {
      case "Error":
        return { color: "red", icon: <IconCircleX /> };
      case "Info":
        return { color: "blue", icon: <IconInfoCircle /> };
      case "Question":
        return { color: "teal", icon: <IconQuestionMark /> };
    }
  }

  return (
    <div>
      <Alert {...computeAlertProps()}><span dangerouslySetInnerHTML={{ __html: dialog.description }}/></Alert>
      <CopyText size="md" style={style.text} text={dialog.details} />
      <Flex mt="md" align="center" justify="flex-end" gap={10}>
        <Buttons />
      </Flex>
    </div>
  );
}
