import React, { Fragment, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Flex } from "@mantine/core";

import { UiCommandType } from "types";
import { RjsfForm } from "app/components";
import { useEnterKey } from "app/hooks";
import { IconInfoCircle } from "@tabler/icons-react";

import style from "./CommandForm.module.scss";

type CommandFormType = {
  command: UiCommandType;
  extensionId: string;
  onSend: (extensionId: string, commandId: string, parameters?: object) => void;
  onCancel: () => void;
};

export default function CommandForm({
  command,
  extensionId,
  onSend,
  onCancel,
}: CommandFormType) {
  const [commandParameters, setCommandParameters] = useState<object>();
  const [t] = useTranslation();

  useEnterKey(() => onSend(extensionId, command.id, commandParameters));

  return (
    <>
      {command.dialogContent && (<Flex mt={"md"} direction={"column"} gap={15}>
        <Alert icon={<IconInfoCircle />}>
          {command.dialogContent.description}
        </Alert>
        {command.dialogContent.details && (<div className={style.details}>{command.dialogContent.details}</div>)}
      </Flex>)}
      <RjsfForm schema={command.parameters} onChange={setCommandParameters} />
      <Flex mt={"md"} align="flex-end" justify="flex-end" gap={5}>
        {<Button variant="subtle" onClick={onCancel}>
          {t("button.cancel")}
        </Button>}
        <Button
          onClick={() => onSend(extensionId, command.id, commandParameters)}
        >
          {t("button.send")}
        </Button>
      </Flex>
    </>
  );
}
