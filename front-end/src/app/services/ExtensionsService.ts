import {
  Extension,
  ExtensionActivity,
  ExtensionAndManual,
  ExtensionApi,
  ExtensionApiExtensionBuildRequest,
  ExtensionApiExtensionChangeStateRequest,
  ExtensionApiExtensionGenerateRequest,
  ExtensionApiExtensionGetRequest,
  ExtensionApiExtensionGetSettingsRequest,
  ExtensionApiExtensionInstallRequest,
  ExtensionApiExtensionResetSettingsRequest,
  ExtensionApiExtensionRunImageCommandRequest,
  ExtensionApiExtensionRunProcessCommandRequest,
  ExtensionApiExtensionSetSettingsRequest,
  ExtensionApiExtensionSynchronizeRequest,
  ExtensionApiExtensionUninstallRequest,
  ExtensionApiExtensionUpdateRequest,
  ExtensionsConfiguration,
  ExtensionSettings
} from "@picteus/ws-client";

import { BASE_PATH } from "utils";


const extensionApi = new ExtensionApi();

async function fetchAll(): Promise<{
  extensions: Extension[];
  extensionsConfiguration: ExtensionsConfiguration;
}>
{
  const extensions = await extensionApi.extensionList();
  const extensionsConfiguration = await extensionApi.extensionGetConfiguration();
  return { extensions, extensionsConfiguration };
}

async function get(parameters: ExtensionApiExtensionGetRequest): Promise<ExtensionAndManual>
{
  return extensionApi.extensionGet(parameters);
}

async function install(parameters: ExtensionApiExtensionInstallRequest): Promise<Extension>
{
  return extensionApi.extensionInstall(parameters);
}

async function startOrStop(parameters: ExtensionApiExtensionChangeStateRequest): Promise<void>
{
  return extensionApi.extensionChangeState(parameters);
}

async function update(parameters: ExtensionApiExtensionUpdateRequest): Promise<Extension>
{
  return extensionApi.extensionUpdate(parameters);
}

async function uninstall(parameters: ExtensionApiExtensionUninstallRequest): Promise<void>
{
  return extensionApi.extensionUninstall(parameters);
}

async function getSettings(parameters: ExtensionApiExtensionGetSettingsRequest): Promise<ExtensionSettings>
{
  return extensionApi.extensionGetSettings(parameters);
}

async function setSettings(parameters: ExtensionApiExtensionSetSettingsRequest): Promise<void>
{
  return extensionApi.extensionSetSettings(parameters);
}

async function resetSettings(parameters: ExtensionApiExtensionResetSettingsRequest): Promise<ExtensionSettings>
{
  return extensionApi.extensionResetSettings(parameters);
}

async function activities(): Promise<ExtensionActivity[]>
{
  return extensionApi.extensionActivities();
}

async function runImageCommand(parameters: ExtensionApiExtensionRunImageCommandRequest): Promise<void>
{
  return extensionApi.extensionRunImageCommand(parameters);
}

async function runProcessCommand(parameters: ExtensionApiExtensionRunProcessCommandRequest): Promise<void>
{
  return extensionApi.extensionRunProcessCommand(parameters);
}

async function synchronize(requestParameters: ExtensionApiExtensionSynchronizeRequest): Promise<void>
{
  return extensionApi.extensionSynchronize(requestParameters);
}

async function generate(parameters: ExtensionApiExtensionGenerateRequest): Promise<Blob>
{
  return extensionApi.extensionGenerate(parameters);
}

async function build(parameters: ExtensionApiExtensionBuildRequest): Promise<Blob>
{
  return extensionApi.extensionBuild(parameters);
}

function buildUiURL(extensionId: string, url: string): string
{
  return `${BASE_PATH}/ui/extension/${extensionId}${url}`;
}

function getIconURL(extensionIdOrExtension: string | Extension): string
{
  return buildUiURL(typeof extensionIdOrExtension === "string" ? extensionIdOrExtension : (extensionIdOrExtension as Extension).manifest.id, "/icon");
}

function getCommandIconURL(extensionId: string, uri: string): string
{
  return buildUiURL(extensionId, uri);
}

export default {
  fetchAll,
  get,
  install,
  buildUiURL,
  getIconURL,
  getCommandIconURL,
  update,
  uninstall,
  synchronize,
  generate,
  build,
  startOrStop,
  getSettings,
  setSettings,
  resetSettings,
  runImageCommand,
  runProcessCommand,
  activities
};
