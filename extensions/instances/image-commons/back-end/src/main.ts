import * as fs from "node:fs";
import * as path from "node:path";

import {
  ApplicationMetadata,
  ApplicationMetadataItem,
  Communicator,
  GenerationRecipeFromJSON,
  ImageFeature,
  ImageFeatureFormat,
  ImageFeatureType,
  ImageFormat,
  ImageResizeRender,
  NotificationEvent,
  NotificationReturnedError,
  NotificationReturnedErrorCause,
  NotificationsDialogType,
  NotificationsImage,
  NotificationValue,
  PicteusExtension
} from "@picteus/extension-sdk";

class ImageCommonsExtension extends PicteusExtension
{

  protected async onEvent(communicator: Communicator, event: string, value: NotificationValue): Promise<any>
  {
    if (event === NotificationEvent.ImageRunCommand)
    {
      const commandId: string = value["commandId"];
      const imageIds: string[] = value["imageIds"];
      const parameters: Record<string, any> = value["parameters"];
      if (commandId === "convert")
      {
        await this.convertImages(communicator, imageIds, parameters);
      }
      else if (commandId === "rateAndComment")
      {
        await this.rateAndCommentImages(imageIds, communicator);
      }
      else if (commandId === "tag")
      {
        await this.tagImages(imageIds, communicator);
      }
    }
    else if (event === NotificationEvent.ProcessRunCommand)
    {
      const commandId: string = value["commandId"];
      const parameters: Record<string, any> = value["parameters"];
      if (commandId === "analytics")
      {
        await this.analyzeImages(parameters["collectionId"], parameters["tags"], communicator);
      }
    }
  }

  private async convertImages(communicator: Communicator, imageIds: string[], parameters: Record<string, any>): Promise<void>
  {
    const newImages: NotificationsImage[] = [];
    for (const imageId of imageIds)
    {
      const image = await this.getImageApi().imageGet({ id: imageId });
      const rawFormat: string = parameters["format"];
      const format: ImageFormat = rawFormat.toUpperCase() as ImageFormat;
      const stripMetadata: boolean = parameters["stripMetadata"];
      const width: number | undefined = parameters["width"];
      const height: number | undefined = parameters["height"];
      const resizeRender: ImageResizeRender | undefined = parameters["resizeRender"];
      if ((width !== undefined || height !== undefined) && stripMetadata === false)
      {
        await communicator.launchIntent<boolean>({
          dialog:
            {
              type: NotificationsDialogType.Error,
              title: "Image Conversion",
              description: "When a dimension is specified, the metadata must be stripped.",
              buttons: { yes: "OK" }
            }
        });
        return;
      }
      communicator.sendLog(`Converting the image with id '${image.id}' and URL '${image.url}'`, "debug");
      const blob: Blob = await this.getImageApi().imageDownload({
        id: imageId,
        format,
        width,
        height,
        resizeRender,
        stripMetadata
      });
      const metadataValues: ApplicationMetadataItem[] = image.features.filter(feature => feature.type === ImageFeatureType.Recipe).map(feature =>
      {
        return { extensionId: feature.id, value: GenerationRecipeFromJSON(JSON.parse(feature.value as string)) };
      });
      const applicationMetadata: ApplicationMetadata = (format !== ImageFormat.Png && format !== ImageFormat.Jpeg) ? undefined : (metadataValues.length === 0 ? undefined : { items: metadataValues });
      const newImage = await this.getRepositoryApi().repositoryStoreImage({
        id: image.repositoryId,
        parentId: image.id,
        applicationMetadata: applicationMetadata === undefined ? undefined : JSON.stringify(applicationMetadata),
        body: blob
      });
      newImages.push({ imageId: newImage.id });
    }
    await communicator.launchIntent({
      images:
        {
          images: newImages,
          dialogContent:
            {
              title: "Converted images",
              description: "These are the converted images"
            }
        }
    });
  }

