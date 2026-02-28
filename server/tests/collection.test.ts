import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "@jest/globals";
import HttpCodes from "http-codes";

import { Base, Core } from "./base";
import { ServiceError } from "../src/app.exceptions";
import {
  Collection,
  FieldLengths,
  ImageFeatureFormat,
  ImageFeatureType,
  ImageFormat,
  SearchCriteria,
  SearchFeatureComparisonOperator,
  SearchFeatureCondition,
  SearchFeatureLogicalOperator,
  SearchFeatures,
  SearchFilter,
  SearchKeyword,
  SearchProperties,
  SearchPropertyRange,
  SearchTags
} from "../src/dtos/app.dtos";


const { BAD_REQUEST } = HttpCodes;


describe("Collections", () =>
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

  const filter: SearchFilter = new SearchFilter(new SearchCriteria([ImageFormat.PNG], new SearchKeyword("keyword", true, false, true), new SearchTags(["tag"]), new SearchFeatures(SearchFeatureLogicalOperator.AND, [new SearchFeatureCondition(ImageFeatureType.IDENTITY, ImageFeatureFormat.STRING, "id", SearchFeatureComparisonOperator.EQUALS, "id")], undefined), new SearchProperties(new SearchPropertyRange(100, 200))));

  const name = "name";

  const comment = "comment";
  test("list", async () =>
  {
    const collections: Collection[] = (await Promise.all(Array.from(Array(10).keys()).map(value => ({
      value,
      sort: Math.random()
    }))
      .sort((object1, objectb) => object1.sort - objectb.sort)
      .map(({ value }) => value).map(index => base.getCollectionController().create(`${name}-${index}`, `${comment}-${index}`, filter))));

    const returnedCollections = await base.getCollectionController().list();
    expect(returnedCollections.length).toEqual(collections.length);
    const sortedCollection = collections.sort((object1, object2) => object1.name.localeCompare(object2.name));
    for (let index = 0; index < sortedCollection.length; index++)
    {
      expect(returnedCollections[index]).toEqual(sortedCollection[index]);
    }
  });

  test("create", async () =>
  {
    {
      // We assess with invalid parameters
      {
        const name = "";
        await expect(async () =>
        {
          await base.getCollectionController().create(name, comment, filter);
        }).rejects.toThrow(new ServiceError(`The parameter 'name' with value '${name}' is invalid because it is empty`, BAD_REQUEST, base.badParameterCode));
      }
      {
        const name = "a".repeat(FieldLengths.name + 1);
        await expect(async () =>
        {
          await base.getCollectionController().create(name, comment, filter);
        }).rejects.toThrow(new ServiceError(`The parameter 'name' with value '${name}' is invalid because it exceeds 128 characters`, BAD_REQUEST, base.badParameterCode));
      }
      {
        const comment = "a".repeat(FieldLengths.comment + 1);
        await expect(async () =>
        {
          await base.getCollectionController().create(name, comment, filter);
        }).rejects.toThrow(new ServiceError(`The parameter 'comment' with value '${comment}' is invalid because it exceeds 1024 characters`, BAD_REQUEST, base.badParameterCode));
      }
    }

    {
      // We assess with valid parameters
      const collection = await base.getCollectionController().create(name, comment, filter);
      expect(collection.name).toEqual(name);
      expect(collection.comment).toEqual(comment);
      expect(collection.filter).toEqual(filter);
      const nowInMilliseconds = Date.now();
      const maximumDeltaMilliseconds = 1_000;
      expect(nowInMilliseconds - collection.creationDate).toBeLessThanOrEqual(maximumDeltaMilliseconds);
      expect(nowInMilliseconds - collection.modificationDate).toBeLessThanOrEqual(maximumDeltaMilliseconds);
    }
  });

  test("get", async () =>
  {
    {
      // We assess with invalid parameters
      {
        const nonExistingId = -1;
        await expect(async () =>
        {
          await base.getCollectionController().get(nonExistingId);
        }).rejects.toThrow(new ServiceError(`The parameter 'id' with value '${nonExistingId}' is invalid because there is no collection with that identifier`, BAD_REQUEST, base.badParameterCode));
      }
    }

    {
      // We assess with valid parameters
      const collection = await base.getCollectionController().create(name, comment, filter);
      const returnedCollection = await base.getCollectionController().get(collection.id);
      expect(returnedCollection).toEqual(collection);
    }
  });

  test("update", async () =>
  {
    const collection = await base.getCollectionController().create(name, comment, filter);

    {
      // We assess with invalid parameters
      {
        const nonExistingId = -1;
        await expect(async () =>
        {
          await base.getCollectionController().update(nonExistingId, name, comment, filter);
        }).rejects.toThrow(new ServiceError(`The parameter 'id' with value '${nonExistingId}' is invalid because there is no collection with that identifier`, BAD_REQUEST, base.badParameterCode));
      }
      {
        const name = "a".repeat(FieldLengths.name + 1);
        await expect(async () =>
        {
          await base.getCollectionController().update(collection.id, name, comment, filter);
        }).rejects.toThrow(new ServiceError(`The parameter 'name' with value '${name}' is invalid because it exceeds 128 characters`, BAD_REQUEST, base.badParameterCode));
      }
      {
        const comment = "a".repeat(FieldLengths.comment + 1);
        await expect(async () =>
        {
          await base.getCollectionController().update(collection.id, name, comment, filter);
        }).rejects.toThrow(new ServiceError(`The parameter 'comment' with value '${comment}' is invalid because it exceeds 1024 characters`, BAD_REQUEST, base.badParameterCode));
      }
    }

    {
      // We assess with valid parameters
      const newName = name + "bis";
      const newComment = comment + "bis";
      const newFilter = new SearchFilter(new SearchCriteria());
      const updatedCollection = await base.getCollectionController().update(collection.id, newName, newComment, newFilter);
      expect(updatedCollection.name).toEqual(newName);
      expect(updatedCollection.comment).toEqual(newComment);
      expect(updatedCollection.filter).toEqual(newFilter);
      expect(updatedCollection.creationDate).toEqual(collection.creationDate);
      expect(updatedCollection.modificationDate).not.toEqual(collection.modificationDate);
      expect(Date.now() - collection.modificationDate).toBeLessThanOrEqual(1_000);
    }
  });

  test("delete", async () =>
  {
    const collection = await base.getCollectionController().create(name, comment, filter);

    {
      // We assess with invalid parameters
      {
        const nonExistingId = -1;
        await expect(async () =>
        {
          await base.getCollectionController().delete(nonExistingId);
        }).rejects.toThrow(new ServiceError(`The parameter 'id' with value '${nonExistingId}' is invalid because there is no collection with that identifier`, BAD_REQUEST, base.badParameterCode));
      }
    }

    {
      // We assess with valid parameters
      await base.getCollectionController().delete(collection.id);
      expect((await base.getCollectionController().list()).length).toEqual(0);
    }
  });

});
