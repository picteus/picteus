import { addFileTransport, createLogger } from "./logger";
import { CliOptions, computeParseCommandLineAndRun, defaultCliOptions, defaultCommand } from "./cliInterpreter";
import { WebCoordinates, WebServer } from "./webServer";
import {
  ApiKeyHostCommand,
  createIPCCommandReceiver,
  createIPCCommandSender,
  HostCommand,
  HostCommandType,
  InstallChromeExtensionHostCommand,
  NotificationCommandHostCommand,
  PickFileResourceHostCommand,
  ShowDialogHostCommand,
  UninstallChromeExtensionHostCommand
} from "./hostCommands";


export { createLogger, addFileTransport };
export { CliOptions, defaultCliOptions, defaultCommand, computeParseCommandLineAndRun };
export { WebCoordinates, WebServer };
export {
  HostCommandType,
  HostCommand,
  ApiKeyHostCommand,
  InstallChromeExtensionHostCommand,
  ShowDialogHostCommand,
  UninstallChromeExtensionHostCommand,
  PickFileResourceHostCommand,
  NotificationCommandHostCommand,
  createIPCCommandSender,
  createIPCCommandReceiver
};
