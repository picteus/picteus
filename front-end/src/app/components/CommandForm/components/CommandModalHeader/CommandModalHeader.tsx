import { type ReactElement, useEffect, useMemo, useRef, useState } from "react";
import { Box, Flex, HoverCard, ScrollArea, Stack, Text, Title } from "@mantine/core";
import { useMergedRef, useResizeObserver } from "@mantine/hooks";
import { IconBook } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { UiCommandType } from "types";
import { useModalContext } from "app/context";
import { useExtension } from "app/hooks";
import { ExtensionsService } from "app/services";
import {
  ActionLink,
  CommandIcon,
  Common,
  ContentIcon,
  DotSeparated,
  ExtensionBadge,
  IconTile,
  Markdown
} from "app/components";


type CommandModalHeaderPropsType = {
  readonly command: UiCommandType;
  readonly extensionId: string;
  readonly showHowItWorks?: boolean;
};

export default function CommandModalHeader({
  command,
  extensionId,
  showHowItWorks = true
}: CommandModalHeaderPropsType): ReactElement
{
  const { t, i18n } = useTranslation();
  const modalContext = useModalContext();
  const isOverlayOpen = modalContext?.isOverlayActive === true;
  const { data: extensionAndManual } = useExtension(extensionId);

  const specification = useMemo(
    () => ExtensionsService.findManifestCommandSpecification(extensionAndManual?.manifest, command.id, i18n.language),
    [ extensionAndManual?.manifest, command.id, i18n.language ]
  );

  const manualSections = useMemo(
    () => ExtensionsService.extractCommandManualSections(extensionAndManual?.manual?.instructions, command.id),
    [ extensionAndManual?.manual?.instructions, command.id ]
  );

  const description = specification?.description?.trim() || manualSections.summary;
  const descriptionElementRef = useRef<HTMLParagraphElement | null>(null);
  const [ resizeObserverRef, descriptionRect ] = useResizeObserver<HTMLParagraphElement>();
  const mergedDescriptionRef = useMergedRef(descriptionElementRef, resizeObserverRef);
  const [ isDescriptionTruncated, setIsDescriptionTruncated ] = useState<boolean>(false);

  useEffect(() =>
  {
    const element = descriptionElementRef.current;
    if (element === null)
    {
      setIsDescriptionTruncated(false);
      return;
    }
    setIsDescriptionTruncated(element.scrollHeight > element.clientHeight + 1);
  }, [ description, descriptionRect.width, descriptionRect.height ]);

  function handleOpenHowItWorks(): void
  {
    if (
      isOverlayOpen === true ||
      manualSections.full === undefined ||
      modalContext?.openOverlay === undefined
    )
    {
      return;
    }

    modalContext.openOverlay({
      title: t("commands.howItWorks"),
      content: (
        <Markdown
          content={manualSections.full}
          size="sm"
          withBoldTitles={false}
          headingLevelOffset={1}
        />
      )
    });
  }

  const commandLabel = ExtensionsService.resolveCommandLabel(command.id, specification, command.label);
  const extensionName = extensionAndManual?.manifest.name ?? extensionId;
  const hasManualLink =
    showHowItWorks === true &&
    manualSections.full !== undefined &&
    modalContext?.openOverlay !== undefined;
  const dialogIcon = command.form?.dialogContent?.icon;

  return (
    <Flex align="flex-start" gap="md" miw={0} w="100%">
      <IconTile
        size={40}
        radius="md"
        isBordered={false}
        bg="light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-6))"
      >
        {dialogIcon !== undefined ? (
          <ContentIcon icon={dialogIcon} size="md"/>
        ) : (
          <CommandIcon extensionId={extensionId} command={command} size="md"/>
        )}
      </IconTile>
      <Stack gap={4} flex={1} miw={0}>
        <Title order={4} fw={700} lineClamp={2}>
          {commandLabel}
        </Title>
        {description !== undefined && description.length > 0 && (
          <HoverCard
            disabled={isDescriptionTruncated === false}
            width="target"
            position="bottom-start"
            shadow="md"
            withArrow
            withinPortal
            interactive
            role="tooltip"
            openDelay={300}
            closeDelay={Common.HoverCloseDelayInMilliseconds}
          >
            <HoverCard.Target>
              <Text ref={mergedDescriptionRef} size="sm" c="dimmed" lineClamp={2}>
                {description}
              </Text>
            </HoverCard.Target>
            <HoverCard.Dropdown>
              <ScrollArea.Autosize mah={260} type="auto" offsetScrollbars="present">
                <Text size="sm">
                  {description}
                </Text>
              </ScrollArea.Autosize>
            </HoverCard.Dropdown>
          </HoverCard>
        )}
        <DotSeparated size="xs" wrap="nowrap" mt={2}>
          <Flex align="center" gap={6} wrap="nowrap" miw={0} style={{ flex: "0 1 auto" }}>
            <Text size="xs" c="dimmed" flex="0 0 auto">
              {t("commands.by")}
            </Text>
            <Box display="flex" miw={0} style={{ flex: "0 1 auto", overflow: "hidden" }}>
              <ExtensionBadge
                idOrExtension={extensionId}
                size="sm"
                color="gray"
                tooltip={extensionName}
              />
            </Box>
          </Flex>
          {hasManualLink === true && (
            <ActionLink
              size="xs"
              flex="0 0 auto"
              disabled={isOverlayOpen}
              leftSection={<IconBook size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>}
              onClick={handleOpenHowItWorks}
            >
              {t("commands.howItWorks")}
            </ActionLink>
          )}
        </DotSeparated>
      </Stack>
    </Flex>
  );
}
