import { ServerResponse } from "node:http";

import { ClassTransformOptions, instanceToPlain, plainToInstance } from "class-transformer";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";
import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ClassProvider,
  ClassSerializerInterceptor,
  ClassSerializerInterceptorOptions,
  ExceptionFilter,
  FactoryProvider,
  ForbiddenException,
  HttpException,
  Injectable,
  MiddlewareConsumer,
  Module,
  NestMiddleware,
  NestModule,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  OnModuleDestroy,
  OnModuleInit,
  Type,
  UnauthorizedException
} from "@nestjs/common";
import { TransformerPackage } from "@nestjs/common/interfaces/external/transformer-package.interface";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { Request as ExpressRequest, Response as ExpressResponse } from "express";
import { RateLimiterMemory, RateLimiterRes } from "rate-limiter-flexible";
import HttpCodes from "http-codes";
import { headers, types } from "http-constants";


import { logger } from "./logger";
import { AuthenticationGuard } from "./app.guards";
import { RepositoryStatus } from "./dtos/repository.dtos";
import {
  AdministrationController,
  ApiSecretController,
  ExtensionController,
  ImageAttachmentController,
  ImageController,
  MiscellaneousController,
  RepositoryController,
  SearchController,
  SettingsController,
  validationPipeFactory
} from "./controllers/app.controllers";
import {
  AdministrationService,
  ApiSecretService,
  EntitiesProvider,
  ExtensionRegistry,
  ExtensionService,
  ExtensionsUiServer,
  ExtensionTaskExecutor,
  GenerativeAIService,
  HostService,
  ImageAnalyzerService,
  ImageAttachmentService,
  ImageService,
  MiscellaneousService,
  NotificationsGateway,
  RepositoryService,
  SearchService,
  SettingsService,
  VectorDatabaseAccessor,
  VectorDatabaseProvider
} from "./services/app.service";
import { ControllerError, ServiceError } from "./app.exceptions";
import { Resizer } from "./resizer";
import { Notifier } from "./notifier";

const { INTERNAL_SERVER_ERROR } = HttpCodes;


class CommonControllerExceptionFilter<RuntimeError extends Error | ControllerError | ServiceError> implements ExceptionFilter
{

  catch(exception: RuntimeError, host: ArgumentsHost)
  {
    const response: ServerResponse = host.switchToHttp().getResponse<ServerResponse>();
    const isHandledException = exception instanceof ServiceError || exception instanceof ControllerError;
    const handledException = exception as ServiceError | ControllerError;
    const isBuiltInException = exception instanceof HttpException;
    // @ts-ignore
    const message = (isBuiltInException === true && exception instanceof UnauthorizedException === false && exception instanceof ForbiddenException === false) ? (typeof exception.getResponse() === "object" ? (`${exception.getResponse().error}. Reason: '${exception.getResponse().message}'`) : exception.getResponse()) : exception.message;
    const code = isHandledException === true ? handledException.code : (isBuiltInException === true ? (exception instanceof BadRequestException ? 3 : (exception instanceof UnauthorizedException ? 1 : (exception instanceof ForbiddenException ? 2 : 4))) : -1);
    const body = { message, code };
    const statusCode: number = (isHandledException === true && "httpStatus" in exception) ? handledException.httpStatus : (isBuiltInException === true ? (exception as HttpException).getStatus() : INTERNAL_SERVER_ERROR);
    if (isHandledException === false && isBuiltInException === false)
    {
      logger.error(exception);
    }
    response.statusCode = statusCode;
    response.setHeader(headers.request.CONTENT_TYPE, types.json);
    response.end(JSON.stringify(body, undefined, 2));
  }

}

@Catch(Error)
class UnexpectedExceptionFilter extends CommonControllerExceptionFilter<Error>
{
}

@Catch(ControllerError)
class ControllerExceptionFilter extends CommonControllerExceptionFilter<ControllerError>
{
}

@Catch(ServiceError)
class ServiceExceptionFilter extends CommonControllerExceptionFilter<ServiceError>
{
}

/**
 * Discards all the "null" properties recursively of the object in the HTTP responses.
 */
class DiscardNullTransformerPackage implements TransformerPackage
{

  plainToInstance<T>(aClass: Type<T>, plain: unknown, options?: ClassTransformOptions): T[] | T
  {
    // noinspection TypeScriptValidateTypes
    const instance = plainToInstance<T, unknown>(aClass, plain, options);
    return this.cleanEmpty(instance, [null]);
  }

