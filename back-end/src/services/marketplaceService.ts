import fs from "node:fs";
import path from "node:path";

import { Injectable, OnModuleInit } from "@nestjs/common";
import semver from "semver";

import { logger } from "../logger";
import { paths } from "../paths";
import {
  Extension,
  ExtensionManual,
  ExtensionState,
  FieldLengths,
  MarketplaceExtension,
  MarketplaceExtensionDetails
} from "../dtos/app.dtos";
import { plainToInstanceViaJSON } from "../utils";
import { parametersChecker, StringNature } from "./utils/parametersChecker";
import { ExtensionArchiveReader, ExtensionRegistry, ManifestPathArchive } from "./extensionRegistry";
import { ExtensionService, StateChangeOptions } from "./extensionServices";


export type MarketplaceArchiveWithIcon = ManifestPathArchive & { readonly icon: string };

@Injectable()
export class MarketplaceService implements OnModuleInit
{

  private readonly perExtensionIdMarketplaceArchiveMap: Map<string, MarketplaceArchiveWithIcon> = new Map<string, MarketplaceArchiveWithIcon>();

  constructor(private readonly extensionRegistry: ExtensionRegistry, private readonly extensionService: ExtensionService)
  {
    logger.debug("Instantiating a MarketplaceService");
  }

  async onModuleInit(): Promise<void>
  {
    async function extractIconDataUri(archiveBuffer: Buffer): Promise<string>
    {
      const reader = new ExtensionArchiveReader(archiveBuffer);
      const candidates =
        [
          { fileName: "icon.svg", mimeType: "image/svg+xml" },
          { fileName: "icon.png", mimeType: "image/png" }
        ];
      for (const candidate of candidates)
      {
        const buffer = await reader.extractFileBuffer(candidate.fileName);
        if (buffer !== undefined && buffer.length > 0)
        {
          return `data:${candidate.mimeType};base64,${buffer.toString("base64")}`;
        }
      }
      const defaultIconPath = path.join(paths.serverDirectoryPath, "assets", "extension-default-icon.svg");
      const defaultBuffer = fs.readFileSync(defaultIconPath);
      return `data:image/svg+xml;base64,${defaultBuffer.toString("base64")}`;
    }

    const manifestPathArchives = await this.extensionRegistry.listPrebuiltExtensionArchivePaths(false);
    for (const manifestPathArchive of manifestPathArchives)
    {
      const icon = await extractIconDataUri(manifestPathArchive.archive);
      this.perExtensionIdMarketplaceArchiveMap.set(manifestPathArchive.manifest.id, { ...manifestPathArchive, icon });
    }
  }

  async list(search: string | undefined, categories: string[] | undefined): Promise<MarketplaceExtension[]>
  {
    logger.info("Listing extensions" + (search === undefined ? "" : (`, with the '${search}' search string`)) + (categories === undefined ? "" : (`, with the [${categories.join(", ")}] search categories`)));
    parametersChecker.checkString("search", search, FieldLengths.l64, StringNature.Free, true);
    if (categories !== undefined && categories.length === 0)
    {
      parametersChecker.throwBadParameter("category", undefined, "it should contain at least one item");
    }
    const normalizedSearch = search?.trim().toLocaleLowerCase();
    return Array.from(this.perExtensionIdMarketplaceArchiveMap.values()).filter(archive => normalizedSearch === undefined || normalizedSearch.length === 0 || [ archive.manifest.id, archive.manifest.name, archive.manifest.description ].some(value => value.toLocaleLowerCase().includes(normalizedSearch))).filter(archive => categories === undefined || archive.manifest.categories.some(category => categories.includes(category))).map(archive => plainToInstanceViaJSON(MarketplaceExtension, {
      manifest: archive.manifest,
      icon: archive.icon
    })).sort((firstExtension, secondExtension) => firstExtension.manifest.name.localeCompare(secondExtension.manifest.name) || firstExtension.manifest.id.localeCompare(secondExtension.manifest.id));
  }

  async get(id: string): Promise<MarketplaceExtensionDetails>
  {
    logger.info(`Getting the extension with id '${id}'`);
    const archive = await this.getArchive(id);
    const manualContent = await new ExtensionArchiveReader(fs.readFileSync(archive.filePath)).extractFile(ExtensionRegistry.manualFileName);
    const manual = manualContent === undefined ? undefined : plainToInstanceViaJSON(ExtensionManual, { instructions: manualContent });
    return plainToInstanceViaJSON(MarketplaceExtensionDetails, {
      manifest: archive.manifest,
      icon: archive.icon,
      manual
    });
  }

  async install(id: string, state: ExtensionState): Promise<Extension>
  {
    logger.info(`Installing the extension with id '${id}' in '${state}' state`);
    const archive = await this.getArchive(id);
    return this.extensionService.installOrUpdate(undefined, fs.readFileSync(archive.filePath), StateChangeOptions.withState(state), false, true);
  }

  async update(id: string, state: ExtensionState | undefined): Promise<Extension>
  {
    logger.info(`Updating the extension with id '${id}'${state === undefined ? "" : (` in '${state}' state`)}`);
    const archive = await this.getArchive(id);
    const installedManifest = this.extensionRegistry.get(id);
    if (installedManifest === undefined)
    {
      parametersChecker.throwBadParameter("id", id, `the extension with that identifier is not installed`);
    }
    if (semver.gt(archive.manifest.version, installedManifest.version) === false)
    {
      parametersChecker.throwBadParameterError(`The extension marketplace version '${archive.manifest.version}' is not greater than the installed version '${installedManifest.version}'`);
    }
    return this.extensionService.installOrUpdate(id, fs.readFileSync(archive.filePath), StateChangeOptions.withState(state), false, true);
  }

  private async getArchive(id: string): Promise<MarketplaceArchiveWithIcon>
  {
    const archive = this.perExtensionIdMarketplaceArchiveMap.get(id);
    if (archive === undefined)
    {
      parametersChecker.throwBadParameter("id", id, "there is no extension with that identifier");
    }
    return archive;
  }

}
