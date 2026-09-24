import {
  CivitaiRESTAPIClient,
  type Image,
  type ImageMeta,
  type ImagesResponse
} from "@stable-canvas/civitai-rest-api-client";

import {
  collapsibleGroup,
  createUiContainer,
  flowing,
  type GenerationRecipe,
  type GenerationRecipePrompt,
  Helper,
  identifier,
  numberUnbounded,
  PromptKind,
  ratio,
  stringLong,
  stringShort,
  table,
  tableColumn,
  TableColumnAlign,
  TableColumnWidthMode,
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
    const aspectRatioRawString: string | undefined = meta?.["aspectRatio"];
    let aspectRatio: number | undefined;
    if (aspectRatioRawString !== undefined)
    {
      const [ width, height ] = aspectRatioRawString.split(":").map((dimensionPart) => parseInt(dimensionPart, 10));
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
    const firstColumnOptions = { modifiers: { weight: TextWeight.heavy, intensity: TextIntensity.low } };
    const copyableOptions = { modifiers: { copyable: true } };
    const commonTableOptions =
      {
        withRowSeparators: true,
        columns:
          [
            tableColumn({ align: TableColumnAlign.left, width: 25, widthMode: TableColumnWidthMode.maximum }),
            tableColumn({ align: TableColumnAlign.left })
          ]
      };

    // Primary generation parameters in defined display order
    const primaryFieldDefinitions: ReadonlyArray<{
      readonly keys: readonly (keyof ImageMeta | string)[];
      readonly label: string;
      readonly format: (value: unknown, record: Record<string, unknown>) => UiElement | undefined;
    }> =
      [
        {
          keys: [ "prompt" ],
          label: "Prompt",
          format: (value: unknown): UiElement | undefined =>
          {
            return this.formatLongText(value, copyableOptions);
          }
        },
        {
          keys: [ "negativePrompt" ],
          label: "Negative Prompt",
          format: (value: unknown): UiElement | undefined =>
          {
            return this.formatLongText(value, copyableOptions);
          }
        },
        {
          keys: [ "Model", "model" ],
          label: "Model",
          format: (value: unknown): UiElement | undefined =>
          {
            return this.formatShortText(value, copyableOptions);
          }
        },
        {
          keys: [ "baseModel", "basemodel" ],
          label: "Base Model",
          format: (value: unknown, record: Record<string, unknown>): UiElement | undefined =>
          {
            const modelName = record["Model"] ?? record["model"];
            return typeof value === "string" && value.trim().length > 0 && value !== modelName
              ? stringShort(value.trim(), copyableOptions)
              : undefined;
          }
        },

        {
          keys: [ "sampler", "Sampler" ],
          label: "Sampler",
          format: (value: unknown): UiElement | undefined =>
          {
            return this.formatShortText(value, copyableOptions);
          }
        },
        {
          keys: [ "steps" ],
          label: "Steps",
          format: (value: unknown): UiElement | undefined =>
          {
            return this.formatInteger(value, copyableOptions);
          }
        },
        {
          keys: [ "cfgScale" ],
          label: "CFG Scale",
          format: (value: unknown): UiElement | undefined =>
          {
            return this.formatFloat(value, copyableOptions);
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
          keys: [ "width", "height" ],
          label: "Dimension",
          format: (propertyValue: unknown, record: Record<string, unknown>): UiElement | undefined =>
          {
            const rawWidth = record["width"];
            const rawHeight = record["height"];
            if (rawWidth === null || rawWidth === undefined || rawHeight === null || rawHeight === undefined)
            {
              return undefined;
            }

            const width = typeof rawWidth === "number" ? rawWidth : parseInt(String(rawWidth).trim(), 10);
            const height = typeof rawHeight === "number" ? rawHeight : parseInt(String(rawHeight).trim(), 10);

            if (Number.isNaN(width) === false && Number.isNaN(height) === false && width > 0 && height > 0)
            {
              const aspectRatio = width / height;
              return flowing([
                stringShort(`${width}x${height}`, copyableOptions),
                ratio(aspectRatio)
              ]);
            }

            return undefined;
          }
        },
        {
          keys: [ "clipSkip" ],
          label: "Clip Skip",
          format: (value: unknown): UiElement | undefined =>
          {
            return this.formatInteger(value, copyableOptions);
          }
        }
      ];

    const handledKeys = new Set<string>([
      "comfy",
      "models",
      "aspectRatio",
      "Model hash",
      "modelHash",
      "hashes",
      "Created Date",
      "civitaiResources",
      "resources",
      ...primaryFieldDefinitions.flatMap((definition) =>
      {
        return definition.keys;
      })
    ]);

    const metaRecord = meta as Record<string, unknown>;

    for (const definition of primaryFieldDefinitions)
    {
      for (const propertyKey of definition.keys)
      {
        const propertyValue = metaRecord[propertyKey];
        if (propertyValue !== null && propertyValue !== undefined && propertyValue !== "Undefined")
        {
          const element = definition.format(propertyValue, metaRecord);
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
    let civitaiResourcesTable: UiElement | undefined;
    if (Array.isArray(meta.civitaiResources) === true && meta.civitaiResources.length > 0)
    {
      const candidateColumns: ReadonlyArray<{
        readonly key: "type" | "modelVersionId" | "modelName" | "modelVersionName";
        readonly header: string;
      }> =
        [
          { key: "type", header: "Type" },
          { key: "modelVersionId", header: "Model Version Id" },
          { key: "modelName", header: "Model Name" },
          { key: "modelVersionName", header: "Model Version Name" }
        ];

      const usedColumns = candidateColumns.filter(
        (candidateColumn) => meta.civitaiResources!.some((resource) =>
          {
            const propertyValue = (resource as Record<string, unknown>)[candidateColumn.key];
            return propertyValue !== null && propertyValue !== undefined && String(propertyValue).trim().length > 0;
          }
        ));

      if (usedColumns.length > 0)
      {
        const resourceTableColumns = usedColumns.map((usedColumn) =>
          {
            return tableColumn({
              header: usedColumn.header,
              align: TableColumnAlign.left
            });
          }
        );

        const resourceTableRows = meta.civitaiResources.map((resource) =>
          {
            const resourceRecord = resource as Record<string, unknown>;
            const cells = usedColumns.map((usedColumn) =>
              {
                const cellValue = resourceRecord[usedColumn.key];
                if (cellValue === null || cellValue === undefined || String(cellValue).trim().length === 0)
                {
                  return stringShort("");
                }
                const formattedValue = String(cellValue).trim();
                if (usedColumn.key === "type")
                {
                  return stringShort(formattedValue);
                }
                if (usedColumn.key === "modelVersionId")
                {
                  return identifier(formattedValue, copyableOptions);
                }
                return stringShort(formattedValue, copyableOptions);
              }
            );
            return tableRow(cells);
          }
        );

        civitaiResourcesTable = table(
          resourceTableRows,
          {
            withRowSeparators: true,
            columns: resourceTableColumns
          }
        );
      }
    }

    // Generic resources list
    let resourcesTable: UiElement | undefined;
    const rawResources = meta.resources;
    if (Array.isArray(rawResources) === true && rawResources.length > 0)
    {
      const resourceTableColumns =
        [
          tableColumn({
            header: "Type",
            align: TableColumnAlign.left,
            width: 25
          }),
          tableColumn({
            header: "Name",
            align: TableColumnAlign.left,
            width: 50
          }),
          tableColumn({
            header: "Weight",
            align: TableColumnAlign.left,
            width: 25
          })
        ];

      const resourceTableRows = rawResources.map((resource) =>
        {
          const resourceRecord = (typeof resource === "object" && resource !== null ? resource : {}) as Record<string, unknown>;

          // Type (not copyable)
          const typeValue = resourceRecord["type"];
          const formattedType = typeValue !== null && typeValue !== undefined ? String(typeValue).trim() : "";
          const typeCell = formattedType.length > 0 ? stringShort(formattedType) : stringShort("");

          // Name (50% width, copyable)
          const nameValue = resourceRecord["name"] ?? resourceRecord["modelName"];
          const formattedName = nameValue !== null && nameValue !== undefined ? String(nameValue).trim() : "";
          const nameCell = formattedName.length > 0 ? stringShort(formattedName, copyableOptions) : stringShort("");

          // Weight (25% width, copyable)
          const weightValue = resourceRecord["weight"];
          const weightCell = weightValue !== null && weightValue !== undefined && String(weightValue).trim().length > 0
            ? this.formatScalarElement(weightValue, copyableOptions)
            : stringShort("");

          return tableRow([ typeCell, nameCell, weightCell ]);
        }
      );

      const hasAnyContent = rawResources.some((resource) =>
        {
          if (typeof resource !== "object" || resource === null)
          {
            return false;
          }
          const record = resource as Record<string, unknown>;
          const name = record["name"] ?? record["modelName"];
          return (
            (record["type"] !== null && record["type"] !== undefined && String(record["type"]).trim().length > 0) ||
            (name !== null && name !== undefined && String(name).trim().length > 0) ||
            (record["weight"] !== null && record["weight"] !== undefined && String(record["weight"]).trim().length > 0)
          );
        }
      );

      if (hasAnyContent === true)
      {
        resourcesTable = table(
          resourceTableRows,
          {
            withRowSeparators: true,
            columns: resourceTableColumns
          }
        );
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
            const valueElement = this.formatScalarElement(propertyValue, copyableOptions);

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
      elements.push(table(primaryRows, commonTableOptions));
    }

    if (civitaiResourcesTable !== undefined)
    {
      const resourceCount = meta.civitaiResources?.length ?? 0;
      elements.push(this.createCollapsibleSection(
        "Civitai Resources",
        civitaiResourcesTable,
        resourceCount,
        "resource"
      ));
    }

    if (resourcesTable !== undefined)
    {
      const resourceCount = rawResources?.length ?? 0;
      elements.push(this.createCollapsibleSection(
        "Resources",
        resourcesTable,
        resourceCount,
        "resource"
      ));
    }

    if (secondaryRows.length > 0)
    {
      elements.push(this.createCollapsibleSection(
        "Details",
        table(secondaryRows, commonTableOptions),
        secondaryRows.length,
        "property",
        "properties"
      ));
    }

    return createUiContainer({ elements });
  }

  private formatLongText(value: unknown, options: { modifiers?: { copyable?: boolean; }; }): UiElement | undefined
  {
    return typeof value === "string" && value.trim().length > 0
      ? stringLong(value.trim(), options)
      : undefined;
  }

  private formatShortText(value: unknown, options: { modifiers?: { copyable?: boolean; }; }): UiElement | undefined
  {
    return typeof value === "string" && value.trim().length > 0
      ? stringShort(value.trim(), options)
      : undefined;
  }

  private formatInteger(value: unknown, options: { modifiers?: { copyable?: boolean; }; }): UiElement | undefined
  {
    const integerNumber = typeof value === "number" ? value : parseInt(String(value), 10);
    return Number.isNaN(integerNumber) === false
      ? numberUnbounded(integerNumber, options)
      : undefined;
  }

  private formatFloat(value: unknown, options: { modifiers?: { copyable?: boolean; }; }): UiElement | undefined
  {
    const floatNumber = typeof value === "number" ? value : parseFloat(String(value));
    return Number.isNaN(floatNumber) === false
      ? numberUnbounded(floatNumber, options)
      : undefined;
  }

  private formatScalarElement(value: unknown, options: { modifiers?: { copyable?: boolean; }; }): UiElement
  {
    if (typeof value === "number")
    {
      return numberUnbounded(value, options);
    }
    const formattedStringValue = String(value).trim();
    const numericValue = parseFloat(formattedStringValue);
    if (Number.isNaN(numericValue) === false && String(numericValue) === formattedStringValue)
    {
      return numberUnbounded(numericValue, options);
    }
    return stringShort(formattedStringValue, options);
  }

  private createCollapsibleSection(
    title: string,
    element: UiElement,
    itemCount: number,
    unitSingular: string,
    unitPlural: string = `${unitSingular}s`
  ): UiElement
  {
    const unit = itemCount === 1 ? unitSingular : unitPlural;
    return collapsibleGroup(
      title,
      [ element ],
      {
        summary: `${itemCount} ${unit}`,
        defaultExpanded: false
      }
    );
  }

}