  classToPlain(object: unknown, options?: ClassTransformOptions): Record<string, any> | Record<string, any>[]
  {
    if (Array.isArray(object) === true || Buffer.isBuffer(object) === true)
    {
      return object;
    }
    const plain = instanceToPlain(object, options);
    return this.cleanEmpty(plain, [null]);
  }

  // Inspired from https://gist.github.com/emmanuelnk/92ea809113ef47447b945d1948760221
  cleanEmpty(object: any, defaults = [undefined, null, NaN, ""]): any
  {
    if (defaults.includes(object) === true)
    {
      return;
    }

    if (Array.isArray(object) === true)
    {
      return object
        .map(value => value && typeof value === "object" ? this.cleanEmpty(value, defaults) : value)
        .filter(value => defaults.includes(value) === false);
    }
    return Object.entries(object).length
      ? Object.entries(object)
        .map(([key, value]) => ([key, value && typeof value === "object" ? this.cleanEmpty(value, defaults) : value]))
        .reduce((newObject, [key, value]) =>
        {
          return (defaults.includes(value) ? newObject : { ...newObject, [key]: value });
        }, {})
      : object;
  }

}

// We exclude the non-declared entities properties from responses. Good explanations are provided in https://stackoverflow.com/questions/71523999/using-excludeextraneousvalues-nestjs-flag-is-not-working and https://wanago.io/2020/06/08/api-nestjs-serializing-response-interceptors/
class DiscardNullClassSerializerInterceptor extends ClassSerializerInterceptor
{

  constructor(reflector: any, _defaultOptions: ClassSerializerInterceptorOptions)
  {
    super(reflector, {
        strategy: "excludeAll",
        enableImplicitConversion: true,
        excludeExtraneousValues: true,
        exposeUnsetFields: false,
        // This enables to recursively discard the "null" properties from the responses
        transformerPackage: new DiscardNullTransformerPackage()
      }
    );
  }

}

const unexpectedExceptionFilterProvider = { provide: APP_FILTER, useClass: UnexpectedExceptionFilter };

const classSerializerInterceptorProvider: ClassProvider<DiscardNullClassSerializerInterceptor> =
  {
    provide: APP_INTERCEPTOR,
    useClass: DiscardNullClassSerializerInterceptor
  };

const controllerExceptionFilterProvider: ClassProvider<ControllerExceptionFilter> =
  {
    provide: APP_FILTER,
    useClass: ControllerExceptionFilter
  };

const serviceExceptionFilterProvider: ClassProvider<ServiceExceptionFilter> =
  {
    provide: APP_FILTER,
    useClass: ServiceExceptionFilter
  };

const authenticationProvider: ClassProvider<AuthenticationGuard> =
  {
    provide: APP_GUARD,
    useClass: AuthenticationGuard
  };

const throttlerGuardProvider: ClassProvider<ThrottlerGuard> =
  {
    provide: APP_GUARD,
    useClass: ThrottlerGuard
  };

const validationPipeProvider: FactoryProvider = { provide: APP_PIPE, useFactory: validationPipeFactory };

@Injectable()
class ImageResizerMiddleware implements NestMiddleware, OnModuleInit, OnModuleDestroy
{

  private readonly resizer: Resizer = new Resizer();

  private readonly limiter: RateLimiterMemory = new RateLimiterMemory({ duration: 1, points: 200 });

  constructor(private readonly repositoryService: RepositoryService)
  {
    logger.debug("Instantiating an ImageResizerMiddleware");
  }

  async onModuleInit(): Promise<void>
  {
    logger.info("The initializing of the ImageResizerMiddleware is over");
  }

  async onModuleDestroy(): Promise<void>
  {
    logger.info("Destroying the ImageResizerMiddleware");
    logger.info("Destroyed the ImageResizerMiddleware");
  }

  async use(request: ExpressRequest, response: ExpressResponse): Promise<void>
  {
    try
    {
      await this.limiter.consume("", 1);
      await this.resizer.handle(request, response, (nodePath: string) =>
      {
        const status: RepositoryStatus | undefined = this.repositoryService.getImageRepositoryStatus(nodePath);
        return status === undefined ? "it does not belong to any repository" : ((status === RepositoryStatus.READY || status === RepositoryStatus.INDEXING) ? undefined : "it belongs to a not-available repository");
      });
    }
    catch (error)
    {
      if (error instanceof RateLimiterRes)
      {
        this.resizer.sendTooManyRequestsError(response);
      }
      else
      {
        // This should never happen
        throw error;
      }
    }
  }

}

