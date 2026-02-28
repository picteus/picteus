import path from "node:path";
import fs from "node:fs";

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "@jest/globals";
import { HttpStatus } from "@nestjs/common";

import {
  ApiSecretApi,
  ApiSecretType,
  CollectionApi,
  Configuration,
  DefaultConfig,
  FetchError,
  ImageApi,
  ImageFeatureFormat,
  ImageFeatureType,
  RepositoryApi
} from "@picteus/ws-client";
import { ApiCallError } from "@picteus/internal-extension-sdk";

import { logger } from "../src/logger";
import { paths } from "../src/paths";
import { Base, Core, Defaults } from "./base";
import { AuthenticationGuard } from "../src/app.guards";
import { WebServicesWrapper } from "./webServicesWrapper";


describe("WebServices", () =>
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
    const apiKey = AuthenticationGuard.generateApiKey();
    AuthenticationGuard.masterApiKey = apiKey;
    DefaultConfig.config = new Configuration({ basePath: paths.webServicesBaseUrl, apiKey });
  }, Core.beforeAfterTimeoutInMilliseconds);

  afterEach(async () =>
  {
    await base.afterEach();
  }, Core.beforeAfterTimeoutInMilliseconds);

  afterAll(async () =>
  {
    await Base.afterAll();
  });

  test("API secret", async () =>
  {
    const scope = "image:read";
    const apiSecret = await new ApiSecretApi().apisecretCreate({
      name: "main",
      type: ApiSecretType.Key,
      scope
    });
    const additionalMessage = "The request failed and the interceptors did not return an alternative response";

    await expect(async () =>
    {
      await new ApiSecretApi(new WebServicesWrapper(undefined).configuration).apisecretCreate({
        name: "second",
        type: ApiSecretType.Key,
        scope
      });
    }).rejects.toThrow(new FetchError(new ApiCallError({
      status: HttpStatus.UNAUTHORIZED,
      code: 1,
      message: "Missing authentication via the HTTP request header 'X-API-KEY'"
    }), additionalMessage));
    await expect(async () =>
    {
      await new ApiSecretApi(new WebServicesWrapper(apiSecret.value).configuration).apisecretCreate({
        name: "second",
        type: ApiSecretType.Key,
        scope
      });
    }).rejects.toThrow(new FetchError(new ApiCallError({
      status: HttpStatus.FORBIDDEN,
      code: 2,
      message: "Forbidden resource"
    }), additionalMessage));
  });

  test("Collections", async () =>
  {
    const apiKey = AuthenticationGuard.generateApiKey();
    AuthenticationGuard.masterApiKey = apiKey;
    const collectionApi = await new WebServicesWrapper(apiKey).computeController<CollectionApi>(CollectionApi);
    const name = "name";
    const collection = await collectionApi.collectionCreate({
      name,
      comment: "comment",
      searchFilter: { criteria: {} }
    });
    expect(collection.name).toEqual(name);
  });

  test("Extension permissions", async () =>
  {
    paths.repositoriesDirectoryPath = base.prepareEmptyDirectory(Defaults.emptyDirectoryName);
    const { image } = await base.prepareRepositoryWithImage(base.imageFeeder.jpegImageFileName, "initial");
    const extension = await base.prepareExtension();
    const extensionDirectoryPath = path.join(paths.installedExtensionsDirectoryPath, extension.manifest.id);
    const webServicesWrapper = new WebServicesWrapper(JSON.parse(fs.readFileSync(path.join(extensionDirectoryPath, Base.extensionParametersFileName), "utf-8"))["apiKey"]);
    const repositoryApi = await webServicesWrapper.computeController<RepositoryApi>(RepositoryApi);
    const newRepository = await repositoryApi.repositoryEnsure({
      technicalId: extension.manifest.id,
      name: "name"
    });
    const imageApi = await webServicesWrapper.computeController<ImageApi>(ImageApi);
    await imageApi.imageSetTags({ id: image.id, extensionId: extension.manifest.id, requestBody: ["tag1"] });
    await imageApi.imageSetFeatures({
      id: image.id,
      extensionId: extension.manifest.id,
      imageFeature: [{ type: ImageFeatureType.Other, format: ImageFeatureFormat.String, name: "name", value: "string" }]
    });
    await imageApi.imageSetEmbeddings({
      id: image.id,
      extensionId: extension.manifest.id,
      imageEmbeddings: { values: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] }
    });
    const blob = await imageApi.imageDownload({ id: image.id });
    try
    {
      await repositoryApi.repositoryStoreImage({ id: newRepository.id, body: blob });
    }
    catch (error)
    {
      // TODO: reactivate this call
      logger.error(error);
    }
  });

});
