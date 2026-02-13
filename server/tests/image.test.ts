import path from "node:path";
import fs from "node:fs";
import { buffer as streamBuffer } from "node:stream/consumers";
import { randomUUID } from "node:crypto";

import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "@jest/globals";
import HttpCodes from "http-codes";

import { paths } from "../src/paths";
import { computeAttachmentDisposition } from "../src/services/utils/downloader";
import {
  ApplicationMetadata,
  ApplicationMetadataItem,
  CommandEntity,
  FieldLengths,
  fileWithProtocol,
  GenerationRecipe,
  Image,
  ImageEmbeddings,
  ImageFeature,
  ImageFeatureFormat,
  ImageFeatureType,
  ImageFormat,
  ImageFormats,
  ImageResizeRender,
  InstructionsPrompt,
  ManifestCapabilityId,
  ManifestEvent,
  NumericRange,
  TextualPrompt,
  toFileExtension,
  toMimeType
} from "../src/dtos/app.dtos";
import { toImageFormat } from "../src/bos";
import {
  applicationMetadataPropertyName,
  computeFormat,
  ImageMetadataAlgorithm,
  jpegUserCommentId,
  jpegUserCommentName,
  readApplicationMetadata,
  readMetadata,
  resize,
  ResizeRender,
  stripMetadata,
  writeApplicationMetadata,
  writeMetadata
} from "../src/services/utils/images";
import { ServiceError } from "../src/app.exceptions";
import { ImageAttachmentService } from "../src/services/app.service";
import { Base, Core, Defaults, ImageFeeder } from "./base";
import { EventEntity, ImageEventAction, Notifier } from "../src/notifier";

const { OK, BAD_REQUEST } = HttpCodes;


type ImageCase = {
  format: ImageFormat,
  fileName: string,
  caption: string,
  width: number,
  height: number,
  metadataItem?: { key: string, value: string | number }
};

const imageFeeder = new ImageFeeder();
const imageCases: ImageCase[] =
  [
    {
      format: ImageFormat.PNG,
      fileName: imageFeeder.pngImageFileName,
      caption: "a painting of a man holding a gun",
      width: 1024,
      height: 1024,
      metadataItem: { key: "ColorType", value: "Palette" }
    },
    {
      format: ImageFormat.JPEG,
      fileName: imageFeeder.jpegImageFileName,
      caption: "a statue of a bear in a bath tub",
      width: 800,
      height: 744,
      metadataItem: { key: "JFIFVersion", value: 257 }
    },
    {
      format: ImageFormat.WEBP,
      fileName: imageFeeder.webpImageFileName,
      caption: "a woman is standing in front of a table with a white table cloth",
      width: 536,
      height: 423
    },
    {
      format: ImageFormat.GIF,
      fileName: imageFeeder.gifImageFileName,
      caption: "a painting of a boat and a bird",
      width: 480,
      height: 365
    },
    {
      format: ImageFormat.AVIF,
      fileName: imageFeeder.avifFileName,
      caption: "a parrot is standing on a colorful background",
      width: 1000,
      height: 667
    },
    {
      format: ImageFormat.HEIF,
      fileName: imageFeeder.heifFileName,
      caption: "a rocky mountain with a mountain range",
      width: 640,
      height: 426,
      metadataItem: { key: "ResolutionUnit", value: "inches" }
    }
  ];