  private async rateAndCommentImages(imageIds: string[], communicator: Communicator): Promise<void>
  {
    for (const imageId of imageIds)
    {
      const existingFeatures = await this.getImageApi().imageGetFeatures({
        id: imageId,
        extensionId: this.extensionId
      });
      const ratingName = "Rating";
      const commentName = "Comment";
      const previousRating = existingFeatures.find(feature => feature.name === ratingName && feature.format === ImageFeatureFormat.Integer && feature.type === ImageFeatureType.Annotation);
      const previousComment = existingFeatures.find(feature => feature.name === commentName && feature.format === ImageFeatureFormat.String && feature.type === ImageFeatureType.Comment);
      let result: Record<string, any>;
      try
      {
        result = await communicator.launchIntent<Record<string, any>>({
          context: { imageIds: [imageId] },
          form:
            {
              parameters:
                {
                  type: "object",
                  properties:
                    {
                      rating: {
                        type: "integer",
                        title: "Rating",
                        enum: [1, 2, 3, 4, 5],
                        default: previousRating?.value as number ?? 3,
                        ui: { widget: "radio", inline: true }
                      },
                      comment: {
                        type: "string",
                        title: "Comment",
                        minLength: 0,
                        maxLength: 1_024,
                        default: previousComment?.value as string ?? "",
                        ui: { widget: "textarea" }
                      }
                    },
                  required: ["rating"]
                }, dialogContent:
                {
                  title: "Rate and comment",
                  description: "Please rate and comment the image",
                  details: "The values will be recorded as features of the image."
                }
            }
        });
      }
      catch (error)
      {
        const intentError: NotificationReturnedError = error as NotificationReturnedError;
        if (intentError.reason === NotificationReturnedErrorCause.Cancel)
        {
          return;
        }
        else
        {
          throw error;
        }
      }
      const features: ImageFeature[] = existingFeatures.filter(feature => feature.name !== ratingName && feature.name !== commentName);
      const rating: number = result.rating;
      const comment: string | undefined = result.comment;
      features.push(
        {
          type: ImageFeatureType.Annotation,
          name: ratingName,
          value: rating,
          format: ImageFeatureFormat.Integer
        });
      if (comment !== undefined && comment.length > 0)
      {
        features.push(
          {
            type: ImageFeatureType.Comment,
            name: commentName,
            value: comment,
            format: ImageFeatureFormat.String
          });
      }
      await this.getImageApi().imageSetFeatures({
        id: imageId,
        extensionId: this.extensionId,
        imageFeature: features
      });
    }
  }

  private async tagImages(imageIds: string[], communicator: Communicator): Promise<void>
  {
    const result = await communicator.launchIntent<string>({
      serveBundle:
        {
          content: fs.readFileSync(path.join(PicteusExtension.getExtensionHomeDirectoryPath(), "dist", "front-end.zip")),
          settings: { imageIds }
        }
    });
    await communicator.launchIntent({
      dialog:
        {
          type: NotificationsDialogType.Info,
          size: "xl",
          title: "Tag",
          description: "Please, tag the images",
          frame: { content: { url: result + "/index.html" }, height: 50 },
          buttons: { yes: "Close" }
        }
    });
  }

