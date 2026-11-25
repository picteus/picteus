import React, { ReactElement, useCallback, useEffect, useMemo, useState } from "react";
import { Box, Checkbox, Flex, Stack, Text } from "@mantine/core";
import { randomId } from "@mantine/hooks";
import { useTranslation } from "react-i18next";
import { IconTopologyRing3 } from "@tabler/icons-react";

import {
  CommandEntity,
  ExtensionImageTag,
  Image,
  ImageFormat,
  ManifestCapabilityId,
  SearchOriginNature
} from "@picteus/ws-client";

import { IconSizeType, ImageCommandIdType, ImageCommandType, ImageOrSummary, ViewMode } from "types";
import { removeFilePrefixFromUrl, ToastService } from "utils";
import { useActionModalContext, useCommandSocket, useDeskTabsContext } from "app/context";
import {
  useConfirmAction,
  useExtensionCommandRunner,
  useExtensionCommands,
  useExtensionsWithCapability,
  useFileOrDirectoryPicker,
  useOpenExplorer,
  useRunCapabilities
} from "app/hooks";
import { ImageService, NotificationService, StorageService } from "app/services";
import { ClosestEmbeddingsImages, CommandIcon, Common, computeIcon, ImageThumbnail } from "app/components";


type DeleteImageConfirmationContentPropsType = {
  image: ImageOrSummary;
  initialShouldDeleteFile: boolean;
  onChangeShouldDeleteFile: (shouldDeleteFile: boolean) => void;
};

function DeleteImageConfirmationContent({
  image,
  initialShouldDeleteFile,
  onChangeShouldDeleteFile
}: DeleteImageConfirmationContentPropsType): ReactElement
{
  const [ t ] = useTranslation();
  const [ shouldDeleteFile, setShouldDeleteFile ] = useState<boolean>(initialShouldDeleteFile);

  return (
    <Stack gap="sm">
      <Flex align="center" gap="md">
        <Box style={{ flexShrink: 0 }}>
          <ImageThumbnail imageOrUrl={image} edge={Common.ImageThumbnailEdge}/>
        </Box>
        <Text size="sm">
          {t("commands.confirmImageDeleteConsequences")}
        </Text>
      </Flex>
      <Checkbox
        label={t("commands.confirmImageDeleteShouldDeleteFile")}
        checked={shouldDeleteFile}
        onChange={(event) =>
        {
          const isChecked = event.currentTarget.checked;
          setShouldDeleteFile(isChecked);
          onChangeShouldDeleteFile(isChecked);
        }}
      />
    </Stack>
  );
}

