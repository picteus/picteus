import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Flex } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

import { UiCommandType } from "types";
import { ImageCollection, Markdown, RjsfForm } from "app/components";
import { useEnterKey } from "app/hooks";

import style from "./CommandForm.module.scss";
import { extractSchemaAndUiSchema } from "../RjsfForm/RjsfForm.tsx";

type CommandFormType = {
  command: UiCommandType;
  extensionId: string;
  imageIds?: string[];
  onSend: (extensionId: string, commandId: string, parameters?: object) => void;
  onCancel: () => void;
};

export default function CommandForm({
  command,
  extensionId,
  imageIds,
  onSend,
  onCancel,
}: CommandFormType) {
  const [commandParameters, setCommandParameters] = useState<object>();
  const [t] = useTranslation();

  useEnterKey(() => onSend(extensionId, command.id, commandParameters));

  const form = command.form;
  const { schema, uiSchema } = extractSchemaAndUiSchema(form.parameters);
  return (
    <>
      {form.dialogContent && (<Flex mt={"md"} direction={"column"} gap={15}>
        <Alert icon={<IconInfoCircle />}>
          <Markdown content={form.dialogContent.description} />
        </Alert>
        {form.dialogContent.details && (
          <div className={style.details}><Markdown content={form.dialogContent.details} /></div>)}
      </Flex>)}
      {imageIds && <ImageCollection imageIds={imageIds} />}
      <RjsfForm schema={schema} uiSchema={uiSchema} onChange={setCommandParameters} />
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
