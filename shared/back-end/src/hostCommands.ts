export enum HostCommandType
{
  ApiKey = "apiKey",
  InstallChromeExtension = "installChromeExtension",
  UninstallChromeExtension = "uninstallChromeExtension",
}

interface NamedCommand<T extends HostCommandType>
{
  type: T;
}

export interface ApiKeyHostCommand extends NamedCommand<HostCommandType.ApiKey>
{
  apiKey: string;
}

export interface InstallChromeExtensionHostCommand extends NamedCommand<HostCommandType.InstallChromeExtension>
{
  name: string;
  archive: string;
}

export interface UninstallChromeExtensionHostCommand extends NamedCommand<HostCommandType.UninstallChromeExtension>
{
  name: string;
}

export type HostCommand = ApiKeyHostCommand | InstallChromeExtensionHostCommand | UninstallChromeExtensionHostCommand;
