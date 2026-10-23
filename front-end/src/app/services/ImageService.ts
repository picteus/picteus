import {
  ExtensionImageFeature,
  ExtensionImageTag,
  type Image,
  ImageApi,
  ImageApiImageClosestImagesRequest,
  ImageApiImageGetAllFeaturesRequest,
  ImageApiImageGetRequest,
  ImageApiImageRunCapabilitiesRequest,
  ImageApiImageSearchRunCapabilitiesRequest,
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
  filter: {
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
  range: { take: 1000 }
};

async function searchImages(
  parameters?: SearchParameters
): Promise<SearchImageResult>
{
  return await imageApi.imageSearchImages({ searchParameters: parameters ?? defaultSearchCriteria });
}

async function searchSummaries(
  parameters?: SearchParameters
): Promise<SearchImageSummaryResult>
{
  return await imageApi.imageSearchSummaries({ searchParameters: parameters ?? defaultSearchCriteria });
}

async function get(parameters: ImageApiImageGetRequest): Promise<Image>
{
  return imageApi.imageGet(parameters);
}

async function download(id: string): Promise<Blob>
{
  return imageApi.imageDownload({ id });
}

function getImageSrc(url: string, width?: number, height?: number, render?: ImageResizeRender)
{
  const widthParameter = width ? `&w=${width}` : "";
  const heightParameter = height ? `&h=${height}` : "";
  const renderParameter = render ? `&r=${render}` : "";
  return `${BASE_PATH}/resize/?u=${encodeURIComponent(url)}${widthParameter}${heightParameter}${renderParameter}`;
}

async function getAllFeatures(
  parameters: ImageApiImageGetAllFeaturesRequest
): Promise<Array<ExtensionImageFeature>>
{
  return imageApi.imageGetAllFeatures(parameters);
}

async function textToImages(
  requestParameters: ImageApiImageTextToImagesRequest
): Promise<ImageDistance[]>
{
  return imageApi.imageTextToImages(requestParameters);
}

async function getClosestImages(
  requestParameters: ImageApiImageClosestImagesRequest
): Promise<ImageDistance[]>
{
  return imageApi.imageClosestImages(requestParameters);
}

async function computeImageUriFromUrls(imageUrls: string[], edge: number): Promise<string>
{
  function drawErrorRepresentation(content: CanvasRenderingContext2D, x: number, y: number,
    width: number, height: number, radius: number): void
  {
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const size = Math.min(width, height) * 0.4;

    content.save();
    content.beginPath();
    content.moveTo(x + radius, y);
    content.lineTo(x + width - radius, y);
    content.quadraticCurveTo(x + width, y, x + width, y + radius);
    content.lineTo(x + width, y + height - radius);
    content.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    content.lineTo(x + radius, y + height);
    content.quadraticCurveTo(x, y + height, x, y + height - radius);
    content.lineTo(x, y + radius);
    content.quadraticCurveTo(x, y, x + radius, y);
    content.closePath();
    content.clip();
    content.fillStyle = "#e0e0e0";
    content.fillRect(x, y, width, height);
    content.fillStyle = "#9e9e9e";
    content.font = `${size}px sans-serif`;
    content.textAlign = "center";
    content.textBaseline = "middle";
    content.fillText("X", centerX, centerY);
    content.restore();
  }

  async function drawSingleImage(context: CanvasRenderingContext2D, image: HTMLImageElement | null, x: number, y: number, width: number, height: number, radius: number): Promise<void>
  {
    if (image === null)
    {
      drawErrorRepresentation(context, x, y, width, height, radius);
      return;
    }

    const imageWidth = image.naturalWidth || image.width;
    const imageHeight = image.naturalHeight || image.height;
    if (imageWidth === 0 || imageHeight === 0)
    {
      drawErrorRepresentation(context, x, y, width, height, radius);
      return;
    }

    const scale = Math.max(width / imageWidth, height / imageHeight);
    const drawWidth = imageWidth * scale;
    const drawHeight = imageHeight * scale;
    const drawX = x + (width - drawWidth) / 2;
    const drawY = y + (height - drawHeight) / 2;

    context.save();
    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + width - radius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + radius);
    context.lineTo(x + width, y + height - radius);
    context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    context.lineTo(x + radius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
    context.closePath();
    context.clip();
    context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    context.restore();
  }

  const canvas = document.createElement("canvas");
  canvas.width = edge;
  canvas.height = edge;
  const context = canvas.getContext("2d");
  const separator = 2;
  const cellSize = (edge - separator) / 2;
  const offset = cellSize + separator;
  const radius = edge / 8;
  const objectUrls: (string | null)[] = [];

  try
  {
    const items: { blob: Blob | null, url: string, error: boolean }[] = await Promise.all(imageUrls.map(async (url) =>
      {
        try
        {
          const resizedUrl = getImageSrc(url, edge, edge);
          const response = await fetch(resizedUrl);
          if (!response.ok)
          {
            return { blob: null, url, error: true };
          }
          const blob = await response.blob();
          return { blob, url, error: false };
        }
        catch
        {
          return { blob: null, url, error: true };
        }
      })
    );

    const loadedImages: (HTMLImageElement | null)[] = await Promise.all(items.map(async (item, index) =>
      {
        if (item.error)
        {
          objectUrls[index] = null;
          return null;
        }
        const objectUrl = URL.createObjectURL(item.blob!);
        objectUrls[index] = objectUrl;
        return new Promise<HTMLImageElement>((resolve) =>
        {
          const imageElement = new Image();
          imageElement.onload = () => resolve(imageElement);
          imageElement.onerror = () => resolve(null);
          imageElement.src = objectUrl;
        });
      })
    );

    let layoutRectangles: { x: number, y: number, width: number, height: number }[];
    if (imageUrls.length === 1)
    {
      layoutRectangles = [ { x: 0, y: 0, width: edge, height: edge } ];
    }
    else if (imageUrls.length === 2)
    {
      layoutRectangles =
        [
          { x: 0, y: 0, width: cellSize, height: edge },
          { x: offset, y: 0, width: cellSize, height: edge }
        ];
    }
    else
    {
      layoutRectangles =
        [
          { x: 0, y: 0, width: cellSize, height: cellSize },
          { x: offset, y: 0, width: cellSize, height: cellSize },
          { x: 0, y: offset, width: cellSize, height: cellSize },
          { x: offset, y: offset, width: cellSize, height: cellSize }
        ];
    }

    for (let index = 0; index < loadedImages.length; index++)
    {
      const { x, y, width, height } = layoutRectangles[index];
      await drawSingleImage(context, loadedImages[index], x, y, width, height, radius);
    }

    return canvas.toDataURL();
  }
  finally
  {
    objectUrls.forEach(url =>
    {
      if (url)
      {
        URL.revokeObjectURL(url);
      }
    });
  }
}

async function computeImageUriFromIds(imageIds: string[], edge: number): Promise<string>
{
  const fetchedResults = await Promise.allSettled(imageIds.slice(0, 4).map(imageId => get({ id: imageId })));
  const imageUrls = fetchedResults.filter((result): result is PromiseFulfilledResult<Image> => result.status === "fulfilled" && Boolean(result.value?.url)).map(result => result.value.url);
  return computeImageUriFromUrls(imageUrls, edge);
}

async function runCapabilities(requestParameters: ImageApiImageRunCapabilitiesRequest): Promise<void>
{
  await imageApi.imageRunCapabilities(requestParameters);
}

async function searchRunCapabilities(requestParameters: ImageApiImageSearchRunCapabilitiesRequest): Promise<void>
{
  await imageApi.imageSearchRunCapabilities(requestParameters);
}

async function destroy(id: string): Promise<void>
{
  await imageApi.imageDelete({ id });
}

async function getAllTags(imageId: string): Promise<ExtensionImageTag[]>
{
  return imageApi.imageGetAllTags({ id: imageId });
}

function computeImageDimensions(imageDimensions: ImageDimensions, areaDimensions: ImageDimensions, resizeRender: ImageResizeRender): ImageDimensions
{
  const imageRatio = imageDimensions.width / imageDimensions.height;
  const areaRatio = areaDimensions.width / areaDimensions.height;
  const scaleRatio = Math.min(1, imageRatio >= areaRatio ? (imageDimensions.width / areaDimensions.width) : (imageDimensions.height / areaDimensions.height));
  const areaWidth = areaDimensions.width * scaleRatio;
  const areaHeight = areaDimensions.height * scaleRatio;
  if (resizeRender === "inbox")
  {
    if (imageRatio >= areaRatio)
    {
      return { width: Math.round(areaWidth), height: Math.round(areaWidth / imageRatio) };
    }
    else
    {
      return { width: Math.round(areaHeight * imageRatio), height: Math.round(areaHeight) };
    }
  }
  else if (resizeRender === "outbox")
  {
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
  download,
  getImageSrc,
  getAllFeatures,
  getClosestImages,
  runCapabilities,
  searchRunCapabilities,
  destroy,
  getAllTags,
  textToImages,
  computeImageDimensions,
  computeImageUriFromUrls,
  computeImageUriFromIds
};
