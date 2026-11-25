import { type ReactElement } from "react";
import { Badge, Button, Flex, Group, Paper, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconArrowRight, IconInfoCircle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Extension } from "@picteus/ws-client";

import { useModalContext } from "app/context";
import { useModalSubmit } from "app/hooks";
import Common from "../Common/Common.ts";
import ModalActions from "../ModalActions/ModalActions.tsx";
import ModalError from "../ModalError/ModalError.tsx";


type MarketplaceUpdateModalPropsType =
  {
    readonly extension: Extension;
    readonly targetVersion: string;
    readonly onConfirmUpdate: () => Promise<void>;
  };

export default function MarketplaceUpdateModal({
  extension,
  targetVersion,
  onConfirmUpdate
}: MarketplaceUpdateModalPropsType): ReactElement
{
  const [ t ] = useTranslation();
  const modalContext = useModalContext();

  const {
    isSubmitting,
    submitError,
    clearSubmitError,
    handleSubmit
  } = useModalSubmit<[]>(async (): Promise<void> =>
  {
    await onConfirmUpdate();
    modalContext?.closeModal(true);
  });

  return (
    <Stack gap="md">
      <Flex align="center" gap="sm" wrap="wrap">
        <Paper withBorder radius="md" p="md" flex={1} miw={140}>
          <Text size="xs" c="dimmed" fw={500}>
            {t("marketplaceUpdateModal.installedLabel")}
          </Text>
          <Text size="xl" fw={700} mt={4}>
            {extension.manifest.version}
          </Text>
        </Paper>

        <ThemeIcon variant="light" color="gray" radius="xl" size="md">
          <IconArrowRight size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>
        </ThemeIcon>

        <Paper
          radius="md"
          p="md"
          flex={1}
          miw={140}
          bg="var(--mantine-color-blue-light)"
          bd="1px solid var(--mantine-color-blue-light-hover)"
        >
          <Group gap="xs" align="center" wrap="nowrap">
            <Text size="xs" c="blue" fw={500}>
              {t("marketplaceUpdateModal.newVersionLabel")}
            </Text>
            <Badge size="xs" variant="filled" color="blue">
              {t("marketplaceUpdateModal.latestBadge")}
            </Badge>
          </Group>
          <Text size="xl" fw={700} c="blue" mt={4}>
            {targetVersion}
          </Text>
        </Paper>
      </Flex>

      <Group gap="xs" align="flex-start" wrap="nowrap">
        <IconInfoCircle
          size={Common.IconXSmallSize}
          stroke={Common.IconStrokeSize}
          color="var(--mantine-color-dimmed)"
          style={{ flexShrink: 0, marginTop: 2 }}
        />
        <Text size="xs" c="dimmed">
          {t("marketplaceUpdateModal.stopWarning", { name: extension.manifest.name })}
        </Text>
      </Group>

      <ModalError
        error={submitError}
        title={t("extension.errorUpdate")}
        onClose={clearSubmitError}
      />

      <ModalActions isBusy={isSubmitting}>
        <Button
          loading={isSubmitting}
          disabled={isSubmitting}
          onClick={() => void handleSubmit()}
        >
          {t("extension.updateToVersion", { version: targetVersion })}
        </Button>
      </ModalActions>
    </Stack>
  );
}
