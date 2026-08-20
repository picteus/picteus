import Ajv, { ErrorObject, Schema } from "ajv";


type Json = Record<string, any>;

const jsonSchemaUrl = "http://json-schema.org/draft-07/schema#";
const reUseAjv = Math.random() > 1;

export function computeAjv(useDefaults?: boolean): Ajv
{
  let ajv: Ajv | undefined;
  return (() =>
  {
    if (ajv === undefined || reUseAjv === false)
    {
      ajv = new Ajv({ strict: true, formats: { "uri": true }, useDefaults });
    }
    return ajv;
  })();
}

export function computeDefaultValueFromSchema(schema: Json): Json
{
  const defaultValue: Json = {};
  const validate = computeAjv(true).compile(schema);

  function prefillObjectStructures(schema: Schema, target: Record<string, any>): void
  {
    if (!schema || typeof schema !== "object")
    {
      return;
    }

    const properties = (schema as any).properties;
    if (!properties || typeof properties !== "object")
    {
      return;
    }

    for (const [ key, propSchema ] of Object.entries<any>(properties))
    {
      if (propSchema.type === "object" && propSchema.properties)
      {
        if (!target[key] || typeof target[key] !== "object")
        {
          target[key] = {};
        }
        prefillObjectStructures(propSchema, target[key]);
      }
    }
  }

  prefillObjectStructures(schema, defaultValue);
  validate(defaultValue);
  return defaultValue;
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
