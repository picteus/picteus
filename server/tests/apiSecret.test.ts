import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "@jest/globals";
import HttpCodes from "http-codes";

import { paths } from "../src/paths";
import { Base, Core } from "./base";
import { ApiSecretType, FieldLengths } from "../src/dtos/app.dtos";
import { ServiceError } from "../src/app.exceptions";
import { apiKeyHeaderName, ApiScope, AuthenticationGuard } from "../src/app.guards";

const { OK, BAD_REQUEST, UNAUTHORIZED } = HttpCodes;


describe("API Secret with module", () =>
{

  const base = new Base(true);

  beforeAll(async () =>
  {
    await Base.beforeAll();
  });

  beforeEach(async () =>
  {
    await base.beforeEach();
  }, Core.beforeAfterTimeoutInMilliseconds);

  afterEach(async () =>
  {
    await base.afterEach();
  }, Core.beforeAfterTimeoutInMilliseconds);

  afterAll(async () =>
  {
    await Base.afterAll();
  });

  test("create", async () =>
  {
    {
      // We assess with invalid parameters
      const keyType = ApiSecretType.Key;
      const validName = "name";
      {
        const expirationDate = Date.now() - 1;
        await expect(async () =>
        {
          await base.getApiSecretController().create(keyType, validName, expirationDate);
        }).rejects.toThrow(new ServiceError(`The parameter 'expirationDate' with value '${expirationDate}' is invalid because it is set in the past`, BAD_REQUEST, base.badParameterCode));
      }
      {
        const name = "a".repeat(FieldLengths.name + 1);
        await expect(async () =>
        {
          await base.getApiSecretController().create(keyType, name);
        }).rejects.toThrow(new ServiceError(`The parameter 'name' with value '${name}' is invalid because it exceeds 128 characters`, BAD_REQUEST, base.badParameterCode));
      }
      {
        const comment = "a".repeat(FieldLengths.comment + 1);
        await expect(async () =>
        {
          await base.getApiSecretController().create(keyType, validName, undefined, comment);
        }).rejects.toThrow(new ServiceError(`The parameter 'comment' with value '${comment}' is invalid because it exceeds 1024 characters`, BAD_REQUEST, base.badParameterCode));
      }
      {
        const scope = "invalid-scope";
        await expect(async () =>
        {
          await base.getApiSecretController().create(keyType, validName, undefined, undefined, scope);
        }).rejects.toThrow(new ServiceError(`The parameter 'scope' with value '${scope}' is invalid because it contains the invalid scope '${scope}'`, BAD_REQUEST, base.badParameterCode));
      }
      {
        const scope = "a".repeat(FieldLengths.technical + 1);
        await expect(async () =>
        {
          await base.getApiSecretController().create(keyType, validName, undefined, undefined, scope);
        }).rejects.toThrow(new ServiceError(`The parameter 'scope' with value '${scope}' is invalid because it exceeds 64 characters`, BAD_REQUEST, base.badParameterCode));
      }
    }
    const types = [ApiSecretType.Key, ApiSecretType.Token];
    {
      // We assess with valid mandatory parameters
      for (const type of types)
      {
        const name = `name-${type}`;
        const entity = await base.getApiSecretController().create(type, name);
        expect(entity.type).toEqual(type);
        expect(entity.name).toEqual(name);
        expect(entity.expirationDate).toBeNull();
        expect(entity.comment).toBeNull();
        expect(entity.scope).toBeNull();
        expect((Date.now() - entity.creationDate) <= 1_000).toBe(true);
        expect(entity.value).toBeDefined();
        expect(entity.value?.length).toBe(36);
      }
    }
    {
      // We assess with valid parameters
      for (const type of types)
      {
        const name = `name-${type}-bis`;
        const expirationDate = Date.now() + Math.round(Math.random() * 1_000_000);
        const comment = "comment";
        const scope = ApiScope.ApiSecretRead + "," + ApiScope.ImageRead;
        const entity = await base.getApiSecretController().create(type, name, expirationDate, comment, scope);
        expect(entity.type).toEqual(type);
        expect(entity.name).toEqual(name);
        expect(entity.expirationDate).toEqual(expirationDate);
        expect(entity.comment).toEqual(comment);
        expect(entity.scope).toEqual(scope);
      }
    }
  });

  test("list", async () =>
  {
    const entity1 = await base.getApiSecretController().create(ApiSecretType.Token, "Token");
    const entity2 = await base.getApiSecretController().create(ApiSecretType.Key, "Key");

    const entities = await base.getApiSecretController().list();
    expect(entities.length).toEqual(2);
    expect(entities[0].id).toEqual(entity2.id);
    expect(entities[1].id).toEqual(entity1.id);
  });

  test("get", async () =>
  {
    {
      // We assess with invalid parameters
      const inexistentId = -1;
      await expect(async () =>
      {
        await base.getApiSecretController().get(inexistentId);
      }).rejects.toThrow(new ServiceError(`The parameter 'id' with value '${inexistentId}' is invalid because there is no API secret with that identifier`, BAD_REQUEST, base.badParameterCode));
    }
    {
      // We assess with valid parameters
      for (let index = 0; index < 10; index++)
      {
        await base.getApiSecretController().create(ApiSecretType.Key, `key-${index}`);
      }
      const entity = await base.getApiSecretController().create(ApiSecretType.Token, "Token");

      const returnedEntity = await base.getApiSecretController().get(entity.id);
      expect(returnedEntity).toBeDefined();
      expect(returnedEntity.id).toEqual(entity.id);
    }
  });

  test("delete", async () =>
  {
    {
      // We assess with invalid parameters
      const inexistentId = -1;
      await expect(async () =>
      {
        await base.getApiSecretController().delete(inexistentId);
      }).rejects.toThrow(new ServiceError(`The parameter 'id' with value '${inexistentId}' is invalid because there is no API secret with that identifier`, BAD_REQUEST, base.badParameterCode));
    }
    {
      // We assess with valid parameters
      const count = 10;
      for (let index = 0; index < count; index++)
      {
        await base.getApiSecretController().create(ApiSecretType.Key, `key-${index}`);
      }
      const entity = await base.getApiSecretController().create(ApiSecretType.Token, "Token");

      await base.getApiSecretController().delete(entity.id);
      expect((await base.getApiSecretController().list()).length).toEqual(count);
    }
  });

});

