import { ReactElement, ReactNode, useMemo } from "react";
import { Badge, Box, Card, CopyButton, Flex, Grid, Group, Paper, Stack, Text, Title, Tooltip } from "@mantine/core";
import { IconAdjustmentsHorizontal, IconBook, IconSparkles } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import {
  Extension,
  ExtensionAiModel,
  Manifest,
  ManifestCapability,
  ManifestCapabilityId,
  ManifestImageFeaturesCapability
} from "@picteus/ws-client";

import { ManualSection } from "types";
import { extractMarkdownParagraph } from "utils";
import { ExtensionInstructionsDataType } from "app/hooks";
import { AiModelInstructionsService, ExtensionInstructionCapabilitiesType } from "app/services";
import ActionLink from "../../../ActionLink/ActionLink.tsx";
import Common from "../../../Common/Common.ts";
import ExtensionCategories from "../../../ExtensionCategories/ExtensionCategories.tsx";
import Markdown from "../../../Markdown/Markdown.tsx";


const MAX_OVERVIEW_MODELS = 3;
const DETAIL_LABEL_WIDTH = 104;

type DetailRowPropsType =
  {
    readonly label: string;
    readonly align?: "baseline" | "center";
    readonly children: ReactNode;
  };

function DetailRow({ label, align = "baseline", children }: DetailRowPropsType): ReactElement
{
  return (
    <Flex align={align} gap="xs">
      <Text size="sm" c="dimmed" w={DETAIL_LABEL_WIDTH} flex="0 0 auto">
        {label}
      </Text>
      <Box flex={1} miw={0}>
        {children}
      </Box>
    </Flex>
  );
}

type ComputeChipType =
  {
    readonly key: string;
    readonly label: string;
    readonly description: string;
  };

type OverviewConfiguredModelType =
  {
    readonly technicalId: string;
    readonly name: string;
    readonly capabilitiesText: string;
  };

type ExtensionOverviewTabPropsType =
  {
    readonly manifest: Manifest;
    readonly extension: Extension | undefined;
    readonly manualMarkdown: string | undefined;
    readonly hasSettings: boolean;
    readonly instructionCapabilities: ExtensionInstructionCapabilitiesType;
    readonly extensionModels: readonly ExtensionAiModel[];
    readonly instructionsData: ExtensionInstructionsDataType | undefined;
    readonly onOpenManual: () => void;
    readonly onOpenSettingsTab: () => void;
    readonly onOpenAiModelsTab: () => void;
  };

