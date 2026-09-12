import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from "@tanstack/react-query";
import i18n from "i18next";
import {
  CommandEntity,
  Extension,
  ExtensionActivity,
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
import { ExtensionsService } from "app/services";
import { queryKeys } from "app/query";


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

export function useExtensionsConfiguration(): UseQueryResult<ExtensionsConfiguration, Error>
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
      }): ExtensionsConfiguration =>
      {
        return data.extensionsConfiguration;
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

export function useExtension(id?: string): UseQueryResult<ExtensionAndManual, Error>
{
  return useQuery(
    {
      queryKey: queryKeys.extensions.detail(id ?? ""),
      queryFn: (): Promise<ExtensionAndManual> =>
      {
        return ExtensionsService.get({ id: id! });
      },
      enabled: Boolean(id)
    }
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
  const extensions = data?.extensions ?? [];
  // "extensionsConfiguration" should only contain commands for extensions with status "Enabled"
  const extensionsConfiguration = data?.extensionsConfiguration;

  if (!extensionsConfiguration || extensions.length === 0)
  {
    return [];
  }

  return extensionsConfiguration.commands
    .filter((entity) => commandEntities.indexOf(entity.command.on.entity) !== -1)
    .map((entity) =>
    {
      const extension = extensions.find((extensionItem) => extensionItem.manifest.id === entity.extensionId);
      return {
        extension,
        command: {
          id: entity.command.id,
          withTags: entity.command.on?.withTags,
          label: entity.command.specifications.find(
            (specification) => specification.locale === i18n.language
          )?.label ?? entity.command.id,
          form: { parameters: entity.command.parameters },
          iconUri: entity.command.ui?.iconUri
        }
      };
    });
}

export function useExtensionsWithCapability(capabilityId: ManifestCapabilityId): Extension[]
{
  const { data } = useExtensionsAll();
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

  const matchingExtensions: Extension[] = [];
  for (const extensionId of matchingCapability.extensionIds)
  {
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
        void queryClient.invalidateQueries({ queryKey: queryKeys.extensions.configuration });
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
        void queryClient.invalidateQueries({ queryKey: queryKeys.extensions.configuration });
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
        void queryClient.invalidateQueries({ queryKey: queryKeys.extensions.configuration });
        void queryClient.removeQueries({ queryKey: queryKeys.extensions.detail(extensionId) });
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
        void queryClient.invalidateQueries({ queryKey: queryKeys.extensions.configuration });
        void queryClient.invalidateQueries({ queryKey: queryKeys.extensions.detail(parameters.id) });
      }
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
      }
    }
  );
}
