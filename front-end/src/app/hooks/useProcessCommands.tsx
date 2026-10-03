import React, { ReactElement, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Kbd } from "@mantine/core";

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
  const [ , addModal ] = useActionModalContext();
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
          key: "f",
          metaKey: true,
          shiftKey: true,
          label: (
            <>
              <Kbd>⌘</Kbd> + <Kbd>Shift</Kbd> + <Kbd>F</Kbd>
            </>
          )
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
            component: <TextToImages extensionId={extension.manifest.id}/>,
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

  useEffect(() =>
  {
    if (!registerShortcuts)
    {
      return;
    }

    function handleKeyDown(event: KeyboardEvent): void
    {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable))
      {
        return;
      }

      for (const command of commands)
      {
        if (!command.shortcut || !command.isAvailable || command.disabled)
        {
          continue;
        }

        const shortcut = command.shortcut;
        const matchesKey = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const matchesMeta = Boolean(shortcut.metaKey) === (event.metaKey || event.ctrlKey);
        const matchesShift = Boolean(shortcut.shiftKey) === event.shiftKey;
        const matchesAlt = Boolean(shortcut.altKey) === event.altKey;

        if (matchesKey && matchesMeta && matchesShift && matchesAlt)
        {
          event.preventDefault();
          void command.execute();
          break;
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () =>
    {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [ registerShortcuts, commands ]);

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
