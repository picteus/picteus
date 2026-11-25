import { ReactElement, ReactNode } from "react";
import { Badge, Box, Button, Flex, Group, Paper, Stack, Text, Tooltip } from "@mantine/core";
import { IconBook, IconPhoto } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { CommandEntity, Extension, MarketplaceExtension } from "@picteus/ws-client";

import ActionLink from "../../../../../ActionLink/ActionLink.tsx";
import CommandIcon from "../../../../../CommandIcon/CommandIcon.tsx";
import Common from "../../../../../Common/Common.ts";
import IconTile from "../../../../../IconTile/IconTile.tsx";
import { ResolvedCommandItemType } from "../../CommandUtils.ts";


type CommandCardPropsType =
  {
    readonly extensionId: string;
    readonly isInstalled: boolean;
    readonly iconSource: string | Extension | MarketplaceExtension;
    readonly item: ResolvedCommandItemType;
    readonly canShowRun?: boolean;
    readonly isRunDisabled?: boolean;
    readonly isRunLoading?: boolean;
    readonly runDisabledTooltip?: string;
    readonly runLeftSection?: ReactNode;
    readonly onRun?: () => void;
    readonly onOpenHowItWorks: (item: ResolvedCommandItemType) => void;
  };

export default function CommandCard({
  extensionId,
  isInstalled,
  iconSource,
  item,
  canShowRun = false,
  isRunDisabled = false,
  isRunLoading = false,
  runDisabledTooltip,
  runLeftSection,
  onRun,
  onOpenHowItWorks
}: CommandCardPropsType): ReactElement
{
  const [ t ] = useTranslation();

  const targetBadgeLabel = item.entity === CommandEntity.Image
    ? t("extensionPage.commands.targetOneImage")
    : (item.entity === CommandEntity.Images
      ? t("extensionPage.commands.targetImages")
      : undefined);

  const metadataParts: string[] = [];
  if (item.name !== undefined)
  {
    metadataParts.push(item.name);
  }
  if (item.parameterLabels.length > 0)
  {
    metadataParts.push(
      t("extensionPage.commands.asksFor", {
        parameters: item.parameterLabels.join(", ")
      })
    );
  }
  const metadataLine = metadataParts.join(Common.DotSeparator);

  const runButton = canShowRun === true ? (
    <Button
      size="sm"
      disabled={isRunDisabled}
      loading={isRunLoading}
      leftSection={runLeftSection}
      onClick={onRun}
    >
      {t("button.run")}
    </Button>
  ) : null;

  return (
    <Paper withBorder radius="md" p="md">
      <Flex align="flex-start" gap="sm">
        <IconTile size={36} radius="md">
          <CommandIcon
            extensionId={extensionId}
            command={item.command}
            size="sm"
            isInstalled={isInstalled}
            fallbackIconSource={iconSource}
          />
        </IconTile>

        <Stack gap={4} flex={1} miw={0}>
          <Group gap="xs" align="center" wrap="wrap">
            <Text size="sm" fw={600}>
              {item.label}
            </Text>
            {targetBadgeLabel !== undefined && (
              <Badge
                variant="light"
                color="gray"
                size="sm"
                radius="sm"
                fw={500}
                tt="none"
                leftSection={<IconPhoto size={12} stroke={Common.IconStrokeSize}/>}
              >
                {targetBadgeLabel}
              </Badge>
            )}
          </Group>

          {item.description !== undefined && (
            <Text size="sm">
              {item.description}
            </Text>
          )}

          {metadataLine.length > 0 && (
            <Text size="xs" c="dimmed">
              {metadataLine}
            </Text>
          )}

          {item.manualMarkdown !== undefined && (
            <ActionLink
              size="xs"
              mt={2}
              leftSection={<IconBook size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>}
              onClick={() => onOpenHowItWorks(item)}
            >
              {t("commands.howItWorks")}
            </ActionLink>
          )}
        </Stack>

        {runButton !== null && (
          <Box flex="0 0 auto">
            {isRunDisabled === true && runDisabledTooltip !== undefined ? (
              <Tooltip label={runDisabledTooltip}>
                <Box component="span" style={{ display: "inline-flex" }}>
                  {runButton}
                </Box>
              </Tooltip>
            ) : (
              runButton
            )}
          </Box>
        )}
      </Flex>
    </Paper>
  );
}
