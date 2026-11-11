import { Injectable } from "@nestjs/common";

import { Prisma } from ".prisma/client";
import { logger } from "../logger";
import { plainToInstanceViaJSON } from "../utils";
import { RegularDatabaseService } from "./regularDatabaseService";
import { apiScopesSeparator, ApiSecret, ApiSecretSummary, FieldLengths } from "../dtos/app.dtos";
import { parametersChecker } from "./utils/parametersChecker";
import { apiScopeStrings, AuthenticationGuard } from "../app.guards";


@Injectable()
export class ApiSecretService
{

  constructor(private readonly regularDatabaseService: RegularDatabaseService)
  {
    logger.debug("Instantiating an ApiSecretService");
  }

  async list(): Promise<ApiSecretSummary[]>
  {
    logger.debug("Listing all the API secrets");
    const entities = await this.regularDatabaseService.apiSecrets.findMany({
      omit: { scope: false, value: false },
      orderBy: { name: "asc" }
    });
    return entities.map(entity => plainToInstanceViaJSON(ApiSecretSummary, entity));
  }

  async create(type: string, name: string, expirationDate: number | undefined, comment: string | undefined, scope: string | undefined): Promise<ApiSecret>
  {
    const actualExpirationDate = expirationDate === undefined ? undefined : new Date(expirationDate);
    logger.debug(`Creating an API secret of type '${type}'${name === "" ? "" : (`, with name '${name}'`)}${actualExpirationDate === undefined ? "" : (`, with expiration date '${actualExpirationDate}'`)}`);

    if (await this.regularDatabaseService.apiSecrets.findFirst({ where: { name } }) !== null)
    {
      parametersChecker.throwBadParameter("name", name, "a API secret with the same name already exists");
    }
    if (expirationDate !== undefined && expirationDate <= Date.now())
    {
      parametersChecker.throwBadParameter("expirationDate", expirationDate.toString(), "it is set in the past");
    }
    parametersChecker.checkString("name", name, FieldLengths.l128);
    parametersChecker.checkString("comment", comment, FieldLengths.l1k, undefined, true);
    parametersChecker.checkString("scope", scope, FieldLengths.l64, undefined, true);
    if (scope !== undefined)
    {
      const tokens = scope.split(apiScopesSeparator);
      for (const token of tokens)
      {
        if (apiScopeStrings.indexOf(token) === -1)
        {
          parametersChecker.throwBadParameter("scope", scope, `it contains the invalid scope '${token}'`);
        }
      }
    }

    const value = AuthenticationGuard.generateApiKey();
    const entity = await this.regularDatabaseService.apiSecrets.create({
      data: {
        type,
        expirationDate: actualExpirationDate,
        name,
        comment,
        scope,
        value
      }
    });

    return plainToInstanceViaJSON(ApiSecret, entity);
  }

  async get(id: number): Promise<ApiSecret>
  {
    logger.debug(`Getting the API secret with id '${id}'`);
    const entity = await this.getPersistedApiSecret(id);
    return plainToInstanceViaJSON(ApiSecret, entity);
  }

  async delete(id: number): Promise<void>
  {
    logger.debug(`Deleting the API secret with id '${id}'`);
    const entity = await this.getPersistedApiSecret(id);
    await this.regularDatabaseService.apiSecrets.delete({ where: { id: entity.id } });
    // We do not forget to remove the API secret from the cache
    AuthenticationGuard.forgetApiSecret(entity.value);
  }

  private async getPersistedApiSecret(id: number): Promise<Prisma.ApiSecretModel>
  {
    const entity = await this.regularDatabaseService.apiSecrets.findUnique({ where: { id } });
    if (entity === null)
    {
      parametersChecker.throwBadParameter("id", id.toString(), `there is no API secret with that identifier`);
    }
    return entity;
  }

}
