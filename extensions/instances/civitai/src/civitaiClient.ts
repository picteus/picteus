export interface CivitaiResource
{

  readonly type?: string;
  readonly weight?: number;
  readonly modelVersionId?: number;
  readonly modelName?: string;
  readonly modelVersionName?: string;

}

export interface CivitaiGenericResource
{

  readonly type?: string;
  readonly name?: string;
  readonly modelName?: string;
  readonly weight?: number | string;

}

export interface CivitaiImageStats
{

  readonly cryCount?: number;
  readonly laughCount?: number;
  readonly likeCount?: number;
  readonly dislikeCount?: number;
  readonly heartCount?: number;
  readonly commentCount?: number;

}

export interface CivitaiAspectRatio
{

  readonly value?: string;
  readonly width?: number;
  readonly height?: number;

}

export interface CivitaiImageMeta
{

  readonly Size?: string | null;
  readonly seed?: number | null;
  readonly Model?: string | null;
  readonly model?: string | null;
  readonly baseModel?: string | null;
  readonly basemodel?: string | null;
  readonly models?: readonly string[] | null;
  readonly negativePrompt?: string | null;
  readonly prompt?: string | null;
  readonly sampler?: string | null;
  readonly Sampler?: string | null;
  readonly steps?: number | null;
  readonly cfgScale?: number | null;
  readonly clipSkip?: number | null;
  readonly width?: number | null;
  readonly height?: number | null;
  readonly aspectRatio?: string | CivitaiAspectRatio | null;
  readonly comfy?: string | Record<string, unknown> | null;
  readonly civitaiResources?: readonly CivitaiResource[] | null;
  readonly resources?: readonly (CivitaiGenericResource | Record<string, unknown>)[] | null;
  readonly hashes?: Record<string, unknown> | null;
  readonly meta?: CivitaiImageMeta;

  readonly [propertyKey: string]: unknown;

}

export interface CivitaiImage
{

  readonly id: number;
  readonly url: string;
  readonly hash?: string;
  readonly width?: number;
  readonly height?: number;
  readonly nsfw?: boolean;
  readonly nsfwLevel?: "None" | "Soft" | "Mature" | "X" | string;
  readonly createdAt?: string;
  readonly postId?: number;
  readonly stats?: CivitaiImageStats;
  readonly meta?: CivitaiImageMeta | null;
  readonly username?: string;
  readonly baseModel?: string;
  readonly basemodel?: string;

}

export interface CivitaiMetadata
{

  readonly currentPage?: number;
  readonly nextPage?: string;
  readonly prevPage?: string;
  readonly pageSize?: number;
  readonly nextCursor?: string;

}

export interface CivitaiImagesResponse
{

  readonly items: readonly CivitaiImage[];
  readonly metadata?: CivitaiMetadata;

}

export interface CivitaiGetImagesOptions
{

  readonly limit: number;
  readonly postId?: number;
  readonly modelId?: number;
  readonly modelVersionId?: number;
  readonly username?: string;
  readonly nsfw?: boolean;
  readonly browsingLevel?: number;
  readonly sort?: "Most Reactions" | "Most Comments" | "Most Collected" | "Newest" | "Oldest" | "Random";
  readonly period?: "AllTime" | "Year" | "Month" | "Week" | "Day";
  readonly page?: number;
  readonly cursor?: string;
  readonly imageId?: number;
  readonly userId?: number;
  readonly tags?: readonly number[];
  readonly type?: "image" | "video" | "audio";
  readonly baseModels?: readonly string[];
  readonly withMeta?: boolean;

}

export interface CivitaiRetrieveImageOptions extends CivitaiGetImagesOptions
{

  readonly onlyWithMetadata: boolean;

}

export class CivitaiClient
{

  private static readonly MAXIMUM_SCANNED_PAGES: number = 10;

  private static readonly MAXIMUM_SCANNED_IMAGES: number = 200;

  private static readonly BASE_URL: string = "https://civitai.com/api/v1";

  async retrieveImages(options: CivitaiRetrieveImageOptions): Promise<CivitaiImage[]>
  {
    const targetCount = options.limit;
    const onlyWithMetadata = options.onlyWithMetadata;
    let scannedPagesCount: number = 0;
    let scannedImagesCount: number = 0;
    let currentCursor: string | undefined = options.cursor;
    const collectedImages: CivitaiImage[] = [];
    while (collectedImages.length < targetCount && scannedPagesCount < CivitaiClient.MAXIMUM_SCANNED_PAGES && scannedImagesCount < CivitaiClient.MAXIMUM_SCANNED_IMAGES)
    {
      const pageOptions: CivitaiGetImagesOptions = { ...options, limit: targetCount, cursor: currentCursor };
      const response: CivitaiImagesResponse = await this.getImages(pageOptions);
      scannedPagesCount++;
      scannedImagesCount += response.items.length;
      for (const image of response.items)
      {
        if (onlyWithMetadata === true)
        {
          if (image.meta === null || image.meta === undefined)
          {
            continue;
          }
        }
        collectedImages.push(image);
        if (collectedImages.length >= targetCount)
        {
          break;
        }
      }
      const nextCursor: string | undefined = response.metadata?.nextCursor;
      if (nextCursor === undefined || nextCursor === null || response.items.length === 0)
      {
        break;
      }
      currentCursor = nextCursor;
    }

    return collectedImages;
  }

  async getImage(imageId: number): Promise<CivitaiImage | undefined>
  {
    const response = await this.getImages({ limit: 1, imageId, withMeta: true });
    return response.items[0];
  }

  async getImages(options: CivitaiGetImagesOptions): Promise<CivitaiImagesResponse>
  {
    const url = new URL(`${CivitaiClient.BASE_URL}/images`);
    for (const [ parameterKey, parameterValue ] of Object.entries(options))
    {
      if (parameterValue !== undefined)
      {
        if (Array.isArray(parameterValue))
        {
          url.searchParams.set(parameterKey, parameterValue.join(","));
        }
        else
        {
          url.searchParams.set(parameterKey, String(parameterValue));
        }
      }
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" }
    });

    if (!response.ok)
    {
      const responseBody = await response.text().catch(() => "");
      throw new Error(`Failed to fetch images from Civitai API (status: ${response.status} ${response.statusText}): ${responseBody}`);
    }
    return (await response.json()) as CivitaiImagesResponse;
  }

}
