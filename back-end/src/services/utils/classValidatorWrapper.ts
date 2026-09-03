import { plainToInstance } from "class-transformer";
import { validate, ValidationError } from "class-validator";
import { ClassConstructor } from "class-transformer/types/interfaces";

import { plainToInstanceViaJSON } from "../../utils";


export async function toInstanceAndValidate<T extends object>(theClass: ClassConstructor<T>, object: Object, viaJson: boolean, shouldValidate: boolean): Promise<{
  error: { error: ValidationError; property: string; cause: string }
} | { success: T }>
{

  const classObject: T = viaJson === true ? plainToInstanceViaJSON<T>(theClass, object) : plainToInstance<T, object>(theClass, object, {});
  if (shouldValidate === true)
  {
    const errors = await validate(classObject, viaJson === true ? { forbidUnknownValues: true } : {
      stopAtFirstError: true,
      skipMissingProperties: true
    });
    if (errors.length !== 0)
    {
      const error: ValidationError = errors[0];

      function crawlError(error: ValidationError, property: string): string
      {
        const childProperty = (property.length === 0 ? "" : (property + ".")) + error.property;
        if (error.children === undefined || error.children.length === 0)
        {
          if (error.constraints === undefined || Object.keys(error.constraints).length === 0)
          {
            return `'${childProperty}' is invalid`;
          }
          const explanation = Object.values(error.constraints)[0];
          return `${property === "" ? "" : `at the level of '${property}', `}${explanation}`;
        }
        return crawlError(error.children[0], childProperty);
      }

      return {
        error: {
          error,
          property: error.property,
          cause: crawlError(error, "")
        }
      };
    }
  }
  return { success: classObject };
}
