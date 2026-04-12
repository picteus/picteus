import {
  ExtensionImageFeature,
  ExtensionImageTag,
  ImageApi,
  ImageApiImageClosestImagesRequest,
  ImageApiImageGetAllFeaturesRequest,
  ImageApiImageGetRequest,
  ImageApiImageTextToImagesRequest,
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

function getImageSrc(url: string, width?: number, height?: number, render? : "inbox" | "outbox")
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
};
