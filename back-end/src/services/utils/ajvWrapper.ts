import Ajv, { ErrorObject } from "ajv";


type Json = Record<string, any>;

const jsonSchemaUrl = "http://json-schema.org/draft-07/schema#";
const reUseAjv = Math.random() > 1;

export function computeAjv(): Ajv
{
  let ajv: Ajv | undefined;
  return (() =>
  {
    if (ajv === undefined || reUseAjv === false)
    {
      ajv = new Ajv({ strict: true, formats: { "uri": true } });
    }
    return ajv;
  })();
}

export function validateSchema(ajv: Ajv, schema: Json, object: Json): void
{
  const result = ajv.validate(schema, object);
  if (result !== true)
  {
    throw new Error(computeReason(ajv.errors![0]));
  }
}

export function validateJsonSchema(ajv: Ajv, schemaObject: Json): void
{
  const validate = ajv.getSchema(jsonSchemaUrl);
  if (validate === undefined)
  {
    throw new Error(`Cannot access to the JSON schema with URL '${jsonSchemaUrl}'`);
  }
  try
  {
    // ajv.validateSchema(schemaObject, true);
    ajv.compile(schemaObject);
  }
  catch (error)
  {
    if (error instanceof Error && error.message.startsWith("strict mode: unknown keyword:") === true)
    {
      throw error;
    }
  }
  if (validate(schemaObject) !== true)
  {
    throw new Error(computeReason(validate.errors![0]));
  }
}

export function addJsonSchemaAdditionalProperties(schema: Json): void
{
  if (schema.additionalProperties === undefined)
  {
    schema.additionalProperties = false;
  }
  if (schema.properties !== undefined)
  {
    const properties = Object.values(schema.properties);
    for (const property of properties)
    {
      const jsonProperty = property as Json;
      if (jsonProperty.type === "object" && jsonProperty.oneOf === undefined)
      {
        addJsonSchemaAdditionalProperties(jsonProperty);
      }
    }
  }
}

function computeReason(errorObject: ErrorObject): string
{
  if (errorObject.keyword === "required" || errorObject.keyword === "type")
  {
    return `the entity at '${errorObject.instancePath === "" ? "/" : errorObject.instancePath}' ${errorObject.message}`;
  }
  else if (errorObject.keyword === "additionalProperties")
  {
    return `the entity at '${errorObject.instancePath === "" ? "/" : errorObject.instancePath}' should not have the '${errorObject.params.additionalProperty}' property`;
  }
  else
  {
    return `the '${errorObject.keyword}' property '${errorObject.instancePath}' ${errorObject.message}`;
  }
}
