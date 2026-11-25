import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from "@tanstack/react-query";
import { useMemo } from "react";
import i18n from "i18next";
import {
  CaptionInstruction,
  CommandEntity,
  EligibleTagsInstruction,
  EmbeddingInstruction,
  Extension,
  ExtensionActivity,
  ExtensionActivityState,
  ExtensionAiModel,
  ExtensionAndManual,
  ExtensionApiExtensionChangeStateRequest,
  ExtensionApiExtensionInstallRequest,
  ExtensionApiExtensionResetSettingsRequest,
  ExtensionApiExtensionSetSettingsRequest,
  ExtensionApiExtensionUpdateRequest,
  ExtensionsConfiguration,
  ExtensionSettings,
  ManifestCapabilityId
} from "@picteus/ws-client";

import { UiExtensionCommandType } from "types";
import { ExtensionInstructionCapabilitiesType, ExtensionsService } from "app/services";
import { queryKeys } from "app/query";


export function isExtensionActivityReady(activity?: ExtensionActivity): boolean
{
  if (!activity)
  {
    return false;
  }

  return (
    activity.connection === ExtensionActivityState.Started &&
    activity.process === ExtensionActivityState.Started &&
    activity.isInError === false
  );
}

export function useExtensions(): UseQueryResult<Extension[], Error>
{
  return useQuery(
    {
      queryKey: queryKeys.extensions.all,
      queryFn: (): Promise<{
        extensions: Extension[];
        extensionsConfiguration: ExtensionsConfiguration;
      }> =>
      {
        return ExtensionsService.fetchAll();
      },
      select: (data: {
        extensions: Extension[];
        extensionsConfiguration: ExtensionsConfiguration;
      }): Extension[] =>
      {
        return data.extensions;
      }
    }
  );
}

export function useExtensionsAll(): UseQueryResult<{
  extensions: Extension[];
  extensionsConfiguration: ExtensionsConfiguration;
}, Error>
{
  return useQuery(
    {
      queryKey: queryKeys.extensions.all,
      queryFn: (): Promise<{
        extensions: Extension[];
        extensionsConfiguration: ExtensionsConfiguration;
      }> =>
      {
        return ExtensionsService.fetchAll();
      }
    }
  );
}

export function useExtension(id: string): UseQueryResult<ExtensionAndManual, Error>
{
  return useQuery(
    {
      queryKey: queryKeys.extensions.detail(id),
      queryFn: (): Promise<ExtensionAndManual> =>
      {
        return ExtensionsService.get({ id });
      },
      enabled: Boolean(id)
    }
  );
}

export function useExtensionDisplayName(extensionId: string | undefined): string | undefined
{
  const { data: extensions = [] } = useExtensions();
  return useMemo(
    () =>
    {
      if (extensionId === undefined)
      {
        return undefined;
      }
      return extensions.find((extension) => extension.manifest.id === extensionId)?.manifest.name ?? extensionId;
    },
    [ extensions, extensionId ]
  );
}

export function useExtensionActivities(): UseQueryResult<ExtensionActivity[], Error>
{
  return useQuery(
    {
      queryKey: queryKeys.extensions.activities,
      queryFn: (): Promise<ExtensionActivity[]> =>
      {
        return ExtensionsService.activities();
      }
    }
  );
}

export function useExtensionCommands(commandEntities: CommandEntity[]): UiExtensionCommandType[]
{
  const { data } = useExtensionsAll();
  const { data: activities = [] } = useExtensionActivities();
  const extensions = data?.extensions ?? [];
  // "extensionsConfiguration" should only contain commands for extensions with status "Enabled"
  const extensionsConfiguration = data?.extensionsConfiguration;

  if (!extensionsConfiguration || extensions.length === 0)
  {
    return [];
  }

  const activityMap = new Map<string, ExtensionActivity>();
  for (const activity of activities)
  {
    activityMap.set(activity.id, activity);
  }

  const matchingCommands: UiExtensionCommandType[] = [];
  for (const entity of extensionsConfiguration.commands)
  {
    if (commandEntities.indexOf(entity.command.on.entity) === -1)
    {
      continue;
    }
    const activity = activityMap.get(entity.extensionId);
    if (!isExtensionActivityReady(activity))
    {
      continue;
    }
    const extension = extensions.find((extensionItem) => extensionItem.manifest.id === entity.extensionId);
    if (!extension)
    {
      continue;
    }
    matchingCommands.push({
      extension,
      command: {
        id: entity.command.id,
        withTags: entity.command.on?.withTags,
        label: ExtensionsService.resolveCommandLabel(
          entity.command.id,
          ExtensionsService.findCommandSpecification(entity.command.specifications, i18n.language)
        ),
        form: { parameters: entity.command.parameters },
        iconUri: entity.command.ui?.iconUri
      }
    });
  }

  return matchingCommands;
}

