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
  ImageResizeRender,
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

function getImageSrc(url: string, width?: number, height?: number, render? : ImageResizeRender)
{
  const widthParameter = width ? `&w=${width}` : "";
  const heightParameter = height ? `&h=${height}` : "";
  const renderParameter = render ? `&r=${render}` : "";
  return `${BASE_PATH}/resize/?u=${encodeURIComponent(url)}${widthParameter}${heightParameter}${renderParameter}`;
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

async function destroy(id: string): Promise<void> {
   await imageApi.imageDelete({id});
}

async function getAllTags(imageId: string): Promise<ExtensionImageTag[]> {
  return imageApi.imageGetAllTags({ id: imageId });
}

function computeImageDimensions(imageDimensions: ImageDimensions, areaDimensions: ImageDimensions, resizeRender: ImageResizeRender): ImageDimensions {
  const imageRatio = imageDimensions.width / imageDimensions.height;
  const areaRatio = areaDimensions.width / areaDimensions.height;
  const scaleRatio = Math.min(1, Math.min(imageDimensions.width / areaDimensions.width, imageDimensions.height / areaDimensions.height));
  const areaWidth = areaDimensions.width * scaleRatio;
  const areaHeight = areaDimensions.height * scaleRatio;
  if (resizeRender === "inbox") {
    if (imageRatio >= areaRatio) {
      return { width: Math.round(areaWidth), height: Math.round(areaWidth / imageRatio) };
    }
    else {
      return { width: Math.round(areaHeight * imageRatio), height: Math.round(areaHeight) };
    }
  }
  else if (resizeRender === "outbox") {
    return { width: Math.round(areaWidth), height: Math.round(areaHeight) };
  }
  else
  {
    throw new Error(`Unsupported resize render '${resizeRender}'`);
  }
}

export default {
  searchImages,
  searchSummaries,
  get,
  getImageSrc,
  getAllFeatures,
  getClosestImages,
  synchronize,
  destroy,
  getAllTags,
  textToImages,
  computeImageDimensions,
};
