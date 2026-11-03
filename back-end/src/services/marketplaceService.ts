import fs from "node:fs";

import { Injectable, OnModuleInit } from "@nestjs/common";
import semver from "semver";

import { logger } from "../logger";
import { Extension, ExtensionManual, ExtensionState, Manifest, ManifestAndManual } from "../dtos/app.dtos";
import { plainToInstanceViaJSON } from "../utils";
import { parametersChecker, StringLengths, StringNature } from "./utils/parametersChecker";
import { ExtensionArchiveReader, ExtensionRegistry, ManifestPathArchive } from "./extensionRegistry";
import { ExtensionService, StateChangeOptions } from "./extensionServices";


@Injectable()
export class MarketplaceService implements OnModuleInit
{

  private readonly perExtensionIdArchiveMap: Map<string, ManifestPathArchive> = new Map<string, ManifestPathArchive>();

  constructor(private readonly extensionRegistry: ExtensionRegistry, private readonly extensionService: ExtensionService)
  {
    logger.debug("Instantiating a MarketplaceService");
  }

  async onModuleInit(): Promise<void>
  {
    const manifestPathArchives = await this.extensionRegistry.listPrebuiltExtensionArchivePaths(false);
    for (const manifestPathArchive of manifestPathArchives)
    {
      this.perExtensionIdArchiveMap.set(manifestPathArchive.manifest.id, manifestPathArchive);
    }
  }

  async list(search: string | undefined, categories: string[] | undefined): Promise<Manifest[]>
  {
    logger.info("Listing extensions" + (search === undefined ? "" : (`, with the '${search}' search string`)) + (categories === undefined ? "" : (`, with the [${categories.join(", ")}] search categories`)));
    parametersChecker.checkString("search", search, StringLengths.Length64, StringNature.Free, true);
    if (categories !== undefined && categories.length === 0)
    {
      parametersChecker.throwBadParameter("category", undefined, "it should contain at least one item");
    }
    const normalizedSearch = search?.trim().toLocaleLowerCase();
    return Array.from(this.perExtensionIdArchiveMap.values()).filter(archive => normalizedSearch === undefined || normalizedSearch.length === 0 || [ archive.manifest.id, archive.manifest.name, archive.manifest.description ].some(value => value.toLocaleLowerCase().includes(normalizedSearch))).filter(archive => categories === undefined || archive.manifest.categories.some(category => categories.includes(category))).map(archive => archive.manifest).sort((firstManifest, secondManifest) => firstManifest.name.localeCompare(secondManifest.name) || firstManifest.id.localeCompare(secondManifest.id));
  }

  async get(id: string): Promise<ManifestAndManual>
  {
    logger.info(`Getting the extension with id '${id}'`);
    const archive = await this.getArchive(id);
    const manualContent = await new ExtensionArchiveReader(fs.readFileSync(archive.filePath)).extractFile(ExtensionRegistry.manualFileName);
    const manual = manualContent === undefined ? undefined : plainToInstanceViaJSON(ExtensionManual, { instructions: manualContent });
    return plainToInstanceViaJSON(ManifestAndManual, { manifest: archive.manifest, manual });
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

  private async getArchive(id: string): Promise<ManifestPathArchive>
  {
    const archive = this.perExtensionIdArchiveMap.get(id);
    if (archive === undefined)
    {
      parametersChecker.throwBadParameter("id", id, "there is no extension with that identifier");
    }
    return archive;
  }

}
