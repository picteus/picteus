import Request, { IncomingMessage } from "http";

import { Reflector } from "@nestjs/core";
import {
  CanActivate,
  createParamDecorator,
  CustomDecorator,
  ExecutionContext,
  Injectable,
  PipeTransform,
  SetMetadata,
  Type,
  UnauthorizedException
} from "@nestjs/common";
import Chance from "chance";

import { ApiSecret } from ".prisma/client";
import { logger } from "./logger";
import { paths } from "./paths";
import { apiScopesSeparator } from "./dtos/app.dtos";
import { EntitiesProvider } from "./services/databaseProviders";
import { ExtensionsUiServer } from "./services/extensionServices";


export const apiKeyHeaderName = "X-API-KEY";

export const noSecurity = "none";

const IS_PUBLIC_KEY = "isPublic";

export type ExtensionApiKey = { id: string, key: string };

export type ExtensionsApiKeys = ExtensionApiKey[];

export enum ApiScope
{
  Administration = "administration",
  All = "all",
  ApiSecretList = "apisecret:list",
  ApiSecretRead = "apisecret:read",
  ApiSecretWrite = "apisecret:write",
  ExtensionChromeExtensionInstall = "extension:chrome:install",
  ExtensionManage = "extension:manage",
  ExtensionRead = "extension:read",
  ExtensionRun = "extension:run",
  ExtensionSettingsRead = "extension:settings:read",
  ExtensionSettingsWrite = "extension:settings:write",
  ExtensionWrite = "extension:write",
  CollectionRead = "collection:write",
  CollectionWrite = "collection:write",
  ImageAttachmentWrite = "image:attachment:write",
  ImageDelete = "image:delete",
  ImageEmbeddingsWrite = "image:embeddings:write",
  ImageFeatureWrite = "image:feature:write",
  ImageRead = "image:read",
  ImageTagWrite = "image:tag:write",
  ImageWrite = "image:write",
  RepositoryEnsure = "repository:ensure",
  RepositoryManage = "repository:manage",
  RepositoryRead = "repository:read",
  RepositoryStoreImage = "repository:image:store",
  RepositoryWrite = "repository:write",
  SettingsRead = "settings:read",
  SettingsWrite = "settings:write"
}

export const apiScopeStrings: string[] = Object.values(ApiScope);

export interface ApiScopeDescription
{
  value: ApiScope;
  description: string;
}

// noinspection JSUnusedGlobalSymbols
export const ApiScopes: ApiScopeDescription[] =
  [
    {
      value: ApiScope.All,
      description: "Can invoke all the API web services"
    }
  ];

export interface PolicyContext
{

  readonly extensionId?: string;

  readonly scopes: ApiScope [];

}

interface IPolicyHandler
{
  handle(context: PolicyContext): boolean;
}

type PolicyHandlerCallback = (context: PolicyContext) => boolean;

export type PolicyHandler = IPolicyHandler | PolicyHandlerCallback;

const CHECK_POLICIES_KEY = "check_policy";

export const CheckPolicies: (...handlers: PolicyHandler[]) => CustomDecorator = (...handlers: PolicyHandler[]) => SetMetadata(CHECK_POLICIES_KEY, handlers);

export const withOneOfPolicies: (scopes: ApiScope[]) => PolicyHandler = (scopes: ApiScope[]) =>
{
  return (context: PolicyContext) =>
  {
    return context.scopes.find((scope: ApiScope) => scopes.indexOf(scope) !== -1) !== undefined;
  };
};

export const withAllPolicies: (scopes: ApiScope[]) => PolicyHandler = (scopes: ApiScope[]) =>
{
  return (context: PolicyContext) =>
  {
    return scopes.filter((scope: ApiScope) => context.scopes.indexOf(scope) !== -1).length === scopes.length;
  };
};

export const RequestPolicyContext: (...dataOrPipes: (Type<PipeTransform> | PipeTransform)[]) => ParameterDecorator = createParamDecorator<any>(
  (_data: any, context: ExecutionContext) =>
  {
    const request = context.switchToHttp().getRequest();
    return request[AuthenticationGuard.policyContextAttributeName];
  }
);

// Inspired from https://docs.nestjs.com/security/authentication and https://blog.logrocket.com/understanding-guards-nestjs/
@Injectable()
export class AuthenticationGuard implements CanActivate
{

  public static readonly policyContextAttributeName = "policyContext";

  private static _masterApiKey?: string;

  private static readonly extensionsApiPermissions: ExtensionsApiKeys = [];

