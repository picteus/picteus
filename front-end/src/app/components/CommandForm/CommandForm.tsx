import { type ReactElement, useMemo, useState } from "react";
import { Alert, Button, Checkbox, Flex, Stack, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { SearchFilter, SearchImageSummaryResult, SearchOriginNature } from "@picteus/ws-client";

import { ImagePickerSelectionModeType, UiCommandType } from "types";
import { useModalContext } from "app/context";
import { useExtension, useKey } from "app/hooks";
import { queryKeys } from "app/query";
import { ExtensionsService, ImageService, StorageService } from "app/services";
import { extractSchemaAndUiSchema, Markdown, ModalActions, RjsfForm } from "app/components";
import ImagePickerField from "../ImagePickerField/ImagePickerField.tsx";
import { CommandSingleImagePreview, CommandTargetStrip } from "./components";


const TARGET_PREVIEW_FETCH_COUNT = 3;

type CommandFormType = {
  command: UiCommandType;
  extensionId: string;
  searchFilter?: SearchFilter;
  imageSelectionMode?: ImagePickerSelectionModeType;
  onSend: (extensionId: string, commandId: string, parameters?: object, selectedSearchFilter?: SearchFilter) => void;
};

export default function CommandForm({
  command,
  extensionId,
  searchFilter,
  imageSelectionMode,
  onSend
}: CommandFormType): ReactElement
{
  const form = command.form;
  const isCommandModal = command.id !== undefined;
  const hasNoParameters = form === undefined || form.parameters === undefined;
  const needsImageSelection = searchFilter === undefined && imageSelectionMode !== undefined;
  const modalContext = useModalContext();
  const isOverlayOpen = modalContext?.isOverlayActive === true;

  const { t, i18n } = useTranslation();
  const { data: extensionAndManual } = useExtension(extensionId);

  const initialParameters = useMemo<Record<string, unknown> | undefined>(() =>
  {
    if (command.id === undefined || hasNoParameters === true)
    {
      return undefined;
    }
    return StorageService.getCommandParameters(extensionId, command.id);
  }, [ extensionId, command.id, hasNoParameters ]);

  const [ parameters, setParameters ] = useState<object | undefined>(initialParameters);
  const [ selectedImageIds, setSelectedImageIds ] = useState<string[]>([]);
  const [ isRjsfValid, setIsRjsfValid ] = useState<boolean>(hasNoParameters);
  const [ shouldDoNotAskAgain, setShouldDoNotAskAgain ] = useState<boolean>(false);

  const specification = useMemo(
    () => ExtensionsService.findManifestCommandSpecification(extensionAndManual?.manifest, command.id, i18n.language),
    [ extensionAndManual?.manifest, command.id, i18n.language ]
  );

  const manualSections = useMemo(
    () => ExtensionsService.extractCommandManualSections(extensionAndManual?.manual?.instructions, command.id),
    [ extensionAndManual?.manual?.instructions, command.id ]
  );

  const filterKey = useMemo<string>(
    () => (searchFilter !== undefined ? JSON.stringify(searchFilter) : ""),
    [ searchFilter ]
  );

  const { data: targetImagesData } = useQuery<SearchImageSummaryResult, Error>({
    queryKey: queryKeys.images.commandSummaries(filterKey),
    queryFn: (): Promise<SearchImageSummaryResult> =>
    {
      return ImageService.searchSummaries({
        filter: searchFilter!,
        range: { take: TARGET_PREVIEW_FETCH_COUNT }
      });
    },
    enabled: isCommandModal === true && searchFilter !== undefined
  });

  const targetImages = targetImagesData?.items ?? [];
  const targetTotalCount = targetImagesData?.totalCount ?? targetImages.length;
  const isDirectSingleImage =
    searchFilter?.origin?.kind === SearchOriginNature.Images &&
    searchFilter.origin.ids.length === 1;
  const singleTargetImage =
    isCommandModal === true && isDirectSingleImage === true && targetImages.length === 1
      ? targetImages[0]
      : undefined;
  const isMultiImageTarget =
    isCommandModal === true &&
    searchFilter !== undefined &&
    isDirectSingleImage === false &&
    targetTotalCount > 0;

  const canSubmit = (hasNoParameters === true || isRjsfValid === true) && (needsImageSelection === false || selectedImageIds.length > 0);

  const { schema, uiSchema } = useMemo(() =>
  {
    if (hasNoParameters === true || form?.parameters === undefined)
    {
      return {
        schema: undefined,
        uiSchema: undefined
      };
    }
    return extractSchemaAndUiSchema(form.parameters);
  }, [ hasNoParameters, form?.parameters ]);

  function handleSend(): void
  {
    if (canSubmit === false)
    {
      return;
    }
    if (command.id !== undefined)
    {
      if (hasNoParameters === true && needsImageSelection === false && shouldDoNotAskAgain === true)
      {
        StorageService.setCommandDoNotAskAgain(extensionId, command.id, true);
      }
      else if (hasNoParameters === false && parameters !== undefined)
      {
        StorageService.setCommandParameters(extensionId, command.id, parameters as Record<string, unknown>);
      }
    }

    const resolvedSearchFilter: SearchFilter | undefined = needsImageSelection === true ? {
      origin: {
        kind: SearchOriginNature.Images,
        ids: selectedImageIds
      }
    } : searchFilter;

    onSend(extensionId, command.id, hasNoParameters === true ? undefined : parameters, resolvedSearchFilter);
  }

  useKey("Enter", handleSend, {
    isEnabled: isOverlayOpen === false && canSubmit === true
  });

  const commandLabel = ExtensionsService.resolveCommandLabel(command.id, specification, command.label);

  const pickerTitle = imageSelectionMode === "single"
    ? t("imagePicker.pickTitleSingle", { command: commandLabel })
    : t("imagePicker.pickTitleMultiple", { command: commandLabel });

  const shouldShowNoParametersBody =
    isCommandModal === true &&
    hasNoParameters === true &&
    needsImageSelection === false &&
    form?.dialogContent === undefined;

  const inlineManualMarkdown = manualSections.details ?? manualSections.full;

  const shouldShowDoNotAskAgain =
    isCommandModal === true &&
    hasNoParameters === true &&
    needsImageSelection === false;

  const hasManualOverlay =
    isCommandModal === true &&
    shouldShowNoParametersBody === false &&
    manualSections.full !== undefined;

  const formContent = (
    <Stack gap="md" flex={1} miw={0} mih={hasManualOverlay === true ? "min(360px, 45dvh)" : undefined}>
      {form?.dialogContent && (
        <Stack gap="xs">
          <Alert icon={<IconInfoCircle/>}>
            <Markdown content={form.dialogContent.description}/>
          </Alert>
          {form.dialogContent.details && (
            <Text component="div" c="dimmed" size="sm" fs="italic">
              <Markdown content={form.dialogContent.details}/>
            </Text>
          )}
        </Stack>
      )}
      {isMultiImageTarget === true && (
        <CommandTargetStrip
          images={targetImages}
          totalCount={targetTotalCount}
        />
      )}
      {needsImageSelection === true && imageSelectionMode !== undefined && (
        <ImagePickerField
          label={imageSelectionMode === "single"
            ? t("field.image")
            : t("field.images")}
          required={true}
          selectionMode={imageSelectionMode}
          value={selectedImageIds}
          withTags={command.withTags}
          pickerTitle={pickerTitle}
          onChange={setSelectedImageIds}
        />
      )}
      {form?.parameters && schema !== undefined && (
        <RjsfForm
          initialFormData={initialParameters}
          schema={schema}
          uiSchema={uiSchema}
          autoFocus={needsImageSelection === false || selectedImageIds.length > 0}
          onChange={setParameters}
          onValidationChange={setIsRjsfValid}
        />
      )}
      {shouldShowNoParametersBody === true && (
        inlineManualMarkdown !== undefined ? (
          <Markdown
            content={inlineManualMarkdown}
            size="sm"
            withBoldTitles={false}
            headingLevelOffset={1}
          />
        ) : (
          <Text size="sm" c="dimmed">
            {t("commands.confirmRun", { command: commandLabel })}
          </Text>
        )
      )}
    </Stack>
  );

  const primaryButtonLabel = isCommandModal === false
    ? t("button.send")
    : shouldShowDoNotAskAgain === true
      ? t("button.next")
      : t("button.run");

  return (
    <>
      {singleTargetImage !== undefined ? (
        <Flex gap="lg" align="flex-start" miw={0}>
          <CommandSingleImagePreview image={singleTargetImage}/>
          {formContent}
        </Flex>
      ) : (
        formContent
      )}
      <ModalActions
        leftSection={shouldShowDoNotAskAgain === true ? (
          <Checkbox
            label={t("commands.doNotAskAgain")}
            checked={shouldDoNotAskAgain}
            disabled={isOverlayOpen === true}
            onChange={(event) => setShouldDoNotAskAgain(event.currentTarget.checked)}
          />
        ) : undefined}
      >
        <Button disabled={canSubmit === false || isOverlayOpen === true} onClick={handleSend}>
          {primaryButtonLabel}
        </Button>
      </ModalActions>
    </>
  );
}
