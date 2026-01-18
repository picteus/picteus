import { types } from "http-constants";
import { applyDecorators, Type } from "@nestjs/common";
import { ApiExtraModels, ApiQuery, ApiQueryMetadata, ApiQueryOptions, getSchemaPath } from "@nestjs/swagger";
import { ContentObject, SchemaObject } from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";
import { DECORATORS } from "@nestjs/swagger/dist/constants.js";

import { ImageFormats, toMimeType } from "../dtos/common.dtos";


export function computeControllerPath(resourceName: string): string
{
  return "/" + resourceName;
}

// It changes the way the query parameters are serialized in the OpenAPI specification, by resorting to the "deepObject" style
// Inspired from https://gist.github.com/MarZab/c6311f83dec6401966e847c55d81a9bb
export function DeepObjectApiQuery(query: Type): MethodDecorator
{
  const constructor = query.prototype;
  const parentMetadata: any[] = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES_ARRAY, constructor);
  const properties = parentMetadata.map(property => property.substring(1));
  const decorators: MethodDecorator [] = [];
  for (const property of properties)
  {
    const childQueryOptions: ApiQueryOptions = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, constructor, property);
    // @ts-ignore
    const { type } = childQueryOptions;
    if ([Number, Boolean, String].includes(type) === false)
    {
      // The "explode" and "style" specifications are documented at https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#style-examples
      childQueryOptions.explode = true;
      childQueryOptions.style = "deepObject";
      // @ts-ignore
      childQueryOptions.type = "object";
      const propertyType = Reflect.getMetadata("design:type", constructor, property);
      // @ts-ignore
      childQueryOptions.schema = { $ref: getSchemaPath(propertyType) };
      decorators.push(ApiExtraModels(propertyType));
    }
  }
  return applyDecorators(...decorators);
}

// noinspection JSUnusedLocalSymbols
function ApiNestedQuery(query: Type): MethodDecorator
{
  const constructor = query.prototype;
  const parentMetadata: any[] = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES_ARRAY, constructor);
  const properties = parentMetadata.map(property => property.substring(1));
  const decorators: MethodDecorator [] = properties.map(property =>
  {
    const propertyType = Reflect.getMetadata("design:type", constructor, property);
    const childQueryOptions: ApiQueryOptions = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, constructor, property);
    // @ts-ignore
    const { type, schema, ...otherQueryOptions } = childQueryOptions;
    let newOptions: ApiQueryOptions;
    if ([Number, Boolean, String].includes(type) === false)
    {
      newOptions = childQueryOptions;
    }
    else
    {
      newOptions =
        {
          ...otherQueryOptions,
          explode: true,
          style: "deepObject",
          type: "object",
          schema: { $ref: getSchemaPath(propertyType) }
        };
    }
    return [
      ApiExtraModels(propertyType),
      ApiQuery(newOptions)
    ];
  }).flat();
  return applyDecorators(...decorators);
}

// Inspired from https://medium.com/@marius.rad/typescript-inherit-decorators-effd66dc9f8b
// noinspection JSUnusedLocalSymbols
function JsonApiQuery(options: (Omit<ApiQueryMetadata, "type" & "schema"> & {
  name: string,
  type: Type<unknown>
})): <T>(
  target: any,
  propertyKey: string,
  descriptor: TypedPropertyDescriptor<T>
) => void
{
  return <T>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ) =>
  {
    ApiExtraModels(options.type)(target, propertyKey, descriptor);
    Reflect.defineMetadata(jsonContentClassMetadata, true, options.type);
    const { type, ...restOptions } = options;
    const modifiedOptions: ApiQueryOptions =
      {
        ...restOptions,
        explode: false,
        style: "deepObject",
        type: "object",
        content: { [types.json]: { schema: { $ref: getSchemaPath(options.type) } } }
      };
    ApiQuery(modifiedOptions)(target, propertyKey, descriptor);
  };
}

// noinspection JSUnusedLocalSymbols
function ApiMarshallQuery(fieldName: string, queryType: Type): MethodDecorator
{
  // noinspection TypeScriptValidateTypes
  const extraModels = ApiExtraModels(queryType);
  // noinspection TypeScriptValidateTypes
  const options: ApiQueryOptions =
    {
      name: fieldName,
      explode: true,
      style: "deepObject",
      type: "object",
      schema: { $ref: getSchemaPath(queryType) },
      required: false
    };
  const apiQuery = ApiQuery(options);
  return applyDecorators(extraModels, apiQuery);
}

export const jsonContentClassMetadata = "jsonContent";

export const imageSupportedMimeTypes = ImageFormats.map((format) => toMimeType(format));

const binarySchema: SchemaObject = { type: "string", format: "binary" };

export function binarySchemaWithMaxLength(maxLength: number): SchemaObject
{
  return { ...binarySchema, maxLength };
}

export const imageContent: ContentObject = ImageFormats.reduce((map: Record<string, any>, format) =>
{
  map[toMimeType(format)] = { schema: binarySchema };
  return map;
}, { "application/octet-stream": { schema: binarySchema } });

export const applicationGzipMimeType = "application/gzip";
