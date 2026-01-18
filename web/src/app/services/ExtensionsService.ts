import {
  CommandEntity,
  Extension,
  ExtensionApi,
  ExtensionApiExtensionInstallRequest,
  ExtensionApiExtensionPauseOrResumeRequest,
  ExtensionApiExtensionRunImageCommandRequest,
  ExtensionApiExtensionRunProcessCommandRequest,
  ExtensionApiExtensionSetSettingsRequest,
  ExtensionApiExtensionSynchronizeRequest,
  ExtensionApiExtensionUninstallRequest,
  ExtensionApiExtensionUpdateRequest,
  ExtensionsConfiguration,
  ExtensionStatus,
  ManifestCapabilityId,
  UserInterfaceAnchor
} from "@picteus/ws-client";
import i18n from "i18next";
import { ExtensionApiExtensionGetSettingsRequest } from "@picteus/ws-client/src/apis/ExtensionApi.ts";
import { ExtensionSettings } from "@picteus/ws-client/src/models/ExtensionSettings.ts";

import { AdditionalUi, UiExtensionCommandType } from "types";
import { BASE_PATH } from "utils";

const extensionApi = new ExtensionApi();

let extensions: Extension[] = [];
let extensionsConfiguration: ExtensionsConfiguration;

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
          parameters: entity.command.parameters,
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

function getAdditionalUi(
): AdditionalUi[] {
  return list().flatMap(
    (extension) =>
      extension.manifest.ui?.elements
        ?.filter(
          (element) =>
            (element.anchor === UserInterfaceAnchor.Sidebar || element.anchor === UserInterfaceAnchor.Window) &&
            extension.status === ExtensionStatus.Enabled,
        )
        .map((element) => ({
          anchor: element.anchor,
          url: element.url,
          iconURL: getSidebarAnchorIconURL(extension.manifest.id),
          title: extension.manifest.id,
          extensionId: extension.manifest.id,
        })) || [],
  );
}

function buildSidebarAnchorURL(url, extensionId) {
  return BASE_PATH + "/ui/" + extensionId + url;
}

function getSidebarAnchorIconURL(extensionId) {
  return BASE_PATH + "/ui/" + extensionId + "/icon.png";
}

export default {
  fetchAll,
  list,
  add,
  buildSidebarAnchorURL,
  update,
  uninstall,
  synchronize,
  startOrStop,
  getSettings,
  setSettings,
  getExtensionsWithCapability,
  getConfiguration,
  getAdditionalUi,
  getExtensionsCommands,
  runImageCommand,
  runProcessCommand,
};
