import { ReactElement, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Divider, Stack, Text } from "@mantine/core";
import { IconInfoCircle, IconSparkles } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { CaptionInstruction, EligibleTagsInstruction, Extension, ExtensionAiModel } from "@picteus/ws-client";

import { ROUTES, ToastService } from "utils";
import { useModalContext } from "app/context";
import { useExtensionInstructions, useModalDiscardGuard, useSaveExtensionInstructionsMutation } from "app/hooks";
import { AiModelInstructionsService, ErrorService, ExtensionsService } from "app/services";
import ActionLink from "../ActionLink/ActionLink.tsx";
import CaptionInstructionSection from "../CaptionInstructionSection/CaptionInstructionSection.tsx";
import Common from "../Common/Common.ts";
import EligibleTagsInstructionSection from "../EligibleTagsInstructionSection/EligibleTagsInstructionSection.tsx";
import ErrorAlert from "../ErrorAlert/ErrorAlert.tsx";
import { createOpenExtensionNavigationState } from "../ExtensionPage/ExtensionPage.tsx";
import Loader from "../Loader/Loader.tsx";
import ModalActions from "../ModalActions/ModalActions.tsx";
import ModalError from "../ModalError/ModalError.tsx";


type CaptionModelModalPropsType =
  {
    readonly extension: Extension;
    readonly modelTechnicalId: string;
    readonly modelDisplayName: string;
    readonly model?: ExtensionAiModel;
    readonly onOpenAllModels?: () => void;
  };

