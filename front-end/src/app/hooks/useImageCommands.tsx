import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { IconTopologyRing3 } from "@tabler/icons-react";

import { CommandEntity, ExtensionImageTag, Image, ManifestCapabilityId, SearchOriginNature } from "@picteus/ws-client";

import { CommandIconSizeType, ImageCommandIdType, ImageCommandType, ImageOrSummary, ViewMode } from "types";
import { removeFilePrefixFromUrl, ToastService } from "utils";
import { useActionModalContext, useCommandSocket } from "app/context";
import {
  useConfirmAction,
  useExtensionCommandRunner,
  useExtensionCommands,
  useExtensionsWithCapability,
  useFileOrDirectoryPicker,
  useOpenExplorer,
  useRunCapabilities
} from "app/hooks";
import { ImageService } from "app/services";
import { ClosestEmbeddingsImages, CommandIcon, Common, computeIcon, ImageItemWrapper } from "app/components";


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
  const [ , addModal ] = useActionModalContext();
  const confirmAction = useConfirmAction();
  const { runCapabilities } = useRunCapabilities();
  const commandRunner = useExtensionCommandRunner();
  const [ imageTags, setImageTags ] = useState<ExtensionImageTag[]>([]);
  const [ isLoadingTags, setIsLoadingTags ] = useState<boolean>(Boolean(image.id));
  const [ runningCommandId, setRunningCommandId ] = useState<string | null>(null);
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
        icon: (size?: CommandIconSizeType) =>
        {
          const iconDimension = typeof size === "number" ? size : (size === "md" ? Common.IconLargeSize : Common.IconSmallSize);
          return <IconTopologyRing3 style={{ width: iconDimension, height: iconDimension }}/>;
        },
        execute: () =>
        {
          addModal({
            component: (
              <ClosestEmbeddingsImages
                image={image}
                viewMode={viewMode}
              />
            ),
            isStackable: true,
            title: t("closestEmbeddingsImagesModal.title"),
            size: "l"
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
      icon: (size?: CommandIconSizeType) =>
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
      id: "open",
      kind: "core",
      commandId: "open",
      label: t("commands.open"),
      subLabel: t("commands.allExtensionsDetails"),
      isAvailable: true,
      isLoading: runningCommandId === "delete",
      icon: (size?: CommandIconSizeType) =>
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
      id: "download",
      kind: "core",
      commandId: "download",
      label: t("commands.download"),
      subLabel: t("commands.allExtensionsDetails"),
      isAvailable: true,
      isLoading: runningCommandId === "delete",
      icon: (size?: CommandIconSizeType) =>
      {
        return computeIcon("download", size);
      },
      execute: () =>
      {
        ImageService.download(image.id).then(async blob =>
        {
          const filePath = await pickFileOrDirectory("file", "save", image.name);
          const base64Content = await new Promise<string>((resolve, _) =>
          {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
            reader.readAsDataURL(blob);
          });
          await sendCommand("saveFile", { filePath, content: base64Content });
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
      icon: (size?: CommandIconSizeType) =>
      {
        return computeIcon("delete", size);
      },
      execute: () =>
      {
        confirmAction({
          onConfirm: () =>
          {
            return ImageService.destroy(image.id).catch(ToastService.apiCallError);
          },
          options: {
            title: t("commands.confirmImageDeleteTitle"),
            message: t("commands.confirmImageDeleteMessage"),
            content: (
              <ImageItemWrapper imageId={image.id} viewMode={viewMode}/>
            )
          }
        });
      }
    });

    return list;
  }, [ image, viewMode, hasImageEmbeddingsCapability, runningCommandId, addModal, runCapabilities, confirmAction ]);

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
        icon: (size?: CommandIconSizeType) =>
        {
          const iconSize = size === "md" ? "md" : "sm";
          return <CommandIcon extensionId={manifest.id} command={command} size={iconSize}/>;
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
