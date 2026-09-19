import path from "node:path";
import fs from "node:fs";

import { XMLParser } from "fast-xml-parser";
import AdmZip from "adm-zip";

import {
  BadgeVariant,
  booleanBadge,
  collapsibleGroup,
  Communicator,
  createUiContainer,
  type GenerationRecipe,
  Helper,
  identifier,
  ImageFeatureFormat,
  ImageFeatureType,
  type ImageMetadata,
  numberUnbounded,
  PicteusExtension,
  PromptKind,
  type Repository,
  type SettingsValue,
  stringLong,
  stringShort,
  stringUrl,
  table,
  tableRow,
  type TableRow,
  TextIntensity,
  TextWeight,
  type UiContainerClass,
  type UiElement
} from "@picteus/extension-sdk";


const MidjourneyConstants =
  {
    Author: "Author",
    CreationTime: "Creation Time",
    Description: "Description",
    DigImageGUID: "DigImageGUID",
    DigitalSourceType: "DigitalSourceType",
    XMP: "XML:com.adobe.xmp"
  } as const;


export class MidjourneyInstructions
{

  static parseAspectRatio(value: string): number
  {
    // We parse the aspect ratio from a string representation (e.g., "2:3", "16:9", or "1") into a floating-point number.
    const trimmedValue = value.trim();
    let separator: string | undefined;
    if (trimmedValue.includes(":") === true)
    {
      separator = ":";
    }
    else if (trimmedValue.includes("/") === true)
    {
      separator = "/";
    }
    else if (trimmedValue.toLowerCase().includes("x") === true)
    {
      separator = trimmedValue.includes("x") === true ? "x" : "X";
    }

    if (separator !== undefined)
    {
      const parts = trimmedValue.split(separator);
      if (parts.length === 2)
      {
        const width = parseFloat(parts[0].trim());
        const height = parseFloat(parts[1].trim());
        if (Number.isNaN(width) === false && Number.isNaN(height) === false && width > 0 && height > 0)
        {
          return width / height;
        }
      }
    }
    else
    {
      const numericValue = parseFloat(trimmedValue);
      if (Number.isNaN(numericValue) === false && numericValue > 0)
      {
        return numericValue;
      }
    }
    return Number.NaN;
  }


  static parseMetadata(metadata: Record<string, any>): MidjourneyInstructions | undefined
  {
    const creationTime = metadata[MidjourneyConstants.CreationTime];
    const author: string = metadata[MidjourneyConstants.Author];
    const description = metadata[MidjourneyConstants.Description];
    let guid: string = metadata[MidjourneyConstants.DigImageGUID];
    let source: string = metadata[MidjourneyConstants.DigitalSourceType];
    const xmp = metadata[MidjourneyConstants.XMP];
    if (xmp !== undefined)
    {
      const parser = new XMLParser({ ignoreAttributes: false });
      const document = parser.parse(xmp);
      const xmpDescription = document["x:xmpmeta"]?.["rdf:RDF"]?.["rdf:Description"];
      guid = guid ?? xmpDescription?.["@_iptcExt:DigImageGUID"];
      source = source ?? xmpDescription?.["@_iptcExt:DigitalSourceType"];
    }
    if (creationTime !== undefined && description !== undefined && guid !== undefined && source !== undefined)
    {
      return MidjourneyInstructions.parse(creationTime, author, description, guid, source);
    }
    return undefined;
  }

