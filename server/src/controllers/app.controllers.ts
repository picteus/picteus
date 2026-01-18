import HttpCodes from "http-codes";
import { headers, types } from "http-constants";
import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Header,
  HttpCode,
  Param,
  ParseArrayPipe,
  ParseBoolPipe,
  ParseIntPipe,
  Post,
  Put,
  Query,
  StreamableFile
} from "@nestjs/common";
import {
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiQuery,
  ApiResponse,
  ApiSecurity,
  ApiTags,
  getSchemaPath
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { logger } from "../logger";
import {
  ApiScope,
  CheckPolicies,
  noSecurity,
  PolicyContext,
  Public,
  RequestPolicyContext,
  withAllPolicies,
  withOneOfPolicies
} from "../app.guards";
import {
  AllExtensionImageTags,
  AllImageEmbeddings,
  AllImageFeatures,
  alphaNumericPlusPattern,
  ApiSecret,
  ApiSecretSummary,
  ApiSecretType,
  ApplicationMetadata,
  applicationXGzipMimeType,
  attachmentUriSchema,
  CommandEntity,
  ComputedImageFormat,
  Extension,
  ExtensionActivities,
  ExtensionActivity,
  ExtensionAndManual,
  ExtensionGenerationOptions,
  extensionIdSchema,
  ExtensionImageEmbeddings,
  ExtensionImageFeature,
  ExtensionImageTag,
  ExtensionsConfiguration,
  ExtensionSettings,
  FieldLengths,
  Image,
  ImageDistance,
  ImageDistances,
  ImageEmbeddings,
  ImageFeature,
  ImageFormat,
  imageIdSchema,
  ImageMediaUrl,
  ImageMetadata,
  ImageResizeRender,
  ImageSearchParameters,
  ImageSummaryList,
  ImageTag,
  imageUrlSchema,
  NumericRange,
  Repository,
  RepositoryActivities,
  RepositoryActivity,
  repositoryIdSchema,
  RepositoryList,
  RepositoryLocationType,
  SearchParameters,
  Settings
} from "../dtos/app.dtos";
import {
  AdministrationService,
  ApiSecretService,
  ExtensionService,
  ImageAttachmentService,
  ImageService,
  MiscellaneousService,
  RepositoryService,
  SettingsService
} from "../services/app.service";
import { ArrayValidationPipe, DeepObjectPipeTransform, exceptionFactory, validationPipeFactory } from "./app.pipes";
import {
  applicationGzipMimeType,
  binarySchemaWithMaxLength,
  computeControllerPath,
  DeepObjectApiQuery,
  imageContent,
  imageSupportedMimeTypes
} from "./tech.controllers";

const { CREATED, NO_CONTENT, OK } = HttpCodes;

export { validationPipeFactory };


const mismatchingAPISecretAndExtensionIdentifiers = "Mismatching API secret and extension identifiers";

const miscellaneousResourceName: string = "miscellaneous";

/**
 * Gather all the web services which cannot be declared in other resources.
 */
@ApiTags(miscellaneousResourceName)
@Controller(computeControllerPath(miscellaneousResourceName))
export class MiscellaneousController
{

  constructor(private readonly service: MiscellaneousService)
  {
    logger.debug("Instantiating a MiscellaneousController");
  }

  // noinspection JSUnresolvedReference
  @Get("ping")
  @Public()
  @ApiSecurity(noSecurity)
  @ApiOperation(
    {
      summary: "Pings the service",
      description: "Enables to check that the service is accessible."
    }
  )
  @ApiResponse(
    {
      status: OK,
      description: "The response, which should be 'pong'",
      type: String
    }
  )
  @ApiProduces(types.txt)
  @Header(headers.response.CONTENT_TYPE, types.txt)
  ping(): string
  {
    return this.service.ping();
  }

  @Get("test")
  //@ApiExcludeEndpoint()
  @ApiOperation(
    {
      summary: "Runs a test",
      description: "This endpoint is for experimentation only."
    }
  )
  @ApiResponse(
    {
      status: OK,
      description: "The response",
      type: String
    }
  )
  @ApiProduces(types.txt)
  @Header(headers.response.CONTENT_TYPE, types.txt)
  async test(): Promise<string>
  {
    return this.service.test();
  }

}

const administrationResourceName: string = "administration";

/**
 * Administers the application.
 */
@ApiTags(administrationResourceName)
@Controller(computeControllerPath(administrationResourceName))
@CheckPolicies(withOneOfPolicies([ApiScope.Administration]))
@ApiConsumes(types.json)
@ApiProduces(types.json)
export class AdministrationController
{

  constructor(private readonly administrationService: AdministrationService)
  {
    logger.debug("Instantiating an AdministrationController");
  }

  @Put("migrateDatabase")
  @ApiOperation(
    {
      summary: "Migrates the database",
      description: "Runs the migration scripts on the database."
    }
  )
  @ApiProduces(types.text)
  @Header(headers.response.CONTENT_TYPE, types.txt)
  @HttpCode(NO_CONTENT)
  @ApiResponse(
    {
      status: NO_CONTENT,
      type: types.text
    }
  )
  async migrateDatabase(): Promise<void>
  {
    return await this.administrationService.migrateDatabase();
  }

}

const settingsResourceName: string = "settings";

/**
 * Manages the application settings.
 */
@ApiTags(settingsResourceName)
@Controller(computeControllerPath(settingsResourceName))
@ApiConsumes(types.json)
@ApiProduces(types.json)
export class SettingsController
{

  constructor(private readonly settingsService: SettingsService)
  {
    logger.debug("Instantiating a SettingsController");
  }

  @Get("get")
  @ApiOperation(
    {
      summary: "Gets all the settings",
      description: "Returns all the application settings."
    }
  )
  @ApiResponse(
    {
      status: OK,
      description: "The settings",
      type: Settings
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.SettingsRead]))
  async get(): Promise<Settings>
  {
    return await this.settingsService.get();
  }

  @Put("set")
  @ApiOperation(
    {
      summary: "Sets all the settings",
      description: "This enables to tune the application settings."
    }
  )
  @ApiBody({ description: "The extension archive", type: Settings, required: true })
  @ApiResponse(
    {
      status: OK,
      description: "The settings",
      type: Settings
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.SettingsWrite]))
  async set(@Body() settings: Settings): Promise<Settings>
  {
    return await this.settingsService.set(settings);
  }

}

const apiSecretResourceName: string = "apiSecret";

/**
 * Manages the API secrets.
 */
@ApiTags(apiSecretResourceName)
@Controller(computeControllerPath(apiSecretResourceName))
@ApiConsumes(types.json)
@ApiProduces(types.json)
export class ApiSecretController
{

  constructor(private readonly apiSecretService: ApiSecretService)
  {
    logger.debug("Instantiating an ApiSecretController");
  }

