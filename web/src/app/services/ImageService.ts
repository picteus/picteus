import {
  ExtensionImageFeature,
  ExtensionImageTag,
  ImageApi,
  ImageApiImageClosestImagesRequest,
  ImageApiImageGetAllFeaturesRequest,
  ImageApiImageGetRequest,
  ImageApiImageTextToImagesRequest,
  ImageDimensions,
  ImageDistance,
  ImageFormat,
  SearchImageResult,
  SearchImageSummaryResult,
  SearchParameters
} from "@picteus/ws-client";

import { BASE_PATH } from "utils";

const imageApi = new ImageApi();

const defaultSearchCriteria: SearchParameters = {
  filter:{
    criteria: {
      formats: [
        ImageFormat.Png,
        ImageFormat.Jpeg,
        ImageFormat.Webp,
        ImageFormat.Gif,
        ImageFormat.Avif,
        ImageFormat.Heif
      ]
    }
  },
  range: { take: 1000 },
};

async function searchImages(
  parameters?: SearchParameters,
): Promise<SearchImageResult> {
  return await imageApi.imageSearchImages({ searchParameters: parameters ?? defaultSearchCriteria });
}

async function searchSummaries(
  parameters?: SearchParameters,
): Promise<SearchImageSummaryResult> {
  return await imageApi.imageSearchSummaries({ searchParameters: parameters ?? defaultSearchCriteria });
}

async function get(parameters: ImageApiImageGetRequest) {
  return imageApi.imageGet(parameters);
}

function getImageSrc(url: string, width?: number, height?: number)
{
  const widthParam = width ? `&w=${width}` : "";
  const heightParam = height ? `&h=${height}` : "";
  return `${BASE_PATH}/resize/?u=${encodeURIComponent(url)}${widthParam}${heightParam}`;
}

async function getAllFeatures(
  parameters: ImageApiImageGetAllFeaturesRequest,
): Promise<Array<ExtensionImageFeature>> {
  return imageApi.imageGetAllFeatures(parameters);
}

async function textToImages(
  requestParameters: ImageApiImageTextToImagesRequest,
): Promise<ImageDistance[]> {
  return imageApi.imageTextToImages(requestParameters);
}
async function getClosestImages(
  requestParameters: ImageApiImageClosestImagesRequest,
): Promise<ImageDistance[]> {
  return imageApi.imageClosestImages(requestParameters);
}

async function synchronize(id: string): Promise<void> {
   await imageApi.imageSynchronize({id});
}

function getFittedDimensionsToScreen(
  imageDimensions: ImageDimensions,
  panelSizes: number[],
): ImageDimensions {
  const WIDTH_OFFSET = 190;
  const HEIGHT_OFFSET = 200;

  const screenDimensions: ImageDimensions = {
    width: (panelSizes[0] / 100) * window.innerWidth - WIDTH_OFFSET,
    height: window.innerHeight - HEIGHT_OFFSET,
  };

  const imageAspectRatio: number =
    imageDimensions.width / imageDimensions.height;
  const screenAspectRatio: number =
    screenDimensions.width / screenDimensions.height;

  let fittedHeight: number;
  let fittedWidth: number;

  if (imageAspectRatio > screenAspectRatio) {
    fittedWidth = screenDimensions.width;
    fittedHeight = screenDimensions.width / imageAspectRatio;
  } else {
    fittedHeight = screenDimensions.height;
    fittedWidth = screenDimensions.height * imageAspectRatio;
  }

  return { width: Math.round(fittedWidth), height: Math.round(fittedHeight) };
}

async function getAllTags(imageId: string): Promise<ExtensionImageTag[]> {
  return imageApi.imageGetAllTags({ id: imageId });
}

export default {
  searchImages,
  searchSummaries,
  get,
  getImageSrc,
  getAllFeatures,
  getFittedDimensionsToScreen,
  getClosestImages,
  synchronize,
  getAllTags,
  textToImages,
};