describe("Image bare", () =>
{

  const core = new Core();

  const imageFeeder = new ImageFeeder();

  beforeAll(async () =>
  {
    await Core.beforeAll();
  });

  beforeEach(async () =>
  {
    await core.beforeEach();
  }, Core.beforeAfterTimeoutInMilliseconds);

  afterEach(async () =>
  {
    await core.afterEach();
  }, Core.beforeAfterTimeoutInMilliseconds);

  afterAll(async () =>
  {
    await Core.afterAll();
  });

  interface ImageCase
  {
    fileName: string;
    exif: boolean;
    userComment: string | undefined;
    icc: boolean;
    iptc: boolean;
    xmp: boolean;
  }

  test.each(
    [
      {
        fileName: imageFeeder.pngImageFileName,
        exif: false,
        userComment: undefined,
        icc: false,
        iptc: false,
        xmp: false
      },
      {
        fileName: imageFeeder.jpegImageFileName,
        exif: false,
        userComment: undefined,
        icc: false,
        iptc: false,
        xmp: false
      },
      { fileName: "image-IPTC.jpg", exif: true, userComment: undefined, icc: false, iptc: true, xmp: true },
      { fileName: "image-ICC.jpg", exif: true, userComment: undefined, icc: true, iptc: true, xmp: true },
      {
        fileName: "image-userComment-string.jpg",
        userComment: "Create a surreal photo of a gorgeous sixties retro woman in a colorful dress kissing a big robot, it s a cloudy day, day in Paris, dark pastel colors, 35mm vintage kodak photography, easynegative, detailxl, CyberRealistic_Negative, perfecteyes, perfect eyes, skin blemish, detailed skin, FRESHIDEAS Illustration 62#, dark, chiaroscuro, low-key\nNegative prompt:  bad hands, bad anatomy, ((deformed)), blurry, bad quality, worst quality, low quality, signature, text, watermark, logo, easynegative, doors, door\nSteps: 28, Sampler: DPM++ 2M Karras, CFG scale: 5.3, Seed: 2421159222, Size: 832x1216, Clip skip: 2, Created Date: 2024-09-11T10:05:18.1716636Z, Civitai resources: [{\"type\":\"checkpoint\",\"modelVersionId\":641087,\"modelName\":\"ZavyChromaXL\",\"modelVersionName\":\"v9.0\"},{\"type\":\"embed\",\"weight\":1,\"modelVersionId\":9208,\"modelName\":\"EasyNegative\",\"modelVersionName\":\"EasyNegative\"},{\"type\":\"embed\",\"weight\":1,\"modelVersionId\":539032,\"modelName\":\"Detail \\u002B\\u002B\",\"modelVersionName\":\"Overall Detail XL\"},{\"type\":\"lora\",\"weight\":0.4,\"modelVersionId\":678485,\"modelName\":\"Midjourney mimic\",\"modelVersionName\":\"v2.0\"},{\"type\":\"embed\",\"weight\":1,\"modelVersionId\":82745,\"modelName\":\"CyberRealistic Negative\",\"modelVersionName\":\"v1.0\"},{\"type\":\"lora\",\"weight\":0.2,\"modelVersionId\":129711,\"modelName\":\"Concept: Perfect Eyes\",\"modelVersionName\":\"v1.0\"},{\"type\":\"lora\",\"weight\":0.25,\"modelVersionId\":148926,\"modelName\":\"Polyhedron_all SDXL 1.0 / skin, hands, eyes (m/f)\",\"modelVersionName\":\"v1.0\"},{\"type\":\"lora\",\"weight\":0.2,\"modelVersionId\":656437,\"modelName\":\"FRESH IDEAS @ 1980s vintage fashion shoot\",\"modelVersionName\":\"v1.0\"},{\"type\":\"lora\",\"weight\":0.3,\"modelVersionId\":332071,\"modelName\":\"Zavy\\u0027s Dark Atmospheric Contrast - SDXL\",\"modelVersionName\":\"v1.0\"},{\"type\":\"embed\",\"modelVersionId\":106916,\"modelName\":\"Civitai Safe Helper\",\"modelVersionName\":\"v1.0\"}], Civitai metadata: {}",
        exif: true,
        icc: false,
        iptc: false,
        xmp: false
      },
      {
        fileName: "image-userComment-binary.jpg",
        userComment: "Screenshot",
        exif: true,
        icc: true,
        iptc: false,
        xmp: false
      }
      // TODO: re-enable this once the WebP metadata writing is supported
      // {
      //   fileName: "see-and-rock.webp",
      //   userComment: undefined,
      //   exif: true,
      //   icc: false,
      //   iptc: false,
      //   xmp: false
      // },
      // {
      //   fileName: imageFeeder.webpImageFileName,
      //   userComment: undefined,
      //   exif: false,
      //   icc: false,
      //   iptc: false,
      //   xmp: false
      // }
    ]
  )("metadata with image '$fileName'", async (imageCase: ImageCase) =>
  {
    const imageFilePath = imageFeeder.copyImage(core.getWorkingDirectoryPath(), imageCase.fileName);
    const imageFormat = await computeFormat(imageFilePath);

    const originalMetadata = await readMetadata(imageFilePath);
    expect(originalMetadata.format).toBe(imageFormat);
    expect(originalMetadata.exif !== undefined).toBe(imageCase.exif);
    expect(originalMetadata.all?.userComment).toBe(imageCase.userComment);
    expect(originalMetadata.icc !== undefined).toBe(imageCase.icc);
    expect(originalMetadata.iptc !== undefined).toBe(imageCase.iptc);
    expect(originalMetadata.xmp !== undefined).toBe(imageCase.xmp);

    const key = "key";
    const value = "value";
    const innerMetadata = { [key]: value };
    const metadata = imageFormat === ImageFormat.JPEG ? { [jpegUserCommentId]: JSON.stringify(innerMetadata) } : innerMetadata;
    {
      fs.writeFileSync(imageFilePath, await writeMetadata(imageFilePath, imageFormat, metadata));
      const parsedMetadata = await readMetadata(imageFilePath);
      expect(parsedMetadata.all).toBeDefined();
      const all = parsedMetadata.all!;
      if (imageFormat === ImageFormat.PNG)
      {
        expect(all[key]).toBe(value);
      }
      else if (imageFormat === ImageFormat.JPEG)
      {
        expect(JSON.parse(all[jpegUserCommentName])[key]).toBe(value);
      }
    }
    {
      const buffer = fs.readFileSync(imageFilePath);
      const strippedBuffers = [await stripMetadata(buffer, imageFormat), await stripMetadata(buffer, imageFormat, imageFormat === ImageFormat.PNG ? ImageMetadataAlgorithm.internal : ImageMetadataAlgorithm.sharp)];
      const withSharps = [false, true];
      for (let index = 0; index < strippedBuffers.length; index++)
      {
        const strippedBuffer = strippedBuffers[index];
        const withSharp = withSharps[index];
        const parsedMetadata = await readMetadata(strippedBuffer);
        if (withSharp === false)
        {
          expect(strippedBuffer.length).toBeLessThanOrEqual(buffer.length);
          if (imageFormat === ImageFormat.PNG)
          {
            expect(parsedMetadata.all).toBeDefined();
          }
          else
          {
            expect(parsedMetadata.all).toBeUndefined();
          }
        }
        else
        {
          if (imageFormat === ImageFormat.PNG)
          {
            expect(parsedMetadata.all).toBeDefined();
          }
          else
          {
            expect(parsedMetadata.all).toBeUndefined();
          }
        }
        if (parsedMetadata.all !== undefined)
        {
          if (imageFormat === ImageFormat.PNG)
          {
            expect(parsedMetadata.all[key]).toBeUndefined();
          }
          else if (imageFormat === ImageFormat.JPEG)
          {
            expect(parsedMetadata.all[jpegUserCommentName]).toBeUndefined();
          }
        }
        expect(parsedMetadata.exif).toBeUndefined();
        expect(parsedMetadata.icc).toBeUndefined();
        expect(parsedMetadata.iptc).toBeUndefined();
        expect(parsedMetadata.xmp).toBeUndefined();
        expect(parsedMetadata.tiffTagPhotoshop).toBeUndefined();
      }
    }
  });

  test("applicationMetadata", async () =>
  {
    const iptcJpegBuffer = fs.readFileSync(path.join(imageFeeder.imagesDirectoryPath, "image-IPTC.jpg"));
    const generatedJpegBuffer = fs.readFileSync(path.join(imageFeeder.imagesDirectoryPath, "image-userComment-string.jpg"));
    const notGeneratedJpegBuffer = fs.readFileSync(path.join(imageFeeder.imagesDirectoryPath, imageFeeder.jpegImageFileName));
    const notGeneratedPngBuffer = fs.readFileSync(path.join(imageFeeder.imagesDirectoryPath, imageFeeder.pngImageFileName));
    const automatic1111FilePath = path.join(core.getWorkingDirectoryPath(), `image-${randomUUID()}`);
    await imageFeeder.prepareAutomatic1111Image(automatic1111FilePath);
    const automatic1111Buffer = fs.readFileSync(automatic1111FilePath);
    const comfyUiFilePath = path.join(core.getWorkingDirectoryPath(), `image-${randomUUID()}`);
    await imageFeeder.prepareComfyUiImage(comfyUiFilePath);
    const comfyUiBuffer = fs.readFileSync(comfyUiFilePath);

    {
      // We assess with a uni-code value
      for (const buffer of [notGeneratedJpegBuffer, notGeneratedPngBuffer])
      {
        const imageFormat = await computeFormat(buffer);
        const newApplicationMetadata = { key: "高清" };
        const modifiedBuffer = await writeApplicationMetadata(buffer, imageFormat, newApplicationMetadata);
        const modifiedApplicationMetadata = await readApplicationMetadata(modifiedBuffer, imageFormat);
        expect(modifiedApplicationMetadata).toEqual(newApplicationMetadata);
      }
    }

    const buffers = [iptcJpegBuffer, generatedJpegBuffer, notGeneratedJpegBuffer, notGeneratedPngBuffer, automatic1111Buffer, comfyUiBuffer];
    for (const buffer of buffers)
    {
      const imageFormat = await computeFormat(buffer);
      const metadata = await readMetadata(buffer);
      const applicationMetadata = await readApplicationMetadata(buffer, imageFormat);
      expect(applicationMetadata).toBeUndefined();
      const newApplicationMetadata = { key: "value" };
      const modifiedBuffer = await writeApplicationMetadata(buffer, imageFormat, newApplicationMetadata);
      const modifiedMetadata = await readMetadata(modifiedBuffer);
      const modifiedApplicationMetadata = await readApplicationMetadata(modifiedBuffer, imageFormat);
      expect(modifiedApplicationMetadata).toBeDefined();
      expect(modifiedApplicationMetadata).toEqual(newApplicationMetadata);
      const metadataAll = metadata.all!;
      const modifiedMetadataAll = modifiedMetadata.all!;
      if (imageFormat === ImageFormat.PNG)
      {
        delete modifiedMetadataAll[applicationMetadataPropertyName];
      }
      else if (imageFormat === ImageFormat.JPEG)
      {
        delete modifiedMetadataAll["TargetPrinter"];
      }
      expect(modifiedMetadataAll).toEqual(metadataAll);
    }
  });

  test.each(imageCases)("resize image '$fileName'", async ({ fileName }) =>
  {
    const sizes = [undefined, 100, 200];
    for (const requestedFormat of [undefined, ...ImageFormats])
    {
      for (const requestedWidth of sizes)
      {
        for (const requestedHeight of sizes)
        {
          for (const requestedRender of [undefined, "inbox" as ResizeRender])
          {
            const filePath = path.join(imageFeeder.imagesDirectoryPath, fileName);
            const imageMiscellaneousMetadata = await readMetadata(filePath);
            const imageFormat = await computeFormat(filePath);
            expect(imageMiscellaneousMetadata.width).toBeDefined();
            expect(imageMiscellaneousMetadata.height).toBeDefined();
            const resizedFormatAndBuffer = await resize("image", filePath, requestedFormat, requestedWidth, requestedHeight, requestedRender, undefined, undefined, undefined, undefined);
            expect(resizedFormatAndBuffer.format).toEqual(requestedFormat ?? imageFormat);
            const resizedImageMiscellaneousMetadata = await readMetadata(resizedFormatAndBuffer.buffer);
            const imageRatio = imageMiscellaneousMetadata.width! / imageMiscellaneousMetadata.height!;
            const withAndHeightDefined = requestedWidth !== undefined && requestedHeight !== undefined;
            const nodDimensionDefined = requestedWidth === undefined && requestedHeight === undefined;
            const idealRatio = withAndHeightDefined === true ? (requestedWidth / requestedHeight) : undefined;
            const expectedRatio = idealRatio === undefined ? undefined : (imageRatio >= idealRatio ? imageRatio : idealRatio);
            const expectedWidth = nodDimensionDefined === true ? imageMiscellaneousMetadata.width : (withAndHeightDefined === true ? (requestedRender === undefined ? requestedWidth : ((imageRatio >= expectedRatio! ? requestedWidth : Math.round(requestedHeight * imageRatio)))) : (requestedWidth !== undefined ? requestedWidth : Math.round(requestedHeight! * imageRatio)));
            expect(resizedImageMiscellaneousMetadata.width).toEqual(expectedWidth);
            const expectedHeight = nodDimensionDefined === true ? imageMiscellaneousMetadata.height : (withAndHeightDefined === true ? (requestedRender === undefined ? requestedHeight : ((imageRatio < expectedRatio! ? requestedHeight : Math.round(requestedWidth / imageRatio!)))) : (requestedHeight !== undefined ? requestedHeight : Math.round(requestedWidth! / imageRatio)));
            expect(resizedImageMiscellaneousMetadata.height).toEqual(expectedHeight);
          }
        }
      }
    }
  });

});

