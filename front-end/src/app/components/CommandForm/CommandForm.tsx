import { type ReactElement, useState } from "react";
import { Alert, Button, Checkbox, Divider, Flex, ScrollArea } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { SearchFilter } from "@picteus/ws-client";

import { UiCommandType } from "types";
import { useKey } from "app/hooks";
import { StorageService } from "app/services";
import { extractSchemaAndUiSchema, Markdown, RjsfForm } from "app/components";
import { CommandOverview } from "./components";

import style from "./CommandForm.module.scss";


type CommandFormType = {
  command: UiCommandType;
  extensionId: string;
  searchFilter?: SearchFilter;
  onSend: (extensionId: string, commandId: string, parameters?: object) => void;
};

export default function CommandForm({
  command,
  extensionId,
  searchFilter,
  onSend
}: CommandFormType): ReactElement
{
  const [ parameters, setParameters ] = useState<object>();
  const [ shouldDoNotAskAgain, setShouldDoNotAskAgain ] = useState<boolean>(false);
  const { t } = useTranslation();

  const form = command.form;
  const hasNoParameters = form === undefined || form.parameters === undefined;

  function handleSend(): void
  {
    if (command.id !== undefined && hasNoParameters === true && shouldDoNotAskAgain === true)
    {
      StorageService.setCommandDoNotAskAgain(extensionId, command.id, true);
    }
    onSend(extensionId, command.id, parameters);
  }

  useKey("Enter", handleSend);

  const { schema, uiSchema } = hasNoParameters === true ? {
    schema: undefined,
    uiSchema: undefined
  } : extractSchemaAndUiSchema(form.parameters);

  return (
    <Flex direction="column" className={style.root}>
      {form?.dialogContent && (
        <Flex direction="column" gap="sm" mb="sm">
          <Alert icon={<IconInfoCircle/>}>
            <Markdown content={form.dialogContent.description}/>
          </Alert>
          {form.dialogContent.details && (
            <div className={style.details}><Markdown content={form.dialogContent.details}/></div>
          )}
        </Flex>
      )}
      {command.id && (
        <CommandOverview
          commandId={command.id}
          extensionId={extensionId}
          searchFilter={searchFilter}
        />
      )}
      {form?.parameters && (
        <ScrollArea.Autosize
          className={style.formScrollArea}
          mah="calc(100dvh - 320px)"
          offsetScrollbars
          scrollbars="y"
        >
          <RjsfForm schema={schema} uiSchema={uiSchema} onChange={setParameters}/>
        </ScrollArea.Autosize>
      )}
      <Divider my="md"/>
      <Flex align="center" justify="flex-end" gap="md" className={style.footer}>
        {hasNoParameters === true && command.id !== undefined && (
          <Checkbox
            label={t("commands.doNotAskAgain")}
            checked={shouldDoNotAskAgain}
            onChange={(event) => setShouldDoNotAskAgain(event.currentTarget.checked)}
          />
        )}
        <Button onClick={handleSend}>
          {t("button.send")}
        </Button>
      </Flex>
    </Flex>
  );
}