function computeBase64Content(blob: Blob): Promise<string>
{
  return new Promise<string>((resolve, reject) =>
  {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

type UseImageCommandsOptionsType = {
  image: ImageOrSummary;
  viewMode?: ViewMode;
};

export type UseImageCommandsResultType = {
  commands: ImageCommandType[];
  coreCommands: ImageCommandType[];
  extensionCommands: ImageCommandType[];
  getCommand: (
    commandIdentifier: ImageCommandIdType | string,
    extensionId?: string
  ) => ImageCommandType | undefined;
  isLoading: boolean;
};

const commandEntities = [ CommandEntity.Images, CommandEntity.Image ];

export default function useImageCommands({
  image,
  viewMode = "gallery"
}: UseImageCommandsOptionsType): UseImageCommandsResultType
{
  const [ t ] = useTranslation();
  const { addModal } = useActionModalContext();
  const confirmAction = useConfirmAction();
  const { runCapabilities } = useRunCapabilities();
  const commandRunner = useExtensionCommandRunner();
  const [ imageTags, setImageTags ] = useState<ExtensionImageTag[]>([]);
  const [ isLoadingTags, setIsLoadingTags ] = useState<boolean>(Boolean(image.id));
  const [ runningCommandId, setRunningCommandId ] = useState<string | null>(null);
  const { addTab } = useDeskTabsContext();
  const openExplorer = useOpenExplorer();
  const pickFileOrDirectory = useFileOrDirectoryPicker();
  const { sendCommand } = useCommandSocket();

  const extensionsImageCommands = useExtensionCommands(commandEntities);
  const extensionsWithImageEmbeddingsCapability = useExtensionsWithCapability(ManifestCapabilityId.ImageEmbeddings);

  useEffect(() =>
  {
    let isMounted = true;

    async function loadTags(): Promise<void>
    {
      setIsLoadingTags(true);
      try
      {
        const tags = "tags" in image && (image as Image).tags !== undefined ? (image as Image).tags : await ImageService.getAllTags(image.id);
        if (isMounted)
        {
          setImageTags(tags ?? []);
        }
      }
      catch (error)
      {
        ToastService.apiCallError(error);
      }
      finally
      {
        if (isMounted)
        {
          setIsLoadingTags(false);
        }
      }
    }

    void loadTags();

    return () =>
    {
      isMounted = false;
    };
  }, [ image ]);

  const hasImageEmbeddingsCapability = useMemo(() =>
  {
    return extensionsWithImageEmbeddingsCapability !== undefined && extensionsWithImageEmbeddingsCapability.length > 0;
  }, [ extensionsWithImageEmbeddingsCapability ]);

  const coreCommands = useMemo<ImageCommandType[]>(() =>
  {
    const list: ImageCommandType[] = [];

    if (hasImageEmbeddingsCapability)
    {
      list.push({
        id: "closestImages",
        kind: "core",
        commandId: "closestImages",
        label: t("commands.closestImages"),
        subLabel: t("commands.allExtensionsDetails"),
        isAvailable: true,
        isLoading: runningCommandId === "closestImages",
        icon: (size?: IconSizeType) =>
        {
          const edge = typeof size === "number" ? size : Common.IconFromStringToNumberSize(size);
          return <IconTopologyRing3 style={{ width: edge, height: edge }}/>;
        },
        execute: () =>
        {
          addModal({
            isStackable: true,
            icon: { icon: <IconTopologyRing3 stroke={Common.IconStrokeSize}/> },
            title: t("closestEmbeddingsImagesModal.title"),
            size: "l",
            body: (
              <ClosestEmbeddingsImages
                image={image}
                viewMode={viewMode}
              />
            )
          });
        }
      });
    }

    list.push({
      id: "synchronize",
      kind: "core",
      commandId: "synchronize",
      label: t("commands.synchronize"),
      subLabel: t("commands.allExtensionsDetails"),
      isAvailable: true,
      isLoading: runningCommandId === "synchronize",
      icon: (size?: IconSizeType) =>
      {
        return computeIcon("synchronize", size);
      },
      execute: async () =>
      {
        setRunningCommandId("synchronize");
        try
        {
          runCapabilities(image.id);
        }
        finally
        {
          setRunningCommandId(null);
        }
      }
    });

    list.push({
      id: "pin",
      kind: "core",
      commandId: "pin",
      label: t("commands.pin"),
      subLabel: t("commands.allExtensionsDetails"),
      isAvailable: true,
      isLoading: runningCommandId === "pin",
      icon: (size?: IconSizeType) =>
      {
        return computeIcon("pin", size);
      },
      execute: async (): Promise<void> =>
      {
        const illustrationUri = await ImageService.computeImageUriFromUrls([ image.url ], Common.NotificationIllustrationEdge);
        const tabId = addTab({
          id: randomId(),
          label: image.name,
          icon: { url: illustrationUri },
          content: {
            kind: "image",
            imageId: image.id
          }
        }, false);
        void NotificationService.storeNotification({
          id: tabId,
          milliseconds: Date.now(),
          type: "tab",
          title: t("commands.pinNotification.title"),
          subtitle: t("commands.pinNotification.subtitle"),
          data: { id: tabId },
          illustrationUri
        });
      }
    });

    list.push({
      id: "open",
      kind: "core",
      commandId: "open",
      label: t("commands.open"),
      subLabel: t("commands.allExtensionsDetails"),
      isAvailable: true,
      isLoading: runningCommandId === "open",
      icon: (size?: IconSizeType) =>
      {
        return computeIcon("open", size);
      },
      execute: () =>
      {
        const url = image.url;
        if (url.startsWith("file://") === true)
        {
          void openExplorer(removeFilePrefixFromUrl(url));
        }
        else
        {
          window.open(url, "_blank");
        }
      }
    });

    list.push({
      id: "copy",
      kind: "core",
      commandId: "copy",
      label: t("commands.copy"),
      subLabel: t("commands.allExtensionsDetails"),
      isAvailable: true,
      isLoading: runningCommandId === "copy",
      icon: (size?: IconSizeType) =>
      {
        return computeIcon("copy", size);
      },
      execute: async (): Promise<void> =>
      {
        setRunningCommandId("copy");
        try
        {
          const mimeType = "image/png";
          // The PNG blob is provided as a promise, so that the clipboard write is initiated while the user activation is still valid
          const blobPromise = ImageService.download(image.id, ImageFormat.Png, true).then((blob) =>
          {
            return blob.type === mimeType ? blob : new Blob([ blob ], { type: mimeType });
          });
          await navigator.clipboard.write([ new ClipboardItem({ [mimeType]: blobPromise }) ]);
          ToastService.success(t("commands.copySuccess"));
        }
        catch (error)
        {
          ToastService.apiCallError(error);
        }
        finally
        {
          setRunningCommandId(null);
        }
      }
    });

    list.push({
      id: "download",
      kind: "core",
      commandId: "download",
      label: t("commands.download"),
      subLabel: t("commands.allExtensionsDetails"),
      isAvailable: true,
      isLoading: runningCommandId === "download",
      icon: (size?: IconSizeType) =>
      {
        return computeIcon("download", size);
      },
      execute: () =>
      {
        ImageService.download(image.id).then(async blob =>
        {
          const filePath = await pickFileOrDirectory("file", "save", image.name);
          await sendCommand("saveFile", { filePath, content: await computeBase64Content(blob) });
          void openExplorer(filePath);
        }).catch(ToastService.apiCallError);
      }
    });

    list.push({
      id: "delete",
      kind: "core",
      commandId: "delete",
      label: t("commands.delete"),
      subLabel: t("commands.noExtensionDetails"),
      isAvailable: true,
      isLoading: runningCommandId === "delete",
      icon: (size?: IconSizeType) =>
      {
        return computeIcon("delete", size);
      },
      execute: () =>
      {
        const initialShouldDeleteFile = StorageService.getImageDeleteShouldDeleteFile();
        let shouldDeleteFile = initialShouldDeleteFile;

        confirmAction({
          onConfirm: () =>
          {
            StorageService.setImageDeleteShouldDeleteFile(shouldDeleteFile);
            return ImageService.destroy(image.id, shouldDeleteFile).then(() => ToastService.success()).catch(ToastService.apiCallError);
          },
          options: {
            title: t("commands.confirmImageDeleteTitle"),
            message: t("commands.confirmImageDeleteMessage"),
            content: (
              <DeleteImageConfirmationContent
                image={image}
                initialShouldDeleteFile={initialShouldDeleteFile}
                onChangeShouldDeleteFile={(isChecked) =>
                {
                  shouldDeleteFile = isChecked;
                }}
              />
            )
          }
        });
      }
    });

    return list;
  }, [ image, viewMode, hasImageEmbeddingsCapability, runningCommandId, addModal, runCapabilities, confirmAction, sendCommand ]);

  const extensionCommands = useMemo<ImageCommandType[]>(() =>
  {
    if (!extensionsImageCommands)
    {
      return [];
    }

    return extensionsImageCommands.filter((extensionCommand) =>
    {
      const { withTags } = extensionCommand.command;
      if (withTags?.length)
      {
        return withTags.some((tag) =>
        {
          return imageTags.some((imageTag) =>
          {
            return imageTag.value === tag;
          });
        });
      }
      return true;
    }).map((extensionCommand): ImageCommandType =>
    {
      const manifest = extensionCommand.extension.manifest;
      const command = extensionCommand.command;
      const commandIdentifier = command.id ?? "";
      const compositeId = `${manifest.id}-${commandIdentifier}`;

      return {
        id: compositeId,
        kind: "extension",
        commandId: commandIdentifier,
        extensionId: manifest.id,
        label: command.label ?? "",
        subLabel: manifest.name,
        isAvailable: true,
        isLoading: runningCommandId === compositeId,
        rawExtensionCommand: extensionCommand,
        icon: (size?: IconSizeType) =>
        {
          return <CommandIcon extensionId={manifest.id} command={command} size={size}/>;
        },
        execute: async () =>
        {
          setRunningCommandId(compositeId);
          try
          {
            await commandRunner(
              manifest.id,
              command,
              {
                origin: {
                  kind: SearchOriginNature.Images,
                  ids: [ image.id ]
                }
              },
              undefined,
              () =>
              {
                setRunningCommandId(null);
              }
            );
          }
          catch (error)
          {
            setRunningCommandId(null);
            throw error;
          }
        }
      };
    });
  }, [ extensionsImageCommands, imageTags, runningCommandId, commandRunner, image?.id ]);

  const commands = useMemo<ImageCommandType[]>(() =>
  {
    return [ ...coreCommands, ...extensionCommands ];
  }, [ coreCommands, extensionCommands ]);

  const getCommand = useCallback((
    commandIdentifier: ImageCommandIdType | string,
    extensionId?: string
  ): ImageCommandType | undefined =>
  {
    if (typeof commandIdentifier === "object" && commandIdentifier !== null)
    {
      return commands.find((command) =>
      {
        return command.extensionId === commandIdentifier.extensionId && command.commandId === commandIdentifier.commandId;
      });
    }

    if (extensionId !== undefined)
    {
      return commands.find((command) =>
      {
        return command.extensionId === extensionId && command.commandId === commandIdentifier;
      });
    }

    return commands.find((command) =>
    {
      return command.id === commandIdentifier || command.commandId === commandIdentifier;
    });
  }, [ commands ]);

  return {
    commands,
    coreCommands,
    extensionCommands,
    getCommand,
    isLoading: isLoadingTags || runningCommandId !== null
  };
}
