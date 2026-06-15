import i18n from "i18next";

import {
  CommandEntity,
  Extension,
  ExtensionApi,
  ExtensionApiExtensionGetSettingsRequest,
  ExtensionApiExtensionInstallRequest,
  ExtensionApiExtensionPauseOrResumeRequest,
  ExtensionApiExtensionRunImageCommandRequest,
  ExtensionApiExtensionRunProcessCommandRequest,
  ExtensionApiExtensionSetSettingsRequest,
  ExtensionApiExtensionSynchronizeRequest,
  ExtensionApiExtensionUninstallRequest,
  ExtensionApiExtensionUpdateRequest,
  ExtensionsConfiguration,
  ExtensionSettings,
  ExtensionStatus,
  ManifestCapabilityId,
  UserInterfaceAnchor
} from "@picteus/ws-client";

import { AdditionalUi, ChannelEnum, EventInformationType, UiExtensionCommandType } from "types";
import { BASE_PATH, computeExtensionSidebarUuid } from "utils";


const extensionApi = new ExtensionApi();

let extensions: Extension[] = [];
let extensionsConfiguration: ExtensionsConfiguration;

function requiresCommandReload(event?: EventInformationType): boolean {
  if (event === undefined) {
    return false;
  }
  const channel = event?.channel;
  return channel === ChannelEnum.EXTENSION_UPDATED || channel === ChannelEnum.EXTENSION_INSTALLED || channel === ChannelEnum.EXTENSION_UNINSTALLED || channel === ChannelEnum.EXTENSION_PAUSED || channel === ChannelEnum.EXTENSION_RESUMED;
}

async function fetchAll(): Promise<{
  extensions: Extension[];
  extensionsConfiguration: ExtensionsConfiguration;
}> {
  extensions = await extensionApi.extensionList();
  extensionsConfiguration = await extensionApi.extensionGetConfiguration();
  return { extensions, extensionsConfiguration };
}

function list(): Extension[] {
  return extensions;
}

function isPaused(extensionId: string): boolean | undefined {
  const extension = list().find(extension => extension.manifest.id === extensionId);
  return extension === undefined ? undefined : extension.status === ExtensionStatus.Paused;
}

async function add(
  parameters: ExtensionApiExtensionInstallRequest,
): Promise<Extension> {
  return extensionApi.extensionInstall(parameters);
}

async function startOrStop(
  parameters: ExtensionApiExtensionPauseOrResumeRequest,
): Promise<void> {
  return extensionApi.extensionPauseOrResume(parameters);
}

async function update(
  parameters: ExtensionApiExtensionUpdateRequest,
): Promise<Extension> {
  return extensionApi.extensionUpdate(parameters);
}

async function uninstall(
  parameters: ExtensionApiExtensionUninstallRequest,
): Promise<void> {
  return extensionApi.extensionUninstall(parameters);
}

async function getSettings(
  parameters: ExtensionApiExtensionGetSettingsRequest,
): Promise<ExtensionSettings> {
  return extensionApi.extensionGetSettings(parameters);
}

async function setSettings(
  parameters: ExtensionApiExtensionSetSettingsRequest,
) {
  return extensionApi.extensionSetSettings(parameters);
}

function getConfiguration(): ExtensionsConfiguration {
  return extensionsConfiguration;
}

function getExtensionsWithCapability(
  capability: ManifestCapabilityId,
): Extension[] {
  const extensionsConfigurations = getConfiguration();
  const extensions = list();

  return extensionsConfigurations?.capabilities
    ?.find((entity) => entity.capability.id === capability)
    ?.extensionIds.map((extensionId) => {
      return extensions.find(
        (extension) => extension.manifest.id === extensionId,
      );
    });
}

function getExtensionsCommands(
  entityTypes: CommandEntity[],
): UiExtensionCommandType[] {
  //getConfiguration() returns commands only for extensions with status "Enabled"
  const extensionsConfigurations = getConfiguration();
  const extensions = list();
  return extensionsConfigurations?.commands
    ?.filter((entity) => entityTypes.indexOf(entity.command.on?.entity) !== -1)
    .map((entity) => {
      const language = i18n.language;
      const extension = extensions?.find(
        (extension) => extension.manifest.id === entity.extensionId,
      );
      return {
        extension,
        command: {
          id: entity.command.id,
          withTags: entity.command.on?.withTags,
          label: entity.command.specifications.find(
            (specification) => specification.locale === language,
          ).label,
          form: { parameters: entity.command.parameters }
        },
      };
    });
}

async function runImageCommand(
  parameters: ExtensionApiExtensionRunImageCommandRequest,
): Promise<void> {
  return extensionApi.extensionRunImageCommand(parameters);
}

async function runProcessCommand(
  parameters: ExtensionApiExtensionRunProcessCommandRequest,
): Promise<void> {
  return extensionApi.extensionRunProcessCommand(parameters);
}

async function synchronize(
  requestParameters: ExtensionApiExtensionSynchronizeRequest,
): Promise<void> {
  return extensionApi.extensionSynchronize(requestParameters);
}

function getAdditionalUis(
): AdditionalUi[] {
  return list().flatMap(
    (extension) =>
      extension.manifest.ui?.elements
        ?.filter(
          (element) =>
            (element.integration.anchor === UserInterfaceAnchor.Sidebar || element.integration.anchor === UserInterfaceAnchor.Window) &&
            extension.status === ExtensionStatus.Enabled,
        )
        .map((element) => {
          const integration = element.integration;
          return {
            uuid: computeExtensionSidebarUuid(extension.manifest.id, element.id),
            integration,
            content: { url: (integration.anchor === UserInterfaceAnchor.Window || (integration.anchor === UserInterfaceAnchor.Sidebar && integration.isExternal === true)) ? element.url : buildUiURL(extension.manifest.id, element.url) },
            icon: { url: getIconURL(extension) },
            title: extension.manifest.name,
            extensionId: extension.manifest.id,
            automaticallyReopen: true
          };
        }) || [],
  );
}

function buildUiURL(extensionId: string, url: string) {
  return `${BASE_PATH}/ui/extension/${extensionId}${url}`;
}

function getIconURL(extensionIdOrExtension: string | Extension) {
  return buildUiURL(typeof extensionIdOrExtension === "string" ? extensionIdOrExtension : (extensionIdOrExtension as Extension).manifest.id, "/icon.png");
}

export default {
  requiresCommandReload,
  fetchAll,
  list,
  isPaused,
  add,
  getIconURL,
  update,
  uninstall,
  synchronize,
  startOrStop,
  getSettings,
  setSettings,
  getExtensionsWithCapability,
  getConfiguration,
  getAdditionalUis,
  getExtensionsCommands,
  runImageCommand,
  runProcessCommand,
};
