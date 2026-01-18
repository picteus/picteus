import { Expose, Transform, Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsDefined,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  NotEquals,
  ValidateNested
} from "class-validator";
import { ApiProperty, ApiSchema } from "@nestjs/swagger";

import { jsonTransform } from "./transformers.dtos";
import {
  computeIdPattern,
  extensionIdPattern,
  FieldLengths,
  ImageTag,
  Json,
  namePattern,
  semverPattern,
  uriPathPattern
} from "./common.dtos";


/**
 * All the possible manifest events.
 */
export enum ManifestEvent
{
  ProcessStarted = "process.started",
  ProcessRunCommand = "process.runCommand",
  ExtensionSettings = "extension.settings",
  ImageCreated = "image.created",
  ImageUpdated = "image.updated",
  ImageDeleted = "image.deleted",
  ImageComputeFeatures = "image.computeFeatures",
  ImageComputeEmbeddings = "image.computeEmbeddings",
  ImageComputeTags = "image.computeTags",
  ImageRunCommand = "image.runCommand",
  TextComputeEmbeddings = "text.computeEmbeddings"
}

/**
 * An extension's manifest command specification.
 */
@ApiSchema({ description: "The specifications of an extension's command" })
export class ManifestExtensionCommandSpecification
{

  constructor(locale: string, label: string, description?: string)
  {
    this.locale = locale;
    this.label = label;
    this.description = description;
  }

  @ApiProperty(
    {
      description: "The locale the specification applies on",
      type: String,
      minLength: 1,
      maxLength: FieldLengths.eight,
      required: true,
      default: "en",
      example: "fr"
    }
  )
  @IsString()
  @MinLength(1)
  @MaxLength(FieldLengths.eight)
  @Expose()
  readonly locale: string;

  @ApiProperty(
    {
      description: "The command label for the corresponding locale",
      type: String,
      minLength: 1,
      maxLength: FieldLengths.name,
      required: true,
      example: "Resize an image"
    }
  )
  @IsString()
  @MinLength(1)
  @MaxLength(FieldLengths.name)
  @Expose()
  readonly label: string;

  @ApiProperty(
    {
      description: "The command description for the corresponding locale",
      type: String,
      minLength: 1,
      maxLength: FieldLengths.comment,
      required: true,
      example: "Resizes an image given a format asked to the user."
    }
  )
  @IsString()
  @MinLength(1)
  @MaxLength(FieldLengths.comment)
  @Expose()
  readonly description?: string;

}

/**
 * The entities an extension command may apply to.
 */
export enum CommandEntity
{
  /**
   * Applicable globally at the level of the process.
   */
  Process = "Process",
  // Repository = "Repository",
  /**
   * Applicable on multiple images.
   */
  Images = "Images",
  /**
   * Applicable on a single image.
   */
  Image = "Image"
}

/**
 * An extension manifest expression which indicates on what it applies.
 */
@ApiSchema({ description: "The information on what entity an extension command applies on" })
export class ManifestExtensionCommandOn
{

  constructor(entity: CommandEntity, withTags: ImageTag[])
  {
    this.entity = entity;
    this.withTags = withTags;
  }

  @ApiProperty(
    {
      description: "The entity the command applies to",
      enum: CommandEntity,
      enumName: "CommandEntity",
      required: true
    }
  )
  @IsEnum(CommandEntity)
  @IsDefined()
  @NotEquals(null)
  @Expose()
  readonly entity: CommandEntity;

