import { ReactElement, useCallback, useEffect, useMemo, useRef } from "react";
import { ActionIcon, Badge, Box, Button, Group, Input, Paper, Text, Tooltip } from "@mantine/core";
import { randomId } from "@mantine/hooks";
import { IconPhoto, IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { ImagePickerSelectionModeType } from "types";
import { useActionModalContext, useModalContext } from "app/context";
import { useImageSummariesByIds } from "app/hooks";
import Common from "../Common/Common.ts";
import ImagePicker from "../ImagePicker/ImagePicker.tsx";
import ImageThumbnail from "../ImageThumbnail/ImageThumbnail.tsx";
import style from "./ImagePickerField.module.scss";


type ImagePickerFieldPropsType = {
  readonly id?: string;
  readonly label?: string;
  readonly description?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly selectionMode: ImagePickerSelectionModeType;
  readonly value: readonly string[];
  readonly withTags?: readonly string[];
  readonly pickerTitle?: string;
  readonly onChange: (imageIds: string[]) => void;
  readonly onBlur?: () => void;
  readonly onFocus?: () => void;
};

const MAX_VISIBLE_MINI_THUMBS = 5;
const MINI_THUMB_HEIGHT = 48;
const MINI_THUMB_REQUEST_EDGE = 96;

export default function ImagePickerField({
  id,
  label,
  description,
  required = false,
  disabled = false,
  selectionMode,
  value,
  withTags,
  pickerTitle,
  onChange,
  onBlur,
  onFocus
}: ImagePickerFieldPropsType): ReactElement
{
  const [ t ] = useTranslation();
  const modalContext = useModalContext();
  const openModalOverlay = modalContext?.openOverlay;
  const { addModal, removeModal } = useActionModalContext();

  const closeOverlayRef = useRef<(() => void) | null>(null);
  const fallbackModalIdRef = useRef<string | null>(null);

  const visibleIds = useMemo<string[]>(
    () => value.slice(0, MAX_VISIBLE_MINI_THUMBS),
    [ value ]
  );

  const { summaries: visibleSummaries } = useImageSummariesByIds(visibleIds, {
    scope: "fieldSelected"
  });

  const closePicker = useCallback((): void =>
  {
    if (closeOverlayRef.current !== null)
    {
      const closeOverlay = closeOverlayRef.current;
      closeOverlayRef.current = null;
      closeOverlay();
    }
    if (fallbackModalIdRef.current !== null)
    {
      const modalIdToRemove = fallbackModalIdRef.current;
      fallbackModalIdRef.current = null;
      removeModal(modalIdToRemove);
    }
    onBlur?.();
  }, [ removeModal, onBlur ]);

  const openPicker = useCallback((): void =>
  {
    if (disabled === true)
    {
      return;
    }

    onFocus?.();

    const handleCancel = (): void =>
    {
      closePicker();
    };

    const handleConfirm = (selectedIds: string[]): void =>
    {
      closePicker();
      onChange(selectedIds);
    };

    const resolvedTitle = pickerTitle ?? label ?? (
      selectionMode === "single"
        ? t("imagePicker.defaultTitleSingle")
        : t("imagePicker.defaultTitleMultiple")
    );

    const pickerContent = (
      <ImagePicker
        selectionMode={selectionMode}
        initialSelectedIds={value}
        withTags={withTags}
        onCancel={handleCancel}
        onConfirm={handleConfirm}
      />
    );

    if (openModalOverlay !== undefined)
    {
      closeOverlayRef.current = openModalOverlay({
        title: resolvedTitle,
        content: pickerContent,
        onCancel: handleCancel
      });
      return;
    }

    const modalId = randomId();
    fallbackModalIdRef.current = modalId;
    addModal({
      id: modalId,
      size: "l",
      isFullHeight: true,
      icon: { icon: <IconPhoto stroke={Common.IconStrokeSize}/> },
      title: resolvedTitle,
      body: pickerContent,
      onBeforeClose: (): void =>
      {
        fallbackModalIdRef.current = null;
        onBlur?.();
      }
    });
  }, [ disabled, onFocus, closePicker, onChange, selectionMode, value, withTags, pickerTitle, openModalOverlay, addModal, label, t, onBlur ]);

  useEffect(() =>
  {
    return (): void =>
    {
      if (closeOverlayRef.current !== null)
      {
        const closeOverlay = closeOverlayRef.current;
        closeOverlayRef.current = null;
        closeOverlay();
      }
      if (fallbackModalIdRef.current !== null)
      {
        const modalIdToRemove = fallbackModalIdRef.current;
        fallbackModalIdRef.current = null;
        removeModal(modalIdToRemove);
      }
    };
  }, [ removeModal ]);

  const handleRemoveImage = useCallback((imageId: string): void =>
  {
    if (disabled === true)
    {
      return;
    }
    onChange(value.filter((id) => id !== imageId));
  }, [ disabled, onChange, value ]);

  const handleClearAll = useCallback((): void =>
  {
    if (disabled === true)
    {
      return;
    }
    onChange([]);
  }, [ disabled, onChange ]);

  const overflowCount = Math.max(0, value.length - MAX_VISIBLE_MINI_THUMBS);

  return (
    <Input.Wrapper
      id={id}
      label={label}
      description={description}
      required={required}
      mb="sm"
    >
      <Paper withBorder radius="sm" p="sm" mt={label !== undefined || description !== undefined ? 4 : 0}>
        {value.length === 0 ? (
          <Group justify="space-between" align="center" gap="sm" wrap="wrap" mih={MINI_THUMB_HEIGHT}>
            <Group gap="xs" align="center">
              <IconPhoto size={Common.IconMediumSize} stroke={Common.IconStrokeSize} color="var(--mantine-color-dimmed)"/>
              <Text size="sm" c="dimmed">
                {selectionMode === "single"
                  ? t("imagePicker.emptyFieldSingle")
                  : t("imagePicker.emptyFieldMultiple")}
              </Text>
            </Group>
            <Button
              size="xs"
              variant="default"
              disabled={disabled}
              leftSection={<IconPhoto size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>}
              onClick={openPicker}
            >
              {selectionMode === "single"
                ? t("imagePicker.pickSingle")
                : t("imagePicker.pickMultiple")}
            </Button>
          </Group>
        ) : (
          <Group justify="space-between" align="center" gap="sm" wrap="wrap" mih={MINI_THUMB_HEIGHT}>
            <Group gap="xs" align="center" wrap="wrap">
              {visibleSummaries.map((summary) => (
                <Tooltip key={summary.id} label={summary.name} openDelay={300}>
                  <Box className={style.miniThumbWrap}>
                    <ImageThumbnail
                      imageOrUrl={summary}
                      edge="100%"
                      requestEdge={MINI_THUMB_REQUEST_EDGE}
                      fit="cover"
                      radius={0}
                    />
                    {disabled === false && (
                      <ActionIcon
                        size={18}
                        radius="xl"
                        variant="filled"
                        color="dark"
                        className={style.miniThumbRemove}
                        onClick={() => handleRemoveImage(summary.id)}
                      >
                        <IconX size={11} stroke={2}/>
                      </ActionIcon>
                    )}
                  </Box>
                </Tooltip>
              ))}
              {visibleSummaries.length === 0 && value.length > 0 && (
                <Text size="sm" c="dimmed">
                  {t("imagePicker.selectedCount", { count: value.length })}
                </Text>
              )}
              {overflowCount > 0 && (
                <Badge variant="light" color="gray" size="md" radius="sm">
                  {t("imagePicker.overflowCount", { count: overflowCount })}
                </Badge>
              )}
            </Group>

            <Group gap="xs" align="center">
              <Button
                size="xs"
                variant="default"
                disabled={disabled}
                onClick={openPicker}
              >
                {t("imagePicker.change")}
              </Button>
              <Button
                size="xs"
                variant="subtle"
                color="gray"
                disabled={disabled}
                onClick={handleClearAll}
              >
                {t("imagePicker.clear")}
              </Button>
            </Group>
          </Group>
        )}
      </Paper>
    </Input.Wrapper>
  );
}