  @Get("list")
  @ApiOperation(
    {
      summary: "Lists all API secrets",
      description: "Returns all available API secrets without their values."
    }
  )
  @ApiResponse(
    {
      status: OK,
      description: "The list of all API secrets",
      type: ApiSecretSummary,
      isArray: true
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.ApiSecretList]))
  async list(): Promise<ApiSecretSummary[]>
  {
    return await this.apiSecretService.list();
  }

  @Post("create")
  @ApiOperation(
    {
      summary: "Creates an API secret",
      description: "Declares a new API secret with the provided metadata."
    }
  )
  @ApiQuery({
    name: "name",
    description: "The API secret name",
    type: String,
    minLength: 1,
    maxLength: FieldLengths.name,
    required: true,
    example: "My key"
  })
  @ApiQuery({
    name: "type",
    description: "The API secret type",
    enum: ApiSecretType,
    enumName: "ApiSecretType",
    required: true,
    example: ApiSecretType.Key
  })
  @ApiQuery({
    name: "expirationDate",
    description: "The expiration date",
    type: Number,
    format: "int64",
    minimum: 0,
    required: false,
    example: 1760890442560
  })
  @ApiQuery({
    name: "comment",
    description: "A comment about the API secret",
    type: String,
    minLength: 1,
    maxLength: FieldLengths.comment,
    required: false,
    example: "For the xxx application"
  })
  @ApiQuery({
    name: "scope",
    description: "The API secret scope",
    type: String,
    minLength: 1,
    maxLength: FieldLengths.technical,
    required: false,
    example: "image:read,repository:read"
  })
  @ApiResponse(
    {
      status: CREATED,
      description: "The created API secret with its scope and value",
      type: ApiSecret
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.ApiSecretWrite]))
  async create(@Query("type") type: string, @Query("name") name: string, @Query("expirationDate") expirationDate?: number, @Query("comment") comment?: string, @Query("scope") scope?: string): Promise<ApiSecret>
  {
    return await this.apiSecretService.create(type, name, expirationDate, comment, scope);
  }

  @Delete(":id/get")
  @ApiOperation(
    {
      summary: "Gets an API secret",
      description: "Returns the details about an API secret."
    }
  )
  @ApiParam({
    name: "id",
    description: "The API secret identifier",
    type: Number,
    format: "int32",
    required: true,
    example: 123
  })
  @ApiResponse(
    {
      status: OK,
      description: "The API secret",
      type: ApiSecret
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.ApiSecretRead]))
  async get(@Param("id") id: number): Promise<ApiSecret>
  {
    return await this.apiSecretService.get(id);
  }

  @Delete(":id/delete")
  @ApiOperation(
    {
      summary: "Deletes an API secret",
      description: "Once deleted, it cannot be used anymore."
    }
  )
  @ApiParam({
    name: "id",
    description: "The API secret identifier",
    type: Number,
    format: "int32",
    required: true,
    example: 123
  })
  @ApiProduces(types.text)
  @Header(headers.response.CONTENT_TYPE, types.txt)
  @HttpCode(NO_CONTENT)
  @ApiResponse(
    {
      status: NO_CONTENT,
      type: types.text
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.ApiSecretWrite]))
  async delete(@Param("id") id: number): Promise<void>
  {
    return await this.apiSecretService.delete(id);
  }

}

const extensionResourceName: string = "extension";

/**
 * Manages the application extensions.
 */
@ApiTags(extensionResourceName)
@Controller(computeControllerPath(extensionResourceName))
@CheckPolicies(withOneOfPolicies([ApiScope.ExtensionWrite, ApiScope.ExtensionRead]))
@ApiConsumes(types.json)
@ApiProduces(types.json)
export class ExtensionController
{

  constructor(private readonly extensionService: ExtensionService)
  {
    logger.debug("Instantiating an ExtensionController");
  }

