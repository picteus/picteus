import { ApiProperty, ApiSchema } from "@nestjs/swagger";

import {
  alphaNumericPlusAdditionalAuthorizedCharactersPattern,
  alphaNumericPlusAdditionalAuthorizedCharactersPlusSpacePattern,
  alphaNumericPlusPattern,
  applicationXGzipMimeType,
  attachmentUriPrefix,
  attachmentUriSchema,
  computeImageFormatsExtensions,
  Dates,
  extensionIdSchema,
  ExtensionIdType,
  FieldLengths,
  fileWithProtocol,
  fromMimeType,
  ImageFeatureFormat,
  ImageFeatureType,
  ImageFeatureValue,
  ImageFormat,
  ImageFormats,
  imageIdSchema,
  ImageTag,
  imageUrlSchema,
  integerIdSchema,
  IntegerIdType,
  NumericRange,
  repositoryIdSchema,
  shortTechnicalSchema,
  technicalLongRelaxedSchema,
  technicalSchema,
  technicalShortRelaxedSchema,
  toFileExtension,
  toMimeType,
  uriPathSchema,
  urlSchema
} from "./common.dtos";
import {
  AiModel,
  CaptionInstruction,
  CommandEntity,
  ConfigurationCapability,
  ConfigurationExtensionCommand,
  EligibleTagsInstruction,
  Extension,
  ExtensionActivities,
  ExtensionActivity,
  ExtensionActivityState,
  ExtensionAiModel,
  ExtensionAndManual,
  ExtensionCategory,
  ExtensionGenerationOptions,
  ExtensionManual,
  ExtensionsConfiguration,
  ExtensionSettings,
  ExtensionState,
  Manifest,
  ManifestCapability,
  ManifestCapabilityCaptionsDetails,
  ManifestCapabilityEligibleTagsDetails,
  ManifestCapabilityId,
  ManifestEvent,
  ManifestExecution,
  ManifestExtensionCommand,
  ManifestImageFeaturesCapability,
  ManifestImageTagsCapability,
  ManifestInstructions,
  ManifestRuntime,
  ManifestRuntimeEnvironment,
  ManifestUserInterface,
  RunCommandParameters,
  UserInterfaceAnchor,
  UserInterfaceBasisIntegration,
  UserInterfaceSidebarIntegration,
  UserInterfaceWindowIntegration
} from "./extension.dtos";
import {
  SearchCriteria,
  SearchFeatureComparisonOperator,
  SearchFeatureCondition,
  SearchFeatureLogicalOperator,
  SearchFeatures,
  SearchFilter,
  SearchImagesOrigin,
  SearchKeyword,
  SearchOriginKind,
  SearchProperties,
  SearchPropertyRange,
  SearchRepositoriesOrigin,
  SearchSorting,
  SearchSortingProperty,
  SearchTags
} from "./search.dtos";
import {
  Repository,
  RepositoryActivities,
  RepositoryActivity,
  RepositoryActivityKind,
  RepositoryList,
  RepositoryLocation,
  RepositoryLocationType,
  RepositoryState
} from "./repository.dtos";
import { Collection } from "./collection.dtos";
import {
  ApplicationMetadata,
  ApplicationMetadataItem,
  ApplicationMetadataItemFreeValue,
  ComputedImageFormat,
  ExtensionIdImageEmbeddingName,
  ExtensionImageEmbeddings,
  ExtensionImageFeature,
  ExtensionImageFeatureName,
  ExtensionImageFeaturesAttribute,
  ExtensionImageTag,
  ExtensionImageTagsAttribute,
  GenerationRecipe,
  generationRecipeSchemaVersion,
  Image,
  ImageDimensions,
  ImageDistance,
  ImageDistances,
  ImageEmbedding,
  ImageFeature,
  ImageFeatureNullValue as ImageFeatureNullValueConstant,
  ImageMediaUrl,
  ImageMetadata,
  ImageResizeRender,
  ImageSummary,
  InstructionsPrompt,
  PromptKind,
  SearchFeaturesResult,
  SearchImageIdResult,
  SearchImageResult,
  SearchImageSummaryResult,
  SearchMediaUrlResult,
  SearchParameters,
  SearchRange,
  SearchTagsResult,
  TextualPrompt
} from "./image.dtos";
import { apiScopesSeparator, ApiSecret, ApiSecretSummary, ApiSecretType } from "./apiSecret.dtos";
import { ApplicationConfiguration, ApplicationSettings } from "./miscellaneous.dtos";


/**
 * The name of the software.
 */
enum Software
{
  value = "picteus"
}

/**
 * The tags placeholder to be used in questions for eligible tags.
 */
enum TagsPlaceholder
{
  value = "{tags}"
}

/**
 * The generation recipe schema version.
 */
enum GenerationRecipeVersion
{
  value = generationRecipeSchemaVersion
}

/**
 * The value to pass to the image search web services to designate a 'non-null' feature value.
 */
enum ImageFeatureNullValue
{
  value = ImageFeatureNullValueConstant
}

@ApiSchema(
  {
    description: "Contains the definition of all the application constants"
  }
)
class ConstantsRegistry
{

  static readonly applicationName: string = Software.value;

  static readonly generationRecipeVersion: number = GenerationRecipeVersion.value;

