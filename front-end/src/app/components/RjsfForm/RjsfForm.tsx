import { useEffect, useMemo, useRef, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { withTheme } from "@rjsf/core";
// TODO: upgrade to rjsf v6.8.0 and use the "@rjsf/mantine" module instead of "@aokiapp/rjsf-mantine-theme"
// import { Theme as MantineTheme } from "@rjsf/mantine";
import { Theme as MantineTheme } from "@aokiapp/rjsf-mantine-theme";
import validator from "@rjsf/validator-ajv8";
import { createSchemaUtils, getDefaultFormState, RegistryWidgetsType, RJSFSchema, UiSchema } from "@rjsf/utils";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/dropzone/styles.css";

import { JsonType } from "types";
import RepositoryWidget from "./widgets/RepositoryWidget";
import CollectionWidget from "./widgets/CollectionWidget";
import TagsWidget from "./widgets/TagsWidget";
import FilePickerWidget from "./widgets/FilePickerWidget";
import DirectoryPickerWidget from "./widgets/DirectoryPickerWidget";
import RangeWidget from "./widgets/RangeWidget";


type RsfjFormType = {
  initialFormData?: object;
  schema: RJSFSchema;
  uiSchema?: UiSchema;
  onChange: (formData: object) => void;
  onValidationChange?: (isValid: boolean) => void;
};

type UIProperty = { property: string, ui: JsonType };
const uiPropertyKeys = [ "ui", "ui.widget", "ui:widget" ] as const;

// We extract and delete UI configuration declared via nested "ui", dot-notated "ui.widget", or colon-notated "ui:widget"
function extractPropertyUi(childProperty: JsonType): JsonType
{
  let ui: JsonType = undefined;
  for (const uiPropertyKey of uiPropertyKeys)
  {
    const propertyValue = childProperty[uiPropertyKey];
    if (propertyValue !== undefined)
    {
      delete childProperty[uiPropertyKey];
      if (uiPropertyKey === "ui" && typeof propertyValue === "object" && propertyValue !== null)
      {
        ui = { ...((ui as object) || {}), ...(propertyValue as object) };
      }
      else
      {
        ui = { ...((ui as object) || {}), widget: propertyValue };
      }
    }
  }
  return ui;
}

function stripAndExtractParametersUiProperties(parameters: JsonType): UIProperty[]
{
  const uis: UIProperty[] = [];
  const properties = parameters.properties;
  if (properties !== undefined)
  {
    for (const property in properties)
    {
      const childProperty = properties[property];
      const ui: JsonType = extractPropertyUi(childProperty);

      // We normalize float and double schema types to standard JSON Schema number
      if (childProperty.type === "float" || childProperty.type === "double")
      {
        if (childProperty.format === undefined)
        {
          childProperty.format = childProperty.type;
        }
        childProperty.type = "number";
      }

      if (ui !== undefined)
      {
        uis.push({ property, ui });
      }
    }
  }
  return uis;
}

export function extractSchemaAndUiSchema(parameters: object): {
  schema: RJSFSchema,
  uiSchema: UiSchema
}
{
  const deepCopiedParameters: RJSFSchema = JSON.parse(JSON.stringify(parameters));
  const uiProperties = stripAndExtractParametersUiProperties(deepCopiedParameters);
  const uiSchema: UiSchema = {};
  uiProperties.forEach((uiProperty: UIProperty) =>
  {
    const widgetName = typeof uiProperty.ui === "object" && uiProperty.ui !== null
      ? (uiProperty.ui as Record<string, unknown>).widget
      : undefined;

    uiSchema[uiProperty.property] = {
      "ui:options": uiProperty.ui,
      ...(widgetName ? { "ui:widget": widgetName as string } : {})
    };
  });
  return { schema: deepCopiedParameters, uiSchema };
}

function ErrorFallback({ error })
{
  return (
    <div role="alert">
      Internal error: <span style={{ color: "red" }}>{error.message}</span>
    </div>
  );
}

// We use the standard AJV8 validator without in-place mutation options (such as removeAdditional or useDefaults). Those mutative options delete and re-assign properties during schema branch evaluations, which corrupts compound schemas like oneOf and anyOf when users interact with the form.
const Form = withTheme(MantineTheme);

function sanitizeStoredDataAgainstSchema(
  candidateData: JsonType,
  schema: RJSFSchema
): JsonType
{
  if (candidateData === null || candidateData === undefined || typeof candidateData !== "object")
  {
    return candidateData;
  }
  const clonedData: JsonType = JSON.parse(JSON.stringify(candidateData));
  const validationResult = validator.rawValidation(schema, clonedData);
  if (validationResult.errors && validationResult.errors.length > 0)
  {
    for (const validationError of validationResult.errors)
    {
      if (validationError.keyword === "additionalProperties" && validationError.params?.additionalProperty)
      {
        delete clonedData[validationError.params.additionalProperty];
      }
      else if (validationError.instancePath && validationError.keyword !== "required")
      {
        const pathSegments = validationError.instancePath.split("/").filter(Boolean);
        if (pathSegments.length > 0)
        {
          const rootPropertyKey = pathSegments[0];
          delete clonedData[rootPropertyKey];
        }
      }
    }
  }
  return clonedData;
}

// Sanitizes the initial form data by populating missing defaults and pruning unattended properties. Stored form data (such as extension settings or command parameters) may contain obsolete keys from previous versions, invalid types from schema revisions, or miss new properties. We first sanitize candidate properties against schema constraints, populate defaults using RJSF's engine, retrieve the schema matching the active branch, and recursively filter out any keys not declared in the schema's path tree without resorting to destructive AJV in-place mutations.
function cleanFormDataWithSchema(
  formData: object | undefined,
  schema: RJSFSchema
): object | undefined
{
  if (formData === undefined)
  {
    return undefined;
  }
  const sanitizedFormData = sanitizeStoredDataAgainstSchema(formData as JsonType, schema);
  const schemaUtils = createSchemaUtils(validator, schema);
  const withDefaults = getDefaultFormState(validator, schema, sanitizedFormData, schema);
  if (withDefaults === undefined || typeof withDefaults !== "object")
  {
    return withDefaults;
  }
  // We resolve the schema for the active branch and build the corresponding path hierarchy
  const retrievedSchema = schemaUtils.retrieveSchema(schema, withDefaults);
  const pathSchema = schemaUtils.toPathSchema(retrievedSchema, "", withDefaults);

  // We recursively walk the path schema to keep only recognized properties
  function filterByPathSchema(currentData: JsonType, currentPathSchema: JsonType): JsonType
  {
    if (currentData === null || currentData === undefined || typeof currentData !== "object")
    {
      return currentData;
    }
    if (Array.isArray(currentData))
    {
      return currentData.map((item: JsonType, itemIndex: number) =>
      {
        const childPathSchema = currentPathSchema[itemIndex] ?? currentPathSchema[0];
        return childPathSchema ? filterByPathSchema(item, childPathSchema) : item;
      });
    }
    const result: Record<string, JsonType> = {};
    for (const propertyKey in currentData)
    {
      if (propertyKey in currentPathSchema && propertyKey !== "$name")
      {
        result[propertyKey] = filterByPathSchema(currentData[propertyKey], currentPathSchema[propertyKey]);
      }
    }
    return result;
  }

  return filterByPathSchema(withDefaults as JsonType, pathSchema as JsonType);
}

export default function RjsfForm({
  initialFormData,
  schema,
  uiSchema,
  onChange,
  onValidationChange
}: RsfjFormType)
{
  const formRef = useRef(null);

  // Ensures boolean schema properties default to false when undefined and normalizes float and double types to number
  function ensureSchemaBooleanDefaultValues(schema: RJSFSchema): RJSFSchema
  {
    if (schema.type === "object" && schema.properties)
    {
      for (const key in schema.properties)
      {
        const property: JsonType = schema.properties[key] as JsonType;
        if (property.type === "boolean" && property.default === undefined)
        {
          property.default = false;
        }
        if (property.type === "float" || property.type === "double")
        {
          if (property.format === undefined)
          {
            property.format = property.type;
          }
          property.type = "number";
        }
        if (property.type === "object")
        {
          ensureSchemaBooleanDefaultValues(property);
        }
      }
    }
    return schema;
  }

  const withBooleanDefaultValueSchema = useMemo<RJSFSchema>(() =>
  {
    return ensureSchemaBooleanDefaultValues(schema);
  }, [ schema ]);

  // We sanitize the initial data once on mount so that stored settings pass validation immediately
  const cleanedInitialFormData = useMemo<object | undefined>(() =>
  {
    return cleanFormDataWithSchema(initialFormData, withBooleanDefaultValueSchema);
  }, [ initialFormData, withBooleanDefaultValueSchema ]);

  const [ formData, setFormData ] = useState(cleanedInitialFormData);

  useEffect(() =>
  {
    if (formData)
    {
      onChange(formData);
    }
    if (onValidationChange)
    {
      const validationResult = validator.rawValidation(withBooleanDefaultValueSchema, formData ?? {});
      onValidationChange(!validationResult.errors || validationResult.errors.length === 0);
    }
  }, [ formData ]);

  useEffect(() =>
  {
    const firstInput = formRef?.current?.formElement?.current?.querySelector(
      "input.mantine-TextInput-input, textarea"
    ) as HTMLElement | null;
    if (firstInput)
    {
      setTimeout(() =>
      {
        firstInput.focus();
      }, 100);
    }
  }, [ formRef ]);

  const widgets: RegistryWidgetsType =
    {
      repository: RepositoryWidget,
      collection: CollectionWidget,
      tags: TagsWidget,
      file: FilePickerWidget,
      filePicker: FilePickerWidget,
      directory: DirectoryPickerWidget,
      directoryPicker: DirectoryPickerWidget,
      range: RangeWidget,
      RangeWidget
    };

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Form
        ref={formRef}
        schema={withBooleanDefaultValueSchema}
        formData={formData}
        uiSchema={uiSchema}
        validator={validator}
        omitExtraData={true}
        liveOmit={true}
        onChange={(event) => setFormData(event.formData)}
        widgets={widgets}
      >
        {/* This prevents the default "Submit" button from being displayed */}
        <div></div>
      </Form>
    </ErrorBoundary>
  );
}