  @Get("getConfiguration")
  @ApiOperation(
    {
      summary: "Provides the extensions configuration",
      description: "Returns the details in terms of all installed extensions capabilities, i.e. what they can offer, and the command they offer."
    }
  )
  @ApiResponse(
    {
      status: OK,
      description: "The extensions configuration",
      type: ExtensionsConfiguration
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.ExtensionRead]))
  async getConfiguration(): Promise<ExtensionsConfiguration>
  {
    return await this.extensionService.getConfiguration();
  }

  @Get("list")
  @ApiOperation(
    {
      summary: "Lists all extensions",
      description: "Returns all installed extensions."
    }
  )
  @ApiResponse(
    {
      status: OK,
      description: "The extensions",
      type: Extension,
      isArray: true
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.ExtensionRead]))
  async list(): Promise<Extension[]>
  {
    return await this.extensionService.list();
  }

  @Get("activities")
  @ApiOperation(
    {
      summary: "Indicates the extension activities",
      description: "Returns all the installed and active extensions activities."
    }
  )
  @ApiResponse(
    {
      status: OK,
      description: "The list of all installed and active extensions activities",
      type: ExtensionActivity,
      isArray: true
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.ExtensionRead]))
  async activities(): Promise<ExtensionActivities>
  {
    return await this.extensionService.activities();
  }

  @Get(":id/get")
  @ApiOperation(
    {
      summary: "Gets an extension",
      description: "Returns the details about an extension."
    }
  )
  @ApiParam({ name: "id", description: "The extension identifier", schema: extensionIdSchema, required: true })
  @ApiResponse(
    {
      status: OK,
      description: "The extension details and its manual",
      type: ExtensionAndManual
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.ExtensionRead]))
  async get(@Param("id") id: string): Promise<ExtensionAndManual>
  {
    return await this.extensionService.get(id);
  }

  @Post("install")
  @ApiOperation(
    {
      summary: "Installs an extension",
      description: "Analyzes the extension and installs it."
    }
  )
  @ApiConsumes(types.zip, applicationGzipMimeType, applicationXGzipMimeType)
  @ApiBody({
    description: "The extension archive",
    schema: binarySchemaWithMaxLength(Extension.ARCHIVE_MAXIMUM_BINARY_WEIGHT_IN_BYTES),
    required: true
  })
  @ApiResponse(
    {
      status: CREATED,
      description: "The extension",
      type: Extension
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.ExtensionWrite]))
  async install(@Body() archive: Buffer): Promise<Extension>
  {
    return await this.extensionService.install(undefined, archive, true);
  }

  @Put(":id/update")
  @ApiOperation(
    {
      summary: "Updates an extension",
      description: "Analyzes the extension and updates it."
    }
  )
  @ApiParam({ name: "id", description: "The extension identifier", schema: extensionIdSchema, required: true })
  @ApiConsumes(types.zip, applicationGzipMimeType, applicationXGzipMimeType)
  @ApiBody({
    description: "The extension archive",
    schema: binarySchemaWithMaxLength(Extension.ARCHIVE_MAXIMUM_BINARY_WEIGHT_IN_BYTES),
    required: true
  })
  @ApiResponse(
    {
      status: OK,
      description: "The extension",
      type: Extension
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.ExtensionWrite]))
  async update(@Param("id") id: string, @Body() archive: Buffer): Promise<Extension>
  {
    return await this.extensionService.install(id, archive, true);
  }

  @Delete(":id/uninstall")
  @ApiOperation(
    {
      summary: "Uninstalls an extension",
      description: "Stops the extension and uninstalls it."
    }
  )
  @ApiParam({ name: "id", description: "The extension identifier", schema: extensionIdSchema, required: true })
  @ApiProduces(types.text)
  @Header(headers.response.CONTENT_TYPE, types.txt)
  @HttpCode(NO_CONTENT)
  @ApiResponse(
    {
      status: NO_CONTENT,
      type: types.text
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.ExtensionWrite]))
  async uninstall(@Param("id") id: string): Promise<void>
  {
    return await this.extensionService.uninstall(id);
  }

  @Put(":id/pauseOrResume")
  @ApiOperation(
    {
      summary: "Pauses or resumes an extension",
      description: "Either stops and marks it as paused the extension or starts it."
    }
  )
  @ApiParam({ name: "id", description: "The extension identifier", schema: extensionIdSchema, required: true })
  @ApiQuery({ name: "isPause", description: "Whether the extension should be paused", type: Boolean })
  @ApiProduces(types.text)
  @Header(headers.response.CONTENT_TYPE, types.txt)
  @HttpCode(NO_CONTENT)
  @ApiResponse(
    {
      status: NO_CONTENT,
      type: types.text
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.ExtensionManage]))
  async pauseOrResume(@Param("id") id: string, @Query("isPause") isPause: boolean): Promise<void>
  {
    return await this.extensionService.pauseOrResume(id, isPause);
  }

  @Get(":id/getSettings")
  @ApiOperation(
    {
      summary: "Gets an extension settings",
      description: "Returns the settings of an extension."
    }
  )
  @ApiParam({ name: "id", description: "The extension identifier", schema: extensionIdSchema, required: true })
  @ApiResponse(
    {
      status: OK,
      description: "The extension settings",
      type: ExtensionSettings
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.ExtensionSettingsRead]))
  async getSettings(@RequestPolicyContext() policyContext: PolicyContext, @Param("id") id: string): Promise<ExtensionSettings>
  {
    if (policyContext.extensionId !== undefined && policyContext.extensionId !== id)
    {
      throw new ForbiddenException(mismatchingAPISecretAndExtensionIdentifiers);
    }
    return await this.extensionService.getSettings(id);
  }

  @Put(":id/setSettings")
  @ApiOperation(
    {
      summary: "Sets an extension settings",
      description: "Defines the settings of an extension."
    }
  )
  @ApiParam({ name: "id", description: "The extension identifier", schema: extensionIdSchema, required: true })
  @ApiProduces(types.text)
  @Header(headers.response.CONTENT_TYPE, types.txt)
  @HttpCode(NO_CONTENT)
  @ApiBody({ description: "The extension settings", type: ExtensionSettings, required: true })
  @ApiResponse(
    {
      status: NO_CONTENT,
      type: types.text
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.ExtensionSettingsWrite]))
  async setSettings(@RequestPolicyContext() policyContext: PolicyContext, @Param("id") id: string, @Body() settings: ExtensionSettings): Promise<void>
  {
    if (policyContext.extensionId !== undefined && policyContext.extensionId !== id)
    {
      throw new ForbiddenException(mismatchingAPISecretAndExtensionIdentifiers);
    }
    return await this.extensionService.setSettings(id, settings);
  }

  @Put(":id/synchronize")
  @ApiOperation(
    {
      summary: "Synchronizes the images via an extension",
      description: "Iterates over all images available in the repositories and asks the extension to operate its work if the image is not indexed by it."
    }
  )
  @ApiParam({ name: "id", description: "The extension identifier", schema: extensionIdSchema, required: true })
  @ApiProduces(types.text)
  @Header(headers.response.CONTENT_TYPE, types.txt)
  @HttpCode(NO_CONTENT)
  @ApiResponse(
    {
      status: NO_CONTENT,
      type: types.text
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.ExtensionManage]))
  async synchronize(@Param("id") id: string): Promise<void>
  {
    return await this.extensionService.synchronize(id);
  }

  @Put(":id/runProcessCommand")
  @ApiOperation(
    {
      summary: "Runs a command exposed by an extension, on the process",
      description: "Runs the command defined for the process, by triggering the relevant event to the extension."
    }
  )
  @ApiParam({ name: "id", description: "The extension identifier", schema: extensionIdSchema, required: true })
  @ApiQuery({ name: "commandId", description: "The identifier of the command", type: String, required: true })
  @ApiBody({ description: "The command parameters", type: Object, required: false })
  @ApiProduces(types.text)
  @Header(headers.response.CONTENT_TYPE, types.txt)
  @HttpCode(NO_CONTENT)
  @ApiResponse(
    {
      status: NO_CONTENT,
      type: types.text
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.ExtensionRun]))
  async runProcessCommand(@RequestPolicyContext() policyContext: PolicyContext, @Param("id") id: string, @Query("commandId") commandId: string, @Body() parameters: Record<string, any> | undefined): Promise<void>
  {
    if (policyContext.extensionId !== undefined && policyContext.extensionId !== id)
    {
      throw new ForbiddenException(mismatchingAPISecretAndExtensionIdentifiers);
    }
    return await this.extensionService.runCommand(CommandEntity.Process, id, commandId, parameters, undefined);
  }

  @Put(":id/runImageCommand")
  @ApiOperation(
    {
      summary: "Runs a command exposed by an extension, on images",
      description: "Runs the command defined for images, by triggering the relevant event to the extension."
    }
  )
  @ApiParam({ name: "id", description: "The extension identifier", schema: extensionIdSchema, required: true })
  @ApiQuery({ name: "commandId", description: "The identifier of the command", type: String, required: true })
  @ApiBody({ description: "The command parameters", type: Object, required: false })
  @ApiQuery({
    name: "imageIds",
    description: "The identifiers of the images the command should be run against",
    required: true,
    schema: imageIdSchema,
    isArray: true
  })
  @ApiProduces(types.text)
  @Header(headers.response.CONTENT_TYPE, types.txt)
  @HttpCode(NO_CONTENT)
  @ApiResponse(
    {
      status: NO_CONTENT,
      type: types.text
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.ExtensionRun]))
  async runImageCommand(@RequestPolicyContext() policyContext: PolicyContext, @Param("id") id: string, @Query("commandId") commandId: string, @Body() parameters: Record<string, any> | undefined, @Query("imageIds", new ArrayValidationPipe<String>()) imageIds: string[]): Promise<void>
  {
    if (policyContext.extensionId !== undefined && policyContext.extensionId !== id)
    {
      throw new ForbiddenException(mismatchingAPISecretAndExtensionIdentifiers);
    }
    return await this.extensionService.runCommand(CommandEntity.Images, id, commandId, parameters, imageIds);
  }

  @Put(":id/installChromeExtension")
  @ApiOperation(
    {
      summary: "Installs a Chrome extension",
      description: "It will only work provided the server is hosted by an Electron application."
    }
  )
  @ApiParam({ name: "id", description: "The extension identifier", schema: extensionIdSchema, required: true })
  @ApiQuery({
    name: "chromeExtensionName",
    description: "The name of the Chrome extension, which should match with the content of its manifest file provided in the payload",
    minLength: 1,
    required: true
  })
  @ApiConsumes(types.zip, applicationGzipMimeType, applicationXGzipMimeType)
  @ApiBody({
    description: "The Chrome extension compressed tarball or zip archive",
    schema: binarySchemaWithMaxLength(Extension.CHROME_EXTENSION_MAXIMUM_BINARY_WEIGHT_IN_BYTES),
    required: true
  })
  @ApiProduces(types.text)
  @Header(headers.response.CONTENT_TYPE, types.txt)
  @ApiResponse(
    {
      status: NO_CONTENT,
      type: types.text
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.ExtensionChromeExtensionInstall]))
  async installChromeExtension(@RequestPolicyContext() policyContext: PolicyContext, @Param("id") id: string, @Query("chromeExtensionName") chromeExtensionName: string, @Body() archive: Buffer): Promise<void>
  {
    if (policyContext.extensionId !== undefined && policyContext.extensionId !== id)
    {
      throw new ForbiddenException(mismatchingAPISecretAndExtensionIdentifiers);
    }
    return await this.extensionService.installChromeExtension(id, chromeExtensionName, archive);
  }

  @Put("generate")
  @ApiOperation({
    summary: "Generates an extension",
    description: "Scaffolds an extension respecting a set of specifications."
  })
  @ApiQuery({
    name: "withPublicSdk",
    description: "Should the extension be dependent on the public extension SDK or the internal private one",
    required: true
  })
  @ApiBody({ description: "The extension specifications", type: ExtensionGenerationOptions, required: true })
  @ApiProduces(types.zip)
  @Header(headers.response.CONTENT_TYPE, types.zip)
  @ApiResponse({
    status: OK,
    description: "A zip file of the generated extension",
    content: { [types.zip]: { schema: binarySchemaWithMaxLength(Extension.ARCHIVE_MAXIMUM_BINARY_WEIGHT_IN_BYTES) } }
  })
  @CheckPolicies(withOneOfPolicies([ApiScope.ExtensionRead]))
  async generate(@Query("withPublicSdk") withPublicSdk: boolean, @Body() options: ExtensionGenerationOptions): Promise<StreamableFile>
  {
    return await this.extensionService.generate(options, withPublicSdk);
  }

  @Put("build")
  @ApiOperation({
    summary: "Builds an extension",
    description: "Compiles and packages an extension from its source code."
  })
  @ApiConsumes(types.zip)
  @ApiBody({
    description: "The extension archive",
    schema: binarySchemaWithMaxLength(Extension.ARCHIVE_MAXIMUM_BINARY_WEIGHT_IN_BYTES),
    required: true
  })
  @ApiProduces(types.zip, applicationXGzipMimeType)
  @Header(headers.response.CONTENT_TYPE, types.zip)
  @ApiResponse({
    status: OK,
    description: "A zip file of the built extension",
    content: {
      [types.zip]: { schema: binarySchemaWithMaxLength(Extension.ARCHIVE_MAXIMUM_BINARY_WEIGHT_IN_BYTES) },
      [applicationXGzipMimeType]: { schema: binarySchemaWithMaxLength(Extension.ARCHIVE_MAXIMUM_BINARY_WEIGHT_IN_BYTES) }
    }
  })
  @CheckPolicies(withOneOfPolicies([ApiScope.ExtensionRead]))
  async build(@Body() archive: Buffer): Promise<StreamableFile>
  {
    return await this.extensionService.build(archive);
  }

}

