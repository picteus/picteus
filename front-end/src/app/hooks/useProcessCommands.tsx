import { type ReactElement, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { type HotkeyItem, useHotkeys } from "@mantine/hooks";

import { CommandEntity, ManifestCapabilityId } from "@picteus/ws-client";

import { CommandIconSizeType, ProcessCommandIdType, ProcessCommandType } from "types";
import { useActionModalContext } from "app/context";
import { useExtensionCommandRunner, useExtensionCommands, useExtensionsWithCapability } from "app/hooks";
import { CommandIcon, ExtensionIcon, TextToImages } from "app/components";


export type UseProcessCommandsOptionsType = {
  registerShortcuts?: boolean;
};

export type UseProcessCommandsResultType = {
  commands: ProcessCommandType[];
  coreCommands: ProcessCommandType[];
  extensionCommands: ProcessCommandType[];
  getCommand: (commandIdentifier: ProcessCommandIdType | string, extensionId?: string) => ProcessCommandType | undefined;
  isLoading: boolean;
};

const commandEntities = [ CommandEntity.Process ];

export default function useProcessCommands(
  options: UseProcessCommandsOptionsType = {}
): UseProcessCommandsResultType
{
  const [ t ] = useTranslation();
  const { registerShortcuts = false } = options;
  const { addModal } = useActionModalContext();
  const commandRunner = useExtensionCommandRunner();
  const [ runningCommandId, setRunningCommandId ] = useState<string | null>(null);

  const extensionsProcessCommands = useExtensionCommands(commandEntities);
  const extensionsWithTextEmbeddingsCapability = useExtensionsWithCapability(ManifestCapabilityId.TextEmbeddings);

  const coreCommands = useMemo<ProcessCommandType[]>(() =>
  {
    if (!extensionsWithTextEmbeddingsCapability || extensionsWithTextEmbeddingsCapability.length === 0)
    {
      return [];
    }

    return extensionsWithTextEmbeddingsCapability.map((extension, index): ProcessCommandType =>
    {
      const compositeId = `textToImages-${extension.manifest.id}`;
      return {
        id: compositeId,
        kind: "core",
        commandId: "textToImages",
        extensionId: extension.manifest.id,
        label: t("commands.textToImages"),
        subLabel: extension.manifest.name,
        shortcut: index === 0 ? {
          combo: "mod+shift+f"
        } : undefined,
        isAvailable: true,
        isLoading: runningCommandId === compositeId,
        icon: (size?: CommandIconSizeType): ReactElement =>
        {
          const iconSize = size === "md" ? "md" : "sm";
          return <ExtensionIcon idOrExtension={extension.manifest.id} size={iconSize}/>;
        },
        execute: (): void =>
        {
          addModal({
            body: <TextToImages extensionId={extension.manifest.id}/>,
            title: t("textToImagesModal.title"),
            size: "l"
          });
        }
      };
    });
  }, [ extensionsWithTextEmbeddingsCapability, runningCommandId, addModal ]);

  const extensionCommands = useMemo<ProcessCommandType[]>(() =>
  {
    if (!extensionsProcessCommands)
    {
      return [];
    }

    return extensionsProcessCommands.map((extensionCommand): ProcessCommandType =>
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
        icon: (size?: CommandIconSizeType): ReactElement =>
        {
          const iconSize = size === "md" ? "md" : "sm";
          return <CommandIcon extensionId={manifest.id} command={command} size={iconSize}/>;
        },
        execute: async (): Promise<void> =>
        {
          setRunningCommandId(compositeId);
          try
          {
            await commandRunner(
              manifest.id,
              command,
              undefined,
              () =>
              {
                setRunningCommandId(null);
              },
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
  }, [ extensionsProcessCommands, runningCommandId, commandRunner ]);

  const commands = useMemo<ProcessCommandType[]>(() =>
  {
    return [ ...coreCommands, ...extensionCommands ];
  }, [ coreCommands, extensionCommands ]);

  const hotkeys = useMemo<HotkeyItem[]>(() =>
  {
    if (!registerShortcuts)
    {
      return [];
    }

    return commands.filter((command) =>
    {
      return Boolean(command.shortcut?.combo && command.isAvailable && !command.disabled);
    }).map((command): HotkeyItem => ([
      command.shortcut!.combo,
      (): void =>
      {
        void command.execute();
      }
    ]));
  }, [ registerShortcuts, commands ]);

  useHotkeys(hotkeys);

  const getCommand = useCallback((
    commandIdentifier: ProcessCommandIdType | string,
    extensionId?: string
  ): ProcessCommandType | undefined =>
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
    isLoading: runningCommandId !== null
  };
}