  @ApiProperty(
    {
      description: "The tags the entity should be attached to for the command to apply",
      type: String,
      isArray: true,
      minLength: 1,
      maxLength: FieldLengths.technical,
      required: false
    }
  )
  @IsArray()
  @IsString({ each: true })
  @ValidateNested({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(FieldLengths.technical, { each: true })
  @IsOptional()
  @Expose()
  readonly withTags?: ImageTag[];

}

/**
 * An extension manifest extension command.
 */
@ApiSchema({ description: "The definition of an extension's command" })
export class ManifestExtensionCommand
{

  constructor(id: string, on: ManifestExtensionCommandOn, parameters: Json, specifications: ManifestExtensionCommandSpecification[])
  {
    this.id = id;
    this.on = on;
    this.parameters = parameters;
    this.specifications = specifications;
  }

  @ApiProperty(
    {
      description: "The identifier of the command",
      type: String,
      pattern: computeIdPattern(FieldLengths.shortTechnical),
      minLength: 1,
      maxLength: FieldLengths.shortTechnical,
      required: true,
      example: "convert"
    }
  )
  @Matches(computeIdPattern(FieldLengths.shortTechnical))
  @MinLength(1)
  @MaxLength(FieldLengths.shortTechnical)
  @IsDefined()
  @NotEquals(null)
  @IsString()
  @Expose()
  readonly id: string;

  @ApiProperty(
    {
      description: "The kind of entity and the conditions the command applies to",
      type: ManifestExtensionCommandOn,
      required: true
    }
  )
  @Type(() => ManifestExtensionCommandOn)
  @IsDefined()
  @NotEquals(null)
  @Expose()
  readonly on: ManifestExtensionCommandOn;

  @ApiProperty(
    {
      description: "The definition of the parameters the command requires",
      type: Object,
      required: false
    }
  )
  @Transform(jsonTransform)
  @IsOptional()
  @Expose()
  readonly parameters?: Json;

  @ApiProperty(
    {
      description: "The specifications for the command",
      type: ManifestExtensionCommandSpecification,
      isArray: true,
      minItems: 1,
      required: true
    }
  )
  @Type(() => ManifestExtensionCommandSpecification)
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @IsDefined()
  @NotEquals(null)
  @Expose()
  readonly specifications: ManifestExtensionCommandSpecification[];

}

/**
 * The identifiers of all the capabilities.
 */
export enum ManifestCapabilityId
{
  ImageFeatures = "image.features",
  ImageEmbeddings = "image.embeddings",
  ImageTags = "image.tags",
  TextEmbeddings = "text.embeddings"
}

/**
 * The expression of an extension's capability.
 */
@ApiSchema({ description: "The expression of an extension's capability" })
export class ManifestCapability
{

  constructor(id: ManifestCapabilityId)
  {
    this.id = id;
  }

  @ApiProperty(
    {
      description: "The identifier of the extension capability",
      enum: ManifestCapabilityId,
      enumName: "ManifestCapabilityId",
      pattern: computeIdPattern(FieldLengths.shortTechnical),
      minLength: 1,
      maxLength: FieldLengths.shortTechnical,
      required: true,
      example: ManifestCapabilityId.ImageEmbeddings
    }
  )
  @IsEnum(ManifestCapabilityId)
  @Matches(computeIdPattern(FieldLengths.shortTechnical))
  @MinLength(1)
  @MaxLength(FieldLengths.shortTechnical)
  @IsDefined()
  @NotEquals(null)
  @Expose()
  readonly id: ManifestCapabilityId;

}

@ApiSchema({ description: "The definition on how events should be throttled" })
export class ManifestThrottlingPolicy
{

  constructor(events: ManifestEvent[], durationInMilliseconds?: number, maximumCount?: number)
  {
    this.events = events;
    this.durationInMilliseconds = durationInMilliseconds;
    this.maximumCount = maximumCount;
  }

  @ApiProperty(
    {
      description: "The events which are involved in the throttling",
      enum: ManifestEvent,
      enumName: "ManifestEvent",
      isArray: true,
      minItems: 1,
      required: true
    }
  )
  @IsEnum(ManifestEvent, { each: true })
  @ArrayMinSize(1)
  @IsDefined()
  @NotEquals(null)
  @Expose()
  readonly events: ManifestEvent[];

  @ApiProperty(
    {
      description: "The duration during which a maximal number of events can be handled",
      type: Number,
      format: "int32",
      minimum: 0,
      exclusiveMinimum: true,
      required: false,
      example: 1_000
    }
  )
  @IsInt()
  @IsPositive()
  @IsOptional()
  @Expose()
  readonly durationInMilliseconds?: number;

  @ApiProperty(
    {
      description: "The maximal number of events that be handled during the duration",
      type: Number,
      format: "int32",
      minimum: 0,
      exclusiveMinimum: true,
      required: false,
      example: 10
    }
  )
  @IsInt()
  @IsPositive()
  @IsOptional()
  @Expose()
  readonly maximumCount?: number;

}

/**
 * The execution associated with an extension instruction.
 */
@ApiSchema({ description: "The specifications regarding the execution of an extension" })
export class ManifestExecution
{

  constructor(executable: string, theArguments: string[])
  {
    this.executable = executable;
    this.arguments = theArguments;
  }

  @ApiProperty(
    {
      description: "The executable to run",
      type: String,
      minLength: 1,
      maxLength: FieldLengths.command,
      example: "python",
      required: true
    }
  )
  @IsString()
  @MinLength(1)
  @MaxLength(FieldLengths.command)
  @IsDefined()
  @NotEquals(null)
  @Expose()
  readonly executable: string;

  @ApiProperty(
    {
      description: "The arguments to provide to the executable",
      type: String,
      isArray: true,
      minLength: 1,
      maxLength: FieldLengths.command,
      maxItems: 64,
      required: true
    }
  )
  @IsString({ each: true })
  @IsArray()
  @MinLength(1, { each: true })
  @MaxLength(FieldLengths.command, { each: true })
  @IsDefined()
  @NotEquals(null)
  @Expose()
  readonly arguments: string [];

}

/**
 * The instructions of an extension depending on events.
 */
@ApiSchema({ description: "The full specifications of an extension, including the events it handles, its capabilities, its execution and its commands" })
export class ManifestInstructions
{

  constructor(events: ManifestEvent[], capabilities: ManifestCapability[], execution: ManifestExecution, commands: ManifestExtensionCommand[])
  {
    this.events = events;
    this.capabilities = capabilities;
    this.execution = execution;
    this.commands = commands;
  }

  @ApiProperty(
    {
      description: "The events which will trigger the instructions",
      enum: ManifestEvent,
      enumName: "ManifestEvent",
      isArray: true,
      minItems: 1,
      required: true
    }
  )
  @IsEnum(ManifestEvent, { each: true })
  @ArrayMinSize(1)
  @IsDefined()
  @NotEquals(null)
  @Expose()
  readonly events: ManifestEvent[];

  @ApiProperty(
    {
      description: "The capabilities attached to the instructions",
      type: ManifestCapability,
      isArray: true,
      required: false
    }
  )
  @Type(() => ManifestCapability)
  @IsArray()
  @ValidateNested({ each: true })
  @IsOptional()
  @Expose()
  readonly capabilities?: ManifestCapability[];

  @ApiProperty(
    {
      description: "The throttling policies for some events",
      type: ManifestThrottlingPolicy,
      isArray: true,
      required: false
    }
  )
  @Type(() => ManifestThrottlingPolicy)
  @IsArray()
  @ValidateNested({ each: true })
  @IsOptional()
  @Expose()
  readonly throttlingPolicies?: ManifestThrottlingPolicy [];

  @ApiProperty(
    {
      description: "The execution to run when one of the event of the instructions occurs",
      type: ManifestExecution,
      required: true
    }
  )
  @Type(() => ManifestExecution)
  @IsDefined()
  @NotEquals(null)
  @Expose()
  readonly execution: ManifestExecution;

  @ApiProperty(
    {
      description: "The possible commands of the event",
      type: ManifestExtensionCommand,
      isArray: true,
      required: false
    }
  )
  @Type(() => ManifestExtensionCommand)
  @IsArray()
  @ValidateNested({ each: true })
  @IsOptional()
  @Expose()
  readonly commands?: ManifestExtensionCommand [];

}

/**
 * The extension runtime environments.
 */
export enum ManifestRuntimeEnvironment
{
  Python = "python",
  Node = "node"
}

/**
 * The expression of an extension's runtime environment.
 */
@ApiSchema({ description: "The expression of an extension's runtime environment" })
export class ManifestRuntime
{

  constructor(environment: ManifestRuntimeEnvironment)
  {
    this.environment = environment;
  }

  @ApiProperty(
    {
      description: "The unique identifier of the runtime environment",
      enum: ManifestRuntimeEnvironment,
      enumName: "ManifestRuntimeEnvironment",
      required: true,
      example: ManifestRuntimeEnvironment.Python
    }
  )
  @IsEnum(ManifestRuntimeEnvironment)
  @IsDefined()
  @NotEquals(null)
  @Expose()
  readonly environment: ManifestRuntimeEnvironment;

}

/**
 * All the User Interface anchor types.
 */
export enum UserInterfaceAnchor
{
  // noinspection JSUnusedGlobalSymbols
  Modal = "modal",
  Sidebar = "sidebar",
  Window = "window",
  ImageDetail = "imageDetail"
}

/**
 * The definition of an extension's User Interface fragment.
 */
@ApiSchema({ description: "The definition of an extension's User Interface fragment" })
export class ManifestInterfaceElement
{

  constructor(anchor: UserInterfaceAnchor, url: string)
  {
    this.anchor = anchor;
    this.url = url;
  }

  @ApiProperty(
    {
      description: "The location where the User Interface is anchored",
      enum: UserInterfaceAnchor,
      enumName: "UserInterfaceAnchor",
      required: true
    }
  )
  @IsEnum(UserInterfaceAnchor)
  @IsDefined()
  @NotEquals(null)
  @Expose()
  readonly anchor: UserInterfaceAnchor;

  @ApiProperty(
    {
      description: "The URL of the User Interface",
      type: String,
      format: "uri",
      pattern: uriPathPattern,
      minLength: 1,
      maxLength: FieldLengths.url,
      required: true
    }
  )
  @IsString()
  @Matches(uriPathPattern)
  @MinLength(1)
  @MaxLength(FieldLengths.url)
  @IsDefined()
  @NotEquals(null)
  @Expose()
  readonly url: string;

}

/**
 * The definition of all extension's User Interface fragments.
 */
@ApiSchema({ description: "The definition of all extension's User Interface fragments" })
export class ManifestUserInterface
{

  constructor(elements: ManifestInterfaceElement[])
  {
    this.elements = elements;
  }

  @ApiProperty(
    {
      description: "The various elements of the User Interface",
      type: ManifestInterfaceElement,
      isArray: true,
      minItems: 1,
      required: true
    }
  )
  @Type(() => ManifestInterfaceElement)
  @IsArray()
  @ArrayMinSize(1)
  @IsDefined()
  @NotEquals(null)
  @Expose()
  readonly elements: ManifestInterfaceElement[];

}

/**
 * The basis information about an extension.
 */
@ApiSchema({ description: "The basis information about an extension" })
class ExtensionBasis
{

  constructor(id: string, version: string, name: string, description: string)
  {
    this.id = id;
    this.version = version;
    this.name = name;
    this.description = description;
  }

  @ApiProperty(
    {
      description: "The identifier of the extension",
      type: String,
      pattern: computeIdPattern(FieldLengths.shortTechnical),
      minLength: 1,
      maxLength: FieldLengths.shortTechnical,
      required: true,
      example: "extension-id"
    }
  )
  @Matches(computeIdPattern(FieldLengths.shortTechnical))
  @MinLength(1)
  @MaxLength(FieldLengths.shortTechnical)
  @IsDefined()
  @NotEquals(null)
  @IsString()
  @Expose()
  readonly id: string;

  @ApiProperty(
    {
      description: "The version of the extension, which should follow the semver convention",
      type: String,
      pattern: semverPattern,
      minLength: 5,
      maxLength: FieldLengths.shortTechnical,
      required: true,
      example: "1.0.0"
    }
  )
  @Matches(semverPattern)
  @MinLength(5)
  @MaxLength(FieldLengths.shortTechnical)
  @IsDefined()
  @NotEquals(null)
  @IsString()
  @Expose()
  readonly version: string;

  @ApiProperty(
    {
      description: "The name of the extension",
      type: String,
      pattern: namePattern,
      minLength: 1,
      maxLength: FieldLengths.name,
      required: true,
      example: "My extension"
    }
  )
  @Matches(namePattern)
  @MinLength(1)
  @MaxLength(FieldLengths.name)
  @IsDefined()
  @NotEquals(null)
  @IsString()
  @Expose()
  readonly name: string;

  @ApiProperty(
    {
      description: "The description of the extension's purpose",
      type: String,
      minLength: 1,
      maxLength: FieldLengths.comment,
      required: true,
      example: "Computes the embeddings of images."
    }
  )
  @MinLength(1)
  @MaxLength(FieldLengths.comment)
  @IsDefined()
  @NotEquals(null)
  @IsString()
  @Expose()
  readonly description: string;

}

/**
 * The manifest of an extension.
 */
@ApiSchema({ description: "The manifest of an extension" })
export class Manifest extends ExtensionBasis
{

  constructor(id: string, version: string, name: string, description: string, runtimes: ManifestRuntime[], instructions: ManifestInstructions[], settings: Object, ui: ManifestUserInterface)
  {
    super(id, version, name, description);
    this.runtimes = runtimes;
    this.instructions = instructions;
    this.settings = settings;
    this.ui = ui;
  }

  @ApiProperty(
    {
      description: "The required runtime environments",
      type: ManifestRuntime,
      isArray: true,
      required: true
    }
  )
  @Type(() => ManifestRuntime)
  @IsArray()
  @ValidateNested({ each: true })
  @IsDefined()
  @NotEquals(null)
  @Expose()
  readonly runtimes: ManifestRuntime[];

  @ApiProperty(
    {
      description: "The instructions regarding the way the extension handle events",
      type: ManifestInstructions,
      isArray: true,
      minItems: 1,
      required: true
    }
  )
  @Type(() => ManifestInstructions)
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @IsDefined()
  @NotEquals(null)
  @Expose()
  readonly instructions: ManifestInstructions[];

  @ApiProperty(
    {
      description: "The extension settings definition",
      type: Object,
      required: true,
      example: {
        type: "object",
        properties: { key: { type: "string", title: "Key", description: "A key." } },
        required: ["key"]
      }
    }
  )
  @Transform(jsonTransform)
  @IsObject()
  @IsDefined()
  @NotEquals(null)
  @Expose()
  readonly settings: Object;

  @ApiProperty(
    {
      description: "The User Interface definition of the extensions",
      type: ManifestUserInterface,
      required: false
    }
  )
  @Type(() => ManifestUserInterface)
  @IsOptional()
  @Expose()
  readonly ui?: ManifestUserInterface;

}

/**
 * The options for generating an extension.
 */
@ApiSchema({ description: "The options for generating an extension" })
export class ExtensionGenerationOptions extends ExtensionBasis
{

  constructor(id: string, version: string, name: string, description: string, author: string, environment: ManifestRuntimeEnvironment)
  {
    super(id, version, name, description);
    this.author = author;
    this.environment = environment;
  }

  @ApiProperty(
    {
      description: "The author of the extension",
      type: String,
      minLength: 1,
      maxLength: FieldLengths.name,
      required: true,
      example: "John Doe"
    }
  )
  @MinLength(1)
  @MaxLength(FieldLengths.name)
  @IsDefined()
  @NotEquals(null)
  @IsString()
  @Expose()
  readonly author: string;

  @ApiProperty(
    {
      description: "The runtime the extension relies on",
      enum: ManifestRuntimeEnvironment,
      enumName: "ManifestRuntimeEnvironment",
      required: true,
      example: ManifestRuntimeEnvironment.Python
    }
  )
  @IsEnum(ManifestRuntimeEnvironment)
  @IsDefined()
  @NotEquals(null)
  @Expose()
  readonly environment: ManifestRuntimeEnvironment;

}

/**
 * All possible extension statuses.
 */
export enum ExtensionStatus
{
  Enabled = "enabled",
  Paused = "paused"
}

/**
 * All possible extension activity kinds.
 */
export enum ExtensionActivityKind
{
  Connecting = "connecting",
  Connected = "connected",
  Error = "error"
}

/**
 * The activity of an extension.
 */
@ApiSchema({ description: "The activity of an extension" })
export class ExtensionActivity
{

  constructor(id: string, kind: ExtensionActivityKind)
  {
    this.id = id;
    this.kind = kind;
  }

  @ApiProperty(
    {
      description: "The identifier of the extension",
      type: String,
      required: true
    }
  )
  @IsString()
  @Expose()
  readonly id: string;

  @ApiProperty(
    {
      description: "The kind of activity of the extension",
      enum: ExtensionActivityKind,
      enumName: "ExtensionActivityKind",
      required: true,
      default: ExtensionActivityKind.Connecting,
      example: ExtensionActivityKind.Connected
    }
  )
  @IsEnum(ExtensionActivityKind)
  @Expose()
  readonly kind: ExtensionActivityKind;

}

/**
 * A list of extension activities.
 */
export type ExtensionActivities = ExtensionActivity[];

/**
 * The full definition of an extension.
 */
@ApiSchema({ description: "The full definition of an extension" })
export class Extension
{

  static readonly ARCHIVE_MAXIMUM_BINARY_WEIGHT_IN_BYTES = 8 * 1_024 * 1_024;

  static readonly CHROME_EXTENSION_MAXIMUM_BINARY_WEIGHT_IN_BYTES = 64 * 1_024 * 1_024;

  constructor(manifest: Manifest, status: ExtensionStatus)
  {
    this.manifest = manifest;
    this.status = status;
  }

  @ApiProperty(
    {
      description: "The extension manifest",
      type: Manifest,
      required: true
    }
  )
  @Type(() => Manifest)
  @IsDefined()
  @NotEquals(null)
  @Expose()
  readonly manifest: Manifest;

  @ApiProperty(
    {
      description: "The status of the extension",
      enum: ExtensionStatus,
      enumName: "ExtensionStatus",
      required: true,
      example: ExtensionStatus.Enabled
    }
  )
  @IsEnum(ExtensionStatus)
  @IsDefined()
  @NotEquals(null)
  @Expose()
  readonly status: ExtensionStatus;

}

/**
 * The instructions of an extension.
 */
@ApiSchema({ description: "The instructions of an extension" })
export class ExtensionManual
{

  constructor(instructions: string)
  {
    this.instructions = instructions;
  }

  @ApiProperty(
    {
      description: "The instructions",
      type: String,
      minLength: 1,
      maxLength: FieldLengths.content,
      required: true,
      example: "To use the extension, you need to install…"
    }
  )
  @Matches(computeIdPattern(FieldLengths.content))
  @MinLength(1)
  @MaxLength(FieldLengths.content)
  @IsDefined()
  @NotEquals(null)
  @IsString()
  @Expose()
  readonly instructions: string;

}

/**
 * The manual and instructions of an extension.
 */
@ApiSchema({ description: "The manual and instructions of an extension" })
export class ExtensionAndManual extends Extension
{

  constructor(manifest: Manifest, status: ExtensionStatus, manual?: ExtensionManual)
  {
    super(manifest, status);
    this.manual = manual;
  }

  @ApiProperty(
    {
      description: "The extension manual",
      type: ExtensionManual,
      required: false
    }
  )
  @Type(() => ExtensionManual)
  @IsOptional()
  @Expose()
  readonly manual?: ExtensionManual;

}

/**
 * The settings of an extension.
 */
@ApiSchema({ description: "The settings of an extension" })
export class ExtensionSettings
{

  constructor(value: Json)
  {
    this.value = value;
  }

  @ApiProperty(
    {
      description: "The extension settings",
      type: Object,
      required: true
    }
  )
  @Transform(jsonTransform)
  @IsDefined()
  @NotEquals(null)
  @Expose()
  readonly value: Json;

}

/**
 * The supporting extensions of a capability.
 */
@ApiSchema({ description: "The supporting extensions of a capability" })
export class ConfigurationCapability
{

  constructor(capability: ManifestCapability, extensionIds: string[])
  {
    this.capability = capability;
    this.extensionIds = extensionIds;
  }

  @ApiProperty(
    {
      description: "The capability",
      type: ManifestCapability,
      required: true
    }
  )
  @Type(() => ManifestCapability)
  @Expose()
  readonly capability: ManifestCapability;

  @ApiProperty(
    {
      description: "The extensions which support the capability",
      type: String,
      isArray: true,
      required: true,
      pattern: extensionIdPattern
    }
  )
  @IsString({ each: true })
  @IsArray()
  @Expose()
  readonly extensionIds: string[];

}

/**
 * The definition of an extension command.
 */
@ApiSchema({ description: "The definition of an extension command" })
export class ConfigurationExtensionCommand
{

  constructor(extensionId: string, command: ManifestExtensionCommand)
  {
    this.extensionId = extensionId;
    this.command = command;
  }

  @ApiProperty(
    {
      description: "The identifier of the extension",
      type: String,
      pattern: computeIdPattern(FieldLengths.shortTechnical),
      minLength: 1,
      maxLength: FieldLengths.shortTechnical,
      required: true,
      example: "extension-id"
    }
  )
  @Matches(computeIdPattern(FieldLengths.shortTechnical))
  @MinLength(1)
  @MaxLength(FieldLengths.shortTechnical)
  @IsDefined()
  @NotEquals(null)
  @IsString()
  @Expose()
  readonly extensionId: string;

  @ApiProperty(
    {
      description: "A command of the extension",
      type: ManifestExtensionCommand,
      required: true
    }
  )
  @Type(() => ManifestExtensionCommand)
  @IsDefined()
  @NotEquals(null)
  @Expose()
  readonly command: ManifestExtensionCommand;

}

/**
 * The extensions' configuration in respect of their capabilities and commands.
 */
@ApiSchema({ description: "The extensions' configuration in respect of their capabilities and commands" })
export class ExtensionsConfiguration
{

  constructor(capabilities: ConfigurationCapability[], commands: ConfigurationExtensionCommand[])
  {
    this.capabilities = capabilities;
    this.commands = commands;
  }

  @ApiProperty(
    {
      description: "The capabilities",
      type: ConfigurationCapability,
      isArray: true,
      required: true
    }
  )
  @Type(() => ConfigurationCapability)
  @IsArray()
  @ValidateNested({ each: true })
  @Expose()
  readonly capabilities: ConfigurationCapability[];

  @ApiProperty(
    {
      description: "The commands",
      type: ConfigurationExtensionCommand,
      isArray: true,
      required: true
    }
  )
  @Type(() => ConfigurationExtensionCommand)
  @IsArray()
  @ValidateNested({ each: true })
  @Expose()
  readonly commands: ConfigurationExtensionCommand[];

}