const repositoryResourceName: string = "repository";

/**
 * Manages the image repositories.
 */
@ApiTags(repositoryResourceName)
@Controller(computeControllerPath(repositoryResourceName))
@ApiConsumes(types.json)
@ApiProduces(types.json)
export class RepositoryController
{

  constructor(private readonly repositoryService: RepositoryService, private readonly imageService: ImageService)
  {
    logger.debug("Instantiating a RepositoryController");
  }

  @Get("list")
  @ApiOperation(
    {
      summary: "Lists repositories",
      description: "Lists all the declared repositories."
    }
  )
  @ApiResponse(
    {
      status: OK,
      description: "The list of all registered repositories",
      type: Repository,
      isArray: true
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.RepositoryRead]))
  async list(): Promise<RepositoryList>
  {
    return await this.repositoryService.list();
  }

  @Get(":id/get")
  @ApiOperation(
    {
      summary: "Gets a repository",
      description: "Returns a single repository."
    }
  )
  @ApiParam({ name: "id", description: "The repository identifier", schema: extensionIdSchema, required: true })
  @ApiResponse(
    {
      status: OK,
      description: "The repository",
      type: Repository
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.RepositoryRead]))
  async get(@Param("id") id: string): Promise<Repository>
  {
    return await this.repositoryService.get(id);
  }

  @Post("create")
  @ApiOperation(
    {
      summary: "Creates a repository",
      description: "Declares a new repository."
    }
  )
  @ApiQuery({ name: "type", description: "The repository type", enum: RepositoryLocationType, required: true })
  @ApiQuery({ name: "url", description: "The repository URL", type: String, required: true })
  @ApiQuery({ name: "technicalId", description: "The technical identifier", type: String, required: false })
  @ApiQuery({ name: "name", description: "The repository name", type: String, required: true })
  @ApiQuery({ name: "comment", description: "The repository comment", type: String, required: false })
  @ApiQuery({
    name: "watch",
    description: "Whether the repository should be watched immediately ; when not defined, this parameter has the implicit 'false' value",
    type: Boolean,
    required: false
  })
  @ApiResponse(
    {
      status: CREATED,
      description: "The created repository",
      type: Repository
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.RepositoryWrite]))
  async create(@Query("type") type: RepositoryLocationType, @Query("url") url: string, @Query("technicalId") technicalId: string | undefined, @Query("name") name: string, @Query("comment") comment?: string, @Query("watch", new ParseBoolPipe({ optional: true })) watch?: boolean): Promise<Repository>
  {
    return await this.repositoryService.create(type, url, technicalId, name, comment, watch);
  }

  @Put("ensure")
  @ApiOperation(
    {
      summary: "Ensures a repository exists",
      description: "Ensures that a repository with type 'file' and with the provided identifier exists, and if not, creates it."
    }
  )
  @ApiQuery({ name: "technicalId", description: "The repository technical identifier", type: String, required: true })
  @ApiQuery({ name: "name", description: "The repository name", type: String, required: true })
  @ApiQuery({ name: "comment", description: "The repository comment", type: String, required: false })
  @ApiQuery({
    name: "watch",
    description: "Whether the repository should be watched immediately ; when not defined, this parameter has the implicit 'false' value",
    type: Boolean,
    required: false
  })
  @ApiResponse(
    {
      status: OK,
      description: "The already existing or newly created repository",
      type: Repository
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.RepositoryEnsure]))
  async ensure(@Query("technicalId") technicalId: string, @Query("name") name: string, @Query("comment") comment?: string, @Query("watch", new ParseBoolPipe({ optional: true })) watch?: boolean): Promise<Repository>
  {
    return await this.repositoryService.ensure(technicalId, name, comment, watch);
  }

  @Put("startOrStop")
  @ApiOperation(
    {
      summary: "Starts or stop the repositories",
      description: "Starts all the repositories, resume synchronization if necessary and starts watching them, or stops them."
    }
  )
  @ApiQuery({
    name: "isStart",
    description: "Whether the repositories should be started or stopped",
    type: Boolean
  })
  @ApiProduces(types.text)
  @Header(headers.response.CONTENT_TYPE, types.txt)
  @HttpCode(NO_CONTENT)
  @ApiResponse(
    {
      status: NO_CONTENT,
      type: types.text
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.RepositoryManage]))
  async startOrStop(@Query("isStart", ParseBoolPipe) isStart: boolean): Promise<void>
  {
    return await this.repositoryService.startOrStopAll(isStart);
  }

  @Put(":id/synchronize")
  @ApiOperation(
    {
      summary: "Synchronizes a repository",
      description: "Synchronizes a repository against its back-end."
    }
  )
  @ApiParam({ name: "id", description: "The repository identifier", schema: repositoryIdSchema, required: true })
  @ApiProduces(types.text)
  @Header(headers.response.CONTENT_TYPE, types.txt)
  @HttpCode(NO_CONTENT)
  @ApiResponse(
    {
      status: NO_CONTENT,
      type: types.text
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.RepositoryManage]))
  async synchronize(@Param("id") id: string): Promise<void>
  {
    return await this.repositoryService.synchronize(id);
  }

  @Put(":id/watch")
  @ApiOperation(
    {
      summary: "Starts or stops watching a repository",
      description: "Starts or stops listening to the repository back-end images changes."
    }
  )
  @ApiParam({ name: "id", description: "The repository identifier", schema: repositoryIdSchema, required: true })
  @ApiQuery({
    name: "isStart",
    description: "Whether the repository should start or stop watching",
    type: Boolean
  })
  @ApiProduces(types.text)
  @Header(headers.response.CONTENT_TYPE, types.txt)
  @HttpCode(NO_CONTENT)
  @ApiResponse(
    {
      status: NO_CONTENT,
      type: types.text
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.RepositoryManage]))
  async watch(@Param("id") id: string, @Query("isStart", ParseBoolPipe) isStart: boolean): Promise<void>
  {
    return await this.repositoryService.watch(id, isStart, true);
  }

  @Delete(":id/delete")
  @ApiOperation(
    {
      summary: "Deletes a repository",
      description: "Deletes a repository along with all the images attached to it."
    }
  )
  @ApiParam({ name: "id", description: "The repository identifier", schema: repositoryIdSchema, required: true })
  @ApiProduces(types.text)
  @Header(headers.response.CONTENT_TYPE, types.txt)
  @HttpCode(NO_CONTENT)
  @ApiResponse(
    {
      status: NO_CONTENT,
      type: types.text
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.RepositoryWrite]))
  async delete(@Param("id") id: string): Promise<void>
  {
    const repository = await this.repositoryService.get(id);
    return await this.repositoryService.delete(repository);
  }

  @Get("activities")
  @ApiOperation(
    {
      summary: "Indicates the repositories activities",
      description: "Returns all the declared repositories activities."
    }
  )
  @ApiResponse(
    {
      status: OK,
      description: "The list of all registered repositories activities",
      type: RepositoryActivity,
      isArray: true
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.ExtensionRead]))
  async activities(): Promise<RepositoryActivities>
  {
    return await this.repositoryService.activities();
  }

  @Get("tags")
  @ApiOperation(
    {
      summary: "Gets all the tags",
      description: "Returns the tags of all images extensions."
    }
  )
  @ApiResponse(
    {
      status: OK,
      description: "The tags for all extensions",
      type: ExtensionImageTag,
      isArray: true
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.RepositoryRead]))
  async getTags(): Promise<AllExtensionImageTags>
  {
    return await this.repositoryService.getTags();
  }

  @Get(":id/searchImages")
  @ApiOperation(
    {
      summary: "Searches for images within the repository",
      description: "Searches images within the repository with the provided criteria."
    }
  )
  @ApiParam({ name: "id", description: "The repository identifier", schema: repositoryIdSchema, required: true })
  @DeepObjectApiQuery(SearchParameters)
  @ApiResponse(
    {
      status: OK,
      description: "The list of images corresponding to the criteria",
      type: ImageSummaryList
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.ExtensionRead]))
  async searchImages(@Param("id") id: string, @Query(DeepObjectPipeTransform) parameters: SearchParameters): Promise<ImageSummaryList>
  {
    const repository = await this.repositoryService.get(id);
    return await this.imageService.search([repository.id], parameters.criteria, parameters.sorting, parameters.range);
  }

  @Get("getImageByUrl")
  @ApiOperation(
    {
      summary: "Gets an image from its URL",
      description: "Returns the details about an image."
    }
  )
  @ApiQuery({
    name: "url", description: "The image URL",
    schema: imageUrlSchema,
    required: true
  })
  @ApiResponse(
    {
      status: OK,
      description: "The image details",
      type: Image
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.ExtensionRead]))
  async getImageByUrl(@Query("url") url: string): Promise<Image>
  {
    return await this.imageService.getImageByUrl(url);
  }

  @Put(":id/renameImage")
  @ApiOperation(
    {
      summary: "Renames an image",
      description: "Renames the file of an image in a repository."
    }
  )
  @ApiParam({ name: "id", description: "The repository identifier", schema: imageIdSchema, required: true })
  @ApiQuery({ name: "imageId", description: "The image identifier", schema: imageIdSchema, required: true })
  @ApiQuery({
    name: "nameWithoutExtension",
    description: "The new file name without the file extension",
    type: String,
    pattern: "^[^<>:,?\"*|/\\]+$",
    required: true,
    example: "nameWithoutExtension"
  })
  @ApiQuery({
    name: "relativeDirectoryPath",
    description: "The relative directory path within the repository that will host the image",
    type: String,
    pattern: "^[^<>:,?\"*|]+$",
    required: false,
    example: "relative/path"
  })
  @ApiResponse(
    {
      status: OK,
      description: "The image details",
      type: Image
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.RepositoryWrite]))
  async renameImage(@Param("id") id: string, @Query("imageId") imageId: string, @Query("nameWithoutExtension") nameWithoutExtension: string, @Query("relativeDirectoryPath") relativeDirectoryPath: string | undefined): Promise<Image>
  {
    return await this.repositoryService.renameImage(id, imageId, nameWithoutExtension, relativeDirectoryPath);
  }

  @Post(":id/storeImage")
  @ApiOperation(
    {
      summary: "Creates an image in the repository",
      description: "Declares an image in the repository and returns it."
    }
  )
  @ApiParam({ name: "id", description: "The repository identifier", schema: repositoryIdSchema, required: true })
  @ApiQuery({
    name: "nameWithoutExtension",
    description: "The image file name, without its extension",
    type: String,
    pattern: "^[^<>:,?\"*|/\\]+$",
    required: false,
    example: "nameWithoutExtension"
  })
  @ApiQuery({
    name: "relativeDirectoryPath",
    description: "The relative directory path within the repository that will host the image",
    type: String,
    pattern: "^[^<>:,?\"*|]+$",
    required: false,
    example: "relative/path"
  })
  @ApiExtraModels(ApplicationMetadata)
  @ApiQuery({
    name: "applicationMetadata",
    description: "The JSON string representing the application metadata",
    type: String,
    required: false
    // TODO: figure out why the JSON cannot be used properly by the generated OpenAPI client library along with the StringifiedJsonPipeTransform
    // explode: true,
    // style: "deepObject",
    // content: { [types.json]: { schema: { $ref: getSchemaPath(ApplicationMetadata) } } }
  })
  @ApiQuery({
    name: "parentId",
    description: "The identifier of the image parent image",
    schema: imageIdSchema,
    required: false
  })
  @ApiQuery({
    name: "sourceUrl",
    description: "The URL of the image source",
    schema: {
      type: "string",
      format: "uri",
      minimum: 8,
      maxLength: FieldLengths.url,
      example: "https://inovexus.com/wp-content/uploads/2024/09/Inovexus_Aive.png"
    },
    required: false
  })
  @ApiConsumes(...imageSupportedMimeTypes)
  @ApiBody({
    description: "The image file",
    schema: binarySchemaWithMaxLength(Image.IMAGE_MAXIMUM_BINARY_WEIGHT_IN_BYTES),
    required: true
  })
  @ApiResponse(
    {
      status: CREATED,
      description: "The image details",
      type: Image
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.RepositoryStoreImage]))
  @Throttle({ default: { ttl: 1_000, limit: 10 } })
  async storeImage(@Param("id") id: string, @Query("nameWithoutExtension") nameWithoutExtension: string | undefined, @Query("relativeDirectoryPath") relativeDirectoryPath: string | undefined, @Query("applicationMetadata"/*, StringifiedJsonPipeTransform<ApplicationMetadata>*/) applicationMetadata: /*ApplicationMetadata*/string | undefined, @Query("parentId") parentId: string | undefined, @Query("sourceUrl") sourceUrl: string | undefined, @Body() buffer: Buffer): Promise<Image>
  {
    return await this.repositoryService.storeImage(id, buffer, nameWithoutExtension, relativeDirectoryPath, applicationMetadata, parentId, sourceUrl);
  }

}

