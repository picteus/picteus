import Replicate, { Model, Prediction } from "replicate";

import {
  ApplicationMetadata,
  Communicator,
  GenerationRecipe,
  Helper,
  Image,
  ImageFeature,
  ImageFeatureFormat,
  ImageFeatureType,
  NotificationEvent,
  NotificationsDialogType,
  NotificationValue,
  PicteusExtension,
  PromptKind,
  type Repository,
  SettingsValue
} from "@picteus/extension-sdk";


interface ReplicateModel
{
  owner: string;
  name: string;
  version?: string;
  model: `${string}/${string}` | `${string}/${string}:${string}`;
}

// The Replicate API documentation is available at https://replicate.com/docs/reference/http and the JavaScript library at https://github.com/replicate/replicate-javascript
class ReplicateExtension extends PicteusExtension
{

  private apiToken: string;

  private repository?: Repository;

  protected async onReady(communicator?: Communicator): Promise<void>
  {
    await this.setup(await this.getSettings());
    const ensureRepository = async (): Promise<void> =>
    {
      const name = PicteusExtension.getManifest().name;
      this.repository = await this.getRepositoryApi().repositoryEnsure({
        technicalId: this.extensionId,
        name,
        comment: `The ${name} repository`,
        watch: true
      });
      communicator.sendLog(`The repository '${name}' is available`, "info");
    };
    await ensureRepository();
  }

  protected async onSettings(_communicator: Communicator, value: SettingsValue): Promise<void>
  {
    await this.setup(value);
  }

  protected async onEvent(communicator: Communicator, event: string, value: NotificationValue): Promise<any>
  {
    if (event === NotificationEvent.ImageRunCommand)
    {
      const commandId: string = value["commandId"];
      const imageIds: string[] = value["imageIds"];
      const parameters: Record<string, any> = value["parameters"];
      if (commandId === "modify")
      {
        await this.generateImage(communicator, parameters, imageIds[0]);
      }
    }
    else if (event === NotificationEvent.ProcessRunCommand)
    {
      const commandId: string = value["commandId"];
      const parameters: Record<string, any> = value["parameters"];
      if (commandId === "synchronize")
      {
        await this.synchronize(communicator, parameters);
      }
      else if (commandId === "run")
      {
        await this.runModel(communicator, parameters);
      }
      else if (commandId === "generate")
      {
        await this.generateImage(communicator, parameters);
      }
    }
  }

  private async synchronize(communicator: Communicator, parameters: Record<string, any>): Promise<void>
  {
    this.logger.info("Listing all the predictions");
    const predictionPage = await this.computeReplicate().predictions.list({});
    const predictions: Prediction[] = predictionPage.results;
    for (const prediction of predictions)
    {
      this.logger.info(`Analysing the prediction with id '${prediction.id}'`);
      if (prediction.data_removed === true || prediction.status !== "succeeded")
      {
        continue;
      }
      const output = this.computeOutput(prediction.output);
      if (output !== undefined)
      {
        const summaryList = await this.getRepositoryApi().repositorySearchImages({
          id: this.repository.id, criteria:
            {
              keyword:
                {
                  text: prediction.id + "." + output.extension,
                  inName: true,
                  inMetadata: false,
                  inFeatures: false
                }
            }
        });
        if (summaryList.totalCount === 0)
        {
          await this.storeImage(communicator, prediction);
        }
      }
    }
  }

  private async runModel(communicator: Communicator, parameters: Record<string, any>, imageIds?: string[]): Promise<void>
  {
    const modelIdentifier: string = parameters["modelIdentifier"];
    const model = await this.checkModelIdentifier(communicator, modelIdentifier);
    if (model === undefined)
    {
      return;
    }
    const replicate = this.computeReplicate();
    const intentParameters = await this.computeReplicateModelInputs(communicator, replicate, model);
    const intentResult: Record<string, any> = await communicator.launchIntent<Record<string, any>>({ parameters: intentParameters });
    const input = intentResult;
    const prediction = await this.runReplicateModel(communicator, replicate, model, input);
    await this.storeImage(communicator, prediction, imageIds);
  }

  private async generateImage(communicator: Communicator, parameters: Record<string, any>, imageId?: string): Promise<void>
  {
    const modelIdentifier: string = "black-forest-labs/flux-kontext-pro";
    const model = await this.checkModelIdentifier(communicator, modelIdentifier);
    if (model === undefined)
    {
      return;
    }
    const replicate = this.computeReplicate();
    const intentParameters = await this.computeReplicateModelInputs(communicator, replicate, model);
    const inputImageParameterName = "input_image";
    delete intentParameters.properties[inputImageParameterName];
    const intentResult: Record<string, any> = await communicator.launchIntent<Record<string, any>>({ parameters: intentParameters });
    const input = intentResult;
    if (imageId !== undefined)
    {
      const blob = await this.getImageApi().imageDownload({
        id: imageId,
        format: "PNG",
        stripMetadata: true,
        width: 1024,
        height: 1024
      });
      input[inputImageParameterName] = Buffer.from(await blob.arrayBuffer());
    }
    const prediction = await this.runReplicateModel(communicator, replicate, model, input);
    await this.storeImage(communicator, prediction, imageId === undefined ? undefined : [imageId]);
  }

