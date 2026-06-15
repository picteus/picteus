import React from "react";
import { Badge, Group, Stack, Table, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { Extension, ManifestExtensionCommand, ManifestExtensionCommandSpecification } from "@picteus/ws-client";

import { FieldValue, NoValue } from "app/components";


type ExtensionDetailProps = {
  extension: Extension;
};

export default function ExtensionDetail({ extension }: ExtensionDetailProps) {
  const { t, i18n } = useTranslation();

  const manifestInstructionsArray = extension.manifest.instructions;
  const manifestRuntimes = extension.manifest.runtimes;
  const events = Array.from(new Set(manifestInstructionsArray?.flatMap(instructions => instructions.events) || []));
  const capabilities = Array.from(new Set(manifestInstructionsArray?.flatMap(instructions => instructions.capabilities?.map(capability => capability.id) || []) || []));
  const commands = manifestInstructionsArray?.flatMap(instructions => instructions.commands || []) || [];

  const getCommandSpecification = (command: ManifestExtensionCommand) => {
    const locale = i18n.language.split("-")[0];
    const specification = command.specifications.find((aSpecification: ManifestExtensionCommandSpecification) => aSpecification.locale == locale) || command.specifications.find((aSpecification: ManifestExtensionCommandSpecification) => aSpecification.locale = "en");
    return specification || { label: command.id, description: "" };
  };

  return (
    <Stack gap="md" pos="relative">
      <FieldValue name={t("field.runtimes")} value={
        manifestRuntimes?.length > 0 ? (
          <Group gap="xs">
            {manifestRuntimes.map(r => <Badge key={r.environment} variant="light">{r.environment}</Badge>)}
          </Group>
        ) : <NoValue />
      } />
      <FieldValue name={t("field.events")} value={
        events.length > 0 ? (
          <Group gap="xs">
            {events.map((event, index) => <Badge key={index} variant="dot" tt="none">{event}</Badge>)}
          </Group>
        ) : <NoValue />
      } />
      <FieldValue name={t("field.capabilities")} value={
        capabilities.length > 0 ? (
          <Group gap="xs">
            {capabilities.map((capability, index) => <Badge key={index} variant="outline" color="grape">{capability}</Badge>)}
          </Group>
        ) : <NoValue />
      } />
      <FieldValue name={t("field.commands")} value={
        commands.length > 0 ? (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("field.name")}</Table.Th>
                <Table.Th>{t("field.description")}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {commands.map((command, index) => {
                const commandSpecification = getCommandSpecification(command);
                return (
                  <Table.Tr key={index}>
                    <Table.Td>
                      <Text size="sm" fw={500}>{command.id}</Text>
                      {commandSpecification.label !== command.id && <Text size="xs" c="dimmed">{commandSpecification.label}</Text>}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{commandSpecification.description}</Text>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        ) : <NoValue />
      } />
    </Stack>
  );
}
