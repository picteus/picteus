import path from "node:path";
import fs from "node:fs";
import AdmZip from "adm-zip";

import {
  Communicator,
  type GenerationRecipe,
  Helper,
  ImageFeatureFormat,
  ImageFeatureType,
  type ImageMetadata,
  PicteusExtension,
  PromptKind,
  type Repository,
  type SettingsValue
} from "@picteus/extension-sdk";
import { MidjourneyInstructions } from "./instructions";


class MidjourneyExtension extends PicteusExtension
{

  private repository?: Repository;

  protected async onReady(communicator?: Communicator): Promise<void>
  {
    await this.setup(await this.getSettings());
    await this.ensureRepository(communicator);
    try
    {
      await this.installChromeExtension();
    }
    catch (error)
    {
      communicator?.sendLog(`Could not install the Chrome extension. Reason: '${error.message}'`, "error");
    }
  }

  protected async onSettings(_communicator: Communicator, value: SettingsValue): Promise<void>
  {
    await this.setup(value);
  }

  protected async onImageCreated(_communicator: Communicator, imageId: string): Promise<void>
  {
    await this.computeTagsAndFeatures(imageId);
  }

  protected async onImageUpdated(_communicator: Communicator, imageId: string): Promise<void>
  {
    await this.computeTagsAndFeatures(imageId);
  }

  protected async onComputeImageTags(_communicator: Communicator, imageId: string): Promise<void>
  {
    await this.computeTags(imageId, await this.getImageApi().imageGetMetadata({ id: imageId }));
  }

  protected async onComputeImageFeatures(_communicator: Communicator, imageId: string): Promise<void>
  {
    await this.computeFeatures(imageId, await this.getImageApi().imageGetMetadata({ id: imageId }));
  }

  protected async computeTagsAndFeatures(imageId: string): Promise<void>
  {
    const metadata = await this.getImageApi().imageGetMetadata({ id: imageId });
    await this.computeTags(imageId, metadata);
    await this.computeFeatures(imageId, metadata);
  }

  private async computeTags(imageId: string, metadata: ImageMetadata): Promise<void>
  {
    const instructions: MidjourneyInstructions | undefined = this.computeInstructions(metadata);
    if (instructions !== undefined)
    {
      await this.getImageApi().imageSetTags({
        id: imageId,
        extensionId: this.extensionId,
        requestBody: instructions === undefined ? [] : [ this.extensionId ]
      });
    }
  }

  private async computeFeatures(imageId: string, metadata: ImageMetadata): Promise<void>
  {
    const instructions: MidjourneyInstructions | undefined = this.computeInstructions(metadata);
    if (instructions !== undefined)
    {
      const recipe: GenerationRecipe =
        {
          schemaVersion: Helper.GENERATION_RECIPE_SCHEMA_VERSION,
          id: instructions.guid,
          url: instructions.url,
          modelTags: instructions.modelVersion === undefined ? [] : [ `midjourney/${instructions.modelVersion}` ],
          software: "midjourney",
          author: instructions.author,
          inceptionDate: instructions.creationDate,
          aspectRatio: instructions.aspectRatio,
          prompt: { kind: PromptKind.Instructions, value: instructions }
        };
      await this.getImageApi().imageEnsureFeatures({
        id: imageId,
        extensionId: this.extensionId,
        imageFeature: [
          {
            type: ImageFeatureType.Recipe,
            format: ImageFeatureFormat.Json,
            value: JSON.stringify(recipe)
          },
          {
            type: ImageFeatureType.Recipe,
            format: ImageFeatureFormat.Ui,
            value: instructions.toUiContainer().toString()
          }
        ]
      });
    }
  }

  private computeInstructions(metadata: ImageMetadata): MidjourneyInstructions | undefined
  {
    if (metadata.all !== undefined)
    {
      return MidjourneyInstructions.parseMetadata(JSON.parse(metadata.all));
    }
    return undefined;
  }

  private async setup(_value: SettingsValue): Promise<void>
  {
  }

  private async installChromeExtension()
  {
    const distributionDirectoryPath = path.join(PicteusExtension.getExtensionHomeDirectoryPath(), "dist");
    const fileNames = fs.readdirSync(distributionDirectoryPath);
    for (const fileName of fileNames)
    {
      if (fileName.endsWith(".zip") === true)
      {
        this.logger.debug("Repackaging the Chrome extension");
        // We need a fresh new zip to avoid issues with AdmZip when modifying entries
        const newZip: AdmZip = new AdmZip();
        {
          const zip: AdmZip = new AdmZip(fs.readFileSync(path.join(distributionDirectoryPath, fileName)));
          // We add all existing entries
          const entryPrefix = "package/";
          const entryName = `${entryPrefix}manifest.json`;
          for (const entry of zip.getEntries())
          {
            if (entry.entryName !== entryName)
            {
              newZip.addFile(entry.entryName.substring(entryPrefix.length), entry.getData(), entry.comment, entry.attr);
            }
          }
          const entry = zip.getEntry(entryName);
          const manifest = JSON.parse(entry.getData().toString("utf-8"));
          manifest["action"]["default_title"] = JSON.stringify({
            webServicesBaseUrl: this.webServicesBaseUrl,
            apiKey: this.apiKey
          });
          newZip.addFile(entryName.substring(entryPrefix.length), Buffer.from(JSON.stringify(manifest)));
        }

        const buffer: Buffer = await newZip.toBufferPromise();
        const blob = new Blob([ Buffer.from(buffer) ]);
        await this.getExtensionApi().extensionInstallChromeExtension({
          id: this.extensionId,
          chromeExtensionName: "Picteus Midjourney",
          body: blob
        });
        break;
      }
    }
  }

  private async ensureRepository(communicator?: Communicator): Promise<void>
  {
    const name = PicteusExtension.getManifest().name;
    this.repository = await this.getRepositoryApi().repositoryEnsure({
      technicalId: this.extensionId,
      name,
      comment: `The ${name} repository`,
      watch: true
    });
    communicator.sendLog(`The repository '${name}' is available`, "info");
  }

}

new MidjourneyExtension().run().catch((error) =>
{
  console.error(error);
  throw error;
});
