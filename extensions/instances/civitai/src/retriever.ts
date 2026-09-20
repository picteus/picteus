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
    const firstColumnOptions = {
      modifiers: { weight: TextWeight.heavy, intensity: TextIntensity.low }
    };
    const copyableOptions = { modifiers: { copyable: true } };

    const handledKeys = new Set<string>([
      "prompt",
      "comfy",
      "models",
      "aspectratio",
      "aspectRatio"
    ]);

    // Primary generation parameters in defined display order
    const primaryFieldDefinitions: ReadonlyArray<{
      readonly keys: readonly (keyof ImageMeta | string)[];
      readonly label: string;
      readonly format: (value: unknown) => UiElement | undefined;
    }> =
      [
        {
          keys: [ "negativePrompt" ],
          label: "Negative Prompt",
          format: (value: unknown): UiElement | undefined =>
          {
            return typeof value === "string" && value.trim().length > 0
              ? stringLong(value.trim(), copyableOptions)
              : undefined;
          }
        },
        {
          keys: [ "Model", "model" ],
          label: "Model",
          format: (value: unknown): UiElement | undefined =>
          {
            return typeof value === "string" && value.trim().length > 0
              ? stringShort(value.trim(), copyableOptions)
              : undefined;
          }
        },
        {
          keys: [ "baseModel", "basemodel" ],
          label: "Base Model",
          format: (value: unknown): UiElement | undefined =>
          {
            const modelName = meta.Model ?? (meta as Record<string, unknown>)["model"];
            return typeof value === "string" && value.trim().length > 0 && value !== modelName
              ? stringShort(value.trim(), copyableOptions)
              : undefined;
          }
        },
        {
          keys: [ "Model hash", "modelHash" ],
          label: "Model Hash",
          format: (value: unknown): UiElement | undefined =>
          {
            return typeof value === "string" && value.trim().length > 0
              ? identifier(value.trim(), copyableOptions)
              : undefined;
          }
        },
        {
          keys: [ "sampler", "Sampler" ],
          label: "Sampler",
          format: (value: unknown): UiElement | undefined =>
          {
            return typeof value === "string" && value.trim().length > 0
              ? stringShort(value.trim(), copyableOptions)
              : undefined;
          }
        },
        {
          keys: [ "steps" ],
          label: "Steps",
          format: (value: unknown): UiElement | undefined =>
          {
            const stepCount = typeof value === "number" ? value : parseInt(String(value), 10);
            return Number.isNaN(stepCount) === false
              ? numberUnbounded(stepCount, copyableOptions)
              : undefined;
          }
        },
        {
          keys: [ "cfgScale" ],
          label: "CFG Scale",
          format: (value: unknown): UiElement | undefined =>
          {
            const cfgValue = typeof value === "number" ? value : parseFloat(String(value));
            return Number.isNaN(cfgValue) === false
              ? numberUnbounded(cfgValue, copyableOptions)
              : undefined;
          }
        },
        {
          keys: [ "seed" ],
          label: "Seed",
          format: (value: unknown): UiElement | undefined =>
          {
            return value !== null && value !== undefined && value !== -1
              ? identifier(String(value), copyableOptions)
              : undefined;
          }
        },
        {
          keys: [ "Size", "size" ],
          label: "Dimensions",
          format: (value: unknown): UiElement | undefined =>
          {
            return typeof value === "string" && value.trim().length > 0
              ? stringShort(value.trim(), copyableOptions)
              : undefined;
          }
        },
        {
          keys: [ "clipSkip" ],
          label: "Clip Skip",
          format: (value: unknown): UiElement | undefined =>
          {
            const clipSkip = typeof value === "number" ? value : parseInt(String(value), 10);
            return Number.isNaN(clipSkip) === false
              ? numberUnbounded(clipSkip, copyableOptions)
              : undefined;
          }
        }
      ];

    const metaRecord = meta as Record<string, unknown>;

    for (const definition of primaryFieldDefinitions)
    {
      for (const propertyKey of definition.keys)
      {
        handledKeys.add(propertyKey);
        const propertyValue = metaRecord[propertyKey];
        if (propertyValue !== null && propertyValue !== undefined && propertyValue !== "Undefined")
        {
          const element = definition.format(propertyValue);
          if (element !== undefined)
          {
            primaryRows.push(tableRow([
              stringShort(definition.label, firstColumnOptions),
              element
            ]));
            break;
          }
        }
      }
    }

    // Civitai resources
    handledKeys.add("civitaiResources");
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
    }

    // Generic resources list
    handledKeys.add("resources");
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
    }

    // Hashes dictionary
    handledKeys.add("hashes");
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
    }

    // Generic loop over all remaining declared ImageMeta and dynamic metadata properties
    for (const [ propertyKey, propertyValue ] of Object.entries(metaRecord))
    {
      if (handledKeys.has(propertyKey) === false && propertyValue !== null && propertyValue !== undefined)
      {
        if (typeof propertyValue === "string" || typeof propertyValue === "number" || typeof propertyValue === "boolean")
        {
          const formattedStringValue = String(propertyValue).trim();
          if (formattedStringValue.length > 0)
          {
            const SECONDARY_LABELS: Readonly<Record<string, string>> =
              {
                "Hires upscaler": "Hires Upscaler",
                "Hires upscale": "Hires Upscale",
                "Hires steps": "Hires Steps",
                "Denoising strength": "Denoising Strength",
                "Version": "Version",
                "Mask blur": "Mask Blur",
                "Inpaint area": "Inpaint Area",
                "Masked area padding": "Masked Area Padding",
                "ADetailer model": "ADetailer Model",
                "ADetailer version": "ADetailer Version",
                "ADetailer confidence": "ADetailer Confidence",
                "ADetailer dilate erode": "ADetailer Dilate Erode",
                "ADetailer mask blur": "ADetailer Mask Blur",
                "ADetailer denoising strength": "ADetailer Denoising",
                "ADetailer inpaint only masked": "ADetailer Inpaint Only Masked",
                "ADetailer inpaint padding": "ADetailer Inpaint Padding",
                "ADetailer model 2nd": "ADetailer Model (2nd Pass)",
                "ADetailer confidence 2nd": "ADetailer Confidence (2nd Pass)",
                "ADetailer dilate erode 2nd": "ADetailer Dilate Erode (2nd Pass)",
                "ADetailer mask blur 2nd": "ADetailer Mask Blur (2nd Pass)",
                "ADetailer denoising strength 2nd": "ADetailer Denoising (2nd Pass)",
                "ADetailer inpaint only masked 2nd": "ADetailer Inpaint Only Masked (2nd Pass)",
                "ADetailer inpaint padding 2nd": "ADetailer Inpaint Padding (2nd Pass)"
              };

            const propertyLabel = SECONDARY_LABELS[propertyKey] ?? propertyKey;
            const numericValue = typeof propertyValue === "number" ? propertyValue : parseFloat(formattedStringValue);
            const valueElement = typeof propertyValue === "number" || (Number.isNaN(numericValue) === false && String(numericValue) === formattedStringValue)
              ? numberUnbounded(numericValue, copyableOptions)
              : stringShort(formattedStringValue, copyableOptions);

            secondaryRows.push(tableRow([
              stringShort(propertyLabel, firstColumnOptions),
              valueElement
            ]));
          }
        }
      }
    }

    const elements: UiElement[] = [];
    if (primaryRows.length > 0)
    {
      elements.push(table(primaryRows, { withRowSeparators: true }));
    }

    if (secondaryRows.length > 0)
    {
      elements.push(collapsibleGroup(
        "Details", [ table(secondaryRows, { withRowSeparators: true }) ],
        {
          summary: `${secondaryRows.length} ${secondaryRows.length === 1 ? "property" : "properties"}`,
          defaultExpanded: false
        }
      ));
    }

    return createUiContainer({ elements });
  }

}