  static readonly tagsPlaceholder: string = TagsPlaceholder.value;

  static readonly imageFeatureNullValue: string = ImageFeatureNullValue.value;

  @ApiProperty(
    {
      description: "The application name",
      enum: Software,
      enumName: "Software",
      required: true
    }
  )
  applicationName: Software = Software.value;

  @ApiProperty(
    {
      description: "The generation recipe schema version",
      enum: GenerationRecipeVersion,
      enumName: "GenerationRecipeVersion",
      required: true
    }
  )
  generationRecipeVersion: GenerationRecipeVersion = GenerationRecipeVersion.value;

  @ApiProperty(
    {
      description: "The tags placeholder to be used in questions for eligible tags",
      enum: TagsPlaceholder,
      enumName: "TagsPlaceholder",
      required: true
    }
  )
  tagsPlaceholder: TagsPlaceholder = TagsPlaceholder.value;

  @ApiProperty(
    {
      description: "The value to pass to the image search web services to designate a 'non-null' feature value",
      enum: ImageFeatureNullValue,
      enumName: "ImageFeatureNullValue",
      required: true
    }
  )
  imageFeatureNullValue: ImageFeatureNullValue = ImageFeatureNullValue.value;

}

export {
  alphaNumericPlusPattern,
  AiModel,
  alphaNumericPlusAdditionalAuthorizedCharactersPattern,
  alphaNumericPlusAdditionalAuthorizedCharactersPlusSpacePattern,
  ApiSecret,
  ApiSecretSummary,
  ApiSecretType,
  apiScopesSeparator,
  ApplicationConfiguration,
  ApplicationSettings,
  ApplicationMetadata,
  ApplicationMetadataItem,
  ApplicationMetadataItemFreeValue,
  applicationXGzipMimeType,
  attachmentUriPrefix,
  attachmentUriSchema,
  Collection,
  CommandEntity,
  ComputedImageFormat,
  computeImageFormatsExtensions,
  ConfigurationCapability,
  ConfigurationExtensionCommand,
  ConstantsRegistry,
  Dates,
  Extension,
  type ExtensionActivities,
  ExtensionActivity,
  ExtensionActivityState,
  ExtensionAiModel,
  ExtensionAndManual,
  ExtensionCategory,
  CaptionInstruction,
  EligibleTagsInstruction,
  ExtensionsConfiguration,
  ExtensionGenerationOptions,
  extensionIdSchema,
  type ExtensionIdType,
  ExtensionImageEmbeddings,
  ExtensionImageFeature,
  ExtensionImageFeaturesAttribute,
  ExtensionImageFeatureName,
  ExtensionImageTag,
  ExtensionImageTagsAttribute,
  ExtensionManual,
  ExtensionState,
  ExtensionSettings,
  FieldLengths,
  fileWithProtocol,
  fromMimeType,
  GenerationRecipe,
  Image,
  ImageDimensions,
  ImageDistance,
  type ImageDistances,
  ImageEmbedding,
  ExtensionIdImageEmbeddingName,
  ImageFeature,
  ImageFeatureFormat,
  ImageFeatureType,
  type ImageFeatureValue,
  ImageFormat,
  ImageFormats,
  imageIdSchema,
  ImageMediaUrl,
  ImageMetadata,
  ImageResizeRender,
  ImageSummary,
  type ImageTag,
  imageUrlSchema,
  InstructionsPrompt,
  integerIdSchema,
  type IntegerIdType,
  Manifest,
  ManifestCapability,
  ManifestCapabilityCaptionsDetails,
  ManifestCapabilityEligibleTagsDetails,
  ManifestCapabilityId,
  ManifestEvent,
  ManifestExtensionCommand,
  ManifestExecution,
  ManifestImageFeaturesCapability,
  ManifestImageTagsCapability,
  ManifestInstructions,
  ManifestRuntime,
  ManifestRuntimeEnvironment,
  ManifestUserInterface,
  type NumericRange,
  PromptKind,
  Repository,
  RepositoryActivity,
  RepositoryActivityKind,
  type RepositoryActivities,
  repositoryIdSchema,
  type RepositoryList,
  RepositoryLocation,
  RepositoryLocationType,
  RepositoryState,
  RunCommandParameters,
  SearchCriteria,
  SearchFeatureCondition,
  SearchFeatureComparisonOperator,
  SearchFeatureLogicalOperator,
  SearchFeaturesResult,
  SearchFeatures,
  SearchFilter,
  SearchImageIdResult,
  SearchImageResult,
  SearchImagesOrigin,
  SearchImageSummaryResult,
  SearchKeyword,
  SearchMediaUrlResult,
  SearchOriginKind,
  SearchParameters,
  SearchProperties,
  SearchPropertyRange,
  SearchRange,
  SearchRepositoriesOrigin,
  SearchSorting,
  SearchSortingProperty,
  SearchTagsResult,
  SearchTags,
  shortTechnicalSchema,
  technicalSchema,
  technicalShortRelaxedSchema,
  technicalLongRelaxedSchema,
  TextualPrompt,
  toFileExtension,
  toMimeType,
  uriPathSchema,
  urlSchema,
  UserInterfaceBasisIntegration,
  UserInterfaceSidebarIntegration,
  UserInterfaceWindowIntegration,
  UserInterfaceAnchor
};