const imageResourceName: string = "image";

/**
 * Manages the images.
 */
@ApiTags(imageResourceName)
@Controller(computeControllerPath(imageResourceName))
@ApiConsumes(types.json)
@ApiProduces(types.json)
export class ImageController
{

  constructor(private readonly repositoryService: RepositoryService, private readonly imageService: ImageService)
  {
    logger.debug("Instantiating an ImageController");
  }

  @Get("search")
  @ApiOperation(
    {
      summary: "Searches images",
      description: "Searches images, given criteria."
    }
  )
  @DeepObjectApiQuery(ImageSearchParameters)
  @ApiResponse(
    {
      status: OK,
      description: "The images matching the criteria",
      type: ImageSummaryList
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.ImageRead]))
  async search(@Query(DeepObjectPipeTransform) parameters: ImageSearchParameters): Promise<ImageSummaryList>
  {
    const repositories = parameters?.ids === undefined ? undefined : await this.repositoryService.list(parameters?.ids);
    return await this.imageService.search(repositories === undefined ? undefined : repositories.map((repository) =>
    {
      return repository.id;
    }), parameters?.criteria, parameters?.sorting, parameters?.range);
  }

  @Get(":id/get")
  @ApiOperation(
    {
      summary: "Gets an image",
      description: "Returns the details about an image."
    }
  )
  @ApiParam({ name: "id", description: "The image identifier", schema: imageIdSchema, required: true })
  @ApiResponse(
    {
      status: OK,
      description: "The image details",
      type: Image
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.ImageRead]))
  async get(@Param("id") id: string): Promise<Image>
  {
    return await this.imageService.get(id);
  }

  @Put(":id/synchronize")
  @ApiOperation(
    {
      summary: "Synchronizes an image",
      description: "Runs all extensions capabilities against the image."
    }
  )
  @ApiParam({ name: "id", description: "The image identifier", schema: imageIdSchema, required: true })
  @ApiResponse(
    {
      status: OK,
      description: "The image details",
      type: Image
    }
  )
  @CheckPolicies(withAllPolicies([ApiScope.ImageTagWrite, ApiScope.ImageFeatureWrite, ApiScope.ImageEmbeddingsWrite]))
  async synchronize(@Param("id") id: string): Promise<Image>
  {
    return await this.imageService.synchronize(id);
  }

  @Put(":id/modify")
  @ApiOperation(
    {
      summary: "Modifies an image",
      description: "Updates the content of an image via a file."
    }
  )
  @ApiParam({ name: "id", description: "The image identifier", schema: imageIdSchema, required: true })
  @ApiConsumes(...imageSupportedMimeTypes)
  @ApiBody({
    description: "The image file",
    schema: binarySchemaWithMaxLength(Image.IMAGE_MAXIMUM_BINARY_WEIGHT_IN_BYTES),
    required: true
  })
  @ApiResponse(
    {
      status: OK,
      description: "The image details",
      type: Image
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.ImageWrite]))
  async modify(@Param("id") id: string, @Body() buffer: Buffer): Promise<Image>
  {
    return await this.imageService.modify(id, buffer);
  }

  @Delete(":id/delete")
  @ApiOperation(
    {
      summary: "Deletes an image",
      description: "Deletes the image from the back-end and from the databases."
    }
  )
  @ApiParam({ name: "id", description: "The image identifier", schema: imageIdSchema, required: true })
  @HttpCode(NO_CONTENT)
  @ApiResponse(
    {
      status: NO_CONTENT,
      type: types.text
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.ImageDelete]))
  async delete(@Param("id") id: string): Promise<void>
  {
    await this.imageService.delete(id);
  }

  @Get(":id/download")
  @ApiOperation(
    {
      summary: "Downloads an image",
      description: "Returns the binary form of an image."
    }
  )
  @ApiParam({ name: "id", description: "The image identifier", schema: imageIdSchema, required: true })
  @ApiQuery({
    name: "format",
    description: "The image format",
    enum: ImageFormat,
    enumName: "ImageFormat",
    required: false
  })
  @ApiQuery({
    name: "width",
    description: "The image maximum width ; if not defined, the original width is used",
    type: Number,
    format: "int32",
    required: false
  })
  @ApiQuery({
    name: "height",
    description: "The image maximum height ; if not defined, the original height is used",
    type: Number,
    format: "int32",
    required: false
  })
  @ApiQuery({
    name: "resizeRender",
    description: "The way the image should be resized",
    enum: ImageResizeRender,
    enumName: "ImageResizeRender",
    required: false
  })
  @ApiQuery({
    name: "stripMetadata",
    description: "Whether the image metadata should be stripped",
    type: Boolean,
    required: false
  })
  @ApiResponse(
    {
      status: OK,
      description: "The image file",
      content: imageContent
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.ImageRead]))
  @ApiProduces(...imageSupportedMimeTypes)
  async download(@Param("id") id: string, @Query("format") format?: ImageFormat, @Query("width", new ParseIntPipe({ optional: true })) width?: number, @Query("height", new ParseIntPipe({ optional: true })) height?: number, @Query("resizeRender") resizeRender?: ImageResizeRender, @Query("stripMetadata", new ParseBoolPipe({ optional: true })) stripMetadata?: boolean): Promise<StreamableFile>
  {
    return await this.imageService.download(id, format, width, height, resizeRender, stripMetadata);
  }

  @Get(":id/mediaUrl")
  @ApiOperation(
    {
      summary: "Gets an URL of the image",
      description: "Returns the URL of the image, given for some given dimensions and format, which may used to display it."
    }
  )
  @ApiParam({ name: "id", description: "The image identifier", schema: imageIdSchema, required: true })
  @ApiQuery({
    name: "format",
    description: "The image format",
    enum: ImageFormat,
    enumName: "ImageFormat",
    required: false
  })
  @ApiQuery({
    name: "width",
    description: "The image maximum width ; if not defined, the original width is used",
    type: Number,
    format: "int32",
    required: false
  })
  @ApiQuery({
    name: "height",
    description: "The image maximum height ; if not defined, the original height is used",
    type: Number,
    format: "int32",
    required: false
  })
  @ApiQuery({
    name: "resizeRender",
    description: "The way the image should be resized",
    enum: ImageResizeRender,
    enumName: "ImageResizeRender",
    required: false
  })
  @ApiResponse(
    {
      status: OK,
      description: "The image media URL",
      type: ImageMediaUrl
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.ImageRead]))
  async mediaUrl(@Param("id") id: string, @Query("format") format?: ImageFormat, @Query("width", new ParseIntPipe({ optional: true })) width?: number, @Query("height", new ParseIntPipe({ optional: true })) height?: number, @Query("resizeRender") resizeRender?: ImageResizeRender): Promise<ImageMediaUrl>
  {
    return await this.imageService.mediaUrl(id, format, width, height, resizeRender);
  }

  @Get(":id/metadata")
  @ApiOperation(
    {
      summary: "Gets the metadata of an image",
      description: "Returns all the metadata of an image available in its representation file."
    }
  )
  @ApiParam({ name: "id", description: "The image identifier", schema: imageIdSchema, required: true })
  @ApiResponse(
    {
      status: OK,
      description: "The image metadata",
      type: ImageMetadata
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.ImageRead]))
  async getMetadata(@Param("id") id: string): Promise<ImageMetadata>
  {
    return await this.imageService.getMetadata(id);
  }

  @Get(":id/getAllFeatures")
  @ApiOperation(
    {
      summary: "Gets all the features of an image",
      description: "Returns the features of an image for all extensions."
    }
  )
  @ApiParam({ name: "id", description: "The image identifier", schema: imageIdSchema, required: true })
  @ApiResponse(
    {
      status: OK,
      description: "The image features for all extensions",
      type: ExtensionImageFeature,
      isArray: true
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.ImageRead]))
  async getAllFeatures(@Param("id") id: string): Promise<AllImageFeatures>
  {
    return await this.imageService.getAllFeatures(id);
  }

  @Put(":id/setFeatures")
  @ApiOperation(
    {
      summary: "Sets the features of an image",
      description: "Stores the provided features of an image for a given extension."
    }
  )
  @ApiParam({ name: "id", description: "The image identifier", schema: imageIdSchema, required: true })
  @ApiQuery({
    name: "extensionId",
    description: "The extension identifier",
    schema: extensionIdSchema,
    required: true
  })
  @ApiBody({
    description: "The image features",
    schema:
      {
        type: "array",
        items: { $ref: getSchemaPath(ImageFeature) },
        minItems: 0,
        maxItems: ExtensionImageTag.PER_EXTENSION_FEATURES_MAXIMUM
      },
    required: true
  })
  @HttpCode(NO_CONTENT)
  @ApiResponse(
    {
      status: NO_CONTENT,
      type: types.text
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.ImageFeatureWrite]))
  // The usage of the "ParseArrayPipe" object is necessary for enabling the validation and discussed at https://stackoverflow.com/a/73468385/808618
  async setFeatures(@RequestPolicyContext() policyContext: PolicyContext, @Param("id") id: string, @Query("extensionId") extensionId: string, @Body(new ParseArrayPipe({
    items: ImageFeature, exceptionFactory
  })) features: ImageFeature[]): Promise<void>
  {
    if (policyContext.extensionId !== undefined && policyContext.extensionId !== extensionId)
    {
      throw new ForbiddenException(mismatchingAPISecretAndExtensionIdentifiers);
    }
    return await this.imageService.setFeatures(id, extensionId, features);
  }

  @Get(":id/getAllTags")
  @ApiOperation(
    {
      summary: "Gets all the tags of an image",
      description: "Returns the tags of an image for all extensions."
    }
  )
  @ApiParam({ name: "id", description: "The image identifier", schema: imageIdSchema, required: true })
  @ApiResponse(
    {
      status: OK,
      description: "The image tags for all extensions",
      type: ExtensionImageTag,
      isArray: true
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.ImageRead]))
  async getAllTags(@Param("id") id: string): Promise<AllExtensionImageTags>
  {
    return await this.imageService.getAllTags(id);
  }

  @Put(":id/setTags")
  @ApiOperation(
    {
      summary: "Sets the tags of an image if necessary",
      description: "Sets the tags of an image for a given extension."
    }
  )
  @ApiParam({
    name: "id",
    description: "The image identifier",
    schema: imageIdSchema,
    required: true
  })
  @ApiQuery({
    name: "extensionId",
    description: "The extension identifier",
    schema: extensionIdSchema,
    required: true
  })
  @ApiBody({
    description: "The image tags",
    schema:
      {
        type: "array",
        items: { type: "string", pattern: alphaNumericPlusPattern, minLength: 1, maxLength: FieldLengths.technical },
        minItems: 0,
        maxItems: ExtensionImageTag.PER_EXTENSION_TAGS_MAXIMUM
      },
    required: true
  })
  @HttpCode(NO_CONTENT)
  @ApiResponse(
    {
      status: NO_CONTENT,
      type: types.text
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.ImageTagWrite]))
  async setTags(@RequestPolicyContext() policyContext: PolicyContext, @Param("id") id: string, @Query("extensionId") extensionId: string, @Body() tags: ImageTag[]): Promise<void>
  {
    if (policyContext.extensionId !== undefined && policyContext.extensionId !== extensionId)
    {
      throw new ForbiddenException(mismatchingAPISecretAndExtensionIdentifiers);
    }
    return await this.imageService.setTags(id, extensionId, tags, false);
  }

  @Put(":id/ensureTags")
  @ApiOperation(
    {
      summary: "Ensures that the tags are set on an image",
      description: "Ensures that some tags are set on an image for a given extension."
    }
  )
  @ApiParam({ name: "id", description: "The image identifier", schema: imageIdSchema, required: true })
  @ApiQuery({
    name: "extensionId",
    description: "The extension identifier",
    schema: extensionIdSchema,
    required: true
  })
  @ApiBody({
    description: "The image tags",
    schema:
      {
        type: "array",
        items: { type: "string", pattern: alphaNumericPlusPattern, minLength: 1, maxLength: FieldLengths.technical },
        minItems: 1,
        maxItems: ExtensionImageTag.PER_EXTENSION_TAGS_MAXIMUM
      },
    required: true
  })
  @HttpCode(NO_CONTENT)
  @ApiResponse(
    {
      status: NO_CONTENT,
      type: types.text
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.ImageTagWrite]))
  async ensureTags(@RequestPolicyContext() policyContext: PolicyContext, @Param("id") id: string, @Query("extensionId") extensionId: string, @Body() tags: ImageTag[]): Promise<void>
  {
    if (policyContext.extensionId !== undefined && policyContext.extensionId !== extensionId)
    {
      throw new ForbiddenException(mismatchingAPISecretAndExtensionIdentifiers);
    }
    return await this.imageService.setTags(id, extensionId, tags, true);
  }

  @Get(":id/getAllEmbeddings")
  @ApiOperation(
    {
      summary: "Gets all the embeddings of an image",
      description: "Returns the computed embeddings of an image for all extensions."
    }
  )
  @ApiParam({ name: "id", description: "The image identifier", schema: imageIdSchema, required: true })
  @ApiResponse(
    {
      status: OK,
      description: "The image embeddings related to all extensions",
      type: ExtensionImageEmbeddings,
      isArray: true
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.ImageRead]))
  async getAllEmbeddings(@Param("id") id: string): Promise<AllImageEmbeddings>
  {
    return await this.imageService.getAllEmbeddings(id);
  }

  @Get(":id/getEmbeddings")
  @ApiOperation(
    {
      summary: "Gets the embeddings of an image",
      description: "Returns the computed embeddings of an image for a given extension."
    }
  )
  @ApiParam({
    name: "id",
    description: "The image identifier",
    schema: imageIdSchema,
    required: true
  })
  @ApiQuery({
    name: "extensionId",
    description: "The extension identifier",
    schema: extensionIdSchema,
    required: true
  })
  @ApiResponse(
    {
      status: OK,
      description: "The image embeddings related to the extension",
      type: ImageEmbeddings
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.ImageRead]))
  async getEmbeddings(@Param("id") id: string, @Query("extensionId") extensionId: string): Promise<ImageEmbeddings>
  {
    return await this.imageService.getEmbeddings(id, extensionId);
  }

  @Put(":id/setEmbeddings")
  @ApiOperation(
    {
      summary: "Sets the embeddings of an image",
      description: "Sets the computed embeddings of an image for a given extension."
    }
  )
  @ApiParam({
    name: "id",
    description: "The image identifier",
    schema: imageIdSchema,
    required: true
  })
  @ApiQuery({
    name: "extensionId",
    description: "The extension identifier",
    schema: extensionIdSchema,
    required: true
  })
  @ApiBody({ description: "The image embeddings", type: ImageEmbeddings, required: true })
  @HttpCode(NO_CONTENT)
  @ApiResponse(
    {
      status: NO_CONTENT,
      type: types.text
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.ImageEmbeddingsWrite]))
  @Throttle({ default: { ttl: 1_000, limit: 10 } })
  async setEmbeddings(@RequestPolicyContext() policyContext: PolicyContext, @Param("id") id: string, @Query("extensionId") extensionId: string, @Body() embeddings: ImageEmbeddings): Promise<void>
  {
    if (policyContext.extensionId !== undefined && policyContext.extensionId !== extensionId)
    {
      throw new ForbiddenException(mismatchingAPISecretAndExtensionIdentifiers);
    }
    return await this.imageService.setEmbeddings(id, extensionId, embeddings);
  }

  @Get(":id/closestImages")
  @ApiOperation(
    {
      summary: "Gets the closest images to the image following the embeddings of an extension",
      description: "Returns the closest images for a given an image, following the embeddings of a given extension."
    }
  )
  @ApiParam({ name: "id", description: "The image identifier", schema: imageIdSchema, required: true })
  @ApiQuery({
    name: "extensionId",
    description: "The extension identifier",
    schema: extensionIdSchema,
    required: true
  })
  @ApiQuery({
    name: "count",
    description: "The number of images to return",
    type: Number,
    format: "int64",
    required: true,
    example: 3
  })
  @ApiResponse(
    {
      status: OK,
      description: "The closest image summaries, sorting by descending proximity",
      type: ImageDistance,
      isArray: true
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.ImageRead]))
  async closestImages(@Param("id") id: string, @Query("extensionId") extensionId: string, @Query("count", ParseIntPipe) count: number): Promise<ImageDistances>
  {
    return await this.imageService.closestImages(id, extensionId, count);
  }

  @Put("closestEmbeddingsImages")
  @ApiOperation(
    {
      summary: "Gets the closest images to some embeddings attached to an extension",
      description: "Returns the closest images given some embeddings and for a given extension."
    }
  )
  @ApiQuery({
    name: "extensionId",
    description: "The extension identifier",
    schema: extensionIdSchema,
    required: true
  })
  @ApiBody({ description: "The image embeddings", type: ImageEmbeddings, required: true })
  @ApiQuery({ name: "count", description: "The number of images to return", type: Number, required: true, example: 3 })
  @ApiResponse(
    {
      status: OK,
      description: "The closest image summaries, sorting by descending proximity",
      type: ImageDistance,
      isArray: true
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.ImageRead]))
  async closestEmbeddingsImages(@Query("extensionId") extensionId: string, @Query("count", ParseIntPipe) count: number, @Body() embeddings: ImageEmbeddings): Promise<ImageDistances>
  {
    return await this.imageService.closestEmbeddingsImages(extensionId, embeddings, count);
  }

  @Get("textToImages")
  @ApiOperation(
    {
      summary: "Gets the closest images to a text following the embeddings of an extension",
      description: "Returns the closest images for a given text which will be turned into embeddings, following the embeddings of a given extension."
    }
  )
  @ApiQuery({ name: "text", description: "The text", type: String, required: true })
  @ApiQuery({
    name: "extensionId",
    description: "The extension identifier",
    schema: extensionIdSchema,
    required: true
  })
  @ApiQuery({ name: "count", description: "The number of images to return", type: Number, required: true, example: 3 })
  @ApiResponse(
    {
      status: OK,
      description: "The closest image summaries, sorting by descending proximity",
      type: ImageDistance,
      isArray: true
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.ImageRead]))
  async textToImages(@Query("text") text: string, @Query("extensionId") extensionId: string, @Query("count", ParseIntPipe) count: number): Promise<ImageDistances>
  {
    return await this.imageService.textToImages(text, extensionId, count);
  }

  @Put("format")
  @ApiOperation(
    {
      summary: "Computes the format of an image",
      description: "Analyzes the provided image, computes its format and returns it."
    }
  )
  @ApiConsumes(...imageSupportedMimeTypes)
  @ApiBody({
    description: "The image file",
    schema: binarySchemaWithMaxLength(Image.IMAGE_MAXIMUM_BINARY_WEIGHT_IN_BYTES),
    required: true
  })
  @ApiResponse(
    {
      status: OK,
      description: "The image format",
      type: ComputedImageFormat
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.ImageRead]))
  async computeFormat(@Body() buffer: Buffer): Promise<ComputedImageFormat>
  {
    return new ComputedImageFormat(await this.imageService.computeFormat(buffer));
  }

  @Put("convert")
  @ApiOperation(
    {
      summary: "Converts an image into a format",
      description: "Converts the provided image into the requested format and returns it."
    }
  )
  @ApiQuery({
    name: "format",
    description: "The image format",
    enum: ImageFormat,
    enumName: "ImageFormat",
    required: true
  })
  @ApiQuery({
    name: "quality",
    description: "The image quality, in case of a lossy format like JPEG or WEBP",
    type: Number,
    format: "int32",
    required: false,
    minimum: 1,
    maximum: 100
  })
  @ApiConsumes(...imageSupportedMimeTypes)
  @ApiBody({
    description: "The image file",
    schema: binarySchemaWithMaxLength(Image.IMAGE_MAXIMUM_BINARY_WEIGHT_IN_BYTES),
    required: true
  })
  @ApiResponse(
    {
      status: OK,
      description: "The converted image, with no metadata",
      content: imageContent
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.ImageRead]))
  @ApiProduces(...imageSupportedMimeTypes)
  async convert(@Query("format") format: ImageFormat, @Query("quality") quality: NumericRange<1, 100> | undefined = undefined, @Body() buffer: Buffer): Promise<StreamableFile>
  {
    return await this.imageService.convertInto(format, quality, buffer);
  }

}

