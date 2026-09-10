import { type ReactElement, useEffect, useState } from "react";
import { Alert, Button, Flex, Stack, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { ManifestExtensionCommandSpecification, SearchFilter, SearchOriginNature } from "@picteus/ws-client";

import { ManualSection, UiCommandType } from "types";
import { extractMarkdownParagraph, ToastService } from "utils";
import { useKey } from "app/hooks";
import { ExtensionsService } from "app/services";
import { ImagesCollection, Manual, Markdown, RjsfForm } from "app/components";

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
  const [ parameters, setParameters ] = useState<object>();
  const [ specification, setSpecification ] = useState<ManifestExtensionCommandSpecification | undefined>();
  const [ instructions, setInstructions ] = useState<string | undefined>();
  const { t, i18n } = useTranslation();

  useKey("Enter", () => onSend(extensionId, command.id, parameters));

  useEffect(() =>
  {
    if (command.id)
    {
      ExtensionsService.get({ id: extensionId }).then((extensionAndManual) =>
      {
        setInstructions(extensionAndManual.manual?.instructions === undefined ? undefined : extractMarkdownParagraph(extensionAndManual.manual.instructions, [ ManualSection.Commands, command.id ]));
        const manifestCommands = extensionAndManual.manifest.instructions.flatMap((instructions) => instructions.commands || []);
        const manifestCommand = manifestCommands.find((manifestCommand) => manifestCommand.id === command.id);
        const locale = i18n.language.split("-")[0];
        setSpecification(manifestCommand.specifications.find((specification) => specification.locale === locale) || manifestCommand.specifications.find((specification) => specification.locale === "en") || manifestCommand.specifications[0]);
      }).catch(ToastService.apiCallError);
    }
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
        {command.id && <Alert variant="default" color="transparent" my="sm" p="sm">
          <Stack gap="sm">
            {specification?.name && <Text fw={600} size="sm">{specification.name}</Text>}
            {specification?.description && <Text size="sm" c="dimmed">{specification.description}</Text>}
            {instructions && <Manual content={instructions}/>}
          </Stack>
        </Alert>
        }
        {searchFilter?.origin?.kind === SearchOriginNature.Images &&
          <ImagesCollection imageIds={searchFilter.origin.ids}/>}
        {form.parameters && <RjsfForm schema={schema} uiSchema={uiSchema} onChange={setParameters}/>}
        <Flex mt="md" align="flex-end" justify="flex-end" gap="sm">
          <Button onClick={() => onSend(extensionId, command.id, parameters)}>
            {t("button.send")}
          </Button>
        </Flex>
    </>
  );
}