describe("API Secret with application", () =>
{

  const base = new Base(true);

  beforeAll(async () =>
  {
    await Base.beforeAll();
    paths.requiresApiKey = true;
  });

  beforeEach(async () =>
  {
    await base.beforeEach();
  }, Core.beforeAfterTimeoutInMilliseconds);

  afterEach(async () =>
  {
    await base.afterEach();
  }, Core.beforeAfterTimeoutInMilliseconds);

  afterAll(async () =>
  {
    await Base.afterAll();
  });

  test("Master API key", async () =>
  {
    const apiKey = AuthenticationGuard.generateApiKey();
    AuthenticationGuard.masterApiKey = apiKey;
    const webServiceUrl = `${paths.webServicesBaseUrl}/apiSecret/list`;
    {
      // We assess with missing authentication
      expect((await fetch(webServiceUrl)).status).toEqual(UNAUTHORIZED);
    }
    {
      // We assess with a faulty authentication
      expect((await fetch(webServiceUrl, { headers: { [apiKeyHeaderName]: "dummy" } })).status).toEqual(UNAUTHORIZED);
    }
    {
      // We assess with a valid authentication
      expect((await fetch(webServiceUrl, { headers: { [apiKeyHeaderName]: apiKey } })).status).toEqual(OK);
    }
  });

  test("Secret API key deletion", async () =>
  {
    const webServiceUrl = `${paths.webServicesBaseUrl}/apiSecret/list`;
    const apiSecret = await base.getApiSecretController().create(ApiSecretType.Key, "name");
    {
      // We assess with a valid authentication
      expect((await fetch(webServiceUrl, { headers: { [apiKeyHeaderName]: apiSecret.value } })).status).toEqual(OK);
    }
    {
      // We delete the API and check that the authentication fails
      await base.getApiSecretController().delete(apiSecret.id);
      expect((await fetch(webServiceUrl, { headers: { [apiKeyHeaderName]: apiSecret.value } })).status).toEqual(UNAUTHORIZED);
    }
  });

  test("Secret API key expiration", async () =>
  {
    const webServiceUrl = `${paths.webServicesBaseUrl}/apiSecret/list`;
    const validityDurationInMilliseconds = 500;
    const apiSecret = await base.getApiSecretController().create(ApiSecretType.Key, "name", Date.now() + validityDurationInMilliseconds);
    {
      // We assess with a valid authentication
      expect((await fetch(webServiceUrl, { headers: { [apiKeyHeaderName]: apiSecret.value } })).status).toEqual(OK);
    }
    await base.wait(validityDurationInMilliseconds * 2);
    {
      // We check that the authentication fails
      expect((await fetch(webServiceUrl, { headers: { [apiKeyHeaderName]: apiSecret.value } })).status).toEqual(UNAUTHORIZED);
    }
  });

});
