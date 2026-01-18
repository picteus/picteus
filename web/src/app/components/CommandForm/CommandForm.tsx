import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Flex } from "@mantine/core";

import { UiCommandType } from "types";
import { RjsfForm } from "app/components";
import { useEnterKey } from "app/hooks";

type CommandFormType = {
  command: UiCommandType;
  extensionId: string;
  onSend: (extensionId: string, commandId: string, parameters?: object) => void;
};

export default function CommandForm({
  command,
  extensionId,
  onSend,
}: CommandFormType) {
  const [commandParameters, setCommandParameters] = useState<object>();
  const [t] = useTranslation();

  useEnterKey(() => onSend(extensionId, command.id, commandParameters));

  return (
    <>
      <RjsfForm schema={command.parameters} onChange={setCommandParameters} />
      <Flex mt={"md"} align="flex-end" justify="flex-end" gap={5}>
        {/*<Button variant="subtle" onClick={onCancel}>
          {t("button.cancel")}
        </Button>*/}
        <Button
          onClick={() => onSend(extensionId, command.id, commandParameters)}
        >
          {t("button.send")}
        </Button>
      </Flex>
    </>
  );
}
