import path from "node:path";
import fs, { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

import { fdir } from "fdir";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "@jest/globals";
import waitForExpect from "wait-for-expect";
import HttpCodes from "http-codes";
import moment from "moment";

import { paths } from "../src/paths";
import {
  ApplicationMetadata,
  ApplicationMetadataItem,
  fileWithProtocol,
  GenerationRecipe,
  Image,
  ImageEmbeddings,
  ImageFeature,
  ImageFeatureFormat,
  ImageFeatureType,
  ImageFormat,
  ImageSummary,
  RepositoryActivityKind,
  RepositoryLocationType,
  RepositoryStatus,
  SearchCriteria,
  SearchProperties,
  SearchPropertyRange,
  SearchRange,
  SearchSorting,
  SearchSortingProperty,
  SearchTags,
  TextualPrompt,
  toFileExtension
} from "../src/dtos/app.dtos";
import { ServiceError } from "../src/app.exceptions";
import { Base, Core, Defaults } from "./base";
import { RepositoryWatcher } from "../src/services/utils/repositoryWatcher";
import { EventEntity, ImageEventAction, Notifier, RepositoryEventAction } from "../src/notifier";
import { computeFormat, readApplicationMetadata, writeMetadata } from "../src/services/utils/images";

const { BAD_REQUEST } = HttpCodes;


describe("Repository", () =>
{

  const base = new Base(false);

  const includedFileNames = [base.imageFeeder.pngImageFileName, base.imageFeeder.jpegImageFileName, "Apparition of the town of Delft.jpg", base.imageFeeder.webpImageFileName, base.imageFeeder.gifImageFileName, base.imageFeeder.avifFileName, base.imageFeeder.heifFileName];

  const nonExistentPath = (process.platform === "win32" ? "C:" : "") + `${path.sep}non-existent${path.sep}path${path.sep}${randomUUID()}`;

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

  test.each([false, true])("Create with watch=%p", async (watch) =>
  {
    const newImageFileName = base.imageFeeder.pngImageFileName;
    const directoryPath = base.prepareEmptyDirectory("images", base.getWorkingDirectoryPath());
    const filePaths = (await new fdir().withFullPaths().glob("**/*").crawl(base.imageFeeder.imagesDirectoryPath).withPromise()).filter((nodePath) =>
    {
      const fileName = path.basename(nodePath);
      return includedFileNames.indexOf(fileName) !== -1 && fileName !== newImageFileName;
    });
    for (const filePath of filePaths)
    {
      fs.copyFileSync(filePath, path.join(directoryPath, path.basename(filePath)));
    }

    const notifier = base.getNotifier();
    const listener = base.computeEventListener();
    notifier.once(EventEntity.Repository, RepositoryEventAction.Created, undefined, listener);
    const url = fileWithProtocol + directoryPath + "/";
    const name = "name-" + randomUUID();
    const comment = "An interesting repository";
    const repository = await base.getRepositoryController().create(Defaults.locationType, url, undefined, name, comment, watch);
    await checkActivity(repository.id, RepositoryActivityKind.Synchronizing);
    await waitForExpect(() =>
    {
      expect(listener).toHaveBeenCalledTimes(1);
    });
    expect(listener).toHaveBeenCalledWith(EventEntity.Repository + Notifier.delimiter + RepositoryEventAction.Created, { id: repository.id });

    expect(repository.type).toBe(Defaults.locationType);
    expect(repository.url).toBe(url.substring(0, url.length - 1));
    expect(repository.name).toBe(name);
    expect(repository.comment).toBe(comment);
    const id = repository.id;
    await base.waitUntilRepositoryReady(id);
    if (watch === true)
    {
      await base.waitUntilRepositoryWatching(id);
    }
    await checkActivity(repository.id, watch === true ? RepositoryActivityKind.Watching : RepositoryActivityKind.None);

    const imageSummaries = await base.getRepositoryController().searchImages(id, {});
    const expectedTotalCount = includedFileNames.length - 1;
    expect(imageSummaries.entities.length).toBe(expectedTotalCount);
    expect(imageSummaries.totalCount).toBe(expectedTotalCount);
    for (const imageSummary of imageSummaries.entities)
    {
      expect(imageSummary.repositoryId).toBe(id);
    }

    // We check that the repository is being watched
    const newImageFilePath = base.imageFeeder.copyImage(directoryPath, newImageFileName);
    const imageUrl = fileWithProtocol + newImageFilePath;
    if (watch === true)
    {
      await base.waitUntil(async () =>
      {
        try
        {
          await base.getRepositoryController().getImageByUrl(imageUrl);
          return true;
        }
        catch (error)
        {
          // The image has not been indexed yet
          return false;
        }
      });
      // We check that this is not possible to declare another repository with the same URL
      await expect(async () =>
      {
        await base.getRepositoryController().create(Defaults.locationType, url, undefined, name + "-new");
      }).rejects.toThrow(new ServiceError(`The parameter 'url' with value '${url}' is invalid because a repository with the same URL already exists`, BAD_REQUEST, base.badParameterCode));
    }
    else
    {
      await base.wait();
      await expect(async () =>
      {
        await base.getRepositoryController().getImageByUrl(imageUrl);
      }).rejects.toThrow(new ServiceError(`The parameter 'url' with value '${imageUrl}' is invalid because there is no image with id '${imageUrl}'`, BAD_REQUEST, base.badParameterCode));
    }
  }, base.largeTimeoutInMilliseconds);

  test("Create with symbolic link", async () =>
  {
    {
      // We assess with a broken directory symbolic link
      const directoryPath = path.join(base.getWorkingDirectoryPath(), "symbolic-link1");
      fs.symlinkSync(nonExistentPath, directoryPath, "dir");
      await expect(async () =>
      {
        await base.getRepositoryController().create(RepositoryLocationType.File, fileWithProtocol + directoryPath, undefined, Defaults.repositoryName, undefined, false);
      }).rejects.toThrow(new ServiceError(`The directory with path '${directoryPath}' is a broken symbolic link`, BAD_REQUEST, base.badParameterCode));
    }
    {
      // We assess with a symbolic link to a file
      const directoryPath = path.join(base.getWorkingDirectoryPath(), "symbolic-link2");
      const filePath = path.join(base.getWorkingDirectoryPath(), "file");
      fs.writeFileSync(filePath, "");
      fs.symlinkSync(filePath, directoryPath, "file");
      await expect(async () =>
      {
        await base.getRepositoryController().create(RepositoryLocationType.File, fileWithProtocol + directoryPath, undefined, Defaults.repositoryName, undefined, false);
      }).rejects.toThrow(new ServiceError(`The directory with path '${directoryPath}' is a symbolic link pointing to the path '${filePath}' which is not a directory`, BAD_REQUEST, base.badParameterCode));
    }
    {
      // We assess with a valid directory symbolic link
      const declaredDirectoryPath = base.prepareEmptyDirectory(Defaults.emptyDirectoryName, base.getWorkingDirectoryPath());
      const symbolicDirectoryPath = path.join(base.getWorkingDirectoryPath(), "symbolic-link3");
      fs.symlinkSync(declaredDirectoryPath, symbolicDirectoryPath, "dir");

      await base.getRepositoryController().create(RepositoryLocationType.File, fileWithProtocol + symbolicDirectoryPath, undefined, Defaults.repositoryName, undefined, false);
    }
  });

  test("Create with mapping paths", async () =>
  {
    const declaredDirectoryPath = base.prepareEmptyDirectory(Defaults.emptyDirectoryName, base.getWorkingDirectoryPath());
    const fileName = base.imageFeeder.pngImageFileName;
    base.imageFeeder.copyImage(declaredDirectoryPath, fileName);
    const symbolicDirectoryPath = path.join(base.getWorkingDirectoryPath(), "symbolic-link");
    fs.symlinkSync(declaredDirectoryPath, symbolicDirectoryPath, "dir");
    const map = new Map<string, string>();
    map.set(declaredDirectoryPath, symbolicDirectoryPath);
    paths.repositoryMappingPaths = map;

    const repository = await base.getRepositoryController().create(RepositoryLocationType.File, fileWithProtocol + symbolicDirectoryPath, undefined, Defaults.repositoryName, undefined, true);
    expect(repository.url).toBe(fileWithProtocol + declaredDirectoryPath);
    await base.waitUntilRepositoryReady(repository.id);
    const list = await base.getImageController().search({});
    const summary = list.entities[0];
    expect(summary.uri).toBe(fileWithProtocol + path.join(declaredDirectoryPath, fileName));
    expect(summary.url).toBe(fileWithProtocol + path.join(symbolicDirectoryPath, fileName));
  });

  test("Create with wrong parameters", async () =>
  {
    const emptyDirectoryPath = base.prepareEmptyDirectory(Defaults.emptyDirectoryName, base.getWorkingDirectoryPath());
    const url = fileWithProtocol + emptyDirectoryPath;

    {
      const name = "";
      await expect(async () =>
      {
        await base.getRepositoryController().create(Defaults.locationType, url, undefined, name);
      }).rejects.toThrow(new ServiceError(`The parameter 'name' with value '${name}' is invalid because it is empty`, BAD_REQUEST, base.badParameterCode));
    }
    {
      const name = "0".repeat(65);
      await expect(async () =>
      {
        await base.getRepositoryController().create(Defaults.locationType, url, undefined, name);
      }).rejects.toThrow(new ServiceError(`The parameter 'name' with value '${name}' is invalid because it exceeds 64 characters`, BAD_REQUEST, base.badParameterCode));
    }

    {
      const comment = "";
      await expect(async () =>
      {
        await base.getRepositoryController().create(Defaults.locationType, url, undefined, Defaults.repositoryName, comment);
      }).rejects.toThrow(new ServiceError(`The parameter 'comment' with value '${comment}' is invalid because it is empty`, BAD_REQUEST, base.badParameterCode));
    }
    {
      const comment = "0".repeat(257);
      await expect(async () =>
      {
        await base.getRepositoryController().create(Defaults.locationType, url, undefined, Defaults.repositoryName, comment);
      }).rejects.toThrow(new ServiceError(`The parameter 'comment' with value '${comment}' is invalid because it exceeds 256 characters`, BAD_REQUEST, base.badParameterCode));
    }
    {
      const directoryPath = nonExistentPath;
      await expect(async () =>
      {
        await base.getRepositoryController().create(Defaults.locationType, fileWithProtocol + directoryPath, undefined, Defaults.repositoryName);
      }).rejects.toThrow(new ServiceError(`The directory with path '${directoryPath}' does not exist`, BAD_REQUEST, base.badParameterCode));
    }
    {
      const filePath = path.join(emptyDirectoryPath, "file");
      fs.writeFileSync(filePath, "");
      await expect(async () =>
      {
        await base.getRepositoryController().create(Defaults.locationType, fileWithProtocol + filePath, undefined, Defaults.repositoryName);
      }).rejects.toThrow(new ServiceError(`The node with path '${filePath}' is not a directory`, BAD_REQUEST, base.badParameterCode));
    }
  });

  test("Create with same name", async () =>
  {
    const emptyDirectoryPath = base.prepareEmptyDirectory(Defaults.emptyDirectoryName, base.getWorkingDirectoryPath());
    const url = fileWithProtocol + emptyDirectoryPath;
    const repository = await base.getRepositoryController().create(Defaults.locationType, url, undefined, Defaults.repositoryName);
    await base.waitUntilRepositoryReady(repository.id);
    await expect(async () =>
    {
      await base.getRepositoryController().create(Defaults.locationType, url, undefined, repository.name);
    }).rejects.toThrow(new ServiceError(`The parameter 'name' with value '${repository.name}' is invalid because a repository with the same name already exists`, BAD_REQUEST, base.badParameterCode));
  });

  test("Create with nested URL", async () =>
  {
    const emptyDirectoryPath = base.prepareEmptyDirectory(Defaults.emptyDirectoryName, base.getWorkingDirectoryPath());
    const subDirectoryName = "sub";
    const subDirectoryPath = base.prepareEmptyDirectory(subDirectoryName, emptyDirectoryPath);
    const url = fileWithProtocol + emptyDirectoryPath;
    const repository = await base.getRepositoryController().create(Defaults.locationType, url, undefined, Defaults.repositoryName + randomUUID());
    await base.waitUntilRepositoryReady(repository.id);
    const subUrl = fileWithProtocol + subDirectoryPath;
    await expect(async () =>
    {
      await base.getRepositoryController().create(Defaults.locationType, subUrl, undefined, Defaults.repositoryName + randomUUID());
    }).rejects.toThrow(new ServiceError(`The repository with id '${repository.id}' is in conflict with the URL '${subUrl}'`, BAD_REQUEST, base.badParameterCode));
    {
      const otherDirectoryPath = base.prepareEmptyDirectory(Defaults.emptyDirectoryName + "-bis", base.getWorkingDirectoryPath());
      const otherRepository = await base.getRepositoryController().create(Defaults.locationType, fileWithProtocol + otherDirectoryPath, undefined, Defaults.repositoryName + randomUUID());
      await base.waitUntilRepositoryReady(otherRepository.id);
    }
  });

  test("Ensure", async () =>
  {
    paths.repositoriesDirectoryPath = base.prepareEmptyDirectory(Defaults.emptyDirectoryName);
    const technicalId = randomUUID().substring(0, 32);

    const repository1 = await base.getRepositoryController().ensure(technicalId, "name1", "comment1", false);
    expect(repository1.technicalId).toBe(technicalId);
    const repository2 = await base.getRepositoryController().ensure(technicalId, "name2", "comment2", false);
    expect(repository2.id).toBe(repository1.id);
    expect(repository2.name).toBe(repository1.name);
    expect(repository2.comment).toBe(repository1.comment);
  });

  test("List repositories", async () =>
  {
    const directory1Path = base.prepareEmptyDirectory("repo1", base.getWorkingDirectoryPath());
    const repository1 = await base.getRepositoryController().create(Defaults.locationType, fileWithProtocol + directory1Path, undefined, "b", undefined, false);
    await base.waitUntilRepositoryReady(repository1.id);
    const directory2Path = base.prepareEmptyDirectory("repo2", base.getWorkingDirectoryPath());
    const repository2 = await base.getRepositoryController().create(Defaults.locationType, fileWithProtocol + directory2Path, undefined, "a", undefined, false);
    await base.waitUntilRepositoryReady(repository2.id);
    const repositories = await base.getRepositoryController().list();
    expect(repositories[0].id).toBe(repository2.id);
    expect(repositories[1].id).toBe(repository1.id);
  });

  test("2 repositories", async () =>
  {
    const name1 = "repo1";
    const name2 = "repo2";
    await base.prepareRepositoryWithImage(base.imageFeeder.pngImageFileName, name1, true);
    await base.prepareRepositoryWithImage(base.imageFeeder.pngImageFileName, name2, true);
    // There was a suspicion that when 2 repositories were created in watch mode, the test fixture was dangling
  });

  test("Search", async () =>
  {
    const directoryPath = base.prepareEmptyDirectory("images", base.getWorkingDirectoryPath());
    const specialImageFilePath = path.join(directoryPath, base.imageFeeder.pngImageFileName);
    const filePaths = (await new fdir().withFullPaths().glob("**/*").filter((nodePath) =>
    {
      const fileName = path.basename(nodePath);
      return fileName !== path.basename(specialImageFilePath) && includedFileNames.indexOf(fileName) !== -1;
    }).crawl(base.imageFeeder.imagesDirectoryPath).withPromise());
    for (const filePath of filePaths)
    {
      const imageFilePath = path.join(directoryPath, path.basename(filePath));
      fs.copyFileSync(filePath, imageFilePath);
    }
    await base.imageFeeder.prepareComfyUiImage(specialImageFilePath);
    const repository = await base.getRepositoryController().create(Defaults.locationType, fileWithProtocol + directoryPath, undefined, Defaults.repositoryName);
    await base.waitUntilRepositoryReady(repository.id);

    {
      const list = await base.getRepositoryController().searchImages(repository.id, { criteria: new SearchCriteria([ImageFormat.JPEG]) });
      const count = 2;
      expect(list.entities.length).toBe(count);
      expect(list.totalCount).toBe(count);
    }
    {
      const mapFunction = (summary: ImageSummary) =>
      {
        return summary.name;
      };
      {
        const list = await base.getRepositoryController().searchImages(repository.id, {
          criteria: new SearchCriteria([ImageFormat.JPEG]),
          sorting: new SearchSorting(SearchSortingProperty.Name)
        });
        expect(list.entities.map(mapFunction)).toEqual(list.entities.map(mapFunction).sort());
      }
      {
        const list = await base.getRepositoryController().searchImages(repository.id, {
          criteria: new SearchCriteria([ImageFormat.JPEG]),
          sorting: new SearchSorting(SearchSortingProperty.Name, false)
        });
        expect(list.entities.map(mapFunction)).toEqual(list.entities.map(mapFunction).sort().reverse());
      }
    }
    {
      const list = await base.getRepositoryController().searchImages(repository.id, { criteria: new SearchCriteria([ImageFormat.PNG]) });
      const count = 1;
      expect(list.entities.length).toBe(count);
      expect(list.totalCount).toBe(count);
    }
    {
      const list = await base.getRepositoryController().searchImages(repository.id, {
        criteria: new SearchCriteria(undefined, {
          text: "Dali",
          inName: true,
          inFeatures: false,
          inMetadata: false
        })
      });
      const count = 1;
      expect(list.entities.length).toBe(count);
      expect(list.totalCount).toBe(count);
    }
    {
      const list = await base.getRepositoryController().searchImages(repository.id, { criteria: new SearchCriteria(undefined, undefined, undefined, undefined) });
      const count = 7;
      expect(list.entities.length).toBe(count);
      expect(list.totalCount).toBe(count);
    }
    {
      const take = 2;
      const list = await base.getRepositoryController().searchImages(repository.id, {
        criteria: new SearchCriteria([ImageFormat.PNG, ImageFormat.JPEG, ImageFormat.WEBP, ImageFormat.GIF]),
        range: new SearchRange(take)
      });
      expect(list.entities.length).toBe(take);
      expect(list.totalCount).toBe(5);
    }
    {
      // We assess the tags
      const extension = await base.prepareExtension();
      const commandTag = "tag";
      const specificTagPrefix = "specific";
      let entities: ImageSummary[];
      {
        entities = (await base.getRepositoryController().searchImages(repository.id, {})).entities;
        let index = 0;
        for (const entity of entities)
        {
          await base.getImageController().setTags(Base.allPolicyContext, entity.id, extension.manifest.id, [commandTag, `${specificTagPrefix}${index++}`]);
        }
      }
      expect((await base.getRepositoryController().searchImages(repository.id, { criteria: new SearchCriteria(undefined, undefined, new SearchTags([commandTag])) })).entities.length).toBe(entities.length);
      expect((await base.getRepositoryController().searchImages(repository.id, { criteria: new SearchCriteria(undefined, undefined, new SearchTags(["inexistentTag"])) })).entities.length).toBe(0);
      for (let index = 0; index < entities.length; index++)
      {
        const entity = entities[index];
        const list = await base.getRepositoryController().searchImages(repository.id, { criteria: new SearchCriteria(undefined, undefined, new SearchTags([`${specificTagPrefix}${index}`])) });
        expect(list.entities.length).toBe(1);
        expect(list.entities[0].id).toBe(entity.id);
      }
    }
    {
      // We assess the properties
      const list = await base.getRepositoryController().searchImages(repository.id, {});

      interface Case
      {
        property: string;
        groupBy: (summary: ImageSummary) => number;
        factory: (minimum: number | undefined, maximum: number | undefined) => SearchProperties;
      }

      const cases: Case[] =
        [
          {
            property: "width",
            groupBy: (summary: ImageSummary) => summary.dimensions.width,
            factory: (minimum: number | undefined, maximum: number | undefined) => new SearchProperties(new SearchPropertyRange(minimum, maximum))
          },
          {
            property: "height",
            groupBy: (summary: ImageSummary) => summary.dimensions.height,
            factory: (minimum: number | undefined, maximum: number | undefined) => new SearchProperties(undefined, new SearchPropertyRange(minimum, maximum))
          },
          {
            property: "weightInBytes",
            groupBy: (summary: ImageSummary) => summary.sizeInBytes,
            factory: (minimum: number | undefined, maximum: number | undefined) => new SearchProperties(undefined, undefined, new SearchPropertyRange(minimum, maximum))
          },
          {
            property: "creationDate",
            groupBy: (summary: ImageSummary) => summary.creationDate,
            factory: (minimum: number | undefined, maximum: number | undefined) => new SearchProperties(undefined, undefined, undefined, new SearchPropertyRange(minimum, maximum))
          },
          {
            property: "modificationDate",
            groupBy: (summary: ImageSummary) => summary.modificationDate,
            factory: (minimum: number | undefined, maximum: number | undefined) => new SearchProperties(undefined, undefined, undefined, undefined, new SearchPropertyRange(minimum, maximum))
          }
        ];
      for (const aCase of cases)
      {
        const perFacetSummariesMap = Object.groupBy(list.entities, summary => aCase.groupBy(summary).toString());
        const increasingFacets = Object.keys(perFacetSummariesMap).sort();
        const sum = increasingFacets.reduce((previousValue, facet) =>
        {
          return previousValue + perFacetSummariesMap[facet]!.length;
        }, 0);
        for (const facet of increasingFacets)
        {
          const facetAsNumber = Number.parseInt(facet);
          const withFacetNumber = perFacetSummariesMap[facet]!.length;
          expect((await base.getRepositoryController().searchImages(repository.id, { criteria: new SearchCriteria(undefined, undefined, undefined, aCase.factory(facetAsNumber, facetAsNumber)) })).entities.length).toBe(withFacetNumber);
          const lowerFacets = increasingFacets.filter(facet => Number.parseInt(facet) <= facetAsNumber);
          const lessThanOrEqualToSum = lowerFacets.reduce((previousValue, facet) =>
          {
            return previousValue + perFacetSummariesMap[facet]!.length;
          }, 0);
          expect((await base.getRepositoryController().searchImages(repository.id, { criteria: new SearchCriteria(undefined, undefined, undefined, aCase.factory(undefined, facetAsNumber)) })).entities.length).toBe(lessThanOrEqualToSum);
          expect((await base.getRepositoryController().searchImages(repository.id, { criteria: new SearchCriteria(undefined, undefined, undefined, aCase.factory(facetAsNumber, undefined)) })).entities.length).toBe(sum - lessThanOrEqualToSum + withFacetNumber);
        }
      }
    }
  });

  test("getTags", async () =>
  {
    const { images } = await base.prepareRepositoryWithImages([base.imageFeeder.pngImageFileName, base.imageFeeder.jpegImageFileName, base.imageFeeder.webpImageFileName]);
    const extension1 = await base.prepareExtension("extension1");
    const extension2 = await base.prepareExtension("extension2");
    const toTagImages = [images[0], images[1]];
    for (const image of toTagImages)
    {
      await base.getImageController().setTags(Base.allPolicyContext, image.id, extension1.manifest.id, ["tag1", image.id]);
      await base.getImageController().setTags(Base.allPolicyContext, image.id, extension2.manifest.id, ["tag2", image.name]);
    }
    await base.getImageController().setTags(Base.allPolicyContext, images[2].id, extension1.manifest.id, []);

    const tags = await base.getRepositoryController().getTags();
    expect(tags.length).toEqual(toTagImages.length * 2 + 2);
    const sortedTags = tags.sort((object1, object2) => object1.id.localeCompare(object2.id));
    expect(sortedTags).toEqual(tags);
  });

  test("Image renamed", async () =>
  {
    const directoryPath = base.prepareEmptyDirectory("images", base.getWorkingDirectoryPath());
    const imageFilePath = base.imageFeeder.copyImage(directoryPath, base.imageFeeder.pngImageFileName);
    const repository = await base.getRepositoryController().create(Defaults.locationType, fileWithProtocol + directoryPath, undefined, Defaults.repositoryName, undefined, true);
    await base.waitUntilRepositoryReady(repository.id);
    await base.waitUntilRepositoryWatching(repository.id);
    const imageSummaries = await base.getRepositoryController().searchImages(repository.id, {});
    expect(imageSummaries.entities.length).toBe(1);
    const imageSummary = imageSummaries.entities[0];

    const notifier = base.getNotifier();
    const listener = base.computeEventListener();
    notifier.once(EventEntity.Image, ImageEventAction.Renamed, undefined, listener);
    const newFilePath = path.join(path.join(imageFilePath, ".."), `${path.basename(imageFilePath)}.${toFileExtension(imageSummary.format)}`);
    fs.renameSync(imageFilePath, newFilePath);
    await waitForExpect(() =>
    {
      expect(listener).toHaveBeenCalledTimes(1);
    });
    expect(listener).toHaveBeenCalledWith(EventEntity.Image + Notifier.delimiter + ImageEventAction.Renamed, { id: imageSummary.id });
  });

  test("Synchronize", async () =>
  {
    const directoryPath = base.prepareEmptyDirectory(Defaults.emptyDirectoryName, base.getWorkingDirectoryPath());
    const preexistingFilePath = path.join(directoryPath, base.imageFeeder.pngImageFileName);
    const newlyAddedFilePath = path.join(directoryPath, "a.file.with.dots.jpeg");
    await base.imageFeeder.prepareComfyUiImage(preexistingFilePath);

    const url = fileWithProtocol + directoryPath;
    const repository = await base.getRepositoryController().create(Defaults.locationType, url, undefined, Defaults.repositoryName);
    await checkActivity(repository.id, RepositoryActivityKind.Synchronizing);

    const id = repository.id;
    await expect(async () =>
    {
      await base.getRepositoryController().synchronize(id);
    }).rejects.toThrow(new ServiceError(`The repository with id '${id}' is already synchronizing`, BAD_REQUEST, base.badParameterCode));

    let preexistingImage: Image | undefined;
    {
      await base.waitUntilRepositoryReady(id);
      const imageSummaries = await base.getRepositoryController().searchImages(id, {});
      preexistingImage = await base.getImageController().get(imageSummaries.entities[0].id);
    }
    const notifier = base.getNotifier();
    {
      // We add a file
      const listener = base.computeEventListener();
      notifier.once(EventEntity.Image, ImageEventAction.Created, undefined, listener);
      fs.copyFileSync(path.join(base.imageFeeder.imagesDirectoryPath, base.imageFeeder.jpegImageFileName), newlyAddedFilePath);
      await base.getRepositoryController().synchronize(id);
      await checkActivity(id, RepositoryActivityKind.Synchronizing);
      await base.waitUntilRepositoryReady(id);
      await checkActivity(id, RepositoryActivityKind.None);

      const imageSummaries = await base.getRepositoryController().searchImages(id, {});
      expect(imageSummaries.entities.length).toBe(2);
      await waitForExpect(() =>
      {
        expect(listener).toHaveBeenCalledTimes(1);
      });
      expect(listener).toHaveBeenCalledWith(EventEntity.Image + Notifier.delimiter + ImageEventAction.Created, {
        id: (imageSummaries.entities.find((imageSummary) =>
        {
          return imageSummary.url === fileWithProtocol + newlyAddedFilePath;
        }))!.id
      });
    }
    {
      // We delete a file
      const extensionId = "extensionId";
      // We introduce fake embeddings for a supposedly existing extension
      await base.getVectorDatabaseAccessor().setEmbeddings(preexistingImage.id, extensionId, [1, 2, 3]);
      const listener = base.computeEventListener();
      notifier.once(EventEntity.Image, ImageEventAction.Deleted, undefined, listener);
      fs.rmSync(preexistingFilePath);
      await base.getRepositoryController().synchronize(id);
      await base.waitUntilRepositoryReady(id);
      const imageSummaries = await base.getRepositoryController().searchImages(id, {});
      expect(imageSummaries.entities.length).toBe(1);
      await waitForExpect(() =>
      {
        expect(listener).toHaveBeenCalledTimes(1);
      });
      expect(listener).toHaveBeenCalledWith(EventEntity.Image + Notifier.delimiter + ImageEventAction.Deleted, {
        id: preexistingImage.id
      });
      expect(await base.getVectorDatabaseAccessor().getEmbeddings(preexistingImage.id, extensionId)).toBeUndefined();
    }
    {
      // We update a file and change its metadata
      const listener = base.computeEventListener();
      notifier.once(EventEntity.Image, ImageEventAction.Updated, undefined, listener);
      const filePath = newlyAddedFilePath;
      const accessDate = fs.statSync(filePath).atime;
      const exifDate = new Date();
      exifDate.setMilliseconds(0);
      const momentObject = moment(exifDate);
      const exifDateValue = momentObject.format("YYYY:MM:DD HH:mm:ss");
      // See https://exiftool.org/TagNames/EXIF.html
      const exifDateOffset = `${momentObject.utcOffset() < 0 ? "-" : ""}${(momentObject.utcOffset() / 60).toString().padStart(2, "0")}:${(momentObject.utcOffset() % 60).toString().padStart(2, "0")}`;
      const metadata =
        {
          0x9003: exifDateValue,
          0x9011: exifDateOffset
        };
      fs.writeFileSync(filePath, await writeMetadata(filePath, ImageFormat.JPEG, metadata));
      const now = new Date();
      fs.utimesSync(filePath, accessDate, now);
      await base.getRepositoryController().synchronize(id);
      await base.waitUntilRepositoryReady(id);
      const imageSummaries = await base.getRepositoryController().searchImages(id, {});
      const image = await base.getImageController().get(imageSummaries.entities[0].id);
      expect(image.fileDates.modificationDate).toBe(now.getTime());
      expect(image.modificationDate).toBeGreaterThan(now.getTime());
      expect(image.metadata.exif).toBeDefined();
      const exif = JSON.parse(image.metadata.exif!);
      expect(exif["DateTimeOriginal"]).toBe(exifDate.toISOString());
      expect(exif["OffsetTimeOriginal"]).toBe(exifDateOffset);
      await waitForExpect(() =>
      {
        expect(listener).toHaveBeenCalledTimes(1);
      });
      expect(listener).toHaveBeenCalledWith(EventEntity.Image + Notifier.delimiter + ImageEventAction.Updated, { id: image.id });
    }
  }, base.largeTimeoutInMilliseconds);

  test("Watch", async () =>
  {
    const directoryPath = base.prepareEmptyDirectory(Defaults.emptyDirectoryName, base.getWorkingDirectoryPath());
    const preexistingFilePath = base.imageFeeder.copyImage(directoryPath, base.imageFeeder.pngImageFileName);
    const newlyAddedFilePath = path.join(directoryPath, "a.file.with.dots.jpeg");

    const url = fileWithProtocol + directoryPath;
    const repository = await base.getRepositoryController().create(Defaults.locationType, url, undefined, Defaults.repositoryName);

    const id = repository.id;
    await base.waitUntilRepositoryReady(id);
    await base.getRepositoryController().watch(id, true);
    await checkActivity(id, RepositoryActivityKind.Watching);

    const notifier = base.getNotifier();
    let newlyAddedImageSummary: ImageSummary;
    {
      // We add a file
      const listener = base.computeEventListener();
      notifier.once(EventEntity.Image, ImageEventAction.Created, undefined, listener);
      fs.copyFileSync(path.join(base.imageFeeder.imagesDirectoryPath, base.imageFeeder.jpegImageFileName), newlyAddedFilePath);
      newlyAddedImageSummary = await base.waitUntilImage(id, newlyAddedFilePath, true);
      await waitForExpect(() =>
      {
        expect(listener).toHaveBeenCalledTimes(1);
      });
      expect(listener).toHaveBeenCalledWith(EventEntity.Image + Notifier.delimiter + ImageEventAction.Created, { id: newlyAddedImageSummary.id });
    }
    {
      // We delete a file
      const preexistingImage = await base.getRepositoryController().getImageByUrl(fileWithProtocol + preexistingFilePath);
      const extensionId = "extensionId";
      // We introduce fake embeddings for a supposedly existing extension
      await base.getVectorDatabaseAccessor().setEmbeddings(preexistingImage.id, extensionId, [1, 2, 3]);
      const listener = base.computeEventListener();
      notifier.once(EventEntity.Image, RepositoryEventAction.Deleted, undefined, listener);
      const imageSummary = await base.waitUntilImage(id, preexistingFilePath, false, () =>
      {
        fs.rmSync(preexistingFilePath);
      });
      await waitForExpect(() =>
      {
        expect(listener).toHaveBeenCalledTimes(1);
      });
      expect(listener).toHaveBeenCalledWith(EventEntity.Image + Notifier.delimiter + ImageEventAction.Deleted, { id: imageSummary.id });
      expect(await base.getVectorDatabaseAccessor().getEmbeddings(preexistingImage.id, extensionId)).toBeUndefined();
    }
    {
      // We update a file
      const listener = base.computeEventListener();
      notifier.once(EventEntity.Image, ImageEventAction.Updated, undefined, listener);
      const now = new Date();
      fs.utimesSync(newlyAddedFilePath, now, now);

      await base.waitUntil(async () =>
      {
        return (await base.getImageController().get(newlyAddedImageSummary.id)).fileDates.modificationDate !== newlyAddedImageSummary.fileDates.modificationDate;
      });

      const image = await base.getImageController().get(newlyAddedImageSummary.id);
      expect(image.modificationDate).toBeGreaterThan(newlyAddedImageSummary.modificationDate);
      expect(image.fileDates.modificationDate).toBeGreaterThan(newlyAddedImageSummary.fileDates.modificationDate);
      expect(image.creationDate).toBe(newlyAddedImageSummary.creationDate);
      expect(image.fileDates.creationDate).toBe(newlyAddedImageSummary.fileDates.creationDate);
      await waitForExpect(() =>
      {
        expect(listener).toHaveBeenCalledTimes(1);
      });
      expect(listener).toHaveBeenCalledWith(EventEntity.Image + Notifier.delimiter + ImageEventAction.Updated, { id: image.id });
    }
  }, base.largeTimeoutInMilliseconds);

  test("startOrStop", async () =>
  {
    const directoryPath = base.prepareEmptyDirectory(Defaults.emptyDirectoryName, base.getWorkingDirectoryPath());
    const url = fileWithProtocol + directoryPath;
    const repository = await base.getRepositoryController().create(Defaults.locationType, url, undefined, Defaults.repositoryName);
    const id = repository.id;
    await base.waitUntilRepositoryReady(id);

    await base.getRepositoryController().startOrStop(true);

    // We add a file
    const filePath = base.imageFeeder.copyImage(directoryPath, base.imageFeeder.jpegImageFileName);
    await base.waitUntilImage(id, filePath, true);

    await base.getRepositoryController().startOrStop(false);
    expect(RepositoryWatcher.get(id)).toBeUndefined();
  });

  test("unavailable", async () =>
  {
    const directoryPath = base.prepareEmptyDirectory(Defaults.emptyDirectoryName, base.getWorkingDirectoryPath());
    const url = fileWithProtocol + directoryPath;
    const repository = await base.getRepositoryController().create(Defaults.locationType, url, undefined, Defaults.repositoryName);
    const id = repository.id;
    await base.waitUntilRepositoryReady(id);

    const newDirectoryPath = directoryPath + "-renamed";
    {
      await base.restart(async () =>
      {
        fs.renameSync(directoryPath, newDirectoryPath);
      });
      expect((await base.getRepositoryController().get(repository.id)).status).toEqual(RepositoryStatus.UNAVAILABLE);
      const activities = await base.getRepositoryController().activities();
      expect(activities.length).toEqual(1);
      expect(activities[0].id).toEqual(id);
      expect(activities[0].kind).toEqual(RepositoryActivityKind.None);
      const serviceError = new ServiceError(`The repository with id '${repository.id}' is not available`, BAD_REQUEST, base.badParameterCode);
      await expect(async () =>
      {
        await base.getRepositoryController().storeImage(repository.id, "name", undefined, undefined, undefined, undefined, fs.readFileSync(path.join(base.imageFeeder.imagesDirectoryPath, base.imageFeeder.jpegImageFileName)));
      }).rejects.toThrow(serviceError);
      await expect(async () =>
      {
        await base.getRepositoryController().synchronize(repository.id);
      }).rejects.toThrow(serviceError);
      await expect(async () =>
      {
        await base.getRepositoryController().watch(repository.id, true);
      }).rejects.toThrow(serviceError);
    }
    {
      await base.restart(async () =>
      {
        fs.renameSync(newDirectoryPath, directoryPath);
      });
      expect((await base.getRepositoryController().get(repository.id)).status).toEqual(RepositoryStatus.READY);
    }
  });

  test("Watch with wrong conditions", async () =>
  {
    const directoryPath = base.prepareEmptyDirectory(Defaults.emptyDirectoryName, base.getWorkingDirectoryPath());

    const url = fileWithProtocol + directoryPath;
    const repository = await base.getRepositoryController().create(Defaults.locationType, url, undefined, Defaults.repositoryName);
    const id = repository.id;
    await base.waitUntilRepositoryReady(id);

    // We try to watch a repository while it is synchronizing
    await base.getRepositoryController().synchronize(id);
    await expect(async () =>
    {
      await base.getRepositoryController().watch(id, true);
    }).rejects.toThrow(new ServiceError(`The repository with id '${id}' is synchronizing`, BAD_REQUEST, base.badParameterCode));

    await base.waitUntilRepositoryReady(id);
    await expect(async () =>
    {
      await base.getRepositoryController().watch(id, false);
    }).rejects.toThrow(new ServiceError(`There is no watcher for the repository with id '${id}'`, BAD_REQUEST, base.badParameterCode));
  });

  test("Watch and synchronize", async () =>
  {
    const directoryPath = base.prepareEmptyDirectory(Defaults.emptyDirectoryName, base.getWorkingDirectoryPath());
    const url = fileWithProtocol + directoryPath;
    const repository = await base.getRepositoryController().create(Defaults.locationType, url, undefined, Defaults.repositoryName);

    const id = repository.id;
    await base.waitUntilRepositoryReady(id);
    await base.getRepositoryController().watch(id, true);

    // The synchronization should work…
    await base.getRepositoryController().synchronize(id);
    await base.waitUntilRepositoryReady(id);
    // … and since the repository was being watched, it should resume and should be stoppable
    await base.getRepositoryController().watch(id, false);
  });

  test("Delete", async () =>
  {
    const directoryPath = base.prepareEmptyDirectory(Defaults.emptyDirectoryName, base.getWorkingDirectoryPath());
    base.imageFeeder.copyImage(directoryPath, base.imageFeeder.pngImageFileName);
    const repository = await base.getRepositoryController().create(Defaults.locationType, fileWithProtocol + directoryPath, undefined, Defaults.repositoryName);
    const repositoryId = repository.id;
    await expect(async () =>
    {
      await base.getRepositoryController().delete(repositoryId);
    }).rejects.toThrow(new ServiceError(`Cannot delete a repository which is synchronizing`, BAD_REQUEST, base.badParameterCode));
    await base.waitUntilRepositoryReady(repositoryId);
    const imageSummary = (await base.getRepositoryController().searchImages(repositoryId, {})).entities[0];

    const extension = await base.prepareExtension();
    await base.getImageController().setTags(Base.allPolicyContext, imageSummary.id, extension.manifest.id, ["tag"]);
    await base.getImageController().setFeatures(Base.allPolicyContext, imageSummary.id, extension.manifest.id, [new ImageFeature(ImageFeatureType.CAPTION, ImageFeatureFormat.STRING, "name", "string")]);
    await base.getImageController().setEmbeddings(Base.allPolicyContext, imageSummary.id, extension.manifest.id, new ImageEmbeddings([1, 2, 3]));

    const notifier = base.getNotifier();
    const repositoryListener = base.computeEventListener();
    notifier.once(EventEntity.Repository, RepositoryEventAction.Deleted, undefined, repositoryListener);
    const imageListener = base.computeEventListener();
    notifier.on(EventEntity.Image, ImageEventAction.Deleted, undefined, imageListener);
    await base.getRepositoryController().delete(repositoryId);

    expect((await base.getImageController().search({})).entities.length).toBe(0);
    expect((await base.getEntitiesProvider().imageMetadata.findMany()).length).toBe(0);
    expect((await base.getEntitiesProvider().imageTag.findMany()).length).toBe(0);
    expect((await base.getEntitiesProvider().imageFeature.findMany()).length).toBe(0);
    expect(await base.getVectorDatabaseAccessor().getEmbeddings(imageSummary.id, extension.manifest.id)).toBeUndefined();
    await waitForExpect(() =>
    {
      expect(imageListener).toHaveBeenCalledTimes(1);
    });
    expect(imageListener).toHaveBeenCalledWith(EventEntity.Image + Notifier.delimiter + ImageEventAction.Deleted, { id: imageSummary.id });
    expect(repositoryListener).toHaveBeenCalledTimes(1);
    expect(repositoryListener).toHaveBeenCalledWith(EventEntity.Repository + Notifier.delimiter + RepositoryEventAction.Deleted, { id: repositoryId });

    await expect(async () =>
    {
      await base.getRepositoryController().delete(repositoryId);
    }).rejects.toThrow(new ServiceError(`The parameter 'id' with value '${repositoryId}' is invalid because there is no repository with that identifier`, BAD_REQUEST, base.badParameterCode));
  });

  test("Get nonexistent", async () =>
  {
    const directoryPath = nonExistentPath;
    await expect(async () =>
    {
      await base.getRepositoryController().create(Defaults.locationType, fileWithProtocol + directoryPath, undefined, Defaults.repositoryName);
    }).rejects.toThrow(new ServiceError(`The directory with path '${directoryPath}' does not exist`, BAD_REQUEST, base.badParameterCode));
  });

  test("Notify", async () =>
  {
    const started = "started";
    const stopped = "stopped";
    const events: string[] = [];
    const values: object[] = [];
    const commonListener = (event: string, value: object) =>
    {
      events.push(event);
      values.push(value);
      return Promise.resolve();
    };
    const notifier = base.getNotifier();
    const listener = notifier.on(EventEntity.Repository, RepositoryEventAction.Created, undefined, commonListener);
    notifier.on(EventEntity.Repository, RepositoryEventAction.Synchronize, started, commonListener);
    notifier.on(EventEntity.Repository, RepositoryEventAction.Synchronize, stopped, commonListener);

    const directoryPath = base.getWorkingDirectoryPath();
    const repository = await base.getRepositoryController().create(Defaults.locationType, fileWithProtocol + directoryPath, undefined, Defaults.repositoryName);
    const repositoryId = repository.id;
    await base.waitUntilRepositoryReady(repositoryId);
    listener.off();

    await waitForExpect(() =>
    {
      expect(events.length).toBe(3);
    });
    expect(events[0]).toBe(EventEntity.Repository + Notifier.delimiter + RepositoryEventAction.Created);
    expect(events[1]).toBe(EventEntity.Repository + Notifier.delimiter + RepositoryEventAction.Synchronize + Notifier.delimiter + started);
    expect(events[2]).toBe(EventEntity.Repository + Notifier.delimiter + RepositoryEventAction.Synchronize + Notifier.delimiter + stopped);
    for (const value of values)
    {
      expect(value).toEqual({ id: repositoryId });
    }
  });

  test("Rename image", async () =>
  {
    const { repository, image } = await base.prepareRepositoryWithImage(base.imageFeeder.jpegImageFileName);
    const fileDirectoryPath = path.dirname(image.url.substring(fileWithProtocol.length));

    {
      // We assess with invalid parameters
      {
        // We assess with an invalid file name without extension
        const namesWithoutExtension = ["path/name"];
        for (const nameWithoutExtension of namesWithoutExtension)
        {
          await expect(async () =>
          {
            await base.getRepositoryController().renameImage(repository.id, image.id, nameWithoutExtension, undefined);
          }).rejects.toThrow(new ServiceError(`The parameter 'nameWithoutExtension' with value '${nameWithoutExtension}' is invalid because it contains illegal characters`, BAD_REQUEST, base.badParameterCode));
        }
      }
      {
        // We assess with an invalid directory relative path
        {
          const relativeDirectoryPaths = ["/", "/file", "/path/file"];
          for (const relativeDirectoryPath of relativeDirectoryPaths)
          {
            await expect(async () =>
            {
              await base.getRepositoryController().renameImage(repository.id, image.id, "newName", relativeDirectoryPath);
            }).rejects.toThrow(new ServiceError(`The parameter 'relativeDirectoryPath' with value '${relativeDirectoryPath}' is invalid because it starts with a '/'`, BAD_REQUEST, base.badParameterCode));
          }
        }
        {
          const relativeDirectoryPaths = ["..", "name/../..", "name/path/../../../other/path", `../${path.basename(fileDirectoryPath)}/directory`];
          for (const relativeDirectoryPath of relativeDirectoryPaths)
          {
            await expect(async () =>
            {
              await base.getRepositoryController().renameImage(repository.id, image.id, "newName", relativeDirectoryPath);
            }).rejects.toThrow(new ServiceError(`The parameter 'relativeDirectoryPath' with value '${relativeDirectoryPath}' is invalid because it is a traversal path pointing to a location higher that the repository's on the file system`, BAD_REQUEST, base.badParameterCode));
          }
        }
      }
    }
    {
      // We assess with valid parameters
      const fileExtension = path.extname(image.name);
      {
        const namesWithoutExtension = ["newName", ".newName", "newName.dot", "newNameWith'"];
        for (const nameWithoutExtension of namesWithoutExtension)
        {
          const renamedImage = await base.getRepositoryController().renameImage(repository.id, image.id, nameWithoutExtension, undefined);
          const newFileName = nameWithoutExtension + fileExtension;
          expect(renamedImage.name).toEqual(newFileName);
          expect(renamedImage.url).toEqual(fileWithProtocol + path.join(fileDirectoryPath, newFileName));
        }
      }
      {
        const relativeDirectoryPaths = ["path\\directory", "path/directory", "path/../directory", "path\\..\\directory"];
        const nameWithoutExtension = "name";
        for (const relativeDirectoryPath of relativeDirectoryPaths)
        {
          const renamedImage = await base.getRepositoryController().renameImage(repository.id, image.id, nameWithoutExtension, relativeDirectoryPath);
          const newFileName = nameWithoutExtension + fileExtension;
          expect(renamedImage.name).toEqual(newFileName);
          expect(renamedImage.url).toEqual(fileWithProtocol + path.resolve(fileDirectoryPath, relativeDirectoryPath, newFileName));
        }
      }
    }
  });

  test("Store image", async () =>
  {
    const extension = await base.prepareExtension();
    const {
      repository,
      image: existingImage
    } = await base.prepareRepositoryWithImage(base.imageFeeder.pngImageFileName);
    const noUserCommentBuffer = readFileSync(path.join(base.imageFeeder.imagesDirectoryPath, base.imageFeeder.jpegImageFileName));

    {
      // We assess with invalid values
      {
        const nameWithoutExtension = "../file";
        await expect(async () =>
        {
          await base.getRepositoryController().storeImage(repository.id, nameWithoutExtension, undefined, undefined, undefined, undefined, noUserCommentBuffer);
        }).rejects.toThrow(new ServiceError(`The parameter 'nameWithoutExtension' with value '${nameWithoutExtension}' is invalid because it contains illegal characters`, BAD_REQUEST, base.badParameterCode));
      }
      {
        const relativeDirectoryPath = "..";
        await expect(async () =>
        {
          await base.getRepositoryController().storeImage(repository.id, undefined, relativeDirectoryPath, undefined, undefined, undefined, noUserCommentBuffer);
        }).rejects.toThrow(new ServiceError(`The parameter 'relativeDirectoryPath' with value '${relativeDirectoryPath}' is invalid because it is a traversal path pointing to a location higher that the repository's on the file system`, BAD_REQUEST, base.badParameterCode));
      }
      {
        await expect(async () =>
        {
          await base.getRepositoryController().storeImage(repository.id, undefined, undefined, undefined, undefined, undefined, Buffer.alloc(base.imageMaximumBinaryWeightInBytes + 1));
        }).rejects.toThrow(new ServiceError(`The provided image exceeds the maximum allowed binary weight of ${base.imageMaximumBinaryWeightInBytes} bytes`, BAD_REQUEST, base.badParameterCode));
      }
    }

    const withUserCommentFilePath = path.join(base.getWorkingDirectoryPath(), `image-${randomUUID()}`);
    await base.imageFeeder.prepareAutomatic1111Image(withUserCommentFilePath);
    const withUserCommentBuffer = readFileSync(withUserCommentFilePath);
    const buffers = [noUserCommentBuffer, withUserCommentBuffer];
    const metadataArray = [undefined, new ApplicationMetadata([new ApplicationMetadataItem(extension.manifest.id, new GenerationRecipe([], new TextualPrompt("prompt")))]), new ApplicationMetadata([new ApplicationMetadataItem(extension.manifest.id, { key: "value" })])];

    {
      // We assess with metadata referring to an unexisting extension
      const extensionId = "inexistent";
      await expect(async () =>
      {
        await base.getRepositoryController().storeImage(repository.id, undefined, undefined, JSON.stringify(new ApplicationMetadata([new ApplicationMetadataItem(extensionId, {})])), undefined, undefined, noUserCommentBuffer);
      }).rejects.toThrow(new ServiceError(`The parameter 'applicationMetadata.items[0]' with value '${extensionId}' is invalid because that extension is not installed`, BAD_REQUEST, base.badParameterCode));
    }

    let imagesCount = 1;
    let index = 0;
    for (const buffer of buffers)
    {
      for (const metadata of metadataArray)
      {
        const stringifiedMetadata = JSON.stringify(metadata);
        const parentImageId = existingImage.id;
        const sourceUrl = "https://inovexus.com/wp-content/uploads/2024/09/Inovexus_Aive.png";
        const imageFormat = await computeFormat(buffer);
        const suffix = `-${imageFormat}-${metadata === undefined ? "no" : "with"}-metadata-${index++}`;
        const nameWithoutExtension = `nameWithoutExtension${suffix}`;
        const fileName = nameWithoutExtension + "." + toFileExtension(imageFormat);
        const pathSeparator = path.sep;
        {
          const originalApplicationMetadata = await readApplicationMetadata(buffer, imageFormat);
          expect(originalApplicationMetadata).toBeUndefined();
          const listener = base.computeEventListener();
          base.getNotifier().once(EventEntity.Image, ImageEventAction.Created, undefined, listener);
          const image = await base.getRepositoryController().storeImage(repository.id, nameWithoutExtension, undefined, stringifiedMetadata, parentImageId, sourceUrl, buffer);
          expect(listener).toHaveBeenCalledWith(EventEntity.Image + Notifier.delimiter + ImageEventAction.Created, { id: image.id });
          imagesCount++;
          expect(image.repositoryId).toBe(repository.id);
          expect(image.format).toBe(imageFormat);
          expect(image.name).toBe(fileName);
          expect(image.url).toBe(`${repository.url}${pathSeparator}${fileName}`);
          expect(image.sourceUrl).toBe(sourceUrl);
          expect(image.parentId).toBe(parentImageId);
          expect((await base.getRepositoryController().searchImages(repository.id, {})).totalCount).toBe(imagesCount);
          const newApplicationMetadata = await readApplicationMetadata(fs.readFileSync(image.url.substring(fileWithProtocol.length)), imageFormat);
          expect(newApplicationMetadata).toEqual(metadata);
        }
        {
          const relativeDirectoryPath = `relative${pathSeparator}path`;
          const image = await base.getRepositoryController().storeImage(repository.id, nameWithoutExtension, relativeDirectoryPath, stringifiedMetadata, parentImageId, sourceUrl, buffer);
          imagesCount++;
          expect(image.repositoryId).toBe(repository.id);
          expect(image.format).toBe(imageFormat);
          expect(image.url).toBe(`${repository.url}${pathSeparator}${relativeDirectoryPath}${pathSeparator}${fileName}`);
          expect(image.name).toBe(nameWithoutExtension + "." + toFileExtension(imageFormat));
        }
        {
          const image = await base.getRepositoryController().storeImage(repository.id, undefined, undefined, stringifiedMetadata, parentImageId, sourceUrl, buffer);
          imagesCount++;
          expect(image.repositoryId).toBe(repository.id);
          expect(image.format).toBe(imageFormat);
          expect(image.url).toBe(`${repository.url}${pathSeparator}${image.name}`);
          expect(image.name.startsWith("image-")).toBeTruthy();
        }

        await expect(async () =>
        {
          await base.getRepositoryController().storeImage(repository.id, nameWithoutExtension, undefined, stringifiedMetadata, parentImageId, sourceUrl, buffer);
        }).rejects.toThrow(new ServiceError(`The parameter 'nameWithoutExtension' with value '${nameWithoutExtension}' is invalid because a file with the same name already exists in the repository`, BAD_REQUEST, base.badParameterCode));

        await expect(async () =>
        {
          await base.getRepositoryController().storeImage(repository.id, undefined, undefined, stringifiedMetadata, parentImageId, sourceUrl, Buffer.from("dummyString"));
        }).rejects.toThrow(new ServiceError("The provided file is not a supported image. Reason: 'Unable to parse the image metadata. Reason: 'Input buffer contains unsupported image format''", BAD_REQUEST, base.badParameterCode));
      }
    }
  }, 3 * Base.defaultTimeoutInMilliseconds);

  test("Application metadata", async () =>
  {
    const extension1 = await base.prepareExtension("id1");
    const extension2 = await base.prepareExtension("id2");
    const repository = await base.prepareEmptyRepository();
    const item1 = new ApplicationMetadataItem(extension1.manifest.id, new GenerationRecipe(["model1"], new TextualPrompt("prompt1")));
    const item2 = new ApplicationMetadataItem(extension2.manifest.id, { key: "value" });

    const imageBuffer = readFileSync(path.join(base.imageFeeder.imagesDirectoryPath, base.imageFeeder.jpegImageFileName));
    const image = await base.getRepositoryController().storeImage(repository.id, undefined, undefined, JSON.stringify(new ApplicationMetadata([item1])), undefined, undefined, imageBuffer);
    const storedBuffer = fs.readFileSync(image.url.substring(fileWithProtocol.length));
    const newImage = await base.getRepositoryController().storeImage(repository.id, undefined, undefined, JSON.stringify(new ApplicationMetadata([item2])), undefined, undefined, storedBuffer);
    const applicationMetadata = await readApplicationMetadata(fs.readFileSync(newImage.url.substring(fileWithProtocol.length)), newImage.format);
    expect(applicationMetadata).toEqual(new ApplicationMetadata([item1, item2]));
  });

  async function checkActivity(repositoryId: string, kind: RepositoryActivityKind)
  {
    const activities = await base.getRepositoryController().activities();
    const repositoryActivity = activities.find((activity) =>
    {
      return activity.id === repositoryId;
    });
    expect(repositoryActivity).toBeDefined();
    expect(repositoryActivity!.kind).toEqual(kind);
  }

});
