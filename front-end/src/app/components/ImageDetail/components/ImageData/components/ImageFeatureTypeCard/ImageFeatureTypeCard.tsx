import React, { ReactElement, ReactNode, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { Extension, ExtensionAiModel, ExtensionImageFeature, ImageFeatureType } from "@picteus/ws-client";

import { useActionModalContext } from "app/context";
import { useAiModels, useExtensionInstructions, useExtensions } from "app/hooks";
import { ExtensionInstructionCapabilitiesType, ExtensionsService } from "app/services";
import ActionLink from "../../../../../ActionLink/ActionLink.tsx";
import CaptionModelModal from "../../../../../CaptionModelModal/CaptionModelModal.tsx";
import ExtensionPage from "../../../../../ExtensionPage/ExtensionPage.tsx";
import { useOptionalStackNavigator } from "../../../../../StackNavigator/StackNavigator.tsx";
import { computeTypeFeatureContainers, ImageFeatureContainerType } from "../../ImageDataComputer.ts";
import ImageFeatureCard from "../ImageFeatureCard/ImageFeatureCard.tsx";


type CaptionEditQuestionActionPropsType =
  {
    readonly extensionId: string;
    readonly featureName: string | undefined;
  };

function CaptionEditQuestionAction({
  extensionId,
  featureName
}: CaptionEditQuestionActionPropsType): ReactElement | null
{
  const [ t ] = useTranslation();
  const { addModal } = useActionModalContext();
  const stackNavigator = useOptionalStackNavigator();
  const { data: extensions = [] } = useExtensions();
  const { data: allModels = [] } = useAiModels();

  const extension = useMemo<Extension | undefined>(
    () => extensions.find(candidate => candidate.manifest.id === extensionId),
    [ extensions, extensionId ]
  );

  const capabilities = useMemo<ExtensionInstructionCapabilitiesType>(
    () => ExtensionsService.computeInstructionCapabilities(extension),
    [ extension ]
  );

  const { data: instructionsData } = useExtensionInstructions(
    extensionId,
    capabilities,
    extension !== undefined && capabilities.hasCaptionCapability === true
  );

  const matchedTarget = useMemo<{
    readonly modelTechnicalId: string;
    readonly modelDisplayName: string;
    readonly model: ExtensionAiModel | undefined;
  } | undefined>(() =>
  {
    if (extension === undefined || capabilities.hasCaptionCapability === false || instructionsData === undefined)
    {
      return undefined;
    }

    const captionInstructions = instructionsData.captionInstructions;
    if (captionInstructions.length === 0)
    {
      return undefined;
    }

    const extensionModels = allModels.filter(candidate => candidate.extensionId === extensionId);
    const trimmedName = featureName?.trim();

    if (trimmedName !== undefined && trimmedName.length > 0)
    {
      const directInstruction = captionInstructions.find(
        instruction => instruction.aiModelTechnicalId === trimmedName
      );
      if (directInstruction !== undefined)
      {
        const matchedModel = extensionModels.find(
          candidate => candidate.technicalId === directInstruction.aiModelTechnicalId
        );
        return {
          modelTechnicalId: directInstruction.aiModelTechnicalId,
          modelDisplayName: matchedModel?.name ?? directInstruction.aiModelTechnicalId,
          model: matchedModel
        };
      }

      const matchedModel = extensionModels.find(
        candidate => candidate.name === trimmedName || candidate.technicalId === trimmedName
      );
      if (matchedModel !== undefined)
      {
        const modelInstruction = captionInstructions.find(
          instruction => instruction.aiModelTechnicalId === matchedModel.technicalId
        );
        if (modelInstruction !== undefined)
        {
          return {
            modelTechnicalId: matchedModel.technicalId,
            modelDisplayName: matchedModel.name,
            model: matchedModel
          };
        }
      }
    }
    else if (captionInstructions.length === 1)
    {
      const singleInstruction = captionInstructions[0];
      const matchedModel = extensionModels.find(
        candidate => candidate.technicalId === singleInstruction.aiModelTechnicalId
      );
      return {
        modelTechnicalId: singleInstruction.aiModelTechnicalId,
        modelDisplayName: matchedModel?.name ?? singleInstruction.aiModelTechnicalId,
        model: matchedModel
      };
    }

    return undefined;
  }, [ extension, capabilities.hasCaptionCapability, instructionsData, allModels, extensionId, featureName ]);

  if (extension === undefined || matchedTarget === undefined)
  {
    return null;
  }

  function handleOpenModal(): void
  {
    if (extension === undefined || matchedTarget === undefined)
    {
      return;
    }
    const targetExtension = extension;
    const targetModel = matchedTarget;

    addModal({
      title: t("captionModelModal.title", {
        extension: targetExtension.manifest.name,
        model: targetModel.modelDisplayName
      }),
      subtitle: t("captionModelModal.subtitle"),
      icon: { url: ExtensionsService.getIconURL(targetExtension.manifest.id) },
      size: "m",
      body: (
        <CaptionModelModal
          extension={targetExtension}
          modelTechnicalId={targetModel.modelTechnicalId}
          modelDisplayName={targetModel.modelDisplayName}
          model={targetModel.model}
          onOpenAllModels={stackNavigator !== null ? (): void =>
          {
            stackNavigator.push({
              id: `extension-${targetExtension.manifest.id}-aiModels`,
              title: targetExtension.manifest.name,
              icon: { url: ExtensionsService.getIconURL(targetExtension.manifest.id) },
              body: (
                <ExtensionPage
                  extensionId={targetExtension.manifest.id}
                  initialTab="aiModels"
                />
              )
            });
          } : undefined}
        />
      )
    });
  }

  return (
    <ActionLink
      size="xs"
      onClick={handleOpenModal}
    >
      {t("captionModelModal.editQuestionAction")}
    </ActionLink>
  );
}

type ImageFeatureTypeCardPropsType =
  {
    readonly type: ImageFeatureType;
    readonly features: readonly ExtensionImageFeature[];
    readonly isOpened: boolean;
    readonly onToggle: () => void;
    readonly onHide: () => void;
  };

export default function ImageFeatureTypeCard({
  type,
  features,
  isOpened,
  onToggle,
  onHide
}: ImageFeatureTypeCardPropsType): ReactElement | null
{
  const [ t ] = useTranslation();

  const featureContainers = useMemo(() => computeTypeFeatureContainers(type, features, t),
    [ type, features, t ]
  );

  if (featureContainers.length === 0)
  {
    return null;
  }

  function renderCaptionRightSection(feature: ImageFeatureContainerType): ReactNode
  {
    if (type !== ImageFeatureType.Caption)
    {
      return undefined;
    }
    return (
      <CaptionEditQuestionAction
        extensionId={feature.extensionId}
        featureName={feature.name}
      />
    );
  }

  return (
    <ImageFeatureCard
      title={t(`imageDetail.type.${type}`)}
      featureContainers={featureContainers}
      isOpened={isOpened}
      onToggle={onToggle}
      onHide={onHide}
      renderItemRightSection={type === ImageFeatureType.Caption ? renderCaptionRightSection : undefined}
    />
  );
}