@Injectable()
class ExtensionsUserInterfaceMiddleware implements NestMiddleware, OnModuleInit, OnModuleDestroy
{

  constructor(private readonly server: ExtensionsUiServer)
  {
    logger.debug("Instantiating an ExtensionsUserInterfaceMiddleware");
  }

  async onModuleInit(): Promise<void>
  {
    logger.info("The initializing of the ExtensionsUserInterfaceMiddleware is over");
  }

  async onModuleDestroy(): Promise<void>
  {
    logger.info("Destroying the ExtensionsUserInterfaceMiddleware");
    logger.info("Destroyed the ExtensionsUserInterfaceMiddleware");
  }

  async use(request: ExpressRequest, response: ExpressResponse): Promise<void>
  {
    await this.server.handle(request, response);
  }

}

const controllers = [MiscellaneousController, AdministrationController, SettingsController, ApiSecretController, ExtensionController, RepositoryController, ImageController, ImageAttachmentController, SearchController];

// This module is defined in order to initialize its providers first
@Module({
  providers: [EntitiesProvider, VectorDatabaseProvider],
  exports: [EntitiesProvider, VectorDatabaseProvider]
})
class PrerequisitesModule implements OnModuleInit, OnModuleDestroy
{

  constructor()
  {
    logger.debug("Instantiating a PrerequisitesModule");
  }

  async onModuleInit(): Promise<void>
  {
    logger.info("The initializing of the PrerequisitesModule is over");
  }

  async onModuleDestroy(): Promise<void>
  {
    logger.info("Destroying the PrerequisitesModule");
    logger.info("Destroyed the PrerequisitesModule");
  }

}

// This module is defined in order to handle any potential database migration
@Module({
  imports:
    [
      PrerequisitesModule
    ],
  providers: [AdministrationService],
  exports: [AdministrationService]
})
class MigrationModule implements OnModuleInit, OnModuleDestroy
{

  async onModuleInit(): Promise<void>
  {
    logger.info("The initializing of the MigrationModule is over");
  }

  async onModuleDestroy(): Promise<void>
  {
    logger.info("Destroying the MigrationModule");
    logger.info("Destroyed the MigrationModule");
  }

}

// The orders in which the providers matter, because we want their "onModuleInit()" method invoked in the following order: "AdministrationService" => "RepositoryService"
const providers = [unexpectedExceptionFilterProvider, classSerializerInterceptorProvider, controllerExceptionFilterProvider, serviceExceptionFilterProvider, validationPipeProvider, authenticationProvider, throttlerGuardProvider, VectorDatabaseAccessor, HostService, NotificationsGateway, SettingsService, ApiSecretService, MiscellaneousService, ExtensionRegistry, ExtensionsUiServer, ExtensionService, ExtensionTaskExecutor, RepositoryService, SearchService, ImageService, ImageAnalyzerService, ImageAttachmentService, GenerativeAIService];

@Module({
  imports:
    [
      EventEmitterModule.forRoot({ wildcard: true, delimiter: Notifier.delimiter }),
      ThrottlerModule.forRoot({
        throttlers:
          [
            {
              ttl: 1_000,
              limit: 100
            }
          ]
      }),
      PrerequisitesModule,
      MigrationModule
    ],
  controllers,
  providers
})
export class MainModule implements OnModuleInit, OnApplicationBootstrap, OnModuleDestroy, OnApplicationShutdown, NestModule
{

  constructor()
  {
    logger.debug("Instantiating a MainModule");
  }

  async onModuleInit(): Promise<void>
  {
    logger.info("The initializing of the AppModule is over");
  }

  onApplicationBootstrap(): any
  {
    logger.info("The AppModule is now initialized");
  }

  async onModuleDestroy(): Promise<void>
  {
    logger.info("Destroying the AppModule");
    logger.info("Destroyed the AppModule");
  }

  onApplicationShutdown(signal?: string): any
  {
    logger.info(`The AppModule is now shutting down${signal === undefined ? "" : ` with '${signal}' signal`}`);
  }

  configure(consumer: MiddlewareConsumer): void
  {
    consumer.apply(ImageResizerMiddleware).forRoutes(Resizer.webServerBasePath);
    consumer.apply(ExtensionsUserInterfaceMiddleware).forRoutes(ExtensionsUiServer.webServerBasePath);
  }

}