export function useExtensionsWithCapability(capabilityId: ManifestCapabilityId): Extension[]
{
  const { data } = useExtensionsAll();
  const { data: activities = [] } = useExtensionActivities();
  const extensions = data?.extensions ?? [];
  const extensionsConfiguration = data?.extensionsConfiguration;

  if (!extensionsConfiguration || extensions.length === 0)
  {
    return [];
  }

  const matchingCapability = extensionsConfiguration.capabilities?.find(
    (entity) => entity.capability.id === capabilityId
  );

  if (!matchingCapability)
  {
    return [];
  }

  const activityMap = new Map<string, ExtensionActivity>();
  for (const activity of activities)
  {
    activityMap.set(activity.id, activity);
  }

  const matchingExtensions: Extension[] = [];
  for (const extensionId of matchingCapability.extensionIds)
  {
    const activity = activityMap.get(extensionId);
    if (!isExtensionActivityReady(activity))
    {
      continue;
    }
    const foundExtension = extensions.find(
      (extensionItem) => extensionItem.manifest.id === extensionId
    );
    if (foundExtension)
    {
      matchingExtensions.push(foundExtension);
    }
  }

  return matchingExtensions;
}

export function useInstallExtensionMutation(): UseMutationResult<Extension,
  Error, ExtensionApiExtensionInstallRequest>
{
  const queryClient = useQueryClient();

  return useMutation(
    {
      mutationFn: (parameters: ExtensionApiExtensionInstallRequest): Promise<Extension> =>
      {
        return ExtensionsService.install(parameters);
      },
      onSuccess: (): void =>
      {
        void queryClient.invalidateQueries({ queryKey: queryKeys.extensions.all });
      }
    }
  );
}

export function useUpdateExtensionMutation(): UseMutationResult<Extension, Error, ExtensionApiExtensionUpdateRequest>
{
  const queryClient = useQueryClient();

  return useMutation(
    {
      mutationFn: (parameters: ExtensionApiExtensionUpdateRequest): Promise<Extension> =>
      {
        return ExtensionsService.update(parameters);
      },
      onSuccess: (updatedExtension: Extension): void =>
      {
        void queryClient.invalidateQueries({ queryKey: queryKeys.extensions.all });
        void queryClient.invalidateQueries({ queryKey: queryKeys.extensions.detail(updatedExtension.manifest.id) });
      }
    }
  );
}

export function useUninstallExtensionMutation(): UseMutationResult<void, Error, string>
{
  const queryClient = useQueryClient();

  return useMutation(
    {
      mutationFn: (extensionId: string): Promise<void> =>
      {
        return ExtensionsService.uninstall({ id: extensionId });
      },
      onSuccess: (_data, extensionId): void =>
      {
        void queryClient.invalidateQueries({ queryKey: queryKeys.extensions.all });
        void queryClient.invalidateQueries({ queryKey: queryKeys.extensions.aiModels });
        void queryClient.removeQueries({ queryKey: queryKeys.extensions.detail(extensionId) });
        void queryClient.removeQueries({ queryKey: queryKeys.extensions.settings(extensionId) });
        void queryClient.removeQueries({ queryKey: queryKeys.extensions.instructions(extensionId) });
      }
    }
  );
}

export function useChangeExtensionStateMutation(): UseMutationResult<void, Error, ExtensionApiExtensionChangeStateRequest>
{
  const queryClient = useQueryClient();

  return useMutation(
    {
      mutationFn: (parameters: ExtensionApiExtensionChangeStateRequest): Promise<void> =>
      {
        return ExtensionsService.startOrStop(parameters);
      },
      onSuccess: (_data, parameters): void =>
      {
        void queryClient.invalidateQueries({ queryKey: queryKeys.extensions.all });
        void queryClient.invalidateQueries({ queryKey: queryKeys.extensions.detail(parameters.id) });
      }
    }
  );
}

export function useExtensionSettings(
  extensionId: string,
  enabled = true
): UseQueryResult<ExtensionSettings, Error>
{
  return useQuery(
    {
      queryKey: queryKeys.extensions.settings(extensionId),
      queryFn: (): Promise<ExtensionSettings> =>
      {
        return ExtensionsService.getSettings({ id: extensionId });
      },
      enabled: enabled === true && extensionId.length > 0
    }
  );
}