  static parse(creationTime: string, author: string, description: string, guid: string, source: string): MidjourneyInstructions
  {
    // console.debug(`Parsing the Midjourney description '${description}'`);
    const instructions = description.substring(0, description.indexOf(" Job ID:"));
    const space = " ";
    const tokens = instructions.split(space);
    let modelVersion: string | undefined;
    let dref: string | undefined;
    let profile: string | undefined;
    let quality: number | undefined;
    let repeat: number | undefined;
    let weird: number | undefined;
    let imageWeight: number | undefined;
    let stylize: number | undefined;
    let styleWeight: number | undefined;
    let chaos: number | undefined;
    let aspectRatio: number | undefined;
    let tile: boolean | undefined;
    let raw: boolean | undefined;
    let seed: number | undefined;
    const promptTokens: string[] = [];
    const midJourney = "Midjourney";
    const optionPrefix = "--";

    for (let index = 0; index < tokens.length; index++)
    {
      const instruction = tokens[index];
      if (instruction.startsWith(optionPrefix) === true)
      {
        // The parameters documentation is available at https://docs.midjourney.com/hc/en-us/articles/32859204029709-Parameter-List
        const option = instruction.substring(optionPrefix.length);
        if (option === "raw")
        {
          raw = true;
        }
        else if (option === "tile")
        {
          tile = true;
        }
        else
        {
          const value = tokens[++index];
          switch (option)
          {
            default:
              console.warn(`Ignoring the ${midJourney} instruction '${instruction}'`);
              break;
            case "version":
            case "v":
              modelVersion = value;
              break;
            case "dref":
              dref = value;
              break;
            case "profile":
            case "p":
            case "personalize":
              profile = value;
              break;
            case "quality":
            case "q":
              quality = parseInt(value);
              break;
            case "repeat":
            case "r":
              repeat = parseInt(value);
              break;
            case "weird":
            case "w":
              weird = parseInt(value);
              break;
            case "iw":
              imageWeight = parseInt(value);
              break;
            case "stylize":
            case "s":
              stylize = parseInt(value);
              break;
            case "sw":
              styleWeight = parseInt(value);
              break;
            case "chaos":
            case "c":
              chaos = parseInt(value);
              break;
            case "aspect":
            case "ar":
            {
              const parsedAspectRatio = MidjourneyInstructions.parseAspectRatio(value);
              if (Number.isNaN(parsedAspectRatio) === false)
              {
                aspectRatio = parsedAspectRatio;
              }
              break;
            }
            case "seed":
            case "sref":
              seed = Number.isNaN(parseInt(value)) === true ? -1 : parseInt(value);
              break;
          }
        }
      }
      else
      {
        promptTokens.push(instruction);
      }
    }
    const prompt = promptTokens.join(space);
    let url: string;
    if (guid !== undefined)
    {
      const tokens = guid.split("_");
      const urlPrefix = `https://www.midjourney.com/jobs/`;
      if (tokens.length >= 2)
      {
        url = `${urlPrefix}${tokens[0]}?index=${tokens[1]}`;
      }
      else
      {
        url = `${urlPrefix}${tokens[0]}`;
      }
    }
    return new MidjourneyInstructions(Date.parse(creationTime), guid, author, source, instructions, prompt, url, modelVersion, dref, profile, quality, repeat, weird, imageWeight, stylize, styleWeight, chaos, tile, aspectRatio, raw, seed);
  }

  readonly creationDate: number;

  readonly guid: string;

  readonly author: string;

  readonly source: string;

  readonly command: string;

  readonly prompt: string;

  readonly url?: string;

  readonly modelVersion?: string;

  readonly dref?: string;

  readonly profile?: string;

  readonly quality?: number;

  readonly repeat?: number;

  readonly weird?: number;

  readonly imageWeight?: number;

  readonly stylize?: number;

  readonly styleWeight?: number;

  readonly chaos?: number;

  readonly aspectRatio?: number;

  readonly tile?: boolean;

  readonly raw?: boolean;

  readonly seed?: number;

  constructor(creationDate: number, guid: string, author: string, source: string, command: string, prompt: string, url?: string, modelVersion?: string, dref?: string, profile?: string, quality?: number, repeat?: number, weird?: number, imageWeight?: number, stylize?: number, styleWeight?: number, chaos?: number, tile?: boolean, aspectRatio?: number, raw?: boolean, seed?: number)
  {
    this.creationDate = creationDate;
    this.guid = guid;
    this.author = author;
    this.source = source;
    this.command = command;
    this.prompt = prompt;
    this.url = url;
    this.modelVersion = modelVersion;
    this.dref = dref;
    this.profile = profile;
    this.quality = quality;
    this.repeat = repeat;
    this.weird = weird;
    this.imageWeight = imageWeight;
    this.stylize = stylize;
    this.styleWeight = styleWeight;
    this.chaos = chaos;
    this.tile = tile;
    this.aspectRatio = aspectRatio;
    this.raw = raw;
    this.seed = seed;
  }

