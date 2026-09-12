import { type ReactElement, useMemo, useState } from "react";
import { Alert, Button, Flex, Stack, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { ManifestExtensionCommandSpecification, SearchFilter, SearchOriginNature } from "@picteus/ws-client";

import { ManualSection, UiCommandType } from "types";
import { extractMarkdownParagraph } from "utils";
import { useExtension, useKey } from "app/hooks";
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
  const { t, i18n } = useTranslation();
  const { data: extensionAndManual } = useExtension(extensionId);

  useKey("Enter", () => onSend(extensionId, command.id, parameters));

  const instructions = useMemo((): string | undefined =>
    {
      if (!command.id || !extensionAndManual?.manual?.instructions)
      {
        return undefined;
      }
      return extractMarkdownParagraph(
        extensionAndManual.manual.instructions,
        [ ManualSection.Commands, command.id ]
      );
    },
    [ command.id, extensionAndManual ]
  );

  const specification = useMemo((): ManifestExtensionCommandSpecification | undefined =>
    {
      if (!command.id || !extensionAndManual?.manifest?.instructions)
      {
        return undefined;
      }
      const manifestCommands = extensionAndManual.manifest.instructions.flatMap(
        (instructionGroup) => instructionGroup.commands || []
      );
      const manifestCommand = manifestCommands.find(
        (candidateCommand) => candidateCommand.id === command.id
      );
      if (!manifestCommand)
      {
        return undefined;
      }
      const locale = i18n.language.split("-")[0];
      return (
        manifestCommand.specifications.find(
          (candidateSpecification) => candidateSpecification.locale === locale
        ) ||
        manifestCommand.specifications.find(
          (candidateSpecification) => candidateSpecification.locale === "en"
        ) ||
        manifestCommand.specifications[0]
      );
    },
    [ command.id, extensionAndManual, i18n.language ]
  );

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
