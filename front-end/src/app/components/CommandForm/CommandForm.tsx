import { type ReactElement, useEffect, useState } from "react";
import { Accordion, Alert, Button, Flex, Stack, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { ManifestExtensionCommandSpecification, SearchFilter, SearchOriginNature } from "@picteus/ws-client";

import { UiCommandType } from "types";
import { extractMarkdownParagraph, ToastService } from "utils";
import { useKey } from "app/hooks";
import { ExtensionsService } from "app/services";
import { ImagesCollection, Markdown, RjsfForm } from "app/components";

import { extractSchemaAndUiSchema } from "../RjsfForm/RjsfForm.tsx";

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
  const [ commandParameters, setCommandParameters ] = useState<object>();
  const [ commandSpecification, setCommandSpecification ] = useState<ManifestExtensionCommandSpecification | undefined>();
  const [ commandInstructions, setCommandInstructions ] = useState<string | undefined>();
  const { t, i18n } = useTranslation();

  useKey("Enter", () => onSend(extensionId, command.id, commandParameters));

  useEffect(() =>
  {
    void ExtensionsService.get({ id: extensionId }).then((extensionAndManual) =>
    {
      setCommandInstructions(extensionAndManual.manual?.instructions === undefined ? undefined : extractMarkdownParagraph(extensionAndManual.manual.instructions, command.id));
      const manifestCommands = extensionAndManual.manifest.instructions.flatMap((instructions) => instructions.commands || []);
      const manifestCommand = manifestCommands.find((manifestCommand) => manifestCommand.id === command.id);
      const locale = i18n.language.split("-")[0];
      setCommandSpecification(manifestCommand.specifications.find((specification) => specification.locale === locale) || manifestCommand.specifications.find((specification) => specification.locale === "en") || manifestCommand.specifications[0]);
    }).catch(ToastService.apiCallError);
  }, [ extensionId ]);

  const form = command.form;
  const { schema, uiSchema } = form.parameters === undefined ? {
    schema: undefined,
    uiSchema: undefined
  } : extractSchemaAndUiSchema(form.parameters);
  return (
    <>
      {form.dialogContent && (<Flex mt={"md"} direction={"column"} gap="sm">
        <Alert icon={<IconInfoCircle/>}>
          <Markdown content={form.dialogContent.description}/>
        </Alert>
        {form.dialogContent.details && (
          <div className={style.details}><Markdown content={form.dialogContent.details}/></div>)}
      </Flex>)}
        <Alert variant="default" color="transparent" my="sm" p="sm">
          <Stack gap="sm">
            {commandSpecification?.name && <Text fw={600} size="sm">{commandSpecification.name}</Text>}
            {commandSpecification?.description && <Text size="sm" c="dimmed">{commandSpecification.description}</Text>}
            {commandInstructions && (
              <Accordion variant="contained" radius="sm">
                <Accordion.Item value="manual">
                  <Accordion.Control>
                    <Text size="xs" fw={500}>
                      {t("field.manual")}
                    </Text>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Markdown content={commandInstructions}/>
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
            )}
          </Stack>
        </Alert>
      {searchFilter?.origin?.kind === SearchOriginNature.Images &&
        <ImagesCollection imageIds={searchFilter.origin.ids}/>}
        {commandParameters && <RjsfForm schema={schema} uiSchema={uiSchema} onChange={setCommandParameters}/>}
        <Flex mt="md" align="flex-end" justify="flex-end" gap="sm">
          <Button onClick={() => onSend(extensionId, command.id, commandParameters)}>
            {t("button.send")}
          </Button>
        </Flex>
    </>
  );
}
