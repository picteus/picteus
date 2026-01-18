import { ModuleRef } from "@nestjs/core";
import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";

import { logger } from "../logger";
import { ManifestCapability, ManifestCapabilityId } from "../dtos/app.dtos";
import { EntitiesProvider } from "./databaseProviders";
import { CapabilityResult, ExtensionService } from "./extensionServices";
import { parametersChecker } from "./utils/parametersChecker";


@Injectable()
export class ImageAnalyzerService
  implements OnModuleInit, OnModuleDestroy
{

  constructor()
  {
    logger.debug("Instantiating an ImageAnalyzerService");
  }

  async onModuleInit(): Promise<void>
  {
    logger.debug("The initializing of an ImageAnalyzerService is over");
  }

  onModuleDestroy(): void
  {
    logger.debug("Destroying an ImageAnalyzerService");
    logger.debug("Destroyed an ImageAnalyzerService");
  }

}

/**
 * A text embeddings individual element.
 */
export type TextEmbedding = number;

/**
 * A text embeddings vector.
 */
export type TextEmbeddings = TextEmbedding[];

@Injectable()
export class GenerativeAIService
  implements OnModuleInit, OnModuleDestroy
{

  constructor(private readonly entitiesProvider: EntitiesProvider, private readonly moduleRef: ModuleRef)
  {
    logger.debug("Instantiating a GenerativeAIService");
  }

  async onModuleInit(): Promise<void>
  {
    logger.debug("The initializing of a GenerativeAIService is over");
  }

  async onModuleDestroy(): Promise<void>
  {
    logger.debug("Destroying a GenerativeAIService");
    logger.debug("Destroyed a GenerativeAIService");
  }

  async computeTextEmbeddings(text: string): Promise<TextEmbeddings>
  {
    const {
      extensionId,
      value
    }: CapabilityResult<TextEmbeddings> = await this.moduleRef.get(ExtensionService).runCapability<TextEmbeddings>(new ManifestCapability(ManifestCapabilityId.TextEmbeddings), { text });
    if (value === undefined)
    {
      parametersChecker.throwBadParameterError(`The extension with id '${extensionId}' returned no embeddings for the text '${text}'`);
    }
    return value;
  }

}
