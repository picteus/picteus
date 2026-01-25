import { XMLParser } from "fast-xml-parser";

import {
  Communicator,
  GenerationRecipe,
  Helper,
  ImageFeatureFormat,
  ImageFeatureType,
  ImageMetadata,
  NotificationEvent,
  NotificationValue,
  PicteusExtension,
  PromptKind,
  Repository,
  SettingsValue
} from "@picteus/extension-sdk";


enum MidjourneyConstants
{
  Author = "Author",
  CreationTime = "Creation Time",
  Description = "Description",
  DigImageGUID = "DigImageGUID",
  DigitalSourceType = "DigitalSourceType",
  XMP = "XML:com.adobe.xmp"
}

export class MidjourneyInstructions
{

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
      guid = xmpDescription?.["@_iptcExt:DigImageGUID"] || guid;
      source = xmpDescription?.["@_iptcExt:DigitalSourceType"] || source;
    }
    if (creationTime !== undefined && description !== undefined && guid !== undefined && source !== undefined)
    {
      return MidjourneyInstructions.parse(creationTime, author, description, guid, source);
    }
    return undefined;
  }

  static parse(creationTime: string, author: string, description: string, guid: string, source: string): MidjourneyInstructions
  {
    console.debug(`Parsing the Midjourney description '${description}'`);
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
    let aspectRatio: string | undefined;
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
              aspectRatio = value;
              break;
            case "seed":
            case "sref":
              seed = Number.isInteger(value) === false ? -1 : parseInt(value);
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
    return new MidjourneyInstructions(Date.parse(creationTime), guid, author, source, instructions, prompt, modelVersion, dref, profile, quality, repeat, weird, imageWeight, stylize, styleWeight, chaos, tile, aspectRatio, raw, seed);
  }

  readonly creationDate: number;

  readonly guid: string;

  readonly author: string;

  readonly source: string;

  readonly command: string;

  readonly prompt: string;

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

  readonly aspectRatio?: string;

  readonly tile?: boolean;

  readonly raw?: boolean;

  readonly seed?: number;

  constructor(creationDate: number, guid: string, author: string, source: string, command: string, prompt: string, modelVersion?: string, dref?: string, profile?: string, quality?: number, repeat?: number, weird?: number, imageWeight?: number, stylize?: number, styleWeight?: number, chaos?: number, tile?: boolean, aspectRatio?: string, raw?: boolean, seed?: number)
  {
    this.creationDate = creationDate;
    this.guid = guid;
    this.author = author;
    this.source = source;
    this.command = command;
    this.prompt = prompt;
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

  attributes(): Map<string, any>
  {
    const map = new Map<string, any>();
    map.set("Creation Date", this.creationDate);
    map.set("GUID", this.guid);
    map.set("Author", this.author);
    map.set("Command", this.command);
    map.set("Prompt", this.prompt);
    if (this.modelVersion !== undefined)
    {
      map.set("Model Version", this.modelVersion);
    }
    if (this.profile !== undefined)
    {
      map.set("Profile", this.profile);
    }
    if (this.quality !== undefined)
    {
      map.set("Quality", this.quality);
    }
    if (this.repeat !== undefined)
    {
      map.set("Repeat", this.repeat);
    }
    if (this.weird !== undefined)
    {
      map.set("Weird", this.weird);
    }
    if (this.imageWeight !== undefined)
    {
      map.set("Image Weight", this.imageWeight);
    }
    if (this.stylize !== undefined)
    {
      map.set("Stylize", this.stylize);
    }
    if (this.styleWeight !== undefined)
    {
      map.set("Style Weight", this.styleWeight);
    }
    if (this.chaos !== undefined)
    {
      map.set("Chaos", this.chaos);
    }
    if (this.aspectRatio !== undefined)
    {
      map.set("Aspect Ratio", this.aspectRatio);
    }
    if (this.tile !== undefined)
    {
      map.set("Tile", this.tile);
    }
    if (this.raw !== undefined)
    {
      map.set("Raw", this.raw);
    }
    if (this.seed !== undefined)
    {
      map.set("Seed", this.seed);
    }
    return map;
  }

}

class MidjourneyExtension extends PicteusExtension
{

  private repository?: Repository;

  protected async onReady(communicator?: Communicator): Promise<void>
  {
    await this.setup(await this.getSettings());
    await this.ensureRepository(communicator);
  }

  protected async onSettings(_communicator: Communicator, value: SettingsValue): Promise<void>
  {
    await this.setup(value);
  }

  protected async onEvent(_communicator: Communicator, event: string, value: NotificationValue): Promise<any>
  {
    if (event === NotificationEvent.ImageCreated || event === NotificationEvent.ImageUpdated || event === NotificationEvent.ImageComputeTags || event === NotificationEvent.ImageComputeFeatures)
    {
      const imageId: string = value["id"];
      const metadata = await this.getImageApi().imageGetMetadata({ id: imageId });
      if (event === NotificationEvent.ImageCreated || event === NotificationEvent.ImageUpdated || event === NotificationEvent.ImageComputeTags)
      {
        await this.computeTags(imageId, metadata);
      }
      if (event === NotificationEvent.ImageCreated || event === NotificationEvent.ImageUpdated || event === NotificationEvent.ImageComputeFeatures)
      {
        await this.computeFeatures(imageId, metadata);
      }
    }
    else if (event === NotificationEvent.ProcessRunCommand)
    {
    }
  }

  private async computeTags(imageId: string, metadata: ImageMetadata): Promise<void>
  {
    const instructions: MidjourneyInstructions | undefined = this.computeInstructions(metadata);
    if (instructions !== undefined)
    {
      await this.getImageApi().imageSetTags({
        id: imageId,
        extensionId: this.extensionId,
        requestBody: instructions === undefined ? [] : [this.extensionId]
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
          modelTags: instructions.modelVersion === undefined ? [] : [`midjourney/${instructions.modelVersion}`],
          software: "midjourney",
          prompt: { kind: PromptKind.Instructions, value: instructions }
        };
      await this.getImageApi().imageSetFeatures({
        id: imageId,
        extensionId: this.extensionId,
        imageFeature: [
          {
            type: ImageFeatureType.Recipe,
            format: ImageFeatureFormat.Json,
            value: JSON.stringify(recipe)
          },
          {
            type: ImageFeatureType.Description,
            format: ImageFeatureFormat.String,
            value: instructions.prompt
          },
          {
            type: ImageFeatureType.Other,
            format: ImageFeatureFormat.Markdown,
            value: Array.from(instructions.attributes().entries()).map(([key, value]) =>
            {
              return `**${key}:** ${value}`;
            }).join("<br>")
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

  private async ensureRepository(communicator?: Communicator): Promise<void>
  {
    const name = PicteusExtension.getManifest().name;
    this.repository = await this.getRepositoryApi().repositoryEnsure({
      technicalId: this.extensionId,
      name,
      comment: `The ${name} repository`,
      watch: true
    });
    communicator?.sendLog(`The repository '${name}' was created`, "info");
  }

}

new MidjourneyExtension().run().catch((error) =>
{
  console.error(error);
  throw error;
});
