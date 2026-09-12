import React, { ReactNode } from "react";
import { Badge, Group, Stack, Table, Text, Tooltip } from "@mantine/core";
import { useTranslation } from "react-i18next";

import {
  CommandEntity,
  Extension,
  ManifestExtensionCommand,
  ManifestExtensionCommandSpecification
} from "@picteus/ws-client";
import { IconLibraryPhoto, IconPhoto, IconServer } from "@tabler/icons-react";

import { ManualSection } from "types";
import { extractMarkdownParagraph } from "utils";
import { useExtension } from "app/hooks";
import { CommandIcon, FieldValue, Manual, Markdown, NoValue } from "app/components";


type ExtensionDetailProps = {
  extension: Extension;
};

export default function ExtensionDetail({ extension }: ExtensionDetailProps)
{
  const { t, i18n } = useTranslation();
  const { data: extensionAndManual } = useExtension(extension.manifest.id);

  const manifestInstructionsArray = extension.manifest.instructions;
  const manifestRuntimes = extension.manifest.runtimes;
  const events = Array.from(new Set(manifestInstructionsArray?.flatMap(instructions => instructions.events) || []));
  const capabilities = Array.from(new Set(manifestInstructionsArray?.flatMap(instructions => instructions.capabilities?.map(capability => capability.id) || []) || []));
  const commands = manifestInstructionsArray?.flatMap(instructions => instructions.commands || []) || [];

  function getCommandSpecification(command: ManifestExtensionCommand): Omit<ManifestExtensionCommandSpecification, "locale">
  {
    const locale = i18n.language.split("-")[0];
    const specification =
      command.specifications.find(
        (candidateSpecification: ManifestExtensionCommandSpecification) => candidateSpecification.locale === locale
      ) ||
      command.specifications.find(
        (candidateSpecification: ManifestExtensionCommandSpecification) => candidateSpecification.locale === "en"
      );
    return specification || { label: command.id, description: "" };
  }

  function getEntityIcon(entity: CommandEntity | undefined): ReactNode
  {
    switch (entity)
    {
      case CommandEntity.Image:
        return <Tooltip label={t("field.image")}><IconPhoto size={20}/></Tooltip>;
      case CommandEntity.Images:
        return <Tooltip label={t("field.images")}><IconLibraryPhoto size={20}/></Tooltip>;
      case CommandEntity.Process:
        return <Tooltip label={t("field.process")}><IconServer size={20}/></Tooltip>;
      default:
        return null;
    }
  }

  const hasInstructions = extensionAndManual?.manual?.instructions !== undefined;
  const manualSummary = hasInstructions === false ? undefined : extractMarkdownParagraph(extensionAndManual.manual.instructions, ManualSection.Summary);
  const manualPrerequisites = hasInstructions === false ? undefined : extractMarkdownParagraph(extensionAndManual.manual.instructions, ManualSection.Prerequisites);
  const manualSettings = hasInstructions === false ? undefined : extractMarkdownParagraph(extensionAndManual.manual.instructions, ManualSection.Settings);

  return (
    <Stack gap="md" m="sm" pos="relative">
      {manualSummary && (<FieldValue name={t("field.manual")} value={<Markdown content={manualSummary}/>}/>)}
      {manualPrerequisites && (
        <FieldValue name={t("field.prerequisites")} value={<Markdown content={manualPrerequisites}/>}/>)}
      {manualSettings && (<FieldValue name={t("field.settings")} value={<Markdown content={manualSettings}/>}/>)}
      <FieldValue name={t("field.runtimes")} value={
        manifestRuntimes?.length > 0 ? (
          <Group gap="xs">
            {manifestRuntimes.map((runtime) => <Badge key={runtime.environment}
                                                      variant="light">{runtime.environment}</Badge>)}
          </Group>
        ) : <NoValue/>
      }/>
      <FieldValue name={t("field.events")} value={
        events.length > 0 ? (
          <Group gap="xs">
            {events.map((event, index) => <Badge key={index} variant="dot" tt="none">{event}</Badge>)}
          </Group>
        ) : <NoValue/>
      }/>
      <FieldValue name={t("field.capabilities")} value={
        capabilities.length > 0 ? (
          <Group gap="xs">
            {capabilities.map((capability, index) => <Badge key={index} variant="outline"
                                                            color="grape">{capability}</Badge>)}
          </Group>
        ) : <NoValue/>
      }/>
      <FieldValue name={t("field.commands")} value={
        commands.length > 0 ? (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th/>
                <Table.Th>{t("field.name")}</Table.Th>
                <Table.Th>{t("field.entity")}</Table.Th>
                <Table.Th>{t("field.manual")}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {commands.map((command, index) =>
              {
                const commandSpecification = getCommandSpecification(command);
                const commandInstructions = extensionAndManual?.manual?.instructions ? extractMarkdownParagraph(extensionAndManual.manual.instructions, [ ManualSection.Commands, command.id ]) : undefined;

                return (
                  <Table.Tr key={index}>
                    <Table.Td>
                      <CommandIcon extensionId={extension.manifest.id} command={command} size="sm"/>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500}>{command.id}</Text>
                      <Text size="xs" c="dimmed">{commandSpecification.label}</Text>
                      {commandSpecification.name &&
                        <Text size="xs" c="dimmed" fs="italic">{commandSpecification.name}</Text>}
                    </Table.Td>
                    <Table.Td>
                      {getEntityIcon(command.on?.entity)}
                    </Table.Td>
                    <Table.Td>
                      <Stack gap="sm">
                        <Text size="sm">{commandSpecification.description}</Text>
                        {commandInstructions && <Manual content={commandInstructions} isExpanded={true}/>}
                      </Stack>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        ) : <NoValue/>
      }/>
    </Stack>
  );
}