export default function CaptionModelModal({
  extension,
  modelTechnicalId,
  modelDisplayName,
  model,
  onOpenAllModels
}: CaptionModelModalPropsType): ReactElement
{
  const [ t ] = useTranslation();
  const navigate = useNavigate();
  const modalContext = useModalContext();

  const capabilities = useMemo(
    () => ExtensionsService.computeInstructionCapabilities(extension),
    [ extension ]
  );

  const {
    data: instructionsData,
    isLoading,
    isError,
    error,
    refetch
  } = useExtensionInstructions(extension.manifest.id, capabilities, true);

  const saveInstructionsMutation = useSaveExtensionInstructionsMutation();

  const [ captionEnabled, setCaptionEnabled ] = useState<boolean>(true);
  const [ captionIsAuto, setCaptionIsAuto ] = useState<boolean>(false);
  const [ captionQuestion, setCaptionQuestion ] = useState<string>(AiModelInstructionsService.DEFAULT_CAPTION_QUESTION);
  const [ eligibleTagsEnabled, setEligibleTagsEnabled ] = useState<boolean>(false);
  const [ eligibleTagsIsAuto, setEligibleTagsIsAuto ] = useState<boolean>(false);
  const [ eligibleTagsQuestion, setEligibleTagsQuestion ] = useState<string>(
    AiModelInstructionsService.DEFAULT_ELIGIBLE_TAGS_QUESTION
  );
  const [ eligibleTags, setEligibleTags ] = useState<string[]>([ ...AiModelInstructionsService.DEFAULT_ELIGIBLE_TAGS ]);
  const [ saveErrorMessage, setSaveErrorMessage ] = useState<string | undefined>(undefined);
  const initializedRef = useRef<boolean>(false);

  const existingCaptionInstruction = useMemo<CaptionInstruction | undefined>(
    () => instructionsData?.captionInstructions.find(item => item.aiModelTechnicalId === modelTechnicalId),
    [ instructionsData?.captionInstructions, modelTechnicalId ]
  );

  const existingEligibleTagsInstruction = useMemo<EligibleTagsInstruction | undefined>(
    () => instructionsData?.eligibleTagsInstructions.find(item => item.aiModelTechnicalId === modelTechnicalId),
    [ instructionsData?.eligibleTagsInstructions, modelTechnicalId ]
  );

  const initialState = useMemo(() => ({
    captionEnabled: existingCaptionInstruction?.enabled ?? true,
    captionIsAuto: existingCaptionInstruction?.isAuto ?? false,
    captionQuestion: existingCaptionInstruction?.question ?? AiModelInstructionsService.DEFAULT_CAPTION_QUESTION,
    eligibleTagsEnabled: existingEligibleTagsInstruction?.enabled ?? false,
    eligibleTagsIsAuto: existingEligibleTagsInstruction?.isAuto ?? false,
    eligibleTagsQuestion: existingEligibleTagsInstruction?.question ?? AiModelInstructionsService.DEFAULT_ELIGIBLE_TAGS_QUESTION,
    eligibleTags: existingEligibleTagsInstruction?.tags
      ? [ ...existingEligibleTagsInstruction.tags ]
      : [ ...AiModelInstructionsService.DEFAULT_ELIGIBLE_TAGS ]
  }), [ existingCaptionInstruction, existingEligibleTagsInstruction ]);

  useEffect(() =>
  {
    if (instructionsData !== undefined && initializedRef.current === false)
    {
      initializedRef.current = true;
      setCaptionEnabled(initialState.captionEnabled);
      setCaptionIsAuto(initialState.captionIsAuto);
      setCaptionQuestion(initialState.captionQuestion);
      setEligibleTagsEnabled(initialState.eligibleTagsEnabled);
      setEligibleTagsIsAuto(initialState.eligibleTagsIsAuto);
      setEligibleTagsQuestion(initialState.eligibleTagsQuestion);
      setEligibleTags([ ...initialState.eligibleTags ]);
    }
  }, [ instructionsData, initialState ]);

  const { supportsEligibleTags } = AiModelInstructionsService.getModelSupportedCapabilities(model?.modalities, capabilities);

  const isCaptionQuestionChanged = instructionsData !== undefined && captionQuestion !== initialState.captionQuestion;

  const isCaptionDirty = instructionsData !== undefined && (
    captionEnabled !== initialState.captionEnabled ||
    captionIsAuto !== initialState.captionIsAuto ||
    captionQuestion !== initialState.captionQuestion
  );

  const isEligibleTagsDirty = instructionsData !== undefined && supportsEligibleTags === true && (
    eligibleTagsEnabled !== initialState.eligibleTagsEnabled ||
    eligibleTagsIsAuto !== initialState.eligibleTagsIsAuto ||
    eligibleTagsQuestion !== initialState.eligibleTagsQuestion ||
    eligibleTags.length !== initialState.eligibleTags.length ||
    eligibleTags.some((tag, index) => tag !== initialState.eligibleTags[index])
  );

  const isDirty = isCaptionDirty === true || isEligibleTagsDirty === true;

  const isCaptionValid = captionEnabled === false || captionQuestion.trim().length > 0;

  const eligibleTagsErrorKind = supportsEligibleTags === true
    ? AiModelInstructionsService.validateEligibleTagsQuestion(eligibleTagsQuestion, eligibleTagsEnabled)
    : undefined;

  const isValid = isCaptionValid === true && eligibleTagsErrorKind === undefined;

  const closeWithDiscardGuard = useModalDiscardGuard({
    isDirty,
    discardTitle: t("extensionConfiguration.discardTitle"),
    discardMessage: t("captionModelModal.discardMessage", { model: modelDisplayName })
  });

  function handleOpenAllModels(): void
  {
    closeWithDiscardGuard(() =>
    {
      if (onOpenAllModels !== undefined)
      {
        onOpenAllModels();
        return;
      }
      navigate(ROUTES.extensions, {
        state: createOpenExtensionNavigationState(extension.manifest.id, "aiModels")
      });
    });
  }

  async function handleSave(): Promise<void>
  {
    if (instructionsData === undefined || isValid === false || isDirty === false)
    {
      return;
    }
    setSaveErrorMessage(undefined);

    try
    {
      let nextCaptionInstructions: CaptionInstruction[] | undefined;
      if (isCaptionDirty === true)
      {
        const patchedCaption: CaptionInstruction = {
          aiModelTechnicalId: modelTechnicalId,
          enabled: captionEnabled,
          isAuto: captionIsAuto,
          question: captionQuestion.trim()
        };
        const exists = instructionsData.captionInstructions.some(
          item => item.aiModelTechnicalId === modelTechnicalId
        );
        nextCaptionInstructions = exists === true
          ? instructionsData.captionInstructions.map(item =>
            item.aiModelTechnicalId === modelTechnicalId ? patchedCaption : item
          )
          : [ ...instructionsData.captionInstructions, patchedCaption ];
      }

      let nextEligibleTagsInstructions: EligibleTagsInstruction[] | undefined;
      if (isEligibleTagsDirty === true)
      {
        const patchedTags: EligibleTagsInstruction = {
          aiModelTechnicalId: modelTechnicalId,
          enabled: eligibleTagsEnabled,
          isAuto: eligibleTagsIsAuto,
          question: eligibleTagsQuestion.trim(),
          tags: eligibleTags
        };
        const exists = instructionsData.eligibleTagsInstructions.some(
          item => item.aiModelTechnicalId === modelTechnicalId
        );
        nextEligibleTagsInstructions = exists === true
          ? instructionsData.eligibleTagsInstructions.map(item =>
            item.aiModelTechnicalId === modelTechnicalId ? patchedTags : item
          )
          : [ ...instructionsData.eligibleTagsInstructions, patchedTags ];
      }

      await saveInstructionsMutation.mutateAsync({
        extensionId: extension.manifest.id,
        captionInstructions: nextCaptionInstructions,
        eligibleTagsInstructions: nextEligibleTagsInstructions
      });

      ToastService.success(t("captionModelModal.saveSuccess", { model: modelDisplayName }));
      modalContext?.closeModal(true);
    }
    catch (saveError)
    {
      const reason = await ErrorService.extractErrorReason(saveError);
      setSaveErrorMessage(reason.length > 0 ? reason : t("captionModelModal.saveError"));
    }
  }

  const isBusy = saveInstructionsMutation.isPending === true;

  return (
    <>
      {isLoading === true && instructionsData === undefined ? (
        <Loader/>
      ) : isError === true && instructionsData === undefined ? (
        <ErrorAlert
          title={t("extensionConfiguration.instructions.loadErrorTitle", { name: extension.manifest.name })}
          message={error?.message}
          onRetry={() => void refetch()}
        />
      ) : (
        <Stack gap="md">
          <ModalError
            title={t("captionModelModal.saveError")}
            error={saveErrorMessage}
          />

          <CaptionInstructionSection
            isEnabled={captionEnabled}
            isAuto={captionIsAuto}
            question={captionQuestion}
            switchLayout="column"
            hideQuestionWhenDisabled
            minRows={3}
            isQuestionChanged={isCaptionQuestionChanged}
            notice={(
              <Alert color="blue" variant="light" icon={<IconInfoCircle size={Common.IconSmallSize}/>}>
                <Text size="xs">
                  {t("captionModelModal.futureCaptionsNotice")}
                </Text>
              </Alert>
            )}
            onIsEnabledChange={setCaptionEnabled}
            onIsAutoChange={setCaptionIsAuto}
            onQuestionChange={setCaptionQuestion}
          />

          {supportsEligibleTags === true && (
            <>
              <Divider/>
              <EligibleTagsInstructionSection
                isEnabled={eligibleTagsEnabled}
                isAuto={eligibleTagsIsAuto}
                question={eligibleTagsQuestion}
                tags={eligibleTags}
                switchLayout="column"
                onIsEnabledChange={setEligibleTagsEnabled}
                onIsAutoChange={setEligibleTagsIsAuto}
                onQuestionChange={setEligibleTagsQuestion}
                onTagsChange={setEligibleTags}
              />
            </>
          )}
        </Stack>
      )}

      <ModalActions
        isBusy={isBusy}
        leftSection={(
          <ActionLink
            leftSection={<IconSparkles size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>}
            onClick={handleOpenAllModels}
          >
            {t("captionModelModal.allAiModelsLink", { extension: extension.manifest.name })}
          </ActionLink>
        )}
      >
        <Button
          loading={isBusy}
          disabled={isLoading === true || isBusy === true || isDirty === false || isValid === false}
          onClick={() => void handleSave()}
        >
          {t("button.save")}
        </Button>
      </ModalActions>
    </>
  );
}
