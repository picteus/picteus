import { ClassConstructor, ClassTransformOptions, instanceToPlain, plainToInstance } from "class-transformer";
import { validateSync, ValidationError, ValidatorOptions } from "class-validator";

import {
  ArgumentMetadata,
  Injectable,
  PipeTransform,
  Type,
  ValidationPipe,
  ValidationPipeOptions
} from "@nestjs/common";

import { jsonContentClassMetadata } from "./tech.controllers";
import { parametersChecker } from "../services/utils/parametersChecker";


function plainToInstanceAndValidate<R extends object>(metatype: ClassConstructor<R>, object: Record<string, any>): R
{
  const instance = plainToInstance<R, any>(metatype, object);
  const validationErrors = validateSync(instance);
  if (validationErrors.length > 0)
  {
    throw exceptionFactory(validationErrors);
  }
  return instance;
}

/**
 * Turns any query parameter into an array.
 */
@Injectable()
export class ArrayValidationPipe<T> implements PipeTransform<any, T[] | undefined>
{

  transform(value: any, _metadata: ArgumentMetadata): T[] | undefined
  {
    if (value === undefined)
    {
      return undefined;
    }
    else if (Array.isArray(value) === true)
    {
      return value;
    }
    else
    {
      return [value];
    }
  }

}

@Injectable()
export class StringifiedJsonPipeTransform<R> implements PipeTransform<unknown, R | unknown>
{

  transform(value: unknown, metadata: ArgumentMetadata): R | unknown
  {
    if (metadata.type === "query" && value !== undefined && typeof value === "string" && metadata.metatype !== undefined)
    {
      const object: Record<string, any> = JSON.parse(value);
      return plainToInstanceAndValidate<typeof metadata.metatype>(metadata.metatype, object);
    }
    return value;
  }

}

/**
 * Turns any query parameter serialized as a JSON into an object.
 */
@Injectable()
export class JsonPipeTransform<R> implements PipeTransform<unknown, R | unknown>
{

  transform(value: unknown, metadata: ArgumentMetadata): R | unknown
  {
    if (metadata.type === "query" && value !== undefined && typeof value === "string" && metadata.metatype !== undefined)
    {
      const metatypeMetadata = Reflect.getMetadata(jsonContentClassMetadata, metadata.metatype);
      if (metatypeMetadata === true)
      {
        const object: Record<string, any> = JSON.parse(value);
        return plainToInstanceAndValidate<typeof metadata.metatype>(metadata.metatype, object);
      }
    }
    return value;
  }

}

/**
 * Turns a query with deep object query parameters into its corresponding object.
 */
@Injectable()
export class DeepObjectPipeTransform<R> implements PipeTransform<unknown, R | unknown>
{

  private readonly regexp: RegExp = /^(.*)\[(\w+)]$/;

  transform(value: unknown, metadata: ArgumentMetadata): R | unknown
  {
    if (metadata.metatype !== undefined && typeof value === "object")
    {
      const object: Record<string, any> = this.parseBracketNotation(value as Record<string, any>);
      return plainToInstanceAndValidate<typeof metadata.metatype>(metadata.metatype, object);
    }
    return value;
  }

  private parseBracketNotation(flatObject: Record<string, any>): Record<string, any>
  {
    const structuredObject: Record<string, any> = {};
    for (const key in flatObject)
    {
      const childValue = flatObject[key];
      if (childValue === undefined)
      {
        continue;
      }
      // This is a regular expression to match and capture the parts of "property[nestedProperty]"
      const match = key.match(this.regexp);
      if (match !== null)
      {
        const [, parentKey, nestedKey] = match;
        let currentObject: Record<string, any> = { [nestedKey]: childValue };
        let currentKey = parentKey;
        do
        {
          const innerMatch = currentKey.match(this.regexp);
          if (innerMatch === null)
          {
            break;
          }
          else
          {
            currentKey = innerMatch[1];
            const innerKey = innerMatch[2];
            const savedObject = currentObject;
            currentObject = {};
            currentObject[innerKey] = savedObject;
          }
        }
        while (true);
        if (structuredObject[currentKey] === undefined)
        {
          structuredObject[currentKey] = currentObject;
        }
        else
        {
          // We merge with the existing property
          currentObject = { [currentKey]: currentObject };
          let currentStructuredObject = structuredObject;
          do
          {
            currentKey = Object.keys(currentObject)[0];
            currentObject = currentObject[currentKey];
            if (currentStructuredObject[currentKey] === undefined)
            {
              currentStructuredObject[currentKey] = currentObject;
              break;
            }
            currentStructuredObject = currentStructuredObject[currentKey];
          }
          while (true);
        }
      }
      else
      {
        // If no bracket notation, we copy the key/value directly
        structuredObject[key] = childValue;
      }
    }
    return structuredObject;
  }

}

export function exceptionFactory(errors: ValidationError[]): any
{
  if (errors.length === 0)
  {
    throw new Error("Cannot handle a validation issue with no error");
  }
  const firstError: ValidationError = errors[0];
  const searchConstraint = (error: ValidationError, propertyPrefix: string): {
    property: string,
    value: string,
    reason: string
  } =>
  {
    const property = `${propertyPrefix}${propertyPrefix.length === 0 ? "" : "."}${error.property}`;
    if (error.constraints === undefined || Object.values(error.constraints).length === 0)
    {
      if (error.children === undefined || error.children.length === 0)
      {
        throw new Error(`Cannot handle a validation issue on property '${firstError.property}' with no constraint violation`);
      }
      return searchConstraint(error.children[0], property);
    }
    else
    {
      return { property, value: error.value, reason: Object.values(error.constraints)[0] };
    }
  };
  const { property, value, reason } = searchConstraint(firstError, "");
  return parametersChecker.computeBadParameter(property, value, reason);
}

// It does nothing special compared to the default ValidationPipe, but it is defined to be able to override its methods if needed
class CustomValidationPipe extends ValidationPipe
{

  constructor(options: ValidationPipeOptions)
  {
    super(options);
  }

  public async transform(value: any, metadata: ArgumentMetadata): Promise<any>
  {
    return super.transform(value, metadata);
  }

  protected validate(object: object, validatorOptions?: ValidatorOptions): Promise<ValidationError[]> | ValidationError[]
  {
    return super.validate(object, validatorOptions);
  }

  protected toValidate(metadata: ArgumentMetadata): boolean
  {
    return super.toValidate(metadata);
  }

}

// We want all query parameters and bodies to be validated
export function validationPipeFactory(): CustomValidationPipe
{
  return new CustomValidationPipe(
    {
      transform: true,
      transformOptions: {},
      always: true,
      enableDebugMessages: true,
      skipUndefinedProperties: true,
      skipNullProperties: true,
      skipMissingProperties: true,
      stopAtFirstError: true,
      transformerPackage:
        {
          // It does nothing special compared to the default TransformerPackage, but it is defined to be able to override its methods if needed
          plainToInstance<T>(aClass: Type<T>, plain: unknown, options?: ClassTransformOptions): T[] | T
          {
            return plainToInstance<T, unknown>(aClass, plain, options);
          },
          classToPlain(
            object: unknown,
            options?: ClassTransformOptions
          ): Record<string, any> | Record<string, any>[]
          {
            return instanceToPlain(object, options);
          }
        },
      exceptionFactory
    });
}