describe("Image with module", () =>
{

  const base = new Base(false);

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

  test("list", async () =>
  {
    const directoryPath = base.prepareEmptyDirectory(Defaults.emptyDirectoryName);
    const preexistingFilePath = path.join(directoryPath, base.imageFeeder.pngImageFileName);
    await base.imageFeeder.prepareComfyUiImage(preexistingFilePath);
    const repository = await base.prepareEmptyRepository(directoryPath);

    const totalCount = 1;
    const zero = 0;
    const inName = { inName: true, inMetadata: false, inFeatures: false };
    const inMetadata = { inName: false, inMetadata: true, inFeatures: false };
    const inFeatures = { inName: false, inMetadata: false, inFeatures: true };
    const inAll = { inName: true, inMetadata: true, inFeatures: true };
    const inNone = { inName: false, inMetadata: false, inFeatures: false };
    expect((await base.getImageController().search({ criteria: { keyword: { text: base.imageFeeder.pngImageFileName, ...inName } } })).entities.length).toBe(totalCount);
    expect((await base.getImageController().search({ criteria: { keyword: { text: base.imageFeeder.pngImageFileName.toUpperCase(), ...inName } } })).entities.length).toBe(totalCount);
    // We make sure that the image "metadata" are searched in
    const metadataKeyword = "Deflate/Inflate";
    expect((await base.getImageController().search({ criteria: { keyword: { text: metadataKeyword, ...inMetadata } } })).entities.length).toBe(totalCount);
    expect((await base.getImageController().search({ criteria: { keyword: { text: metadataKeyword.toUpperCase(), ...inMetadata } } })).entities.length).toBe(totalCount);
    {
      // We make sure that the image "features" are searched in
      const featureKeyword = computeExpectedCaption("painting");
      const image = await base.getRepositoryController().getImageByUrl(fileWithProtocol + preexistingFilePath);
      const extension = await base.prepareExtension();
      await base.getImageController().setFeatures(Base.allPolicyContext, image.id, extension.manifest.id, [new ImageFeature(ImageFeatureType.CAPTION, ImageFeatureFormat.STRING, undefined, featureKeyword)]);
      expect((await base.getImageController().search({ criteria: { keyword: { text: featureKeyword, ...inFeatures } } })).entities.length).toBe(totalCount);
      expect((await base.getImageController().search({ criteria: { keyword: { text: featureKeyword.toLowerCase(), ...inFeatures } } })).entities.length).toBe(totalCount);
      expect((await base.getImageController().search({ criteria: { keyword: { text: "dummy" + base.imageFeeder.pngImageFileName, ...inAll } } })).entities.length).toBe(zero);
    }
    // This is an edge case
    expect((await base.getImageController().search({ criteria: { keyword: { text: "", ...inAll } } })).entities.length).toBe(totalCount);
    expect((await base.getImageController().search({ ids: [repository.id] })).entities.length).toBe(totalCount);
    expect((await base.getImageController().search({})).entities.length).toBe(totalCount);
    await expect(async () =>
    {
      await base.getImageController().search({ criteria: { keyword: { text: "text", ...inNone } } });
    }).rejects.toThrow(new ServiceError(`The parameter 'keyword' is invalid because it contains only false properties`, BAD_REQUEST, base.badParameterCode));
    {
      const { repository: newRepository } = await base.prepareRepositoryWithImage(base.imageFeeder.webpImageFileName, "new");
      expect((await base.getImageController().search({ ids: [repository.id, newRepository.id] })).entities.length).toBe(totalCount * 2);
      expect((await base.getImageController().search({ ids: [repository.id] })).entities.length).toBe(totalCount);
    }

    {
      const dummyId = "dummyId";
      await expect(async () =>
      {
        await base.getImageController().search({ ids: [dummyId] });
      }).rejects.toThrow(new ServiceError(`The parameter 'ids' with value '${dummyId}' is invalid because some of those identifiers do not correspond to an existing repository`, BAD_REQUEST, base.badParameterCode));
    }
  }, base.largeTimeoutInMilliseconds);

  test("get", async () =>
  {
    {
      // We assess with invalid parameters
      const inexistentId = "inexistentId";
      await expect(async () =>
      {
        await base.getImageController().get(inexistentId);
      }).rejects.toThrow(new ServiceError(`The parameter 'id' with value '${inexistentId}' is invalid because there is no image with that identifier`, BAD_REQUEST, base.badParameterCode));
    }
    {
      // We assess with valid parameters
      const { image: entity } = await base.prepareRepositoryWithImage(base.imageFeeder.jpegImageFileName);
      const returnedEntity = await base.getImageController().get(entity.id);
      expect(returnedEntity).toBeDefined();
      expect(returnedEntity.id).toEqual(entity.id);
    }
  });

  test("modify", async () =>
  {
    const { image } = await base.prepareRepositoryWithImage(base.imageFeeder.jpegImageFileName);
    {
      // We assess with an invalid image
      await expect(async () =>
      {
        await base.getImageController().modify(image.id, Buffer.from("dummy"));
      }).rejects.toThrow(new ServiceError("The provided file is not a supported image. Reason: 'Unable to parse the image metadata. Reason: 'Input buffer contains unsupported image format''", BAD_REQUEST, base.badParameterCode));
    }
    {
      // We assess with a too-large image
      await expect(async () =>
      {
        await base.getImageController().modify(image.id, Buffer.alloc(base.imageMaximumBinaryWeightInBytes + 1));
      }).rejects.toThrow(new ServiceError(`The provided image exceeds the maximum allowed binary weight of ${base.imageMaximumBinaryWeightInBytes} bytes`, BAD_REQUEST, base.badParameterCode));
    }
    {
      // We assess with valid parameters
      const buffer = fs.readFileSync(path.join(base.imageFeeder.imagesDirectoryPath, "Apparition of the town of Delft.jpg"));
      const modifiedImage = await base.getImageController().modify(image.id, buffer);
      expect(modifiedImage.sizeInBytes).toEqual(buffer.length);
      const modifiedBuffer = fs.readFileSync(image.url.substring(fileWithProtocol.length));
      expect(modifiedBuffer).toEqual(buffer);
    }
    {
      // We assess with an image with a different format
      const newImageFilePath = path.join(base.imageFeeder.imagesDirectoryPath, base.imageFeeder.pngImageFileName);
      const newImageFormat = await computeFormat(newImageFilePath);
      await expect(async () =>
      {
        await base.getImageController().modify(image.id, fs.readFileSync(newImageFilePath));
      }).rejects.toThrow(new ServiceError(`Cannot change the image format '${image.format}' into '${newImageFormat}'`, BAD_REQUEST, base.badParameterCode));
    }
  });

  test("delete", async () =>
  {
    const extension = await base.prepareExtension();
    const { image } = await base.prepareRepositoryWithImage(base.imageFeeder.jpegImageFileName);
    await base.getImageController().setTags(Base.allPolicyContext, image.id, extension.manifest.id, ["tag"]);
    await base.getImageController().setFeatures(Base.allPolicyContext, image.id, extension.manifest.id, [new ImageFeature(ImageFeatureType.CAPTION, ImageFeatureFormat.STRING, "name", "string")]);
    await base.getImageController().setEmbeddings(Base.allPolicyContext, image.id, extension.manifest.id, new ImageEmbeddings([1, 2, 3]));

    {
      // We assess with an inexistent image
      const inexistentImageId = randomUUID();
      await expect(async () =>
      {
        await base.getImageController().delete(inexistentImageId);
      }).rejects.toThrow(new ServiceError(`The parameter 'id' with value '${inexistentImageId}' is invalid because there is no image with that identifier`, BAD_REQUEST, base.badParameterCode));
    }
    {
      // We assess with an existing image
      const notifier = base.getNotifier();
      const listener = base.computeEventListener();
      notifier.once(EventEntity.Image, ImageEventAction.Deleted, undefined, listener);
      await base.getImageController().delete(image.id);
      expect(fs.existsSync(image.url.substring(fileWithProtocol.length))).toEqual(false);
      await base.waitUntil(async () =>
      {
        return listener.mock.calls.length === 1;
      });
      expect(listener).toHaveBeenCalledWith(EventEntity.Image + Notifier.delimiter + ImageEventAction.Deleted, { id: image.id });
      expect((await base.getImageController().search({})).entities.length).toBe(0);
      expect((await base.getEntitiesProvider().imageMetadata.findMany()).length).toBe(0);
      expect((await base.getEntitiesProvider().imageTag.findMany()).length).toBe(0);
      expect((await base.getEntitiesProvider().imageFeature.findMany()).length).toBe(0);
      expect(await base.getVectorDatabaseAccessor().getEmbeddings(image.id, extension.manifest.id)).toBeUndefined();
    }
  });

  test("download", async () =>
  {
    const directoryPath = base.prepareEmptyDirectory(Defaults.emptyDirectoryName, base.getWorkingDirectoryPath());
    const key = "key";
    const value = "value";
    const metadata = { [key]: value };
    const pngImageFilePath = base.imageFeeder.copyImage(directoryPath, base.imageFeeder.pngImageFileName);
    await base.imageFeeder.writeImageMetadata(pngImageFilePath, ImageFormat.PNG, metadata);
    const jpegImageFilePath = base.imageFeeder.copyImage(directoryPath, base.imageFeeder.jpegImageFileName);
    await base.imageFeeder.writeImageMetadata(jpegImageFilePath, ImageFormat.JPEG, { [jpegUserCommentId]: JSON.stringify(metadata) });
    // TODO: re-enable this once the WebP metadata writing is supported
    // const webpImageFilePath = base.imageFeeder.copyImage(directoryPath, base.imageFeeder.webpImageFileName);
    // await base.imageFeeder.writeImageMetadata(webpImageFilePath, ImageFormat.WEBP, metadata);
    await base.prepareEmptyRepository(directoryPath);

    const summaries = (await base.getImageController().search({})).entities;
    for (const summary of summaries)
    {
      const stripMetadatas = [undefined, true, false];
      for (const stripMetadata of stripMetadatas)
      {
        const imageFormats = [undefined, ImageFormat.PNG, ImageFormat.JPEG, ImageFormat.WEBP];
        for (const requestedImageFormat of imageFormats)
        {
          const sizes = [undefined, 100, 200];
          for (const requestedWidth of sizes)
          {
            for (const requestedHeight of sizes)
            {
              for (const requestedRender of [undefined, ImageResizeRender.Inbox, ImageResizeRender.Outbox])
              {
                const imageId = summary.id;
                const willStripMetadata = stripMetadata === true;
                const requireResize = requestedWidth !== undefined || requestedHeight !== undefined;
                if (requireResize === true && willStripMetadata === false)
                {
                  await expect(async () =>
                  {
                    await base.getImageController().download(imageId, requestedImageFormat, requestedWidth, requestedHeight, requestedRender, stripMetadata);
                  }).rejects.toThrow(new ServiceError(`The parameter 'stripMetadata' with value 'false' is invalid because it must be set to 'true' when the 'width' or 'height' parameter is defined`, BAD_REQUEST, base.badParameterCode));
                  continue;
                }
                const originalImageFormat = summary.format;
                if (requestedImageFormat !== undefined && requestedImageFormat !== originalImageFormat && willStripMetadata === false)
                {
                  await expect(async () =>
                  {
                    await base.getImageController().download(imageId, requestedImageFormat, requestedWidth, requestedHeight, requestedRender, stripMetadata);
                  }).rejects.toThrow(new ServiceError(`The parameter 'stripMetadata' with value 'false' is invalid because it must be set to 'true' when the 'format' parameter is different from the original image format`, BAD_REQUEST, base.badParameterCode));
                  continue;
                }
                const streamableFile = await base.getImageController().download(imageId, requestedImageFormat, requestedWidth, requestedHeight, requestedRender, stripMetadata);
                const actuallyRequestedImageFormat = requestedImageFormat ?? toImageFormat(originalImageFormat);
                expect(streamableFile.getHeaders().type).toEqual(toMimeType(actuallyRequestedImageFormat));
                expect(streamableFile.getHeaders().disposition).toEqual(computeAttachmentDisposition(summary.name.substring(0, summary.name.lastIndexOf(".") + 1) + toFileExtension(actuallyRequestedImageFormat)));
                const downloadedBuffer = await streamBuffer(streamableFile.getStream());
                const originalBuffer = fs.readFileSync(summary.url.substring(fileWithProtocol.length));
                if (requestedImageFormat === undefined || requestedImageFormat === originalImageFormat)
                {
                  expect(downloadedBuffer.length).toBeLessThanOrEqual(originalBuffer.length);
                }
                if (willStripMetadata === false && requestedImageFormat === originalImageFormat)
                {
                  expect(downloadedBuffer.length).toBe(originalBuffer.length);
                  const base64 = "base64";
                  expect(downloadedBuffer.toString(base64)).toEqual(originalBuffer.toString(base64));
                }
                {
                  const metadata = await readMetadata(downloadedBuffer);
                  const withDifferentFormat = requestedImageFormat !== undefined && requestedImageFormat !== originalImageFormat;
                  if ((withDifferentFormat === true || requireResize === true || willStripMetadata === true) && actuallyRequestedImageFormat !== ImageFormat.PNG)
                  {
                    expect(metadata.all).toBeUndefined();
                  }
                  else
                  {
                    expect(metadata.all).toBeDefined();
                    const all = metadata.all!;
                    if (actuallyRequestedImageFormat === ImageFormat.JPEG)
                    {
                      const userComment = all[jpegUserCommentName];
                      if (willStripMetadata === true)
                      {
                        expect(userComment).toBeUndefined();
                      }
                      else
                      {
                        expect(JSON.parse(userComment)[key]).toBe(value);
                      }
                    }
                    else if (actuallyRequestedImageFormat === ImageFormat.PNG)
                    {
                      expect(all[key]).toBe(willStripMetadata === true ? undefined : value);
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, base.largeTimeoutInMilliseconds);

  test.each(imageCases)("metadata with image=$fileName", async ({ fileName, metadataItem }: ImageCase) =>
  {
    const { image } = await base.prepareRepositoryWithImage(fileName);
    const metadata = await base.getImageController().getMetadata(image.id);
    if (metadataItem === undefined)
    {
      expect(metadata.all).toBeUndefined();
    }
    else
    {
      expect(metadata.all).toBeDefined();
      const allMetadata = JSON.parse(metadata.all!);
      console.dir(allMetadata);
      expect(allMetadata[metadataItem.key]).toEqual(metadataItem.value);
    }
  });

  test("tags", async () =>
  {
    const {
      repository,
      image
    } = await base.prepareRepositoryWithImage(base.imageFeeder.jpegImageFileName, Defaults.emptyDirectoryName, false);
    const extension = await base.prepareExtension();
    const extensionId = extension.manifest.id;

    {
      // We assess with invalid parameters
      {
        const inexistentExtensionId = randomUUID();
        await expect(async () =>
        {
          await base.getImageController().setTags(Base.allPolicyContext, image.id, inexistentExtensionId, []);
        }).rejects.toThrow(new ServiceError(`The parameter 'extensionId' with value '${inexistentExtensionId}' is invalid because that extension is not installed`, BAD_REQUEST, base.badParameterCode));
      }
      {
        const inexistentImageId = randomUUID();
        await expect(async () =>
        {
          await base.getImageController().setTags(Base.allPolicyContext, inexistentImageId, extensionId, []);
        }).rejects.toThrow(new ServiceError(`The parameter 'id' with value '${inexistentImageId}' is invalid because there is no image with that identifier`, BAD_REQUEST, base.badParameterCode));
      }
      {
        const tag = "";
        await expect(async () =>
        {
          await base.getImageController().setTags(Base.allPolicyContext, image.id, extensionId, [tag]);
        }).rejects.toThrow(new ServiceError(`The parameter 'tags[0]' with value '${tag}' is invalid because it is empty`, BAD_REQUEST, base.badParameterCode));
      }
      {
        const tag = "a".repeat(64 + 1);
        await expect(async () =>
        {
          await base.getImageController().setTags(Base.allPolicyContext, image.id, extensionId, [tag]);
        }).rejects.toThrow(new ServiceError(`The parameter 'tags[0]' with value '${tag}' is invalid because it exceeds 64 characters`, BAD_REQUEST, base.badParameterCode));
      }
      {
        const tag = "/";
        await expect(async () =>
        {
          await base.getImageController().setTags(Base.allPolicyContext, image.id, extensionId, [tag]);
        }).rejects.toThrow(new ServiceError(`The parameter 'tags[0]' with value '${tag}' is invalid because it contains illegal characters`, BAD_REQUEST, base.badParameterCode));
      }

      await expect(async () =>
      {
        await base.getImageController().setTags(Base.allPolicyContext, image.id, extensionId, [""]);
      }).rejects.toThrow(new ServiceError(`The parameter 'tags[0]' with value '' is invalid because it is empty`, BAD_REQUEST, base.badParameterCode));

      await expect(async () =>
      {
        await base.getImageController().setTags(Base.allPolicyContext, image.id, extensionId, Array(256 + 1).fill("tag").map((tag, index) =>
        {
          return tag + index;
        }));
      }).rejects.toThrow(new ServiceError("The parameter 'tags' is invalid because it exceeds the maximum amount of items, which is 256", BAD_REQUEST, base.badParameterCode));

      await expect(async () =>
      {
        await base.getImageController().setTags(Base.allPolicyContext, image.id, extensionId, ["tag", "tag"]);
      }).rejects.toThrow(new ServiceError("The parameter 'tags' is invalid because it contains duplicate values", BAD_REQUEST, base.badParameterCode));
    }

    const checkTags = async (expectedTags: string[]) =>
    {
      const extensionImageTags = (await base.getImageController().getAllTags(image.id)).sort();
      expect(extensionImageTags.length).toEqual(expectedTags.length);
      const sortedExpectedTags = expectedTags.sort();
      sortedExpectedTags.forEach((expectedTag, index) =>
      {
        expect(extensionImageTags[index].id).toEqual(extensionId);
        expect(extensionImageTags[index].value).toEqual(expectedTag);
      });
      const persistedImage = await base.getEntitiesProvider().images.findUnique({
        where: { id: image.id },
        include: { tags: true }
      });
      const persistedTags = persistedImage!.tags.filter((tag) => tag.extensionId === extensionId);
      expect(persistedTags.length).toEqual(expectedTags.length == 0 ? 1 : expectedTags.length);
      expect(persistedTags.map(persistedTag => persistedTag.value).sort()).toEqual(expectedTags.length === 0 ? [""] : sortedExpectedTags);
    };

    const firstTags = ["tag4"];
    {
      const tag1 = "tag.1";
      const secondTags = ["tag-2", tag1];
      const thirdTags = [tag1, "tag_3"];
      {
        const emptyTags: string[] = [];
        {
          await base.getImageController().setTags(Base.allPolicyContext, image.id, extensionId, emptyTags);
          await checkTags(emptyTags);
          expect((await base.getImageController().get(image.id)).tags).toEqual(emptyTags);
        }
        {
          await base.getImageController().ensureTags(Base.allPolicyContext, image.id, extensionId, [tag1]);
          await checkTags([tag1]);
        }
        {
          await base.getImageController().setTags(Base.allPolicyContext, image.id, extensionId, emptyTags);
          await base.getImageController().ensureTags(Base.allPolicyContext, image.id, extensionId, firstTags);
          await checkTags(firstTags);
        }
        {
          await base.getImageController().ensureTags(Base.allPolicyContext, image.id, extensionId, secondTags);
          await checkTags(firstTags.concat(secondTags).sort((tag1, tag2) =>
          {
            return tag1.localeCompare(tag2);
          }));
        }
        {
          const allTags = Array.from(new Set(firstTags.concat(secondTags).concat(thirdTags))).sort((tag1, tag2) =>
          {
            return tag1.localeCompare(tag2);
          });
          await base.getImageController().ensureTags(Base.allPolicyContext, image.id, extensionId, thirdTags);
          await checkTags(allTags);
        }
        {
          await base.getImageController().setTags(Base.allPolicyContext, image.id, extensionId, firstTags);
          await checkTags(firstTags);
        }
      }
    }
    {
      // We install a second extension and set a tag on the image
      const extensionTag = "newExtensionTag";
      const commandId = "commandId";
      const secondExtension = await base.prepareExtension("second", [ManifestEvent.ProcessStarted, ManifestEvent.ImageRunCommand], [
          {
            id: commandId,
            on: { entity: CommandEntity.Images, withTags: [extensionTag] },
            specifications: [{ locale: "en", label: "Command" }]
          }
        ]
      );
      const secondExtensionId = secondExtension.manifest.id;
      // We check that it is not possible to run an image command, which expects a tag to be defined while the image does not have it
      const imageIds = [image.id];
      await expect(async () =>
      {
        await base.getExtensionController().runImageCommand(Base.allPolicyContext, secondExtensionId, commandId, [], imageIds);
      }).rejects.toThrow(new ServiceError(`The parameter 'imageIds' with value '[${imageIds.join(",")}]' is invalid because because one or more image do not have the required tags`, BAD_REQUEST, base.badParameterCode));
      // We set the missing tag
      await base.getImageController().ensureTags(Base.allPolicyContext, image.id, secondExtensionId, [extensionTag]);
      // We check that it is now possible to run the previous image command
      await base.getExtensionController().runImageCommand(Base.allPolicyContext, secondExtensionId, commandId, [], imageIds);
      await base.getExtensionController().uninstall(secondExtensionId);
      await checkTags(firstTags);
    }
    {
      // We delete the image and make sure that the tags are deleted along with it
      await base.getRepositoryController().watch(repository.id, true);
      await base.waitUntilRepositoryWatching(repository.id);
      const filePath = image.url.substring(fileWithProtocol.length);
      await base.waitUntilImage(repository.id, filePath, false, () =>
      {
        fs.rmSync(filePath);
      });
      expect((await base.getEntitiesProvider().imageTag.findMany({ where: { extensionId: extensionId } })).length).toEqual(0);
    }
  });

  test("features", async () =>
  {
    const { image, extensionId } = await preparedRepositoryAndExtension();
    const imageId = image.id;
    const name = "name";
    const imageFeature = new ImageFeature(ImageFeatureType.CAPTION, ImageFeatureFormat.STRING, name, "value");

    {
      // We assess with invalid parameters
      {
        // We assess with a non-existing extension
        const nonExistingId = "non-existing-id";
        await expect(async () =>
        {
          await base.getImageController().setFeatures(Base.allPolicyContext, imageId, nonExistingId, [imageFeature]);
        }).rejects.toThrow(new ServiceError(`The parameter 'extensionId' with value '${nonExistingId}' is invalid because that extension is not installed`, BAD_REQUEST, base.badParameterCode));
      }
      {
        // We assess with too many features
        await expect(async () =>
        {
          await base.getImageController().setFeatures(Base.allPolicyContext, imageId, extensionId, Array(32 + 1).fill(imageFeature));
        }).rejects.toThrow(new ServiceError("The parameter 'features' is invalid because it exceeds the maximum amount of items, which is 32", BAD_REQUEST, base.badParameterCode));
      }
      {
        // We assess with a feature with an empty name
        await expect(async () =>
        {
          await base.getImageController().setFeatures(Base.allPolicyContext, imageId, extensionId, [new ImageFeature(ImageFeatureType.CAPTION, ImageFeatureFormat.STRING, "", "value")]);
        }).rejects.toThrow(new ServiceError("The parameter 'features[0].name' with value '' is invalid because it is empty", BAD_REQUEST, base.badParameterCode));
      }
      {
        // We assess with a feature with an empty value
        await expect(async () =>
        {
          await base.getImageController().setFeatures(Base.allPolicyContext, imageId, extensionId, [new ImageFeature(ImageFeatureType.CAPTION, ImageFeatureFormat.STRING, name, "")]);
        }).rejects.toThrow(new ServiceError("The parameter 'features[0].value' with value '' is invalid because it is empty", BAD_REQUEST, base.badParameterCode));
      }
      {
        // We assess with a too long value
        const maximumCharactersCount = 512 * 1_024;
        const errors = await validate(plainToInstance(ImageFeature, new ImageFeature(ImageFeatureType.CAPTION, ImageFeatureFormat.STRING, name, "a".repeat(maximumCharactersCount + 1))));
        expect(errors.length).toEqual(1);
        const validationError = errors[0];
        expect(validationError.property).toEqual("value");
        expect(validationError.constraints).toBeDefined();
        expect(validationError.constraints!.typeBasedValidator).toEqual("value must be shorter than or equal to " + maximumCharactersCount + " characters");
      }
      {
        {
          // We assess with a mismatching "integer", "float", "boolean" and "string"
          const cases =
            [
              { type: ImageFeatureFormat.INTEGER, value: "notInteger", errorSuffix: "an integer" },
              { type: ImageFeatureFormat.FLOAT, value: "notFloat", errorSuffix: "a float" },
              { type: ImageFeatureFormat.BOOLEAN, value: "notBoolean", errorSuffix: "a boolean" },
              { type: ImageFeatureFormat.STRING, value: 3.14, errorSuffix: "a string" }
            ];
          for (const aCase of cases)
          {
            await expect(async () =>
            {
              await base.getImageController().setFeatures(Base.allPolicyContext, imageId, extensionId, [new ImageFeature(ImageFeatureType.ANNOTATION, aCase.type, undefined, aCase.value)]);
            }).rejects.toThrow(new ServiceError(`The parameter '[0].value' is invalid because it should be ${aCase.errorSuffix}`, BAD_REQUEST, base.badParameterCode));
          }
        }

        // We assess with a mismatching between the "type" and the "format" for the "caption" type
        for (const featureFormat of [ImageFeatureFormat.JSON, ImageFeatureFormat.XML, ImageFeatureFormat.BINARY])
        {
          await expect(async () =>
          {
            await base.getImageController().setFeatures(Base.allPolicyContext, imageId, extensionId, [new ImageFeature(ImageFeatureType.CAPTION, featureFormat, undefined, "dummyAttachment")]);
          }).rejects.toThrow(new ServiceError(`The parameter '[0].format' with value '${featureFormat}' is invalid because it should be equal to 'string' when the feature type is 'caption'`, BAD_REQUEST, base.badParameterCode));
        }
      }

      // We assess with a mismatching between the "type" and the "format" for the "description" and "comment" types
      for (const type of [ImageFeatureType.DESCRIPTION, ImageFeatureType.COMMENT])
      {
        for (const featureFormat of [ImageFeatureFormat.JSON, ImageFeatureFormat.XML, ImageFeatureFormat.BINARY])
        {
          await expect(async () =>
          {
            await base.getImageController().setFeatures(Base.allPolicyContext, imageId, extensionId, [new ImageFeature(type, featureFormat, undefined, "dummyAttachment")]);
          }).rejects.toThrow(new ServiceError(`The parameter '[0].format' with value '${featureFormat}' is invalid because it should be one of ['string', 'markdown', 'html'] when the feature type is '${type}'`, BAD_REQUEST, base.badParameterCode));
        }
      }

      // We assess with a mismatching between the "type" and the "format" for the "recipe" type
      for (const featureFormat of [ImageFeatureFormat.STRING, ImageFeatureFormat.XML, ImageFeatureFormat.MARKDOWN, ImageFeatureFormat.HTML, ImageFeatureFormat.BINARY])
      {
        await expect(async () =>
        {
          await base.getImageController().setFeatures(Base.allPolicyContext, imageId, extensionId, [new ImageFeature(ImageFeatureType.RECIPE, featureFormat, undefined, "dummyAttachment")]);
        }).rejects.toThrow(new ServiceError(`The parameter '[0].format' with value '${featureFormat}' is invalid because it should be one of ['json'] when the feature type is 'recipe'`, BAD_REQUEST, base.badParameterCode));
      }

      // We assess with malformed JSON contents
      for (const type of [ImageFeatureType.METADATA, ImageFeatureType.RECIPE, ImageFeatureType.OTHER])
      {
        const value = "malformedJSON";
        await expect(async () =>
        {
          await base.getImageController().setFeatures(Base.allPolicyContext, imageId, extensionId, [new ImageFeature(type, ImageFeatureFormat.JSON, undefined, value)]);
        }).rejects.toThrow(new ServiceError(`The parameter '[0].value' with value '${value}' is invalid because it should be a well-formed JSON content`, BAD_REQUEST, base.badParameterCode));
      }
      // We assess with malformed XML contents
      for (const type of [ImageFeatureType.METADATA, ImageFeatureType.OTHER])
      {
        const value = "malformedXML";
        await expect(async () =>
        {
          await base.getImageController().setFeatures(Base.allPolicyContext, imageId, extensionId, [new ImageFeature(type, ImageFeatureFormat.XML, undefined, value)]);
        }).rejects.toThrow(new ServiceError(`The parameter '[0].value' with value '${value}' is invalid because it should be a well-formed XML content`, BAD_REQUEST, base.badParameterCode));
      }
      {
        // We assess with a "recipe" type and a value which does not respect the schema
        const type = ImageFeatureType.RECIPE;
        const format = ImageFeatureFormat.JSON;
        {
          const value = JSON.stringify({ key: "value" });
          await expect(async () =>
          {
            await base.getImageController().setFeatures(Base.allPolicyContext, imageId, extensionId, [new ImageFeature(type, format, undefined, value)]);
          }).rejects.toThrow(new ServiceError(`The parameter '[0].value' with value '${value}' is invalid because because it does not comply with the recipe schema`, BAD_REQUEST, base.badParameterCode));
        }
        const prompt = new TextualPrompt("prompt");
        for (const modelTag of ["", "a model", "model:version1:version2", "model!", "model?"])
        {
          const value = JSON.stringify(new GenerationRecipe([modelTag], prompt));
          await expect(async () =>
          {
            await base.getImageController().setFeatures(Base.allPolicyContext, imageId, extensionId, [new ImageFeature(type, format, undefined, value)]);
          }).rejects.toThrow(new ServiceError(`The parameter '[0].value' with value '${value}' is invalid because because it does not comply with the recipe schema`, BAD_REQUEST, base.badParameterCode));
        }
        {
          for (const recipe of [new GenerationRecipe([], prompt, "a".repeat(FieldLengths.technical + 1)), new GenerationRecipe([], prompt, undefined, "malformed URL"), new GenerationRecipe([], prompt, undefined, undefined, "malformed software"), new GenerationRecipe([], prompt, undefined, undefined, undefined, [""]), new GenerationRecipe([], prompt, undefined, undefined, undefined, undefined, -1)])
          {
            const value = JSON.stringify(recipe);
            await expect(async () =>
            {
              await base.getImageController().setFeatures(Base.allPolicyContext, imageId, extensionId, [new ImageFeature(type, format, undefined, value)]);
            }).rejects.toThrow(new ServiceError(`The parameter '[0].value' with value '${value}' is invalid because because it does not comply with the recipe schema`, BAD_REQUEST, base.badParameterCode));
          }
        }
      }

      if (Math.random() > 1)
      {
        // TODO: re-enable this once we have a proper Markdown validator
        for (const type of [ImageFeatureType.DESCRIPTION, ImageFeatureType.COMMENT, ImageFeatureType.METADATA, ImageFeatureType.OTHER])
        {
          const value = "malformedMarkdown()[";
          await expect(async () =>
          {
            await base.getImageController().setFeatures(Base.allPolicyContext, imageId, extensionId, [new ImageFeature(type, ImageFeatureFormat.MARKDOWN, undefined, value)]);
          }).rejects.toThrow(new ServiceError(`The parameter '[0].value' with value '${value}' is invalid because it should be a well-formed Markdown content`, BAD_REQUEST, base.badParameterCode));
        }
      }
    }

    {
      // We assess with valid parameters
      {
        // We assess with no feature
        await base.getImageController().setFeatures(Base.allPolicyContext, imageId, extensionId, []);
        expect((await base.getImageController().getAllFeatures(imageId)).length).toEqual(0);
        expect((await base.getImageController().get(imageId)).features.length).toEqual(0);
        const persistedFeatures = await base.getEntitiesProvider().imageFeature.findMany({ where: { imageId } });
        expect(persistedFeatures.length).toEqual(1);
        expect(persistedFeatures[0].value).toEqual("");
        expect(persistedFeatures[0].name).toEqual(null);
        expect(persistedFeatures[0].type).toEqual("other");
        expect(persistedFeatures[0].format).toEqual("string");
      }
      {
        // We assess with a valid content
        const stringImageFeature = imageFeature;
        const integerImageFeature = new ImageFeature(ImageFeatureType.ANNOTATION, ImageFeatureFormat.INTEGER, "integer", 11);
        const floatImageFeature = new ImageFeature(ImageFeatureType.ANNOTATION, ImageFeatureFormat.FLOAT, "float", 3.14);
        const booleanImageFeature = new ImageFeature(ImageFeatureType.ANNOTATION, ImageFeatureFormat.BOOLEAN, "boolean", true);
        const markdownImageFeature = new ImageFeature(ImageFeatureType.METADATA, ImageFeatureFormat.MARKDOWN, undefined, `# Title\n##Subtitle\nHere is some **markdown** _content!`);
        const jsonImageFeature = new ImageFeature(ImageFeatureType.METADATA, ImageFeatureFormat.JSON, undefined, `{"key":"value"}`);
        const xmlImageFeature = new ImageFeature(ImageFeatureType.OTHER, ImageFeatureFormat.XML, "xml", `<element attribute="value"></element>`);
        const imageFeatures = [stringImageFeature, integerImageFeature, floatImageFeature, booleanImageFeature, markdownImageFeature, jsonImageFeature, xmlImageFeature];
        await base.getImageController().setFeatures(Base.allPolicyContext, imageId, extensionId, imageFeatures);
        const image = await base.getImageController().get(imageId);
        expect(image.features.length).toBe(imageFeatures.length);
        for (let index = 0; index < image.features.length; index++)
        {
          expect(image.features[index]).toEqual({ id: extensionId, ...imageFeatures[index] });
        }
        const allImageFeatures = await base.getImageController().getAllFeatures(imageId);
        expect(allImageFeatures.length).toBe(imageFeatures.length);
        for (let index = 0; index < image.features.length; index++)
        {
          expect(allImageFeatures[index]).toEqual({ id: extensionId, ...imageFeatures[index] });
        }
      }
      {
        // We assess with a valid recipe
        const model = "mod-_.el";
        const company = "comp-_.any";
        const version = "1-_.5";
        for (const modelTag of [model, `${company}/${model}`, `${model}:${version}`, `${company}/${model}:${version}`])
        {
          const textualPrompt = new TextualPrompt("a beautiful photo");
          const instructionsPrompt = new InstructionsPrompt({ key1: "value1" });
          for (const prompt of [textualPrompt, instructionsPrompt])
          {
            const recipe = new GenerationRecipe([modelTag], prompt, "id", "https//generated.image/id", "google/gemini", [], 1.25);
            await base.getImageController().setFeatures(Base.allPolicyContext, imageId, extensionId, [new ImageFeature(ImageFeatureType.RECIPE, ImageFeatureFormat.JSON, undefined, JSON.stringify(recipe))]);
            const features = await base.getImageController().getAllFeatures(imageId);
            expect(features.length).toEqual(1);
            const feature = features[0];
            expect(feature.type).toEqual(ImageFeatureType.RECIPE);
            expect(feature.format).toEqual(ImageFeatureFormat.JSON);
            expect(feature.value).toEqual(JSON.stringify(recipe));
          }
        }
      }
      {
        // We delete the image and check that the features are deleted
        const filePath = image.url.substring(fileWithProtocol.length);
        // We wait for the image to be considered deleted by the server
        await base.waitUntilImage(image.repositoryId, filePath, false, () =>
        {
          fs.rmSync(filePath);
        });
        expect((await base.getModuleProvider(ImageAttachmentService).list(imageId)).length).toEqual(0);
      }
    }
  });

  test("embeddings", async () =>
  {
    const { image, extensionId } = await preparedRepositoryAndExtension();
    const imageId = image.id;
    const imageEmbeddings = new ImageEmbeddings([1, 2, 3, 4, 5]);

    {
      // We assess with a non-existing extension
      const nonExistingId = "non-existing-id";
      await expect(async () =>
      {
        await base.getImageController().setEmbeddings(Base.allPolicyContext, imageId, nonExistingId, imageEmbeddings);
      }).rejects.toThrow(new ServiceError(`The parameter 'extensionId' with value '${nonExistingId}' is invalid because that extension is not installed`, BAD_REQUEST, base.badParameterCode));
    }
    {
      // We assess with a too-long embeddings dimension
      await expect(async () =>
      {
        await base.getImageController().setEmbeddings(Base.allPolicyContext, imageId, extensionId, new ImageEmbeddings([...Array(4_097).keys()]));
      }).rejects.toThrow(new ServiceError("The embeddings vector cannot have a dimension larger than 4096", BAD_REQUEST, base.badParameterCode));
    }
    {
      // We assess with non-existing embeddings
      await expect(async () =>
      {
        await base.getImageController().getEmbeddings(imageId, extensionId);
      }).rejects.toThrow(new ServiceError(`There are no embeddings for the image with id '${imageId}' and the extension with id '${extensionId}'`, BAD_REQUEST, base.badParameterCode));
    }
    {
      await base.getImageController().setEmbeddings(Base.allPolicyContext, imageId, extensionId, imageEmbeddings);
      const updatedImageEmbeddings = await base.getImageController().getEmbeddings(imageId, extensionId);
      expect(updatedImageEmbeddings).toEqual(imageEmbeddings);
      const addedImageEmbeddings = await base.getImageController().getEmbeddings(imageId, extensionId);
      expect(addedImageEmbeddings).toEqual(imageEmbeddings);
      const allImageEmbeddings = await base.getImageController().getAllEmbeddings(imageId);
      expect(allImageEmbeddings.length).toEqual(1);
      expect(allImageEmbeddings[0].id).toEqual(extensionId);
      expect(allImageEmbeddings[0].values).toEqual(imageEmbeddings.values);
    }
    {
      // We assess with non-homogeneous embeddings
      await expect(async () =>
      {
        await base.getImageController().setEmbeddings(Base.allPolicyContext, imageId, extensionId, new ImageEmbeddings([1]));
      }).rejects.toThrow(new ServiceError(`The embeddings length 1 is not the expected one 5`, BAD_REQUEST, base.badParameterCode));
    }
    {
      // We delete the image and check that the embeddings are deleted
      const filePath = image.url.substring(fileWithProtocol.length);
      // We wait for the image to be considered deleted by the server
      await base.waitUntilImage(image.repositoryId, filePath, false, () =>
      {
        fs.rmSync(filePath);
      });
      expect(await base.getVectorDatabaseAccessor().getEmbeddings(imageId, extensionId)).toBeUndefined();
    }
  });

  test.each(imageCases)("image with format=$format", async ({ format, fileName, caption }: ImageCase) =>
  {
    async function testImage(fileName: string, imageFormat: ImageFormat, _caption: string, allMetadataAssessment: ((all: string) => void) | undefined)
    {
      const { image } = await base.prepareRepositoryWithImage(fileName);
      expect(image.format).toEqual(imageFormat);
      expect(image.mimeType()).toEqual("image/" + imageFormat.toLowerCase());
      if (allMetadataAssessment !== undefined)
      {
        allMetadataAssessment(image.metadata.all!);
      }
      expect(image.features.length).toEqual(0);
    }

    await testImage(fileName, format, computeExpectedCaption(caption), (all: string) =>
    {
      if (format === ImageFormat.PNG || format === ImageFormat.JPEG)
      {
        expect(all).toBeDefined();
        if (format === ImageFormat.PNG)
        {
          expect(JSON.parse(all)["ImageWidth"]).toEqual(1024);
        }
      }
    });
  });

  test("computeImageDetails", async () =>
  {
    const directoryPath = base.prepareEmptyDirectory(Defaults.emptyDirectoryName, base.getWorkingDirectoryPath());
    {
      const filePath = path.join(directoryPath, `${base.imageFeeder.pngImageFileName}-${randomUUID()}`);
      const userComment = await base.imageFeeder.prepareAutomatic1111Image(filePath);
      const details = await base.getSearchService().computeImageDetails(filePath);

      expect(details.metadata.all).toBeDefined();
      const allMetadata = JSON.parse(details.metadata.all!);
      expect(allMetadata.userComment).toEqual(userComment);
      expect(details.sourceUrl).toBeUndefined();
    }
    {
      const filePath = path.join(directoryPath, `${base.imageFeeder.pngImageFileName}-${randomUUID()}`);
      const { prompt, workflow } = await base.imageFeeder.prepareComfyUiImage(filePath);
      const sourceUrl = "https://image.com/url";
      const details = await base.getSearchService().computeImageDetails(filePath, sourceUrl);

      expect(details.metadata.all).toBeDefined();
      const allMetadata = JSON.parse(details.metadata.all!);
      expect(JSON.parse(allMetadata.prompt)).toEqual(prompt);
      expect(JSON.parse(allMetadata.workflow)).toEqual(workflow);
      expect(details.sourceUrl).toEqual(sourceUrl);
    }
  });

  test("attachment", async () =>
  {
    const imageId = (await base.prepareRepositoryWithImage(base.imageFeeder.pngImageFileName, "directory")).image.id;
    const format = ImageFormat.JPEG;
    const mimeType = toMimeType(format);

    {
      // We assess with an inexistent extension
      const extensionId = "extension-id";
      await expect(async () =>
      {
        await base.getImageAttachmentController().create(Base.allPolicyContext, imageId, extensionId, mimeType, fs.readFileSync(path.join(base.imageFeeder.imagesDirectoryPath, base.imageFeeder.pngImageFileName)));
      }).rejects.toThrow(new ServiceError(`The parameter 'extensionId' with value '${extensionId}' is invalid because that extension is not installed`, BAD_REQUEST, base.badParameterCode));
    }

    const extensionId = (await base.prepareExtension("extension")).manifest.id;

    {
      // We assess with a too-large attachment
      await expect(async () =>
      {
        await base.getImageAttachmentController().create(Base.allPolicyContext, imageId, extensionId, mimeType, Buffer.from(Array(1024 * 1024 + 1).fill(0)));
      }).rejects.toThrow(new ServiceError("The provided attachment exceeds the maximum allowed binary weight of 1048576 bytes", BAD_REQUEST, base.badParameterCode));
    }

    const attachmentPrefix = "attachment://";
    {
      // We assess to create an attachment with a mismatching MIME type
      {
        const attachmentBuffer = Buffer.from("dummy");
        await expect(async () =>
        {
          await base.getImageAttachmentController().create(Base.allPolicyContext, imageId, extensionId, mimeType, attachmentBuffer);
        }).rejects.toThrow(new ServiceError("The payload MIME type cannot be determined", BAD_REQUEST, base.badParameterCode));
      }
      {
        const attachmentBuffer = fs.readFileSync(path.join(base.imageFeeder.imagesDirectoryPath, base.imageFeeder.pngImageFileName));
        await expect(async () =>
        {
          await base.getImageAttachmentController().create(Base.allPolicyContext, imageId, extensionId, mimeType, attachmentBuffer);
        }).rejects.toThrow(new ServiceError(`The parameter 'mimeType' with value '${mimeType}' is invalid because the payload MIME type does not match`, BAD_REQUEST, base.badParameterCode));
      }
    }
    let attachmentUri: string;
    {
      // We properly download the attachment
      const attachmentBuffer = fs.readFileSync(path.join(base.imageFeeder.imagesDirectoryPath, base.imageFeeder.jpegImageFileName));
      attachmentUri = await base.getImageAttachmentController().create(Base.allPolicyContext, imageId, extensionId, mimeType, attachmentBuffer);
      const streamableFile = await base.getImageAttachmentController().download(attachmentUri);
      expect(streamableFile.getHeaders().type).toEqual(toMimeType(format));
      expect(streamableFile.getHeaders().disposition).toEqual(computeAttachmentDisposition(`${attachmentUri.substring(attachmentPrefix.length)}.${toFileExtension(format)}`));
      const returnedBuffer = await streamBuffer(streamableFile.getStream());
      const base64 = "base64";
      expect(returnedBuffer.toString(base64)).toEqual(attachmentBuffer.toString(base64));
    }
    {
      // We attempt to download with an inexistent URI
      const uri = attachmentPrefix + "1234567890";
      await expect(async () =>
      {
        await base.getImageAttachmentController().download(uri);
      }).rejects.toThrow(new ServiceError(`The parameter 'uri' with value '${uri}' is invalid because there is no attachment with that URI`, BAD_REQUEST, base.badParameterCode));
    }
    {
      // We attempt to download with an invalid URI
      const uri = "attachment://dummy";
      await expect(async () =>
      {
        await base.getImageAttachmentController().download(uri);
      }).rejects.toThrow(new ServiceError(`The parameter 'uri' with value '${uri}' is invalid because its suffix is not an integer`, BAD_REQUEST, base.badParameterCode));
    }
    {
      // We attempt to download with an invalid URI
      const uri = "invalidUri";
      await expect(async () =>
      {
        await base.getImageAttachmentController().download(uri);
      }).rejects.toThrow(new ServiceError(`The parameter 'uri' with value '${uri}' is invalid because it does not start with '${attachmentPrefix}'`, BAD_REQUEST, base.badParameterCode));
    }
    const otherImage = (await base.prepareRepositoryWithImage(base.imageFeeder.pngImageFileName, "other", false)).image;
    const otherImageAttachmentUri = await base.getImageAttachmentController().create(Base.allPolicyContext, otherImage.id, extensionId, mimeType, fs.readFileSync(path.join(base.imageFeeder.imagesDirectoryPath, base.imageFeeder.jpegImageFileName)));
    const otherExtensionId = (await base.prepareExtension("other")).manifest.id;
    const otherExtensionAttachmentUri = await base.getImageAttachmentController().create(Base.allPolicyContext, imageId, otherExtensionId, mimeType, fs.readFileSync(path.join(base.imageFeeder.imagesDirectoryPath, base.imageFeeder.jpegImageFileName)));
    // We attempt to set a binary feature with an invalid attachment URI
    for (const type of [ImageFeatureType.METADATA, ImageFeatureType.OTHER])
    {
      {
        const value = "dummyUri";
        await expect(async () =>
        {
          await base.getImageController().setFeatures(Base.allPolicyContext, imageId, extensionId, [new ImageFeature(type, ImageFeatureFormat.BINARY, undefined, value)]);
        }).rejects.toThrow(new ServiceError(`The parameter '[0].value' with value '${value}' is invalid because it does not start with '${attachmentPrefix}'`, BAD_REQUEST, base.badParameterCode));
      }
      {
        const value = attachmentPrefix + "123string";
        await expect(async () =>
        {
          await base.getImageController().setFeatures(Base.allPolicyContext, imageId, extensionId, [new ImageFeature(type, ImageFeatureFormat.BINARY, undefined, value)]);
        }).rejects.toThrow(new ServiceError(`The parameter '[0].value' with value '${value}' is invalid because its suffix is not an integer`, BAD_REQUEST, base.badParameterCode));
      }
      {
        const value = attachmentPrefix + 123;
        await expect(async () =>
        {
          await base.getImageController().setFeatures(Base.allPolicyContext, imageId, extensionId, [new ImageFeature(type, ImageFeatureFormat.BINARY, undefined, value)]);
        }).rejects.toThrow(new ServiceError(`The parameter '[0].value' with value '${value}' is invalid because there is no attachment with that URI`, BAD_REQUEST, base.badParameterCode));
      }
      await expect(async () =>
      {
        await base.getImageController().setFeatures(Base.allPolicyContext, imageId, extensionId, [new ImageFeature(type, ImageFeatureFormat.BINARY, undefined, otherImageAttachmentUri)]);
      }).rejects.toThrow(new ServiceError(`The parameter '[0].value' with value '${otherImageAttachmentUri}' is invalid because the attachment with that URI is not bound to the image with id '${imageId}'`, BAD_REQUEST, base.badParameterCode));
      await expect(async () =>
      {
        await base.getImageController().setFeatures(Base.allPolicyContext, imageId, extensionId, [new ImageFeature(type, ImageFeatureFormat.BINARY, undefined, otherExtensionAttachmentUri)]);
      }).rejects.toThrow(new ServiceError(`The parameter '[0].value' with value '${otherExtensionAttachmentUri}' is invalid because the attachment with that URI is not bound to the extension with id '${extensionId}'`, BAD_REQUEST, base.badParameterCode));
    }
    {
      // We change the features and assess the presence of their corresponding attachements
      await base.getImageController().setFeatures(Base.allPolicyContext, imageId, otherExtensionId, [new ImageFeature(ImageFeatureType.METADATA, ImageFeatureFormat.BINARY, undefined, otherExtensionAttachmentUri)]);
      expect((await base.getModuleProvider(ImageAttachmentService).list(imageId)).length).toEqual(2);
      await base.getImageController().setFeatures(Base.allPolicyContext, imageId, otherExtensionId, []);
      const entities = await base.getModuleProvider(ImageAttachmentService).list(imageId);
      expect(entities.length).toEqual(1);
      expect(attachmentPrefix + entities[0].id).toEqual(attachmentUri);
    }
  });

  test("applicationMetadata", async () =>
  {
    const extension1 = await base.prepareExtension("id1");
    const extension2 = await base.prepareExtension("id2");
    const repository = await base.prepareEmptyRepository();
    const value1 = { key: "value" };
    const value2 = new GenerationRecipe(["model"], new TextualPrompt("prompt"));
    const image = await base.getRepositoryController().storeImage(repository.id, undefined, undefined, JSON.stringify(new ApplicationMetadata([new ApplicationMetadataItem(extension1.manifest.id, value1), new ApplicationMetadataItem(extension2.manifest.id, value2)])), undefined, undefined, fs.readFileSync(base.imageFeeder.getImageFilePath(base.imageFeeder.pngImageFileName)));

    // We copy an image with application metadata
    const buffer = fs.readFileSync(image.url.substring(fileWithProtocol.length));
    const filePath = path.join(repository.url.substring(fileWithProtocol.length), image.name + "-new." + toFileExtension(image.format));
    fs.writeFileSync(filePath, buffer);
    const newImage = await base.waitUntilImage(repository.id, filePath, true);
    const features = await base.getImageController().getAllFeatures(newImage.id);
    expect(features.length).toEqual(2);
    const extensions = [extension1, extension2];
    const values = [value1, value2];
    for (let index = 0; index < features.length; index++)
    {
      const feature = features[index];
      expect(feature.id).toEqual(extensions[index].manifest.id);
      expect(feature.name).toBeUndefined();
      expect(feature.type).toEqual(ImageFeatureType.RECIPE);
      expect(feature.format).toEqual(ImageFeatureFormat.JSON);
      expect(feature.value).toEqual(JSON.stringify(values[index]));
    }
  });

  test("computeFormat", async () =>
  {
    {
      // We assess with invalid parameters
      {
        // We assess with a too-large image
        await expect(async () =>
        {
          await base.getImageController().computeFormat(Buffer.alloc(base.imageMaximumBinaryWeightInBytes + 1));
        }).rejects.toThrow(new ServiceError(`The provided image exceeds the maximum allowed binary weight of ${base.imageMaximumBinaryWeightInBytes} bytes`, BAD_REQUEST, base.badParameterCode));
      }
      {
        // We assess with an invalid image
        await expect(async () =>
        {
          await base.getImageController().computeFormat(Buffer.from("invalid image"));
        }).rejects.toThrow(new ServiceError("The provided file is not a supported image. Reason: 'Unable to parse the image metadata. Reason: 'Input buffer contains unsupported image format''", BAD_REQUEST, base.badParameterCode));
      }
    }
    // We assess with valid images
    for (const imageCase of imageCases)
    {
      const format = await base.getImageController().computeFormat(base.imageFeeder.readImage(imageCase.fileName));
      expect(format.value).toEqual(imageCase.format);
    }
  });

  test("convertInto", async () =>
  {
    {
      // We assess with invalid parameters
      {
        // We assess with a too-large image
        await expect(async () =>
        {
          await base.getImageController().convert(ImageFormat.PNG, undefined, Buffer.alloc(base.imageMaximumBinaryWeightInBytes + 1));
        }).rejects.toThrow(new ServiceError(`The provided image exceeds the maximum allowed binary weight of ${base.imageMaximumBinaryWeightInBytes} bytes`, BAD_REQUEST, base.badParameterCode));
      }
      {
        // We assess with an invalid image
        await expect(async () =>
        {
          await base.getImageController().convert(ImageFormat.PNG, undefined, Buffer.from("invalid image"));
        }).rejects.toThrow(new ServiceError("The provided file is not a supported image. Reason: 'Unable to parse the metadata for the image. Reason: 'Input buffer contains unsupported image format''", BAD_REQUEST, base.badParameterCode));
      }
      {
        // We assess with an invalid "quality" parameter
        for (const quality of [0, 101])
        {
          await expect(async () =>
          {
            // @ts-ignore
            await base.getImageController().convert(ImageFormat.PNG, quality, imageFeeder.getImageFilePath(imageFeeder.pngImageFileName));
          }).rejects.toThrow(new ServiceError(`The parameter 'quality' with value '${quality}' is invalid because it must be an integer between 1 and 100`, BAD_REQUEST, base.badParameterCode));
        }
      }
    }
    // We assess with valid images
    for (const imageCase of imageCases)
    {
      for (const format of ImageFormats)
      {
        const qualities: (NumericRange<1, 100> | undefined)[] = (format === ImageFormat.JPEG || format === ImageFormat.WEBP || format === ImageFormat.AVIF) ? [1, 50, 100] : [undefined];
        const lengths: number[] = [];
        for (const quality of qualities)
        {
          const streamableFile = await base.getImageController().convert(format, quality, imageFeeder.readImage(imageCase.fileName));
          const downloadedBuffer = await streamBuffer(streamableFile.getStream());
          expect(await computeFormat(downloadedBuffer)).toEqual(format === ImageFormat.HEIF ? ImageFormat.AVIF : format);
          if (lengths.length > 0)
          {
            // We check that the quality impacts the binary weight of the image
            expect(lengths[lengths.length - 1]).toBeLessThan(downloadedBuffer.length);
          }
          lengths.push(downloadedBuffer.length);
        }
      }
    }
  });

  function computeExpectedCaption(caption: string): string
  {
    return caption;
  }

  async function preparedRepositoryAndExtension(): Promise<{ image: Image; extensionId: string }>
  {
    paths.installedExtensionsDirectoryPath = base.prepareEmptyDirectory("extensions", base.getWorkingDirectoryPath());
    const { image } = await base.prepareRepositoryWithImage(base.imageFeeder.pngImageFileName);
    return { image, extensionId: (await base.prepareExtension()).manifest.id };
  }

});

describe("Image with application", () =>
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

  test("synchronize", async () =>
  {
    const { image } = await base.prepareRepositoryWithImage(base.imageFeeder.jpegImageFileName);
    const extension1 = await base.prepareExtension("extension1", [ManifestEvent.ProcessStarted, ManifestEvent.ImageCreated, ManifestEvent.ImageUpdated, ManifestEvent.ImageComputeTags, ManifestEvent.ImageComputeFeatures, ManifestEvent.ImageComputeEmbeddings], [], [{ id: ManifestCapabilityId.ImageTags }, { id: ManifestCapabilityId.ImageFeatures }, { id: ManifestCapabilityId.ImageEmbeddings }]);
    const extension2 = await base.prepareExtension("extension2", [ManifestEvent.ProcessStarted, ManifestEvent.ImageCreated, ManifestEvent.ImageUpdated, ManifestEvent.ImageComputeTags], [], [{ id: ManifestCapabilityId.ImageTags }]);

    const file1Paths = [`tag-${image.id}`, `feature-${image.id}`, `embeddings-${image.id}`].map(fileName => path.join(path.join(paths.installedExtensionsDirectoryPath, extension1.manifest.id), fileName));
    const file2Paths = [`tag-${image.id}`].map(fileName => path.join(path.join(paths.installedExtensionsDirectoryPath, extension2.manifest.id), fileName));
    await base.waitUntil(async () =>
    {
      return file1Paths.filter(filePath => fs.existsSync(filePath) === true).length === file1Paths.length && file2Paths.filter(filePath => fs.existsSync(filePath) === true).length === file2Paths.length;
    });
    for (const filePath of file1Paths.concat(file2Paths))
    {
      fs.rmSync(filePath);
    }

    await base.getImageController().synchronize(image.id);
    for (const filePath of file1Paths.concat(file2Paths))
    {
      expect(fs.existsSync(filePath)).toEqual(true);
    }
  });

  test.each(imageCases)("mediaUrl with image '$fileName'", async ({ format, fileName, width, height }: ImageCase) =>
  {
    const { image } = await base.prepareRepositoryWithImage(fileName);
    const sizes = [undefined, 100, 200];
    for (const requestedFormat of [undefined, ...ImageFormats])
    {
      for (const requestedWidth of sizes)
      {
        for (const requestedHeight of sizes)
        {
          for (const requestedRender of [undefined, ImageResizeRender.Inbox, ImageResizeRender.Outbox])
          {
            const mediaUrl = await base.getImageController().mediaUrl(image.id, requestedFormat, requestedWidth, requestedHeight, requestedRender);
            expect(mediaUrl.id).toEqual(image.id);
            const url = mediaUrl.url;
            if (requestedFormat !== undefined)
            {
              expect(url).toContain(`f=${requestedFormat}`);
            }
            if (requestedWidth !== undefined)
            {
              expect(url).toContain(`w=${requestedWidth}`);
            }
            if (requestedHeight !== undefined)
            {
              expect(url).toContain(`h=${requestedHeight}`);
            }
            if (requestedRender !== undefined)
            {
              expect(url).toContain(`r=${requestedRender}`);
            }
            const response = await fetch(url);
            expect(response.status).toEqual(OK);
            const arrayBuffer = await response.arrayBuffer();
            const miscellaneousMetadata = await readMetadata(Buffer.from(arrayBuffer));
            expect(((requestedFormat === ImageFormat.HEIF || (requestedFormat === undefined && format == ImageFormat.HEIF)) && miscellaneousMetadata.format === ImageFormat.AVIF) ? ImageFormat.HEIF : miscellaneousMetadata.format).toEqual(requestedFormat ?? format);
            if (requestedWidth === undefined && requestedHeight === undefined)
            {
              expect(miscellaneousMetadata.width).toEqual(width);
              expect(miscellaneousMetadata.height).toEqual(height);
            }
            else
            {
              if (requestedHeight === undefined)
              {
                expect(miscellaneousMetadata.width).toEqual(requestedWidth ?? width);
              }
              else if (requestedWidth === undefined)
              {
                expect(miscellaneousMetadata.height).toEqual(requestedHeight ?? height);
              }
              else
              {
                const originalRatio = width / height;
                const requestedRatio = requestedWidth / requestedHeight;
                const isOriginalRatioGreater = originalRatio >= requestedRatio;
                const condition = (requestedRender === undefined || requestedRender === ImageResizeRender.Inbox) ? isOriginalRatioGreater : !isOriginalRatioGreater;
                expect(miscellaneousMetadata.width).toEqual(condition === true ? requestedWidth : Math.round(requestedHeight * originalRatio));
                expect(miscellaneousMetadata.height).toEqual(condition === true ? Math.round(requestedWidth / originalRatio) : requestedHeight);
              }
            }
          }
        }
      }
    }
  });

});