const imageAttachmentResourceName: string = "imageAttachment";

/**
 * Manages the binary attachments to an image.
 */
@ApiTags(imageAttachmentResourceName)
@Controller(computeControllerPath(imageAttachmentResourceName))
@ApiConsumes(types.bin)
@ApiProduces(types.json)
export class ImageAttachmentController
{

  constructor(private readonly imageAttachmentService: ImageAttachmentService)
  {
  }

  @Post("create")
  @ApiOperation(
    {
      summary: "Declares an image binary attachment",
      description: "Stores a binary attachment related to an image for a given extension."
    }
  )
  @ApiQuery({
    name: "imageId",
    description: "The image identifier",
    required: true,
    schema: imageIdSchema
  })
  @ApiQuery({
    name: "extensionId",
    description: "The extension identifier",
    schema: extensionIdSchema,
    required: true
  })
  @ApiQuery({
    name: "mimeType",
    description: "The MIME type of the attachment payload",
    type: String,
    minLength: 1,
    maxLength: FieldLengths.shortTechnical,
    required: true,
    example: "image/png"
  })
  @ApiConsumes(...imageSupportedMimeTypes, types.bin)
  @ApiBody({
    description: "The attachment payload",
    schema: binarySchemaWithMaxLength(Image.ATTACHMENT_MAXIMUM_BINARY_WEIGHT_IN_BYTES),
    required: true
  })
  @ApiResponse(
    {
      status: CREATED,
      type: types.text,
      description: "The URI of the created attachment",
      schema: attachmentUriSchema
    }
  )
  @CheckPolicies(withOneOfPolicies([ApiScope.ImageAttachmentWrite]))
  async create(@RequestPolicyContext() policyContext: PolicyContext, @Query("imageId") imageId: string, @Query("extensionId") extensionId: string, @Query("mimeType") mimeType: string, @Body() payload: Buffer): Promise<string>
  {
    if (policyContext.extensionId !== undefined && policyContext.extensionId !== extensionId)
    {
      throw new ForbiddenException(mismatchingAPISecretAndExtensionIdentifiers);
    }
    return this.imageAttachmentService.create(imageId, extensionId, mimeType, payload);
  }