  private async analyzeImages(collectionId: number, tags: string[], communicator: Communicator): Promise<void>
  {
    const images = (await this.getImageApi().imageSearchImages({ searchParameters: { collectionId } })).items;
    const providedTagsSet = new Set(tags);
    const pieDataMap: Record<string, number> = {};
    const timelineDataMap: Record<string, Record<string, number>> = {};

    for (const tag of tags)
    {
      pieDataMap[tag] = 0;
    }

    for (const image of images)
    {
      const date = new Date(image.creationDate);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const period = `${year}-${month}`;

      if (!timelineDataMap[period])
      {
        timelineDataMap[period] = {};
        for (const tag of tags)
        {
          timelineDataMap[period][tag] = 0;
        }
      }

      if (image.tags && image.tags.length > 0)
      {
        for (const tag of image.tags)
        {
          const tagValue = tag.value;
          if (providedTagsSet.has(tagValue))
          {
            pieDataMap[tagValue]++;
            timelineDataMap[period][tagValue]++;
          }
        }
      }
    }

    const periods = Object.keys(timelineDataMap).sort((a, b) => a.localeCompare(b));
    const pieData = tags.map(tag => ({ label: tag, value: pieDataMap[tag] }));


    function generatePieChartSVG(data: { label: string, value: number }[]): string
    {
      let svg = `<svg viewBox="-1 -1 2 2" style="transform: rotate(-90deg); width: 250px; height: 250px; flex-shrink: 0;">`;
      const total = data.reduce((sum, d) => sum + d.value, 0);
      if (total === 0)
      {
        return `<div><svg width="250" height="250"><text x="125" y="125" text-anchor="middle">No data</text></svg></div>`;
      }

      let cumulativeValue = 0;
      const colors = ["#4e79a7", "#f28e2c", "#e15759", "#76b7b2", "#59a14f", "#edc949", "#af7aa1", "#ff9da7", "#9c755f", "#bab0ab"];

      data.forEach((d, i) =>
      {
        if (d.value === 0) return;
        const color = colors[i % colors.length];

        if (d.value === total)
        {
          svg += `<circle cx="0" cy="0" r="1" fill="${color}" />`;
          return;
        }

        const startAngle = (cumulativeValue / total) * Math.PI * 2;
        cumulativeValue += d.value;
        const endAngle = (cumulativeValue / total) * Math.PI * 2;

        const x1 = Math.cos(startAngle);
        const y1 = Math.sin(startAngle);
        const x2 = Math.cos(endAngle);
        const y2 = Math.sin(endAngle);

        const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;

        const pathData = [
          `M 0 0`,
          `L ${x1} ${y1}`,
          `A 1 1 0 ${largeArcFlag} 1 ${x2} ${y2}`,
          `Z`
        ].join(" ");

        svg += `<path d="${pathData}" fill="${color}" />`;
      });

      svg += `</svg>`;

      let legendHtml = `<div style="display: flex; flex-direction: column; justify-content: center; margin-left: 20px;">`;
      data.forEach((d, i) =>
      {
        const color = colors[i % colors.length];
        legendHtml += `<div style="display: flex; align-items: center; margin-bottom: 5px;">
      <div style="width: 15px; height: 15px; background-color: ${color}; margin-right: 10px; flex-shrink: 0;"></div>
      <span>${d.label}: ${d.value}</span>
    </div>`;
      });
      legendHtml += `</div>`;

      return `<div style="display: flex; align-items: center; margin-bottom: 20px;">${svg}${legendHtml}</div>`;
    }

    function generateLineChartSVG(periods: string[], tags: string[], data: Record<string, Record<string, number>>): string
    {
      if (periods.length === 0)
      {
        return `<div><svg width="400" height="300"><text x="200" y="150" text-anchor="middle">No data</text></svg></div>`;
      }

      const width = 600;
      const height = 300;
      const padding = 40;

      let maxCount = 0;
      periods.forEach(p =>
      {
        tags.forEach(t =>
        {
          const val = data[p][t] || 0;
          if (val > maxCount) maxCount = val;
        });
      });
      if (maxCount === 0) maxCount = 1;

      maxCount = Math.ceil(maxCount / 5) * 5;

      const colors = ["#4e79a7", "#f28e2c", "#e15759", "#76b7b2", "#59a14f", "#edc949", "#af7aa1", "#ff9da7", "#9c755f", "#bab0ab"];

      let svg = `<svg viewBox="0 0 ${width} ${height}" style="width: 100%; max-width: ${width}; height: auto;">`;

      svg += `<line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#333" />`;
      svg += `<line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#333" />`;

      const xStep = periods.length === 1 ? (width - 2 * padding) / 2 : (width - 2 * padding) / (periods.length - 1);

      const yTicks = 5;
      for (let i = 0; i <= yTicks; i++)
      {
        const val = (maxCount / yTicks) * i;
        const y = (height - padding) - (val / maxCount) * (height - 2 * padding);
        svg += `<line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="#ddd" />`;
        svg += `<text x="${padding - 10}" y="${y + 4}" text-anchor="end" font-size="12" fill="#333">${val}</text>`;
      }

      periods.forEach((p, i) =>
      {
        const x = padding + i * xStep;
        svg += `<text x="${x}" y="${height - padding + 20}" text-anchor="middle" font-size="12" fill="#333">${p}</text>`;
      });

      tags.forEach((tag, tIdx) =>
      {
        const color = colors[tIdx % colors.length];
        let points = "";
        periods.forEach((p, i) =>
        {
          const val = data[p][tag] || 0;
          const x = padding + i * xStep;
          const y = (height - padding) - (val / maxCount) * (height - 2 * padding);
          points += `${x},${y} `;
          svg += `<circle cx="${x}" cy="${y}" r="4" fill="${color}" />`;
        });
        if (periods.length > 1)
        {
          svg += `<polyline points="${points.trim()}" fill="none" stroke="${color}" stroke-width="2" />`;
        }
      });

      svg += `</svg>`;

      let legendHtml = `<div style="display: flex; flex-wrap: wrap; justify-content: center; margin-top: 10px;">`;
      tags.forEach((tag, tIdx) =>
      {
        const color = colors[tIdx % colors.length];
        legendHtml += `<div style="display: flex; align-items: center; margin-right: 15px; margin-bottom: 5px;">
      <div style="width: 15px; height: 15px; background-color: ${color}; margin-right: 5px; flex-shrink: 0;"></div>
      <span style="font-size: 14px;">${tag}</span>
    </div>`;
      });
      legendHtml += `</div>`;

      return `<div>${svg}${legendHtml}</div>`;
    }

    const pieSvg = generatePieChartSVG(pieData);
    const lineSvg = generateLineChartSVG(periods, tags, timelineDataMap);

    const html = `
      <div style="font-family: sans-serif;">
        <h3 style="margin-top: 0;">Tag Distribution</h3>
        ${pieSvg}
        <h3>Historical Breakdown</h3>
        ${lineSvg}
      </div>
    `;

    await communicator.launchIntent({
      dialog: {
        type: NotificationsDialogType.Info,
        title: "Analytics",
        description: "Breakdown of provided tags within the collection over time.",
        details: html,
        buttons: { yes: "OK" }
      }
    });
  }

}

new ImageCommonsExtension().run().catch((error) =>
{
  console.error(error);
  throw error;
});