  toUiContainer(): UiContainerClass
  {
    const primaryRows: TableRow[] = [];
    const secondaryRows: TableRow[] = [];
    const firstColumnOptions = { modifiers: { weight: TextWeight.heavy, intensity: TextIntensity.low } };
    const copiableOptions = { modifiers: { copyable: true } };

    if (this.prompt !== undefined && this.prompt.length > 0)
    {
      primaryRows.push(tableRow([ stringShort("Prompt", firstColumnOptions), stringLong(this.prompt, copiableOptions) ]));
    }

    // The command is shifted to the second section
    if (this.command !== undefined && this.command.length > 0)
    {
      secondaryRows.push(tableRow([ stringShort("Command", firstColumnOptions), stringLong(this.command, copiableOptions) ]));
    }

    if (this.stylize !== undefined)
    {
      secondaryRows.push(tableRow([ stringShort("Stylize", firstColumnOptions), numberUnbounded(this.stylize, copiableOptions) ]));
    }

    if (this.chaos !== undefined)
    {
      secondaryRows.push(tableRow([ stringShort("Chaos", firstColumnOptions), numberUnbounded(this.chaos, copiableOptions) ]));
    }

    if (this.weird !== undefined)
    {
      secondaryRows.push(tableRow([ stringShort("Weird", firstColumnOptions), numberUnbounded(this.weird, copiableOptions) ]));
    }

    if (this.quality !== undefined)
    {
      secondaryRows.push(tableRow([ stringShort("Quality", firstColumnOptions), numberUnbounded(this.quality, copiableOptions) ]));
    }

    if (this.raw !== undefined)
    {
      secondaryRows.push(tableRow([ stringShort("Raw", firstColumnOptions), booleanBadge(this.raw, {
        trueLabel: "Raw",
        falseLabel: "Standard",
        variant: BadgeVariant.success
      }) ]));
    }

    if (this.tile !== undefined)
    {
      secondaryRows.push(tableRow([ stringShort("Tile", firstColumnOptions), booleanBadge(this.tile, {
        trueLabel: "Tiled",
        falseLabel: "No",
        variant: BadgeVariant.success
      }) ]));
    }

    if (this.seed !== undefined && this.seed !== -1)
    {
      secondaryRows.push(tableRow([ stringShort("Seed", firstColumnOptions), identifier(String(this.seed), copiableOptions) ]));
    }

    if (this.profile !== undefined)
    {
      secondaryRows.push(tableRow([ stringShort("Profile", firstColumnOptions), stringShort(this.profile, copiableOptions) ]));
    }

    if (this.imageWeight !== undefined)
    {
      secondaryRows.push(tableRow([ stringShort("Image Weight", firstColumnOptions), numberUnbounded(this.imageWeight, copiableOptions) ]));
    }

    if (this.styleWeight !== undefined)
    {
      secondaryRows.push(tableRow([ stringShort("Style Weight", firstColumnOptions), numberUnbounded(this.styleWeight, copiableOptions) ]));
    }

    if (this.dref !== undefined)
    {
      secondaryRows.push(tableRow([ stringShort("Dref", firstColumnOptions), stringShort(this.dref, copiableOptions) ]));
    }

    if (this.repeat !== undefined)
    {
      secondaryRows.push(tableRow([ stringShort("Repeat", firstColumnOptions), numberUnbounded(this.repeat, copiableOptions) ]));
    }

    if (this.source !== undefined)
    {
      const isUrl = this.source.startsWith("http://") === true || this.source.startsWith("https://") === true;
      secondaryRows.push(tableRow([ stringShort("Digital Source", firstColumnOptions), isUrl === true ? stringUrl(this.source) : stringShort(this.source) ]));
    }

    if (this.guid !== undefined && Math.random() > 1)
    {
      secondaryRows.push(tableRow([ stringShort("Job ID", firstColumnOptions), identifier(this.guid, copiableOptions) ]));
    }

    const elements: UiElement[] = [];
    if (primaryRows.length > 0)
    {
      elements.push(table(
        primaryRows,
        {
          withRowSeparators: true
        }
      ));
    }
    if (secondaryRows.length > 0)
    {
      elements.push(collapsibleGroup("Details",
        [
          table(secondaryRows,
            {
              withRowSeparators: true
            }
          )
        ],
        {
          summary: `${secondaryRows.length} properties`,
          defaultExpanded: false
        }
      ));
    }

    return createUiContainer({ elements });
  }

}

class MidjourneyExtension extends PicteusExtension
{

  private repository?: Repository;

  protected async onReady(communicator?: Communicator): Promise<void>
  {
    await this.setup(await this.getSettings());
    await this.ensureRepository(communicator);
    await this.installChromeExtension();
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

if (process.env["NODE_ENV"] !== "test")
{
  new MidjourneyExtension().run().catch((error) =>
  {
    console.error(error);
    throw error;
  });
}