  @Get(":uri/download")
  @ApiOperation(
    {
      summary: "Downloads an image binary attachment",
      description: "Retrieves the payload of a binary attachment related to an image for a given extension."
    }
  )
  @ApiParam({
    name: "uri",
    description: "The attachment URI",
    required: true,
    schema: attachmentUriSchema
  })
  @ApiResponse(
    {
      status: OK,
      description: "The payload of the attachment",
      content: imageContent
    }
  )
  @ApiProduces(...imageSupportedMimeTypes, types.bin)
  @CheckPolicies(withOneOfPolicies([ApiScope.ImageRead]))
  async download(@Param("uri") uri: string): Promise<StreamableFile>
  {
    return await this.imageAttachmentService.download(uri);
  }

}

const searchResourceName: string = "search";

/**
 * Enables to search in images.
 */
@ApiTags(searchResourceName)
@Controller(computeControllerPath(searchResourceName))
@ApiConsumes(types.json)
@ApiProduces(types.json)
export class SearchController
{

  constructor()
  {
    logger.debug("Instantiating a SearchController");
  }

  // @Get("ls")
  // @ApiOperation(
  //   {
  //     summary: "Searches for images",
  //     description: "Searches images with the provided criteria."
  //   }
  // )
  // @ApiResponse(
  //   {
  //     status: OK,
  //     description: "The list of images corresponding to the criteria",
  //     type: [Image]
  //   }
  // )
  // async ls(@Query("criteria") criteria: SearchCriteria, @Query("range") range?: SearchRange): Promise<ImageSummaryList>
  // {
  //   return await this.service.ls(new RepositoryLocation(RepositoryLocationType.File, fileWithProtocol + "/Volumes/data/edouardmercier/generateAI/outputs/ComfyUI"), criteria, range);
  // }

}

