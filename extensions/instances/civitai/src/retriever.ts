import {
  CivitaiRESTAPIClient,
  type Image,
  type ImageMeta,
  type ImagesResponse
} from "@stable-canvas/civitai-rest-api-client";

import {
  collapsibleGroup,
  createUiContainer,
  type GenerationRecipe,
  type GenerationRecipePrompt,
  Helper,
  identifier,
  numberUnbounded,
  PromptKind,
  stringLong,
  stringShort,
  table,
  tableRow,
  type TableRow,
  TextIntensity,
  TextWeight,
  type UiContainer,
  type UiElement
} from "@picteus/extension-sdk";


export interface CitivaiImageData
{
  recipe: GenerationRecipe;
  image: Image;
  uiContainer?: UiContainer;
  prompts:
    {
      positive?: string;
      negative?: string;
    };
  postId?: number;
}

const KNOWN_PROPERTY_KEYS: ReadonlySet<string> = new Set<string>([
  "prompt",
  "negativePrompt",
  "Model",
  "model",
  "baseModel",
  "basemodel",
  "Model hash",
  "modelHash",
  "sampler",
  "Sampler",
  "steps",
  "cfgScale",
  "seed",
  "Size",
  "size",
  "clipSkip",
  "Hires upscaler",
  "Hires upscale",
  "Hires steps",
  "Denoising strength",
  "Version",
  "Mask blur",
  "Inpaint area",
  "Masked area padding",
  "ADetailer model",
  "ADetailer version",
  "ADetailer confidence",
  "ADetailer dilate erode",
  "ADetailer mask blur",
  "ADetailer denoising strength",
  "ADetailer inpaint only masked",
  "ADetailer inpaint padding",
  "ADetailer model 2nd",
  "ADetailer confidence 2nd",
  "ADetailer dilate erode 2nd",
  "ADetailer mask blur 2nd",
  "ADetailer denoising strength 2nd",
  "ADetailer inpaint only masked 2nd",
  "ADetailer inpaint padding 2nd",
  "civitaiResources",
  "resources",
  "hashes",
  "comfy",
  "models",
  "aspectratio",
  "aspectRatio"
]);

export class CivitaiRetriever
{

  async run(options: Record<string, any>): Promise<CitivaiImageData[]>
  {
    const client = new CivitaiRESTAPIClient();
    const response: ImagesResponse = await client.default.getImages(options);
    return response.items.map(image => this.computeData(image));
  }

  computeData(image: Image): CitivaiImageData
  {
    const modelTags: string[] = [];
    const baseModelProperties = [ "basemodel", "baseModel" ];
    for (const baseModelProperty of baseModelProperties)
    {
      if (baseModelProperty in image)
      {
        // @ts-ignore
        modelTags.push(image[baseModelProperty]);
      }
    }
    const meta: ImageMeta | undefined = image.meta;
    if (meta)
    {
      if ("models" in meta)
      {
        // @ts-ignore
        modelTags.push(...meta["models"]);
      }
      if ("Model" in meta)
      {
        // @ts-ignore
        modelTags.push(meta["Model"]);
      }
      if ("baseModel" in meta)
      {
        // @ts-ignore
        modelTags.push(meta["baseModel"]);
      }
    }
    // @ts-ignore
    const aspectRatioRawString: string | undefined = meta?.["aspectratio"];
    let aspectRatio: number | undefined;
    if (aspectRatioRawString !== undefined)
    {
      const [ width, height ] = aspectRatioRawString.split(":").map(string => parseInt(string));
      aspectRatio = width / height;
    }
    const sanitizedModelTags = modelTags.map(tag => tag.replaceAll(" ", "_"));
    let prompt: GenerationRecipePrompt;
    let uiContainer: UiContainer | undefined;
    if (meta)
    {
      if ("comfy" in meta)
      {
        const comfy: string | undefined = meta["comfy"] as string;
        let value: { [key: string]: any; };
        if (comfy === undefined)
        {
          value = meta;
        }
        else
        {
          const parseJSObject = (code: string): Record<string, any> =>
          {
            return Function(`"use strict"; return (${code});`)();
          };
          try
          {
            value = parseJSObject(comfy);
            uiContainer = undefined;
          }
          catch (error)
          {
            value = meta;
            uiContainer = this.toUiContainer(meta);
          }
        }
        prompt = { kind: PromptKind.Instructions, value };
      }
      else
      {
        if (Object.keys(meta).length === 1 && meta.prompt)
        {
          prompt = { kind: PromptKind.Textual, text: meta.prompt };
          uiContainer = undefined;
        }
        else
        {
          prompt = { kind: PromptKind.Instructions, value: meta };
          uiContainer = this.toUiContainer(meta);
        }
      }
    }
    else
    {
      prompt = { kind: PromptKind.Instructions, value: image };
      uiContainer = undefined;
    }
    return {
      recipe: {
        schemaVersion: Helper.GENERATION_RECIPE_SCHEMA_VERSION,
        id: image.id?.toString(10),
        url: image.url,
        inceptionDate: image.createdAt === undefined ? undefined : Date.parse(image.createdAt),
        author: image.username,
        modelTags: sanitizedModelTags,
        aspectRatio,
        prompt
      },
      image,
      uiContainer,
      prompts: { positive: meta.prompt, negative: meta.negativePrompt },
      postId: image.postId
    };
  }