  // This acts as a cache of API secret values
  private static readonly perSecretValueSecretsMap: Map<string, ApiSecret> = new Map<string, ApiSecret>();

  // Whether we want to API to support authorizations based on the HTTP "Referer" header value
  private static readonly acceptRefererHeader = Math.random() > 1;

  static generateApiKey(): string
  {
    return new Chance().string({ casing: "lower", alpha: true, length: 36 });
  }

  static set masterApiKey(apiKey: string)
  {
    AuthenticationGuard._masterApiKey = apiKey;
  }

  static isMasterApiKey(apiKey: string): boolean
  {
    return this._masterApiKey === apiKey;
  }

  static forgetApiSecret(value: string): void
  {
    AuthenticationGuard.perSecretValueSecretsMap.delete(value);
  }

  static isExtensionApiKey(apiKey: string, extensionId: string): boolean
  {
    return AuthenticationGuard.getExtensionsApiKey(apiKey, extensionId) !== undefined;
  }

  static registerExtensionsApiKeys(extensionIds: string[]): ExtensionsApiKeys
  {
    for (const extensionId of extensionIds)
    {
      AuthenticationGuard.registerExtensionApiKey(extensionId);
    }
    return AuthenticationGuard.extensionsApiPermissions;
  }

  static registerExtensionApiKey(extensionId: string): ExtensionApiKey
  {
    logger.debug(`Registering an API key for the extension '${extensionId}'`);
    const apiKey = AuthenticationGuard.generateApiKey();
    const extensionsApiKey: ExtensionApiKey = { id: extensionId, key: apiKey };
    AuthenticationGuard.extensionsApiPermissions.push(extensionsApiKey);
    return extensionsApiKey;
  }

  static unregisterExtensionApiKeys(extensionId: string): void
  {
    let index = 0;
    for (const extensionApiKey of AuthenticationGuard.extensionsApiPermissions)
    {
      if (extensionApiKey.id === extensionId)
      {
        logger.debug(`Unregistering the API key '${extensionApiKey.key}' for the extension '${extensionId}'`);
        AuthenticationGuard.extensionsApiPermissions.splice(index, 1);
        break;
      }
      index++;
    }
  }

  static resetExtensionsApiKeys(): void
  {
    AuthenticationGuard.extensionsApiPermissions.length = 0;
  }

  static extractExtensionIdFromRefererHeader(request: IncomingMessage): string | undefined
  {
    const headers: Request.IncomingHttpHeaders = request.headers;
    const values = headers["referer"];
    if (values === undefined)
    {
      return undefined;
    }
    const value = values === undefined ? undefined : (Array.isArray(values) === true ? values[0] : values);
    if (value === undefined)
    {
      return undefined;
    }
    if (value === undefined)
    {
      return undefined;
    }
    const urlPrefix = `${paths.webServicesBaseUrl}/${ExtensionsUiServer.webServerBasePath}/${ExtensionsUiServer.extensionPathFragment}/`;
    if (value.startsWith(urlPrefix) === false)
    {
      return undefined;
    }
    return value.substring(urlPrefix.length).split("/")[0];
  }

  private static getExtensionsApiKey(apiKey: string, extensionId?: string): ExtensionApiKey | undefined
  {
    return AuthenticationGuard.extensionsApiPermissions.find(permission => permission.key === apiKey && (extensionId === undefined || permission.id === extensionId));
  }

  constructor(private readonly reflector: Reflector, private readonly entitiesProvider: EntitiesProvider)
  {
    logger.debug("Instantiating an AuthenticationGuard");
  }

  async canActivate(context: ExecutionContext): Promise<boolean>
  {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
    if (isPublic === true)
    {
      return true;
    }
    const httpArgumentsHost = context.switchToHttp();
    const httpRequest = httpArgumentsHost.getRequest();
    if (AuthenticationGuard.acceptRefererHeader === true)
    {
      const extensionId = AuthenticationGuard.extractExtensionIdFromRefererHeader(httpRequest);
      if (extensionId !== undefined)
      {
        // The request is coming from an extension UI
        httpRequest[AuthenticationGuard.policyContextAttributeName] = this.computeExtensionPolicyContext(extensionId);
        return true;
      }
    }
    const apiKey = this.extractApiKeyFromHeader(httpRequest);
    const policyContext = await this.checkMasterAndExtensionApiKey(apiKey);
    httpRequest[AuthenticationGuard.policyContextAttributeName] = policyContext;
    if (policyContext.scopes.indexOf(ApiScope.All) !== -1)
    {
      // As soon as we have the 'all' scope, we allow everything
      return true;
    }

    const policyHandlers = this.reflector.get<PolicyHandler[]>(CHECK_POLICIES_KEY, context.getHandler()) || [];
    return policyHandlers.every((handler) =>
      this.executePolicyHandler(handler, policyContext)
    );
  }