export function useSetExtensionSettingsMutation(): UseMutationResult<void, Error, ExtensionApiExtensionSetSettingsRequest
>
{
  const queryClient = useQueryClient();

  return useMutation(
    {
      mutationFn: (parameters: ExtensionApiExtensionSetSettingsRequest): Promise<void> =>
      {
        return ExtensionsService.setSettings(parameters);
      },
      onSuccess: (_data, parameters): void =>
      {
        void queryClient.invalidateQueries({ queryKey: queryKeys.extensions.all });
        void queryClient.invalidateQueries({ queryKey: queryKeys.extensions.detail(parameters.id) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.extensions.settings(parameters.id) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.extensions.aiModels });
      }
    }
  );
}

export function useResetExtensionSettingsMutation(): UseMutationResult<ExtensionSettings, Error, ExtensionApiExtensionResetSettingsRequest>
{
  const queryClient = useQueryClient();

  return useMutation(
    {
      mutationFn: (parameters: ExtensionApiExtensionResetSettingsRequest): Promise<ExtensionSettings> =>
      {
        return ExtensionsService.resetSettings(parameters);
      },
      onSuccess: (_data, parameters): void =>
      {
        void queryClient.invalidateQueries({ queryKey: queryKeys.extensions.all });
        void queryClient.invalidateQueries({ queryKey: queryKeys.extensions.detail(parameters.id) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.extensions.settings(parameters.id) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.extensions.aiModels });
      }
    }
  );
}

export function useAiModels(): UseQueryResult<ExtensionAiModel[], Error>
{
  return useQuery(
    {
      queryKey: queryKeys.extensions.aiModels,
      queryFn: (): Promise<ExtensionAiModel[]> =>
      {
        return ExtensionsService.listAiModels();
      }
    }
  );
}

export type ExtensionInstructionsDataType =
  {
    readonly captionInstructions: CaptionInstruction[];
    readonly eligibleTagsInstructions: EligibleTagsInstruction[];
    readonly embeddingInstructions: EmbeddingInstruction[];
  };

export function useExtensionInstructions(
  extensionId: string,
  capabilities: ExtensionInstructionCapabilitiesType,
  enabled = true
): UseQueryResult<ExtensionInstructionsDataType, Error>
{
  return useQuery(
    {
      queryKey: queryKeys.extensions.instructions(extensionId),
      queryFn: async (): Promise<ExtensionInstructionsDataType> =>
      {
        const [ captionInstructions, eligibleTagsInstructions, embeddingInstructions ] = await Promise.all([
          capabilities.hasCaptionCapability === true
            ? ExtensionsService.getCaptionInstructions({ id: extensionId })
            : Promise.resolve([]),
          capabilities.hasEligibleTagsCapability === true
            ? ExtensionsService.getEligibleTagsInstructions({ id: extensionId })
            : Promise.resolve([]),
          capabilities.hasEmbeddingsCapability === true
            ? ExtensionsService.getEmbeddingInstructions({ id: extensionId })
            : Promise.resolve([])
        ]);
        return {
          captionInstructions,
          eligibleTagsInstructions,
          embeddingInstructions
        };
      },
      enabled: enabled === true && extensionId.length > 0 && capabilities.hasAnyInstructionCapability === true
    }
  );
}

export type SaveExtensionInstructionsParametersType =
  {
    readonly extensionId: string;
    readonly captionInstructions?: CaptionInstruction[];
    readonly eligibleTagsInstructions?: EligibleTagsInstruction[];
    readonly embeddingInstructions?: EmbeddingInstruction[];
  };

export function useSaveExtensionInstructionsMutation(): UseMutationResult<
  void,
  Error,
  SaveExtensionInstructionsParametersType
>
{
  const queryClient = useQueryClient();

  return useMutation(
    {
      mutationFn: async (parameters: SaveExtensionInstructionsParametersType): Promise<void> =>
      {
        const calls: Promise<unknown>[] = [];
        if (parameters.captionInstructions !== undefined)
        {
          calls.push(
            ExtensionsService.setCaptionInstructions({
              id: parameters.extensionId,
              captionInstruction: parameters.captionInstructions
            })
          );
        }
        if (parameters.eligibleTagsInstructions !== undefined)
        {
          calls.push(
            ExtensionsService.setEligibleTagsInstructions({
              id: parameters.extensionId,
              eligibleTagsInstruction: parameters.eligibleTagsInstructions
            })
          );
        }
        if (parameters.embeddingInstructions !== undefined)
        {
          calls.push(
            ExtensionsService.setEmbeddingInstructions({
              id: parameters.extensionId,
              embeddingInstruction: parameters.embeddingInstructions
            })
          );
        }
        await Promise.all(calls);
      },
      onSuccess: (_data, parameters): void =>
      {
        void queryClient.invalidateQueries({ queryKey: queryKeys.extensions.instructions(parameters.extensionId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.extensions.aiModels });
      }
    }
  );
}