  private async storeImage(communicator: Communicator, prediction: Prediction, imageIds?: string[]): Promise<boolean>
  {
    const output = this.computeOutput(prediction.output);
    if (output === undefined)
    {
      this.logger.warn(`Cannot determine the format of the generated image '${prediction.output}': cannot store it`);
      return false;
    }
    const blob = await (await fetch(output.url)).blob();
    // We strip the images from the input
    const input: Record<string, any> = prediction.input;
    let index = 0;
    for (const [key, value] of Object.entries(input))
    {
      if (value instanceof Buffer)
      {
        delete input[key];
        if (imageIds !== undefined)
        {
          input[key] = imageIds[index++];
        }
      }
    }
    const recipe: GenerationRecipe =
      {
        schemaVersion: Helper.GENERATION_RECIPE_SCHEMA_VERSION,
        modelTags: [prediction.model],
        software: "picteus",
        url: prediction.urls.get,
        prompt: { kind: PromptKind.Instructions, value: input }
      };
    if (imageIds !== undefined)
    {
      recipe.inputAssets = imageIds;
    }
    const applicationMetadata: ApplicationMetadata = { items: [{ extensionId: this.extensionId, value: recipe }] };
    let image: Image;
    try
    {
      image = await this.getRepositoryApi().repositoryStoreImage({
        id: this.repository!.id,
        nameWithoutExtension: prediction.id,
        parentId: imageIds?.length === 1 ? imageIds[0] : undefined,
        applicationMetadata: JSON.stringify(applicationMetadata),
        body: blob
      });
    }
    catch (error)
    {
      // This happens because the application MIME type is not PNG nor JPEG
      image = await this.getRepositoryApi().repositoryStoreImage({
        id: this.repository!.id,
        parentId: imageIds?.length === 1 ? imageIds[0] : undefined,
        body: blob
      });
    }
    await this.getImageApi().imageSetTags({
      id: image.id,
      extensionId: this.extensionId,
      requestBody: [this.extensionId]
    });
    const features: ImageFeature[] =
      [
        {
          type: ImageFeatureType.Recipe,
          format: ImageFeatureFormat.Json,
          value: JSON.stringify(recipe)
        }
      ];
    if (input.prompt !== undefined)
    {
      features.push({
        type: ImageFeatureType.Description,
        format: ImageFeatureFormat.String,
        name: "prompt",
        value: input.prompt
      });
    }
    await this.getImageApi().imageSetFeatures({
      id: image.id,
      extensionId: this.extensionId,
      imageFeature: features
    });
    await communicator.launchIntent({
      images: {
        images: [{ imageId: image.id, description: input.prompt === undefined ? "Image" : input.prompt }],
        title: "Generated Images",
        description: "These are generated images",
        // TODO: fulfill this
        details: ``
      }
    });
    return true;
  }

  private async runReplicateModel(communicator: Communicator, replicate: Replicate, model: ReplicateModel, input: Record<string, any>): Promise<Prediction>
  {
    communicator.sendLog(`Asking Replicate to generate an image for the model '${model.model}'`, "debug");
    let prediction: Prediction;
    try
    {
      const milliseconds = Date.now();
      prediction = await replicate.predictions.create({
        model: model.model,
        version: model.version,
        input,
        wait: true
      });
      communicator.sendLog(`Replicate responded in ${Date.now() - milliseconds} ms`, "debug");
      let index = 0;
      while (prediction.status === "starting" || prediction.status === "processing" || prediction.output === undefined)
      {
        if (index >= 3)
        {
          break;
        }
        this.logger.debug(`Waiting for the prediction with id '${prediction.id}' to be completed, because its current status is '${prediction.status}'`);
        prediction = await replicate.wait(prediction);
        index++;
      }
    }
    catch (error)
    {
      throw error;
    }
    return prediction;
  }