  private async checkMasterAndExtensionApiKey(apiKey: string | undefined): Promise<PolicyContext>
  {
    if (paths.requiresApiKey === false)
    {
      // No authentication via an API key is required
      return { scopes: [ApiScope.All] };
    }
    if (apiKey === undefined)
    {
      throw new UnauthorizedException(`Missing authentication via the HTTP request header '${apiKeyHeaderName}'`);
    }
    if (apiKey === AuthenticationGuard._masterApiKey)
    {
      return { scopes: [ApiScope.All] };
    }
    const extensionsApiKey = AuthenticationGuard.getExtensionsApiKey(apiKey);
    if (extensionsApiKey !== undefined)
    {
      return this.computeExtensionPolicyContext(extensionsApiKey.id);
    }
    // The provided string is not the master API key, nor an extension API key: we check against the registered API secrets
    const scopes = await this.checkApiSecret(apiKey);
    if (scopes === undefined)
    {
      logger.debug(`The authentication API key '${apiKey}' is invalid`);
      throw new UnauthorizedException("Invalid API key");
    }
    return { scopes };
  }

  private extractApiKeyFromHeader(request: IncomingMessage): string | undefined
  {
    const headers: Request.IncomingHttpHeaders = request.headers;
    const values = headers[apiKeyHeaderName.toLowerCase()];
    return values === undefined ? undefined : (Array.isArray(values) === true ? values[0] : values);
  }

  private computeExtensionPolicyContext(extensionId: string): PolicyContext
  {
    return {
      extensionId,
      scopes: [ApiScope.ExtensionChromeExtensionInstall, ApiScope.ExtensionRun, ApiScope.ExtensionSettingsRead, ApiScope.ExtensionSettingsWrite, ApiScope.ImageAttachmentWrite, ApiScope.ImageEmbeddingsWrite, ApiScope.ImageFeatureWrite, ApiScope.ImageRead, ApiScope.ImageTagWrite, ApiScope.RepositoryEnsure, ApiScope.RepositoryRead, ApiScope.RepositoryStoreImage]
    };
  }

  private async checkApiSecret(apiKey: string): Promise<ApiScope[] | undefined>
  {
    const now = Date.now();
    const cachedSecret = AuthenticationGuard.perSecretValueSecretsMap.get(apiKey);
    if (cachedSecret !== undefined)
    {
      if (cachedSecret.expirationDate === null)
      {
        return this.convertApiSecretScopesToPolicyScopes(cachedSecret);
      }
      if (now > cachedSecret.expirationDate.getTime())
      {
        // The API secret is expired
        return undefined;
      }
    }
    const apiSecret: ApiSecret | null = await this.entitiesProvider.apiSecrets.findFirst({ where: { value: apiKey } });
    if (apiSecret === null)
    {
      return undefined;
    }
    if (apiSecret.expirationDate !== null && now > apiSecret.expirationDate.getTime())
    {
      // The API secret is expired
      return undefined;
    }
    AuthenticationGuard.perSecretValueSecretsMap.set(apiSecret.value, apiSecret);
    return this.convertApiSecretScopesToPolicyScopes(apiSecret);
  }

  private convertApiSecretScopesToPolicyScopes(apiSecret: ApiSecret): ApiScope[]
  {
    if (apiSecret.scope === null)
    {
      return [ApiScope.All];
    }
    const tokens = apiSecret.scope.split(apiScopesSeparator);
    const scopes: ApiScope[] = [];
    for (const token of tokens)
    {
      if (apiScopeStrings.indexOf(token) === -1)
      {
        // This should not happen as the scope is controlled when creating the API secret
        logger.error(`Ignoring the API scope '${token}' which is not valid`);
      }
      else
      {
        scopes.push(token as ApiScope);
      }
    }
    return scopes;
  }

  private executePolicyHandler(handler: PolicyHandler, policyContext: PolicyContext): boolean
  {
    if (typeof handler === "function")
    {
      return handler(policyContext);
    }
    return handler.handle(policyContext);
  }
}

export const Public = () =>
{
  return SetMetadata(IS_PUBLIC_KEY, true);
};