  toUiContainer(meta: ImageMeta): UiContainer
  {
    const primaryRows: TableRow[] = [];
    const secondaryRows: TableRow[] = [];
    const firstColumnOptions =
      {
        modifiers:
          {
            weight: TextWeight.heavy,
            intensity: TextIntensity.low
          }
      };
    const copyableOptions =
      {
        modifiers:
          {
            copyable: true
          }
      };

    // We initialize handled keys with all known schema keys to prevent duplicate secondary rows.
    const handledPropertyKeys = new Set<string>(KNOWN_PROPERTY_KEYS);

    // Negative prompt
    if (meta.negativePrompt !== null && meta.negativePrompt !== undefined && meta.negativePrompt.trim().length > 0)
    {
      primaryRows.push(tableRow([
        stringShort("Negative Prompt", firstColumnOptions),
        stringLong(meta.negativePrompt.trim(), copyableOptions)
      ]));
      handledPropertyKeys.add("negativePrompt");
    }

    // Model name
    const modelName = meta.Model ?? (meta as Record<string, unknown>)["model"];
    if (typeof modelName === "string" && modelName.trim().length > 0)
    {
      primaryRows.push(tableRow([
        stringShort("Model", firstColumnOptions),
        stringShort(modelName.trim(), copyableOptions)
      ]));
      handledPropertyKeys.add("Model");
      handledPropertyKeys.add("model");
    }

    // Base model
    const baseModel = (meta as Record<string, unknown>)["baseModel"] ?? (meta as Record<string, unknown>)["basemodel"];
    if (typeof baseModel === "string" && baseModel.trim().length > 0 && baseModel !== modelName)
    {
      primaryRows.push(tableRow([
        stringShort("Base Model", firstColumnOptions),
        stringShort(baseModel.trim(), copyableOptions)
      ]));
      handledPropertyKeys.add("baseModel");
      handledPropertyKeys.add("basemodel");
    }

    // Model hash
    const modelHash = meta["Model hash"] ?? (meta as Record<string, unknown>)["modelHash"];
    if (typeof modelHash === "string" && modelHash.trim().length > 0)
    {
      primaryRows.push(tableRow([
        stringShort("Model Hash", firstColumnOptions),
        identifier(modelHash.trim(), copyableOptions)
      ]));
      handledPropertyKeys.add("Model hash");
      handledPropertyKeys.add("modelHash");
    }

    // Sampler
    const sampler = meta.sampler ?? (meta as Record<string, unknown>)["Sampler"];
    if (typeof sampler === "string" && sampler.trim().length > 0)
    {
      primaryRows.push(tableRow([
        stringShort("Sampler", firstColumnOptions),
        stringShort(sampler.trim(), copyableOptions)
      ]));
      handledPropertyKeys.add("sampler");
      handledPropertyKeys.add("Sampler");
    }

    // Steps
    if (meta.steps !== null && meta.steps !== undefined)
    {
      const stepCount = typeof meta.steps === "number" ? meta.steps : parseInt(String(meta.steps), 10);
      if (Number.isNaN(stepCount) === false)
      {
        primaryRows.push(tableRow([
          stringShort("Steps", firstColumnOptions),
          numberUnbounded(stepCount, copyableOptions)
        ]));
      }
      handledPropertyKeys.add("steps");
    }

    // CFG Scale
    if (meta.cfgScale !== null && meta.cfgScale !== undefined)
    {
      const cfgScaleValue = typeof meta.cfgScale === "number" ? meta.cfgScale : parseFloat(String(meta.cfgScale));
      if (Number.isNaN(cfgScaleValue) === false)
      {
        primaryRows.push(tableRow([
          stringShort("CFG Scale", firstColumnOptions),
          numberUnbounded(cfgScaleValue, copyableOptions)
        ]));
      }
      handledPropertyKeys.add("cfgScale");
    }

    // Seed
    if (meta.seed !== null && meta.seed !== undefined && meta.seed !== -1)
    {
      primaryRows.push(tableRow([
        stringShort("Seed", firstColumnOptions),
        identifier(String(meta.seed), copyableOptions)
      ]));
      handledPropertyKeys.add("seed");
    }

    // Dimensions / Size
    const dimensions = meta.Size ?? (meta as Record<string, unknown>)["size"];
    if (typeof dimensions === "string" && dimensions.trim().length > 0)
    {
      primaryRows.push(tableRow([
        stringShort("Dimensions", firstColumnOptions),
        stringShort(dimensions.trim(), copyableOptions)
      ]));
      handledPropertyKeys.add("Size");
      handledPropertyKeys.add("size");
    }

    // Clip skip
    if (meta.clipSkip !== null && meta.clipSkip !== undefined)
    {
      const clipSkipValue = typeof meta.clipSkip === "number" ? meta.clipSkip : parseInt(String(meta.clipSkip), 10);
      if (Number.isNaN(clipSkipValue) === false)
      {
        primaryRows.push(tableRow([
          stringShort("Clip Skip", firstColumnOptions),
          numberUnbounded(clipSkipValue, copyableOptions)
        ]));
      }
      handledPropertyKeys.add("clipSkip");
    }

    // --- Secondary properties (Collapsible group) ---

    // High-resolution fix
    if (meta["Hires upscaler"] !== null && meta["Hires upscaler"] !== undefined && meta["Hires upscaler"].trim().length > 0)
    {
      secondaryRows.push(tableRow([
        stringShort("Hires Upscaler", firstColumnOptions),
        stringShort(meta["Hires upscaler"].trim(), copyableOptions)
      ]));
      handledPropertyKeys.add("Hires upscaler");
    }

    if (meta["Hires upscale"] !== null && meta["Hires upscale"] !== undefined)
    {
      const hiresUpscaleValue = parseFloat(String(meta["Hires upscale"]));
      secondaryRows.push(tableRow([
        stringShort("Hires Upscale", firstColumnOptions),
        Number.isNaN(hiresUpscaleValue) === false
          ? numberUnbounded(hiresUpscaleValue, copyableOptions)
          : stringShort(String(meta["Hires upscale"]).trim(), copyableOptions)
      ]));
      handledPropertyKeys.add("Hires upscale");
    }

    if (meta["Hires steps"] !== null && meta["Hires steps"] !== undefined)
    {
      const hiresStepsValue = parseInt(String(meta["Hires steps"]), 10);
      secondaryRows.push(tableRow([
        stringShort("Hires Steps", firstColumnOptions),
        Number.isNaN(hiresStepsValue) === false
          ? numberUnbounded(hiresStepsValue, copyableOptions)
          : stringShort(String(meta["Hires steps"]).trim(), copyableOptions)
      ]));
      handledPropertyKeys.add("Hires steps");
    }

    if (meta["Denoising strength"] !== null && meta["Denoising strength"] !== undefined)
    {
      const denoisingStrengthValue = parseFloat(String(meta["Denoising strength"]));
      secondaryRows.push(tableRow([
        stringShort("Denoising Strength", firstColumnOptions),
        Number.isNaN(denoisingStrengthValue) === false
          ? numberUnbounded(denoisingStrengthValue, copyableOptions)
          : stringShort(String(meta["Denoising strength"]).trim(), copyableOptions)
      ]));
      handledPropertyKeys.add("Denoising strength");
    }

    // Software Version
    if (meta.Version !== null && meta.Version !== undefined && meta.Version.trim().length > 0)
    {
      secondaryRows.push(tableRow([
        stringShort("Version", firstColumnOptions),
        stringShort(meta.Version.trim(), copyableOptions)
      ]));
      handledPropertyKeys.add("Version");
    }

    // Inpainting & Masking
    if (meta["Mask blur"] !== null && meta["Mask blur"] !== undefined)
    {
      secondaryRows.push(tableRow([
        stringShort("Mask Blur", firstColumnOptions),
        stringShort(String(meta["Mask blur"]).trim(), copyableOptions)
      ]));
      handledPropertyKeys.add("Mask blur");
    }

    if (meta["Inpaint area"] !== null && meta["Inpaint area"] !== undefined && meta["Inpaint area"].trim().length > 0)
    {
      secondaryRows.push(tableRow([
        stringShort("Inpaint Area", firstColumnOptions),
        stringShort(meta["Inpaint area"].trim(), copyableOptions)
      ]));
      handledPropertyKeys.add("Inpaint area");
    }

    if (meta["Masked area padding"] !== null && meta["Masked area padding"] !== undefined)
    {
      secondaryRows.push(tableRow([
        stringShort("Masked Area Padding", firstColumnOptions),
        stringShort(String(meta["Masked area padding"]).trim(), copyableOptions)
      ]));
      handledPropertyKeys.add("Masked area padding");
    }

    // ADetailer (First pass)
    const adetailerFirstPassMappings: ReadonlyArray<[ keyof ImageMeta, string ]> =
      [
        [ "ADetailer model", "ADetailer Model" ],
        [ "ADetailer version", "ADetailer Version" ],
        [ "ADetailer confidence", "ADetailer Confidence" ],
        [ "ADetailer dilate erode", "ADetailer Dilate Erode" ],
        [ "ADetailer mask blur", "ADetailer Mask Blur" ],
        [ "ADetailer denoising strength", "ADetailer Denoising" ],
        [ "ADetailer inpaint only masked", "ADetailer Inpaint Only Masked" ],
        [ "ADetailer inpaint padding", "ADetailer Inpaint Padding" ]
      ];

    for (const [ propertyKey, propertyLabel ] of adetailerFirstPassMappings)
    {
      const propertyValue = meta[propertyKey];
      if (propertyValue !== null && propertyValue !== undefined && String(propertyValue).trim().length > 0)
      {
        secondaryRows.push(tableRow([
          stringShort(propertyLabel, firstColumnOptions),
          stringShort(String(propertyValue).trim(), copyableOptions)
        ]));
      }
      handledPropertyKeys.add(propertyKey);
    }

    // ADetailer (Second pass)
    const adetailerSecondPassMappings: ReadonlyArray<[ keyof ImageMeta, string ]> =
      [
        [ "ADetailer model 2nd", "ADetailer Model (2nd Pass)" ],
        [ "ADetailer confidence 2nd", "ADetailer Confidence (2nd Pass)" ],
        [ "ADetailer dilate erode 2nd", "ADetailer Dilate Erode (2nd Pass)" ],
        [ "ADetailer mask blur 2nd", "ADetailer Mask Blur (2nd Pass)" ],
        [ "ADetailer denoising strength 2nd", "ADetailer Denoising (2nd Pass)" ],
        [ "ADetailer inpaint only masked 2nd", "ADetailer Inpaint Only Masked (2nd Pass)" ],
        [ "ADetailer inpaint padding 2nd", "ADetailer Inpaint Padding (2nd Pass)" ]
      ];

    for (const [ propertyKey, propertyLabel ] of adetailerSecondPassMappings)
    {
      const propertyValue = meta[propertyKey];
      if (propertyValue !== null && propertyValue !== undefined && String(propertyValue).trim().length > 0)
      {
        secondaryRows.push(tableRow([
          stringShort(propertyLabel, firstColumnOptions),
          stringShort(String(propertyValue).trim(), copyableOptions)
        ]));
      }
      handledPropertyKeys.add(propertyKey);
    }

    // Civitai resources (checkpoints, LoRAs, embeddings)
    if (Array.isArray(meta.civitaiResources) === true && meta.civitaiResources.length > 0)
    {
      for (const resource of meta.civitaiResources)
      {
        const resourceType = resource.type !== undefined ? resource.type.toUpperCase() : "RESOURCE";
        const detailsParts: string[] = [];
        if (resource.modelVersionId !== undefined)
        {
          detailsParts.push(`Version ID: ${resource.modelVersionId}`);
        }
        if (resource.weight !== undefined)
        {
          detailsParts.push(`Weight: ${resource.weight}`);
        }
        const resourceDetails = detailsParts.length > 0 ? detailsParts.join(" | ") : "Active";
        secondaryRows.push(tableRow([
          stringShort(resourceType, firstColumnOptions),
          stringShort(resourceDetails, copyableOptions)
        ]));
      }
      handledPropertyKeys.add("civitaiResources");
    }

    // Resources list
    if (Array.isArray(meta.resources) === true && meta.resources.length > 0)
    {
      for (const resource of meta.resources)
      {
        if (typeof resource === "object" && resource !== null)
        {
          const resourceName: string | undefined = resource["name"] ?? resource["modelName"];
          const resourceType: string = (resource["type"] ?? "RESOURCE").toUpperCase();
          const resourceWeight: number | undefined = resource["weight"];
          const resourceLabel = resourceName !== undefined ? `${resourceType}: ${resourceName}` : resourceType;
          const resourceValue = resourceWeight !== undefined ? `Weight: ${resourceWeight}` : "Active";
          secondaryRows.push(tableRow([
            stringShort(resourceLabel, firstColumnOptions),
            stringShort(resourceValue, copyableOptions)
          ]));
        }
      }
      handledPropertyKeys.add("resources");
    }

    // Hashes dictionary
    if (meta.hashes !== null && meta.hashes !== undefined && typeof meta.hashes === "object")
    {
      for (const [ hashName, hashValue ] of Object.entries(meta.hashes))
      {
        if (hashValue !== null && hashValue !== undefined && String(hashValue).trim().length > 0)
        {
          secondaryRows.push(tableRow([
            stringShort(`Hash (${hashName})`, firstColumnOptions),
            identifier(String(hashValue).trim(), copyableOptions)
          ]));
        }
      }
      handledPropertyKeys.add("hashes");
    }

    // Dynamic unhandled scalar properties
    const metaRecord = meta as Record<string, unknown>;
    for (const [ extraKey, extraValue ] of Object.entries(metaRecord))
    {
      if (handledPropertyKeys.has(extraKey) === false && extraValue !== null && extraValue !== undefined)
      {
        if (typeof extraValue === "string" || typeof extraValue === "number" || typeof extraValue === "boolean")
        {
          const formattedStringValue = String(extraValue).trim();
          if (formattedStringValue.length > 0)
          {
            secondaryRows.push(tableRow([
              stringShort(extraKey, firstColumnOptions),
              stringShort(formattedStringValue, copyableOptions)
            ]));
          }
        }
      }
    }

    const elements: UiElement[] = [];
    if (primaryRows.length > 0)
    {
      elements.push(table(
        primaryRows,
        {
          withRowSeparators: true
        }
      ));
    }

    if (secondaryRows.length > 0)
    {
      elements.push(collapsibleGroup(
        "Details",
        [
          table(
            secondaryRows,
            {
              withRowSeparators: true
            }
          )
        ],
        {
          summary: `${secondaryRows.length} ${secondaryRows.length === 1 ? "property" : "properties"}`,
          defaultExpanded: false
        }
      ));
    }

    return createUiContainer({ elements });
  }

}