  private async computeReplicateModelInputs(communicator: Communicator, replicate: Replicate, model: ReplicateModel): Promise<Record<string, any>>
  {
    communicator.sendLog(`Asking to Replicate the metadata for the model '${model.model}'`, "debug");
    let metaModel: Model;
    try
    {
      metaModel = await replicate.models.get(model.owner, model.name);
    }
    catch (error)
    {
      if (error.response.status === 404)
      {
        throw new Error(`The model '${model.model}' doesn't exist on Replicate'`);
      }
      throw error;
    }
    const openapiSchema = metaModel.latest_version.openapi_schema;
    // @ts-ignore
    const schemas: Record<string, any> = openapiSchema.components.schemas;
    const inputSchema = schemas.Input;
    const excludeKeys = ["Input", "Output", "Status", "WebhookEvent", "ValidationError", "PredictionRequest", "PredictionResponse", "HTTPValidationError"];
    const otherSchemas: Record<string, any> = {};
    for (const key of Object.keys(schemas))
    {
      if (excludeKeys.includes(key) === false)
      {
        otherSchemas[key] = schemas[key];
      }
    }

    function deleteTitleAndXOrderProperties(schema: Record<string, any>): void
    {
      delete schema["title"];
      if (schema.properties !== undefined)
      {
        const properties = Object.values(schema.properties);
        for (const property of properties)
        {
          const jsonProperty = property as Record<string, any>;
          delete jsonProperty["x-order"];
        }
      }
    }

    function inlineSchemaReferences(object: Record<string, any>, schemas: Record<string, any>): void
    {
      for (const property of Object.values(object))
      {
        if (property["$ref"] !== undefined)
        {
          const tokens = property["$ref"].split("/");
          const schemaName = tokens[tokens.length - 1];
          const schema = otherSchemas[schemaName];
          if (schema !== undefined)
          {
            delete property["$ref"];
            Object.assign(property, schema);
          }
          else
          {
            throw new Error(`Missing '${schemaName}' schema definition`);
          }
        }
        else if (typeof property === "object")
        {
          inlineSchemaReferences(property, schemas);
        }
        else if (Array.isArray(property) === true)
        {
          for (const childProperty of property)
          {
            inlineSchemaReferences(childProperty, schemas);
          }
        }
      }
    }

    function fixAnyOf(object: Record<string, any>): void
    {
      for (const property of Object.values(object))
      {
        if (property["anyOf"] !== undefined)
        {
          const anyOf: any[] = property["anyOf"];
          if (anyOf.length == 0)
          {
            Object.assign(property, { anyOf: [{ type: property["type"] || "string" }] });
          }
        }
        else if (typeof property === "object")
        {
          fixAnyOf(property);
        }
        else if (Array.isArray(property) === true)
        {
          for (const childProperty of property)
          {
            fixAnyOf(childProperty);
          }
        }
      }
    }

    deleteTitleAndXOrderProperties(inputSchema);
    inlineSchemaReferences(inputSchema, otherSchemas);
    fixAnyOf(inputSchema);
    return inputSchema;
  }

  private async checkModelIdentifier(communicator: Communicator, modelIdentifier: string): Promise<ReplicateModel | undefined>
  {
    const [owner, namePart] = modelIdentifier.split("/");
    if (namePart === undefined)
    {
      await communicator.launchIntent<boolean>({
        dialog:
          {
            type: NotificationsDialogType.Error,
            title: "Replicate",
            description: `The model identifier '${modelIdentifier}' is incorrect, because it should have the form 'owner/name'. You may copy that value from Replicate.`,
            buttons: { yes: "OK" }
          }
      });
      return undefined;
    }
    const [name, version] = namePart.split(":");
    return { owner, name: name, model: `${owner}/${name}${version === undefined ? "" : (`:${version}`)}`, version };
  }

  private computeOutput(output: any): { url: string, extension: string } | undefined
  {
    if (output === undefined)
    {
      this.logger.warn("The output the prediction image is undefined");
      return undefined;
    }
    if (Array.isArray(output) === true)
    {
      output = output[0];
    }
    if (typeof output !== "string")
    {
      console.dir(output);
      this.logger.warn(`The '${typeof output}' of the '${output}' of the prediction image is not a string`);
      return undefined;
    }
    this.logger.debug(`Determining the image format extension of the prediction with URL '${output}'`);
    const string = output;
    if (string.indexOf("http") !== 0)
    {
      this.logger.warn(`The URL '${string}' of the prediction image is not valid`);
      return undefined;
    }
    const index = string.lastIndexOf(".");
    if (index === -1 || index === (string.length - 1))
    {
      this.logger.warn(`The URL '${string}' of the prediction image does not contain a file extension`);
      return undefined;
    }
    const extension = string.substring(index + 1).toLowerCase();
    if (extension !== "png" && extension !== "jpeg" && extension !== "jpg" && extension !== "webp" && extension !== "avif")
    {
      this.logger.warn(`The image format extension '${extension}' of the prediction with URL '${string}' is not supported`);
      return undefined;
    }
    return { url: string, extension };
  }

  private async setup(value: SettingsValue): Promise<void>
  {
    this.apiToken = value["apiToken"]!;
  }

  private computeReplicate()
  {
    return new Replicate({ auth: this.apiToken, useFileOutput: true });
  }

}

new ReplicateExtension().run().catch((error) =>
{
  console.error(error);
  throw error;
});