export default function ExtensionOverviewTab({
  manifest,
  extension,
  manualMarkdown,
  hasSettings,
  instructionCapabilities,
  extensionModels,
  instructionsData,
  onOpenManual,
  onOpenSettingsTab,
  onOpenAiModelsTab
}: ExtensionOverviewTabPropsType): ReactElement
{
  const [ t ] = useTranslation();

  const manualSummary = useMemo(
    () => (manualMarkdown !== undefined ? extractMarkdownParagraph(manualMarkdown, ManualSection.Summary) : undefined),
    [ manualMarkdown ]
  );

  const manualPrerequisites = useMemo(
    () => (manualMarkdown !== undefined ? extractMarkdownParagraph(manualMarkdown, ManualSection.Prerequisites) : undefined),
    [ manualMarkdown ]
  );

  const computeChips = useMemo<ComputeChipType[]>(() =>
  {
    const uniqueById = new Map<string, ManifestCapability>();
    for (const instructions of manifest.instructions ?? [])
    {
      for (const capability of instructions.capabilities ?? [])
      {
        const existing = uniqueById.get(capability.id);
        if (existing === undefined)
        {
          uniqueById.set(capability.id, capability);
        }
        else if (
          capability.id === ManifestCapabilityId.ImageFeatures
          && (capability as ManifestImageFeaturesCapability).details?.caption === true
        )
        {
          uniqueById.set(capability.id, capability);
        }
      }
    }

    const chips: ComputeChipType[] = [];
    for (const capability of uniqueById.values())
    {
      if (capability.id === ManifestCapabilityId.ImageFeatures)
      {
        const isCaptionCapability = (capability as ManifestImageFeaturesCapability).details?.caption === true;
        chips.push({
          key: capability.id,
          label: isCaptionCapability === true
            ? t("extensionPage.overview.computesCaptions")
            : t("extensionCapabilities.imageFeatures.label"),
          description: t("extensionCapabilities.imageFeatures.description")
        });
      }
      else if (capability.id === ManifestCapabilityId.ImageTags)
      {
        chips.push({
          key: capability.id,
          label: t("extensionCapabilities.imageTags.label"),
          description: t("extensionCapabilities.imageTags.description")
        });
      }
      else if (capability.id === ManifestCapabilityId.ImageEmbeddings)
      {
        chips.push({
          key: capability.id,
          label: t("extensionCapabilities.imageEmbeddings.label"),
          description: t("extensionCapabilities.imageEmbeddings.description")
        });
      }
      else if (capability.id === ManifestCapabilityId.TextEmbeddings)
      {
        chips.push({
          key: capability.id,
          label: t("extensionCapabilities.textEmbeddings.label"),
          description: t("extensionCapabilities.textEmbeddings.description")
        });
      }
      else
      {
        chips.push({
          key: capability.id,
          label: capability.id,
          description: capability.id
        });
      }
    }

    return chips;
  }, [ manifest.instructions, t ]);

  const configuredModelsSummary = useMemo(() =>
  {
    const { configuredIds, autoIds } = AiModelInstructionsService.collectConfiguredInstructionModels(instructionsData);

    const modelsById = new Map<string, ExtensionAiModel>(
      extensionModels.map(model => [ model.technicalId, model ])
    );
    const captionById = new Map(
      (instructionsData?.captionInstructions ?? []).map(item => [ item.aiModelTechnicalId, item ])
    );
    const eligibleTagsById = new Map(
      (instructionsData?.eligibleTagsInstructions ?? []).map(item => [ item.aiModelTechnicalId, item ])
    );
    const embeddingById = new Map(
      (instructionsData?.embeddingInstructions ?? []).map(item => [ item.aiModelTechnicalId, item ])
    );

    const configuredModels: OverviewConfiguredModelType[] = Array.from(configuredIds).map(technicalId =>
    {
      const parts: string[] = [];
      const caption = captionById.get(technicalId);
      if (caption?.enabled === true)
      {
        parts.push(
          t(caption.isAuto === true
            ? "extensionPage.overview.aiModelCaptionsAuto"
            : "extensionPage.overview.aiModelCaptionsManual")
        );
      }
      const eligibleTags = eligibleTagsById.get(technicalId);
      if (eligibleTags?.enabled === true)
      {
        parts.push(
          t(eligibleTags.isAuto === true
            ? "extensionPage.overview.aiModelTagsAuto"
            : "extensionPage.overview.aiModelTagsManual")
        );
      }
      const embedding = embeddingById.get(technicalId);
      if (embedding?.enabled === true)
      {
        parts.push(
          t(embedding.isAuto === true
            ? "extensionPage.overview.aiModelEmbeddingsAuto"
            : "extensionPage.overview.aiModelEmbeddingsManual")
        );
      }

      return {
        technicalId,
        name: modelsById.get(technicalId)?.name ?? technicalId,
        capabilitiesText: parts.join(", ")
      };
    });

    const unconfiguredCount = Math.max(0, extensionModels.length - configuredIds.size);
    const hiddenConfiguredCount = Math.max(0, configuredModels.length - MAX_OVERVIEW_MODELS);

    return {
      visibleModels: configuredModels.slice(0, MAX_OVERVIEW_MODELS),
      configuredCount: configuredModels.length,
      autoCount: autoIds.size,
      moreAvailableCount: unconfiguredCount + hiddenConfiguredCount
    };
  }, [ extensionModels, instructionsData, t ]);

  const runtimesText = useMemo<string>(
    () => (manifest.runtimes ?? [])
      .map(runtime => t(`extension.runtimes.${runtime.environment}`, { defaultValue: runtime.environment }))
      .join(", "),
    [ manifest.runtimes, t ]
  );

  const hasManual = manualMarkdown !== undefined && manualMarkdown.trim().length > 0;
  const isInstalled = extension !== undefined;
  const showAiModelsSections = isInstalled === true && instructionCapabilities.hasAnyInstructionCapability === true;

  const runsOnItsOwnText = configuredModelsSummary.configuredCount === 0
    ? t("extensionPage.overview.runsOnItsOwnSummaryNone")
    : (configuredModelsSummary.autoCount > 0
      ? t("extensionPage.overview.runsOnItsOwnSummaryAuto", {
        configuredCount: configuredModelsSummary.configuredCount,
        autoCount: configuredModelsSummary.autoCount
      })
      : t("extensionPage.overview.runsOnItsOwnSummaryManualOnly", {
        configuredCount: configuredModelsSummary.configuredCount
      }));

  return (
    <Grid gap="lg" align="flex-start">
      <Grid.Col span={{ base: 12, md: 8 }}>
        <Stack gap="lg">
          <Stack gap="xs">
            <Title order={5}>{t("extensionPage.overview.whatItDoes")}</Title>
            {manualSummary !== undefined && manualSummary.trim().length > 0 ? (
              <Text component="div" lineClamp={4}>
                <Markdown content={manualSummary} size="sm"/>
              </Text>
            ) : (
              <Text size="sm">
                {manifest.description}
              </Text>
            )}
            {hasManual === true && (
              <ActionLink
                leftSection={<IconBook size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>}
                onClick={onOpenManual}
              >
                {t("extensionPage.overview.readFullManual")}
              </ActionLink>
            )}
          </Stack>

          {manualPrerequisites !== undefined && manualPrerequisites.trim().length > 0 && (
            <Stack gap="xs">
              <Title order={5}>{t("extensionConfiguration.prerequisitesHeading")}</Title>
              <Paper withBorder p="md" radius="md" bg="var(--mantine-color-default-hover)">
                <Stack gap="xs">
                  <Markdown content={manualPrerequisites} size="sm"/>
                  {isInstalled === true && hasSettings === true && (
                    <ActionLink
                      leftSection={<IconAdjustmentsHorizontal size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>}
                      onClick={onOpenSettingsTab}
                    >
                      {t("extensionPage.overview.checkSettings")}
                    </ActionLink>
                  )}
                </Stack>
              </Paper>
            </Stack>
          )}

          {showAiModelsSections === true && (
            <Stack gap="xs">
              <Title order={5}>{t("extensionPage.overview.runsOnItsOwn")}</Title>
              <Text size="sm" c="dimmed">
                {runsOnItsOwnText}
              </Text>
              <ActionLink
                leftSection={<IconSparkles size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>}
                onClick={onOpenAiModelsTab}
              >
                {t("extensionPage.overview.manageAiModels")}
              </ActionLink>
            </Stack>
          )}
        </Stack>
      </Grid.Col>

      <Grid.Col span={{ base: 12, md: 4 }}>
        <Stack gap="md">
          <Card withBorder padding="lg" radius="md">
            <Stack gap="sm">
              <Title order={5} fw={600}>
                {t("field.details")}
              </Title>

              <DetailRow label={t("field.id")}>
                <Group gap="xs" align="baseline" wrap="wrap">
                  <Text size="sm" style={{ wordBreak: "break-all" }}>
                    {manifest.id}
                  </Text>
                  <CopyButton value={manifest.id}>
                    {({ copied, copy }) => (
                      <ActionLink onClick={copy}>
                        {t(copied === true ? "button.copied" : "button.copy")}
                      </ActionLink>
                    )}
                  </CopyButton>
                </Group>
              </DetailRow>

              <DetailRow label={t("field.version")}>
                <Text size="sm">{manifest.version}</Text>
              </DetailRow>

              {manifest.author !== undefined && manifest.author.trim().length > 0 && (
                <DetailRow label={t("field.author")}>
                  <Text size="sm">{manifest.author}</Text>
                </DetailRow>
              )}

              {runtimesText.length > 0 && (
                <DetailRow label={t("field.runtime")}>
                  <Text size="sm">{runtimesText}</Text>
                </DetailRow>
              )}

              {computeChips.length > 0 && (
                <DetailRow label={t("extensionPage.overview.computesLabel")} align="center">
                  <Group gap={6} wrap="wrap">
                    {computeChips.map(chip => (
                      <Tooltip key={chip.key} label={chip.description} multiline w={240}>
                        <Badge
                          variant="light"
                          color="gray"
                          radius="xl"
                          size="sm"
                          fw={500}
                          tt="none"
                        >
                          {chip.label}
                        </Badge>
                      </Tooltip>
                    ))}
                  </Group>
                </DetailRow>
              )}

              {manifest.categories.length > 0 && (
                <DetailRow label={t("field.categories")}>
                  <ExtensionCategories categories={manifest.categories} size="sm"/>
                </DetailRow>
              )}
            </Stack>
          </Card>

          {showAiModelsSections === true && (
            <Paper p="lg" radius="md" bg="var(--mantine-color-default-hover)">
              <Stack gap="xs">
                <Title order={5} fw={600}>
                  {t("extensionPage.tabs.aiModels")}
                </Title>

                {configuredModelsSummary.visibleModels.length > 0 ? (
                  <Stack gap={4}>
                    {configuredModelsSummary.visibleModels.map(model => (
                      <Text key={model.technicalId} size="sm">
                        {model.capabilitiesText.length > 0
                          ? t("extensionPage.overview.aiModelLine", {
                            model: model.name,
                            capabilities: model.capabilitiesText
                          })
                          : model.name}
                      </Text>
                    ))}
                  </Stack>
                ) : (
                  <Text size="sm" c="dimmed">
                    {t("extensionPage.overview.aiModelsNoneConfigured")}
                  </Text>
                )}

                {configuredModelsSummary.moreAvailableCount > 0 && (
                  <Text size="sm" c="dimmed">
                    {t("extensionPage.overview.aiModelsMoreAvailable", {
                      count: configuredModelsSummary.moreAvailableCount
                    })}
                  </Text>
                )}

                <ActionLink
                  mt={2}
                  leftSection={<IconSparkles size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>}
                  onClick={onOpenAiModelsTab}
                >
                  {t("extensionPage.overview.manageAiModels")}
                </ActionLink>
              </Stack>
            </Paper>
          )}
        </Stack>
      </Grid.Col>
    </Grid>
  );
}
