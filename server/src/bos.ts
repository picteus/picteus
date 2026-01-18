import { MessagePort } from "node:worker_threads";

import { ImageFormat, ManifestCapability, ManifestCapabilityId, ManifestEvent } from "./dtos/app.dtos";
import { ExtensionEventAction, ImageEventAction, ProcessEventAction, TextEventAction } from "./notifier";


// Taken from https://github.com/microsoft/TypeScript/issues/1897
// export type Json = | string | number | boolean | null | Json[] | { [key: string]: Json };
export type Json = Record<string, any>;

export type ImageIdAndFormat =
  {
    id: string,
    format: ImageFormat
  };

export type RepositoryIdAndFilePath =
  {
    repositoryId: string;
    filePath: string;
    parentId?: string;
    sourceUrl?: string;
  };

export type DualPorts =
  {
    port1: MessagePort;
    port2: MessagePort;
  };

export function toImageFormat(format: string): ImageFormat
{
  return format.toUpperCase() as ImageFormat;
}

export function fromProcessEventActionToManifestEvent(action: ProcessEventAction): ManifestEvent | null | undefined
{
  switch (action)
  {
    default:
      return undefined;
    case ProcessEventAction.RunCommand:
      return ManifestEvent.ProcessRunCommand;
  }
}

export function fromExtensionEventActionToManifestEvent(action: ExtensionEventAction): ManifestEvent | null | undefined
{
  switch (action)
  {
    default:
      return undefined;
    case ExtensionEventAction.Settings:
      return ManifestEvent.ExtensionSettings;
    case ExtensionEventAction.Installed:
    case ExtensionEventAction.Updated:
    case ExtensionEventAction.Uninstalled:
    case ExtensionEventAction.Paused:
    case ExtensionEventAction.Resumed:
    case ExtensionEventAction.Process:
    case ExtensionEventAction.Error:
    case ExtensionEventAction.Log:
    case ExtensionEventAction.Notification:
    case ExtensionEventAction.Intent:
      return null;
  }
}

export function fromImageEventActionToManifestEvent(action: ImageEventAction): ManifestEvent | null | undefined
{
  switch (action)
  {
    default:
      return undefined;
    case ImageEventAction.Created:
      return ManifestEvent.ImageCreated;
    case ImageEventAction.Updated:
      return ManifestEvent.ImageUpdated;
    case ImageEventAction.Renamed:
      return null;
    case ImageEventAction.Deleted:
      return ManifestEvent.ImageDeleted;
    case ImageEventAction.ComputeFeatures:
      return ManifestEvent.ImageComputeFeatures;
    case ImageEventAction.ComputeEmbeddings:
      return ManifestEvent.ImageComputeEmbeddings;
    case ImageEventAction.ComputeTags:
      return ManifestEvent.ImageComputeTags;
    case ImageEventAction.RunCommand:
      return ManifestEvent.ImageRunCommand;
  }
}

export function fromTextEventActionToManifestEvent(action: TextEventAction): ManifestEvent | null | undefined
{
  switch (action)
  {
    default:
      return undefined;
    case TextEventAction.ComputeEmbeddings:
      return ManifestEvent.TextComputeEmbeddings;
  }
}

export function fromCapacityToImageEventAction(capability: ManifestCapability): ImageEventAction | null | undefined
{
  switch (capability.id)
  {
    default:
      return undefined;
    case ManifestCapabilityId.TextEmbeddings:
      return null;
    case ManifestCapabilityId.ImageFeatures:
      return ImageEventAction.ComputeFeatures;
    case ManifestCapabilityId.ImageTags:
      return ImageEventAction.ComputeTags;
    case ManifestCapabilityId.ImageEmbeddings:
      return ImageEventAction.ComputeEmbeddings;
  }
}
